export type Pads = {
  padR: number;
  leftCx: number; leftCy: number;
  rightCx: number; rightCy: number;
  fireCx: number; fireCy: number; fireR: number;
};

export function computePads(w: number, h: number, bottomInset = 0): Pads {
  const padR = Math.min(56, Math.min(w, h) * 0.065);
  const leftCx = 24 + padR, leftCy = h - (24 + padR + bottomInset);
  const rightCx = leftCx + (padR * 2.6), rightCy = leftCy;
  const fireR = padR * 1.6; const fireCx = w - (24 + fireR), fireCy = h - (24 + fireR + bottomInset);
  return { padR, leftCx, leftCy, rightCx, rightCy, fireCx, fireCy, fireR };
}

export function hitCircle(px: number, py: number, cx: number, cy: number, r: number){
  const dx = px - cx, dy = py - cy; return (dx*dx + dy*dy) <= r*r;
}

export type Control = 'left' | 'right' | 'fire' | 'none';

export function classifyPointer(x: number, y: number, w: number, h: number, bottomInset = 0): Control {
  const { padR, leftCx, leftCy, rightCx, rightCy, fireCx, fireCy, fireR } = computePads(w, h, bottomInset);
  if (hitCircle(x,y,leftCx,leftCy,padR)) return 'left';
  if (hitCircle(x,y,rightCx,rightCy,padR)) return 'right';
  if (hitCircle(x,y,fireCx,fireCy,fireR)) return 'fire';
  return 'none';
}

// Touch-drag shooting: begin drag if the touch is within a band above the player
export function shouldStartDrag(touchY: number, playerY: number, bandPx = 120): boolean {
  return touchY >= (playerY - bandPx);
}


