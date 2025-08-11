import { test, expect } from '@playwright/test';

test('Active play: player y% preserved across resizes', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByRole('application', { name: /game canvas/i });
  await canvas.click();

  const hasHandle = await page.evaluate(() => Boolean((window as any).__game?.state));
  test.skip(!hasHandle, 'dev test handle not available');

  // Set a custom starting y% and unpause
  await page.evaluate(() => {
    const g = (window as any).__game?.state; if (!g) return;
    g.paused = false;
    g.player.y = g.h() * 0.65;
  });

  async function readYPct() {
    return await page.evaluate(() => {
      const g = (window as any).__game?.state; if (!g) return null;
      return g.player.y / Math.max(1, g.h());
    });
  }

  const start = await readYPct();
  expect(start).toBeGreaterThan(0.60);
  expect(start).toBeLessThan(0.70);

  const sizes = [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ];

  for (const s of sizes) {
    await page.setViewportSize(s);
    await page.waitForTimeout(120);
    const y = await readYPct();
    expect(y!).toBeGreaterThanOrEqual(start! - 0.04);
    expect(y!).toBeLessThanOrEqual(start! + 0.04);
  }
});


