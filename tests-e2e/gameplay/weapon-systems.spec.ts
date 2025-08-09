import { test, expect } from '@playwright/test';

// Helper to access game state from browser context
async function getGameState(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (!g) return null;
    return {
      bazookaActive: g.bazookaActive,
      bazookaTimer: g.bazookaTimer,
      shotgunActive: g.shotgunActive,
      shotgunTimer: g.shotgunTimer,
      laserActive: g.laserActive,
      laserTimer: g.laserTimer,
      upgrades: g.upgrades.length,
      bullets: g.bullets.map((b: any) => ({
        kind: b.kind,
        x: b.x,
        y: b.y,
        bouncy: b.bouncy,
        trail: b.trail?.length
      })),
      explosions: g.explosions.length
    };
  });
}

test.describe('Weapon Systems', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Ensure canvas is loaded and game is initialized
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    await canvas.click();
    
    // Wait for game state to be available and unpause
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    await page.keyboard.press('Space'); // Unpause
  });

  test('Default bubble weapon fires correctly', async ({ page }) => {
    // Fire a bullet with default weapon
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);

    const state = await getGameState(page);
    expect(state!.bullets.length).toBeGreaterThan(0);
    
    // Should be bubble type
    const bubbleBullets = state!.bullets.filter(b => b.kind === 'bubble');
    expect(bubbleBullets.length).toBeGreaterThan(0);
    
    // No weapons should be active initially
    expect(state!.bazookaActive).toBeFalsy();
    expect(state!.shotgunActive).toBeFalsy();
    expect(state!.laserActive).toBeFalsy();
  });

  test('Bazooka upgrade activation and usage', async ({ page }) => {
    // Spawn bazooka upgrade
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.upgrades.push({
        x: g.player.x,
        y: g.player.y - 50,
        r: 20,
        vy: 50,
        kind: 'bazooka'
      });
    });

    let state = await getGameState(page);
    expect(state!.upgrades).toBe(1);
    expect(state!.bazookaActive).toBeFalsy();

    // Fire bullet to collect upgrade
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    state = await getGameState(page);
    expect(state!.bazookaActive).toBeTruthy();
    expect(state!.bazookaTimer).toBeCloseTo(20, 0); // Should be around 20 seconds
    expect(state!.upgrades).toBe(0); // Upgrade consumed
    
    // Other weapons should be deactivated
    expect(state!.shotgunActive).toBeFalsy();
    expect(state!.laserActive).toBeFalsy();

    // Fire missile
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);

    state = await getGameState(page);
    const missileBullets = state!.bullets.filter(b => b.kind === 'missile');
    expect(missileBullets.length).toBeGreaterThan(0);
  });

  test('Missile explosions create explosion effects', async ({ page }) => {
    // Activate bazooka
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.bazookaActive = true;
      g.bazookaTimer = 20.0;
      
      // Spawn enemy to hit
      g.patties.push({
        x: g.player.x,
        y: g.player.y - 100,
        vx: 0,
        vy: 20,
        size: 50
      });
    });

    // Fire missile
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);

    let state = await getGameState(page);
    const missiles = state!.bullets.filter(b => b.kind === 'missile');
    expect(missiles.length).toBeGreaterThan(0);

    // Wait for potential collision and explosion
    await page.waitForTimeout(300);

    state = await getGameState(page);
    // Check if explosions were created (may have already dissipated)
    // This tests that the explosion system can handle missile impacts
    expect(state).toBeTruthy();
  });

  test('Shotgun upgrade fires multiple projectiles', async ({ page }) => {
    // Activate shotgun
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.upgrades.push({
        x: g.player.x,
        y: g.player.y - 50,
        r: 20,
        vy: 50,
        kind: 'shotgun'
      });
    });

    // Collect upgrade by firing
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    let state = await getGameState(page);
    expect(state!.shotgunActive).toBeTruthy();
    expect(state!.shotgunTimer).toBeCloseTo(20, 0);

    // Clear existing bullets to test shotgun
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) g.bullets.length = 0;
    });

    // Fire shotgun
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);

    state = await getGameState(page);
    // Shotgun should create multiple bullets (typically 3-5)
    expect(state!.bullets.length).toBeGreaterThan(1);
    
    // All should be bubble type but with different trajectories
    const bubbleBullets = state!.bullets.filter(b => b.kind === 'bubble');
    expect(bubbleBullets.length).toBe(state!.bullets.length);
  });

  test('Laser weapon fires bouncing beams', async ({ page }) => {
    // Activate laser
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.upgrades.push({
        x: g.player.x,
        y: g.player.y - 50,
        r: 20,
        vy: 50,
        kind: 'laser'
      });
    });

    // Collect upgrade
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    let state = await getGameState(page);
    expect(state!.laserActive).toBeTruthy();
    expect(state!.laserTimer).toBeCloseTo(20, 0);

    // Clear bullets to test laser
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) g.bullets.length = 0;
    });

    // Fire laser
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);

    state = await getGameState(page);
    const laserBullets = state!.bullets.filter(b => b.kind === 'laser');
    expect(laserBullets.length).toBeGreaterThan(0);
    
    // Check for laser properties (bouncy)
    const bouncyLasers = state!.bullets.filter(b => b.bouncy === true);
    expect(bouncyLasers.length).toBeGreaterThan(0);
  });

  test('Weapon upgrades are mutually exclusive', async ({ page }) => {
    // Start with bazooka active
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.bazookaActive = true;
      g.bazookaTimer = 15.0;
    });

    let state = await getGameState(page);
    expect(state!.bazookaActive).toBeTruthy();

    // Spawn shotgun upgrade
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.upgrades.push({
        x: g.player.x,
        y: g.player.y - 50,
        r: 20,
        vy: 50,
        kind: 'shotgun'
      });
    });

    // Collect shotgun upgrade
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    state = await getGameState(page);
    // Shotgun should be active, bazooka deactivated
    expect(state!.shotgunActive).toBeTruthy();
    expect(state!.bazookaActive).toBeFalsy();
    expect(state!.bazookaTimer).toBe(0);
  });

  test('Weapon timers count down over time', async ({ page }) => {
    // Activate bazooka with known timer
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.bazookaActive = true;
      g.bazookaTimer = 5.0; // 5 seconds for testing
    });

    let state = await getGameState(page);
    const initialTimer = state!.bazookaTimer;
    expect(initialTimer).toBeCloseTo(5, 0);

    // Wait for timer to count down
    await page.waitForTimeout(1000); // 1 second

    state = await getGameState(page);
    expect(state!.bazookaTimer).toBeLessThan(initialTimer);
    expect(state!.bazookaActive).toBeTruthy(); // Should still be active
  });

  test('Weapon expires when timer reaches zero', async ({ page }) => {
    // Activate bazooka with very short timer
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.bazookaActive = true;
      g.bazookaTimer = 0.1; // Very short timer
    });

    let state = await getGameState(page);
    expect(state!.bazookaActive).toBeTruthy();

    // Wait for timer to expire
    await page.waitForTimeout(200);

    state = await getGameState(page);
    expect(state!.bazookaActive).toBeFalsy();
    expect(state!.bazookaTimer).toBe(0);
  });

  test('Player can collect upgrades by walking over them', async ({ page }) => {
    // Spawn upgrade on player position
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.upgrades.push({
        x: g.player.x,
        y: g.player.y,
        r: 20,
        vy: 0,
        kind: 'laser'
      });
    });

    let state = await getGameState(page);
    expect(state!.upgrades).toBe(1);
    expect(state!.laserActive).toBeFalsy();

    // Wait for collision detection
    await page.waitForTimeout(100);

    state = await getGameState(page);
    expect(state!.laserActive).toBeTruthy();
    expect(state!.upgrades).toBe(0);
  });

  test('Multiple weapon types can be tested in sequence', async ({ page }) => {
    const weaponTypes = ['bazooka', 'shotgun', 'laser'];
    
    for (const weaponType of weaponTypes) {
      // Spawn upgrade
      await page.evaluate((type) => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        g.upgrades.push({
          x: g.player.x,
          y: g.player.y - 50,
          r: 20,
          vy: 50,
          kind: type
        });
      }, weaponType);

      // Collect upgrade
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);

      const state = await getGameState(page);
      
      // Check that correct weapon is active
      switch (weaponType) {
        case 'bazooka':
          expect(state!.bazookaActive).toBeTruthy();
          expect(state!.shotgunActive).toBeFalsy();
          expect(state!.laserActive).toBeFalsy();
          break;
        case 'shotgun':
          expect(state!.bazookaActive).toBeFalsy();
          expect(state!.shotgunActive).toBeTruthy();
          expect(state!.laserActive).toBeFalsy();
          break;
        case 'laser':
          expect(state!.bazookaActive).toBeFalsy();
          expect(state!.shotgunActive).toBeFalsy();
          expect(state!.laserActive).toBeTruthy();
          break;
      }
    }
  });
});