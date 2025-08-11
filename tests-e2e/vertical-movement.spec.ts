import { test, expect } from '@playwright/test';

test('Vertical movement with keyboard and drag', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByRole('application', { name: /game canvas/i });
  await canvas.click();

  const hasHandle = await page.evaluate(() => Boolean((window as any).__game?.state));
  test.skip(!hasHandle, 'dev test handle not available');

  // Unpause
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);

  const readY = async () => await page.evaluate(() => (window as any).__game?.state?.player?.y ?? null);
  const startY = await readY();

  // Move up a bit
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowUp');
  const afterUp = await readY();
  expect(afterUp).toBeLessThan(startY!);

  // Move down a bit
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowDown');
  const afterDown = await readY();
  expect(afterDown).toBeGreaterThan(afterUp!);

  // Drag upward then downward
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width/2;
    const cy = box.y + box.height * 0.7;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 120, { steps: 8 });
    await page.waitForTimeout(50);
    const draggedUp = await readY();
    await page.mouse.move(cx, cy + 120, { steps: 8 });
    await page.mouse.up();
    const draggedDown = await readY();
    expect(draggedUp!).toBeLessThanOrEqual(afterDown!);
    expect(draggedDown!).toBeGreaterThanOrEqual(draggedUp!);
  }
});


