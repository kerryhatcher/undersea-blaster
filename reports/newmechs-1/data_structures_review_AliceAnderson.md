# Data Structures Review for Undersea Blaster New Mechanics
**Author:** Alice Anderson  
**Date:** 2025-08-11  
**Purpose:** Analysis of data structure requirements for new game mechanics

## Current State Structure Analysis

### Core GameState Structure
The current `GameState` type in `/home/kwhatcher/projects/games/undersea-blaster/src/game/state.ts` provides a solid foundation with:

**Core Game Objects:**
- `Player`: Position, dimensions, health (hits/maxHits), movement speed, invulnerability timer
- `Bullet[]`: Projectiles with position, velocity, radius, type discrimination (`'bubble' | 'missile' | 'laser'`)
- `Patty[]`: Current enemy type with position, velocity, size
- `UpgradePickup[]`: Weapon powerups with position, movement, type discrimination

**Game Mechanics State:**
- Score tracking with level progression markers
- Weapon system states (bazooka, shotgun, laser) with timer-based activation
- Visual effects arrays (explosions, impacts)
- Audio state tracking (sound indices)

**Strengths of Current Design:**
1. **Type Discrimination**: Uses string literals for `bullet.kind` and `upgrade.kind`
2. **Modular Systems**: State is manipulated by pure functions in systems directory
3. **Memory Efficient**: Uses primitive arrays for game entities
4. **Testable**: State mutations isolated in testable functions

## New Data Structure Requirements

### 1. Weapon Ammo Tracking Structures

**Current Issue:** Weapons are timer-based without ammo limits
**Required Enhancement:**

```typescript
type WeaponAmmo = {
  bazooka: number;      // Max: 5 rounds
  shotgun: number;      // Max: 55 shells  
  laser: number;        // Max: 1000 energy units
};

type WeaponReloadState = {
  shotgun: {
    isReloading: boolean;
    reloadTimeRemaining: number;
    reloadDuration: number; // Base reload time
  };
  // Other weapons instant reload or no reload needed
};
```

**Integration Points:**
- Modify `GameState` to include `weaponAmmo: WeaponAmmo` and `reloadState: WeaponReloadState`
- Update weapon firing logic to check ammo before creating bullets
- Add ammo restoration on weapon pickup vs. timer extension

### 2. Enemy Type Definitions

**Current Issue:** Only `Patty` type exists, lacks behavioral differentiation
**Required Enhancement:**

```typescript
// Base enemy interface for shared properties
interface BaseEnemy {
  x: number;
  y: number;
  vx: number; 
  vy: number;
  health: number;
  maxHealth: number;
  size: number;
}

// Discriminated union for enemy types
type Enemy = 
  | (BaseEnemy & { type: 'patty' })
  | (BaseEnemy & { 
      type: 'lobster'; 
      aiState: 'seeking' | 'attacking' | 'retreating';
      targetX: number;
      targetY: number;
      lastFireTime: number;
      fireInterval: number;
    })
  | (BaseEnemy & {
      type: 'barrel';
      gravityStrength: number;
      playerDistance: number;
      lastGravityUpdate: number;
    });
```

**Design Rationale:**
- Discriminated union enables type-safe enemy behavior dispatch
- Shared `BaseEnemy` prevents code duplication
- Enemy-specific state encapsulated in type extensions

### 3. Rolling Window Data Structure for Spawn Tracking

**Purpose:** Track last 100 spawns for weapon distribution balancing
**Implementation Pattern:**

```typescript
class RollingSpawnHistory {
  private buffer: ('patty' | 'lobster' | 'barrel')[] = [];
  private index: number = 0;
  private size: number = 0;
  private readonly capacity = 100;

  add(enemyType: 'patty' | 'lobster' | 'barrel'): void {
    this.buffer[this.index] = enemyType;
    this.index = (this.index + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }

  getTypeCounts(): Record<string, number> {
    // Count occurrences for spawn balancing
  }
  
  getRecentSpawns(count: number): ('patty' | 'lobster' | 'barrel')[] {
    // Get last N spawns for pattern analysis
  }
}

type WeaponSpawnHistory = {
  upgrades: RollingSpawnHistory; // Track weapon pickup spawns
  enemies: RollingSpawnHistory;  // Track enemy type spawns
};
```

### 4. Level Progression Curve Data

**Current Issue:** Simple linear progression formulas in `difficulty.ts`
**Enhanced Structure:**

```typescript
type LevelCurveConfig = {
  spawnInterval: {
    base: number;
    reductionPerLevel: number;
    minimum: number;
  };
  speedScale: {
    base: number;
    incrementPerLevel: number;
    maximum: number;
  };
  enemyComposition: {
    [level: number]: {
      patty: number;    // Spawn weight
      lobster: number;
      barrel: number;
    };
  };
  scoreThresholds: number[]; // Points needed for each level
};
```

### 5. Anti-Auto-Clicker State Tracking

**Purpose:** Detect and prevent automated clicking/tapping
**Structure:**

```typescript
type AutoClickerDetection = {
  clickTimestamps: number[];     // Rolling window of last 20 clicks
  suspiciousPatterns: number;    // Count of detected patterns
  isBlocked: boolean;
  blockExpiration: number;       // Timestamp when block expires
  humanVerificationRequired: boolean;
};

type ClickPattern = {
  averageInterval: number;
  intervalVariance: number;
  perfectTiming: number;         // Count of suspiciously precise intervals
};
```

## State Management Patterns

### 1. Entity Component System Considerations
**Current:** Object-oriented entities with embedded state
**Recommendation:** Maintain current pattern for simplicity, but consider component flags:

```typescript
type EntityFlags = {
  isInvulnerable: boolean;
  isTargetable: boolean; 
  isOffscreen: boolean;
  isDying: boolean;
};
```

### 2. State Update Batching
**Current:** Direct state mutation in systems
**Enhancement:** Add state validation layer:

```typescript
type StateTransaction = {
  bullets: { add?: Bullet[], remove?: number[] };
  enemies: { add?: Enemy[], remove?: number[], update?: Partial<Enemy>[] };
  effects: { add?: (Explosion | Impact)[] };
  player: Partial<Player>;
  score: number;
};
```

### 3. Immutability Patterns
**Current:** Mutable arrays and objects
**Recommendation:** Maintain mutability for performance, add validation:

```typescript
function validateGameState(state: GameState): string[] {
  const errors: string[] = [];
  
  // Validate entity bounds, health values, array lengths
  if (state.weaponAmmo.bazooka < 0) errors.push("Invalid bazooka ammo");
  if (state.enemies.some(e => e.health <= 0 && !e.isDying)) {
    errors.push("Dead enemies without dying flag");
  }
  
  return errors;
}
```

## Memory Efficiency Considerations

### 1. Object Pooling Opportunities
**High-Frequency Objects:**
- Bullets (constantly created/destroyed)
- Explosions and impacts (visual effects)
- Enemy projectiles

**Pooling Pattern:**
```typescript
class EntityPool<T> {
  private available: T[] = [];
  private active: T[] = [];
  private factory: () => T;
  
  acquire(): T {
    return this.available.pop() || this.factory();
  }
  
  release(entity: T): void {
    this.resetEntity(entity);
    this.available.push(entity);
  }
}
```

### 2. Memory Layout Optimization
**Current:** Array of objects (AoS - Array of Structures)
**Alternative:** Structure of arrays (SoA) for performance:

```typescript
// Instead of: Enemy[]
// Consider: 
type EnemyArrays = {
  positions: { x: number, y: number }[];
  velocities: { vx: number, vy: number }[];  
  health: number[];
  types: ('patty' | 'lobster' | 'barrel')[];
  // ... other properties
};
```
**Recommendation:** Stick with AoS for code clarity, revisit if performance issues arise

## Serialization Requirements

### 1. Save State Structure
**Requirements:**
- Game progress persistence between sessions
- Checkpoint system for difficult sections
- Settings and control preferences

```typescript
type SaveData = {
  version: string;
  timestamp: number;
  gameProgress: {
    highScore: number;
    currentLevel: number;
    weaponAmmo: WeaponAmmo;
    playerStats: {
      totalKills: number;
      totalShots: number;
      accuracy: number;
    };
  };
  settings: {
    keyConfig: KeyConfig;
    audioEnabled: boolean;
    debugMode: boolean;
  };
};
```

### 2. Serialization Strategy
**Format:** JSON for human readability and web compatibility
**Validation:** JSON Schema or TypeScript runtime validation
**Storage:** localStorage for web, consider compression for large states

## Data Validation Strategies

### 1. Runtime Type Checking
```typescript
function isValidEnemy(obj: any): obj is Enemy {
  return obj && 
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.health === 'number' &&
    ['patty', 'lobster', 'barrel'].includes(obj.type);
}
```

### 2. State Consistency Checks
```typescript
function validateGameConsistency(state: GameState): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check entity boundaries
  const screenBounds = { w: state.w(), h: state.h() };
  state.enemies.forEach((enemy, i) => {
    if (enemy.x < -100 || enemy.x > screenBounds.w + 100) {
      warnings.push(`Enemy ${i} far offscreen: x=${enemy.x}`);
    }
  });
  
  // Check ammo consistency
  if (state.weaponAmmo && state.bazookaActive && state.weaponAmmo.bazooka <= 0) {
    errors.push("Bazooka active but no ammo remaining");
  }
  
  return { warnings, errors };
}
```

### 3. Migration Strategy
**Need:** Handle state structure changes between versions
```typescript
type StateMigration = {
  fromVersion: string;
  toVersion: string;
  migrate: (oldState: any) => GameState;
};

const migrations: StateMigration[] = [
  {
    fromVersion: '0.1.1',
    toVersion: '0.2.0',
    migrate: (old) => ({
      ...old,
      weaponAmmo: { bazooka: 5, shotgun: 55, laser: 1000 },
      enemies: old.patties.map(p => ({ ...p, type: 'patty' }))
    })
  }
];
```

## Implementation Recommendations

### 1. Phased Rollout
1. **Phase 1:** Add new types alongside existing structures
2. **Phase 2:** Implement ammo system with backwards compatibility  
3. **Phase 3:** Add new enemy types with feature flags
4. **Phase 4:** Implement anti-cheat and advanced progression

### 2. Performance Monitoring
- Add entity count tracking for memory usage
- Monitor frame rate impact of new collision detection
- Track serialization performance for save/load operations

### 3. Testing Strategy
- Unit tests for all new data structures
- Property-based testing for state transitions
- Integration tests for serialization roundtrips
- Performance benchmarks for entity processing

## Conclusion

The current state structure provides a solid foundation for the new mechanics. The key enhancements needed are:

1. **Discriminated unions** for type-safe enemy handling
2. **Ammo tracking** with reload mechanics  
3. **Rolling window data structures** for pattern detection
4. **Comprehensive validation** for state consistency
5. **Serialization layer** for save/load functionality

The modular systems architecture will accommodate these changes well, maintaining the existing separation between pure game logic and state management.