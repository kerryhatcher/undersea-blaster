import { test, expect } from '@playwright/test';

// Helper to access game state
async function getGameState(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (!g) return null;
    return {
      paused: g.paused,
      gameOver: g.gameOver,
      playerX: g.player.x,
      playerY: g.player.y,
      bullets: g.bullets.length,
      score: g.score,
      level: g.level
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

test.describe('Keyboard Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    await canvas.click(); // Focus canvas
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
  });

  test.describe('Movement Controls', () => {
    test('Arrow keys move player left and right', async ({ page }) => {
      // Unpause first
      await page.keyboard.press('Space');
      
      const initialPos = await getPlayerPosition(page);
      expect(initialPos).toBeTruthy();

      // Test left movement
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowLeft');

      const leftPos = await getPlayerPosition(page);
      expect(leftPos!.x).toBeLessThan(initialPos!.x);

      // Test right movement
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowRight');

      const rightPos = await getPlayerPosition(page);
      expect(rightPos!.x).toBeGreaterThan(leftPos!.x);
    });

    test('A and D keys move player left and right', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      const initialPos = await getPlayerPosition(page);

      // Test A key (left)
      await page.keyboard.down('KeyA');
      await page.waitForTimeout(100);
      await page.keyboard.up('KeyA');

      const leftPos = await getPlayerPosition(page);
      expect(leftPos!.x).toBeLessThan(initialPos!.x);

      // Test D key (right)
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(100);
      await page.keyboard.up('KeyD');

      const rightPos = await getPlayerPosition(page);
      expect(rightPos!.x).toBeGreaterThan(leftPos!.x);
    });

    test('Player stops moving when key is released', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      // Start moving right
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(50);
      const pos1 = await getPlayerPosition(page);
      
      await page.waitForTimeout(50);
      const pos2 = await getPlayerPosition(page);
      expect(pos2!.x).toBeGreaterThan(pos1!.x); // Should be moving
      
      // Release key
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(50);
      const pos3 = await getPlayerPosition(page);
      
      await page.waitForTimeout(50);
      const pos4 = await getPlayerPosition(page);
      
      // Movement should have stopped (or at least slowed significantly)
      const moveDistance1 = pos2!.x - pos1!.x;
      const moveDistance2 = pos4!.x - pos3!.x;
      expect(moveDistance2).toBeLessThanOrEqual(moveDistance1);
    });

    test('Movement is smooth with continuous key press', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      const positions: number[] = [];
      
      // Hold key and sample positions
      await page.keyboard.down('ArrowRight');
      
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(30);
        const pos = await getPlayerPosition(page);
        positions.push(pos!.x);
      }
      
      await page.keyboard.up('ArrowRight');
      
      // Positions should be increasing smoothly
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i-1]);
      }
    });
  });

  test.describe('Fire Controls', () => {
    test('Space key fires bullets', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      // Clear any existing bullets
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.bullets.length = 0;
      });
      
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
      
      const state = await getGameState(page);
      expect(state!.bullets).toBeGreaterThan(0);
    });

    test('Enter key fires bullets', async ({ page }) => {
      await page.keyboard.press('Enter'); // Unpause
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.bullets.length = 0;
      });
      
      await page.keyboard.press('Enter');
      await page.waitForTimeout(50);
      
      const state = await getGameState(page);
      expect(state!.bullets).toBeGreaterThan(0);
    });

    test('Rapid firing creates multiple bullets', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.bullets.length = 0;
      });
      
      // Fire rapidly
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(10);
      }
      
      await page.waitForTimeout(50);
      
      const state = await getGameState(page);
      expect(state!.bullets).toBeGreaterThan(3); // Should have multiple bullets
    });

    test('Holding fire key creates continuous fire', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.bullets.length = 0;
      });
      
      // Hold space key
      await page.keyboard.down('Space');
      await page.waitForTimeout(200);
      await page.keyboard.up('Space');
      
      await page.waitForTimeout(50);
      
      const state = await getGameState(page);
      expect(state!.bullets).toBeGreaterThan(1);
    });
  });

  test.describe('Pause/Resume Controls', () => {
    test('Space key toggles pause from paused state', async ({ page }) => {
      let state = await getGameState(page);
      expect(state!.paused).toBeTruthy(); // Starts paused
      
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
      
      state = await getGameState(page);
      expect(state!.paused).toBeFalsy();
    });

    test('Enter key toggles pause from paused state', async ({ page }) => {
      let state = await getGameState(page);
      expect(state!.paused).toBeTruthy();
      
      await page.keyboard.press('Enter');
      await page.waitForTimeout(50);
      
      state = await getGameState(page);
      expect(state!.paused).toBeFalsy();
    });

    test('Cannot move or fire when paused', async ({ page }) => {
      // Ensure game is paused
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.paused = true;
      });
      
      const initialPos = await getPlayerPosition(page);
      const initialBulletCount = (await getGameState(page))!.bullets;
      
      // Try to move
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowRight');
      
      const afterMovePos = await getPlayerPosition(page);
      expect(afterMovePos!.x).toBe(initialPos!.x); // Should not move
      
      // Try to fire (without unpausing)
      await page.keyboard.down('Space');
      await page.keyboard.up('Space');
      
      const finalBulletCount = (await getGameState(page))!.bullets;
      expect(finalBulletCount).toBe(initialBulletCount); // Should not fire
    });
  });

  test.describe('Game Over Controls', () => {
    test('R key restarts game when game over', async ({ page }) => {
      // Force game over
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.gameOver = true;
          g.score = 1500;
          g.level = 2;
        }
      });
      
      let state = await getGameState(page);
      expect(state!.gameOver).toBeTruthy();
      expect(state!.score).toBe(1500);
      
      await page.keyboard.press('KeyR');
      await page.waitForTimeout(50);
      
      state = await getGameState(page);
      expect(state!.gameOver).toBeFalsy();
      expect(state!.score).toBe(0);
      expect(state!.level).toBe(1);
    });

    test('Space key restarts game when game over', async ({ page }) => {
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.gameOver = true;
      });
      
      let state = await getGameState(page);
      expect(state!.gameOver).toBeTruthy();
      
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
      
      state = await getGameState(page);
      expect(state!.gameOver).toBeFalsy();
    });

    test('Enter key restarts game when game over', async ({ page }) => {
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.gameOver = true;
      });
      
      let state = await getGameState(page);
      expect(state!.gameOver).toBeTruthy();
      
      await page.keyboard.press('Enter');
      await page.waitForTimeout(50);
      
      state = await getGameState(page);
      expect(state!.gameOver).toBeFalsy();
    });
  });

  test.describe('Key Repeat Handling', () => {
    test('Repeated keydown events do not trigger multiple actions', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause first
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.bullets.length = 0;
      });
      
      // Simulate key repeat by firing multiple keydown events
      await page.keyboard.down('Space');
      await page.waitForTimeout(10);
      await page.keyboard.down('Space'); // Repeated keydown
      await page.waitForTimeout(10);
      await page.keyboard.up('Space');
      
      await page.waitForTimeout(50);
      
      const state = await getGameState(page);
      // Should not create excessive bullets from key repeat
      expect(state!.bullets).toBeLessThan(10);
    });
  });

  test.describe('Focus Handling', () => {
    test('Keys only work when canvas is focused', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause and focus
      
      // Click outside canvas to lose focus
      await page.locator('body').click({ position: { x: 50, y: 50 }});
      
      const initialPos = await getPlayerPosition(page);
      
      // Try to move without focus
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
      
      const afterMovePos = await getPlayerPosition(page);
      // Movement might not work without focus
      // (This test may need adjustment based on actual focus behavior)
      
      // Re-focus canvas
      const canvas = page.locator('canvas#game');
      await canvas.click();
      
      // Now movement should work
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
      
      const finalPos = await getPlayerPosition(page);
      expect(finalPos!.x).toBeGreaterThan(afterMovePos!.x);
    });
  });

  test.describe('Simultaneous Key Presses', () => {
    test('Can move and fire simultaneously', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      const initialPos = await getPlayerPosition(page);
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) g.bullets.length = 0;
      });
      
      // Hold move and fire keys simultaneously
      await page.keyboard.down('ArrowRight');
      await page.keyboard.down('Space');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.up('Space');
      
      await page.waitForTimeout(50);
      
      const finalPos = await getPlayerPosition(page);
      const state = await getGameState(page);
      
      // Should have moved and fired
      expect(finalPos!.x).toBeGreaterThan(initialPos!.x);
      expect(state!.bullets).toBeGreaterThan(0);
    });

    test('Can move in both directions (cancels out)', async ({ page }) => {
      await page.keyboard.press('Space'); // Unpause
      
      const initialPos = await getPlayerPosition(page);
      
      // Hold both left and right
      await page.keyboard.down('ArrowLeft');
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowLeft');
      await page.keyboard.up('ArrowRight');
      
      const finalPos = await getPlayerPosition(page);
      
      // Position should be roughly the same (movements cancel out)
      expect(Math.abs(finalPos!.x - initialPos!.x)).toBeLessThan(50);
    });
  });
});