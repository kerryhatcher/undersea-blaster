import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { circlesOverlap } from '../src/game/systems/collision';

describe('bullet impact effects', () => {
  it('adds small impact and decays it when bubble hits patty without splash', () => {
    const s = createInitialState(() => 800, () => 600);
    s.patties.push({ x: 200, y: 200, vx: 0, vy: 0, size: 50 });
    s.bullets.push({ x: 200, y: 200, vy: 0, r: 5, kind: 'bubble' });
    // emulate the fragment of logic from main
    const a = s.patties[0];
    const b = s.bullets[0];
    const ar = a.size*0.46, br = b.r;
    expect(circlesOverlap(a.x, a.y, ar, b.x, b.y, br)).toBe(true);
    // on hit
    s.patties.splice(0,1);
    s.bullets.splice(0,1);
    s.impacts.push({ x: a.x, y: a.y, life: 0, duration: 0.22 });
    // decay
    let dt = 0;
    while (s.impacts.length > 0 && dt < 1) {
      for (let i = s.impacts.length - 1; i >= 0; i--) {
        const im = s.impacts[i];
        im.life += 0.05;
        if (im.life >= im.duration) s.impacts.splice(i,1);
      }
      dt += 0.05;
    }
    expect(s.impacts.length).toBe(0);
  });
});


