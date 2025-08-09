# Comprehensive End-to-End Test Plan
## Undersea Blaster - Web & Desktop Versions

This document outlines a comprehensive end-to-end testing strategy for the underwater shooting game from a complete user experience perspective.

## Game Overview
- **Genre**: Canvas-based underwater shooting game
- **Platforms**: Web browser, Desktop (Electron)
- **Core Gameplay**: Player submarine shoots at enemies (patties) using various weapons
- **Features**: Multiple weapon types, upgrades, level progression, scoring, desktop-specific features

## Test Categories

### 1. COMPLETE GAMEPLAY SCENARIOS

#### 1.1 New Game Start → Play → Game Over Flow
**Test Case: `complete-game-flow.spec.ts`**
- **Scenario**: Full game session from start to death
- **Steps**:
  1. Load game (web/desktop)
  2. Click to start (unpause)
  3. Move player submarine using controls
  4. Shoot enemies until score reaches 1000+ (level 2)
  5. Continue until player takes maximum hits (5) and dies
  6. Verify game over screen appears
  7. Press R to restart
- **Assertions**:
  - Game starts paused with score 0, level 1, full health (5 hearts)
  - Player movement responds correctly
  - Bullets fire and hit enemies correctly
  - Score increases by 50 per enemy hit
  - Level progression occurs at 1000 point intervals
  - Health decreases on enemy collision
  - Game over triggers correctly at 0 health
  - Restart functionality works

#### 1.2 Level Progression (1 → 2 → 3...)
**Test Case: `level-progression.spec.ts`**
- **Scenario**: Player achieves multiple level ups
- **Steps**:
  1. Set player invulnerable via test interface
  2. Rapidly spawn and destroy enemies to reach score milestones
  3. Verify level progression at 1000, 2000, 3000+ points
  4. Check difficulty scaling (spawn rate, enemy speed)
- **Assertions**:
  - Level increases every 1000 points
  - Level up animation displays (2 seconds)
  - Enemy spawn rate increases with level
  - Enemy speed increases with level
  - Player health restoration on level up (if damaged)

#### 1.3 All Weapon Types Usage
**Test Case: `weapon-systems.spec.ts`**
- **Scenario**: Player uses all available weapon types
- **Weapons to Test**:
  - **Bubble** (default): Standard projectile
  - **Missile** (bazooka upgrade): Explosive projectile
  - **Shotgun**: Multiple projectiles per shot
  - **Laser**: Bouncing beam weapon
- **Steps**:
  1. Start game with bubble weapon
  2. Spawn and collect bazooka upgrade
  3. Fire missiles and verify explosion effects
  4. Switch to shotgun upgrade
  5. Fire shotgun spread and verify multiple projectiles
  6. Switch to laser upgrade
  7. Fire laser and verify bouncing behavior
- **Assertions**:
  - Each weapon fires correctly
  - Weapon timers display accurately (20 seconds)
  - Weapon effects render properly
  - Exclusive weapon activation (only one active)
  - Automatic fallback to bubble when timer expires

#### 1.4 High Score Achievement
**Test Case: `high-score-achievement.spec.ts`**
- **Scenario**: Player achieves significant scores
- **Steps**:
  1. Use test interface to boost score rapidly
  2. Verify score display updates correctly
  3. Test score persistence (desktop only)
  4. Verify high score saving functionality
- **Assertions**:
  - Score increments correctly (50 per enemy)
  - Score display remains accurate at high values (19000+)
  - Game stability maintained at high scores
  - High score persistence works (desktop)

### 2. USER INTERACTION TESTING

#### 2.1 Keyboard Controls
**Test Case: `keyboard-controls.spec.ts`**
- **Controls to Test**:
  - **Arrow Keys / A,D**: Player movement (left/right)
  - **Space/Enter**: Fire weapon, unpause, restart
  - **Desktop Shortcuts**:
    - F5: Quick save
    - F9: Quick load
    - F11: Toggle fullscreen
    - F12: Take screenshot
- **Steps**:
  1. Test all movement keys for responsiveness
  2. Test firing with both Space and Enter
  3. Test pause/unpause functionality
  4. Test game over restart controls
  5. Test desktop-specific shortcuts (if applicable)
- **Assertions**:
  - Player moves smoothly with keyboard input
  - Firing works consistently
  - Pause/unpause state changes correctly
  - Restart functionality works from game over
  - Desktop shortcuts trigger correct actions

#### 2.2 Touch Controls (Mobile Web)
**Test Case: `touch-controls.spec.ts`**
- **Touch Areas**:
  - Left side: Move left
  - Right side: Move right
  - Center area: Fire
- **Steps**:
  1. Load game on mobile viewport
  2. Test touch areas for movement
  3. Test fire controls
  4. Verify no page scrolling during touch
- **Assertions**:
  - Touch controls respond correctly
  - Player movement matches touch input
  - Firing works via touch
  - Page scroll prevented during gameplay

#### 2.3 Pause/Resume Functionality
**Test Case: `pause-resume.spec.ts`**
- **Pause Triggers**:
  - Space/Enter key press
  - Window blur/focus
  - Click outside canvas
- **Steps**:
  1. Start game and verify initial pause state
  2. Unpause and verify game animation starts
  3. Pause via keyboard and verify game stops
  4. Test auto-pause on window blur
  5. Test resume on focus return
- **Assertions**:
  - Game starts in paused state
  - Animation stops/starts correctly
  - Auto-pause works on focus loss
  - Pause state persists correctly

### 3. VISUAL REGRESSION TESTING

#### 3.1 Screenshot Comparisons at Key Moments
**Test Case: `visual-regression.spec.ts`**
- **Key Screenshots**:
  - Initial pause screen
  - Active gameplay with all HUD elements
  - Level up animation
  - Game over screen
  - Each weapon type active state
- **Steps**:
  1. Capture baseline screenshots
  2. Run automated visual comparison
  3. Flag significant differences
- **Assertions**:
  - Visual consistency maintained
  - No rendering regressions
  - Proper element positioning

#### 3.2 Explosion Effects Rendering
**Test Case: `explosion-effects.spec.ts`**
- **Effects to Test**:
  - Enemy death impacts
  - Missile explosion circles
  - Player collision explosions
- **Steps**:
  1. Trigger each explosion type
  2. Capture animation frames
  3. Verify effect duration and appearance
- **Assertions**:
  - Explosions render correctly
  - Animation timing is correct
  - Effects don't persist inappropriately

#### 3.3 HUD Elements Rendering
**Test Case: `hud-rendering.spec.ts`**
- **HUD Elements**:
  - Score display (top left)
  - Level indicator (top left)
  - Health hearts (top right)
  - Weapon timer bars
  - Pause hint text
- **Steps**:
  1. Verify initial HUD state
  2. Test HUD updates during gameplay
  3. Test HUD at different screen sizes
- **Assertions**:
  - All HUD elements visible and positioned correctly
  - Updates reflect game state accurately
  - Responsive layout works on different screen sizes

### 4. CROSS-PLATFORM E2E TESTS

#### 4.1 Web Version Browser Compatibility
**Test Case: `browser-compatibility.spec.ts`**
- **Browsers**: Chrome, Firefox, Safari (when available)
- **Steps**:
  1. Run core gameplay tests on each browser
  2. Verify audio playback works
  3. Test canvas rendering consistency
- **Assertions**:
  - Consistent gameplay across browsers
  - Audio works in all browsers
  - Visual consistency maintained

#### 4.2 Desktop Version OS Compatibility
**Test Case: `desktop-os-compatibility.spec.ts`**
- **Operating Systems**: Windows, macOS, Linux
- **Desktop Features**:
  - Menu bar functionality
  - File system access (saves)
  - Native shortcuts
  - Window management
- **Steps**:
  1. Test core gameplay on each OS
  2. Test desktop-specific features
  3. Verify native integration works
- **Assertions**:
  - Game runs on all target OS
  - Desktop features work correctly
  - Native integration functions

#### 4.3 Mobile Web Device Testing
**Test Case: `mobile-device-testing.spec.ts`**
- **Device Categories**: Phone, tablet, various screen sizes
- **Steps**:
  1. Test touch controls on different devices
  2. Verify responsive layout
  3. Test performance on mobile hardware
- **Assertions**:
  - Touch controls work on all devices
  - Layout adapts to screen sizes
  - Performance remains acceptable

### 5. EDGE CASE SCENARIOS

#### 5.1 Rapid Weapon Switching
**Test Case: `rapid-weapon-switching.spec.ts`**
- **Scenario**: Player quickly collects multiple upgrades
- **Steps**:
  1. Spawn multiple upgrade pickups simultaneously
  2. Collect upgrades in rapid succession
  3. Verify only one weapon active
  4. Test weapon timer behavior
- **Assertions**:
  - Only one weapon remains active
  - Timers reset correctly
  - No weapon state corruption

#### 5.2 Maximum Entities on Screen
**Test Case: `entity-stress-test.spec.ts`**
- **Scenario**: Stress test with many entities
- **Steps**:
  1. Spawn maximum enemies via test interface
  2. Fire maximum bullets
  3. Trigger multiple explosions
  4. Monitor performance and stability
- **Assertions**:
  - Game remains stable under load
  - Frame rate remains acceptable
  - Memory usage doesn't spike

#### 5.3 Browser Refresh During Gameplay
**Test Case: `browser-refresh-recovery.spec.ts`**
- **Scenario**: Page refresh during active game
- **Steps**:
  1. Start game and play for some time
  2. Refresh browser page mid-game
  3. Verify game resets properly
  4. Test any persistence features
- **Assertions**:
  - Game resets to initial state
  - No corrupted state persists
  - Fresh game starts correctly

### 6. DESKTOP-SPECIFIC E2E TESTS

#### 6.1 Save/Load Functionality
**Test Case: `desktop-save-load.spec.ts`**
- **Scenario**: Player saves and loads game progress
- **Steps**:
  1. Play game to achieve some progress
  2. Use F5 or menu to save game
  3. Quit and restart application
  4. Use F9 or menu to load game
  5. Verify progress restored
- **Assertions**:
  - Save operation completes successfully
  - Load operation restores exact state
  - Game continues from saved point

#### 6.2 Fullscreen Mode
**Test Case: `desktop-fullscreen.spec.ts`**
- **Scenario**: Toggle fullscreen mode during gameplay
- **Steps**:
  1. Start game in windowed mode
  2. Press F11 or use menu to go fullscreen
  3. Verify game scales properly
  4. Toggle back to windowed
- **Assertions**:
  - Fullscreen transition smooth
  - Game scales correctly
  - Controls remain responsive
  - Exit fullscreen works

#### 6.3 Screenshot Capture
**Test Case: `desktop-screenshot.spec.ts`**
- **Scenario**: Take screenshots during gameplay
- **Steps**:
  1. Play game to interesting moment
  2. Press F12 or use menu to take screenshot
  3. Verify file saved to correct location
- **Assertions**:
  - Screenshot captures correctly
  - File saved with proper naming
  - Image quality acceptable

## Test Implementation Strategy

### Test Infrastructure
- **Framework**: Playwright (already configured)
- **Browsers**: Chrome (primary), Firefox, Safari when available
- **Viewports**: Desktop (1280x720), Tablet (768x1024), Mobile (375x667)
- **Test Data**: Use `window.__game` interface for state manipulation
- **Screenshots**: Visual regression testing with baseline comparisons

### Test Organization
```
tests-e2e/
├── gameplay/
│   ├── complete-game-flow.spec.ts
│   ├── level-progression.spec.ts
│   ├── weapon-systems.spec.ts
│   └── high-score-achievement.spec.ts
├── controls/
│   ├── keyboard-controls.spec.ts
│   ├── touch-controls.spec.ts
│   └── pause-resume.spec.ts
├── visual/
│   ├── visual-regression.spec.ts
│   ├── explosion-effects.spec.ts
│   └── hud-rendering.spec.ts
├── cross-platform/
│   ├── browser-compatibility.spec.ts
│   ├── desktop-os-compatibility.spec.ts
│   └── mobile-device-testing.spec.ts
├── edge-cases/
│   ├── rapid-weapon-switching.spec.ts
│   ├── entity-stress-test.spec.ts
│   └── browser-refresh-recovery.spec.ts
└── desktop/
    ├── desktop-save-load.spec.ts
    ├── desktop-fullscreen.spec.ts
    └── desktop-screenshot.spec.ts
```

### Performance Benchmarks
- **Load Time**: < 2 seconds to interactive
- **Frame Rate**: Maintain 60 FPS during normal gameplay
- **Memory Usage**: < 100MB peak usage
- **Bundle Size**: < 5MB total assets

### Automation Strategy
- **CI Integration**: Run core tests on every commit
- **Nightly Tests**: Full cross-platform and edge case testing
- **Visual Regression**: Automated baseline comparison
- **Performance Monitoring**: Track metrics over time

## Test Execution Priority

### Priority 1 (Critical Path)
1. Complete gameplay flow
2. Basic controls (keyboard/touch)
3. Core weapon functionality
4. Level progression

### Priority 2 (High Impact)
1. Visual regression tests
2. Cross-browser compatibility
3. Desktop save/load
4. Performance under load

### Priority 3 (Quality Assurance)
1. Edge case scenarios
2. Mobile device testing
3. Advanced desktop features
4. Stress testing

This comprehensive test plan ensures all user-facing functionality is thoroughly validated across platforms while maintaining focus on the core gaming experience.