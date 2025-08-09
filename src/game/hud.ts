import type { GameState } from './state';

export type UpgradeHud =
  | { mode: 'active'; label: string; remain: number; total: number; pct: number }
  | { mode: 'cooldown'; label: string; remain: number; total: number; pct: number }
  | { mode: 'none' };

export function computeUpgradeHud(state: GameState): UpgradeHud {
  const total = 20;
  if (state.bazookaActive) {
    const remain = clamp01to20(state.bazookaTimer);
    return { mode: 'active', label: 'Bazooka', remain, total, pct: remain / total };
  }
  if (state.shotgunActive) {
    const remain = clamp01to20(state.shotgunTimer);
    return { mode: 'active', label: 'Shotgun', remain, total, pct: remain / total };
  }
  if ((state as any).laserActive) {
    const remain = clamp01to20((state as any).laserTimer);
    return { mode: 'active', label: 'Laser', remain, total, pct: remain / total };
  }
  if (state.bazookaCooldown > 0) {
    const cdTotal = 10;
    const remain = Math.max(0, Math.min(cdTotal, state.bazookaCooldown));
    return { mode: 'cooldown', label: 'Cooldown', remain, total: cdTotal, pct: remain / cdTotal };
  }
  return { mode: 'none' };
}

function clamp01to20(x: number) { return Math.max(0, Math.min(20, x)); }


