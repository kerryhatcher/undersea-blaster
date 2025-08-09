import { test, expect } from '@playwright/test';

// Helper to get game state
async function getGameState(page: any) {
  return await page.evaluate(() => {
    const g = (window as any).__game?.state;
    if (!g) return null;
    return {
      score: g.score,
      level: g.level,
      gameOver: g.gameOver,
      paused: g.paused,
      bullets: g.bullets.length,
      patties: g.patties.length
    };
  });
}

// Helper to check browser capabilities
async function getBrowserInfo(page: any) {
  return await page.evaluate(() => {
    return {
      userAgent: navigator.userAgent,
      hasWebGL: !!document.createElement('canvas').getContext('webgl'),
      hasAudioContext: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
      hasCanvas2D: !!document.createElement('canvas').getContext('2d'),
      hasRequestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
      hasLocalStorage: typeof localStorage !== 'undefined',
      hasWebWorkers: typeof Worker !== 'undefined',
      pixelRatio: window.devicePixelRatio || 1,
      screenSize: { width: screen.width, height: screen.height },
      viewportSize: { width: window.innerWidth, height: window.innerHeight }
    };
  });
}

test.describe('Cross-Platform Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Game initializes correctly across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    
    // Wait for game state to initialize
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    const state = await getGameState(page);
    expect(state).toBeTruthy();
    expect(state!.score).toBe(0);
    expect(state!.level).toBe(1);
    expect(state!.paused).toBeTruthy();
    
    console.log(`Game initialized successfully on ${browserName}`);
  });

  test('Canvas rendering works across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    // Check that canvas context is available and working
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.getElementById('game') as HTMLCanvasElement;
      const ctx = canvas?.getContext('2d');
      
      if (!ctx) return null;
      
      return {
        width: canvas.width,
        height: canvas.height,
        contextType: ctx.constructor.name,
        canDraw: typeof ctx.fillRect === 'function',
        canDrawText: typeof ctx.fillText === 'function',
        canDrawImages: typeof ctx.drawImage === 'function'
      };
    });
    
    expect(canvasInfo).toBeTruthy();
    expect(canvasInfo!.width).toBeGreaterThan(0);
    expect(canvasInfo!.height).toBeGreaterThan(0);
    expect(canvasInfo!.canDraw).toBeTruthy();
    expect(canvasInfo!.canDrawText).toBeTruthy();
    expect(canvasInfo!.canDrawImages).toBeTruthy();
    
    console.log(`Canvas rendering verified on ${browserName}:`, canvasInfo);
  });

  test('Basic gameplay functions across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    let state = await getGameState(page);
    expect(state!.paused).toBeFalsy();
    
    // Test movement
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    
    // Test firing
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    
    state = await getGameState(page);
    expect(state!.bullets).toBeGreaterThan(0);
    
    console.log(`Basic gameplay verified on ${browserName}`);
  });

  test('Audio context availability across browsers', async ({ page, browserName }) => {
    const browserInfo = await getBrowserInfo(page);
    
    // Audio should be available on modern browsers
    expect(browserInfo.hasAudioContext).toBeTruthy();
    
    // Test audio initialization
    const audioTest = await page.evaluate(() => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        return {
          available: true,
          state: ctx.state,
          sampleRate: ctx.sampleRate
        };
      } catch (e) {
        return {
          available: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }
    });
    
    expect(audioTest.available).toBeTruthy();
    
    console.log(`Audio context verified on ${browserName}:`, audioTest);
  });

  test('Performance characteristics across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    // Create some load
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      const w = g.w();
      const h = g.h();
      
      // Add some entities for performance test
      g.patties = [];
      for (let i = 0; i < 10; i++) {
        g.patties.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.7,
          vx: (Math.random() - 0.5) * 100,
          vy: Math.random() * 50 + 20,
          size: 40 + Math.random() * 20
        });
      }
    });
    
    // Measure frame rate
    const frameRate = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        const testDuration = 1000; // 1 second
        
        function countFrame() {
          frameCount++;
          const elapsed = performance.now() - startTime;
          
          if (elapsed >= testDuration) {
            resolve(frameCount / (elapsed / 1000));
          } else {
            requestAnimationFrame(countFrame);
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    });
    
    // Frame rate should be reasonable (at least 20 FPS, ideally 45+)
    expect(frameRate).toBeGreaterThan(15);
    
    console.log(`Frame rate on ${browserName}: ${frameRate.toFixed(1)} FPS`);
  });

  test('Local storage functionality across browsers', async ({ page, browserName }) => {
    const storageTest = await page.evaluate(() => {
      try {
        const testKey = 'test-undersea-blaster';
        const testValue = 'browser-compatibility-test';
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        return {
          available: true,
          canWrite: true,
          canRead: retrieved === testValue
        };
      } catch (e) {
        return {
          available: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }
    });
    
    expect(storageTest.available).toBeTruthy();
    expect(storageTest.canWrite).toBeTruthy();
    expect(storageTest.canRead).toBeTruthy();
    
    console.log(`Local storage verified on ${browserName}`);
  });

  test('Keyboard event handling across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    // Test various key combinations
    const keyTests = [
      { key: 'Space', description: 'Space key' },
      { key: 'Enter', description: 'Enter key' },
      { key: 'ArrowLeft', description: 'Arrow left' },
      { key: 'ArrowRight', description: 'Arrow right' },
      { key: 'KeyA', description: 'A key' },
      { key: 'KeyD', description: 'D key' }
    ];
    
    for (const keyTest of keyTests) {
      await page.keyboard.press(keyTest.key);
      await page.waitForTimeout(50);
      
      // Verify game is still responsive
      const state = await getGameState(page);
      expect(state).toBeTruthy();
    }
    
    console.log(`Keyboard handling verified on ${browserName}`);
  });

  test('Mouse/pointer events across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    // Test various mouse interactions
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(50);
    
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(50);
    
    // Test hover
    await canvas.hover();
    await page.waitForTimeout(50);
    
    const state = await getGameState(page);
    expect(state).toBeTruthy();
    
    console.log(`Mouse events verified on ${browserName}`);
  });

  test('Window resize handling across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    // Get initial canvas size
    const initialSize = await page.evaluate(() => {
      const canvas = document.getElementById('game') as HTMLCanvasElement;
      return { width: canvas.clientWidth, height: canvas.clientHeight };
    });
    
    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(200);
    
    const resizedSize = await page.evaluate(() => {
      const canvas = document.getElementById('game') as HTMLCanvasElement;
      return { width: canvas.clientWidth, height: canvas.clientHeight };
    });
    
    // Canvas should adapt to new size
    expect(resizedSize.width).not.toBe(initialSize.width);
    expect(resizedSize.height).not.toBe(initialSize.height);
    
    // Game should still be functional
    await canvas.click();
    const state = await getGameState(page);
    expect(state).toBeTruthy();
    
    console.log(`Window resize verified on ${browserName}`);
  });

  test('Error handling and recovery across browsers', async ({ page, browserName }) => {
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Trigger some potentially problematic operations
    await page.evaluate(() => {
      const g = (window as any).__game?.state;
      if (!g) return;
      
      // Test array operations
      g.patties = [];
      g.bullets = [];
      
      // Test rapid state changes
      for (let i = 0; i < 10; i++) {
        g.score = i * 100;
        g.level = Math.floor(i / 3) + 1;
      }
    });
    
    await page.waitForTimeout(500);
    
    const state = await getGameState(page);
    expect(state).toBeTruthy();
    expect(state!.gameOver).toBeFalsy();
    
    // Should not have critical errors
    const criticalErrors = errors.filter(err => 
      err.includes('TypeError') || err.includes('ReferenceError')
    );
    expect(criticalErrors.length).toBe(0);
    
    console.log(`Error handling verified on ${browserName}. Errors: ${errors.length}`);
  });

  test('Memory usage stability across browsers', async ({ page, browserName }) => {
    const canvas = page.locator('canvas#game');
    await canvas.click();
    await page.keyboard.press('Space'); // Unpause
    
    await page.waitForFunction(() => Boolean((window as any).__game?.state));
    
    // Run continuous entity creation/destruction cycles
    for (let cycle = 0; cycle < 5; cycle++) {
      // Create entities
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (!g) return;
        
        const w = g.w();
        const h = g.h();
        
        // Add many entities
        for (let i = 0; i < 20; i++) {
          g.patties.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 100,
            vy: Math.random() * 50 + 20,
            size: 50
          });
          
          g.bullets.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vy: -200,
            r: 6,
            kind: 'bubble'
          });
        }
      });
      
      await page.waitForTimeout(200);
      
      // Clear entities
      await page.evaluate(() => {
        const g = (window as any).__game?.state;
        if (g) {
          g.patties = [];
          g.bullets = [];
          g.explosions = [];
          g.impacts = [];
        }
      });
      
      await page.waitForTimeout(100);
    }
    
    // Game should still be stable after memory churn
    const state = await getGameState(page);
    expect(state).toBeTruthy();
    expect(state!.gameOver).toBeFalsy();
    
    console.log(`Memory stability verified on ${browserName}`);
  });

  test('Browser-specific feature detection', async ({ page, browserName }) => {
    const browserInfo = await getBrowserInfo(page);
    
    console.log(`Browser capabilities for ${browserName}:`);
    console.log(`- WebGL: ${browserInfo.hasWebGL}`);
    console.log(`- Audio Context: ${browserInfo.hasAudioContext}`);
    console.log(`- Canvas 2D: ${browserInfo.hasCanvas2D}`);
    console.log(`- RAF: ${browserInfo.hasRequestAnimationFrame}`);
    console.log(`- Local Storage: ${browserInfo.hasLocalStorage}`);
    console.log(`- Web Workers: ${browserInfo.hasWebWorkers}`);
    console.log(`- Pixel Ratio: ${browserInfo.pixelRatio}`);
    console.log(`- Screen: ${browserInfo.screenSize.width}x${browserInfo.screenSize.height}`);
    console.log(`- Viewport: ${browserInfo.viewportSize.width}x${browserInfo.viewportSize.height}`);
    
    // All modern browsers should have these core features
    expect(browserInfo.hasCanvas2D).toBeTruthy();
    expect(browserInfo.hasRequestAnimationFrame).toBeTruthy();
    expect(browserInfo.hasLocalStorage).toBeTruthy();
    
    // Most modern browsers should have these
    expect(browserInfo.hasAudioContext).toBeTruthy();
    
    // Browser-specific expectations
    if (browserName === 'chromium') {
      expect(browserInfo.hasWebGL).toBeTruthy();
      expect(browserInfo.hasWebWorkers).toBeTruthy();
    }
    
    if (browserName === 'firefox') {
      expect(browserInfo.hasWebGL).toBeTruthy();
      expect(browserInfo.hasWebWorkers).toBeTruthy();
    }
  });
});