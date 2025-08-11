// Touch-drag shooting: begin drag if the touch is within a band above the player
export function shouldStartDrag(touchY: number, playerY: number, bandPx = 120): boolean {
  return touchY >= (playerY - bandPx);
}


