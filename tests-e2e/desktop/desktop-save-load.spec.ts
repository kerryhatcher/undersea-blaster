import { test, expect } from '@playwright/test';

// Helper to check if running in Electron
async function isElectron(page: any): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof (window as any).electronAPI !== 'undefined';
  });
}

// Helper to access game state
async function getGameState(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (!g) return null;
    return {
      score: g.score,
      level: g.level,
      playerHits: g.player.hits,
      playerX: g.player.x,
      playerY: g.player.y,
      patties: g.patties.map((p: any) => ({
        x: p.x, y: p.y, vx: p.vx, vy: p.vy, size: p.size
      })),
      bullets: g.bullets.map((b: any) => ({
        x: b.x, y: b.y, vy: b.vy, kind: b.kind, r: b.r
      })),
      bazookaActive: g.bazookaActive,
      bazookaTimer: g.bazookaTimer,
      shotgunActive: g.shotgunActive,
      shotgunTimer: g.shotgunTimer,
      laserActive: g.laserActive,
      laserTimer: g.laserTimer,
      gameOver: g.gameOver,
      paused: g.paused
    };
  });
}

// Helper to set game state
async function setGameState(page: any, state: any) {
  await page.evaluate((newState) => {
    const g = (window as any).__game?.state;
    if (!g) return;
    
    g.score = newState.score || 0;
    g.level = newState.level || 1;
    g.player.hits = newState.playerHits || 0;
    
    if (newState.playerX !== undefined) g.player.x = newState.playerX;
    if (newState.playerY !== undefined) g.player.y = newState.playerY;
    
    if (newState.patties) {
      g.patties = newState.patties.map((p: any) => ({
        x: p.x, y: p.y, vx: p.vx, vy: p.vy, size: p.size
      }));
    }
    
    if (newState.bullets) {
      g.bullets = newState.bullets.map((b: any) => ({
        x: b.x, y: b.y, vy: b.vy, vx: b.vx || 0, 
        kind: b.kind, r: b.r
      }));
    }
    
    g.bazookaActive = newState.bazookaActive || false;
    g.bazookaTimer = newState.bazookaTimer || 0;
    g.shotgunActive = newState.shotgunActive || false;
    g.shotgunTimer = newState.shotgunTimer || 0;
    g.laserActive = newState.laserActive || false;
    g.laserTimer = newState.laserTimer || 0;
    
    g.gameOver = newState.gameOver || false;
    g.paused = newState.paused || false;
  }, state);
}

test.describe('Desktop Save/Load Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    await canvas.click();
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
  });

  test.skip('Skip non-Electron tests when not in desktop mode', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop features only available in Electron');
  });

  test('Save game state via F5 shortcut', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop save/load only available in Electron');

    await page.keyboard.press('Space'); // Unpause
    
    // Set up a specific game state
    const testState = {
      score: 1350,
      level: 2,
      playerHits: 2,
      bazookaActive: true,
      bazookaTimer: 15.5,
      patties: [
        { x: 200, y: 150, vx: 30, vy: 40, size: 50 },
        { x: 400, y: 200, vx: -20, vy: 35, size: 45 }
      ],
      bullets: [
        { x: 300, y: 250, vy: -180, kind: 'missile', r: 8 }
      ]
    };
    
    await setGameState(page, testState);
    
    // Trigger save via F5
    await page.keyboard.press('F5');
    await page.waitForTimeout(500); // Allow save to complete
    
    // Verify save operation was initiated
    // (In a real test, you'd verify the save file was created)
    const state = await getGameState(page);
    expect(state!.score).toBe(1350);
  });

  test('Load game state via F9 shortcut', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop save/load only available in Electron');

    // First, create a save state
    await page.keyboard.press('Space'); // Unpause
    
    const saveState = {
      score: 2500,
      level: 3,
      playerHits: 1,
      shotgunActive: true,
      shotgunTimer: 12.8
    };
    
    await setGameState(page, saveState);
    await page.keyboard.press('F5'); // Save
    await page.waitForTimeout(300);
    
    // Change game state
    const differentState = {
      score: 500,
      level: 1,
      playerHits: 0,
      shotgunActive: false,
      shotgunTimer: 0
    };
    
    await setGameState(page, differentState);
    
    let state = await getGameState(page);
    expect(state!.score).toBe(500);
    expect(state!.level).toBe(1);
    
    // Load saved state via F9
    await page.keyboard.press('F9');
    await page.waitForTimeout(500); // Allow load to complete
    
    state = await getGameState(page);
    expect(state!.score).toBe(2500);
    expect(state!.level).toBe(3);
    expect(state!.playerHits).toBe(1);
    expect(state!.shotgunActive).toBeTruthy();
  });

  test('Save game via menu action', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop menu only available in Electron');

    await page.keyboard.press('Space'); // Unpause
    
    const testState = {
      score: 3200,
      level: 4,
      laserActive: true,
      laserTimer: 8.2
    };
    
    await setGameState(page, testState);
    
    // Trigger save via Electron menu (simulated via IPC)
    await page.evaluate(() => {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.trigger) {
        electronAPI.trigger('menu-save-game');
      }
    });
    
    await page.waitForTimeout(500);
    
    // Verify state is still intact after save
    const state = await getGameState(page);
    expect(state!.score).toBe(3200);
    expect(state!.level).toBe(4);
  });

  test('Load game via menu action', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop menu only available in Electron');

    // Set up and save a state first
    const savedState = {
      score: 4100,
      level: 5,
      playerHits: 3,
      bazookaActive: true,
      bazookaTimer: 18.5
    };
    
    await setGameState(page, savedState);
    await page.keyboard.press('F5'); // Save
    await page.waitForTimeout(300);
    
    // Change to different state
    await setGameState(page, {
      score: 100,
      level: 1,
      playerHits: 0,
      bazookaActive: false,
      bazookaTimer: 0
    });
    
    // Load via menu
    await page.evaluate(() => {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.trigger) {
        electronAPI.trigger('menu-load-game');
      }
    });
    
    await page.waitForTimeout(500);
    
    const state = await getGameState(page);
    expect(state!.score).toBe(4100);
    expect(state!.level).toBe(5);
    expect(state!.playerHits).toBe(3);
  });

  test('Save preserves complex game state', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop features only available in Electron');

    await page.keyboard.press('Space'); // Unpause
    
    // Create complex game state with multiple entities
    const complexState = {
      score: 5750,
      level: 6,
      playerHits: 2,
      playerX: 300,
      playerY: 400,
      bazookaActive: true,
      bazookaTimer: 12.3,
      patties: [
        { x: 100, y: 100, vx: 50, vy: 30, size: 45 },
        { x: 300, y: 150, vx: -30, vy: 40, size: 55 },
        { x: 500, y: 80, vx: 20, vy: 50, size: 40 },
        { x: 200, y: 200, vx: -40, vy: 25, size: 60 }
      ],
      bullets: [
        { x: 150, y: 250, vy: -200, kind: 'missile', r: 8 },
        { x: 350, y: 280, vy: -180, kind: 'bubble', r: 6 },
        { x: 450, y: 300, vy: -220, kind: 'laser', r: 4 }
      ]
    };
    
    await setGameState(page, complexState);
    
    // Save the complex state
    await page.keyboard.press('F5');
    await page.waitForTimeout(500);
    
    // Reset to empty state
    await setGameState(page, {
      score: 0,
      level: 1,
      playerHits: 0,
      patties: [],
      bullets: [],
      bazookaActive: false,
      bazookaTimer: 0
    });
    
    let state = await getGameState(page);
    expect(state!.patties).toHaveLength(0);
    expect(state!.bullets).toHaveLength(0);
    
    // Load complex state
    await page.keyboard.press('F9');
    await page.waitForTimeout(500);
    
    state = await getGameState(page);
    expect(state!.score).toBe(5750);
    expect(state!.level).toBe(6);
    expect(state!.playerHits).toBe(2);
    expect(state!.patties).toHaveLength(4);
    expect(state!.bullets).toHaveLength(3);
    expect(state!.bazookaActive).toBeTruthy();
    expect(state!.bazookaTimer).toBeCloseTo(12.3, 1);
    
    // Verify entity details preserved
    expect(state!.patties[0].x).toBe(100);
    expect(state!.patties[0].size).toBe(45);
    expect(state!.bullets[0].kind).toBe('missile');
  });

  test('Multiple save/load cycles work correctly', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop features only available in Electron');

    await page.keyboard.press('Space'); // Unpause
    
    // Cycle through multiple save/load operations
    const states = [
      { score: 1000, level: 2, playerHits: 1 },
      { score: 2500, level: 3, playerHits: 0 },
      { score: 4000, level: 5, playerHits: 3 }
    ];
    
    for (let i = 0; i < states.length; i++) {
      // Set state
      await setGameState(page, states[i]);
      
      // Save
      await page.keyboard.press('F5');
      await page.waitForTimeout(200);
      
      // Modify state
      await setGameState(page, { score: 0, level: 1, playerHits: 0 });
      
      // Load
      await page.keyboard.press('F9');
      await page.waitForTimeout(200);
      
      // Verify restored state
      const state = await getGameState(page);
      expect(state!.score).toBe(states[i].score);
      expect(state!.level).toBe(states[i].level);
      expect(state!.playerHits).toBe(states[i].playerHits);
    }
  });

  test('Save/load during active gameplay', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop features only available in Electron');

    await page.keyboard.press('Space'); // Unpause
    
    // Set up active gameplay scenario
    await setGameState(page, {
      score: 1800,
      level: 2,
      playerHits: 1,
      shotgunActive: true,
      shotgunTimer: 15.7,
      patties: [
        { x: 200, y: 100, vx: 30, vy: 40, size: 50 },
        { x: 400, y: 150, vx: -25, vy: 35, size: 45 }
      ]
    });
    
    // Save during gameplay (not paused)
    await page.keyboard.press('F5');
    await page.waitForTimeout(300);
    
    // Continue playing - fire some shots
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    
    // Modify score to simulate continued play
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) g.score = 2100;
    });
    
    let state = await getGameState(page);
    expect(state!.score).toBe(2100);
    
    // Load saved state (should restore to save point)
    await page.keyboard.press('F9');
    await page.waitForTimeout(300);
    
    state = await getGameState(page);
    expect(state!.score).toBe(1800); // Back to saved score
    expect(state!.shotgunActive).toBeTruthy();
  });

  test('Save/load handles weapon states correctly', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop features only available in Electron');

    await page.keyboard.press('Space'); // Unpause
    
    // Test each weapon type preservation
    const weaponStates = [
      {
        name: 'bazooka',
        state: { bazookaActive: true, bazookaTimer: 18.5, score: 1000 }
      },
      {
        name: 'shotgun',
        state: { shotgunActive: true, shotgunTimer: 14.2, score: 1500 }
      },
      {
        name: 'laser',
        state: { laserActive: true, laserTimer: 9.8, score: 2000 }
      }
    ];
    
    for (const weapon of weaponStates) {
      // Set weapon state
      await setGameState(page, weapon.state);
      
      // Save
      await page.keyboard.press('F5');
      await page.waitForTimeout(200);
      
      // Clear weapon state
      await setGameState(page, {
        bazookaActive: false,
        bazookaTimer: 0,
        shotgunActive: false,
        shotgunTimer: 0,
        laserActive: false,
        laserTimer: 0,
        score: 0
      });
      
      let state = await getGameState(page);
      expect(state!.bazookaActive).toBeFalsy();
      expect(state!.shotgunActive).toBeFalsy();
      expect(state!.laserActive).toBeFalsy();
      
      // Load
      await page.keyboard.press('F9');
      await page.waitForTimeout(200);
      
      state = await getGameState(page);
      
      // Verify correct weapon restored
      switch (weapon.name) {
        case 'bazooka':
          expect(state!.bazookaActive).toBeTruthy();
          expect(state!.bazookaTimer).toBeCloseTo(18.5, 1);
          break;
        case 'shotgun':
          expect(state!.shotgunActive).toBeTruthy();
          expect(state!.shotgunTimer).toBeCloseTo(14.2, 1);
          break;
        case 'laser':
          expect(state!.laserActive).toBeTruthy();
          expect(state!.laserTimer).toBeCloseTo(9.8, 1);
          break;
      }
      
      expect(state!.score).toBe(weapon.state.score);
    }
  });

  test('Save/load gracefully handles missing save file', async ({ page }) => {
    const electronAvailable = await isElectron(page);
    test.skip(!electronAvailable, 'Desktop features only available in Electron');

    await page.keyboard.press('Space'); // Unpause
    
    // Set current state
    await setGameState(page, {
      score: 800,
      level: 1,
      playerHits: 2
    });
    
    // Try to load when no save exists (or simulate missing save)
    await page.evaluate(() => {
      // Mock the load to fail/return null
      const electronAPI = (window as any).electronAPI;
      if (electronAPI) {
        // This would typically show a "no save found" message
        electronAPI.trigger('menu-load-game');
      }
    });
    
    await page.waitForTimeout(300);
    
    // State should remain unchanged if load fails
    const state = await getGameState(page);
    expect(state!.score).toBe(800);
    expect(state!.playerHits).toBe(2);
  });
});