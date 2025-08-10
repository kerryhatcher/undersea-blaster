# Undersea Blaster - GitHub Copilot Instructions

**ALWAYS follow these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Project Overview
Undersea Blaster is a TypeScript canvas-based underwater shooting game built with Vite. Players control a sponge character shooting bubbles at falling burger patties. The game features progressive difficulty, health system, mobile touch controls, and weapon upgrades.

## Bootstrap & Development Setup
**CRITICAL**: Run these commands in exact order. NEVER CANCEL any command - wait for completion.

1. **Install Dependencies:**
   ```bash
   npm install
   ```
   - **TIMEOUT**: Set 3+ minutes. NEVER CANCEL.
   - **TIME**: Takes ~53 seconds, but can take up to 2+ minutes on slow networks
   - **NOTE**: May show npm warnings about deprecated packages - this is normal

2. **Build Production Bundle:**
   ```bash
   npm run build
   ```
   - **TIMEOUT**: Set 3+ minutes. NEVER CANCEL.
   - **TIME**: Takes ~1.3 seconds normally, but Vite builds can take 2+ minutes with extensions/PWA
   - **OUTPUT**: Creates `dist/` folder with optimized bundle and service worker

3. **Run Unit Tests:**
   ```bash
   npm test
   ```
   - **TIMEOUT**: Set 1+ minutes. NEVER CANCEL.
   - **TIME**: Takes ~5 seconds for 33 tests across 16 files
   - **COVERAGE**: Tests pure game logic (difficulty, collision, audio, upgrades)

## Development Workflow

### Start Development Server
```bash
npm run dev
```
- **SERVER**: Runs on http://localhost:5173
- **HOT RELOAD**: Automatic page reload on file changes
- **REMOTE CONSOLE**: Browser console logs forwarded to terminal (great for mobile debugging)
- **STARTUP**: ~200ms startup time

### Preview Production Build
```bash
npm run preview
```
- **SERVER**: Runs on http://localhost:5173 
- **PURPOSE**: Test production bundle before deployment
- **REQUIREMENT**: Must run `npm run build` first

### Test in Watch Mode
```bash
npm run test:watch
```
- **PURPOSE**: Continuous testing during development
- **PERFORMANCE**: Re-runs only changed tests automatically

## Manual Validation Requirements
**CRITICAL**: After making any changes, ALWAYS validate through complete user scenarios:

### Core Game Testing Scenario
1. **Start Game**: Navigate to http://localhost:5173
2. **Click/Tap**: Click the game canvas to start playing
3. **Movement**: Use arrow keys (or A/D) to move the yellow sponge character
4. **Shooting**: Press Space/Enter to shoot bubbles at falling burger patties  
5. **Mobile**: Test touch controls (left/right pads and shoot button)
6. **Health System**: Verify player takes damage when hit by patties
7. **Scoring**: Confirm +50 points per destroyed patty
8. **Level Progression**: Test increasing difficulty every 1000 points

### Validation Checklist
- [ ] Game starts without errors
- [ ] Player character moves smoothly with keyboard/touch
- [ ] Bullets fire when pressing Space/Enter or touch button
- [ ] Enemies (patties) fall and can be destroyed
- [ ] Score increases correctly (+50 per kill)
- [ ] Health system works (5 hearts, invulnerability frames)
- [ ] Mobile touch controls respond properly
- [ ] Background bubbles animate smoothly

## End-to-End Testing (Currently Limited)
```bash
npm run e2e:install    # Install Playwright browsers - CURRENTLY FAILS
npm run e2e           # Run e2e tests - REQUIRES SUCCESSFUL INSTALL
```
- **STATUS**: Playwright browser installation currently fails due to download issues
- **WORKAROUND**: Use manual browser testing as described above
- **ALTERNATIVE**: `npm run e2e:ui` for Playwright UI mode (when working)

## Legacy Support
The project includes original standalone HTML version:
```bash
./start-server.sh legacy    # Serves mockup.html on http://localhost:8000
python3 server.py          # Alternative legacy server
```

## Project Structure & Navigation

### Core Architecture
- **`src/main.ts`** - Main game loop, rendering, input handling, canvas setup
- **`src/game/state.ts`** - Central game state types and initializers  
- **`src/game/systems/`** - Pure logic modules (difficulty, collision, upgrades, audio, input, laser, layout)
- **`src/dev/client-logger.ts`** - Console forwarding for mobile debugging

### Key Game Systems
- **Difficulty** (`systems/difficulty.ts`) - Level progression, spawn timing, speed scaling
- **Collision** (`systems/collision.ts`) - Circle overlap detection for bullets/enemies/player  
- **Upgrades** (`systems/upgrades.ts`) - Weapon upgrades (bazooka, shotgun) and explosion mechanics
- **Audio** (`systems/audio.ts`) - Sound effects and background music management
- **Input** (`systems/input.ts`) - Keyboard and touch input handling
- **Laser** (`systems/laser.ts`) - Advanced weapon systems and ricochet mechanics

### Test Structure
- **`test/`** - Unit tests for pure logic functions (Vitest + jsdom)
- **`tests-e2e/`** - End-to-end tests (Playwright - currently limited)
- **Testing Focus**: Unit-test pure logic, integration-test rendering pipeline

### Configuration Files
- **`vite.config.ts`** - Build config with remote console plugin and PWA setup
- **`playwright.config.ts`** - E2E test configuration (60s timeout)
- **`tsconfig.json`** - TypeScript strict configuration
- **`package.json`** - Dependencies and scripts

## Development Features

### Remote Console (Development Only)
- **PURPOSE**: Forward browser console to terminal for mobile debugging
- **ACTIVATION**: Automatic when running `npm run dev`
- **LOGS**: console.log, console.error, uncaught exceptions
- **FORMAT**: `[client:level] timestamp @ url`

### PWA Support
- **SERVICE WORKER**: `src/sw.ts` - Handles caching and offline functionality
- **MANIFEST**: Auto-generated from Vite PWA plugin
- **DEPLOYMENT**: Configured for GitHub Pages deployment

## CI/CD Pipeline

### GitHub Actions (.github/workflows/ci-pages.yml)
1. **Unit Tests**: Run on all PRs and main branch pushes
2. **Build & Deploy**: Automatically deploy to GitHub Pages on version tags
3. **Node Version**: Uses Node.js 20
4. **Commands**: `npm ci` → `npm test --silent` → `npm run build`

## Common Debugging Scenarios

### Build Failures
- **Clean Install**: `rm -rf node_modules package-lock.json && npm install`
- **TypeScript Errors**: Check `src/` files for type issues
- **Vite Issues**: Clear `.vite` cache folder

### Test Failures  
- **Unit Tests**: Check `test/*.test.ts` for specific failures
- **Performance Tests**: `perf-*.test.ts` may fail on slow systems
- **Game Logic**: Focus on `difficulty.test.ts`, `collision.test.ts`, `upgrades.test.ts`

### Runtime Issues
- **Black Screen**: Check browser console for JavaScript errors
- **No Sound**: Verify audio files in `public/` directory
- **Touch Controls**: Test on actual mobile device, not just desktop simulation
- **Performance**: Monitor frame rate in browser dev tools

## Quick Reference Commands
```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build           # Build production bundle
npm run preview         # Preview production build

# Testing  
npm test                # Run unit tests once
npm run test:watch      # Run tests in watch mode
npm run e2e             # Run e2e tests (when Playwright works)

# Legacy
./start-server.sh legacy # Serve original mockup.html
./start-server.sh help   # Show all available options

# Validation
# Always manually test game after changes:
# 1. Start game, 2. Move player, 3. Shoot enemies, 4. Test mobile controls
```

## Expected Timings (Add 50% buffer for timeouts)
- **npm install**: 53 seconds → Use 2-minute timeout minimum
- **npm test**: 5 seconds → Use 30-second timeout minimum  
- **npm run build**: 1.3 seconds → Use 2-minute timeout minimum
- **Server startup**: <1 second → Use 30-second timeout minimum

**REMEMBER**: NEVER CANCEL long-running commands. Builds and tests must complete fully for accurate validation.