import { test, expect } from '@playwright/test';

test('Canvas backing size matches client size × DPR', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByRole('application', { name: /game canvas/i });
  await canvas.click();

  const sizes = [
    { width: 800, height: 600 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ];

  for (const s of sizes) {
    await page.setViewportSize(s);
    // allow resize handlers to run
    await page.waitForTimeout(80);
    const ok = await page.evaluate(() => {
      const c = document.getElementById('game') as HTMLCanvasElement | null;
      if (!c) return false;
      const dpr = Math.max(1, (window.devicePixelRatio || 1));
      const cw = Math.round(c.clientWidth); const ch = Math.round(c.clientHeight);
      const bw = c.width, bh = c.height;
      return Math.abs(Math.round(bw / dpr) - cw) <= 1 && Math.abs(Math.round(bh / dpr) - ch) <= 1;
    });
    expect(ok).toBeTruthy();
  }
});


