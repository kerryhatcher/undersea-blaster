/**
 * Performance Manager
 * Integrates all performance optimizations
 */

import { performanceMonitor } from './performance-monitor';
import { assetRenderer, preloadGameAssets } from './asset-renderer';
import { entityPools } from './entity-pools';
import { SpatialGrid } from './spatial-grid';
import type { GameState } from '../state';

export interface PerformanceConfig {
  enableObjectPooling: boolean;
  enableAssetPreRendering: boolean;
  enableSpatialGrid: boolean;
  enablePerformanceOverlay: boolean;
  targetFPS: number;
  spatialGridCellSize: number;
}

export class PerformanceManager {
  private config: PerformanceConfig;
  private spatialGrid: SpatialGrid | null = null;
  private initialized = false;
  private showOverlay = false;
  
  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableObjectPooling: true,
      enableAssetPreRendering: true,
      enableSpatialGrid: true,
      enablePerformanceOverlay: false,
      targetFPS: 60,
      spatialGridCellSize: 100,
      ...config
    };
  }
  
  /**
   * Initialize all performance systems
   */
  async initialize(canvasWidth: number, canvasHeight: number): Promise<void> {
    if (this.initialized) return;
    
    console.log('Initializing performance optimizations...');
    
    // Initialize spatial grid
    if (this.config.enableSpatialGrid) {
      this.spatialGrid = new SpatialGrid(
        canvasWidth,
        canvasHeight,
        this.config.spatialGridCellSize
      );
      console.log('✓ Spatial grid initialized');
    }
    
    // Pre-load and render assets
    if (this.config.enableAssetPreRendering) {
      try {
        await preloadGameAssets();
        console.log('✓ Assets pre-rendered');
      } catch (error) {
        console.error('Failed to pre-render assets:', error);
      }
    }
    
    // Object pooling is initialized on demand through entityPools
    if (this.config.enableObjectPooling) {
      console.log('✓ Object pooling ready');
    }
    
    // Performance monitoring is always available
    performanceMonitor.reset();
    console.log('✓ Performance monitoring active');
    
    this.initialized = true;
  }
  
  /**
   * Start frame measurement
   */
  beginFrame(): void {
    performanceMonitor.startFrame();
  }
  
  /**
   * End frame measurement
   */
  endFrame(): void {
    performanceMonitor.endFrame();
  }
  
  /**
   * Time an operation
   */
  time<T>(operation: 'update' | 'render' | 'collision', fn: () => T): T {
    return performanceMonitor.time(operation, fn);
  }
  
  /**
   * Update entity counts for monitoring
   */
  updateEntityCounts(state: GameState): void {
    performanceMonitor.updateEntityCounts({
      enemies: state.patties?.length || 0,
      bullets: state.bullets?.length || 0,
      explosions: state.explosions?.length || 0,
      upgrades: state.upgrades?.length || 0
    });
  }
  
  /**
   * Get or create spatial grid
   */
  getSpatialGrid(): SpatialGrid | null {
    return this.spatialGrid;
  }
  
  /**
   * Update spatial grid with current entities
   */
  updateSpatialGrid(bullets: any[], enemies: any[], player: any): void {
    if (!this.spatialGrid || !this.config.enableSpatialGrid) return;
    
    // Clear and rebuild grid each frame
    // (Could be optimized to track movements instead)
    this.spatialGrid.clear();
    
    // Add bullets
    bullets.forEach((bullet, index) => {
      this.spatialGrid!.insert({
        x: bullet.x,
        y: bullet.y,
        radius: bullet.r || 5,
        id: `bullet_${index}`
      });
    });
    
    // Add enemies
    enemies.forEach((enemy, index) => {
      this.spatialGrid!.insert({
        x: enemy.x,
        y: enemy.y,
        radius: enemy.size * 0.46 || 20,
        id: `enemy_${index}`
      });
    });
    
    // Add player
    if (player) {
      this.spatialGrid!.insert({
        x: player.x,
        y: player.y,
        radius: 28, // Approximate player radius
        id: 'player'
      });
    }
  }
  
  /**
   * Draw pre-rendered asset
   */
  drawAsset(
    ctx: CanvasRenderingContext2D,
    assetKey: string,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): boolean {
    if (!this.config.enableAssetPreRendering) {
      return false;
    }
    
    const dpr = window.devicePixelRatio || 1;
    return assetRenderer.drawAsset(ctx, assetKey, x, y, width, height, dpr);
  }
  
  /**
   * Get entity pools
   */
  getEntityPools() {
    if (!this.config.enableObjectPooling) {
      return null;
    }
    return entityPools;
  }
  
  /**
   * Toggle performance overlay
   */
  toggleOverlay(): void {
    this.showOverlay = !this.showOverlay;
    this.config.enablePerformanceOverlay = this.showOverlay;
  }
  
  /**
   * Render performance overlay if enabled
   */
  renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.showOverlay || this.config.enablePerformanceOverlay) {
      performanceMonitor.renderOverlay(ctx, 10, 10);
      
      // Additional optimization stats
      if (this.config.enableObjectPooling) {
        const poolStats = entityPools.getStats();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 145, 200, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('Object Pools:', 10, 160);
        ctx.fillText(`  Bullets: ${poolStats.bullets.active}/${poolStats.bullets.total}`, 10, 174);
        ctx.fillText(`  Enemies: ${poolStats.enemies.active}/${poolStats.enemies.total}`, 10, 188);
        ctx.fillText(`  Explosions: ${poolStats.explosions.active}/${poolStats.explosions.total}`, 10, 202);
      }
      
      if (this.spatialGrid && this.config.enableSpatialGrid) {
        const gridStats = this.spatialGrid.getStats();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 210, 200, 46);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('Spatial Grid:', 10, 225);
        ctx.fillText(`  Cells: ${gridStats.cellCount}`, 10, 239);
        ctx.fillText(`  Avg/Cell: ${gridStats.avgObjectsPerCell.toFixed(1)}`, 10, 253);
      }
    }
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      monitor: performanceMonitor.getReport(),
      pools: this.config.enableObjectPooling ? entityPools.getStats() : null,
      grid: this.spatialGrid ? this.spatialGrid.getStats() : null,
      assets: assetRenderer.getCacheStats()
    };
  }
  
  /**
   * Check if performance is degraded and apply adaptive quality
   */
  applyAdaptiveQuality(): void {
    if (performanceMonitor.isPerformanceDegraded()) {
      // Could reduce particle effects, lower spawn rates, etc.
      console.warn('Performance degraded - consider reducing quality');
    }
  }
  
  /**
   * Reset all performance systems
   */
  reset(): void {
    performanceMonitor.reset();
    
    if (this.spatialGrid) {
      this.spatialGrid.clear();
    }
    
    if (this.config.enableObjectPooling) {
      entityPools.releaseAll();
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.reset();
    assetRenderer.clearCache();
    this.initialized = false;
  }
}

// Export singleton instance with default config
export const performanceManager = new PerformanceManager();

// Export convenience function to enable/disable overlay
export function togglePerformanceOverlay(): void {
  performanceManager.toggleOverlay();
}