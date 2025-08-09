/**
 * Entity pools for game objects
 * Manages object pools for bullets, enemies, and explosions
 */

import { ArrayPool } from './object-pool';
import type { Bullet, Patty, Explosion, TrailSegment } from '../state';

// Pool configurations
const POOL_CONFIG = {
  bullets: { initial: 50, max: 200 },
  enemies: { initial: 30, max: 100 },
  explosions: { initial: 20, max: 50 },
  trails: { initial: 100, max: 500 }
};

/**
 * Pooled versions of game entities with _active flag
 */
export type PooledBullet = Bullet & { _active: boolean };
export type PooledPatty = Patty & { _active: boolean };
export type PooledExplosion = Explosion & { _active: boolean };
export type PooledTrailSegment = TrailSegment & { _active: boolean };

/**
 * Entity pools manager
 */
export class EntityPools {
  private bulletPool: ArrayPool<Bullet>;
  private enemyPool: ArrayPool<Patty>;
  private explosionPool: ArrayPool<Explosion>;
  private trailPool: ArrayPool<TrailSegment>;
  
  constructor() {
    // Initialize bullet pool
    this.bulletPool = new ArrayPool<Bullet>(
      () => ({
        x: 0,
        y: 0,
        vy: 0,
        r: 5,
        kind: 'bubble' as const,
        vx: 0,
        trail: []
      }),
      (bullet) => {
        bullet.x = 0;
        bullet.y = 0;
        bullet.vy = 0;
        bullet.vx = 0;
        bullet.r = 5;
        bullet.kind = 'bubble';
        if (bullet.trail) {
          bullet.trail.length = 0;
        }
      },
      POOL_CONFIG.bullets.initial,
      POOL_CONFIG.bullets.max
    );
    
    // Initialize enemy pool
    this.enemyPool = new ArrayPool<Patty>(
      () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 40
      }),
      (enemy) => {
        enemy.x = 0;
        enemy.y = 0;
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.size = 40;
      },
      POOL_CONFIG.enemies.initial,
      POOL_CONFIG.enemies.max
    );
    
    // Initialize explosion pool
    this.explosionPool = new ArrayPool<Explosion>(
      () => ({
        x: 0,
        y: 0,
        life: 0,
        duration: 0.5
      }),
      (explosion) => {
        explosion.x = 0;
        explosion.y = 0;
        explosion.life = 0;
        explosion.duration = 0.5;
      },
      POOL_CONFIG.explosions.initial,
      POOL_CONFIG.explosions.max
    );
    
    // Initialize trail segment pool
    this.trailPool = new ArrayPool<TrailSegment>(
      () => ({
        x: 0,
        y: 0,
        life: 0
      }),
      (trail) => {
        trail.x = 0;
        trail.y = 0;
        trail.life = 0;
      },
      POOL_CONFIG.trails.initial,
      POOL_CONFIG.trails.max
    );
  }
  
  /**
   * Create a bullet
   */
  createBullet(
    x: number,
    y: number,
    vy: number,
    vx = 0,
    kind: 'bubble' | 'missile' = 'bubble',
    r = 5
  ): PooledBullet | null {
    const bullet = this.bulletPool.acquire();
    if (bullet) {
      bullet.x = x;
      bullet.y = y;
      bullet.vy = vy;
      bullet.vx = vx;
      bullet.kind = kind;
      bullet.r = r;
      if (kind === 'missile' && !bullet.trail) {
        bullet.trail = [];
      }
    }
    return bullet;
  }
  
  /**
   * Create an enemy
   */
  createEnemy(x: number, y: number, vx: number, vy: number, size: number): PooledPatty | null {
    const enemy = this.enemyPool.acquire();
    if (enemy) {
      enemy.x = x;
      enemy.y = y;
      enemy.vx = vx;
      enemy.vy = vy;
      enemy.size = size;
    }
    return enemy;
  }
  
  /**
   * Create an explosion
   */
  createExplosion(x: number, y: number, duration = 0.5): PooledExplosion | null {
    const explosion = this.explosionPool.acquire();
    if (explosion) {
      explosion.x = x;
      explosion.y = y;
      explosion.life = 0;
      explosion.duration = duration;
    }
    return explosion;
  }
  
  /**
   * Create a trail segment
   */
  createTrailSegment(x: number, y: number, life = 0.6): PooledTrailSegment | null {
    const trail = this.trailPool.acquire();
    if (trail) {
      trail.x = x;
      trail.y = y;
      trail.life = life;
    }
    return trail;
  }
  
  /**
   * Release a bullet
   */
  releaseBullet(bullet: PooledBullet): void {
    this.bulletPool.release(bullet);
  }
  
  /**
   * Release an enemy
   */
  releaseEnemy(enemy: PooledPatty): void {
    this.enemyPool.release(enemy);
  }
  
  /**
   * Release an explosion
   */
  releaseExplosion(explosion: PooledExplosion): void {
    this.explosionPool.release(explosion);
  }
  
  /**
   * Release a trail segment
   */
  releaseTrailSegment(trail: PooledTrailSegment): void {
    this.trailPool.release(trail);
  }
  
  /**
   * Process bullets and auto-release off-screen ones
   */
  processBullets(processor: (bullet: Bullet, index: number) => boolean): void {
    this.bulletPool.processActive(processor);
  }
  
  /**
   * Process enemies and auto-release off-screen ones
   */
  processEnemies(processor: (enemy: Patty, index: number) => boolean): void {
    this.enemyPool.processActive(processor);
  }
  
  /**
   * Process explosions and auto-release expired ones
   */
  processExplosions(processor: (explosion: Explosion, index: number) => boolean): void {
    this.explosionPool.processActive(processor);
  }
  
  /**
   * Process trail segments
   */
  processTrails(processor: (trail: TrailSegment, index: number) => boolean): void {
    this.trailPool.processActive(processor);
  }
  
  /**
   * Get active bullets
   */
  getActiveBullets(): Bullet[] {
    return this.bulletPool.getActive();
  }
  
  /**
   * Get active enemies
   */
  getActiveEnemies(): Patty[] {
    return this.enemyPool.getActive();
  }
  
  /**
   * Get active explosions
   */
  getActiveExplosions(): Explosion[] {
    return this.explosionPool.getActive();
  }
  
  /**
   * Release all entities
   */
  releaseAll(): void {
    this.bulletPool.releaseAll();
    this.enemyPool.releaseAll();
    this.explosionPool.releaseAll();
    this.trailPool.releaseAll();
  }
  
  /**
   * Get pool statistics
   */
  getStats() {
    return {
      bullets: this.bulletPool.getStats(),
      enemies: this.enemyPool.getStats(),
      explosions: this.explosionPool.getStats(),
      trails: this.trailPool.getStats()
    };
  }
}

// Singleton instance
export const entityPools = new EntityPools();