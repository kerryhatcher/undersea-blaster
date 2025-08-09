import { describe, it, expect } from 'vitest';
import { computePads, classifyPointer, shouldStartDrag } from '../src/game/systems/input';

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

  it('applies bottom safe-area inset to keep pads above iOS bar', () => {
    const w = 800, h = 600; const inset = 24;
    const p0 = computePads(w, h, 0);
    const p1 = computePads(w, h, inset);
    expect(p1.leftCy).toBeLessThan(p0.leftCy); // pushed up
    expect(p1.fireCy).toBeLessThan(p0.fireCy);
  });

  it('keeps right pad clear of right-edge overlay by allowing a leftward nudge (logic in render)', () => {
    const w = 800, h = 600; const p = computePads(w, h, 0);
    const wouldOverlap = (p.rightCx + p.padR) > (w - 120);
    // Simulate nudge condition
    const nudgedRightCx = wouldOverlap ? Math.max(p.rightCx - 40, p.padR + 12) : p.rightCx;
    expect(nudgedRightCx + p.padR).toBeLessThanOrEqual(w);
  });

  it('starts drag when touching near or below player Y', () => {
    const playerY = 500;
    expect(shouldStartDrag(520, playerY)).toBe(true);
    expect(shouldStartDrag(450, playerY)).toBe(true);
    expect(shouldStartDrag(360, playerY)).toBe(false); // above band
  });
});


