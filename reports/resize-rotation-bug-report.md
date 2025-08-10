### Resize/Rotation Layout Bug Report

#### Summary
- **Issue**: Player icon position becomes incorrect when the window is maximized on desktop and when rotating mobile browsers; general resize events cause layout drift.
- **Impact**: Player appears too high/low or off-screen; mobile pads and overlays may misalign after rotation.
- **Root cause (high-level)**:
  - Player `y` is initialized once based on the canvas height and not recomputed on resize.
  - Canvas backing size is computed from `window.innerWidth/innerHeight` while game logic reads `canvas.clientWidth/Height` → mismatch under browser UI chrome, mobile URL bars, and DPR.
  - CSS viewport units order sets `height: 100vh` last, overriding dynamic viewport units (`svh`/`dvh`).

#### What I verified (Playwright)
- Loaded the dev server and sampled player/canvas metrics across viewport sizes/orientations using the Playwright MCP.
- Observations (player `y` in pixels remains constant; percentage of canvas height drifts):
  - 654×937: `y% ≈ 0.78` (expected baseline)
  - 1280×720: `y% ≈ 1.015` (player below bottom)
  - 1920×1080: `y% ≈ 0.677` (player too high)
  - 390×844 (portrait): `y% ≈ 0.866` (high)
  - 844×390 (landscape): `y% ≈ 1.874` (off-screen)

#### Code references
- Player reset uses a fixed proportion of the current height (set once): `state.player.y = state.h() * 0.78;` in `src/game/state.ts`.
- Canvas resize uses `innerWidth/innerHeight` (not the element’s measured size), and sets DPR:
  - `src/main.ts`, `resize()` uses `innerWidth/innerHeight` and `ctx.setTransform(dpr, ...)`.
- Game state width/height functions read `canvas.clientWidth/Height`:
  - `createInitialState(() => canvas.clientWidth, () => canvas.clientHeight)` in `src/main.ts`.
- CSS viewport units order (the last declaration wins):
  - `index.html` → `#game { width:100dvw; height:100dvh; height:100svh; height:100vh; }`.

#### Root cause (detailed)
- After the initial `resetPlayer`, `player.y` is never recomputed or scaled on resize, so it stays as a pixel value tied to the first canvas height.
- The backing store size uses `innerWidth/innerHeight` but the simulation uses `clientWidth/Height`. On mobile and iOS (with dynamic browser UI), these can diverge, producing inconsistent scaling.
- CSS sets `height:100vh` last, which on iOS/Android often includes hidden browser UI and does not reflect the visual viewport (causing extra space and misalignment). `dvh`/`svh` should take precedence.

---

### Fix plan (step-by-step)

1) Make canvas backing size match its rendered size
- In `src/main.ts` `resize()`:
  - Read the element’s rect: `const rect = canvas.getBoundingClientRect()`.
  - Compute DPR: `const dpr = Math.max(1, window.devicePixelRatio || 1)`.
  - Set backing size from rect, not window: `canvas.width = Math.floor(rect.width * dpr)`, `canvas.height = Math.floor(rect.height * dpr)`.
  - Keep `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.

2) Reflow player on resize
- Track old logical dimensions before changing backing size:
  - `const oldW = state.w()`, `const oldH = state.h()`.
- After backing size updates, re-query logical `newW = state.w()`, `newH = state.h()`.
- Scale player proportionally and clamp:
  - `state.player.x *= (newW / Math.max(1, oldW))`
  - `state.player.y *= (newH / Math.max(1, oldH))`
  - Clamp: `x = clamp(x, 28, newW - 28)`, `y = clamp(y, 28, newH - 28)`.
- Special-case when paused vs playing:
  - If `state.paused`: optionally call `resetPlayer(state)` to reseat at 78% height (simpler UX on pause screen).
  - If active play: use proportional scaling (prevents "jump").

3) React to visual viewport changes
- Add listener (when supported): `window.visualViewport?.addEventListener('resize', resize)`.
- Keep `window.addEventListener('resize', resize)` as fallback.

4) Fix viewport CSS ordering
- In `index.html` CSS for `#game`, reorder so dynamic units take precedence:
  - Recommended order (last wins): `height: 100vh; height: 100svh; height: 100dvh;`.
  - Similarly for width if needed: `width: 100vw; width: 100svw; width: 100dvw;`.

5) Guardrails
- Ensure `update()` continues to clamp `player.x` within bounds; add equivalent y-clamp after scaling.
- On resize, cancel an active drag to avoid unexpected jumps (optional improvement): e.g., track a `resizing` flag to ignore drag deltas during the current frame.

---

### Test plan (Playwright)

Add three E2E specs under `tests-e2e/` (reusing the dev-only handle, or expose a read-only `data-y-percent` on `#game` in test builds):

- `player-position-resize.spec.ts`
  - Start at default viewport, capture `player y%` (player.y / canvas.clientHeight).
  - Resize to 1280×720, 1920×1080, 390×844, 844×390.
  - Assert `y%` stays within [0.75, 0.81] when paused. If testing during active play, allow small deviation (±0.05) due to movement.

- `canvas-dpr-backing-size.spec.ts`
  - After each resize, assert `Math.abs((canvas.width / dpr) - clientWidth) <= 1` and same for height.

- `mobile-rotation.spec.ts`
  - Emulate phone viewport; measure `y%` in portrait vs landscape after calling `resize()`.
  - Verify `y%` remains in bounds and the player remains visible (e.g., between 0.2 and 0.95).

Note: If `window.__game` is unavailable in preview builds, prefer instrumenting a minimal, test-only attribute on the canvas (e.g., set `canvas.dataset.playerYpct = (state.player.y/state.h()).toFixed(3)` within `draw()` behind an environment flag) to avoid coupling tests to internals.

---

### Acceptance criteria
- Player remains within the visible playfield after any resize or orientation change.
- Player vertical position remains consistent (≈78% when paused; proportional scaling during play).
- Canvas backing size matches the element’s client size × DPR after resize.
- Mobile rotations do not cause off-screen player or misaligned pads; pause link sits above pads.

### Risks & mitigations
- Rapid/responsive resizing could cause extra work per frame → `resize()` is lightweight; debounce if needed.
- Mid-gesture rotations may feel jumpy → cancel drags on resize and require a fresh touch.
- iOS URL bar behavior varies → using `dvh/svh` and `visualViewport` mitigates most cases.

### Effort estimate
- Implementation: 1–2 hours
- Tests: 1–2 hours
- Cross-browser spot checks (desktop + mobile emulation): 30–60 minutes


