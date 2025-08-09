/**
 * Settings Manager for Undersea Blaster
 * Manages game settings with persistence through Electron IPC
 */

export interface GameSettings {
  // Graphics Settings
  graphics: {
    resolution: string;           // "1280x720", "1920x1080", etc.
    fullscreen: boolean;
    vsync: boolean;
    targetFPS: number;           // 30, 60, 120, unlimited
    quality: 'low' | 'medium' | 'high';
    particleEffects: boolean;
    showFPS: boolean;
    screenShake: boolean;
  };
  
  // Audio Settings
  audio: {
    masterVolume: number;        // 0-100
    sfxVolume: number;          // 0-100
    musicVolume: number;        // 0-100
    muteOnFocusLoss: boolean;
    enableAmbience: boolean;
  };
  
  // Controls Settings
  controls: {
    keyBindings: {
      moveLeft: string;
      moveRight: string;
      fire: string;
      pause: string;
      screenshot: string;
      fullscreen: string;
      quickSave: string;
      quickLoad: string;
    };
    mouseSensitivity: number;   // 0-100
    gamepadEnabled: boolean;
    gamepadDeadzone: number;     // 0-1
    touchControlsSize: 'small' | 'medium' | 'large';
  };
  
  // Gameplay Settings
  gameplay: {
    difficulty: 'easy' | 'normal' | 'hard';
    autoSave: boolean;
    autoSaveInterval: number;    // minutes
    showHints: boolean;
    showDamageNumbers: boolean;
    colorblindMode: boolean;
  };
  
  // Performance Settings
  performance: {
    enableObjectPooling: boolean;
    enableAssetPreRendering: boolean;
    enableSpatialGrid: boolean;
    maxEntities: number;
    reducedEffects: boolean;
  };
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: GameSettings = {
  graphics: {
    resolution: '1280x720',
    fullscreen: false,
    vsync: true,
    targetFPS: 60,
    quality: 'medium',
    particleEffects: true,
    showFPS: false,
    screenShake: true
  },
  
  audio: {
    masterVolume: 100,
    sfxVolume: 80,
    musicVolume: 60,
    muteOnFocusLoss: true,
    enableAmbience: true
  },
  
  controls: {
    keyBindings: {
      moveLeft: 'ArrowLeft',
      moveRight: 'ArrowRight',
      fire: 'Space',
      pause: 'Escape',
      screenshot: 'F12',
      fullscreen: 'F11',
      quickSave: 'F5',
      quickLoad: 'F9'
    },
    mouseSensitivity: 50,
    gamepadEnabled: true,
    gamepadDeadzone: 0.15,
    touchControlsSize: 'medium'
  },
  
  gameplay: {
    difficulty: 'normal',
    autoSave: true,
    autoSaveInterval: 5,
    showHints: true,
    showDamageNumbers: false,
    colorblindMode: false
  },
  
  performance: {
    enableObjectPooling: true,
    enableAssetPreRendering: true,
    enableSpatialGrid: true,
    maxEntities: 200,
    reducedEffects: false
  }
};

/**
 * Settings Manager Class
 */
export class SettingsManager {
  private settings: GameSettings;
  private listeners: Map<string, Set<() => void>> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
  
  /**
   * Initialize settings - load from storage
   */
  async initialize(): Promise<void> {
    if (window.electronAPI) {
      try {
        const stored = await window.electronAPI.settings.getAll();
        if (stored) {
          this.mergeSettings(stored);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    } else {
      // Load from localStorage for web version
      const stored = localStorage.getItem('gameSettings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.mergeSettings(parsed);
        } catch (error) {
          console.error('Failed to parse stored settings:', error);
        }
      }
    }
  }
  
  /**
   * Merge stored settings with defaults
   */
  private mergeSettings(stored: any): void {
    // Deep merge with defaults to ensure all properties exist
    const merge = (target: any, source: any) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          merge(target[key], source[key]);
        } else if (source[key] !== undefined) {
          target[key] = source[key];
        }
      }
    };
    
    merge(this.settings, stored);
  }
  
  /**
   * Get a setting value
   */
  get<K extends keyof GameSettings>(category: K): GameSettings[K];
  get<K extends keyof GameSettings, P extends keyof GameSettings[K]>(
    category: K,
    property: P
  ): GameSettings[K][P];
  get(category: any, property?: any): any {
    if (property !== undefined) {
      return this.settings[category]?.[property];
    }
    return this.settings[category];
  }
  
  /**
   * Set a setting value
   */
  set<K extends keyof GameSettings, P extends keyof GameSettings[K]>(
    category: K,
    property: P,
    value: GameSettings[K][P]
  ): void {
    if (!this.settings[category]) {
      this.settings[category] = {} as any;
    }
    
    const oldValue = this.settings[category][property];
    this.settings[category][property] = value;
    
    // Notify listeners
    this.notifyListeners(`${category}.${String(property)}`);
    
    // Save with debounce
    this.scheduleSave();
    
    // Apply certain settings immediately
    this.applyImmediate(category, property, value, oldValue);
  }
  
  /**
   * Set multiple settings at once
   */
  setMultiple(updates: Partial<GameSettings>): void {
    for (const [category, values] of Object.entries(updates)) {
      if (values && typeof values === 'object') {
        for (const [property, value] of Object.entries(values)) {
          this.set(category as any, property as any, value);
        }
      }
    }
  }
  
  /**
   * Reset settings to defaults
   */
  reset(category?: keyof GameSettings): void {
    if (category) {
      this.settings[category] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[category]));
      this.notifyListeners(category);
    } else {
      this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      this.notifyListeners('*');
    }
    
    this.scheduleSave();
  }
  
  /**
   * Listen for setting changes
   */
  on(path: string, callback: () => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(path)?.delete(callback);
    };
  }
  
  /**
   * Notify listeners of changes
   */
  private notifyListeners(path: string): void {
    // Notify specific listeners
    this.listeners.get(path)?.forEach(cb => cb());
    
    // Notify wildcard listeners
    this.listeners.get('*')?.forEach(cb => cb());
    
    // Notify parent path listeners
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      this.listeners.get(parentPath + '.*')?.forEach(cb => cb());
    }
  }
  
  /**
   * Apply settings that need immediate effect
   */
  private applyImmediate(
    category: string,
    property: string,
    value: any,
    oldValue: any
  ): void {
    // Apply fullscreen immediately
    if (category === 'graphics' && property === 'fullscreen' && window.electronAPI) {
      window.electronAPI.system.toggleFullscreen();
    }
    
    // Apply FPS display immediately
    if (category === 'graphics' && property === 'showFPS') {
      // This would be handled by the performance manager
      const event = new CustomEvent('settings:showFPS', { detail: value });
      window.dispatchEvent(event);
    }
    
    // Apply volume changes immediately
    if (category === 'audio') {
      const event = new CustomEvent('settings:audio', { 
        detail: { property, value } 
      });
      window.dispatchEvent(event);
    }
  }
  
  /**
   * Schedule save with debounce
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.save();
    }, 500);
  }
  
  /**
   * Save settings to storage
   */
  async save(): Promise<void> {
    const data = JSON.stringify(this.settings);
    
    if (window.electronAPI) {
      try {
        // Save each category separately for granular control
        for (const [category, values] of Object.entries(this.settings)) {
          await window.electronAPI.settings.set(`settings.${category}`, JSON.stringify(values));
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    } else {
      // Save to localStorage for web version
      localStorage.setItem('gameSettings', data);
    }
  }
  
  /**
   * Export settings as JSON
   */
  export(): string {
    return JSON.stringify(this.settings, null, 2);
  }
  
  /**
   * Import settings from JSON
   */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      this.mergeSettings(parsed);
      this.notifyListeners('*');
      this.scheduleSave();
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
  
  /**
   * Get all settings
   */
  getAll(): GameSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }
  
  /**
   * Validate settings
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate ranges
    const { audio, controls, graphics, performance } = this.settings;
    
    if (audio.masterVolume < 0 || audio.masterVolume > 100) {
      errors.push('Master volume must be between 0 and 100');
    }
    
    if (controls.gamepadDeadzone < 0 || controls.gamepadDeadzone > 1) {
      errors.push('Gamepad deadzone must be between 0 and 1');
    }
    
    if (graphics.targetFPS < 30 && graphics.targetFPS !== 0) {
      errors.push('Target FPS must be at least 30 or 0 for unlimited');
    }
    
    if (performance.maxEntities < 50) {
      errors.push('Max entities must be at least 50');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();