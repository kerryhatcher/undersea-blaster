## Undersea Blaster – Player Damage & Game Over Update

- Date: 2025-08-08
- Scope: Add progressive player damage on patty collision and game over after 5 hits, with visuals and restart flow
- File modified: `mockup.html`

### Summary
- Player now takes damage when touching a hamburger patty. After 5 hits, the player "dies" (game over).
- Visual feedback includes red tint, crack lines, and invulnerability flashing.
- HUD shows health pips; a Game Over overlay appears with restart instructions.

### Key Changes
- State additions:
  - `player.hits: number` – accumulated hits
  - `player.maxHits: number = 5` – total hits before game over
  - `player.invuln: number` – seconds of invulnerability (i-frames) after a hit
  - `gameOver: boolean` – global game over flag
- Reset behavior:
  - `hardReset()` now clears `gameOver`, `player.hits`, and `player.invuln` in addition to existing fields.
- Input changes:
  - While `gameOver`, pressing `R`/`Space`/`Enter` or tapping the canvas triggers `hardReset()`.
- Update loop:
  - Movement and shooting are ignored when `gameOver` is true.
  - `player.invuln` decays over time.
  - Added patty–player collision check; on hit (and not invulnerable):
    - increment `player.hits`, set `player.invuln = 1.2` seconds, remove patty
    - if `player.hits >= player.maxHits`, set `gameOver = true` and clear controls
- Rendering:
  - Player flashes (reduced alpha) while invulnerable
  - Red tint overlay over player scales with damage
  - Crack lines drawn over player; number grows with `player.hits`
  - Health pips (top-right) show remaining health (filled = remaining, faded = lost)
  - Game Over overlay with instructions

### Quick Manual Test
1. Start the server (`./start-server.sh`) and open `http://localhost:8000/mockup.html`.
2. Allow patties to touch the player 5 times; verify red tint intensifies, crack lines increase.
3. On the 5th hit, confirm Game Over overlay appears and controls stop.
4. Press `R`, `Space`, `Enter`, or tap to restart; verify hits reset and game resumes.

### Notes & Considerations
- Player collision uses an approximate circle radius of ~42% of player size for responsiveness.
- Invulnerability window is 1.2s to prevent immediate repeated hits.
- Existing self-tests remain; damage logic is additive to current gameplay.

### Suggested Future Enhancements
- Add hit sound/visual burst effects.
- Brief knockback on hit.
- UI: show numeric lives or hearts icon.
- Add a dedicated restart button on the Game Over overlay.
