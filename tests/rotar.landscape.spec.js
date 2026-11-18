import { test, expect } from '@playwright/test';
import { guardConsole, expectClean, open, waitScene, shot } from './helpers.js';

test('celular acostado: muestra "Girá el celu" y pausa sin romperse', async ({ page }, testInfo) => {
  const problems = guardConsole(page);
  await open(page, 'test=1');
  await waitScene(page, 'Title');
  await expect(page.locator('#rotate')).toBeVisible();
  await expect(page.locator('#rotate')).toContainText('Girá el celu');
  await page.evaluate(() => window.__TEST__.jump('Game'));
  await waitScene(page, 'Game');
  const t0 = (await page.evaluate(() => window.__TEST__.game())).elapsed;
  await page.waitForTimeout(1000);
  const t1 = (await page.evaluate(() => window.__TEST__.game())).elapsed;
  expect(t1 - t0).toBeLessThan(0.05);
  await shot(page, testInfo, 'girar');
  expectClean(problems);
});
