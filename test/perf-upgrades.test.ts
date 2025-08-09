import { describe, it, expect } from 'vitest';
import { getExplosionHitIndices } from '../src/game/systems/upgrades';

function makePatties(n: number) {
  const arr: any[] = [];
  for (let i = 0; i < n; i++) {
    arr.push({ x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000, vx: 0, vy: 0, size: 50 });
  }
  return arr;
}

describe('performance: getExplosionHitIndices', () => {
  it('scales to thousands of patties within a small time budget', () => {
    const patties = makePatties(5000);
    const t0 = performance.now();
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const hits = getExplosionHitIndices(patties as any, 0, 0, 120);
      total += hits.length;
    }
    const t1 = performance.now();
    const elapsedMs = t1 - t0;
    // Budget: 200 iterations over 5000 items should complete under ~150ms on modern dev machines
    expect(elapsedMs).toBeLessThan(200);
    expect(total).toBeGreaterThanOrEqual(0);
  });
});


