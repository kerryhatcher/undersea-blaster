# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Commit Standards

**IMPORTANT**: Always follow the [Conventional Commits](https://www.conventionalcommits.org/) standard when creating commit messages.

Format: `<type>[optional scope]: <description>`

Common types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

Examples:
- `feat(game): add power-up system`
- `fix(collision): correct enemy hitbox detection`
- `docs: update README with new commands`
- `chore: upgrade dependencies`

## Commands

### Development
- `npm run dev` - Start Vite dev server with hot reload at http://localhost:5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build at http://localhost:5173

### Testing  
- `npm test` - Run unit tests once (Vitest)
- `npm run test:watch` - Run unit tests in watch mode
- `npm run e2e` - Run end-to-end tests (Playwright)
- `npm run e2e:ui` - Run e2e tests with Playwright UI
- `npm run e2e:headed` - Run e2e tests in headed mode
- `npm run e2e:install` - Install Playwright dependencies

## Architecture

This is a TypeScript canvas-based underwater shooting game built with Vite.

### Core Structure
- `src/main.ts` - Main game loop, rendering, input handling, and canvas setup
- `src/game/state.ts` - Central game state types and initializers  
- `src/game/systems/` - Pure logic modules for game mechanics

### Game Systems
- **Difficulty** (`systems/difficulty.ts`) - Level progression, spawn timing, speed scaling
- **Collision** (`systems/collision.ts`) - Circle overlap detection for bullets/enemies/player  
- **Upgrades** (`systems/upgrades.ts`) - Weapon upgrades (bazooka, shotgun) and explosion mechanics

### Key Game State
The `GameState` type in `state.ts` contains:
- Player position, health (hits/maxHits), invulnerability timer
- Arrays for bullets, patties (enemies), upgrades, explosions
- Score, level, timing states, weapon upgrade states

### Rendering Pipeline
`main.ts` handles the complete render cycle:
- Background gradient with animated bubbles
- Game entities (player, enemies, bullets, explosions, upgrades)
- HUD (score, level, health hearts, weapon timers)
- Overlays (level up, game over, pause)
- Touch controls for mobile

### Development Features
- **Remote Console** - `vite.config.ts` includes custom plugin that forwards browser console logs to terminal during `npm run dev`
- **Client Logger** - `src/dev/client-logger.ts` sends console output to dev server for easier mobile debugging

### Testing Strategy
- **Unit tests** - Located in `test/` using Vitest with jsdom environment
- Test pure logic functions (difficulty calculations, collision detection)
- **E2E tests** - Located in `tests-e2e/` using Playwright
- Game exposes minimal test interface via `window.__game` in dev mode

### Legacy Support
- `mockup.html` - Original standalone HTML version (legacy)
- `server.py` and `start-server.sh` - Python server scripts for legacy version