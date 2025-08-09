/**
 * Desktop Integration Module
 * Bridges the game with Electron desktop features
 */

import { GameState } from './state';

// Check if running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && 
         typeof window.electronAPI !== 'undefined';
};

// Get the Electron API if available
const getElectronAPI = () => {
  if (isElectron()) {
    return window.electronAPI;
  }
  return null;
};

/**
 * Desktop Integration Manager
 * Handles all desktop-specific features
 */
export class DesktopIntegration {
  private electronAPI: any;
  private gameState: GameState | null = null;
  private pauseCallback: (() => void) | null = null;
  private newGameCallback: (() => void) | null = null;
  private saveCallbacks: Set<() => void> = new Set();

  constructor() {
    this.electronAPI = getElectronAPI();
    this.setupMenuListeners();
    this.setupWindowListeners();
  }

  /**
   * Set the game state reference
   */
  setGameState(state: GameState): void {
    this.gameState = state;
  }

  /**
   * Register pause toggle callback
   */
  onPauseToggle(callback: () => void): void {
    this.pauseCallback = callback;
  }

  /**
   * Register new game callback
   */
  onNewGame(callback: () => void): void {
    this.newGameCallback = callback;
  }

  /**
   * Register save callback
   */
  onSave(callback: () => void): void {
    this.saveCallbacks.add(callback);
  }

  /**
   * Setup menu action listeners
   */
  private setupMenuListeners(): void {
    if (!this.electronAPI) return;

    // Listen for menu actions via IPC
    this.electronAPI.on('menu-new-game', () => {
      console.log('Menu: New Game');
      if (this.newGameCallback) {
        this.newGameCallback();
      }
    });

    this.electronAPI.on('menu-toggle-pause', () => {
      console.log('Menu: Toggle Pause');
      if (this.pauseCallback) {
        this.pauseCallback();
      }
    });

    this.electronAPI.on('menu-save-game', () => {
      console.log('Menu: Save Game');
      this.saveGame();
    });

    this.electronAPI.on('menu-load-game', () => {
      console.log('Menu: Load Game');
      this.showLoadDialog();
    });

    this.electronAPI.on('menu-high-scores', () => {
      console.log('Menu: High Scores');
      this.showHighScores();
    });

    this.electronAPI.on('save-before-quit', () => {
      console.log('Menu: Save Before Quit');
      this.saveGame().then(() => {
        // Signal that save is complete
        if (this.electronAPI) {
          this.electronAPI.system.close();
        }
      });
    });
  }

  /**
   * Setup window event listeners
   */
  private setupWindowListeners(): void {
    if (!this.electronAPI) return;

    // Listen for fullscreen changes
    this.electronAPI.on('fullscreen-changed', (isFullscreen: boolean) => {
      console.log('Fullscreen:', isFullscreen);
      // Could update UI to reflect fullscreen state
    });

    // Listen for focus changes
    this.electronAPI.on('focus-changed', (isFocused: boolean) => {
      if (!isFocused && this.gameState && !this.gameState.paused) {
        // Auto-pause when window loses focus
        if (this.pauseCallback) {
          this.pauseCallback();
        }
      }
    });
  }

  /**
   * Save the current game state
   */
  async saveGame(): Promise<void> {
    if (!this.electronAPI || !this.gameState) return;

    try {
      // Notify save callbacks
      this.saveCallbacks.forEach(cb => cb());

      const saveData = {
        score: this.gameState.score,
        level: this.gameState.level,
        playerHealth: this.gameState.playerHealth,
        playerX: this.gameState.playerX,
        playerY: this.gameState.playerY,
        enemies: this.gameState.enemies.map(e => ({
          x: e.x,
          y: e.y,
          vx: e.vx,
          vy: e.vy,
          radius: e.radius,
          health: e.health
        })),
        bullets: this.gameState.bullets.map(b => ({
          x: b.x,
          y: b.y,
          vx: b.vx,
          vy: b.vy
        })),
        upgrades: this.gameState.upgrades,
        timestamp: Date.now()
      };

      const result = await this.electronAPI.game.saveState(saveData);
      
      if (result.success) {
        this.showNotification('Game Saved', 'Your progress has been saved.');
      } else {
        this.showNotification('Save Failed', 'Failed to save game progress.');
      }
    } catch (error) {
      console.error('Save failed:', error);
      this.showNotification('Save Error', 'An error occurred while saving.');
    }
  }

  /**
   * Load a saved game
   */
  async loadGame(saveId?: string): Promise<void> {
    if (!this.electronAPI || !this.gameState) return;

    try {
      const saveData = saveId ? 
        await this.electronAPI.game.loadState(saveId) :
        await this.electronAPI.game.loadState();

      if (saveData) {
        // Restore game state
        this.gameState.score = saveData.score || 0;
        this.gameState.level = saveData.level || 1;
        this.gameState.playerHealth = saveData.playerHealth || 3;
        this.gameState.playerX = saveData.playerX || 0;
        this.gameState.playerY = saveData.playerY || 0;
        
        // Clear and restore entities
        this.gameState.enemies = saveData.enemies || [];
        this.gameState.bullets = saveData.bullets || [];
        this.gameState.upgrades = saveData.upgrades || [];
        
        // Unpause if paused
        this.gameState.paused = false;

        this.showNotification('Game Loaded', 'Your saved game has been loaded.');
      } else {
        this.showNotification('No Save Found', 'No saved game found.');
      }
    } catch (error) {
      console.error('Load failed:', error);
      this.showNotification('Load Error', 'Failed to load saved game.');
    }
  }

  /**
   * Show load game dialog
   */
  async showLoadDialog(): Promise<void> {
    if (!this.electronAPI) return;

    try {
      const saves = await this.electronAPI.game.getSaves();
      
      if (saves.length === 0) {
        this.showNotification('No Saves', 'No saved games found.');
        return;
      }

      // For now, just load the most recent save
      // In the future, show a dialog to select
      const mostRecent = saves[0];
      await this.loadGame(mostRecent.id);
    } catch (error) {
      console.error('Failed to get saves:', error);
    }
  }

  /**
   * Save high score
   */
  async saveHighScore(score: number, name: string): Promise<void> {
    if (!this.electronAPI) return;

    try {
      await this.electronAPI.game.saveHighScore(score, name);
      this.showNotification('High Score Saved', `Score: ${score}`);
    } catch (error) {
      console.error('Failed to save high score:', error);
    }
  }

  /**
   * Show high scores
   */
  async showHighScores(): Promise<void> {
    if (!this.electronAPI) return;

    try {
      const scores = await this.electronAPI.game.getHighScores();
      
      // For now, just log them
      // In the future, show a proper dialog
      console.log('High Scores:', scores);
      
      if (scores.length === 0) {
        this.showNotification('High Scores', 'No high scores yet!');
      } else {
        const topScore = scores[0];
        this.showNotification('High Score', 
          `#1: ${topScore.name} - ${topScore.score}`);
      }
    } catch (error) {
      console.error('Failed to get high scores:', error);
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(): Promise<void> {
    if (!this.electronAPI) return;

    try {
      const path = await this.electronAPI.game.takeScreenshot();
      if (path) {
        this.showNotification('Screenshot Saved', 'Screenshot saved successfully.');
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  }

  /**
   * Toggle fullscreen
   */
  async toggleFullscreen(): Promise<void> {
    if (!this.electronAPI) return;

    try {
      await this.electronAPI.system.toggleFullscreen();
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  }

  /**
   * Get display information
   */
  async getDisplayInfo(): Promise<any> {
    if (!this.electronAPI) return null;

    try {
      return await this.electronAPI.system.getDisplayInfo();
    } catch (error) {
      console.error('Failed to get display info:', error);
      return null;
    }
  }

  /**
   * Save settings
   */
  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.electronAPI) return;

    try {
      await this.electronAPI.settings.set(key, value);
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  }

  /**
   * Load settings
   */
  async loadSetting(key: string): Promise<any> {
    if (!this.electronAPI) return null;

    try {
      return await this.electronAPI.settings.get(key);
    } catch (error) {
      console.error('Failed to load setting:', error);
      return null;
    }
  }

  /**
   * Show a notification (temporary implementation)
   */
  private showNotification(title: string, message: string): void {
    // For now, just use console.log
    // In the future, implement a proper notification system
    console.log(`[${title}] ${message}`);
    
    // Could also show a temporary overlay on the canvas
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-family: system-ui;
      z-index: 10000;
      animation: fadeIn 0.3s;
    `;
    notification.innerHTML = `<strong>${title}</strong><br>${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  /**
   * Check if game has unsaved progress
   */
  hasUnsavedProgress(): boolean {
    if (!this.gameState) return false;
    
    // Check if game has meaningful progress
    return this.gameState.score > 0 || 
           this.gameState.level > 1 ||
           this.gameState.enemies.length > 0;
  }
}

// Create and export singleton instance
export const desktopIntegration = new DesktopIntegration();

// Add CSS for notifications
if (typeof document !== 'undefined' && !document.getElementById('desktop-integration-styles')) {
  const style = document.createElement('style');
  style.id = 'desktop-integration-styles';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(20px); }
    }
  `;
  document.head.appendChild(style);
}

// Expose unsaved progress check for window manager
if (isElectron()) {
  (window as any).gameHasUnsavedProgress = () => {
    return desktopIntegration.hasUnsavedProgress();
  };
}