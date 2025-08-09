/**
 * Asset Cache and Pre-rendering System
 * Optimizes rendering by caching rendered assets
 */

export class AssetCache {
  private cache: Map<string, HTMLCanvasElement> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();

  /**
   * Pre-render an SVG at multiple sizes
   */
  async preRenderSVG(
    key: string,
    svg: string,
    sizes: { width: number; height: number }[]
  ): Promise<void> {
    const img = new Image();
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    this.imageCache.set(key, img);

    // Pre-render at different sizes
    for (const size of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d')!;
      
      ctx.drawImage(img, 0, 0, size.width, size.height);
      
      const cacheKey = `${key}_${size.width}x${size.height}`;
      this.cache.set(cacheKey, canvas);
    }
  }

  /**
   * Pre-render a gradient circle
   */
  preRenderCircle(
    key: string,
    radius: number,
    fillStyle: string | CanvasGradient,
    strokeStyle?: string,
    strokeWidth?: number
  ): void {
    const size = radius * 2 + (strokeWidth || 0) * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.translate(size / 2, size / 2);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    
    if (typeof fillStyle === 'string') {
      ctx.fillStyle = fillStyle;
    } else {
      ctx.fillStyle = fillStyle;
    }
    ctx.fill();

    if (strokeStyle && strokeWidth) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    this.cache.set(key, canvas);
  }

  /**
   * Pre-render explosion frames
   */
  preRenderExplosionFrames(key: string, baseRadius: number, frames: number): void {
    for (let i = 0; i < frames; i++) {
      const progress = i / (frames - 1);
      const radius = baseRadius * (1 + progress * 0.5);
      const alpha = 1 - progress;

      const size = radius * 2 + 4;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.fill();

      const cacheKey = `${key}_frame_${i}`;
      this.cache.set(cacheKey, canvas);
    }
  }

  /**
   * Get cached canvas
   */
  get(key: string): HTMLCanvasElement | undefined {
    return this.cache.get(key);
  }

  /**
   * Get cached image
   */
  getImage(key: string): HTMLImageElement | undefined {
    return this.imageCache.get(key);
  }

  /**
   * Draw cached asset
   */
  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    scale: number = 1,
    rotation: number = 0
  ): boolean {
    const canvas = this.cache.get(key);
    if (!canvas) return false;

    ctx.save();
    ctx.translate(x, y);
    if (rotation !== 0) {
      ctx.rotate(rotation);
    }
    if (scale !== 1) {
      ctx.scale(scale, scale);
    }

    ctx.drawImage(
      canvas,
      -canvas.width / 2,
      -canvas.height / 2
    );

    ctx.restore();
    return true;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.imageCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    canvasCount: number;
    imageCount: number;
    estimatedMemoryMB: number;
  } {
    let totalPixels = 0;
    for (const canvas of this.cache.values()) {
      totalPixels += canvas.width * canvas.height;
    }

    // Rough estimate: 4 bytes per pixel
    const estimatedMemoryMB = (totalPixels * 4) / (1024 * 1024);

    return {
      canvasCount: this.cache.size,
      imageCount: this.imageCache.size,
      estimatedMemoryMB
    };
  }
}

/**
 * Create and initialize asset cache for the game
 */
export async function initializeGameAssets(): Promise<AssetCache> {
  const cache = new AssetCache();

  // Pre-render player at different sizes
  const playerSVG = `<?xml version='1.0'?>
    <svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>
      <defs>
        <radialGradient id='g' cx='50%' cy='40%' r='70%'>
          <stop offset='0%' stop-color='#ffd94d'/>
          <stop offset='100%' stop-color='#f2b800'/>
        </radialGradient>
      </defs>
      <rect x='6' y='10' rx='12' ry='12' width='68' height='58' fill='url(#g)' stroke='#9c7a00' stroke-width='3'/>
      <g fill='#d89e00' opacity='0.6'>
        <circle cx='18' cy='24' r='3'/>
        <circle cx='32' cy='18' r='2.5'/>
        <circle cx='52' cy='22' r='3'/>
        <circle cx='44' cy='34' r='2.8'/>
        <circle cx='22' cy='42' r='3'/>
        <circle cx='60' cy='46' r='2.4'/>
        <circle cx='36' cy='54' r='2.8'/>
      </g>
    </svg>`;

  await cache.preRenderSVG('player', playerSVG, [
    { width: 56, height: 56 },     // Normal size
    { width: 67, height: 67 }      // Bazooka size (1.2x)
  ]);

  // Pre-render enemy at different sizes
  const enemySVG = `<?xml version='1.0'?>
    <svg xmlns='http://www.w3.org/2000/svg' width='72' height='56' viewBox='0 0 72 56'>
      <g>
        <ellipse cx='36' cy='16' rx='32' ry='14' fill='#f9c46b' stroke='#b67a2b' stroke-width='3'/>
        <rect x='8' y='24' width='56' height='10' rx='5' fill='#6d3b19'/>
        <ellipse cx='36' cy='40' rx='32' ry='12' fill='#eaa84f' stroke='#a36724' stroke-width='3'/>
        <path d='M10 28 Q 20 35 30 28 T 62 28' stroke='#3a8f2e' stroke-width='6' fill='none'/>
      </g>
    </svg>`;

  await cache.preRenderSVG('enemy', enemySVG, [
    { width: 54, height: 42 },     // Small enemy (radius 15)
    { width: 72, height: 56 },     // Normal enemy (radius 20)
    { width: 90, height: 70 }      // Large enemy (radius 25)
  ]);

  // Pre-render bullets
  cache.preRenderCircle('bullet_normal', 3, '#ffeb3b');
  cache.preRenderCircle('bullet_bazooka', 5, '#ff6b6b');

  // Pre-render explosion frames (10 frames)
  cache.preRenderExplosionFrames('explosion_small', 30, 10);
  cache.preRenderExplosionFrames('explosion_medium', 50, 10);
  cache.preRenderExplosionFrames('explosion_large', 100, 15);

  // Pre-render upgrade box
  const upgradeCanvas = document.createElement('canvas');
  upgradeCanvas.width = 24;
  upgradeCanvas.height = 24;
  const upgradeCtx = upgradeCanvas.getContext('2d')!;
  upgradeCtx.fillStyle = '#4caf50';
  upgradeCtx.fillRect(2, 2, 20, 20);
  upgradeCtx.fillStyle = '#ffffff';
  upgradeCtx.font = 'bold 12px monospace';
  upgradeCtx.textAlign = 'center';
  upgradeCtx.textBaseline = 'middle';
  upgradeCtx.fillText('B', 12, 12);
  cache.cache.set('upgrade', upgradeCanvas);

  return cache;
}