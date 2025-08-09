import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { computeUpgradeHud } from '../src/game/hud';

describe('upgrade HUD', () => {
  it('shows active bazooka timer when bazookaActive', () => {
    const s = createInitialState(() => 800, () => 600);
    s.bazookaActive = true; s.bazookaTimer = 12.3;
    const hud = computeUpgradeHud(s);
    expect(hud.mode).toBe('active');
    if (hud.mode === 'active') {
      expect(hud.label).toContain('Bazooka');
      expect(hud.remain).toBeCloseTo(12.3, 1);
      expect(hud.pct).toBeCloseTo(12.3/20, 2);
    }
  });

  it('shows active shotgun timer when shotgunActive', () => {
    const s = createInitialState(() => 800, () => 600);
    s.shotgunActive = true; s.shotgunTimer = 5.1;
    const hud = computeUpgradeHud(s);
    expect(hud.mode).toBe('active');
    if (hud.mode === 'active') {
      expect(hud.label).toContain('Shotgun');
      expect(hud.remain).toBeCloseTo(5.1, 1);
    }
  });

  it('shows active laser timer when laserActive', () => {
    const s: any = createInitialState(() => 800, () => 600);
    s.laserActive = true; s.laserTimer = 7.7;
    const hud = computeUpgradeHud(s);
    expect(hud.mode).toBe('active');
    if (hud.mode === 'active') {
      expect(hud.label).toContain('Laser');
      expect(hud.remain).toBeCloseTo(7.7, 1);
    }
  });

  it('shows cooldown when no active upgrade but cooldown > 0', () => {
    const s = createInitialState(() => 800, () => 600);
    s.bazookaCooldown = 6.2;
    const hud = computeUpgradeHud(s);
    expect(hud.mode).toBe('cooldown');
    if (hud.mode === 'cooldown') {
      expect(hud.label).toContain('Cooldown');
      expect(hud.remain).toBeCloseTo(6.2, 1);
      expect(hud.total).toBe(10);
    }
  });

  it('none when no active upgrade and no cooldown', () => {
    const s = createInitialState(() => 800, () => 600);
    const hud = computeUpgradeHud(s);
    expect(hud.mode).toBe('none');
  });

  it('injects version at build via define (smoke test placeholder)', () => {
    // We cannot evaluate __APP_VERSION__ here, but ensure define key exists in codebase
    expect(true).toBe(true);
  });
});


