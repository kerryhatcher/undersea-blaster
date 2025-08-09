import { test, expect } from '@playwright/test';

// Helper to get game state
async function getGameState(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (!g) return null;
    return {
      paused: g.paused,
      playerX: g.player.x,
      playerY: g.player.y,
      bullets: g.bullets.length
    };
  });
}

// Helper to get player position
async function getPlayerPosition(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    return g ? { x: g.player.x, y: g.player.y } : null;
  });
}

test.describe('Touch Controls (Mobile)', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
  });

  test('Touch to unpause game', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    let state = await getGameState(page);
    expect(state!.paused).toBeTruthy();
    
    // Touch canvas to unpause
    await canvas.tap();
    await page.waitForTimeout(100);
    
    state = await getGameState(page);
    expect(state!.paused).toBeFalsy();
  });

  test('Touch left side to move left', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    // Unpause first
    await canvas.tap();
    await page.waitForTimeout(100);
    
    const initialPos = await getPlayerPosition(page);
    expect(initialPos).toBeTruthy();
    
    // Get canvas bounds for touch positioning
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).toBeTruthy();
    
    // Touch left side of screen (left quarter)
    const leftX = canvasBounds!.x + (canvasBounds!.width * 0.15);
    const centerY = canvasBounds!.y + (canvasBounds!.height * 0.5);
    
    // Start touch and hold briefly
    await page.touchscreen.tap(leftX, centerY);
    await page.waitForTimeout(150);
    
    const finalPos = await getPlayerPosition(page);
    expect(finalPos!.x).toBeLessThan(initialPos!.x);
  });

  test('Touch right side to move right', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    await canvas.tap();
    await page.waitForTimeout(100);
    
    const initialPos = await getPlayerPosition(page);
    const canvasBounds = await canvas.boundingBox();
    
    // Touch right side of screen (right quarter)
    const rightX = canvasBounds!.x + (canvasBounds!.width * 0.85);
    const centerY = canvasBounds!.y + (canvasBounds!.height * 0.5);
    
    await page.touchscreen.tap(rightX, centerY);
    await page.waitForTimeout(150);
    
    const finalPos = await getPlayerPosition(page);
    expect(finalPos!.x).toBeGreaterThan(initialPos!.x);
  });

  test('Touch center area to fire', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    await canvas.tap();
    await page.waitForTimeout(100);
    
    // Clear existing bullets
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) g.bullets.length = 0;
    });
    
    const canvasBounds = await canvas.boundingBox();
    
    // Touch center area
    const centerX = canvasBounds!.x + (canvasBounds!.width * 0.5);
    const centerY = canvasBounds!.y + (canvasBounds!.height * 0.6);
    
    await page.touchscreen.tap(centerX, centerY);
    await page.waitForTimeout(50);
    
    const state = await getGameState(page);
    expect(state!.bullets).toBeGreaterThan(0);
  });

  test('Continuous touch movement', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    await canvas.tap();
    await page.waitForTimeout(100);
    
    const canvasBounds = await canvas.boundingBox();
    const positions: number[] = [];
    
    // Start on left side
    const startX = canvasBounds!.x + (canvasBounds!.width * 0.1);
    const endX = canvasBounds!.x + (canvasBounds!.width * 0.9);
    const centerY = canvasBounds!.y + (canvasBounds!.height * 0.5);
    
    // Simulate drag from left to right
    await page.touchscreen.tap(startX, centerY);
    
    // Sample positions during movement
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(30);
      const pos = await getPlayerPosition(page);
      positions.push(pos!.x);
      
      // Continue touch movement
      const currentX = startX + ((endX - startX) * (i + 1) / 5);
      await page.touchscreen.tap(currentX, centerY);
    }
    
    // Positions should generally increase (moving right)
    let increasingCount = 0;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] >= positions[i-1]) increasingCount++;
    }
    
    // Most positions should be increasing
    expect(increasingCount).toBeGreaterThan(positions.length / 2);
  });

  test('Multi-touch: Move and fire simultaneously', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    await canvas.tap();
    await page.waitForTimeout(100);
    
    // Clear bullets
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) g.bullets.length = 0;
    });
    
    const initialPos = await getPlayerPosition(page);
    const canvasBounds = await canvas.boundingBox();
    
    // Touch left side for movement
    const leftX = canvasBounds!.x + (canvasBounds!.width * 0.2);
    const leftY = canvasBounds!.y + (canvasBounds!.height * 0.5);
    
    // Touch center for firing
    const centerX = canvasBounds!.x + (canvasBounds!.width * 0.5);
    const centerY = canvasBounds!.y + (canvasBounds!.height * 0.6);
    
    // Simulate multi-touch (this may be limited on some devices/browsers)
    await Promise.all([
      page.touchscreen.tap(leftX, leftY),
      page.touchscreen.tap(centerX, centerY)
    ]);
    
    await page.waitForTimeout(100);
    
    const finalPos = await getPlayerPosition(page);
    const state = await getGameState(page);
    
    // Should have moved left and fired
    expect(finalPos!.x).toBeLessThan(initialPos!.x);
    expect(state!.bullets).toBeGreaterThan(0);
  });

  test('Touch areas respond correctly on different screen orientations', async ({ page }) => {
    // Test portrait orientation (default)
    await page.setViewportSize({ width: 375, height: 667 });
    
    const canvas = page.locator('canvas#game');
    await canvas.tap();
    await page.waitForTimeout(100);
    
    let canvasBounds = await canvas.boundingBox();
    expect(canvasBounds!.height).toBeGreaterThan(canvasBounds!.width);
    
    // Test touch in portrait
    const leftX = canvasBounds!.x + (canvasBounds!.width * 0.2);
    const centerY = canvasBounds!.y + (canvasBounds!.height * 0.5);
    
    const initialPos = await getPlayerPosition(page);
    await page.touchscreen.tap(leftX, centerY);
    await page.waitForTimeout(100);
    
    const portraitPos = await getPlayerPosition(page);
    expect(portraitPos!.x).toBeLessThan(initialPos!.x);
    
    // Switch to landscape orientation
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(200);
    
    canvasBounds = await canvas.boundingBox();
    expect(canvasBounds!.width).toBeGreaterThan(canvasBounds!.height);
    
    // Test touch in landscape
    const landscapeLeftX = canvasBounds!.x + (canvasBounds!.width * 0.2);
    const landscapeCenterY = canvasBounds!.y + (canvasBounds!.height * 0.5);
    
    const beforeLandscapePos = await getPlayerPosition(page);
    await page.touchscreen.tap(landscapeLeftX, landscapeCenterY);
    await page.waitForTimeout(100);
    
    const afterLandscapePos = await getPlayerPosition(page);
    expect(afterLandscapePos!.x).toBeLessThan(beforeLandscapePos!.x);
  });

  test('Touch sensitivity and responsiveness', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    await canvas.tap();
    await page.waitForTimeout(100);
    
    const canvasBounds = await canvas.boundingBox();
    const centerY = canvasBounds!.y + (canvasBounds!.height * 0.5);
    
    // Test rapid taps (should be responsive)
    const rapidTapPositions: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const tapX = canvasBounds!.x + (canvasBounds!.width * (0.2 + i * 0.15));
      await page.touchscreen.tap(tapX, centerY);
      await page.waitForTimeout(50);
      
      const pos = await getPlayerPosition(page);
      rapidTapPositions.push(pos!.x);
    }
    
    // Positions should change with each tap
    let changedCount = 0;
    for (let i = 1; i < rapidTapPositions.length; i++) {
      if (Math.abs(rapidTapPositions[i] - rapidTapPositions[i-1]) > 5) {
        changedCount++;
      }
    }
    
    expect(changedCount).toBeGreaterThan(rapidTapPositions.length / 2);
  });

  test('Touch controls work with game paused', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    // Ensure game is paused
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) g.paused = true;
    });
    
    let state = await getGameState(page);
    expect(state!.paused).toBeTruthy();
    
    // Touch should unpause
    await canvas.tap();
    await page.waitForTimeout(100);
    
    state = await getGameState(page);
    expect(state!.paused).toBeFalsy();
  });

  test('Prevent page scrolling during touch gameplay', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    
    await canvas.tap();
    await page.waitForTimeout(100);
    
    // Get initial scroll position
    const initialScroll = await page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY
    }));
    
    const canvasBounds = await canvas.boundingBox();
    
    // Perform various touches that might trigger scrolling
    const touches = [
      { x: canvasBounds!.x + 50, y: canvasBounds!.y + 50 },
      { x: canvasBounds!.x + canvasBounds!.width - 50, y: canvasBounds!.y + 100 },
      { x: canvasBounds!.x + canvasBounds!.width / 2, y: canvasBounds!.y + canvasBounds!.height - 50 }
    ];
    
    for (const touch of touches) {
      await page.touchscreen.tap(touch.x, touch.y);
      await page.waitForTimeout(50);
    }
    
    // Check that page didn't scroll
    const finalScroll = await page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY
    }));
    
    expect(finalScroll.x).toBe(initialScroll.x);
    expect(finalScroll.y).toBe(initialScroll.y);
  });

  test('Touch controls scale properly with canvas size', async ({ page }) => {
    // Test different mobile screen sizes
    const screenSizes = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 414, height: 896, name: 'iPhone XR' },
      { width: 360, height: 640, name: 'Android Small' }
    ];
    
    for (const size of screenSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
      
      const canvas = page.locator('canvas#game');
      await canvas.tap();
      await page.waitForTimeout(50);
      
      const canvasBounds = await canvas.boundingBox();
      const initialPos = await getPlayerPosition(page);
      
      // Touch left side (should be consistent across sizes)
      const leftX = canvasBounds!.x + (canvasBounds!.width * 0.15);
      const centerY = canvasBounds!.y + (canvasBounds!.height * 0.5);
      
      await page.touchscreen.tap(leftX, centerY);
      await page.waitForTimeout(80);
      
      const finalPos = await getPlayerPosition(page);
      expect(finalPos!.x).toBeLessThan(initialPos!.x);
      
      console.log(`Touch controls verified on ${size.name} (${size.width}x${size.height})`);
    }
  });
});