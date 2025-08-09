import { test, expect } from '@playwright/test';

// Helper to poke game state from the browser context
async function getState(page: any) {
  return await page.evaluate(() => {
    // @ts-ignore
    const g = window.__game?.state;
    if (!g) return null;
    return {
      score: g.score,
      level: g.level,
      gameOver: g.gameOver,
      paused: g.paused,
      patties: g.patties.length,
      bullets: g.bullets.length,
    };
  });
}

test.describe('Game stability past 19k score', () => {
  test('does not freeze and remains interactive beyond 19k/L19', async ({ page }) => {
    await page.goto('/');
    const canvas = page.getByRole('application', { name: /game canvas/i });
    await canvas.click();

    // Ensure test handle is present (dev only)
    const hasHandle = await page.evaluate(() => Boolean((window as any).__game?.state));
    test.skip(!hasHandle, 'dev test handle not available');

    // Make the run safe from death while testing
    await page.evaluate(() => {
      // @ts-ignore
      const g = window.__game?.state; if (!g) return;
      g.player.hits = 0; g.player.invuln = 999; g.gameOver = false; g.paused = false;
      g.level = 18; g.score = 18950; g.scoreAtLevelStart = 18000;
    });

    // Fire rapidly and spawn some targets ahead to push score high
    for (let k=0;k<8;k++) {
      await page.keyboard.press('Space');
      await page.evaluate(() => {
        // @ts-ignore
        const g = window.__game?.state; if (!g) return;
        const p = g.player; const y = p.y - 180 - Math.random()*60;
        g.patties.push({ x: p.x + (Math.random()*60-30), y, vx: 0, vy: 0, size: 50 });
        g.bullets.push({ x: p.x, y: y-10, vy: 160, r: 6, kind: 'bubble' });
      });
      await page.waitForTimeout(80);
    }

    // Let the loop process
    await page.waitForTimeout(800);

    const s1 = await getState(page);
    expect(s1).toBeTruthy();
    expect(s1!.gameOver).toBeFalsy();
    expect(s1!.paused).toBeFalsy();
    expect(s1!.score).toBeGreaterThanOrEqual(19000);

    // Continue a bit more to ensure stability
    for (let i=0;i<12;i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }
    const s2 = await getState(page);
    expect(s2!.gameOver).toBeFalsy();
    expect(s2!.score).toBeGreaterThanOrEqual(s1!.score);
  });
});
