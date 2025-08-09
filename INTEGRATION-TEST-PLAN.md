# INTEGRATION TEST PLAN
## Shared Game Core Modules

### Overview

This document defines comprehensive integration testing scenarios for the refactored underwater shooting game, focusing on how shared core modules work together across web and desktop platforms.

## Key Integration Points Analysis

### Core Module Dependencies
- **core-update.ts** → game state, systems (collision, difficulty, upgrades, audio), types
- **render-helpers.ts** → game state, canvas context, types  
- **main.ts** (web) → shared modules, audio, assets, input systems
- **main-desktop.ts** (desktop) → shared modules, desktop integration, input manager
- **Audio system** → game events, state changes, platform-specific playback
- **Assets** → rendering pipeline, loading synchronization

### Data Flow Architecture
```
Input Events → UpdateContext → core-update.ts → GameState mutations
GameState → render-helpers.ts → Canvas Rendering
Game Events → Audio System → Sound Playback
Platform Layer → Shared Modules → Consistent Behavior
```

## 1. Module Integration Points Testing

### 1.1 Core-Update + Game State Integration
**Test Scenarios:**

**Scenario: Full Game Loop Cycle**
```typescript
test('core-update integrates properly with game state mutations', async () => {
  const state = createInitialState();
  const context = createUpdateContext();
  const audio = createMockAudio();
  
  // Execute full update cycle
  updateGameLogic(state, context, audio);
  
  // Verify all subsystems were updated correctly
  expect(state.player.x).toBeUpdatedBasedOnControls();
  expect(state.bullets.length).toReflectWeaponFiring();
  expect(state.patties.length).toReflectSpawning();
});
```

**Scenario: State Consistency Across Updates**
```typescript
test('game state remains consistent across multiple update cycles', () => {
  // Run 100 update cycles
  // Verify no NaN values, array bounds, object integrity
  // Check that timers decrease properly
  // Ensure no memory leaks in dynamic arrays
});
```

### 1.2 Render-Helpers + Canvas Context Integration
**Test Scenarios:**

**Scenario: Rendering Pipeline Consistency**
```typescript
test('render helpers produce consistent visual output', () => {
  const mockCanvas = createMockCanvas();
  const ctx = mockCanvas.getContext('2d');
  const state = createGameStateWithAllEntities();
  
  // Test each render function
  renderBullets(ctx, state.bullets);
  renderExplosions(ctx, state.explosions);
  renderUpgrades(ctx, state.upgrades);
  
  // Verify canvas draw calls match expected patterns
  expect(ctx.drawCalls).toMatchSnapshot();
});
```

### 1.3 Assets + Rendering Pipeline Integration
**Test Scenarios:**

**Scenario: Asset Loading and Rendering Synchronization**
```typescript
test('assets integrate properly with rendering system', async () => {
  const assets = createGameAssets();
  await assets.load();
  
  const canvas = createTestCanvas();
  const ctx = canvas.getContext('2d');
  
  // Test asset-dependent rendering
  renderPlayer(ctx, playerState, assets.playerImg);
  renderPatty(ctx, pattyState, assets.pattyImg);
  
  expect(assets.playerImg.complete).toBe(true);
  expect(ctx.drawImage).toHaveBeenCalledWith(assets.playerImg);
});
```

## 2. Data Flow Testing

### 2.1 Input → State → Render Pipeline
**Test Scenarios:**

**Scenario: Complete Input Processing Chain**
```typescript
test('input flows correctly through entire system', () => {
  const inputManager = new InputManager(canvas);
  const state = createInitialState();
  
  // Simulate user input
  inputManager.simulateKeyPress('ArrowLeft');
  inputManager.simulateKeyPress('Space');
  
  // Process through update system
  const context = inputManager.getUpdateContext();
  updateGameLogic(state, context, mockAudio);
  
  // Verify state changes
  expect(state.player.x).toBeLessThan(initialX);
  expect(state.bullets.length).toBeGreaterThan(0);
  
  // Verify rendering reflects state
  const renderCalls = captureRenderCalls(state);
  expect(renderCalls.playerPosition).toEqual(state.player.x);
});
```

### 2.2 State Updates → Audio Triggers
**Test Scenarios:**

**Scenario: Audio Events from Game State Changes**
```typescript
test('game state changes trigger appropriate audio events', () => {
  const audioSpy = createAudioSpy();
  const state = createGameStateWithEntities();
  
  // Trigger collision
  const bullet = { x: 100, y: 100, r: 5, vy: -100, vx: 0, kind: 'bubble' };
  const enemy = { x: 100, y: 100, size: 48, vy: 100, vx: 0 };
  state.bullets.push(bullet);
  state.patties.push(enemy);
  
  updateCollisions(state, context, audioSpy);
  
  expect(audioSpy.playHit).toHaveBeenCalled();
  expect(state.score).toBeGreaterThan(0);
  expect(state.impacts.length).toBeGreaterThan(0);
});
```

### 2.3 Platform-Specific Data Flow
**Test Scenarios:**

**Scenario: Web Platform Integration**
```typescript
test('web platform integrates correctly with shared modules', () => {
  const webPlatform: PlatformInfo = {
    width: 800,
    height: 600,
    isMobile: false,
    isDesktop: true
  };
  
  const context: UpdateContext = {
    dt: 0.016,
    controls: { left: true, right: false, fire: true },
    platform: webPlatform,
    timestamp: performance.now()
  };
  
  updateGameLogic(state, context, webAudio);
  // Verify web-specific behaviors
});
```

**Scenario: Desktop Platform Integration**
```typescript
test('desktop platform integrates correctly with shared modules', () => {
  const desktopPlatform: PlatformInfo = {
    width: 1024,
    height: 768,
    isMobile: false,
    isDesktop: true,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
  };
  
  updateGameLogic(state, desktopContext, desktopAudio);
  // Verify desktop-specific features work
});
```

## 3. Cross-Module Scenarios

### 3.1 Complete Weapon Upgrade Flow
**Test Scenario: Bazooka Upgrade Lifecycle**
```typescript
test('complete bazooka upgrade pickup and usage flow', async () => {
  const state = createInitialState();
  const context = createUpdateContext();
  const audioSpy = createAudioSpy();
  
  // 1. Trigger upgrade spawn
  state.score = 1000; // Above spawn threshold
  state.nextUpgradeAt = 500;
  updateUpgrades(state, context);
  
  expect(state.upgrades.length).toBe(3); // bazooka, laser, shotgun
  
  // 2. Simulate upgrade pickup
  const bazookaUpgrade = state.upgrades.find(u => u.kind === 'bazooka');
  state.player.x = bazookaUpgrade.x;
  state.player.y = bazookaUpgrade.y;
  processUpgradePickups(state);
  
  expect(state.bazookaActive).toBe(true);
  expect(state.upgrades.length).toBe(0); // All upgrades removed
  
  // 3. Test weapon firing with upgrade
  context.controls.fire = true;
  updateWeapons(state, context, audioSpy);
  
  expect(state.bullets.length).toBeGreaterThan(0);
  expect(state.bullets[0].kind).toBe('missile');
  expect(audioSpy.playMissile).toHaveBeenCalled();
  
  // 4. Test collision with explosion damage
  const enemies = createMultipleEnemies();
  state.patties = enemies;
  updateCollisions(state, context, audioSpy);
  
  expect(state.explosions.length).toBeGreaterThan(0);
  expect(audioSpy.playExplosion).toHaveBeenCalled();
  expect(state.score).toBeGreaterThan(1000); // Score increased
});
```

### 3.2 Player Damage and Death Flow
**Test Scenario: Complete Player Damage Sequence**
```typescript
test('player damage and death sequence integrates correctly', () => {
  const state = createInitialState();
  const context = createUpdateContext();
  const audioSpy = createAudioSpy();
  
  // Setup collision scenario
  const enemy = { x: state.player.x, y: state.player.y, size: 48, vy: 100, vx: 0 };
  state.patties.push(enemy);
  state.player.hits = state.player.maxHits - 1; // One hit from death
  
  // Process collision
  updateCollisions(state, context, audioSpy);
  
  // Verify death sequence
  expect(state.gameOver).toBe(true);
  expect(state.explosions.length).toBeGreaterThan(0);
  expect(state.deathExplosionPlayed).toBe(true);
  expect(audioSpy.playExplosion).toHaveBeenCalled();
  expect(context.controls.fire).toBe(false); // Controls disabled
});
```

### 3.3 Level Progression Flow
**Test Scenario: Level Up Integration**
```typescript
test('level progression affects all relevant systems', () => {
  const state = createInitialState();
  const context = createUpdateContext();
  const audioSpy = createAudioSpy();
  
  const initialLevel = state.level;
  const scoreForLevelUp = 1000;
  state.score = scoreForLevelUp;
  
  updateCollisions(state, context, audioSpy); // Triggers level check
  
  expect(state.level).toBe(initialLevel + 1);
  expect(state.levelUpTimer).toBeGreaterThan(0);
  expect(audioSpy.playLevelUp).toHaveBeenCalled();
  
  // Verify difficulty scaling affects spawning
  const newSpawnInterval = getSpawnIntervalMs(state.level);
  const newSpeedScale = getSpeedScale(state.level);
  
  expect(newSpawnInterval).toBeLessThan(getSpawnIntervalMs(initialLevel));
  expect(newSpeedScale).toBeGreaterThan(getSpeedScale(initialLevel));
});
```

### 3.4 Laser Ricochet Chain Reaction
**Test Scenario: Complex Laser Behavior**
```typescript
test('laser ricochet creates proper chain reaction', () => {
  const state = createInitialState();
  state.laserActive = true;
  const context = createUpdateContext({ fire: true });
  const audioSpy = createAudioSpy();
  
  // Fire laser
  updateWeapons(state, context, audioSpy);
  const laser = state.bullets.find(b => b.kind === 'laser');
  expect(laser.bouncy).toBe(true); // 70% chance, assume true for test
  
  // Create enemy collision
  const enemy = { x: laser.x, y: laser.y, size: 48, vy: 100, vx: 0 };
  state.patties.push(enemy);
  
  updateCollisions(state, context, audioSpy);
  
  // Verify ricochet bullet created
  const ricochetBullet = state.bullets.find(b => b.bounced === true);
  expect(ricochetBullet).toBeTruthy();
  expect(ricochetBullet.vx).not.toBe(0); // Has horizontal velocity
  
  // Verify ricochet can damage player
  state.player.x = ricochetBullet.x;
  state.player.y = ricochetBullet.y;
  updateCollisions(state, context, audioSpy);
  
  expect(state.player.hits).toBeGreaterThan(0);
  expect(state.player.invuln).toBeGreaterThan(0);
});
```

## 4. Platform Integration Testing

### 4.1 Web vs Desktop Feature Parity
**Test Scenario: Core Gameplay Consistency**
```typescript
test('web and desktop versions produce identical core gameplay', () => {
  const webState = runWebGameSimulation(1000); // 1000 frames
  const desktopState = runDesktopGameSimulation(1000); // Same input sequence
  
  // Core game state should be identical
  expect(webState.score).toBe(desktopState.score);
  expect(webState.level).toBe(desktopState.level);
  expect(webState.player.hits).toBe(desktopState.player.hits);
  expect(webState.bullets.length).toBe(desktopState.bullets.length);
});
```

### 4.2 Desktop-Specific Integration
**Test Scenario: Electron Features Integration**
```typescript
test('desktop integration works with shared game core', async () => {
  if (!isElectron()) return; // Skip if not in Electron
  
  const state = createInitialState();
  desktopIntegration.setGameState(state);
  
  // Test desktop menu actions
  desktopIntegration.triggerPause();
  expect(state.paused).toBe(true);
  
  desktopIntegration.triggerNewGame();
  expect(state.gameOver).toBe(false);
  expect(state.score).toBe(0);
  
  // Test screenshot functionality
  const screenshot = await desktopIntegration.takeScreenshot();
  expect(screenshot).toBeTruthy();
});
```

### 4.3 Input System Platform Integration
**Test Scenario: Touch vs Keyboard Input**
```typescript
test('different input methods produce equivalent results', () => {
  const keyboardState = createInitialState();
  const touchState = createInitialState();
  
  // Simulate equivalent inputs
  const keyboardContext = createKeyboardContext({ left: true, fire: true });
  const touchContext = createTouchContext({ left: true, fire: true });
  
  updateGameLogic(keyboardState, keyboardContext, mockAudio);
  updateGameLogic(touchState, touchContext, mockAudio);
  
  expect(keyboardState.player.x).toBe(touchState.player.x);
  expect(keyboardState.bullets.length).toBe(touchState.bullets.length);
});
```

## 5. State Consistency Tests

### 5.1 Memory Management
**Test Scenario: Array Bounds and Memory Leaks**
```typescript
test('dynamic arrays maintain proper bounds and prevent memory leaks', () => {
  const state = createInitialState();
  const context = createUpdateContext();
  
  // Spam bullets beyond limit
  for (let i = 0; i < 200; i++) {
    context.controls.fire = true;
    updateWeapons(state, context, mockAudio);
  }
  
  expect(state.bullets.length).toBeLessThanOrEqual(160); // Enforced limit
  
  // Spam enemies
  for (let i = 0; i < 100; i++) {
    state.patties.push(createRandomEnemy());
  }
  updateEnemies(state, context, performance.now());
  
  expect(state.patties.length).toBeLessThanOrEqual(80); // Enforced limit
});
```

### 5.2 Race Condition Prevention
**Test Scenario: Concurrent State Access**
```typescript
test('no race conditions in state mutations', () => {
  const state = createInitialState();
  
  // Simulate rapid state updates
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(simulateAsyncUpdate(state));
  }
  
  Promise.all(promises).then(() => {
    // Verify state integrity
    expect(state.player.x).toBeFinite();
    expect(state.bullets.every(b => isFinite(b.x) && isFinite(b.y))).toBe(true);
    expect(state.patties.every(p => isFinite(p.x) && isFinite(p.y))).toBe(true);
  });
});
```

### 5.3 Timer Synchronization
**Test Scenario: Timer Consistency**
```typescript
test('all timers update consistently', () => {
  const state = createInitialState();
  state.bazookaActive = true;
  state.bazookaTimer = 5.0;
  state.levelUpTimer = 2.0;
  
  const dt = 0.016;
  const context = createUpdateContext({ dt });
  
  updateTimers(state, context);
  
  expect(state.bazookaTimer).toBeCloseTo(5.0 - dt);
  expect(state.levelUpTimer).toBeCloseTo(2.0 - dt);
});
```

## 6. Performance Integration Tests

### 6.1 Update Loop Performance
**Test Scenario: Consistent Frame Timing**
```typescript
test('update loop maintains consistent performance', () => {
  const state = createGameStateWithManyEntities();
  const times = [];
  
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    updateGameLogic(state, context, mockAudio);
    const end = performance.now();
    times.push(end - start);
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const maxTime = Math.max(...times);
  
  expect(avgTime).toBeLessThan(5); // < 5ms average
  expect(maxTime).toBeLessThan(16); // < 16ms worst case
});
```

### 6.2 Rendering Performance
**Test Scenario: Canvas Operation Efficiency**
```typescript
test('rendering operations scale appropriately', () => {
  const mockCanvas = createPerformanceCanvas();
  const ctx = mockCanvas.getContext('2d');
  
  const heavyState = createGameStateWithManyEntities();
  
  const start = performance.now();
  renderGameState(ctx, heavyState);
  const end = performance.now();
  
  expect(end - start).toBeLessThan(8); // < 8ms for complex scene
  expect(ctx.operationCount).toBeLessThan(1000); // Reasonable operation count
});
```

## 7. Error Recovery Tests

### 7.1 Invalid State Recovery
**Test Scenario: Graceful Degradation**
```typescript
test('system recovers gracefully from invalid state', () => {
  const state = createInitialState();
  
  // Inject invalid data
  state.bullets.push({ x: NaN, y: NaN, r: -5, vy: Infinity } as any);
  state.patties.push({ x: undefined, y: null, size: 'invalid' } as any);
  
  expect(() => {
    updateGameLogic(state, context, mockAudio);
  }).not.toThrow();
  
  // Verify cleanup
  expect(state.bullets.every(b => isFinite(b.x) && isFinite(b.y))).toBe(true);
  expect(state.patties.every(p => isFinite(p.x) && isFinite(p.y))).toBe(true);
});
```

## 8. Test Implementation Strategy

### 8.1 Test Setup Utilities
```typescript
// Mock factories for consistent test data
function createMockCanvas(): HTMLCanvasElement;
function createUpdateContext(overrides?: Partial<UpdateContext>): UpdateContext;
function createAudioSpy(): jest.Mocked<GameAudio>;
function createGameStateWithAllEntities(): GameState;

// Simulation utilities
function runGameSimulation(frames: number, inputSequence: InputEvent[]): GameState;
function captureRenderCalls(state: GameState): RenderCallLog;
```

### 8.2 Timing and Synchronization
- Use `performance.now()` for precise timing measurements
- Mock `requestAnimationFrame` for deterministic testing
- Test at various delta times (slow devices, fast refresh rates)
- Verify behavior during pause/resume cycles

### 8.3 Platform Testing Matrix
```
Web + Chrome + Keyboard
Web + Firefox + Touch
Web + Safari + Mobile
Desktop + Windows + Mouse
Desktop + macOS + Trackpad
Desktop + Linux + Keyboard
```

### 8.4 Continuous Integration
- Run integration tests on every commit
- Performance regression detection
- Cross-platform compatibility verification
- Memory leak detection via heap snapshots
- Visual regression testing for rendering consistency

## Conclusion

This integration test plan ensures that all shared game core modules work together correctly across platforms while maintaining performance, consistency, and reliability. The focus is on testing the boundaries between modules and verifying that complex multi-system scenarios work as expected.

Key testing priorities:
1. **Data integrity** - State remains valid throughout complex interactions
2. **Cross-platform consistency** - Same gameplay experience on web and desktop
3. **Performance stability** - No degradation under load
4. **Error resilience** - Graceful handling of edge cases
5. **Integration correctness** - Modules communicate properly

The test scenarios provided should be implemented using the existing testing framework (Vitest + jsdom) with additional integration-specific utilities for mocking complex interactions and measuring performance characteristics.