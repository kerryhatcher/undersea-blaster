// Unified type definitions for shared game core

// Control state that works for both keyboard and touch input
export interface ControlsState {
  left: boolean;
  right: boolean;
  fire: boolean;
}

// Platform-specific information
export interface PlatformInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isDesktop: boolean;
  safeAreaInsets?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Context passed to update functions
export interface UpdateContext {
  dt: number;                    // Delta time in seconds
  controls: ControlsState;        // Current control state
  platform: PlatformInfo;         // Platform-specific info
  timestamp: number;              // Current timestamp for animations
}

// Re-export game state types from state.ts
export type {
  TrailSegment,
  Bullet,
  Patty,
  Player,
  GameState,
  UpgradePickup,
  Explosion,
  Impact
} from './state';

// Helper type for rendering context (for Phase 3)
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timestamp: number;
  platform: PlatformInfo;
}

// Audio playback function types for shared audio
export type AudioPlaybackFn = () => void;

export interface GameAudio {
  playGunshot: AudioPlaybackFn;
  playMissile: (index: number) => void;
  playExplosion: AudioPlaybackFn;
  playShotgun: AudioPlaybackFn;
  playLaser: (index: number) => void;
  playLevelUp?: AudioPlaybackFn;
  playGameOver?: AudioPlaybackFn;
  playHit?: AudioPlaybackFn;
  playPickup?: AudioPlaybackFn;
}