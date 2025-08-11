import type { GameState } from './state';
import { resetPlayer } from './state';

// Track last known logical (CSS pixel) size per-canvas so we can compute
// proportional reflow even when the 'resize' event fires after layout.
const lastLogicalSize = new WeakMap<HTMLCanvasElement, { w: number; h: number }>();

export function clampNumber(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Resize the canvas backing store to match its rendered size and reflow the player.
// Works for both desktop and mobile (including dynamic viewport changes).
export function resizeCanvasAndReflow(state: GameState | null, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const last = lastLogicalSize.get(canvas) || { w: state ? state.w() : 0, h: state ? state.h() : 0 };
  const oldW = last.w;
  const oldH = last.h;

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, (window.devicePixelRatio || 1));
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!state) return;
  const newW = state.w();
  const newH = state.h();
  // Update last known size for next invocation
  lastLogicalSize.set(canvas, { w: newW, h: newH });

  if (oldW > 0 && oldH > 0) {
    if (state.paused) {
      resetPlayer(state);
    } else {
      // Preserve relative position using exact ratios (no integer rounding)
      const xPctBefore = state.player.x / Math.max(1, oldW);
      const yPctBefore = state.player.y / Math.max(1, oldH);
      state.player.x = clampNumber(xPctBefore * newW, 28, Math.max(28, newW - 28));
      state.player.y = clampNumber(yPctBefore * newH, 28, Math.max(28, newH - 28));
      // Guardrail: if vertical position drifts too far from visible band due to browser quirks,
      // reseat back to the previous ratio to keep player consistent.
      const yPct = state.player.y / Math.max(1, newH);
      if (yPct < 0.15 || yPct > 0.98) {
        state.player.y = clampNumber(yPctBefore * newH, 28, Math.max(28, newH - 28));
      }
    }
  } else {
    resetPlayer(state);
  }
}


