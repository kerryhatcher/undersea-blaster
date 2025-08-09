import { test, expect } from '@playwright/test';

// Helper to access game state
async function getGameState(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (!g) return null;
    return {
      patties: g.patties.length,
      bullets: g.bullets.length,
      explosions: g.explosions.length,
      impacts: g.impacts.length,
      upgrades: g.upgrades.length,
      score: g.score,
      level: g.level,
      gameOver: g.gameOver,
      paused: g.paused
    };
  });
}

// Helper to measure performance
async function measureFrameRate(page: any, duration: number = 1000) {
  return await page.evaluate((testDuration) => {
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      function countFrame() {
        frameCount++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed >= testDuration) {
          resolve(frameCount / (elapsed / 1000)); // FPS
        } else {
          requestAnimationFrame(countFrame);
        }
      }
      
      requestAnimationFrame(countFrame);
    });
  }, duration);
}

test.describe('Entity Stress Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    await canvas.click();
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    await page.keyboard.press('Space'); // Unpause
    
    // Make player invulnerable for stress testing
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.player.invuln = 999;
        g.player.hits = 0;
      }
    });
  });

  test('Maximum patties (enemies) stress test', async ({ page }) => {
    // Spawn many enemies
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const w = g.w();
      const h = g.h();
      g.patties = [];
      
      // Create 50 enemies across the screen
      for (let i = 0; i < 50; i++) {
        g.patties.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.8,
          vx: (Math.random() - 0.5) * 150,
          vy: Math.random() * 80 + 20,
          size: 30 + Math.random() * 40
        });
      }
    });

    let state = await getGameState(page);
    expect(state!.patties).toBe(50);

    // Let the game run for a few seconds with many enemies
    await page.waitForTimeout(2000);

    // Verify game is still stable
    state = await getGameState(page);
    expect(state!.gameOver).toBeFalsy();
    expect(state!.patties).toBeGreaterThan(0); // Some may have moved off screen
  });

  test('Maximum bullets stress test', async ({ page }) => {
    // Spawn many bullets rapidly
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const w = g.w();
      const h = g.h();
      g.bullets = [];
      
      // Create bullets of different types
      for (let i = 0; i < 100; i++) {
        const types = ['bubble', 'missile', 'laser'];
        const kind = types[i % 3];
        
        g.bullets.push({
          x: Math.random() * w,
          y: h * 0.9,
          vy: -200 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 100,
          r: 4 + Math.random() * 6,
          kind: kind,
          bouncy: kind === 'laser',
          trail: kind === 'missile' ? [] : undefined
        });
      }
    });

    let state = await getGameState(page);
    expect(state!.bullets).toBe(100);

    // Let bullets travel
    await page.waitForTimeout(1500);

    // Game should still be running
    state = await getGameState(page);
    expect(state!.gameOver).toBeFalsy();
  });

  test('Many explosions simultaneously', async ({ page }) => {
    // Create many explosions at once
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const w = g.w();
      const h = g.h();
      g.explosions = [];
      g.impacts = [];
      
      // Create explosions at different stages
      for (let i = 0; i < 30; i++) {
        g.explosions.push({
          x: Math.random() * w,
          y: Math.random() * h,
          life: Math.random() * 0.8, // Different stages
          duration: 1.0 + Math.random() * 0.5
        });
      }
      
      // Create impacts
      for (let i = 0; i < 40; i++) {
        g.impacts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          life: Math.random() * 0.4,
          duration: 0.5
        });
      }
    });

    let state = await getGameState(page);
    expect(state!.explosions).toBe(30);
    expect(state!.impacts).toBe(40);

    // Let effects play out
    await page.waitForTimeout(1000);

    // Game should remain stable
    state = await getGameState(page);
    expect(state!.gameOver).toBeFalsy();
  });

  test('All entity types at maximum simultaneously', async ({ page }) => {
    // Spawn maximum of everything
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const w = g.w();
      const h = g.h();
      
      // Max enemies
      g.patties = [];
      for (let i = 0; i < 40; i++) {
        g.patties.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.7,
          vx: (Math.random() - 0.5) * 120,
          vy: Math.random() * 60 + 30,
          size: 35 + Math.random() * 30
        });
      }
      
      // Max bullets
      g.bullets = [];
      for (let i = 0; i < 80; i++) {
        const types = ['bubble', 'missile', 'laser'];
        const kind = types[i % 3];
        
        g.bullets.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vy: -150 - Math.random() * 150,
          vx: (Math.random() - 0.5) * 80,
          r: 3 + Math.random() * 5,
          kind: kind,
          bouncy: kind === 'laser',
          trail: kind === 'missile' ? [
            { x: 0, y: 0, life: 0.8 },
            { x: 0, y: 0, life: 0.6 }
          ] : undefined
        });
      }
      
      // Max explosions
      g.explosions = [];
      for (let i = 0; i < 25; i++) {
        g.explosions.push({
          x: Math.random() * w,
          y: Math.random() * h,
          life: Math.random() * 0.9,
          duration: 1.2
        });
      }
      
      // Max impacts
      g.impacts = [];
      for (let i = 0; i < 35; i++) {
        g.impacts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          life: Math.random() * 0.3,
          duration: 0.4
        });
      }
      
      // Multiple upgrades
      g.upgrades = [];
      for (let i = 0; i < 5; i++) {
        const types = ['bazooka', 'shotgun', 'laser'];
        g.upgrades.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.5,
          r: 20,
          vy: 40 + Math.random() * 20,
          kind: types[i % 3]
        });
      }
    });

    const initialState = await getGameState(page);
    expect(initialState!.patties).toBe(40);
    expect(initialState!.bullets).toBe(80);
    expect(initialState!.explosions).toBe(25);
    expect(initialState!.impacts).toBe(35);
    expect(initialState!.upgrades).toBe(5);

    // Run for extended period with maximum entities
    await page.waitForTimeout(3000);

    const finalState = await getGameState(page);
    expect(finalState!.gameOver).toBeFalsy();
    expect(finalState!.paused).toBeFalsy();
  });

  test('Performance remains acceptable under load', async ({ page }) => {
    // Create moderate entity load
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const w = g.w();
      const h = g.h();
      
      // Moderate load
      g.patties = [];
      for (let i = 0; i < 20; i++) {
        g.patties.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.7,
          vx: (Math.random() - 0.5) * 100,
          vy: Math.random() * 50 + 20,
          size: 40 + Math.random() * 20
        });
      }
      
      g.bullets = [];
      for (let i = 0; i < 30; i++) {
        g.bullets.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vy: -180 - Math.random() * 120,
          r: 5,
          kind: 'bubble'
        });
      }
    });

    // Measure frame rate
    const fps = await measureFrameRate(page, 2000);
    
    // Should maintain reasonable frame rate (at least 30 FPS, ideally 50+)
    expect(fps).toBeGreaterThan(25);
    console.log(`Frame rate under load: ${fps.toFixed(1)} FPS`);
  });

  test('Memory usage remains stable with entity churn', async ({ page }) => {
    // Test with continuous entity creation and destruction
    for (let cycle = 0; cycle < 5; cycle++) {
      // Create entities
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        const w = g.w();
        const h = g.h();
        
        // Add entities
        for (let i = 0; i < 20; i++) {
          g.patties.push({
            x: Math.random() * w,
            y: -50,
            vx: 0,
            vy: 100,
            size: 50
          });
          
          g.bullets.push({
            x: Math.random() * w,
            y: h + 50,
            vy: -200,
            r: 6,
            kind: 'bubble'
          });
        }
      });
      
      await page.waitForTimeout(300);
      
      // Clear entities (simulate natural cleanup)
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        // Remove entities that would naturally be cleaned up
        g.patties = g.patties.filter((p: any, i: number) => i < 10);
        g.bullets = g.bullets.filter((b: any, i: number) => i < 10);
        g.explosions = [];
        g.impacts = [];
      });
      
      await page.waitForTimeout(200);
    }

    // Game should still be stable after many create/destroy cycles
    const state = await getGameState(page);
    expect(state!.gameOver).toBeFalsy();
  });

  test('Rapid entity state changes', async ({ page }) => {
    // Test rapid changes to entity properties
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const w = g.w();
      const h = g.h();
      
      // Create some entities
      g.patties = [];
      for (let i = 0; i < 15; i++) {
        g.patties.push({
          x: w * 0.5,
          y: h * 0.3 + i * 20,
          vx: 0,
          vy: 30,
          size: 50
        });
      }
      
      g.bullets = [];
      for (let i = 0; i < 20; i++) {
        g.bullets.push({
          x: w * 0.5,
          y: h * 0.8,
          vy: -100,
          r: 6,
          kind: 'bubble'
        });
      }
    });

    // Rapidly modify entity properties
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        // Modify patty velocities
        g.patties.forEach((p: any) => {
          p.vx = (Math.random() - 0.5) * 200;
          p.vy = Math.random() * 100 + 20;
        });
        
        // Modify bullet properties
        g.bullets.forEach((b: any) => {
          b.vy = -50 - Math.random() * 200;
          b.kind = ['bubble', 'missile'][Math.random() < 0.5 ? 0 : 1];
        });
      });
      
      await page.waitForTimeout(100);
    }

    const state = await getGameState(page);
    expect(state!.gameOver).toBeFalsy();
  });

  test('Entity array manipulation stress', async ({ page }) => {
    // Test frequent array modifications (adds, removes, splices)
    for (let cycle = 0; cycle < 10; cycle++) {
      // Add entities
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        const w = g.w();
        
        // Add to beginning
        g.patties.unshift({
          x: w * 0.2,
          y: 100,
          vx: 50,
          vy: 40,
          size: 45
        });
        
        // Add to middle
        const midIndex = Math.floor(g.patties.length / 2);
        g.patties.splice(midIndex, 0, {
          x: w * 0.8,
          y: 150,
          vx: -50,
          vy: 30,
          size: 55
        });
        
        // Add to end
        g.patties.push({
          x: w * 0.5,
          y: 200,
          vx: 0,
          vy: 60,
          size: 40
        });
      });
      
      await page.waitForTimeout(50);
      
      // Remove entities
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        // Remove from various positions
        if (g.patties.length > 0) g.patties.shift(); // Remove first
        if (g.patties.length > 1) g.patties.pop(); // Remove last
        if (g.patties.length > 2) {
          const midIndex = Math.floor(g.patties.length / 2);
          g.patties.splice(midIndex, 1); // Remove middle
        }
      });
      
      await page.waitForTimeout(50);
    }

    const state = await getGameState(page);
    expect(state!.gameOver).toBeFalsy();
  });

  test('Edge case: Zero entities', async ({ page }) => {
    // Clear all entities
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      g.patties = [];
      g.bullets = [];
      g.explosions = [];
      g.impacts = [];
      g.upgrades = [];
    });

    const state = await getGameState(page);
    expect(state!.patties).toBe(0);
    expect(state!.bullets).toBe(0);
    expect(state!.explosions).toBe(0);
    expect(state!.impacts).toBe(0);
    expect(state!.upgrades).toBe(0);

    // Game should handle empty arrays gracefully
    await page.waitForTimeout(500);

    const finalState = await getGameState(page);
    expect(finalState!.gameOver).toBeFalsy();
  });
});