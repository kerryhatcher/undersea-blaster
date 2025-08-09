#!/bin/bash

# Comprehensive E2E Test Runner for Undersea Blaster
# Supports different test categories and configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
TEST_CATEGORY="all"
BROWSER="chromium"
HEADLESS=true
WORKERS=1
TIMEOUT=60000

# Helper functions
print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -c, --category CATEGORY    Test category: all, gameplay, controls, visual, desktop, edge-cases, cross-platform"
    echo "  -b, --browser BROWSER      Browser: chromium, firefox, webkit"
    echo "  -h, --headed               Run in headed mode (visible browser)"
    echo "  -w, --workers NUM          Number of parallel workers (default: 1)"
    echo "  -t, --timeout MS           Test timeout in milliseconds (default: 60000)"
    echo "  -u, --ui                   Run with Playwright UI"
    echo "  -d, --debug                Run in debug mode"
    echo "  --smoke                    Run smoke tests only"
    echo "  --visual                   Update visual regression baselines"
    echo "  --help                     Show this help message"
    echo ""
    echo "CATEGORIES:"
    echo "  gameplay        Core game functionality tests"
    echo "  controls        Keyboard, mouse, and touch controls"
    echo "  visual          Visual regression and rendering tests"
    echo "  desktop         Desktop-specific features (Electron)"
    echo "  edge-cases      Stress tests and edge case scenarios"
    echo "  cross-platform  Browser compatibility tests"
    echo "  all             Run all test categories"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 --category gameplay --headed"
    echo "  $0 --category visual --browser firefox"
    echo "  $0 --smoke --workers 4"
    echo "  $0 --visual"
}

print_header() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "  Undersea Blaster E2E Test Runner"
    echo "======================================================"
    echo -e "${NC}"
}

print_config() {
    echo -e "${YELLOW}Test Configuration:${NC}"
    echo "  Category: $TEST_CATEGORY"
    echo "  Browser: $BROWSER"
    echo "  Headed: $([[ $HEADLESS == true ]] && echo "No" || echo "Yes")"
    echo "  Workers: $WORKERS"
    echo "  Timeout: ${TIMEOUT}ms"
    echo ""
}

check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    
    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    # Check if Playwright browsers are installed
    if [[ ! -d "node_modules/@playwright/test" ]]; then
        echo -e "${YELLOW}Installing Playwright...${NC}"
        npm install @playwright/test
    fi
    
    echo -e "${GREEN}Prerequisites OK${NC}"
    echo ""
}

build_project() {
    echo -e "${BLUE}Building project...${NC}"
    npm run build
    echo -e "${GREEN}Build complete${NC}"
    echo ""
}

get_test_pattern() {
    case $TEST_CATEGORY in
        gameplay)
            echo "tests-e2e/gameplay/**/*.spec.ts"
            ;;
        controls)
            echo "tests-e2e/controls/**/*.spec.ts"
            ;;
        visual)
            echo "tests-e2e/visual/**/*.spec.ts"
            ;;
        desktop)
            echo "tests-e2e/desktop/**/*.spec.ts"
            ;;
        edge-cases)
            echo "tests-e2e/edge-cases/**/*.spec.ts"
            ;;
        cross-platform)
            echo "tests-e2e/cross-platform/**/*.spec.ts"
            ;;
        smoke)
            echo "tests-e2e/gameplay/complete-game-flow.spec.ts tests-e2e/controls/keyboard-controls.spec.ts"
            ;;
        all)
            echo "tests-e2e/**/*.spec.ts"
            ;;
        *)
            echo "tests-e2e/**/*.spec.ts"
            ;;
    esac
}

run_tests() {
    local test_pattern=$(get_test_pattern)
    local playwright_cmd="npx playwright test"
    
    # Build command arguments
    local args=()
    
    if [[ $HEADLESS == false ]]; then
        args+=("--headed")
    fi
    
    args+=("--workers=$WORKERS")
    args+=("--timeout=$TIMEOUT")
    args+=("--project=$BROWSER-desktop")
    
    # Add test pattern
    args+=($test_pattern)
    
    echo -e "${BLUE}Running E2E tests...${NC}"
    echo "Command: $playwright_cmd ${args[@]}"
    echo ""
    
    $playwright_cmd "${args[@]}"
}

run_ui_mode() {
    echo -e "${BLUE}Starting Playwright UI...${NC}"
    npx playwright test --ui
}

run_debug_mode() {
    local test_pattern=$(get_test_pattern)
    echo -e "${BLUE}Starting debug mode...${NC}"
    npx playwright test --debug $test_pattern
}

update_visual_baselines() {
    echo -e "${BLUE}Updating visual regression baselines...${NC}"
    npx playwright test tests-e2e/visual/ --update-snapshots
    echo -e "${GREEN}Visual baselines updated${NC}"
}

run_smoke_tests() {
    echo -e "${BLUE}Running smoke tests...${NC}"
    TEST_CATEGORY="smoke"
    run_tests
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--category)
            TEST_CATEGORY="$2"
            shift 2
            ;;
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -h|--headed)
            HEADLESS=false
            shift
            ;;
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -u|--ui)
            UI_MODE=true
            shift
            ;;
        -d|--debug)
            DEBUG_MODE=true
            shift
            ;;
        --smoke)
            TEST_CATEGORY="smoke"
            shift
            ;;
        --visual)
            UPDATE_VISUAL=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_header
    print_config
    
    check_prerequisites
    build_project
    
    # Handle special modes
    if [[ $UPDATE_VISUAL == true ]]; then
        update_visual_baselines
        exit 0
    fi
    
    if [[ $UI_MODE == true ]]; then
        run_ui_mode
        exit 0
    fi
    
    if [[ $DEBUG_MODE == true ]]; then
        run_debug_mode
        exit 0
    fi
    
    # Run tests
    echo -e "${BLUE}Starting test execution...${NC}"
    
    if run_tests; then
        echo ""
        echo -e "${GREEN}✅ All tests passed!${NC}"
        echo ""
        echo "Test results available in:"
        echo "  - test-results/ (detailed results)"
        echo "  - playwright-report/ (HTML report)"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ Some tests failed${NC}"
        echo ""
        echo "Check the test output above for details."
        echo "Run with --headed or --debug for more information."
        exit 1
    fi
}

# Execute main function
main