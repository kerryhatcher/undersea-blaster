import { describe, it, expect } from 'vitest';
import { getSpawnIntervalMs, getSpeedScale, shouldLevelUp } from '../src/game/systems/difficulty';

describe('difficulty scaling', () => {
  it('spawn interval decreases with level but not below 300ms', () => {
    expect(getSpawnIntervalMs(1)).toBe(650);
    expect(getSpawnIntervalMs(5)).toBe(650 - (5-1)*35);
    expect(getSpawnIntervalMs(100)).toBe(300);
  });

  it('speed scale increases with level and caps at 3x', () => {
    expect(getSpeedScale(1)).toBeCloseTo(1);
    expect(getSpeedScale(10)).toBeCloseTo(1 + 0.12 * 9);
    expect(getSpeedScale(100)).toBeCloseTo(3);
  });

  it('levels every +1000 points since last level start', () => {
    expect(shouldLevelUp(999, 0)).toBe(false);
    expect(shouldLevelUp(1000, 0)).toBe(true);
    expect(shouldLevelUp(1500, 600)).toBe(false);
    expect(shouldLevelUp(2000, 1000)).toBe(true);
  });
});
