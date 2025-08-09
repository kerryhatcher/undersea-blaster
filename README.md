# Undersea Blaster

A fun underwater shooting game where you control a sponge character shooting bubbles at falling burger patties!

## 🎮 How to Play

- **Desktop**: Use arrow keys or A/D to move, Space/Enter to shoot
- **Mobile**: Use the on-screen touch controls
- **Goal**: Shoot the falling burger patties to score points!

## 🚀 Run (Vite + TypeScript)

- Install dependencies:
```bash
npm install
```
- Start dev server with hot reload:
```bash
npm run dev
```
- Open: http://localhost:5173
- Build for production:
```bash
npm run build
```
- Preview production build:
```bash
npm run preview
```

## 🐛 Debugging (Remote Console)

When running `npm run dev`, the browser's console logs and errors are forwarded to your terminal. This helps debug on mobile devices where opening devtools is difficult.

- What gets forwarded:
  - `console.log`, `console.info`, `console.warn`, `console.error`
  - Uncaught errors and unhandled promise rejections
- Where it prints: your dev server terminal, prefixed with `[client:level]`

## ✅ Tests

- Run tests once:
```bash
npm test
```
- Run tests in watch mode:
```bash
npm run test:watch
```

## 📦 Legacy Mockup (HTML)

The original standalone mockup remains as `mockup.html`. You can still serve it if desired:
- Script: `./start-server.sh legacy`
- Or: `python3 server.py`
- Or: `python3 -m http.server 8000` then open `http://localhost:8000/mockup.html`

## 🛠️ Technical Details

- **Build/Dev**: Vite
- **Language**: TypeScript (strict)
- **Tests**: Vitest (jsdom env)
- **Structure**:
```
src/
  game/
    state.ts           # state types + initializers
    systems/
      difficulty.ts    # spawn interval, speed scale, level checks (tested)
      collision.ts     # circle overlap, player radius (tested)
  dev/
    client-logger.ts   # forwards console logs/errors to dev server terminal
  main.ts              # canvas game loop and rendering
index.html             # Vite entry
```

## 🎯 Game Mechanics

- Health: 5 hits; flashing i-frames after hit; game over on 5th
- Score: +50 per patty destroyed
- Levels: +1 level every +1000 pts (since last level start)
  - Faster spawn (min 300ms), faster patties (up to 3x) per level
- Controls: Arrows/A-D to move, Space/Enter to shoot; touch pads on mobile

## 🧪 Testing Strategy

- Unit-test pure logic (difficulty, collision, any utilities)
- Keep rendering/game loop thin and integration-tested later
- Going forward: add tests alongside new modules under `test/`

## 🛑 Stopping Dev Server

Press `Ctrl+C` in the terminal.

Enjoy the game! 🐠
