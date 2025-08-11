export type MovementControls = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

export type PlayerLike = { x: number; y: number; speed: number };

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function computeNextPlayerPosition(
  player: PlayerLike,
  controls: MovementControls,
  dtSeconds: number,
  boundsWidth: number,
  boundsHeight: number,
  margin = 28,
): { x: number; y: number } {
  const speed = player.speed;
  let dirX = 0;
  let dirY = 0;
  if (controls.left && !controls.right) dirX -= 1;
  if (controls.right && !controls.left) dirX += 1;
  if (controls.up && !controls.down) dirY -= 1;
  if (controls.down && !controls.up) dirY += 1;

  // Normalize so diagonal is not faster; keep zero when no input
  const len = Math.hypot(dirX, dirY) || 1;
  dirX = dirX / len; dirY = dirY / len;
  let nextX = player.x + dirX * speed * dtSeconds;
  let nextY = player.y + dirY * speed * dtSeconds;

  nextX = clamp(nextX, margin, Math.max(margin, boundsWidth - margin));
  nextY = clamp(nextY, margin, Math.max(margin, boundsHeight - margin));
  return { x: nextX, y: nextY };
}


