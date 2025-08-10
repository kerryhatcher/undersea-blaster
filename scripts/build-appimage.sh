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

# Compute version string; prefer CI tag if available
if [[ -n "${GITHUB_REF_NAME:-}" && "${GITHUB_REF_TYPE:-}" == "tag" ]]; then
  VERSION_STRING="${GITHUB_REF_NAME#v}"
elif git rev-parse --git-dir >/dev/null 2>&1; then
  VERSION_STRING="$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//')"
  if [[ -z "$VERSION_STRING" ]]; then
    VERSION_STRING="$(node -p "require('./package.json').version")"
  fi
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
ARCH_ARGS=""
case "${TARGET_ARCH:-x64}" in
  x64)
    ARCH_ARGS="--x64"
    ;;
  arm64)
    ARCH_ARGS="--arm64"
    ;;
  *)
    echo "[build] Unsupported TARGET_ARCH='${TARGET_ARCH}'. Supported: x64, arm64" >&2
    exit 1
    ;;
esac

npx --yes electron-builder --linux AppImage ${ARCH_ARGS} --publish never --config.extraMetadata.version="$VERSION_STRING" | cat

echo "[build] Done. Artifacts in dist-app/"
ls -lh dist-app | cat

APPIMAGE_PATH="$(ls -1 dist-app/*.AppImage | head -n1 || true)"
if [[ -n "${APPIMAGE_PATH}" ]]; then
  echo "[build] Built AppImage: $APPIMAGE_PATH"
  echo -e "[build] To run: \n  ${APPIMAGE_PATH}"
fi



