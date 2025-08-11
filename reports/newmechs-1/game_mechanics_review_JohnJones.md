# Game Mechanics Review Report
**Author:** John Jones  
**Date:** 2025-08-11  
**Subject:** Undersea Blaster - Proposed Game Mechanics Changes Analysis

## Executive Summary

This report analyzes the current Undersea Blaster architecture and evaluates the feasibility of implementing significant gameplay mechanics changes including ammo-based weapons, exponential level progression, new enemy types (lobsters, barrels), and enhanced difficulty scaling.

## Current Architecture Assessment

### State Management Structure
The game currently uses a centralized `GameState` type in `src/game/state.ts` with clean separation of concerns:

- **Player State**: Position, health (hits/maxHits), invulnerability timer, movement speed
- **Projectile System**: Array-based `bullets` with type discrimination (`bubble`, `missile`, `laser`)
- **Enemy System**: Single `patties` array for enemies with basic physics properties
- **Upgrade System**: Time-based weapon activations with shared cooldown mechanism
- **Level Progression**: Simple linear advancement (1000 points per level)

### Current System Modules

#### Difficulty System (`src/game/systems/difficulty.ts`)
- **Spawn Rate**: Linear decrease (35ms per level, floor of 300ms)
- **Speed Scale**: Linear increase (12% per level, capped at 3x)
- **Level Up**: Fixed 1000-point thresholds
- **Health**: Single HP restoration per level

#### Collision System (`src/game/systems/collision.ts`)
- Simple circle-circle overlap detection
- Basic player radius approximation
- No support for complex shapes or multi-hit scenarios

#### Upgrade System (`src/game/systems/upgrades.ts`)
- Fixed spawn intervals (200 points)
- Time-based weapon durations (20 seconds)
- Mutual exclusion between weapon types
- No ammo tracking or weighted selection

## Proposed Mechanics Analysis

### 1. Ammo-Based Weapon System

**Current Implementation**: Time-based weapons with fixed 20-second durations
```typescript
// Current approach
bazookaActive: boolean;
bazookaTimer: number;
```

**Required Changes**:
- Replace timer-based tracking with ammo counters
- Add weapon-specific ammo types to GameState
- Modify firing logic to consume ammo instead of checking timers

**State Modifications Needed**:
```typescript
// New fields required in GameState
bazookaAmmo: number;
shotgunAmmo: number; 
laserAmmo: number;
// Remove timer fields: bazookaTimer, shotgunTimer, laserTimer
```

**Impact Assessment**: **Medium complexity**. The current upgrade activation logic in `processUpgradePickups()` would need refactoring to set ammo counts instead of timers.

### 2. Exponential Level Progression

**Current Implementation**: Fixed 1000-point level thresholds
```typescript
export function shouldLevelUp(score: number, scoreAtLevelStart: number): boolean {
  return score - scoreAtLevelStart >= 1000;
}
```

**Required Changes**: 
- Implement exponential scoring formula (level 50 = 2x level 1)
- Calculate dynamic point requirements per level
- Update `shouldLevelUp()` and `applyLevelUp()` functions

**Mathematical Model Needed**:
```
points_required(level) = base_points * growth_factor^(level-1)
where growth_factor ≈ 1.014 (to achieve 2x at level 50)
```

**Impact Assessment**: **Low complexity**. Single function modification with predictable math.

### 3. Enhanced Difficulty Progression (5% Faster)

**Current Implementation**: 12% speed increase per level
```typescript
export function getSpeedScale(level: number): number {
  return Math.min(3, 1 + (level - 1) * 0.12);
}
```

**Required Changes**:
- Modify coefficient from 0.12 to 0.126 (5% increase)
- Apply same scaling to spawn rate changes
- Maintain existing cap of 3x maximum

**Impact Assessment**: **Trivial complexity**. Simple coefficient adjustments.

### 4. New Enemy Types (Lobsters & Barrels)

**Current Implementation**: Single `Patty` type with basic physics
```typescript
export type Patty = { x: number; y: number; vx: number; vy: number; size: number };
```

**Required Changes**:
- Extend enemy type system with discriminated union
- Add lobster AI targeting behavior
- Implement barrel gravity attraction mechanics
- Create specialized collision handling per enemy type

**New Type Structure**:
```typescript
type Enemy = 
  | { type: 'patty'; x: number; y: number; vx: number; vy: number; size: number }
  | { type: 'lobster'; x: number; y: number; vx: number; vy: number; size: number; targetX: number; targetY: number; }
  | { type: 'barrel'; x: number; y: number; vx: number; vy: number; size: number; attractionStrength: number; }
```

**Impact Assessment**: **High complexity**. Requires significant refactoring of enemy system, collision detection, rendering, and AI logic.

### 5. Weapon Spawn Weighting System

**Current Implementation**: Fixed 3-weapon spawn every 200 points
```typescript
// All weapons spawn simultaneously
state.upgrades.push({ x: xCenter - spread, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'bazooka' });
state.upgrades.push({ x: xCenter, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'laser' });
state.upgrades.push({ x: xCenter + spread, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'shotgun' });
```

**Required Changes**:
- Implement rolling 100-spawn window tracking
- Add weighted probability distribution
- Create single weapon spawn logic with rarity system

**New Data Structures**:
```typescript
// Add to GameState
weaponSpawnHistory: Array<{ kind: WeaponType; timestamp: number }>;
weaponSpawnWeights: Record<WeaponType, number>;
```

**Impact Assessment**: **Medium complexity**. Requires new tracking systems and probabilistic spawn logic.

### 6. Special Level Mechanics

**Current Implementation**: No special level behaviors

**Required Changes**:
- Add level-type detection (barrel levels every 10)
- Implement alternate spawn patterns
- Create special level overlay indicators

**Impact Assessment**: **Medium complexity**. Requires conditional logic in spawn systems and UI updates.

### 7. Burger-to-Burger Collision System

**Current Implementation**: No inter-enemy collisions

**Required Changes**:
- Add enemy-to-enemy collision detection loop
- Implement bounce physics with randomness
- Prevent performance degradation with spatial partitioning

**Performance Consideration**: O(n²) collision checking could impact performance with many enemies.

**Impact Assessment**: **Medium-High complexity**. New collision system with performance implications.

## Data Structure Changes Required

### GameState Modifications
```typescript
// Remove time-based weapon tracking
- bazookaTimer: number;
- shotgunTimer: number; 
- laserTimer: number;

// Add ammo-based weapon tracking
+ bazookaAmmo: number;
+ shotgunAmmo: number;
+ laserAmmo: number;

// Add weapon spawn tracking
+ weaponSpawnHistory: WeaponSpawn[];
+ weaponSpawnWeights: Record<WeaponType, number>;

// Modify enemy system
- patties: Patty[];
+ enemies: Enemy[];

// Add special level tracking
+ specialLevelType: 'normal' | 'barrel' | null;
+ levelTypeOverride: number;
```

### New Type Definitions
```typescript
type WeaponSpawn = {
  kind: WeaponType;
  timestamp: number;
};

type WeaponType = 'bazooka' | 'shotgun' | 'laser';

type Enemy = PattyEnemy | LobsterEnemy | BarrelEnemy;
```

## Performance Considerations

### Current Performance Profile
- **Enemies**: Single array iteration, linear complexity
- **Collision Detection**: Nested loops, O(bullets × enemies) complexity
- **Rendering**: Direct canvas operations, no optimization

### New Performance Challenges

1. **Enemy-Enemy Collisions**: O(n²) complexity could cause frame drops
2. **Lobster AI**: Pathfinding calculations per frame per lobster
3. **Weapon History Tracking**: Array management and cleanup overhead
4. **Complex Enemy Rendering**: Multiple sprite types and animation states

### Recommended Optimizations
- **Spatial Partitioning**: Grid-based collision culling for enemy interactions
- **AI Throttling**: Update lobster targeting every N frames, not every frame
- **Object Pooling**: Reuse enemy objects to reduce garbage collection
- **Render Batching**: Group similar enemy types for efficient drawing

## System Module Updates Required

### 1. Difficulty System Enhancements
- Exponential level progression formula
- Per-level enemy spawn type distributions
- Special level detection and handling
- Health restoration every 10 levels (not every level)

### 2. Collision System Extensions
- Multi-type enemy collision handling
- Enemy-to-enemy collision detection
- Bounce physics implementation
- Performance-optimized spatial queries

### 3. New Systems Required
- **Enemy AI System**: Lobster targeting and movement logic
- **Physics System**: Barrel gravity attraction calculations  
- **Spawn Management System**: Weighted weapon distribution logic
- **Special Level System**: Barrel level mechanics and UI

### 4. Upgrades System Refactor
- Replace time-based with ammo-based logic
- Implement weapon spawn history tracking
- Add rarity weighting calculations
- Create ammo consumption mechanics

## Testing Strategy Recommendations

### Unit Test Coverage
1. **Difficulty Calculations**: Verify exponential progression formulas
2. **Collision Detection**: Test new enemy type collision scenarios
3. **Weapon Ammo System**: Validate ammo consumption and exhaustion
4. **AI Behaviors**: Test lobster targeting and barrel attraction logic

### Integration Testing
1. **Performance Tests**: Frame rate impact of enemy-enemy collisions
2. **State Management**: Ensure clean transitions between weapon types
3. **Special Level Mechanics**: Verify barrel level spawn patterns

### E2E Testing Extensions
1. **Gameplay Flow**: Validate ammo-based weapon progression
2. **Enemy Variety**: Test mixed enemy type scenarios
3. **Level Progression**: Confirm exponential difficulty scaling
4. **Special Mechanics**: Barrel level functionality

## Implementation Risk Assessment

### High Risk Areas
- **Enemy-Enemy Collision Performance**: Could cause significant frame rate drops
- **State Migration**: Complex refactoring of existing weapon system
- **AI Complexity**: Lobster pathfinding might over-complicate simple game

### Medium Risk Areas  
- **Exponential Balancing**: May require extensive playtesting to tune
- **Weapon Weighting**: Complex probability system might confuse players
- **Special Level Design**: Barrel levels could disrupt game flow

### Low Risk Areas
- **Difficulty Coefficient Changes**: Simple mathematical adjustments
- **Health Restoration Timing**: Minor modification to existing logic
- **Ammo UI Display**: Straightforward HUD additions

## Recommendations

### Phase 1: Core Systems (Low Risk)
1. Implement exponential level progression
2. Adjust difficulty coefficients (5% faster)
3. Change health restoration to every 10 levels
4. Convert weapon system to ammo-based

### Phase 2: Enemy System (Medium Risk)  
1. Refactor enemy type system with discriminated unions
2. Add basic lobster enemy with simple movement
3. Implement barrel enemies with gravity attraction
4. Add enemy-to-enemy collision detection

### Phase 3: Advanced Features (High Risk)
1. Implement weapon spawn weighting system
2. Add sophisticated lobster AI targeting
3. Create special barrel level mechanics
4. Optimize performance with spatial partitioning

### Alternative Approach
Consider implementing a simplified version first:
- Keep existing enemy system, add new enemy types gradually
- Use simpler AI behaviors initially
- Implement weapon weighting without complex history tracking
- Focus on core mechanics before advanced features

## Conclusion

The proposed mechanics changes represent a significant evolution of the Undersea Blaster gameplay. While technically feasible, the complexity ranges from trivial (difficulty scaling) to high (enemy AI systems). A phased approach focusing on core mechanics first, followed by enemy system enhancements, would minimize risk while delivering meaningful gameplay improvements.

The current architecture provides a solid foundation, but substantial refactoring will be required for the enemy system and weapon management. Performance testing will be critical, particularly for enemy-to-enemy collision detection at higher levels.

**Estimated Development Effort**: 3-4 weeks full-time development, assuming iterative implementation and thorough testing of each phase.