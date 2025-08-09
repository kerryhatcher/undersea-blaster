/**
 * UI Manager
 * Central coordinator for all desktop UI components
 */

import { MenuSystem, type MenuType } from './menu-system';
import { SaveLoadUI } from './save-load-ui';
import { SettingsUI } from './settings-ui';
import { HighScoresUI } from './high-scores-ui';
import { StatisticsUI } from './statistics-ui';
import { settingsManager } from '../settings-manager';
import { saveLoadManager } from '../save-load-manager';
import type { GameState } from '../state';

export interface UIState {
  currentUI: UIType | null;
  previousUI: UIType | null;
  isVisible: boolean;
  transition: {
    active: boolean;
    progress: number;
    duration: number;
  };
}

export type UIType = 
  | 'menu'
  | 'save-load'
  | 'settings'
  | 'high-scores'
  | 'statistics';

export class UIManager {
  private state: UIState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;

  // UI Components
  private menuSystem: MenuSystem;
  private saveLoadUI: SaveLoadUI;
  private settingsUI: SettingsUI;
  private highScoresUI: HighScoresUI;
  private statisticsUI: StatisticsUI;

  // Input handling
  private inputListeners: Map<string, (e: KeyboardEvent) => void> = new Map();
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, gameState: GameState) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameState = gameState;

    this.state = {
      currentUI: null,
      previousUI: null,
      isVisible: false,
      transition: {
        active: false,
        progress: 0,
        duration: 300
      }
    };

    // Initialize UI components
    this.menuSystem = new MenuSystem(canvas, ctx);
    this.saveLoadUI = new SaveLoadUI(canvas, ctx);
    this.settingsUI = new SettingsUI(canvas, ctx);
    this.highScoresUI = new HighScoresUI(canvas, ctx);
    this.statisticsUI = new StatisticsUI(canvas, ctx);

    this.setupCallbacks();
    this.setupInputHandling();
    this.setupMenuActions();
  }

  /**
   * Initialize UI system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize managers
      await settingsManager.initialize();
      await saveLoadManager.loadSlots();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize UI system:', error);
    }
  }

  /**
   * Setup UI component callbacks
   */
  private setupCallbacks(): void {
    // Save/Load UI callbacks
    this.saveLoadUI.setActionCallback((action, slot) => {
      this.handleSaveLoadAction(action, slot);
    });

    // Settings UI callbacks
    this.settingsUI.setActionCallback((action, data) => {
      this.handleSettingsAction(action, data);
    });

    // High Scores UI callbacks
    this.highScoresUI.setActionCallback((action, data) => {
      this.handleHighScoresAction(action, data);
    });

    // Statistics UI callbacks
    this.statisticsUI.setActionCallback((action, data) => {
      this.handleStatisticsAction(action, data);
    });

    // Menu system callback
    this.menuSystem.setMenuChangeCallback((menu) => {
      this.handleMenuChange(menu);
    });
  }

  /**
   * Setup input handling
   */
  private setupInputHandling(): void {
    const keydownHandler = (e: KeyboardEvent) => {
      if (!this.state.isVisible) return;

      // Global shortcuts
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          this.showHelp();
          return;
        case 'F5':
          if (this.state.currentUI !== 'menu') {
            e.preventDefault();
            this.quickSave();
            return;
          }
          break;
        case 'F9':
          if (this.state.currentUI !== 'menu') {
            e.preventDefault();
            this.quickLoad();
            return;
          }
          break;
      }

      // Route input to current UI
      let handled = false;
      
      switch (this.state.currentUI) {
        case 'menu':
          // Menu system handles its own input
          break;
        case 'save-load':
          handled = this.saveLoadUI.handleInput(e.key);
          break;
        case 'settings':
          handled = this.settingsUI.handleInput(e.key);
          break;
        case 'high-scores':
          handled = this.highScoresUI.handleInput(e.key);
          break;
        case 'statistics':
          handled = this.statisticsUI.handleInput(e.key);
          break;
      }

      if (handled) {
        e.preventDefault();
      }
    };

    this.inputListeners.set('keydown', keydownHandler);
    window.addEventListener('keydown', keydownHandler);
  }

  /**
   * Setup menu actions
   */
  private setupMenuActions(): void {
    window.addEventListener('menu-action', (e: any) => {
      this.handleMenuAction(e.detail.action, e.detail.menu);
    });
  }

  /**
   * Handle menu actions
   */
  private async handleMenuAction(action: string, menu: string): Promise<void> {
    switch (action) {
      case 'new-game':
        this.hide();
        this.dispatchGameAction('new-game');
        break;
      case 'continue':
        this.hide();
        await this.continueGame();
        break;
      case 'resume':
        this.hide();
        this.dispatchGameAction('resume');
        break;
      case 'save-game':
        await this.showSaveLoadUI('save');
        break;
      case 'load-game':
        await this.showSaveLoadUI('load');
        break;
      case 'main-menu':
        this.hide();
        this.dispatchGameAction('main-menu');
        break;
      case 'quit':
        this.quit();
        break;
      case 'reset-settings':
        await this.resetSettings();
        break;
      case 'reset-stats':
        await this.resetStatistics();
        break;
    }
  }

  /**
   * Handle save/load actions
   */
  private async handleSaveLoadAction(action: string, slot: any): Promise<void> {
    switch (action) {
      case 'save':
        await saveLoadManager.saveToSlot(slot.slotName, this.gameState);
        this.goBack();
        break;
      case 'load':
        const success = await saveLoadManager.loadFromSlot(slot.slotName, this.gameState);
        if (success) {
          this.hide();
          this.dispatchGameAction('load-complete');
        }
        break;
      case 'delete':
        await saveLoadManager.deleteSlot(slot.slotName);
        await this.saveLoadUI.initialize(this.saveLoadUI.getState().mode);
        break;
      case 'back':
        this.goBack();
        break;
    }
  }

  /**
   * Handle settings actions
   */
  private handleSettingsAction(action: string, data: any): void {
    switch (action) {
      case 'back':
        this.goBack();
        break;
      case 'reset-category':
        this.resetSettingsCategory(data);
        break;
    }
  }

  /**
   * Handle high scores actions
   */
  private handleHighScoresAction(action: string, data: any): void {
    switch (action) {
      case 'back':
        this.goBack();
        break;
      case 'score-deleted':
        this.showNotification('High score deleted');
        break;
      case 'confirm-clear-scores':
        this.confirmClearHighScores();
        break;
    }
  }

  /**
   * Handle statistics actions
   */
  private handleStatisticsAction(action: string, data: any): void {
    switch (action) {
      case 'back':
        this.goBack();
        break;
      case 'stats-reset':
        this.showNotification('Statistics have been reset');
        break;
    }
  }

  /**
   * Handle menu changes
   */
  private async handleMenuChange(menu: MenuType): Promise<void> {
    switch (menu) {
      case 'saves':
        await this.showSaveLoadUI('save');
        break;
      case 'load':
        await this.showSaveLoadUI('load');
        break;
      case 'graphics':
      case 'audio':
      case 'controls':
      case 'gameplay':
        await this.showSettingsUI(menu);
        break;
      case 'highscores':
        await this.showHighScoresUI();
        break;
      case 'statistics':
        await this.showStatisticsUI();
        break;
    }
  }

  /**
   * Show main menu
   */
  async showMainMenu(): Promise<void> {
    await this.show('menu');
    this.menuSystem.showMenu('main');
  }

  /**
   * Show pause menu
   */
  async showPauseMenu(): Promise<void> {
    await this.show('menu');
    this.menuSystem.showMenu('pause');
  }

  /**
   * Show settings menu
   */
  async showSettingsMenu(): Promise<void> {
    await this.show('menu');
    this.menuSystem.showMenu('settings');
  }

  /**
   * Show save/load UI
   */
  private async showSaveLoadUI(mode: 'save' | 'load'): Promise<void> {
    await this.show('save-load');
    await this.saveLoadUI.initialize(mode);
  }

  /**
   * Show settings UI
   */
  private async showSettingsUI(category: string): Promise<void> {
    await this.show('settings');
    this.settingsUI.initialize(category as any);
  }

  /**
   * Show high scores UI
   */
  private async showHighScoresUI(): Promise<void> {
    await this.show('high-scores');
    await this.highScoresUI.initialize();
  }

  /**
   * Show statistics UI
   */
  private async showStatisticsUI(): Promise<void> {
    await this.show('statistics');
    await this.statisticsUI.initialize();
  }

  /**
   * Show specific UI
   */
  private async show(ui: UIType): Promise<void> {
    this.state.previousUI = this.state.currentUI;
    this.state.currentUI = ui;
    this.state.isVisible = true;
    
    // Apply any settings that affect display immediately
    this.applyDisplaySettings();
  }

  /**
   * Hide UI
   */
  hide(): void {
    this.state.isVisible = false;
    this.state.currentUI = null;
    this.state.previousUI = null;
    this.menuSystem.hideMenu();
  }

  /**
   * Go back to previous UI or menu
   */
  private goBack(): void {
    if (this.state.previousUI === 'menu' || !this.state.previousUI) {
      this.state.currentUI = 'menu';
      this.menuSystem.goBack();
    } else {
      this.state.currentUI = this.state.previousUI;
      this.state.previousUI = 'menu';
    }
  }

  /**
   * Quick save
   */
  private async quickSave(): Promise<void> {
    await saveLoadManager.quickSave(this.gameState);
  }

  /**
   * Quick load
   */
  private async quickLoad(): Promise<void> {
    const success = await saveLoadManager.quickLoad(this.gameState);
    if (success) {
      this.hide();
      this.dispatchGameAction('load-complete');
    }
  }

  /**
   * Continue game from autosave
   */
  private async continueGame(): Promise<void> {
    const success = await saveLoadManager.loadFromSlot('autosave', this.gameState);
    if (success) {
      this.dispatchGameAction('continue');
    } else {
      // No autosave available, start new game
      this.dispatchGameAction('new-game');
    }
  }

  /**
   * Reset settings
   */
  private async resetSettings(): Promise<void> {
    try {
      await settingsManager.resetToDefaults();
      this.showNotification('Settings reset to defaults');
      this.applyDisplaySettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showNotification('Failed to reset settings', 'error');
    }
  }

  /**
   * Reset settings category
   */
  private async resetSettingsCategory(category: string): Promise<void> {
    try {
      await settingsManager.resetCategory(category as any);
      this.showNotification(`${category} settings reset`);
      this.applyDisplaySettings();
    } catch (error) {
      console.error('Failed to reset settings category:', error);
    }
  }

  /**
   * Reset statistics
   */
  private async resetStatistics(): Promise<void> {
    // This would be handled by the statistics UI
  }

  /**
   * Confirm clear high scores
   */
  private confirmClearHighScores(): void {
    // This would show a confirmation dialog
    this.showNotification('High scores cleared (not implemented)');
  }

  /**
   * Show help
   */
  private showHelp(): void {
    this.showNotification('Help: F5=Quick Save, F9=Quick Load, Esc=Menu');
  }

  /**
   * Quit game
   */
  private quit(): void {
    if (window.electronAPI) {
      window.electronAPI.window.close();
    }
  }

  /**
   * Apply display settings
   */
  private applyDisplaySettings(): void {
    const graphics = settingsManager.get('graphics');
    
    // Apply fullscreen setting
    if (graphics.fullscreen !== this.isFullscreen()) {
      this.toggleFullscreen();
    }
    
    // Apply other graphics settings as needed
    this.dispatchGameAction('settings-applied', graphics);
  }

  /**
   * Check if currently fullscreen
   */
  private isFullscreen(): boolean {
    return !!(document.fullscreenElement || 
              (document as any).webkitFullscreenElement || 
              (document as any).mozFullScreenElement || 
              (document as any).msFullscreenElement);
  }

  /**
   * Toggle fullscreen
   */
  private async toggleFullscreen(): Promise<void> {
    try {
      if (this.isFullscreen()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      } else {
        const element = document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Create a simple notification overlay
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
      color: white;
      border-radius: 4px;
      font-family: system-ui;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Fade out after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Dispatch game action
   */
  private dispatchGameAction(action: string, data?: any): void {
    const event = new CustomEvent('ui-action', {
      detail: { action, data }
    });
    window.dispatchEvent(event);
  }

  /**
   * Update UI system
   */
  update(deltaTime: number): void {
    if (!this.state.isVisible) return;

    // Update current UI component
    switch (this.state.currentUI) {
      case 'menu':
        this.menuSystem.update(deltaTime);
        break;
      // Other UI components don't need frame updates currently
    }
  }

  /**
   * Render UI system
   */
  render(): void {
    if (!this.state.isVisible) return;

    // Render current UI component
    switch (this.state.currentUI) {
      case 'menu':
        this.menuSystem.render();
        break;
      case 'save-load':
        this.saveLoadUI.render();
        break;
      case 'settings':
        this.settingsUI.render();
        break;
      case 'high-scores':
        this.highScoresUI.render();
        break;
      case 'statistics':
        this.statisticsUI.render();
        break;
    }
  }

  /**
   * Check if UI is visible
   */
  isVisible(): boolean {
    return this.state.isVisible;
  }

  /**
   * Get current UI type
   */
  getCurrentUI(): UIType | null {
    return this.state.currentUI;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Remove event listeners
    for (const [event, handler] of this.inputListeners) {
      window.removeEventListener(event as any, handler);
    }
    
    this.inputListeners.clear();
    
    // Cleanup UI components
    this.menuSystem.destroy();
  }
}