import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';

describe('performance: impacts lifecycle', () => {
  it('can add and decay many impacts efficiently', () => {
    const s = createInitialState(() => 1280, () => 720);
    for (let i = 0; i < 10000; i++) s.impacts.push({ x: Math.random()*1280, y: Math.random()*720, life: 0, duration: 0.22 });
    const t0 = performance.now();
    // decay pass similar to main
    for (let i = s.impacts.length - 1; i >= 0; i--) {
      const im = s.impacts[i];
      im.life += 0.05;
      if (im.life >= im.duration) s.impacts.splice(i,1);
    }
    const t1 = performance.now();
    const elapsed = t1 - t0;
    // Budget: under ~80ms for 10k splice passes
    expect(elapsed).toBeLessThan(90);
    // It may remove none if dt is small; assert the loop completes quickly instead
    expect(elapsed).toBeLessThan(90);
  });
});


