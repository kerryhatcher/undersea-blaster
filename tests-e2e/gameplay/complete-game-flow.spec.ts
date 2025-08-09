import { test, expect } from '@playwright/test';

// Helper to access game state from browser context
async function getGameState(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (!g) return null;
    return {
      score: g.score,
      level: g.level,
      gameOver: g.gameOver,
      paused: g.paused,
      patties: g.patties.length,
      bullets: g.bullets.length,
      playerHits: g.player.hits,
      playerMaxHits: g.player.maxHits,
      playerInvuln: g.player.invuln
    };
  });
}

// Helper to reset game to fresh state
async function resetGame(page: any) {
  await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (g) {
      // Use the game's hard reset function
      const { hardReset } = window as any;
      if (hardReset) hardReset(g);
    }
  });
}

test.describe('Complete Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Ensure canvas is loaded and game is initialized
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    
    // Wait for game state to be available
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
  });

  test('New game starts with correct initial state', async ({ page }) => {
    const state = await getGameState(page);
    expect(state).toBeTruthy();
    expect(state!.score).toBe(0);
    expect(state!.level).toBe(1);
    expect(state!.gameOver).toBeFalsy();
    expect(state!.paused).toBeTruthy(); // Game starts paused
    expect(state!.playerHits).toBe(0);
    expect(state!.playerMaxHits).toBe(5);
  });

  test('Player can unpause and start playing', async ({ page }) => {
    // Game should start paused
    let state = await getGameState(page);
    expect(state!.paused).toBeTruthy();

    // Click canvas to focus, then press space to unpause
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space');

    // Give it a moment to unpause
    await page.waitForTimeout(100);
    
    state = await getGameState(page);
    expect(state!.paused).toBeFalsy();
  });

  test('Player movement responds to keyboard controls', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Get initial player position
    const initialPos = await page.evaluate(() => {
      const g = (window as any).__game?.state;
      return { x: g.player.x, y: g.player.y };
    });

    // Press left arrow and verify movement
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(100); // Let movement happen
    await page.keyboard.up('ArrowLeft');

    const leftPos = await page.evaluate(() => {
      const g = (window as any).__game?.state;
      return { x: g.player.x, y: g.player.y };
    });
    
    expect(leftPos.x).toBeLessThan(initialPos.x);

    // Press right arrow and verify movement
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowRight');

    const rightPos = await page.evaluate(() => {
      const g = (window as any).__game?.state;
      return { x: g.player.x, y: g.player.y };
    });
    
    expect(rightPos.x).toBeGreaterThan(leftPos.x);
  });

  test('Player can fire bullets', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause

    // Fire a bullet
    await page.keyboard.press('Space');
    await page.waitForTimeout(50); // Let bullet spawn

    const state = await getGameState(page);
    expect(state!.bullets).toBeGreaterThan(0);
  });

  test('Score increases when bullets hit enemies', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause

    // Spawn an enemy directly above player and a bullet to hit it
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const p = g.player;
      // Spawn enemy right above player
      g.patties.push({ 
        x: p.x, 
        y: p.y - 100, 
        vx: 0, 
        vy: 20, // Moving down slowly
        size: 50 
      });
      // Fire bullet upward
      g.bullets.push({ 
        x: p.x, 
        y: p.y - 50, 
        vy: -200, // Moving up fast
        r: 6, 
        kind: 'bubble' 
      });
    });

    const initialScore = (await getGameState(page))!.score;
    
    // Wait for collision to happen
    await page.waitForTimeout(300);
    
    const finalScore = (await getGameState(page))!.score;
    expect(finalScore).toBeGreaterThan(initialScore);
  });

  test('Level progression occurs at 1000 point intervals', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause

    // Boost score to just under level 2
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.score = 950;
        g.scoreAtLevelStart = 0;
      }
    });

    let state = await getGameState(page);
    expect(state!.level).toBe(1);

    // Add 50 more points to cross threshold
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) g.score = 1050;
    });

    // Wait for level up to process
    await page.waitForTimeout(100);

    state = await getGameState(page);
    expect(state!.level).toBe(2);
  });

  test('Player takes damage from enemy collision', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause

    // Spawn enemy on top of player
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const p = g.player;
      g.patties.push({ 
        x: p.x, 
        y: p.y, 
        vx: 0, 
        vy: 0, 
        size: 50 
      });
      // Remove invulnerability if any
      p.invuln = 0;
    });

    const initialHits = (await getGameState(page))!.playerHits;
    
    // Wait for collision to be processed
    await page.waitForTimeout(200);
    
    const finalHits = (await getGameState(page))!.playerHits;
    expect(finalHits).toBeGreaterThan(initialHits);
  });

  test('Game over occurs when player health depleted', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause

    // Set player to critical health
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.player.hits = 4; // One hit away from death (maxHits = 5)
        g.player.invuln = 0;
        
        // Spawn enemy on player
        g.patties.push({ 
          x: g.player.x, 
          y: g.player.y, 
          vx: 0, 
          vy: 0, 
          size: 50 
        });
      }
    });

    // Wait for collision and game over
    await page.waitForTimeout(300);
    
    const state = await getGameState(page);
    expect(state!.gameOver).toBeTruthy();
  });

  test('Game can be restarted after game over', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();

    // Force game over
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.gameOver = true;
        g.player.hits = 5;
      }
    });

    let state = await getGameState(page);
    expect(state!.gameOver).toBeTruthy();

    // Press R to restart
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(100);

    state = await getGameState(page);
    expect(state!.gameOver).toBeFalsy();
    expect(state!.score).toBe(0);
    expect(state!.level).toBe(1);
    expect(state!.playerHits).toBe(0);
  });

  test('Full game session maintains stability', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause

    // Make player invulnerable for stability test
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.player.invuln = 999;
        g.player.hits = 0;
      }
    });

    // Simulate extended gameplay
    for (let i = 0; i < 10; i++) {
      // Fire bullets
      await page.keyboard.press('Space');
      
      // Move player
      if (i % 2 === 0) {
        await page.keyboard.press('ArrowLeft');
      } else {
        await page.keyboard.press('ArrowRight');
      }
      
      // Spawn some enemies and targets
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        // Add some enemies
        if (Math.random() < 0.3) {
          g.patties.push({ 
            x: Math.random() * g.w(), 
            y: -50, 
            vx: (Math.random() - 0.5) * 100, 
            vy: Math.random() * 100 + 50, 
            size: 50 
          });
        }
      });
      
      await page.waitForTimeout(100);
    }

    // Verify game is still running and stable
    const state = await getGameState(page);
    expect(state).toBeTruthy();
    expect(state!.gameOver).toBeFalsy();
    expect(state!.score).toBeGreaterThanOrEqual(0);
  });
});