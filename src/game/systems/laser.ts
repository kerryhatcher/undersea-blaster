export function shouldRicochet(rand: () => number = Math.random, probability = 0.8): boolean {
  return rand() < probability;
}

export function randomRicochetVelocity(baseSpeed: number, rand: () => number = Math.random): { vx: number; vy: number } {
  // pick 10..80 degrees, random left/right, add speed variance for drama
  const deg = 10 + rand() * 70;
  const rad = (deg * Math.PI) / 180;
  const sign = rand() < 0.5 ? -1 : 1;
  const speedScale = 0.9 + rand() * 0.4; // 0.9..1.3
  const speed = baseSpeed * speedScale;
  const vx = sign * speed * Math.sin(rad);
  const vy = -Math.abs(speed * Math.cos(rad));
  return { vx, vy };
}


