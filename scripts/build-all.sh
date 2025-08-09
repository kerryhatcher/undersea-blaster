#!/bin/bash

# Build script for all platforms
# Builds Undersea Blaster for Windows, macOS, and Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Undersea Blaster Multi-Platform Build ===${NC}"

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required but not installed.${NC}" >&2; exit 1; }

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf dist/
rm -rf out/

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
fi

# Build web application
echo -e "${YELLOW}Building web application...${NC}"
npm run build

# Rebuild native modules for Electron
echo -e "${YELLOW}Rebuilding native modules for Electron...${NC}"
npm run rebuild:electron

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Building version: ${VERSION}${NC}"

# Platform detection
PLATFORM=$(uname -s)
BUILD_TARGETS=""

case "$PLATFORM" in
    Darwin*)
        echo -e "${BLUE}Detected macOS${NC}"
        BUILD_TARGETS="mac"
        ;;
    Linux*)
        echo -e "${BLUE}Detected Linux${NC}"
        BUILD_TARGETS="linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo -e "${BLUE}Detected Windows${NC}"
        BUILD_TARGETS="win"
        ;;
    *)
        echo -e "${RED}Unknown platform: $PLATFORM${NC}"
        exit 1
        ;;
esac

# Check for --all flag to build for all platforms
if [ "$1" == "--all" ]; then
    echo -e "${YELLOW}Building for all platforms (requires wine for Windows on non-Windows)${NC}"
    BUILD_TARGETS="win mac linux"
fi

# Build for each target platform
for TARGET in $BUILD_TARGETS; do
    echo -e "${YELLOW}Building for ${TARGET}...${NC}"
    
    case "$TARGET" in
        win)
            npm run build:win || {
                echo -e "${RED}Windows build failed${NC}"
                exit 1
            }
            echo -e "${GREEN}✅ Windows build complete${NC}"
            ;;
        mac)
            npm run build:mac || {
                echo -e "${RED}macOS build failed${NC}"
                exit 1
            }
            echo -e "${GREEN}✅ macOS build complete${NC}"
            ;;
        linux)
            npm run build:linux || {
                echo -e "${RED}Linux build failed${NC}"
                exit 1
            }
            echo -e "${GREEN}✅ Linux build complete${NC}"
            ;;
    esac
done

# List built artifacts
echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "${BLUE}Built artifacts:${NC}"

if [ -d "dist" ]; then
    ls -lh dist/*.{exe,msi,dmg,pkg,AppImage,deb,rpm,snap} 2>/dev/null || echo "No artifacts found in dist/"
fi

# Calculate total size
if [ -d "dist" ]; then
    TOTAL_SIZE=$(du -sh dist | cut -f1)
    echo -e "${BLUE}Total size: ${TOTAL_SIZE}${NC}"
fi

echo ""
echo -e "${GREEN}Build successful! 🎉${NC}"
echo ""
echo "Next steps:"
echo "1. Test the built applications"
echo "2. Run './scripts/test-builds.sh' to verify installations"
echo "3. Use './scripts/release.sh' to create a release"