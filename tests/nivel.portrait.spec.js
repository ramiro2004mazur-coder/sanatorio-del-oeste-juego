import { test, expect } from '@playwright/test';
import {
  guardConsole,
  expectClean,
  open,
  scenes,
  waitScene,
  gs,
  tapAt,
  tapHit,
  tapCenter,
  advanceDialogs,
  waitDialog,
  walkTo,
  talkTo,
  shot,
} from './helpers.js';

test('juega el nivel completo y jugar de nuevo resetea todo', async ({ page }, testInfo) => {
  const problems = guardConsole(page);
  await open(page);
  await waitScene(page, 'Title');
  await page.waitForTimeout(500);
  await shot(page, testInfo, 'inicio');

  await tapHit(page, 'btn:entrar');
  await waitScene(page, 'Game');
  await page.waitForTimeout(400);
  let s = await gs(page);
  expect(s.paso).toBe('recepcion');
  expect(s.reachable).toBe(true);
  await shot(page, testInfo, 'juego');

  // 1-2. Recepción
  await talkTo(page, 'recepcionista', { x: 2, y: 13 });
  s = await gs(page);
  expect(s.paso).toBe('consultorio3');

  // 3. Consultorio 3 (dice Traumatología, es Cardiología)
  const before3 = s.dolor;
  await walkTo(page, 11, 3);
  await waitDialog(page);
  await shot(page, testInfo, 'cardiologa');
  await advanceDialogs(page);
  s = await gs(page);
  expect(s.paso).toBe('preguntar');
  expect(s.dolor).toBeGreaterThan(before3 + 20);

  // 4. Tres versiones distintas
  await talkTo(page, 'enfermero', { x: 6, y: 8 });
  await talkTo(page, 'administrativo', { x: 11, y: 11 });
  await talkTo(page, 'maestranza', { x: 5, y: 19 });
  s = await gs(page);
  expect(s.flags).toEqual(expect.arrayContaining(['hablo:enfermero', 'hablo:administrativo', 'hablo:maestranza']));
  expect(s.paso).toBe('consultorio1');

  // Consultorio 1: Ecografía
  await walkTo(page, 3, 3);
  await waitDialog(page);
  await advanceDialogs(page);
  s = await gs(page);
  expect(s.paso).toBe('volver');
  await page.waitForTimeout(600);
  s = await gs(page);
  expect(s.pacientes.filter((p) => p.inQueue).length).toBeGreaterThanOrEqual(5);

  // 5-6. Mostrador colapsado → desmayo
  await walkTo(page, 7, 12);
  await page.waitForFunction(() => window.__TEST__.game().phase !== 'play', null, { timeout: 10_000 });
  await page.waitForTimeout(2500);
  await shot(page, testInfo, 'colapso');
  await page.waitForFunction(() => window.__TEST__.game().phase === 'faint', null, { timeout: 30_000 });
  await page.waitForTimeout(3200);
  await shot(page, testInfo, 'desmayo');
  s = await gs(page);
  expect(s.dolor).toBe(100);
  await tapHit(page, 'faint:seguir');

  // 7. ¿Qué falló?
  await waitScene(page, 'WhatFailed');
  await page.waitForTimeout(800);
  await shot(page, testInfo, 'que-fallo');
  await tapHit(page, 'btn:seguir');

  // 8. Decisión: elegimos una incorrecta
  await waitScene(page, 'Decision');
  const run = await page.evaluate(() => window.__TEST__.run());
  expect(run.order).toHaveLength(3);
  expect(run.crossed).toEqual([]);
  await shot(page, testInfo, 'decision');
  const wrong = run.order.find((id) => id !== 'protocolo');
  await tapHit(page, `opt:${wrong}`);

  // 9. Pantalla roja
  await waitScene(page, 'Lost');
  expect(await scenes(page)).not.toContain('Decision');
  await page.waitForTimeout(900);
  await shot(page, testInfo, 'perdiste');
  await tapHit(page, 'btn:reintentar');
  await waitScene(page, 'Decision');
  const run2 = await page.evaluate(() => window.__TEST__.run());
  expect(run2.crossed).toEqual([wrong]);
  expect(run2.order).toEqual(run.order);
  await shot(page, testInfo, 'decision-tachada');

  // La tachada no se puede elegir
  await tapHit(page, `opt:${wrong}`);
  await page.waitForTimeout(600);
  expect(await scenes(page)).toContain('Decision');

  // Correcta
  await tapHit(page, 'opt:protocolo');
  await waitScene(page, 'Fixed', 10_000);
  await page.waitForTimeout(1500);
  await shot(page, testInfo, 'arreglado-carteles');
  await page.waitForTimeout(1200);
  await shot(page, testInfo, 'arreglado-todos');

  // 11. Propuesta (la repetición termina sola)
  await waitScene(page, 'Proposal', 30_000);
  await page.waitForTimeout(500);
  await shot(page, testInfo, 'propuesta');
  // scrolleo arrastrando
  const vp = page.viewportSize();
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(vp.width / 2, vp.height * 0.7);
    await page.mouse.down();
    await page.mouse.move(vp.width / 2, vp.height * 0.25, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);
  const sc = await page.evaluate(() => window.__TEST__.proposalScroll());
  expect(sc.max).toBeGreaterThan(0);
  expect(sc.scroll).toBeGreaterThan(sc.max * 0.9);
  await shot(page, testInfo, 'propuesta-abajo');
  await tapHit(page, 'btn:seguir');

  // 12. Final
  await waitScene(page, 'End');
  await page.waitForTimeout(500);
  await shot(page, testInfo, 'final');
  const count = await page.evaluate(() => window.__TEST__.runCount());
  await tapHit(page, 'btn:jugar');

  // Jugar de nuevo: todo reseteado
  await waitScene(page, 'Game');
  await page.waitForTimeout(500);
  s = await gs(page);
  expect(s.paso).toBe('recepcion');
  expect(s.flags).toEqual([]);
  expect(s.phase).toBe('play');
  expect(s.dolor).toBeLessThan(15);
  expect(s.pacientes.some((p) => p.inQueue)).toBe(false);
  const run3 = await page.evaluate(() => window.__TEST__.run());
  expect(run3.crossed).toEqual([]);
  expect([...run3.order].sort()).toEqual([...run.order].sort());
  expect(await page.evaluate(() => window.__TEST__.runCount())).toBe(count + 1);
  expect((await scenes(page)).sort()).toEqual(['Game', 'Hud']);

  expectClean(problems);
});

test('el tope de tiempo desmaya aunque te quedes quieto', async ({ page }) => {
  const problems = guardConsole(page);
  await open(page, 'test=1&speed=10');
  await waitScene(page, 'Title');
  await tapHit(page, 'btn:entrar');
  await waitScene(page, 'Game');
  // 120 s de juego a x10 = 12 s
  await page.waitForFunction(() => window.__TEST__.game().phase === 'faint', null, { timeout: 25_000 });
  await waitScene(page, 'WhatFailed', 20_000);
  expectClean(problems);
});

test('toques rápidos no disparan escenas dobles', async ({ page }) => {
  const problems = guardConsole(page);
  await open(page);
  await waitScene(page, 'Title');
  const pt = await page.evaluate(() => window.__TEST__.hit('btn:entrar'));
  for (let i = 0; i < 8; i++) await tapAt(page, pt);
  await waitScene(page, 'Game');
  await page.waitForTimeout(800);
  expect((await scenes(page)).sort()).toEqual(['Game', 'Hud']);

  // Botón A apretado muchas veces seguidas
  const a = await page.evaluate(() => window.__TEST__.hit('btn:A'));
  for (let i = 0; i < 10; i++) await tapAt(page, a);
  await page.waitForTimeout(300);

  // Decisión: toques repetidos sobre una opción equivocada
  await page.evaluate(() => window.__TEST__.jump('Decision'));
  await waitScene(page, 'Decision');
  const run = await page.evaluate(() => window.__TEST__.run());
  const wrong = run.order.find((id) => id !== 'protocolo');
  const w = await page.evaluate((id) => window.__TEST__.hit(`opt:${id}`), wrong);
  for (let i = 0; i < 6; i++) await tapAt(page, w);
  await waitScene(page, 'Lost');
  await page.waitForTimeout(500);
  expect(await scenes(page)).toEqual(['Lost']);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => window.__TEST__.hit('btn:reintentar'));
  for (let i = 0; i < 6; i++) await tapAt(page, r);
  await waitScene(page, 'Decision');
  await page.waitForTimeout(600);
  expect(await scenes(page)).toEqual(['Decision']);
  const c = await page.evaluate(() => window.__TEST__.hit('opt:protocolo'));
  for (let i = 0; i < 6; i++) await tapAt(page, c);
  await waitScene(page, 'Fixed');
  await page.waitForTimeout(500);
  expect(await scenes(page)).toEqual(['Fixed']);
  // Saltar la repetición tocando muchas veces
  const sk = await page.evaluate(() => window.__TEST__.hit('btn:saltar'));
  for (let i = 0; i < 6; i++) await tapAt(page, sk);
  await waitScene(page, 'Proposal');
  await page.waitForTimeout(500);
  expect(await scenes(page)).toEqual(['Proposal']);
  const sg = await page.evaluate(() => window.__TEST__.hit('btn:seguir'));
  for (let i = 0; i < 6; i++) await tapAt(page, sg);
  await waitScene(page, 'End');
  await page.waitForTimeout(500);
  expect(await scenes(page)).toEqual(['End']);
  const j = await page.evaluate(() => window.__TEST__.hit('btn:jugar'));
  for (let i = 0; i < 6; i++) await tapAt(page, j);
  await waitScene(page, 'Game');
  await page.waitForTimeout(600);
  expect((await scenes(page)).sort()).toEqual(['Game', 'Hud']);
  expectClean(problems);
});

test('ir a otra pestaña y volver pausa y retoma', async ({ page }) => {
  const problems = guardConsole(page);
  await open(page, 'test=1');
  await waitScene(page, 'Title');
  await tapHit(page, 'btn:entrar');
  await waitScene(page, 'Game');
  await page.evaluate(() => window.__TEST__.walkTo(7, 14));
  const setHidden = (h) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: hidden ? 'hidden' : 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, h);
  await setHidden(true);
  const t0 = (await gs(page)).elapsed;
  await page.waitForTimeout(1500);
  const t1 = (await gs(page)).elapsed;
  expect(t1 - t0).toBeLessThan(0.3);
  await setHidden(false);
  await page.waitForTimeout(1200);
  const t2 = (await gs(page)).elapsed;
  expect(t2).toBeGreaterThan(t1 + 0.5);
  // sigue jugable
  // (4,16) queda fuera de la zona donde deambulan los pacientes
  await walkTo(page, 4, 16);
  expect((await gs(page)).player).toMatchObject({ x: 4, y: 16 });
  expectClean(problems);
});

test('mute/unmute en cualquier momento', async ({ page }) => {
  const problems = guardConsole(page);
  await open(page);
  const mute = page.locator('#mute');
  await waitScene(page, 'Title');
  await expect(mute).toBeVisible();
  for (const key of ['Title', 'Game', 'Decision', 'Lost', 'Fixed', 'Proposal', 'End']) {
    if (key !== 'Title') {
      await page.evaluate((k) => window.__TEST__.jump(k), key);
      await waitScene(page, key);
    }
    const before = await page.evaluate(() => window.__TEST__.audio().muted);
    await mute.tap();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.__TEST__.audio().muted)).toBe(!before);
    await mute.tap();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.__TEST__.audio().muted)).toBe(before);
  }
  expectClean(problems);
});

test('no hay forma de quedar encerrado en el mapa', async ({ page }) => {
  const problems = guardConsole(page);
  await open(page, 'test=1&speed=3');
  await waitScene(page, 'Title');
  await tapHit(page, 'btn:entrar');
  await waitScene(page, 'Game');
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
  for (let i = 0; i < 70; i++) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    await page.keyboard.down(k);
    await page.waitForTimeout(60 + Math.random() * 180);
    await page.keyboard.up(k);
  }
  // Joystick: arrastre en la mitad izquierda
  const vp = page.viewportSize();
  for (let i = 0; i < 6; i++) {
    const x = vp.width * 0.2;
    const y = vp.height * 0.75;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + (i % 2 ? 60 : -60), y + (i % 3 ? -60 : 60), { steps: 4 });
    await page.waitForTimeout(400);
    await page.mouse.up();
  }
  let s = await gs(page);
  expect(s.reachable).toBe(true);
  if (s.phase === 'play' && !(await page.evaluate(() => window.__TEST__.dialogOpen()))) {
    await walkTo(page, 2, 13);
    s = await gs(page);
    if (s.phase === 'play' && !(await page.evaluate(() => window.__TEST__.dialogOpen())))
      expect(s.player).toMatchObject({ x: 2, y: 13 });
  }
  expectClean(problems);
});

test('el modo debug no aparece sin parámetro', async ({ page }) => {
  const problems = guardConsole(page);
  await page.goto('./');
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => typeof window.__TEST__)).toBe('undefined');
  await expect(page.locator('#dbg')).toHaveCount(0);
  await tapCenter(page);
  expectClean(problems);
});
