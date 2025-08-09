import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { shouldSpawnUpgrade, nextUpgradeScore } from '../src/game/systems/upgrades';

describe('upgrade bubbles UI/behavior', () => {
  it('spawn with larger radius (>=21) and large horizontal separation', () => {
    const s = createInitialState(() => 800, () => 600);
    s.score = 200; // trigger
    if (shouldSpawnUpgrade(s.score, s.nextUpgradeAt)) {
      const w = s.w();
      const xCenter = w * (0.25 + 0.5 * 0.5);
      // mimic main spawn logic (conservative maxes)
      const spread = 240 + 240;
      const baseVy = 42 + 10;
      const jitter = () => 18; // use positive bound
      s.upgrades.push({ x: xCenter - spread, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'bazooka' });
      s.upgrades.push({ x: xCenter, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'laser' as any });
      s.upgrades.push({ x: xCenter + spread, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'shotgun' });
    }
    expect(s.upgrades.length).toBe(3);
    for (const u of s.upgrades) {
      expect(u.r).toBeGreaterThanOrEqual(21);
      expect(Math.abs(u.vx || 0)).toBeGreaterThan(0);
    }
    // large separation: shotgun and bazooka far from center
    const xs = s.upgrades.map(u=>u.x).sort((a,b)=>a-b);
    expect(Math.abs(xs[0] - xs[2])).toBeGreaterThanOrEqual(400);
    s.nextUpgradeAt = nextUpgradeScore(s.nextUpgradeAt);
    expect(s.nextUpgradeAt).toBe(400);
  });
});


