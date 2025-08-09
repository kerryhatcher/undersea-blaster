/**
 * Asset Pre-renderer
 * Pre-renders SVG assets to offscreen canvases for better performance
 */

export class AssetRenderer {
  private cache: Map<string, OffscreenCanvas> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private loaded: boolean = false;
  
  /**
   * Pre-render an SVG to an offscreen canvas
   */
  async preRenderSVG(
    key: string,
    svgString: string,
    width: number,
    height: number,
    scale: number = 1
  ): Promise<OffscreenCanvas> {
    // Check cache first
    const cacheKey = `${key}_${width}_${height}_${scale}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Create offscreen canvas
    const canvas = new OffscreenCanvas(width * scale, height * scale);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2D context from OffscreenCanvas');
    }
    
    // Scale context if needed
    if (scale !== 1) {
      ctx.scale(scale, scale);
    }
    
    // Create image from SVG
    const img = await this.loadSVGImage(svgString);
    
    // Draw to offscreen canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Cache the result
    this.cache.set(cacheKey, canvas);
    
    return canvas;
  }
  
  /**
   * Load SVG as an image
   */
  private loadSVGImage(svgString: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      // Convert SVG to data URL
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      img.src = url;
      
      // Clean up object URL after loading
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    });
  }
  
  /**
   * Pre-render multiple sizes of an asset
   */
  async preRenderMultipleSizes(
    key: string,
    svgString: string,
    baseSizes: { width: number; height: number },
    scales: number[] = [1, 1.5, 2]
  ): Promise<Map<number, OffscreenCanvas>> {
    const results = new Map<number, OffscreenCanvas>();
    
    for (const scale of scales) {
      const canvas = await this.preRenderSVG(
        key,
        svgString,
        baseSizes.width,
        baseSizes.height,
        scale
      );
      results.set(scale, canvas);
    }
    
    return results;
  }
  
  /**
   * Get pre-rendered asset
   */
  getAsset(key: string, width?: number, height?: number, scale: number = 1): OffscreenCanvas | null {
    const cacheKey = width && height 
      ? `${key}_${width}_${height}_${scale}`
      : key;
    return this.cache.get(cacheKey) || null;
  }
  
  /**
   * Draw pre-rendered asset to context
   */
  drawAsset(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    scale: number = 1
  ): boolean {
    const asset = this.getAsset(key, width, height, scale);
    
    if (!asset) {
      return false;
    }
    
    ctx.drawImage(asset, x, y);
    return true;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.imageCache.clear();
    this.loaded = false;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalAssets: number;
    totalMemoryEstimate: number;
  } {
    let totalMemory = 0;
    
    this.cache.forEach((canvas) => {
      // Estimate: 4 bytes per pixel (RGBA)
      totalMemory += canvas.width * canvas.height * 4;
    });
    
    return {
      totalAssets: this.cache.size,
      totalMemoryEstimate: totalMemory / (1024 * 1024) // Convert to MB
    };
  }
}

/**
 * Game asset definitions
 */
export const GAME_ASSETS = {
  sponge: {
    svg: `<?xml version='1.0'?>
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
      </svg>`,
    width: 80,
    height: 80
  },
  patty: {
    svg: `<?xml version='1.0'?>
      <svg xmlns='http://www.w3.org/2000/svg' width='72' height='56' viewBox='0 0 72 56'>
        <g>
          <ellipse cx='36' cy='16' rx='32' ry='14' fill='#f9c46b' stroke='#b67a2b' stroke-width='3'/>
          <rect x='8' y='24' width='56' height='10' rx='5' fill='#6d3b19'/>
          <ellipse cx='36' cy='40' rx='32' ry='12' fill='#eaa84f' stroke='#a36724' stroke-width='3'/>
          <path d='M10 28 Q 20 35 30 28 T 62 28' stroke='#3a8f2e' stroke-width='6' fill='none'/>
        </g>
      </svg>`,
    width: 72,
    height: 56
  },
  bazookaIcon: {
    svg: `<?xml version='1.0'?>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
        <rect x='8' y='10' width='8' height='4' fill='#666' stroke='#333' stroke-width='1'/>
        <rect x='16' y='11' width='4' height='2' fill='#ff4444' stroke='#cc0000' stroke-width='1'/>
        <circle cx='6' cy='12' r='2' fill='#333'/>
      </svg>`,
    width: 24,
    height: 24
  },
  shotgunIcon: {
    svg: `<?xml version='1.0'?>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
        <rect x='6' y='11' width='12' height='2' fill='#8b4513' stroke='#654321' stroke-width='1'/>
        <rect x='18' y='10' width='2' height='4' fill='#696969' stroke='#333' stroke-width='1'/>
        <circle cx='4' cy='12' r='1.5' fill='#333'/>
      </svg>`,
    width: 24,
    height: 24
  }
};

// Singleton instance
export const assetRenderer = new AssetRenderer();

/**
 * Pre-load all game assets
 */
export async function preloadGameAssets(): Promise<void> {
  const scales = [1, 1.5, 2]; // Support different DPR
  
  // Pre-render player sprite
  await assetRenderer.preRenderMultipleSizes(
    'player',
    GAME_ASSETS.sponge.svg,
    { width: GAME_ASSETS.sponge.width, height: GAME_ASSETS.sponge.height },
    scales
  );
  
  // Pre-render enemy sprite
  await assetRenderer.preRenderMultipleSizes(
    'enemy',
    GAME_ASSETS.patty.svg,
    { width: GAME_ASSETS.patty.width, height: GAME_ASSETS.patty.height },
    scales
  );
  
  // Pre-render power-up icons
  await assetRenderer.preRenderSVG(
    'bazooka',
    GAME_ASSETS.bazookaIcon.svg,
    GAME_ASSETS.bazookaIcon.width,
    GAME_ASSETS.bazookaIcon.height
  );
  
  await assetRenderer.preRenderSVG(
    'shotgun',
    GAME_ASSETS.shotgunIcon.svg,
    GAME_ASSETS.shotgunIcon.width,
    GAME_ASSETS.shotgunIcon.height
  );
}