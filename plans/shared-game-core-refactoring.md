# Shared Game Core Refactoring Plan

**Date:** 2025-01-09  
**Purpose:** Consolidate divergent game logic from main.ts and main-desktop.ts into a shared module to achieve feature parity and maintainability

## Problem Summary

The desktop version (main-desktop.ts) is missing 70% of features compared to the web version (main.ts):
- Broken collision detection
- Missing weapon systems (shotgun, laser)
- No visual effects (trails, impacts, explosions)
- Incompatible enemy health system
- Simplified rendering pipeline

## Recommended Approach: Phased Hybrid Migration

Based on frontend architecture review, we'll use a **hybrid approach** that minimizes risk while delivering immediate value.

## Phase 1: Shared Update Logic (Immediate Priority)

### Goal
Extract all game update logic into a shared module while keeping platform-specific rendering.

### Implementation

#### 1.1 Create Core Update Module
**File:** `src/game/core-update.ts`

```typescript
import { GameState } from './state';
import { getSpeedScale, getSpawnIntervalMs } from './systems/difficulty';
import { circlesOverlap } from './systems/collision';
import { ControlsState, PlatformInfo } from './types';

export interface UpdateContext {
  dt: number;
  nowMs: number;
  controls: ControlsState;
  platform: PlatformInfo;
}

export function updateGameLogic(
  state: GameState,
  context: UpdateContext
): void {
  // All update logic from main.ts
  updatePlayer(state, context);
  updateBullets(state, context);
  updateEnemies(state, context);
  checkCollisions(state, context);
  updateUpgrades(state, context);
  updateExplosions(state, context);
  handleSpawning(state, context);
}
```

#### 1.2 Create Unified Types
**File:** `src/game/types.ts`

```typescript
// Unified control state
export interface ControlsState {
  left: boolean;
  right: boolean;
  fire: boolean;
  // Optional desktop-specific
  justPressed?: (key: string) => boolean;
  // Optional touch-specific
  dragPosition?: { x: number; y: number };
}

// Platform information
export interface PlatformInfo {
  type: 'web' | 'desktop';
  canvasWidth: number;
  canvasHeight: number;
  safeAreaInsets?: SafeAreaInsets;
  isMobile?: boolean;
}

// Unified bullet structure (from main.ts)
export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;           // radius
  kind: 'bubble' | 'missile' | 'laser';
  trail?: Array<{x: number, y: number}>;  // missile trails
  len?: number;        // laser length
  thickness?: number;  // laser thickness
  bouncy?: boolean;    // laser ricochet
  bounced?: boolean;   // has ricocheted
}
```

#### 1.3 Update Entry Files

**main.ts changes:**
```typescript
import { updateGameLogic, UpdateContext } from './game/core-update';

function update(dt: number, nowMs: number) {
  const context: UpdateContext = {
    dt,
    nowMs,
    controls,
    platform: {
      type: 'web',
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      isMobile: isMobile(),
      safeAreaInsets: getSafeAreaInsets()
    }
  };
  
  updateGameLogic(state, context);
}

// Keep existing render function
```

**main-desktop.ts changes:**
```typescript
import { updateGameLogic, UpdateContext } from './game/core-update';

function update(dt: number, nowMs: number) {
  const inputState = inputManager.getState();
  const context: UpdateContext = {
    dt,
    nowMs,
    controls: {
      left: inputState.left,
      right: inputState.right,
      fire: inputState.fire,
      justPressed: (key) => inputManager.justPressed(key)
    },
    platform: {
      type: 'desktop',
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    }
  };
  
  updateGameLogic(state, context);
}

// Update render to use correct bullet structure
```

### Benefits
- Desktop immediately gets all missing gameplay features
- Minimal risk - rendering stays platform-specific
- Easy to test and verify

## Phase 2: Shared Asset Management

### Goal
Centralize asset loading and management.

### Implementation

#### 2.1 Create Asset Manager
**File:** `src/game/assets.ts`

```typescript
export class GameAssets {
  playerImg: HTMLImageElement;
  enemyImg: HTMLImageElement;
  
  async load(): Promise<void> {
    this.playerImg = await this.svgToImage(SPONGE_SVG);
    this.enemyImg = await this.svgToImage(PATTY_SVG);
  }
  
  private svgToImage(svg: string): Promise<HTMLImageElement> {
    // Convert SVG to image
  }
}
```

## Phase 3: Gradual Rendering Extraction

### Goal
Extract rendering components that are platform-agnostic.

### Implementation

#### 3.1 Create Render Helpers
**File:** `src/game/render-helpers.ts`

```typescript
export function renderBullet(
  ctx: CanvasRenderingContext2D,
  bullet: Bullet,
  nowMs: number
): void {
  // Unified bullet rendering from main.ts
}

export function renderEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  enemyImg: HTMLImageElement
): void {
  // Unified enemy rendering
}

export function renderHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  platform: PlatformInfo
): void {
  // Unified HUD rendering
}
```

#### 3.2 Platform-Specific Adapters
**File:** `src/game/platform-adapter.ts`

```typescript
export interface PlatformAdapter {
  shouldShowMobileControls(): boolean;
  updatePauseElement(visible: boolean, position?: {bottom: number}): void;
  getSafeAreaInsets(): SafeAreaInsets;
  handlePlatformSpecificRender(ctx: CanvasRenderingContext2D, state: GameState): void;
}

export class WebPlatformAdapter implements PlatformAdapter {
  // Web-specific implementations
}

export class DesktopPlatformAdapter implements PlatformAdapter {
  // Desktop-specific implementations
}
```

## Phase 4: Full GameCore (Optional Future)

Only if Phase 3 succeeds, create full GameCore class:

```typescript
export class GameCore {
  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private assets: GameAssets,
    private platform: PlatformAdapter
  ) {}
  
  initialize(): void { /* ... */ }
  start(): void { /* ... */ }
  update(dt: number, nowMs: number, controls: ControlsState): void { /* ... */ }
  render(nowMs: number): void { /* ... */ }
  pause(): void { /* ... */ }
  resume(): void { /* ... */ }
}
```

## Migration Checklist

### Phase 1 Tasks
- [ ] Create `src/game/types.ts` with unified types
- [ ] Create `src/game/core-update.ts` with all update logic from main.ts
- [ ] Fix bullet structure in game state
- [ ] Update main.ts to use shared update
- [ ] Update main-desktop.ts to use shared update
- [ ] Fix collision detection parameters
- [ ] Test both platforms for feature parity

### Phase 2 Tasks
- [ ] Create `src/game/assets.ts`
- [ ] Move SVG definitions to assets
- [ ] Update both entry files to use asset manager
- [ ] Test asset loading on both platforms

### Phase 3 Tasks  
- [ ] Create `src/game/render-helpers.ts`
- [ ] Create platform adapters
- [ ] Gradually move rendering functions
- [ ] Test rendering consistency

## Risk Mitigation

### Testing Strategy
1. Create test suite for core-update functions
2. Compare game state after each update cycle
3. Visual regression testing for rendering
4. Performance benchmarking

### Rollback Plan
Each phase is independent - can stop at any phase if issues arise while maintaining improvements from completed phases.

### Performance Considerations
- Minimize object creation in update loop
- Cache platform checks
- Profile before/after each phase

## Success Criteria

### Phase 1 Success
- Desktop version has all weapons working
- Collision detection functions correctly
- Enemy behavior matches web version
- Score/level progression identical

### Phase 2 Success
- Assets load correctly on both platforms
- No performance regression
- Simplified asset management

### Phase 3 Success
- Rendering is consistent between platforms
- Platform-specific features preserved
- Code duplication reduced by 60%+

## Timeline Estimate

- **Phase 1:** 2-3 hours (highest priority, immediate value)
- **Phase 2:** 1-2 hours (medium priority)
- **Phase 3:** 3-4 hours (lower priority, highest complexity)
- **Phase 4:** 2-3 hours (optional, only if needed)

## Conclusion

This phased approach minimizes risk while delivering immediate value. Phase 1 alone will fix all critical gameplay issues in the desktop version. Subsequent phases progressively reduce code duplication and improve maintainability without requiring a complete rewrite.