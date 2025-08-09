import { describe, it, expect } from 'vitest';
import { circlesOverlap, approximatePlayerRadius } from '../src/game/systems/collision';

describe('collision', () => {
  it('detects overlapping circles', () => {
    expect(circlesOverlap(0, 0, 10, 15, 0, 10)).toBe(true);
    expect(circlesOverlap(0, 0, 10, 21, 0, 10)).toBe(false);
  });

  it('approximates player radius from width/height', () => {
    expect(approximatePlayerRadius(56, 56)).toBeCloseTo(56 * 0.42);
    expect(approximatePlayerRadius(80, 40)).toBeCloseTo(40 * 0.42);
  });
});
