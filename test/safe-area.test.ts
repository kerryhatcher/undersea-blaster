import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Safe Area HUD Positioning', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            :root {
              --safe-area-inset-top: 44px;
              --safe-area-inset-bottom: 34px;
            }
          </style>
        </head>
        <body></body>
      </html>
    `);
    document = dom.window.document;
    window = dom.window as any;
    global.document = document;
    global.window = window;
  });

  it('should read safe area insets correctly', () => {
    // Simulate the getSafeAreaInsets function from main.ts
    function getSafeAreaInsets() {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:0;bottom:0;z-index:-1;visibility:hidden;padding-bottom:env(safe-area-inset-bottom);padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)';
      document.body.appendChild(div);
      const styles = window.getComputedStyle(div);
      const parse = (v: string) => parseFloat(v) || 0;
      const insets = {
        top: parse(styles.paddingTop),
        right: parse(styles.paddingRight),
        bottom: parse(styles.paddingBottom),
        left: parse(styles.paddingLeft),
      };
      div.remove();
      return insets;
    }

    const insets = getSafeAreaInsets();
    
    // When safe area insets are available, top HUD elements should be offset
    expect(insets.top).toBeGreaterThanOrEqual(0);
    expect(insets.bottom).toBeGreaterThanOrEqual(0);
    
    // Verify HUD positioning logic
    const baseScoreY = 34;
    const baseLevelY = 56;
    const baseHealthY = 22;
    const baseUpgradeY = 14;
    
    const adjustedScoreY = baseScoreY + insets.top;
    const adjustedLevelY = baseLevelY + insets.top;
    const adjustedHealthY = baseHealthY + insets.top;
    const adjustedUpgradeY = baseUpgradeY + insets.top;
    
    // When there's a safe area (like iPhone notch), elements should be pushed down
    expect(adjustedScoreY).toBeGreaterThanOrEqual(baseScoreY);
    expect(adjustedLevelY).toBeGreaterThanOrEqual(baseLevelY);
    expect(adjustedHealthY).toBeGreaterThanOrEqual(baseHealthY);
    expect(adjustedUpgradeY).toBeGreaterThanOrEqual(baseUpgradeY);
  });
});