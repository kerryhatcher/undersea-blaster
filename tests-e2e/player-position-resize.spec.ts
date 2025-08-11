import { test, expect } from '@playwright/test';

test.describe('Player position stability on resize', () => {
  test('y% remains ~0.78 when paused and stays visible during play', async ({ page }) => {
    await page.goto('/');
    const canvas = page.getByRole('application', { name: /game canvas/i });
    await canvas.click();
    // Ensure dev handle or test hook is present
    const hasHandle = await page.evaluate(() => Boolean((window as any).__game?.state));
    test.skip(!hasHandle, 'dev test handle not available');

    // Pause state baseline
    await page.evaluate(() => { (window as any).__game.state.paused = true; });

    async function readYPct() {
      return await page.evaluate(() => {
        const c = document.getElementById('game') as HTMLCanvasElement | null;
        if (!c) return null;
        const pct = parseFloat(c.dataset.playerYpct || 'NaN');
        return isFinite(pct) ? pct : null;
      });
    }

    const viewports = [
      { width: 654, height: 937 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(80);
      const y = await readYPct();
      expect(y).not.toBeNull();
      expect(y!).toBeGreaterThanOrEqual(0.75);
      expect(y!).toBeLessThanOrEqual(0.81);
    }

    // Unpause and verify stays visible within bounds after another resize
    await page.evaluate(() => { (window as any).__game.state.paused = false; });
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(80);
    const y2 = await readYPct();
    expect(y2).not.toBeNull();
    expect(y2!).toBeGreaterThanOrEqual(0.2);
    expect(y2!).toBeLessThanOrEqual(0.95);
  });
});


