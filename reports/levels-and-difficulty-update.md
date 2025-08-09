## Undersea Blaster – Levels & Difficulty Update

- Date: 2025-08-08
- Scope: Add progressive levels and difficulty scaling every 1000 points
- File modified: `mockup.html`

### Summary
- Introduced levels starting at 1.
- Player levels up every 1,000 points earned since the last level start.
- Each level increases difficulty by spawning patties faster and making them move faster.
- A brief level-up overlay appears when reaching a new level.

### Key Changes
- State additions:
  - `level: number` – current level (starts at 1)
  - `scoreAtLevelStart: number` – snapshot of score when level began
  - `levelUpTimer: number` – seconds for level-up overlay fade
- Reset behavior:
  - `hardReset()` now resets `level = 1`, `scoreAtLevelStart = 0`, `levelUpTimer = 0`.
- Spawning and speed scaling:
  - New `spawnPatty(speedScale)` accepts a speed multiplier.
  - Speed scale: `1 + 0.12 * (level - 1)` (capped at 3x).
  - Spawn interval: `max(300ms, 650ms - 35ms * (level - 1))`.
- Leveling logic:
  - On each update, if `score - scoreAtLevelStart >= 1000`:
    - Increment `level`, set `scoreAtLevelStart = score`, set `levelUpTimer = 2.0` seconds.
- Rendering:
  - HUD shows `Lv X` under the score.
  - Level-up overlay shows "Level N" briefly with a fade.

### Quick Manual Test
1. Start the game and play until you earn 1,000 points.
2. Observe a brief "Level 2" overlay; patties should spawn slightly faster and move faster.
3. Repeat for subsequent levels; difficulty ramps gradually.

### Notes
- Difficulty increases slowly to match the requirement.
- Leveling is based on incremental 1,000-point milestones per level, not total score only.
- All existing mechanics (damage, game over) remain compatible.
