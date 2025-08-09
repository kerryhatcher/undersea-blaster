# Undersea Blaster – Feature & Quality Report (2025-08-09)

## Overview
This report summarizes recent changes across gameplay, UI/UX, audio, performance, and testing. Work focused on gameplay depth (new Laser upgrade with ricochet), clarity (larger, clearer upgrade bubbles and HUD fixes), audio polish, and regression-proofing via unit and performance tests.

## Gameplay & Mechanics
- Laser upgrade (new):
  - Extremely fast shots; increased fire rate (cooldown ~0.06s).
  - Visuals: thick, long, red laser streaks for visibility.
  - Ricochet: ~80% chance to bounce with dramatic randomness (10–80° angle, ± direction, 0.9–1.3 speed variance).
  - Safety and rules:
    - First contact that triggers ricochet does not grant extra damage/splash; ricochet spawns a new diagonal laser.
    - Ricochet lasers can damage all subsequent targets, including the player.
- Shotgun upgrade: unchanged mechanics; improved bubble icon and larger pickup bubble.
- Bazooka/missile: unchanged mechanics; missile SFX improved.
- Regular bullets: added small impact puff animation and light “pop” on hit.

## Upgrades – Spawning & Visuals
- Bubbles are ~30% larger (radius ~21) for easier targeting.
- Drastically increased horizontal separation between upgrade bubbles when spawned, making it easier to aim for a specific upgrade.
- Random mild horizontal drift retained for dynamism.
- Distinct icons:
  - Bazooka: launcher silhouette.
  - Shotgun: stock with 5 barrels.
  - Laser: glowing vertical rod.

## HUD & UX
- Upgrade timer HUD fixed and centralized:
  - Now reliably shows the active timer for Bazooka, Shotgun, and Laser.
  - Shows shared cooldown bar after an upgrade ends.
  - Logic centralized in `src/game/hud.ts` (`computeUpgradeHud`).
- Pause screen now includes audio attribution lines.

## Audio
- Ambience: Added underwater ambience (`amb_bubbles_01.mp3`) with attribution in `public/audio/README.txt`.
- Loader now supports `.ogg/.mp3/.wav` for all samples to improve compatibility.
- Missile SFX: replaced with Kenney `thrusterFire_004` (CC0) for a stronger launch feel.
- Regular bullet impacts: subtle pop using existing small explosion assets.

## Performance & Stability
- Object-capping (previously added) retained to prevent runaway counts.
- Added performance-focused unit tests to watch for regressions:
  - Explosion hit-index scanning over thousands of patties.
  - Bulk position updates over large bullet/patty sets.
  - Impact effect decay under heavy load.

## Testing (Unit/E2E)
- New/updated unit tests:
  - `test/hud.test.ts`: Active timers (Bazooka/Shotgun/Laser) and cooldown display correctness.
  - `test/upgrades-ui.test.ts`: Larger bubble radius, presence of Laser, and wide horizontal separation.
  - `test/impacts.test.ts`: Impact puff decay lifecycle.
  - `test/audio.test.ts`: Missile sound alternation logic.
  - `test/laser.test.ts`: Laser bouncy-shot selection indexing.
  - `test/laser-ricochet.test.ts`: Ricochet velocity shape and player-damage on bounced lasers.
  - Performance tests: `test/perf-*.test.ts` (indices, state loop, impacts).
- All tests pass locally (24/24 at the time of writing).

## Implementation Notes (Key Files)
- `src/main.ts`: Core loop updates for laser firing, ricochet spawning, player damage from bounced lasers, larger/more separated upgrade bubbles, distinct icons, impact puff handling, unified HUD rendering.
- `src/game/state.ts`: Types and state extended for Laser (`laserActive`, `laserTimer`, `laserShotIndex`) and impact effects.
- `src/game/systems/laser.ts`: Ricochet probability and randomized angle/velocity utilities.
- `src/game/hud.ts`: `computeUpgradeHud` consolidation for active/cooldown bar logic.
- `src/game/audio.ts`: Multi-format sample manifest, impact sound helper.
- `public/audio/README.txt`: Audio sources and licenses documented.

## Source & Licensing
- Kenney Game Audio (CC0): gun/shotgun/missile assets.
- Pixabay (Pixabay License): ambience (Underwater Ambience – DRAGON-STUDIO). See `public/audio/README.txt` for details.

## Developer Preferences
- No branches or pushes are made unless explicitly requested.
- Conventional Commits style followed for local commit messages (when commits are made upon request).
- New functionality ships with unit tests, and performance guard tests are being added progressively.

## Next Suggestions
- Add a subtle screen shake or shader flash for high-impact events (opt-in for accessibility).
- Consider a low-cost pooling approach for impacts/explosions to further reduce GC under stress.
- Expand E2E coverage for upgrade flows (spawn -> pickup -> timer -> cooldown) and long-session stability.
