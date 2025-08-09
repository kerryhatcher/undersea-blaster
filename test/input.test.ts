import { describe, it, expect } from 'vitest';
import { computePads, classifyPointer } from '../src/game/systems/input';

describe('mobile pads and pointer classification', () => {
  it('computes pad positions within viewport', () => {
    const pads = computePads(1200, 800);
    expect(pads.leftCx).toBeGreaterThan(0);
    expect(pads.leftCy).toBeGreaterThan(0);
    expect(pads.rightCx).toBeGreaterThan(pads.leftCx);
    expect(pads.fireCx).toBeGreaterThan(pads.rightCx);
    expect(pads.fireCy).toBeGreaterThan(0);
  });

  it('classifies touches to left/right/fire correctly', () => {
    const w = 1200, h = 800;
    const p = computePads(w, h);
    expect(classifyPointer(p.leftCx, p.leftCy, w, h)).toBe('left');
    expect(classifyPointer(p.rightCx, p.rightCy, w, h)).toBe('right');
    expect(classifyPointer(p.fireCx, p.fireCy, w, h)).toBe('fire');
    expect(classifyPointer(10, 10, w, h)).toBe('none');
  });
});


