#!/bin/bash

# Test script for built applications
# Verifies that builds are working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Undersea Blaster Build Testing ===${NC}"

# Platform detection
PLATFORM=$(uname -s)
ARTIFACTS_FOUND=false

# Function to test Windows build
test_windows() {
    echo -e "${BLUE}Testing Windows builds...${NC}"
    
    # Check for Windows executables
    if ls dist/*.exe 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Windows executable found${NC}"
        ls -lh dist/*.exe
        ARTIFACTS_FOUND=true
    else
        echo -e "${YELLOW}⚠️  No Windows executable found${NC}"
    fi
    
    # Check for Windows installer
    if ls dist/*.msi 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Windows MSI installer found${NC}"
        ls -lh dist/*.msi
    fi
}

# Function to test macOS build
test_macos() {
    echo -e "${BLUE}Testing macOS builds...${NC}"
    
    # Check for macOS DMG
    if ls dist/*.dmg 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ macOS DMG found${NC}"
        ls -lh dist/*.dmg
        ARTIFACTS_FOUND=true
        
        # If on macOS, verify DMG
        if [ "$PLATFORM" == "Darwin" ]; then
            echo "Verifying DMG integrity..."
            hdiutil verify dist/*.dmg > /dev/null 2>&1 && \
                echo -e "${GREEN}✅ DMG verification passed${NC}" || \
                echo -e "${RED}❌ DMG verification failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No macOS DMG found${NC}"
    fi
    
    # Check for macOS ZIP
    if ls dist/*-mac.zip 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ macOS ZIP archive found${NC}"
        ls -lh dist/*-mac.zip
    fi
}

# Function to test Linux build
test_linux() {
    echo -e "${BLUE}Testing Linux builds...${NC}"
    
    # Check for AppImage
    if ls dist/*.AppImage 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Linux AppImage found${NC}"
        ls -lh dist/*.AppImage
        ARTIFACTS_FOUND=true
        
        # If on Linux, check if AppImage is executable
        if [ "$PLATFORM" == "Linux" ]; then
            for appimage in dist/*.AppImage; do
                if [ -x "$appimage" ]; then
                    echo -e "${GREEN}✅ AppImage is executable${NC}"
                else
                    echo -e "${YELLOW}⚠️  AppImage is not executable, fixing...${NC}"
                    chmod +x "$appimage"
                fi
            done
        fi
    else
        echo -e "${YELLOW}⚠️  No Linux AppImage found${NC}"
    fi
    
    # Check for DEB package
    if ls dist/*.deb 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Debian package found${NC}"
        ls -lh dist/*.deb
    else
        echo -e "${YELLOW}⚠️  No Debian package found${NC}"
    fi
    
    # Check for RPM package
    if ls dist/*.rpm 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ RPM package found${NC}"
        ls -lh dist/*.rpm
    else
        echo -e "${YELLOW}⚠️  No RPM package found${NC}"
    fi
    
    # Check for Snap package
    if ls dist/*.snap 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Snap package found${NC}"
        ls -lh dist/*.snap
    else
        echo -e "${YELLOW}⚠️  No Snap package found${NC}"
    fi
}

# Function to verify build metadata
verify_metadata() {
    echo -e "${BLUE}Verifying build metadata...${NC}"
    
    # Check package.json version
    VERSION=$(node -p "require('./package.json').version")
    echo -e "Package version: ${YELLOW}${VERSION}${NC}"
    
    # Check if version is in filenames
    if ls dist/*${VERSION}* 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Version number found in build artifacts${NC}"
    else
        echo -e "${YELLOW}⚠️  Version number not found in artifact names${NC}"
    fi
}

# Function to check file sizes
check_sizes() {
    echo -e "${BLUE}Checking artifact sizes...${NC}"
    
    MIN_SIZE=50000000  # 50MB minimum expected size
    
    for file in dist/*; do
        if [ -f "$file" ]; then
            SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            if [ "$SIZE" -lt "$MIN_SIZE" ]; then
                echo -e "${YELLOW}⚠️  $(basename $file) seems small: $(numfmt --to=iec-i --suffix=B $SIZE)${NC}"
            fi
        fi
    done
}

# Function to test auto-updater files
test_updater() {
    echo -e "${BLUE}Checking auto-updater files...${NC}"
    
    # Check for latest.yml files (used by electron-updater)
    if ls dist/latest*.yml 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Auto-updater metadata found${NC}"
        ls -lh dist/latest*.yml
    else
        echo -e "${YELLOW}⚠️  No auto-updater metadata found${NC}"
    fi
}

# Main testing flow
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ No dist directory found. Run build script first.${NC}"
    exit 1
fi

# Run platform-specific tests
case "$PLATFORM" in
    Darwin*)
        test_macos
        test_windows
        test_linux
        ;;
    Linux*)
        test_linux
        test_windows
        test_macos
        ;;
    MINGW*|MSYS*|CYGWIN*)
        test_windows
        test_macos
        test_linux
        ;;
    *)
        echo -e "${RED}Unknown platform: $PLATFORM${NC}"
        exit 1
        ;;
esac

echo ""
verify_metadata
echo ""
check_sizes
echo ""
test_updater

# Summary
echo ""
echo -e "${GREEN}=== Test Summary ===${NC}"

if [ "$ARTIFACTS_FOUND" = true ]; then
    echo -e "${GREEN}✅ Build artifacts found and verified${NC}"
    
    # Platform-specific run instructions
    echo ""
    echo "To run the application:"
    
    case "$PLATFORM" in
        Darwin*)
            if ls dist/*.dmg 1> /dev/null 2>&1; then
                echo "  macOS: Open the DMG file and drag to Applications"
            fi
            ;;
        Linux*)
            if ls dist/*.AppImage 1> /dev/null 2>&1; then
                echo "  Linux: chmod +x dist/*.AppImage && ./dist/*.AppImage"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            if ls dist/*.exe 1> /dev/null 2>&1; then
                echo "  Windows: Run the .exe installer"
            fi
            ;;
    esac
else
    echo -e "${RED}❌ No build artifacts found${NC}"
    echo "Run './scripts/build-all.sh' to build the application"
    exit 1
fi

echo ""
echo -e "${GREEN}Testing complete! 🎉${NC}"