/**
 * Pooled game state that uses object pools for entities
 * Extends the regular game state with pooling capabilities
 */

import type { GameState, Player, UpgradePickup } from './state';
import { EntityPools } from './performance/entity-pools';
import type { PooledBullet, PooledPatty, PooledExplosion } from './performance/entity-pools';

export interface PooledGameState extends Omit<GameState, 'bullets' | 'patties' | 'explosions'> {
  // Replace arrays with pooled versions
  bullets: PooledBullet[];
  patties: PooledPatty[];
  explosions: PooledExplosion[];
  
  // Add entity pools reference
  pools: EntityPools;
  
  // Performance tracking
  poolStats?: {
    lastUpdate: number;
    bulletCount: number;
    enemyCount: number;
    explosionCount: number;
  };
}

/**
 * Create initial pooled state
 */
export function createPooledState(getW: () => number, getH: () => number): PooledGameState {
  const pools = new EntityPools();
  
  return {
    w: getW,
    h: getH,
    player: { 
      x: 0, 
      y: 0, 
      speed: 260, 
      w: 56, 
      h: 56, 
      hits: 0, 
      maxHits: 5, 
      invuln: 0 
    },
    bullets: [],
    patties: [],
    explosions: [],
    score: 0,
    level: 1,
    scoreAtLevelStart: 0,
    levelUpTimer: 0,
    lastSpawn: 0,
    _cooldown: 0,
    gameOver: false,
    paused: true,
    nextUpgradeAt: 200,
    bazookaActive: false,
    bazookaTimer: 0,
    shotgunActive: false,
    shotgunTimer: 0,
    upgrades: [],
    bazookaCooldown: 0,
    deathExplosionPlayed: false,
    pools,
    poolStats: {
      lastUpdate: 0,
      bulletCount: 0,
      enemyCount: 0,
      explosionCount: 0
    }
  };
}

/**
 * Reset pooled state
 */
export function resetPooledState(state: PooledGameState): void {
  // Release all pooled objects
  state.pools.releaseAll();
  
  // Clear arrays
  state.bullets.length = 0;
  state.patties.length = 0;
  state.explosions.length = 0;
  state.upgrades.length = 0;
  
  // Reset game values
  state.score = 0;
  state.level = 1;
  state.scoreAtLevelStart = 0;
  state.levelUpTimer = 0;
  state.lastSpawn = 0;
  state._cooldown = 0;
  state.gameOver = false;
  state.paused = false;
  state.player.hits = 0;
  state.player.invuln = 0;
  state.nextUpgradeAt = 200;
  state.bazookaActive = false;
  state.bazookaTimer = 0;
  state.shotgunActive = false;
  state.shotgunTimer = 0;
  state.bazookaCooldown = 0;
  state.deathExplosionPlayed = false;
  
  // Reset player position
  state.player.x = state.w() * 0.5;
  state.player.y = state.h() * 0.78;
}

/**
 * Update pool statistics
 */
export function updatePoolStats(state: PooledGameState): void {
  if (state.poolStats) {
    const stats = state.pools.getStats();
    state.poolStats.lastUpdate = performance.now();
    state.poolStats.bulletCount = stats.bullets.active;
    state.poolStats.enemyCount = stats.enemies.active;
    state.poolStats.explosionCount = stats.explosions.active;
  }
}

/**
 * Clean up off-screen entities
 */
export function cleanupEntities(state: PooledGameState): void {
  const w = state.w();
  const h = state.h();
  const margin = 100; // Off-screen margin
  
  // Process bullets - remove off-screen
  state.pools.processBullets((bullet) => {
    if (bullet.y < -margin || bullet.y > h + margin || 
        bullet.x < -margin || bullet.x > w + margin) {
      return false; // Release
    }
    return true; // Keep
  });
  
  // Process enemies - remove off-screen
  state.pools.processEnemies((enemy) => {
    if (enemy.y > h + margin || enemy.x < -margin || enemy.x > w + margin) {
      return false; // Release
    }
    return true; // Keep
  });
  
  // Process explosions - remove expired
  state.pools.processExplosions((explosion) => {
    if (explosion.life >= explosion.duration) {
      return false; // Release
    }
    return true; // Keep
  });
  
  // Update arrays with active entities
  state.bullets = state.pools.getActiveBullets() as PooledBullet[];
  state.patties = state.pools.getActiveEnemies() as PooledPatty[];
  state.explosions = state.pools.getActiveExplosions() as PooledExplosion[];
}