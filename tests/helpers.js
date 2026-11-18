import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Junta cualquier error o warning de consola / excepción de página.
export function guardConsole(page) {
  const problems = [];
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning' || t === 'assert') problems.push(`[console.${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`[http ${res.status()}] ${res.url()}`);
  });
  return problems;
}

export function expectClean(problems) {
  expect(problems, problems.join('\n')).toEqual([]);
}

export async function open(page, query = 'test=1&speed=3') {
  await page.goto(`./?${query}`);
  await page.waitForFunction(() => window.__TEST__ && window.__TEST__.ready, null, { timeout: 20_000 });
}

export async function scenes(page) {
  return page.evaluate(() => window.__TEST__.scenes());
}

export async function waitScene(page, key, timeout = 20_000) {
  await page.waitForFunction((k) => window.__TEST__.scenes().includes(k), key, { timeout });
  // dejamos terminar el fundido de entrada
  await page.waitForTimeout(350);
}

export async function gs(page) {
  return page.evaluate(() => window.__TEST__.game());
}

export async function tapAt(page, pt) {
  const hasTouch = await page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  if (hasTouch) await page.touchscreen.tap(pt.x, pt.y);
  else await page.mouse.click(pt.x, pt.y);
}

export async function tapHit(page, name) {
  const pt = await page.waitForFunction((n) => window.__TEST__.hit(n), name, { timeout: 10_000 }).then((h) => h.jsonValue());
  await tapAt(page, pt);
}

export async function tapCenter(page) {
  const vp = page.viewportSize();
  await tapAt(page, { x: vp.width / 2, y: vp.height * 0.55 });
}

// Avanza el diálogo abierto hasta cerrarlo, tocando la pantalla (como un usuario).
export async function advanceDialogs(page) {
  for (let i = 0; i < 40; i++) {
    const open = await page.evaluate(() => window.__TEST__.dialogOpen());
    if (!open) return;
    await tapCenter(page);
    await page.waitForTimeout(220);
  }
  throw new Error('El diálogo no se cerró');
}

export async function waitDialog(page, timeout = 15_000) {
  await page.waitForFunction(() => window.__TEST__.dialogOpen(), null, { timeout });
}

export async function waitIdle(page, timeout = 20_000) {
  await page.waitForFunction(
    () => {
      const g = window.__TEST__.game();
      return g && !g.auto && !g.player.moving;
    },
    null,
    { timeout },
  );
}

// Camina con el piloto automático (pathfinding real del juego).
export async function walkTo(page, x, y) {
  const ok = await page.evaluate(([a, b]) => window.__TEST__.walkTo(a, b), [x, y]);
  expect(ok).toBeTruthy();
  await page.waitForFunction(
    () => {
      const g = window.__TEST__.game();
      return !g || window.__TEST__.dialogOpen() || g.phase !== 'play' || (!g.auto && !g.player.moving);
    },
    null,
    { timeout: 25_000 },
  );
}

// Se acerca a un NPC y lo toca en pantalla para hablarle.
export async function talkTo(page, id, spot) {
  await walkTo(page, spot.x, spot.y);
  const s = await gs(page);
  const npc = s.npcs[id];
  const pt = await page.evaluate(([x, y]) => window.__TEST__.tile(x, y), [npc.x, npc.y]);
  await tapAt(page, pt);
  await waitDialog(page);
  await advanceDialogs(page);
}

let shotN = 0;
export async function shot(page, testInfo, name) {
  const dir = path.join('test-results', 'screens', testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  shotN += 1;
  await page.screenshot({ path: path.join(dir, `${String(shotN).padStart(2, '0')}-${name}.png`) });
}
