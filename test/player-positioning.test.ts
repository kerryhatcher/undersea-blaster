import { describe, test, expect } from 'vitest';
import { createInitialState, resetPlayer } from '../src/game/state';

describe('Player positioning with safe area insets', () => {
  test('positions player at 78% without safe area insets', () => {
    const state = createInitialState(() => 375, () => 812);
    resetPlayer(state, 0);
    
    const expectedY = 812 * 0.78; // 633.36
    expect(state.player.y).toBeCloseTo(expectedY);
    expect(state.player.x).toBe(375 * 0.5); // centered horizontally
  });

  test('adjusts player position upward with safe area insets', () => {
    const state = createInitialState(() => 375, () => 812);
    const safeAreaBottom = 34;
    resetPlayer(state, safeAreaBottom);
    
    const baseY = 812 * 0.78; // 633.36
    const adjustedY = Math.max(baseY - safeAreaBottom * 0.8, 812 * 0.65);
    expect(state.player.y).toBeCloseTo(adjustedY);
    expect(state.player.y).toBeLessThan(baseY);
  });

  test('prevents player from being positioned too high with extreme safe area', () => {
    const state = createInitialState(() => 375, () => 812);
    const extremeSafeArea = 200; // very large safe area
    resetPlayer(state, extremeSafeArea);
    
    const minY = 812 * 0.65; // minimum position
    expect(state.player.y).toBeCloseTo(minY);
  });
});