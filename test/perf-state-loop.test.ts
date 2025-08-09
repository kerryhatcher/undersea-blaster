import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';

describe('performance: state update loop fragments', () => {
  it('can process 10k bullets and 5k patties position updates quickly', () => {
    const s = createInitialState(() => 1920, () => 1080);
    // seed many bullets and patties
    for (let i = 0; i < 10000; i++) s.bullets.push({ x: Math.random()*1920, y: Math.random()*1080, vy: -300 + Math.random()*600, r: 5, kind: 'bubble', vx: (Math.random()-0.5) * 100 });
    for (let i = 0; i < 5000; i++) s.patties.push({ x: Math.random()*1920, y: Math.random()*1080, vx: (Math.random()-0.5) * 50, vy: (Math.random()) * 80, size: 50 });
    const dt = 0.016;
    const t0 = performance.now();
    // position updates as in main
    for (const b of s.bullets) { b.y += b.vy * dt; if (b.vx) b.x += b.vx * dt; }
    for (const a of s.patties) { a.x += a.vx * dt; a.y += a.vy * dt; }
    const t1 = performance.now();
    const elapsed = t1 - t0;
    // Budget: under ~50ms
    expect(elapsed).toBeLessThan(60);
  });
});


