## Migration Report – Vite + TypeScript + Vitest

- Date: 2025-08-08
- Scope: Migrate the game to a modern toolchain with unit testing and modular structure

### Summary
- Introduced Vite (dev server/build), TypeScript (strict), and Vitest (unit testing, jsdom) to support scalable development.
- Migrated the canvas game from `mockup.html` into `src/main.ts` with minimal behavioral changes.
- Extracted pure logic into testable modules under `src/game/systems`.

### What Changed
- New project files:
  - `package.json` – scripts: dev/build/preview/test
  - `tsconfig.json` – strict TS config
  - `vite.config.ts` – test env set to `jsdom`
  - `index.html` – Vite entry mounting the canvas and loading `src/main.ts`
  - `src/main.ts` – game loop, rendering, inputs
  - `src/game/state.ts` – state types and reset helpers
  - `src/game/systems/difficulty.ts` – spawn interval, speed scaling, level checks
  - `src/game/systems/collision.ts` – circle overlap, player radius
  - `test/*.test.ts` – unit tests for pure logic

### Tests
- Commands:
  - `npm test` – run tests once
  - `npm run test:watch` – watch mode
- Current coverage (unit targets):
  - Difficulty scaling functions
  - Collision helpers

### Dev Workflow
- Run the game with hot reload: `npm run dev` → `http://localhost:5173`
- Build: `npm run build`; Preview: `npm run preview`
- Add new features via modules in `src/game/` and write tests in `test/`

### Notes
- The original `mockup.html` remains for reference/backup and can still be served via the existing Python server.
- Future UI overlays (menus, settings) can be added later with React/Preact if needed; the canvas loop remains independent.

### Next Steps
- Add audio system (WebAudio) and unit tests for timing/volume math where possible
- Consider PWA for offline play
- Add CI to run `npm test` on every push/PR
