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
