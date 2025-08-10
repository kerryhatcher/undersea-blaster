# Undersea Blaster

A fun underwater shooting game where you control a sponge character shooting bubbles at falling burger patties!

## ▶️ Download and play (Linux AppImage)

- One‑liner (downloads the latest build for your CPU and runs it):
  ```bash
  bash -c "curl -fsSL https://raw.githubusercontent.com/kerryhatcher/undersea-blaster/main/scripts/get-undersea-blaster.sh | bash"
  ```
  - Works on standard Linux desktops and Steam Deck (x86_64).
  - If it doesn’t auto‑launch, the file is saved as `./undersea-blaster.AppImage` in your current directory.

## 🌐 Play in your browser (PWA)

- Play now: [Undersea Blaster on the web](https://kerryhatcher.github.io/undersea-blaster/)
- Works offline after the first load (PWA). Updates are applied the next time you open the game.

### Android (Chrome)
- Open the link above in Chrome
- Tap the menu (⋮) → Install app (or Add to Home screen)
- Confirm Install
- Launch from your home screen like a native app

### iPhone/iPad (Safari)
- Open the link above in Safari (required by iOS for PWA install)
- Tap the Share button → Add to Home Screen
- Tap Add
- Launch from your home screen; it runs full-screen

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

## 🐧 Install and Run on Linux (AppImage)

- Build the desktop AppImage locally:
  ```bash
  npm run dist:appimage
  ```
  The AppImage will be created under `dist-app/undersea-blaster-<version>-<arch>.AppImage`.

- Run the game (local build):
  ```bash
  chmod +x dist-app/undersea-blaster-*.AppImage
  ./dist-app/undersea-blaster-*.AppImage
  ```

- Optional: add to desktop menu (AppImageLauncher recommended):
  - Install AppImageLauncher (Ubuntu/Debian):
    ```bash
    sudo add-apt-repository ppa:appimagelauncher-team/stable -y
    sudo apt-get update -y
    sudo apt-get install -y appimagelauncher
    ```
  - Then double-click the AppImage. It will offer to integrate it into the menu and create a launcher icon.

Notes:
- No installation is required; the AppImage is a single portable file.
- If double-clicking does nothing, right-click → Properties → Allow executing file as program, or use the `chmod +x` command above.


