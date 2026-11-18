import { test, expect } from '@playwright/test';
import { guardConsole, expectClean, open, waitScene, gs, shot, walkTo } from './helpers.js';

test('en compu: teclado (flechas/WASD + Espacio) y la página del QR', async ({ page }, testInfo) => {
  const problems = guardConsole(page);
  await open(page, 'test=1');
  await waitScene(page, 'Title');
  await expect(page.locator('#rotate')).toBeHidden();
  await page.mouse.click(640, 400);
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.__TEST__.jump('Game'));
  await waitScene(page, 'Game');
  // Vamos al pasillo (ahí no deambulan pacientes que puedan cruzarse).
  await walkTo(page, 8, 9);
  const p0 = (await gs(page)).player;
  expect(p0).toMatchObject({ x: 8, y: 9 });
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(500);
  const p1 = (await gs(page)).player;
  expect(p1.x).toBeLessThan(p0.x);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(500);
  expect((await gs(page)).player.y).toBeLessThan(p1.y);
  await shot(page, testInfo, 'compu-juego');

  await page.goto('./qr.html');
  await expect(page.locator('.qr img')).toBeVisible();
  const src = await page.locator('.qr img').getAttribute('src');
  expect(src.startsWith('data:image/png;base64,')).toBe(true);
  await expect(page.locator('.url')).toContainText('github.io/sanatorio-del-oeste-juego/');
  await shot(page, testInfo, 'qr');
  expectClean(problems);
});
