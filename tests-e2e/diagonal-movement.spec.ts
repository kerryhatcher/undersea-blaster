import { test, expect } from '@playwright/test';

async function getXY(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state; if (!g) return null;
    return { x: g.player.x, y: g.player.y };
  });
}

test.describe('Diagonal movement', () => {
  test('ArrowLeft+ArrowUp and ArrowRight+ArrowDown move on both axes', async ({ page }) => {
    await page.goto('/');
    const canvas = page.getByRole('application', { name: /game canvas/i });
    await canvas.click();
    const hasHandle = await page.evaluate(() => Boolean((window as any).__game?.state));
    test.skip(!hasHandle, 'dev test handle not available');

    // Unpause
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);

    // Baseline
    let start = await getXY(page);

    // Hold Left+Up
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowLeft');
    let afterLU = await getXY(page);
    expect(afterLU!.x).toBeLessThan(start!.x);
    expect(afterLU!.y).toBeLessThan(start!.y);

    // Hold Right+Down
    start = afterLU;
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowDown');
    await page.keyboard.up('ArrowRight');
    const afterRD = await getXY(page);
    expect(afterRD!.x).toBeGreaterThan(start!.x);
    expect(afterRD!.y).toBeGreaterThan(start!.y);
  });

  test('Sequential press still yields diagonal (Left then Up; Up then Left)', async ({ page }) => {
    await page.goto('/');
    const canvas = page.getByRole('application', { name: /game canvas/i });
    await canvas.click();
    const hasHandle = await page.evaluate(() => Boolean((window as any).__game?.state));
    test.skip(!hasHandle, 'dev test handle not available');
    await page.keyboard.press('Enter');

    const stepDiag = async (first: string, second: string) => {
      const s = await getXY(page);
      await page.keyboard.down(first);
      await page.waitForTimeout(40);
      await page.keyboard.down(second);
      await page.waitForTimeout(260);
      await page.keyboard.up(second);
      await page.keyboard.up(first);
      const a = await getXY(page);
      return { s, a };
    };

    let r = await stepDiag('ArrowLeft','ArrowUp');
    expect(r.a!.x).toBeLessThan(r.s!.x);
    expect(r.a!.y).toBeLessThan(r.s!.y);

    r = await stepDiag('ArrowUp','ArrowLeft');
    expect(r.a!.x).toBeLessThan(r.s!.x);
    expect(r.a!.y).toBeLessThan(r.s!.y);
  });
});


