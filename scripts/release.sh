#!/bin/bash

# Release script for Undersea Blaster Desktop
# Creates and publishes a new release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Undersea Blaster"
CURRENT_BRANCH=$(git branch --show-current)
MAIN_BRANCH="main"

echo -e "${GREEN}=== ${APP_NAME} Release Script ===${NC}"

# Check if we're on main branch
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
    echo -e "${YELLOW}Warning: You're not on the ${MAIN_BRANCH} branch (current: ${CURRENT_BRANCH})${NC}"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: You have uncommitted changes${NC}"
    git status --short
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}${CURRENT_VERSION}${NC}"

# Prompt for new version
echo "Enter new version (or press enter to auto-increment patch):"
read NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    # Auto-increment patch version
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    PATCH=$((PATCH + 1))
    NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
fi

echo -e "New version will be: ${GREEN}${NEW_VERSION}${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Update version in package.json
echo "Updating package.json..."
npm version $NEW_VERSION --no-git-tag-version

# Update version in electron-builder.json
echo "Updating electron-builder.json..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'));
config.buildVersion = '${NEW_VERSION}';
fs.writeFileSync('electron-builder.json', JSON.stringify(config, null, 2));
"

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test || {
    echo -e "${RED}Tests failed! Aborting release.${NC}"
    git checkout -- package.json package-lock.json electron-builder.json
    exit 1
}

# Build the application
echo -e "${YELLOW}Building application...${NC}"
npm run build || {
    echo -e "${RED}Build failed! Aborting release.${NC}"
    git checkout -- package.json package-lock.json electron-builder.json
    exit 1
}

# Create changelog entry
echo "Creating changelog entry..."
CHANGELOG_FILE="CHANGELOG.md"
RELEASE_DATE=$(date +"%Y-%m-%d")
CHANGELOG_ENTRY="## [${NEW_VERSION}] - ${RELEASE_DATE}"

if [ -f "$CHANGELOG_FILE" ]; then
    # Add new entry to existing changelog
    echo -e "\n${CHANGELOG_ENTRY}\n\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n" | cat - $CHANGELOG_FILE > temp && mv temp $CHANGELOG_FILE
else
    # Create new changelog
    echo "# Changelog" > $CHANGELOG_FILE
    echo "" >> $CHANGELOG_FILE
    echo "$CHANGELOG_ENTRY" >> $CHANGELOG_FILE
    echo "" >> $CHANGELOG_FILE
    echo "### Added" >> $CHANGELOG_FILE
    echo "- Initial release" >> $CHANGELOG_FILE
fi

echo -e "${YELLOW}Please edit CHANGELOG.md to add release notes${NC}"
read -p "Press enter when done editing..."

# Commit version changes
echo "Committing version changes..."
git add package.json package-lock.json electron-builder.json CHANGELOG.md
git commit -m "chore: release v${NEW_VERSION}"

# Create git tag
echo "Creating git tag..."
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

# Push changes
echo -e "${YELLOW}Ready to push changes and tag${NC}"
read -p "Push to remote? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin $CURRENT_BRANCH
    git push origin "v${NEW_VERSION}"
    
    echo -e "${GREEN}✅ Release v${NEW_VERSION} created successfully!${NC}"
    echo ""
    echo "GitHub Actions will now:"
    echo "1. Build the application for all platforms"
    echo "2. Create a draft release with artifacts"
    echo "3. Publish to the auto-update server"
    echo ""
    echo "Next steps:"
    echo "1. Check the GitHub Actions workflow"
    echo "2. Review and publish the draft release on GitHub"
    echo "3. Announce the release to users"
else
    echo -e "${YELLOW}Changes committed locally but not pushed${NC}"
    echo "To push later, run:"
    echo "  git push origin $CURRENT_BRANCH"
    echo "  git push origin v${NEW_VERSION}"
fi