# Post-commit Feature & Fix Report (since e4f491b, 2025-08-08)

Date: 2025-08-09
Branch: main

## Features
- Player damage and lives: 5-hit system with invulnerability frames, visual red tint and crack lines, HUD pips.
- Game over overlay with non-interactive pause of player and restart instructions.
- Pause-on-blur: game auto-pauses when window loses focus; tap/click resumes.
- Levels and difficulty:
  - Level up every +1000 points; spawn rate increases and patty speed scales.
  - Level banner overlay; HUD shows `Lv N`.
  - On level up, regain 1 hit point if below max.
- Weapons:
  - Bazooka upgrade: 20s effect. Missiles with smoke/fire trails, explosion splash damage on impact, timer HUD with cooldown (10s) after effect ends.
  - Shotgun upgrade: 20s effect. 5-shot spread, slightly slower rate, faster bullets, small splash radius. Shares cooldown with bazooka.
  - Upgrade bubbles: both bazooka and shotgun appear together (separate bubbles) at each +200 points; popping one activates it and removes the other; no bubbles during cooldown or while an effect is active.
- Death explosion: Large cartoonish multi-puff explosion with shockwave ring; player sprite hidden after death.

## Visual/UX improvements
- Missile orientation adjusted to fire upright from player.
- Explosion visuals amplified: flash, multi-color puffs, gradient shockwave.
- Timers: Bazooka active bar and cooldown bar in HUD.

## Performance & Stability
- Object caps to prevent freezes at high levels:
  - Max patties: 80
  - Max bullets: 160
  - Max trail segments per missile: 30
  - Max simultaneous explosions: 32
- Fixed level banner timer freeze by decaying timer in update loop (not draw).

## Debugging & Testing
- Dev remote console forwarding to Vite terminal (logs/errors/unhandled rejections).
- Exposed `window.__game.state` in dev to enable test automation.
- Unit tests (Vitest): difficulty scaling, collision helpers, level-up heal.
- E2E tests (Playwright): game stability past 19k score/level 19 scenario; verifies no freeze and continued interaction.

## How to run
- Dev: `npm run dev`
- Unit tests: `npm test`
- E2E: `npm run e2e` (first install: `npm run e2e:install`)
- Build: `npm run build`

## Notes
- Upgrade cooldown is shared for bazooka and shotgun.
- Upgrade bubbles only spawn when neither effect is active and cooldown is 0.
- Player is not drawn after death; only the explosion and overlay remain visible.
