#!/usr/bin/env bash
set -euo pipefail

# Build Undersea Blaster as an Electron AppImage for Linux

# Determine project root robustly for local and CI environments
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if git -C "$SCRIPT_DIR/.." rev-parse --git-dir >/dev/null 2>&1; then
  PROJECT_ROOT="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel)"
else
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
cd "$PROJECT_ROOT"

if [[ ! -d node_modules ]]; then
  echo "[build] Installing dependencies..."
  npm ci --no-audit --no-fund
fi

# Compute version string
if git rev-parse --git-dir >/dev/null 2>&1; then
  VERSION_STRING="$(git describe --tags --dirty --always 2>/dev/null || node -p "require('./package.json').version")"
else
  VERSION_STRING="$(node -p "require('./package.json').version + '-local-' + (new Date().toISOString().slice(0,10))")"
fi

echo "[build] VERSION_STRING=$VERSION_STRING"
export VERSION_STRING

# Use relative base paths for file:// loading inside Electron/AppImage
export BASE_PATH=./

echo "[build] Building web assets with Vite..."
npm run -s build

echo "[build] Packaging Electron AppImage..."
# Prevent electron-builder from attempting to publish during CI or when tags are present
npx --yes electron-builder --linux AppImage --publish never | cat

echo "[build] Done. Artifacts in dist-app/"
ls -lh dist-app | cat

APPIMAGE_PATH="$(ls -1 dist-app/*.AppImage | head -n1 || true)"
if [[ -n "${APPIMAGE_PATH}" ]]; then
  echo "[build] Built AppImage: $APPIMAGE_PATH"
  echo -e "[build] To run: \n  ${APPIMAGE_PATH}"
fi



