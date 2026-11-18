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
  advanceDialogs,
  walkTo,
  shot,
  enterLevel,
  tapObject,
  waitPaso,
  playDecision,
} from './helpers.js';

const dialogOpen = (page) => page.evaluate(() => window.__TEST__.dialogOpen());

// Espera a que el jugador vuelva a tener el control (cerrando diálogos que aparezcan).
async function settle(page) {
  for (let i = 0; i < 60; i++) {
    if (await dialogOpen(page)) {
      await advanceDialogs(page);
      continue;
    }
    const g = await gs(page);
    if (!g || g.phase === 'play' || g.phase === 'faint') {
      await page.waitForTimeout(250);
      if (!(await dialogOpen(page))) return;
      continue;
    }
    await page.waitForTimeout(250);
  }
}

// Camina hasta (x,y) aunque en el camino salten diálogos o escenas cortas.
async function goTo(page, x, y, untilPaso) {
  for (let i = 0; i < 12; i++) {
    await settle(page);
    const g = await gs(page);
    if (untilPaso && g.paso !== untilPaso) return;
    if (g.phase !== 'play') return;
    if (g.player.x === x && g.player.y === y) return;
    await walkTo(page, x, y);
  }
}

async function interact(page, spot, obj) {
  await goTo(page, spot.x, spot.y);
  await tapObject(page, obj);
  await page.waitForTimeout(400);
  await settle(page);
}

async function finishLevel(page, testInfo, prefix) {
  await page.waitForTimeout(1500);
  await shot(page, testInfo, `${prefix}arreglado`);
  await waitScene(page, 'Proposal', 40_000);
  await page.waitForTimeout(500);
  await shot(page, testInfo, `${prefix}propuesta`);
  const vp = page.viewportSize();
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(vp.width / 2, vp.height * 0.7);
    await page.mouse.down();
    await page.mouse.move(vp.width / 2, vp.height * 0.2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);
  await shot(page, testInfo, `${prefix}propuesta-abajo`);
  await tapHit(page, 'btn:seguir');
}

// ---------- Nivel 2 ----------
async function playLevel2(page, testInfo) {
  let s = await gs(page);
  expect(s.nivel).toBe('seguridad-psicologica');
  expect(s.player.sprite).toBe('lucia');
  expect(s.reachable).toBe(true);
  await shot(page, testInfo, 'n2-inicio');
  // 1. Las tres facturas
  await interact(page, { x: 23, y: 7 }, 'escritorio');
  await interact(page, { x: 24, y: 2 }, 'impresora');
  s = await gs(page);
  expect(s.flags).toEqual(expect.arrayContaining(['hecho:obj:escritorio', 'hecho:obj:impresora']));
  await goTo(page, 19, 2);
  await tapObject(page, 'fichero');
  // 2. El error (diálogo) → avisar
  await page.waitForFunction(() => window.__TEST__.dialogOpen(), null, { timeout: 10_000 });
  await shot(page, testInfo, 'n2-error');
  await settle(page);
  // 3. Camino al jefe: compañeros, enfermera, el grito
  await goTo(page, 16, 16, 'avisar');
  await waitPaso(page, 'esconder');
  s = await gs(page);
  expect(s.flags).toEqual(expect.arrayContaining(['hablo:companeros', 'hablo:enfermera']));
  expect(s.medidor).toBeGreaterThan(40);
  await settle(page);
  // 4. Esconder el error → bola de nieve
  await interact(page, { x: 23, y: 7 }, 'escritorio');
  await waitPaso(page, 'bola');
  await page.waitForTimeout(3000);
  await settle(page);
  await shot(page, testInfo, 'n2-bola');
  // 5. Atender teléfonos hasta que todo se viene abajo
  for (let i = 0; i < 12; i++) {
    s = await gs(page);
    if (s.phase === 'faint') break;
    if (s.phase === 'play' && !(await dialogOpen(page))) {
      await goTo(page, 23, 7);
      s = await gs(page);
      if (s.phase === 'play') await tapObject(page, 'escritorio');
    }
    await page.waitForTimeout(500);
    await settle(page);
  }
  await page.waitForFunction(() => window.__TEST__.game().phase === 'faint', null, { timeout: 40_000 });
  s = await gs(page);
  expect(s.extra.papeles).toBeGreaterThan(15);
  expect(s.extra.papeles).toBeLessThanOrEqual(60);
  await page.waitForTimeout(3200);
  await shot(page, testInfo, 'n2-derrota');
  await tapHit(page, 'faint:seguir');
  await playDecision(page, 'criterio', testInfo, 'n2-');
  await finishLevel(page, testInfo, 'n2-');
}

// ---------- Nivel 3 ----------
async function playLevel3(page, testInfo) {
  let s = await gs(page);
  expect(s.nivel).toBe('feedback-coaching');
  expect(s.player.sprite).toBe('tomas');
  expect(s.extra.mes).toBe(0);
  expect((await page.evaluate(() => window.__TEST__.hudState())).calendar).toBe('ENERO');
  await shot(page, testInfo, 'n3-inicio');
  await interact(page, { x: 19, y: 10 }, 'estante');
  await waitPaso(page, 'llevar');
  expect((await gs(page)).extra.carpeta).toBe(true);
  await interact(page, { x: 2, y: 7 }, 'bandeja');
  await waitPaso(page, 'reponer');
  await shot(page, testInfo, 'n3-bandeja');
  await interact(page, { x: 19, y: 10 }, 'estante');
  await waitPaso(page, 'idea');
  await settle(page);
  await shot(page, testInfo, 'n3-idea');
  await goTo(page, 16, 16, 'idea');
  await waitPaso(page, 'carrito');
  await settle(page);
  s = await gs(page);
  expect(s.flags).toContain('hablo:companero');
  await interact(page, { x: 20, y: 12 }, 'carrito');
  await waitPaso(page, 'diciembre');
  s = await gs(page);
  expect(s.extra.mes).toBe(11);
  expect(s.extra.carrito).not.toEqual({ x: 19, y: 12 });
  expect(s.reachable).toBe(true);
  await settle(page);
  await goTo(page, 18, 16, 'diciembre');
  await page.waitForFunction(() => window.__TEST__.game().phase === 'faint', null, { timeout: 20_000 });
  await page.waitForTimeout(3000);
  await shot(page, testInfo, 'n3-pergamino');
  // el pergamino no tapa el "tocá para seguir"
  await page.waitForFunction(() => window.__TEST__.hudState().faint, null, { timeout: 15_000 });
  await page.waitForTimeout(6500);
  await shot(page, testInfo, 'n3-derrota');
  expect((await gs(page)).medidor).toBe(100);
  await tapHit(page, 'faint:seguir');
  await playDecision(page, 'continuo', testInfo, 'n3-');
  await page.waitForTimeout(4000);
  await shot(page, testInfo, 'n3-arreglado-junio');
  await finishLevel(page, testInfo, 'n3-');
}

test('nivel 2 completo: facturas, miedo, bola de nieve, decisión y arreglado', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const problems = guardConsole(page);
  await open(page, 'test=1&speed=3');
  await waitScene(page, 'Title');
  await enterLevel(page, 1);
  await playLevel2(page, testInfo);
  await waitScene(page, 'End');
  await shot(page, testInfo, 'n2-fin');
  await tapHit(page, 'btn:siguiente');
  await waitScene(page, 'Game');
  expect((await gs(page)).nivel).toBe('feedback-coaching');
  expectClean(problems);
});

test('nivel 3 completo: calendario, pergamino, decisión y pantalla final', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const problems = guardConsole(page);
  await open(page, 'test=1&speed=3');
  await waitScene(page, 'Title');
  await enterLevel(page, 2);
  await playLevel3(page, testInfo);
  await waitScene(page, 'Finale');
  await page.waitForTimeout(1200);
  await shot(page, testInfo, 'final-juego');
  expect(await page.evaluate(() => window.__TEST__.completed())).toContain('feedback-coaching');
  await tapHit(page, 'btn:menu');
  await waitScene(page, 'Levels');
  await shot(page, testInfo, 'menu-n3-hecho');
  expectClean(problems);
});

test('recorrido completo 1 → 2 → 3 → final → jugar de nuevo, todo se resetea', async ({ page }) => {
  test.setTimeout(240_000);
  const problems = guardConsole(page);
  await open(page, 'test=1&speed=10');
  await waitScene(page, 'Title');
  await enterLevel(page, 0);
  const ids = ['protocolo', 'criterio', 'continuo'];
  for (let lvl = 0; lvl < 3; lvl++) {
    await page.waitForFunction((n) => window.__TEST__.levelIndex() === n && window.__TEST__.game(), lvl);
    const s0 = await gs(page);
    expect(s0.flags).toEqual([]);
    expect(s0.phase).toBe('play');
    if (lvl === 1) expect(s0.extra.papeles).toBe(0);
    if (lvl === 2) expect(s0.extra.mes).toBe(0);
    // dejamos que el tope de tiempo termine el nivel (ensucia medidor, papeles, calendario)
    await page.waitForFunction(() => window.__TEST__.game().phase === 'faint', null, { timeout: 60_000 });
    const s1 = await gs(page);
    if (lvl === 1) expect(s1.extra.papeles).toBeGreaterThan(0);
    if (lvl === 2) expect(s1.extra.mes).toBeGreaterThan(3);
    await page.waitForFunction(() => window.__TEST__.hudState() && window.__TEST__.hudState().faint, null, { timeout: 20_000 });
    await page.waitForTimeout(3000);
    await tapHit(page, 'faint:seguir');
    await playDecision(page, ids[lvl]);
    await tapHit(page, 'btn:saltar');
    await waitScene(page, 'Proposal');
    await tapHit(page, 'btn:seguir');
    if (lvl < 2) {
      await waitScene(page, 'End');
      await tapHit(page, 'btn:siguiente');
      await waitScene(page, 'Game');
    }
  }
  await waitScene(page, 'Finale');
  expect((await page.evaluate(() => window.__TEST__.completed())).sort()).toEqual(
    ['feedback-coaching', 'gestion-del-cambio', 'seguridad-psicologica'],
  );
  await tapHit(page, 'btn:jugar');
  await waitScene(page, 'Game');
  let s = await gs(page);
  expect(s.nivel).toBe('gestion-del-cambio');
  expect(s.paso).toBe('recepcion');
  expect(s.dolor).toBeLessThan(15);
  expect(s.pacientes.some((p) => p.inQueue)).toBe(false);
  expect((await page.evaluate(() => window.__TEST__.run())).crossed).toEqual([]);
  expect((await scenes(page)).sort()).toEqual(['Game', 'Hud']);
  // Los otros niveles también arrancan limpios
  await page.evaluate(() => window.__TEST__.jump('Levels'));
  await waitScene(page, 'Levels');
  await tapHit(page, 'lvl:1');
  await waitScene(page, 'Game');
  s = await gs(page);
  expect(s).toMatchObject({ nivel: 'seguridad-psicologica', paso: 'facturas', phase: 'play' });
  expect(s.extra.papeles).toBe(0);
  expect(s.medidor).toBeLessThan(10);
  expect((await page.evaluate(() => window.__TEST__.run())).crossed).toEqual([]);
  await page.evaluate(() => window.__TEST__.jump('Levels'));
  await waitScene(page, 'Levels');
  await tapHit(page, 'lvl:2');
  await waitScene(page, 'Game');
  s = await gs(page);
  expect(s).toMatchObject({ nivel: 'feedback-coaching', paso: 'carpeta', phase: 'play' });
  expect(s.extra.mes).toBe(0);
  expect(s.medidor).toBeLessThan(5);
  expect((await page.evaluate(() => window.__TEST__.hudState())).calendar).toBe('ENERO');
  expectClean(problems);
});

test('menú de niveles: se entra directo a cada nivel', async ({ page }) => {
  const problems = guardConsole(page);
  await open(page, 'test=1');
  await waitScene(page, 'Title');
  const want = [
    ['gestion-del-cambio', 'paciente', 'DOLOR DE RODILLA', 'face'],
    ['seguridad-psicologica', 'lucia', 'MIEDO', 'fear'],
    ['feedback-coaching', 'tomas', 'MOTIVACIÓN', 'batt'],
  ];
  await tapHit(page, 'btn:entrar');
  for (let i = 0; i < 3; i++) {
    await waitScene(page, 'Levels');
    await tapHit(page, `lvl:${i}`);
    await waitScene(page, 'Game');
    await page.waitForTimeout(300);
    const s = await gs(page);
    expect(s.nivel).toBe(want[i][0]);
    expect(s.player.sprite).toBe(want[i][1]);
    expect(s.reachable).toBe(true);
    const h = await page.evaluate(() => window.__TEST__.hudState());
    expect(h.meterLabel).toBe(want[i][2]);
    expect(h.meterIcon).toBe(want[i][3]);
    expect(h.controls).toBe(true);
    await page.evaluate(() => window.__TEST__.jump('Levels'));
  }
  expectClean(problems);
});

test('los papeles del nivel 2 frenan pero nunca bloquean, y el botón A sigue andando', async ({ page }, testInfo) => {
  const problems = guardConsole(page);
  await open(page, 'test=1&speed=2');
  await waitScene(page, 'Title');
  await page.evaluate(() => window.__TEST__.level(1));
  await waitScene(page, 'Game');
  await page.evaluate(() => window.__TEST__.event('bolaDeNieve'));
  await page.waitForTimeout(7000);
  await settle(page);
  let s = await gs(page);
  expect(s.extra.papeles).toBeGreaterThan(20);
  expect(s.reachable).toBe(true);
  await shot(page, testInfo, 'papeles');
  // cruzar la oficina llena de papeles, ida y vuelta
  await page.evaluate(() => window.__TEST__.setMeter(30));
  await goTo(page, 18, 4);
  expect((await gs(page)).player).toMatchObject({ x: 18, y: 4 });
  await page.evaluate(() => window.__TEST__.setMeter(30));
  await goTo(page, 23, 7);
  expect((await gs(page)).player).toMatchObject({ x: 23, y: 7 });
  // botón A con papeles en pantalla: abre el teléfono
  await page.evaluate(() => window.__TEST__.setMeter(30));
  const h = await page.evaluate(() => window.__TEST__.hudState());
  expect(h.controls).toBe(true);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(200);
  await tapHit(page, 'btn:A');
  await page.waitForFunction(() => window.__TEST__.game().flags.includes('hecho:obj:escritorio'), null, { timeout: 5000 });
  expectClean(problems);
});

test('el pergamino aparece solo en la escena final y deja seguir', async ({ page }, testInfo) => {
  const problems = guardConsole(page);
  await open(page, 'test=1&speed=2');
  await waitScene(page, 'Title');
  await page.evaluate(() => window.__TEST__.level(2));
  await waitScene(page, 'Game');
  await page.evaluate(() => window.__TEST__.event('evaluacion'));
  await page.waitForTimeout(2500);
  const h = await page.evaluate(() => window.__TEST__.hudState());
  expect(h.controls).toBe(false);
  await shot(page, testInfo, 'pergamino');
  await page.waitForFunction(() => window.__TEST__.hudState().faint, null, { timeout: 15_000 });
  await page.waitForTimeout(3500);
  await tapHit(page, 'faint:seguir');
  await waitScene(page, 'WhatFailed');
  expectClean(problems);
});

test('rendimiento: 60 papeles con CPU lenta siguen fluidos', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'La simulación de CPU lenta es solo de Chromium');
  const problems = guardConsole(page);
  await open(page, 'test=1');
  await waitScene(page, 'Title');
  await page.evaluate(() => window.__TEST__.level(1));
  await waitScene(page, 'Game');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => window.__TEST__.event('bolaDeNieve'));
  await page.waitForFunction(() => window.__TEST__.game().extra.papeles >= 55, null, { timeout: 40_000 });
  await page.waitForTimeout(2000);
  const fps = [];
  for (let i = 0; i < 6; i++) {
    fps.push(await page.evaluate(() => window.__TEST__.fps()));
    await page.waitForTimeout(500);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const avg = fps.reduce((a, b) => a + b, 0) / fps.length;
  console.log(`FPS promedio con CPU x4 más lenta y ${(await gs(page)).extra.papeles} papeles: ${avg.toFixed(1)}`);
  expect(avg).toBeGreaterThan(30);
  expect((await gs(page)).extra.papeles).toBeLessThanOrEqual(60);
  expectClean(problems);
});
