import { test, expect } from '@playwright/test';

test('Mobile rotation keeps player visible', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByRole('application', { name: /game canvas/i });
  await canvas.click();
  const hasHandle = await page.evaluate(() => Boolean((window as any).__game?.state));
  test.skip(!hasHandle, 'dev test handle not available');

  async function readYPct() {
    return await page.evaluate(() => {
      const c = document.getElementById('game') as HTMLCanvasElement | null;
      if (!c) return null;
      const pct = parseFloat(c.dataset.playerYpct || 'NaN');
      return isFinite(pct) ? pct : null;
    });
  }

  // Portrait
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  const yPortrait = await readYPct();
  expect(yPortrait).not.toBeNull();
  expect(yPortrait!).toBeGreaterThanOrEqual(0.2);
  expect(yPortrait!).toBeLessThanOrEqual(0.95);

  // Landscape
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(80);
  const yLandscape = await readYPct();
  expect(yLandscape).not.toBeNull();
  expect(yLandscape!).toBeGreaterThanOrEqual(0.2);
  expect(yLandscape!).toBeLessThanOrEqual(0.95);
});


