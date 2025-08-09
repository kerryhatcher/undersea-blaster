import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    
    // Wait for game assets to load
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    await page.waitForTimeout(500); // Allow time for initial render
  });

  test('Initial pause screen appearance', async ({ page }) => {
    // Ensure game is in initial paused state
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.paused = true;
        g.score = 0;
        g.level = 1;
        g.player.hits = 0;
      }
    });

    await page.waitForTimeout(100);
    
    // Take screenshot of initial pause state
    await expect(page).toHaveScreenshot('initial-pause-screen.png');
  });

  test('Active gameplay with HUD elements', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Set up a known game state for consistent screenshot
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.score = 1250;
        g.level = 2;
        g.player.hits = 2; // Some damage for heart display
        g.player.x = g.w() * 0.5; // Center player
        g.player.y = g.h() * 0.78;
        
        // Add some entities for visual interest
        g.patties = [
          { x: 200, y: 150, vx: 50, vy: 30, size: 50 },
          { x: 400, y: 100, vx: -30, vy: 40, size: 45 },
          { x: 600, y: 120, vx: 20, vy: 50, size: 55 }
        ];
        
        g.bullets = [
          { x: 300, y: 200, vy: -200, r: 6, kind: 'bubble' },
          { x: 500, y: 180, vy: -180, r: 8, kind: 'missile' }
        ];
      }
    });

    await page.waitForTimeout(200); // Let render cycle complete
    
    await expect(page).toHaveScreenshot('active-gameplay.png');
  });

  test('Level up animation display', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Trigger level up
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.score = 1000;
        g.level = 2;
        g.levelUpTimer = 1.5; // Mid-animation
        g.scoreAtLevelStart = 1000;
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('level-up-animation.png');
  });

  test('Game over screen display', async ({ page }) => {
    // Set game over state
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.gameOver = true;
        g.score = 2350;
        g.level = 3;
        g.player.hits = 5; // Max hits
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('game-over-screen.png');
  });

  test('Bazooka weapon active state', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Activate bazooka with visible timer
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.bazookaActive = true;
        g.bazookaTimer = 15.5; // Visible timer
        g.score = 500;
        g.level = 1;
        g.player.hits = 0;
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('bazooka-weapon-active.png');
  });

  test('Shotgun weapon active state', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.shotgunActive = true;
        g.shotgunTimer = 12.3;
        g.score = 750;
        g.level = 1;
        g.player.hits = 1;
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('shotgun-weapon-active.png');
  });

  test('Laser weapon active state', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.laserActive = true;
        g.laserTimer = 8.7;
        g.score = 900;
        g.level = 1;
        g.player.hits = 0;
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('laser-weapon-active.png');
  });

  test('Multiple explosions rendering', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Create multiple explosions at different stages
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.explosions = [
          { x: 200, y: 200, life: 0.1, duration: 1.0 }, // Fresh explosion
          { x: 400, y: 150, life: 0.5, duration: 1.0 }, // Mid explosion
          { x: 600, y: 250, life: 0.9, duration: 1.0 }  // Fading explosion
        ];
        g.impacts = [
          { x: 300, y: 100, life: 0.2, duration: 0.5 },
          { x: 500, y: 300, life: 0.3, duration: 0.5 }
        ];
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('multiple-explosions.png');
  });

  test('Upgrade pickups on screen', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Show all upgrade types
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.upgrades = [
          { x: 200, y: 200, r: 20, vy: 30, kind: 'bazooka' },
          { x: 400, y: 150, r: 20, vy: 40, kind: 'shotgun' },
          { x: 600, y: 180, r: 20, vy: 35, kind: 'laser' }
        ];
        g.score = 600;
        g.level = 1;
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('upgrade-pickups.png');
  });

  test('High score display', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Set high score scenario
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.score = 15750;
        g.level = 16;
        g.player.hits = 3;
        g.laserActive = true;
        g.laserTimer = 5.2;
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('high-score-display.png');
  });

  test('Player at different health levels', async ({ page }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    // Test critical health display
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (g) {
        g.player.hits = 4; // One hit away from death
        g.score = 800;
        g.level = 1;
      }
    });

    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('critical-health.png');
  });

  test.describe('Responsive Layout', () => {
    test('Mobile viewport layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile size
      
      const canvas = page.locator('canvas#game');
      await canvas.click();
      await page.keyboard.press('Space'); // Unpause
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.score = 1200;
          g.level = 2;
          g.player.hits = 1;
          g.shotgunActive = true;
          g.shotgunTimer = 10.5;
        }
      });

      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('mobile-layout.png');
    });

    test('Tablet viewport layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // Tablet size
      
      const canvas = page.locator('canvas#game');
      await canvas.click();
      await page.keyboard.press('Space'); // Unpause
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.score = 950;
          g.level = 1;
          g.player.hits = 0;
        }
      });

      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('tablet-layout.png');
    });

    test('Wide desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 }); // Large desktop
      
      const canvas = page.locator('canvas#game');
      await canvas.click();
      await page.keyboard.press('Space'); // Unpause
      
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.score = 3500;
          g.level = 4;
          g.player.hits = 2;
          g.bazookaActive = true;
          g.bazookaTimer = 18.2;
        }
      });

      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('desktop-wide-layout.png');
    });
  });

  test.describe('Animation States', () => {
    test('Bullet trail effects', async ({ page }) => {
      const canvas = page.locator('canvas#game');
      await canvas.click();
      await page.keyboard.press('Space'); // Unpause
      
      // Create bullets with trails
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.bullets = [
            { 
              x: 300, y: 400, vy: -200, r: 8, kind: 'missile',
              trail: [
                { x: 300, y: 420, life: 0.8 },
                { x: 300, y: 440, life: 0.6 },
                { x: 300, y: 460, life: 0.4 },
                { x: 300, y: 480, life: 0.2 }
              ]
            }
          ];
        }
      });

      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('bullet-trails.png');
    });

    test('Laser bouncing visualization', async ({ page }) => {
      const canvas = page.locator('canvas#game');
      await canvas.click();
      await page.keyboard.press('Space'); // Unpause
      
      // Create bouncing laser bullets
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.bullets = [
            { 
              x: 200, y: 300, vy: -150, vx: 100, r: 4, 
              kind: 'laser', bouncy: true, bounced: true,
              len: 40, thickness: 3
            },
            { 
              x: 500, y: 200, vy: -120, vx: -80, r: 4, 
              kind: 'laser', bouncy: true, bounced: false,
              len: 35, thickness: 3
            }
          ];
        }
      });

      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('laser-bouncing.png');
    });
  });

  test.describe('Edge Cases Visual', () => {
    test('Maximum entities on screen', async ({ page }) => {
      const canvas = page.locator('canvas#game');
      await canvas.click();
      await page.keyboard.press('Space'); // Unpause
      
      // Fill screen with many entities
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          const w = g.w();
          const h = g.h();
          
          // Many patties
          g.patties = [];
          for (let i = 0; i < 15; i++) {
            g.patties.push({
              x: Math.random() * w,
              y: Math.random() * h * 0.7,
              vx: (Math.random() - 0.5) * 100,
              vy: Math.random() * 50 + 20,
              size: 40 + Math.random() * 20
            });
          }
          
          // Many bullets
          g.bullets = [];
          for (let i = 0; i < 20; i++) {
            g.bullets.push({
              x: Math.random() * w,
              y: Math.random() * h,
              vy: -100 - Math.random() * 100,
              r: 5 + Math.random() * 3,
              kind: ['bubble', 'missile', 'laser'][Math.floor(Math.random() * 3)]
            });
          }
          
          // Some explosions
          g.explosions = [];
          for (let i = 0; i < 8; i++) {
            g.explosions.push({
              x: Math.random() * w,
              y: Math.random() * h,
              life: Math.random() * 0.8,
              duration: 1.0
            });
          }
        }
      });

      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('max-entities.png');
    });

    test('Empty screen state', async ({ page }) => {
      const canvas = page.locator('canvas#game');
      await canvas.click();
      await page.keyboard.press('Space'); // Unpause
      
      // Clear all entities
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.patties = [];
          g.bullets = [];
          g.explosions = [];
          g.impacts = [];
          g.upgrades = [];
          g.score = 0;
          g.level = 1;
          g.player.hits = 0;
        }
      });

      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('empty-screen.png');
    });
  });
});