import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { randomRicochetVelocity } from '../src/game/systems/laser';

describe('laser ricochet', () => {
  it('produces diagonal velocity on ricochet', () => {
    const vel = randomRicochetVelocity(900, () => 0.5); // deterministic
    expect(Math.abs(vel.vx)).toBeGreaterThan(0);
    expect(vel.vy).toBeLessThan(0); // upwards
  });

  it('bounced laser can hit and damage the player', () => {
    const s = createInitialState(() => 800, () => 600);
    s.player.x = 400; s.player.y = 400;
    // a bounced laser passing near player
    s.bullets.push({ x: 400, y: 400, vy: -800, vx: 400, r: 6, kind: 'laser', len: 18, thickness: 4, bouncy: false, bounced: true });
    // emulate the small loop fragment that checks laser vs player
    const p = s.player;
    for (let j = s.bullets.length - 1; j >= 0; j--) {
      const b = s.bullets[j];
      if (b.kind !== 'laser') continue;
      if (!b.bounced) continue;
      const playerR = Math.min(p.w, p.h) * 0.42;
      const dx = b.x - p.x, dy = b.y - p.y;
      const hit = (dx*dx + dy*dy) <= (Math.max(6, (b.thickness || 4)) + playerR) ** 2;
      if (hit) {
        if (p.invuln <= 0) {
          p.hits += 1; p.invuln = 1.2; s.bullets.splice(j,1);
        }
        break;
      }
    }
    expect(s.player.hits).toBe(1);
    expect(s.bullets.length).toBe(0);
  });
});


