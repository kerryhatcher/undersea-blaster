import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';

describe('laser upgrade', () => {
  it('marks every 20th shot as bouncy and increments index', () => {
    const s = createInitialState(() => 800, () => 600);
    s.laserActive = true; s.laserTimer = 10;
    const p = s.player; p.x = 400; p.y = 500;
    // emulate 21 shots
    for (let i=0;i<21;i++){
      const bouncy = (s.laserShotIndex % 20) === 0;
      s.laserShotIndex += 1;
      s.bullets.push({ x:p.x, y:p.y-24, vy:-1200, vx:0, r:6, kind:'laser', len:24, thickness:4, bouncy});
    }
    const bounceCount = s.bullets.filter(b=> b.kind==='laser' && b.bouncy).length;
    expect(bounceCount).toBe(2); // indices 0 and 20
    expect(s.laserShotIndex).toBe(21);
  });
});


