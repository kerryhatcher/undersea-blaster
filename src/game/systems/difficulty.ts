export function getSpawnIntervalMs(level: number): number {
  const dec = (level - 1) * 35;
  return Math.max(300, 650 - dec);
}

export function getSpeedScale(level: number): number {
  return Math.min(3, 1 + (level - 1) * 0.12);
}

export function shouldLevelUp(score: number, scoreAtLevelStart: number): boolean {
  return score - scoreAtLevelStart >= 1000;
}

// Apply level-up side effects in one place for testability
import type { GameState } from '../../game/state';
export function applyLevelUp(state: GameState): void {
  state.level += 1;
  state.scoreAtLevelStart = state.score;
  state.levelUpTimer = 2.0;
  // Regain one hit point if damaged
  if (state.player.hits > 0) {
    state.player.hits = Math.max(0, state.player.hits - 1);
  }
}
