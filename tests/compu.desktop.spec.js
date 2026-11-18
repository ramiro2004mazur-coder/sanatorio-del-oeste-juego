import { test, expect } from '@playwright/test';
import { guardConsole, expectClean, open, waitScene, gs, shot } from './helpers.js';

test('en compu: teclado (flechas/WASD + Espacio) y la página del QR', async ({ page }, testInfo) => {
  const problems = guardConsole(page);
  await open(page, 'test=1');
  await waitScene(page, 'Title');
  await expect(page.locator('#rotate')).toBeHidden();
  await page.mouse.click(640, 400);
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.__TEST__.jump('Game'));
  await waitScene(page, 'Game');
  const p0 = (await gs(page)).player;
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(400);
  const p1 = (await gs(page)).player;
  expect(p1.y).toBeLessThan(p0.y);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(400);
  expect((await gs(page)).player.x).toBeLessThan(p1.x);
  await shot(page, testInfo, 'compu-juego');

  await page.goto('./qr.html');
  await expect(page.locator('.qr img')).toBeVisible();
  const src = await page.locator('.qr img').getAttribute('src');
  expect(src.startsWith('data:image/png;base64,')).toBe(true);
  await expect(page.locator('.url')).toContainText('github.io/sanatorio-del-oeste-juego/');
  await shot(page, testInfo, 'qr');
  expectClean(problems);
});
