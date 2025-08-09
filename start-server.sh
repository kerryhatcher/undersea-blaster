#!/bin/bash

# Undersea Blaster Project Launcher
# Supports Vite dev/build/preview/test and legacy mockup server

set -euo pipefail

ACTION="${1:-dev}" # dev | build | preview | test | watch | legacy | help

function usage() {
  cat <<EOF
Usage: ./start-server.sh [action]

Actions:
  dev       Start Vite dev server (default)
  build     Build production bundle
  preview   Preview production build
  test      Run unit tests once (Vitest)
  watch     Run unit tests in watch mode (Vitest)
  legacy    Serve legacy mockup.html via Python
  help      Show this help message
EOF
}

function need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Error: Required command '$1' not found"; exit 1;
  fi
}

function ensure_node_modules() {
  if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
  fi
}

case "$ACTION" in
  help|-h|--help)
    usage; exit 0;;
  dev)
    need_cmd node; need_cmd npm
    ensure_node_modules
    echo "🚀 Starting Vite dev server..."
    echo "➡  Open http://localhost:5173"
    npm run dev
    ;;
  build)
    need_cmd node; need_cmd npm
    ensure_node_modules
    echo "🏗  Building production bundle..."
    npm run build
    ;;
  preview)
    need_cmd node; need_cmd npm
    ensure_node_modules
    echo "🔎 Previewing production build on http://localhost:5173"
    npm run preview
    ;;
  test)
    need_cmd node; need_cmd npm
    ensure_node_modules
    echo "🧪 Running unit tests..."
    npm test
    ;;
  watch)
    need_cmd node; need_cmd npm
    ensure_node_modules
    echo "🧪 Running unit tests (watch mode)..."
    npm run test:watch
    ;;
  legacy)
    # Serve the original mockup.html using Python as before
    need_cmd python3
    if [ ! -f "mockup.html" ]; then
      echo "❌ Error: mockup.html not found in $(pwd)"; exit 1;
    fi
    chmod +x server.py 2>/dev/null || true
    echo "🎮 Serving legacy mockup at http://localhost:8000/mockup.html"
    python3 server.py
    ;;
  *)
    echo "❓ Unknown action: $ACTION"; usage; exit 1;;
 esac
