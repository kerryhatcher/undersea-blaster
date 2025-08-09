import type { Patty, GameState } from '../../game/state';
import { circlesOverlap, approximatePlayerRadius } from './collision';

export function nextUpgradeScore(currentNext: number): number {
  return currentNext + 200;
}

export function shouldSpawnUpgrade(currentScore: number, nextAt: number): boolean {
  return currentScore >= nextAt;
}

export function getExplosionHitIndices(patties: Patty[], x: number, y: number, radius: number): number[] {
  const hits: number[] = [];
  const r2 = radius * radius;
  for (let i = 0; i < patties.length; i++) {
    const a = patties[i];
    const dx = a.x - x, dy = a.y - y;
    if (dx*dx + dy*dy <= r2) hits.push(i);
  }
  return hits;
}

// Handles upgrade pickup popping logic safely; returns picked kind or null
export function processUpgradePickups(state: GameState): 'bazooka' | 'shotgun' | null {
  let picked: 'bazooka' | 'shotgun' | null = null;
  // bullet pop
  for (let i = state.upgrades.length - 1; i >= 0 && !picked; i--) {
    const u = state.upgrades[i];
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (circlesOverlap(u.x, u.y, u.r, b.x, b.y, b.r)) {
        state.bullets.splice(j, 1);
        picked = u.kind;
        break;
      }
    }
  }
  // player overlap
  if (!picked) {
    const p = state.player;
    const pr = approximatePlayerRadius(p.w, p.h);
    for (let i = state.upgrades.length - 1; i >= 0; i--) {
      const u = state.upgrades[i];
      if (circlesOverlap(u.x, u.y, u.r, p.x, p.y, pr)) { picked = u.kind; break; }
    }
  }
  if (picked) {
    if (picked === 'bazooka') {
      state.bazookaActive = true; state.bazookaTimer = 20.0;
      state.shotgunActive = false; state.shotgunTimer = 0;
    } else {
      state.shotgunActive = true; state.shotgunTimer = 20.0;
      state.bazookaActive = false; state.bazookaTimer = 0;
    }
    state.upgrades.length = 0; // remove both bubbles safely
  }
  return picked;
}
