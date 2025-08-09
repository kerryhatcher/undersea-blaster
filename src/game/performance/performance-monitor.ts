/**
 * Performance Monitor
 * Tracks FPS, frame times, and other performance metrics
 */

export class PerformanceMonitor {
  private frameTimeBuffer: number[] = [];
  private bufferSize: number = 60;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 0;
  
  // Performance metrics
  private updateTime: number = 0;
  private renderTime: number = 0;
  private collisionTime: number = 0;
  
  // Memory tracking
  private lastMemoryCheck: number = 0;
  private memoryUsage: number = 0;
  
  // Entity counts
  private entityCounts: {
    enemies: number;
    bullets: number;
    explosions: number;
    upgrades: number;
  } = {
    enemies: 0,
    bullets: 0,
    explosions: 0,
    upgrades: 0
  };

  // Performance thresholds
  private readonly targetFPS = 60;
  private readonly targetFrameTime = 1000 / this.targetFPS;
  private readonly slowFrameThreshold = this.targetFrameTime * 1.5; // 50% slower than target

  constructor() {
    this.lastFrameTime = performance.now();
    this.lastFPSUpdate = performance.now();
  }

  /**
   * Start frame timing
   */
  startFrame(): void {
    this.lastFrameTime = performance.now();
  }

  /**
   * End frame timing and update metrics
   */
  endFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    // Add to buffer
    this.frameTimeBuffer.push(frameTime);
    if (this.frameTimeBuffer.length > this.bufferSize) {
      this.frameTimeBuffer.shift();
    }
    
    // Update FPS every second
    this.frameCount++;
    if (now - this.lastFPSUpdate >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
      
      // Check memory usage (less frequently)
      this.updateMemoryUsage();
    }
  }

  /**
   * Time a specific operation
   */
  time<T>(label: 'update' | 'render' | 'collision', fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const elapsed = performance.now() - start;
    
    switch (label) {
      case 'update':
        this.updateTime = elapsed;
        break;
      case 'render':
        this.renderTime = elapsed;
        break;
      case 'collision':
        this.collisionTime = elapsed;
        break;
    }
    
    return result;
  }

  /**
   * Update entity counts
   */
  updateEntityCounts(counts: {
    enemies?: number;
    bullets?: number;
    explosions?: number;
    upgrades?: number;
  }): void {
    if (counts.enemies !== undefined) this.entityCounts.enemies = counts.enemies;
    if (counts.bullets !== undefined) this.entityCounts.bullets = counts.bullets;
    if (counts.explosions !== undefined) this.entityCounts.explosions = counts.explosions;
    if (counts.upgrades !== undefined) this.entityCounts.upgrades = counts.upgrades;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.currentFPS;
  }

  /**
   * Get average frame time
   */
  getAverageFrameTime(): number {
    if (this.frameTimeBuffer.length === 0) return 0;
    const sum = this.frameTimeBuffer.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeBuffer.length;
  }

  /**
   * Get frame time percentiles
   */
  getFrameTimePercentiles(): {
    p50: number;
    p95: number;
    p99: number;
  } {
    if (this.frameTimeBuffer.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...this.frameTimeBuffer].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > this.slowFrameThreshold;
  }

  /**
   * Get performance report
   */
  getReport(): {
    fps: number;
    frameTime: {
      average: number;
      p50: number;
      p95: number;
      p99: number;
    };
    operations: {
      update: number;
      render: number;
      collision: number;
    };
    entities: typeof this.entityCounts;
    memory: number;
    performance: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const percentiles = this.getFrameTimePercentiles();
    const avgFrameTime = this.getAverageFrameTime();
    
    // Determine performance rating
    let performance: 'excellent' | 'good' | 'fair' | 'poor';
    if (this.currentFPS >= 59 && avgFrameTime <= this.targetFrameTime) {
      performance = 'excellent';
    } else if (this.currentFPS >= 50 && avgFrameTime <= this.targetFrameTime * 1.2) {
      performance = 'good';
    } else if (this.currentFPS >= 30) {
      performance = 'fair';
    } else {
      performance = 'poor';
    }
    
    return {
      fps: this.currentFPS,
      frameTime: {
        average: avgFrameTime,
        p50: percentiles.p50,
        p95: percentiles.p95,
        p99: percentiles.p99
      },
      operations: {
        update: this.updateTime,
        render: this.renderTime,
        collision: this.collisionTime
      },
      entities: { ...this.entityCounts },
      memory: this.memoryUsage,
      performance
    };
  }

  /**
   * Update memory usage
   */
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
  }

  /**
   * Render performance overlay
   */
  renderOverlay(ctx: CanvasRenderingContext2D, x: number = 10, y: number = 10): void {
    const report = this.getReport();
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 5, y - 5, 200, 140);
    
    // Text style
    ctx.fillStyle = this.getPerformanceColor(report.performance);
    ctx.font = '12px monospace';
    
    // FPS
    ctx.fillText(`FPS: ${report.fps}`, x, y + 12);
    
    // Frame time
    ctx.fillText(`Frame: ${report.frameTime.average.toFixed(2)}ms`, x, y + 26);
    ctx.fillText(`  P95: ${report.frameTime.p95.toFixed(2)}ms`, x, y + 40);
    
    // Operations
    ctx.fillText(`Update: ${report.operations.update.toFixed(2)}ms`, x, y + 54);
    ctx.fillText(`Render: ${report.operations.render.toFixed(2)}ms`, x, y + 68);
    ctx.fillText(`Collision: ${report.operations.collision.toFixed(2)}ms`, x, y + 82);
    
    // Entities
    ctx.fillText(`Entities: ${this.getTotalEntities()}`, x, y + 96);
    ctx.fillText(`  E:${report.entities.enemies} B:${report.entities.bullets}`, x, y + 110);
    
    // Memory (if available)
    if (report.memory > 0) {
      ctx.fillText(`Memory: ${report.memory.toFixed(1)}MB`, x, y + 124);
    }
  }

  /**
   * Get color based on performance
   */
  private getPerformanceColor(performance: string): string {
    switch (performance) {
      case 'excellent': return '#4caf50';
      case 'good': return '#8bc34a';
      case 'fair': return '#ff9800';
      case 'poor': return '#f44336';
      default: return '#ffffff';
    }
  }

  /**
   * Get total entity count
   */
  private getTotalEntities(): number {
    return this.entityCounts.enemies +
           this.entityCounts.bullets +
           this.entityCounts.explosions +
           this.entityCounts.upgrades;
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.frameTimeBuffer = [];
    this.frameCount = 0;
    this.currentFPS = 0;
    this.updateTime = 0;
    this.renderTime = 0;
    this.collisionTime = 0;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();