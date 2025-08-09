import type { Pads } from './input';

export function computeHintBottomOffset(pads: Pads, safeAreaBottom: number): number {
  const padBand = Math.max(pads.padR, pads.fireR) * 2 + 12; // diameter + margin
  return Math.ceil(safeAreaBottom + padBand);
}


