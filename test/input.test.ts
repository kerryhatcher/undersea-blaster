import { describe, it, expect } from 'vitest';
import { shouldStartDrag } from '../src/game/systems/input';
import { computeNextPlayerPosition } from '../src/game/systems/move';

describe('input & movement', () => {
  it('starts drag when touching near or below player Y', () => {
    const playerY = 500;
    expect(shouldStartDrag(520, playerY)).toBe(true);
    expect(shouldStartDrag(450, playerY)).toBe(true);
    expect(shouldStartDrag(360, playerY)).toBe(false); // above band
  });

  it('computes next position with vertical and horizontal movement', () => {
    const p = { x: 400, y: 300, speed: 200 };
    // move up only
    let next = computeNextPlayerPosition(p, { left:false,right:false,up:true,down:false }, 0.5, 800, 600, 28);
    expect(next.y).toBeLessThan(p.y);
    // move down only
    next = computeNextPlayerPosition(p, { left:false,right:false,up:false,down:true }, 0.5, 800, 600, 28);
    expect(next.y).toBeGreaterThan(p.y);
    // clamp
    const nearEdge = { x: 10, y: 10, speed: 500 };
    next = computeNextPlayerPosition(nearEdge, { left:true,right:false,up:true,down:false }, 1.0, 800, 600, 28);
    expect(next.x).toBeGreaterThanOrEqual(28);
    expect(next.y).toBeGreaterThanOrEqual(28);
  });

  it('normalizes diagonal movement speed', () => {
    const p = { x: 400, y: 300, speed: 200 };
    const dt = 1.0;
    const horiz = computeNextPlayerPosition(p, { left:true,right:false,up:false,down:false }, dt, 2000, 2000, 0);
    const diag = computeNextPlayerPosition(p, { left:true,right:false,up:true,down:false }, dt, 2000, 2000, 0);
    const dxH = Math.abs(horiz.x - p.x);
    const dyH = Math.abs(horiz.y - p.y);
    const dxD = Math.abs(diag.x - p.x);
    const dyD = Math.abs(diag.y - p.y);
    // Horizontal has dx = speed, dy = 0
    expect(dxH).toBeCloseTo(200, 6);
    expect(dyH).toBeCloseTo(0, 6);
    // Diagonal should move total distance close to speed, split across axes
    const distDiag = Math.hypot(dxD, dyD);
    expect(distDiag).toBeCloseTo(200, 6);
  });
});


