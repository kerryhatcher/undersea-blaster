#!/usr/bin/env bash
set -euo pipefail

# Download and run the latest Undersea Blaster AppImage for your architecture
# - Uses GitHub Releases "latest" and per-arch stable asset names
# - Supports x86_64 (x64) and aarch64/arm64

REPO_SLUG="${REPO_SLUG:-kerryhatcher/undersea-blaster}"
DEST_DIR="${DEST_DIR:-$PWD}"
RUN_AFTER_DOWNLOAD="${RUN_AFTER_DOWNLOAD:-1}" # 1=yes, 0=no

detect_architecture() {
  local uname_arch
  uname_arch="$(uname -m)"
  case "$uname_arch" in
    x86_64|amd64)
      echo "x86_64"
      ;;
    aarch64|arm64)
      echo "arm64"
      ;;
    *)
      echo "unsupported"
      ;;
  esac
}

ARCH="$(detect_architecture)"
if [[ "$ARCH" == "unsupported" ]]; then
  echo "[error] Unsupported architecture: $(uname -m). Supported: x86_64, arm64" >&2
  exit 1
fi

ASSET_NAME="undersea-blaster-latest-${ARCH}.AppImage"
DOWNLOAD_URL="https://github.com/${REPO_SLUG}/releases/latest/download/${ASSET_NAME}"

mkdir -p "$DEST_DIR"
TARGET_PATH="${DEST_DIR%/}/undersea-blaster.AppImage"
TMP_PATH="${TARGET_PATH}.partial"

echo "[info] Downloading ${ASSET_NAME} for arch=${ARCH}..."
echo "[info] From: ${DOWNLOAD_URL}"
echo "[info] To:   ${TARGET_PATH}"

curl -fL --retry 3 --retry-delay 2 -o "$TMP_PATH" "$DOWNLOAD_URL"
mv -f "$TMP_PATH" "$TARGET_PATH"
chmod +x "$TARGET_PATH"

echo "[ok] Downloaded: $TARGET_PATH"

if [[ "$RUN_AFTER_DOWNLOAD" == "1" ]]; then
  echo "[run] Launching game..."
  exec "$TARGET_PATH" "$@"
else
  echo "[hint] To run: \n  $TARGET_PATH"
fi


