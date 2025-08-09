import { describe, it, expect } from 'vitest';
import { nextUpgradeScore, shouldSpawnUpgrade, getExplosionHitIndices, processUpgradePickups } from '../src/game/systems/upgrades';
import { createInitialState } from '../src/game/state';

describe('upgrades', () => {
  it('spawns upgrade every additional 200 points', () => {
    let next = 200;
    expect(shouldSpawnUpgrade(199, next)).toBe(false);
    expect(shouldSpawnUpgrade(200, next)).toBe(true);
    next = nextUpgradeScore(next);
    expect(next).toBe(400);
  });

  it('explosion hits within radius', () => {
    const patties = [
      { x: 0, y: 0, vx: 0, vy: 0, size: 50 },
      { x: 30, y: 0, vx: 0, vy: 0, size: 50 },
      { x: 100, y: 0, vx: 0, vy: 0, size: 50 },
    ];
    const hits = getExplosionHitIndices(patties as any, 0, 0, 60);
    expect(hits).toEqual([0,1]);
  });

  it('processUpgradePickups picks one and removes all bubbles', () => {
    const s = createInitialState(() => 800, () => 600);
    s.player.x = 400; s.player.y = 400;
    s.upgrades.push({ x: 300, y: 200, r: 12, vy: 0, kind: 'bazooka' });
    s.upgrades.push({ x: 340, y: 200, r: 12, vy: 0, kind: 'shotgun' });
    // Bullet intersects bazooka bubble
    s.bullets.push({ x: 300, y: 200, vy: 0, r: 6, kind: 'bubble' });
    const picked = processUpgradePickups(s);
    expect(['bazooka','shotgun']).toContain(picked);
    expect(s.upgrades.length).toBe(0);
    if (picked === 'bazooka') {
      expect(s.bazookaActive).toBe(true);
      expect(s.shotgunActive).toBe(false);
    } else {
      expect(s.shotgunActive).toBe(true);
      expect(s.bazookaActive).toBe(false);
    }
  });
});
