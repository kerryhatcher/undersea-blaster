export function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy < rr * rr;
}

export function approximatePlayerRadius(playerWidth: number, playerHeight: number): number {
  return Math.min(playerWidth, playerHeight) * 0.42;
}
