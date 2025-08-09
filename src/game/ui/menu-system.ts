/**
 * Menu System for Undersea Blaster Desktop
 * Comprehensive menu framework with navigation and state management
 */

export interface MenuButton {
  id: string;
  text: string;
  action: () => void;
  enabled: boolean;
  visible: boolean;
  shortcut?: string;
  description?: string;
}

export interface MenuState {
  currentMenu: string;
  previousMenu: string | null;
  isVisible: boolean;
  selectedIndex: number;
  buttons: MenuButton[];
  transition: {
    from: string | null;
    to: string | null;
    progress: number;
    duration: number;
  };
}

export type MenuType = 
  | 'main' 
  | 'pause' 
  | 'settings' 
  | 'graphics' 
  | 'audio' 
  | 'controls' 
  | 'gameplay'
  | 'saves' 
  | 'load' 
  | 'highscores' 
  | 'statistics'
  | 'confirm';

export class MenuSystem {
  private state: MenuState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private inputHandlers: Map<string, (e: KeyboardEvent) => void> = new Map();
  private animationFrame: number = 0;
  private onMenuChange?: (menu: MenuType) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    this.state = {
      currentMenu: 'main',
      previousMenu: null,
      isVisible: false,
      selectedIndex: 0,
      buttons: [],
      transition: {
        from: null,
        to: null,
        progress: 0,
        duration: 300
      }
    };

    this.setupInputHandlers();
  }

  /**
   * Set callback for menu changes
   */
  setMenuChangeCallback(callback: (menu: MenuType) => void): void {
    this.onMenuChange = callback;
  }

  /**
   * Show a menu
   */
  showMenu(menuType: MenuType): void {
    if (this.state.currentMenu === menuType && this.state.isVisible) return;

    this.state.transition.from = this.state.currentMenu;
    this.state.transition.to = menuType;
    this.state.transition.progress = 0;
    this.state.previousMenu = this.state.currentMenu;
    this.state.currentMenu = menuType;
    this.state.selectedIndex = 0;
    this.state.isVisible = true;

    this.loadMenuButtons(menuType);
    this.startTransition();
    
    if (this.onMenuChange) {
      this.onMenuChange(menuType);
    }
  }

  /**
   * Hide menu
   */
  hideMenu(): void {
    this.state.isVisible = false;
    this.state.transition.progress = 0;
  }

  /**
   * Go back to previous menu
   */
  goBack(): void {
    if (this.state.previousMenu) {
      this.showMenu(this.state.previousMenu as MenuType);
    } else {
      this.hideMenu();
    }
  }

  /**
   * Check if menu is visible
   */
  isVisible(): boolean {
    return this.state.isVisible;
  }

  /**
   * Get current menu type
   */
  getCurrentMenu(): MenuType {
    return this.state.currentMenu as MenuType;
  }

  /**
   * Load buttons for a specific menu
   */
  private loadMenuButtons(menuType: MenuType): void {
    this.state.buttons = [];

    switch (menuType) {
      case 'main':
        this.state.buttons = this.createMainMenuButtons();
        break;
      case 'pause':
        this.state.buttons = this.createPauseMenuButtons();
        break;
      case 'settings':
        this.state.buttons = this.createSettingsMenuButtons();
        break;
      case 'saves':
        this.state.buttons = this.createSaveMenuButtons();
        break;
      case 'load':
        this.state.buttons = this.createLoadMenuButtons();
        break;
      case 'highscores':
        this.state.buttons = this.createHighScoresButtons();
        break;
      case 'statistics':
        this.state.buttons = this.createStatisticsButtons();
        break;
      case 'graphics':
        this.state.buttons = this.createGraphicsMenuButtons();
        break;
      case 'audio':
        this.state.buttons = this.createAudioMenuButtons();
        break;
      case 'controls':
        this.state.buttons = this.createControlsMenuButtons();
        break;
      case 'gameplay':
        this.state.buttons = this.createGameplayMenuButtons();
        break;
      default:
        this.state.buttons = [
          {
            id: 'back',
            text: 'Back',
            action: () => this.goBack(),
            enabled: true,
            visible: true
          }
        ];
    }

    // Ensure at least one button is enabled
    if (this.state.buttons.length > 0 && !this.state.buttons.some(b => b.enabled)) {
      this.state.buttons[0].enabled = true;
    }

    // Select first enabled button
    this.state.selectedIndex = this.state.buttons.findIndex(b => b.enabled);
    if (this.state.selectedIndex === -1) {
      this.state.selectedIndex = 0;
    }
  }

  /**
   * Create main menu buttons
   */
  private createMainMenuButtons(): MenuButton[] {
    return [
      {
        id: 'new-game',
        text: 'New Game',
        action: () => this.dispatchMenuAction('new-game'),
        enabled: true,
        visible: true,
        shortcut: 'N',
        description: 'Start a new game'
      },
      {
        id: 'continue',
        text: 'Continue',
        action: () => this.dispatchMenuAction('continue'),
        enabled: true, // Will be updated based on save availability
        visible: true,
        shortcut: 'C',
        description: 'Continue from last save'
      },
      {
        id: 'load-game',
        text: 'Load Game',
        action: () => this.showMenu('load'),
        enabled: true,
        visible: true,
        shortcut: 'L',
        description: 'Load a saved game'
      },
      {
        id: 'settings',
        text: 'Settings',
        action: () => this.showMenu('settings'),
        enabled: true,
        visible: true,
        shortcut: 'S',
        description: 'Configure game settings'
      },
      {
        id: 'high-scores',
        text: 'High Scores',
        action: () => this.showMenu('highscores'),
        enabled: true,
        visible: true,
        shortcut: 'H',
        description: 'View high scores'
      },
      {
        id: 'statistics',
        text: 'Statistics',
        action: () => this.showMenu('statistics'),
        enabled: true,
        visible: true,
        shortcut: 'T',
        description: 'View game statistics'
      },
      {
        id: 'quit',
        text: 'Quit',
        action: () => this.dispatchMenuAction('quit'),
        enabled: true,
        visible: true,
        shortcut: 'Q',
        description: 'Exit the game'
      }
    ];
  }

  /**
   * Create pause menu buttons
   */
  private createPauseMenuButtons(): MenuButton[] {
    return [
      {
        id: 'resume',
        text: 'Resume',
        action: () => this.dispatchMenuAction('resume'),
        enabled: true,
        visible: true,
        shortcut: 'R',
        description: 'Resume game'
      },
      {
        id: 'save-game',
        text: 'Save Game',
        action: () => this.showMenu('saves'),
        enabled: true,
        visible: true,
        shortcut: 'S',
        description: 'Save current game'
      },
      {
        id: 'load-game',
        text: 'Load Game',
        action: () => this.showMenu('load'),
        enabled: true,
        visible: true,
        shortcut: 'L',
        description: 'Load a saved game'
      },
      {
        id: 'settings',
        text: 'Settings',
        action: () => this.showMenu('settings'),
        enabled: true,
        visible: true,
        shortcut: 'T',
        description: 'Configure settings'
      },
      {
        id: 'main-menu',
        text: 'Main Menu',
        action: () => this.dispatchMenuAction('main-menu'),
        enabled: true,
        visible: true,
        shortcut: 'M',
        description: 'Return to main menu'
      },
      {
        id: 'quit',
        text: 'Quit',
        action: () => this.dispatchMenuAction('quit'),
        enabled: true,
        visible: true,
        shortcut: 'Q',
        description: 'Exit the game'
      }
    ];
  }

  /**
   * Create settings menu buttons
   */
  private createSettingsMenuButtons(): MenuButton[] {
    return [
      {
        id: 'graphics',
        text: 'Graphics',
        action: () => this.showMenu('graphics'),
        enabled: true,
        visible: true,
        shortcut: 'G',
        description: 'Graphics and display settings'
      },
      {
        id: 'audio',
        text: 'Audio',
        action: () => this.showMenu('audio'),
        enabled: true,
        visible: true,
        shortcut: 'A',
        description: 'Audio and sound settings'
      },
      {
        id: 'controls',
        text: 'Controls',
        action: () => this.showMenu('controls'),
        enabled: true,
        visible: true,
        shortcut: 'C',
        description: 'Input and control settings'
      },
      {
        id: 'gameplay',
        text: 'Gameplay',
        action: () => this.showMenu('gameplay'),
        enabled: true,
        visible: true,
        shortcut: 'P',
        description: 'Gameplay preferences'
      },
      {
        id: 'reset-defaults',
        text: 'Reset to Defaults',
        action: () => this.dispatchMenuAction('reset-settings'),
        enabled: true,
        visible: true,
        shortcut: 'R',
        description: 'Reset all settings to defaults'
      },
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  /**
   * Placeholder button creators (to be implemented)
   */
  private createSaveMenuButtons(): MenuButton[] {
    return [
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  private createLoadMenuButtons(): MenuButton[] {
    return [
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  private createHighScoresButtons(): MenuButton[] {
    return [
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  private createStatisticsButtons(): MenuButton[] {
    return [
      {
        id: 'reset-stats',
        text: 'Reset Statistics',
        action: () => this.dispatchMenuAction('reset-stats'),
        enabled: true,
        visible: true,
        shortcut: 'R',
        description: 'Reset all game statistics'
      },
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  private createGraphicsMenuButtons(): MenuButton[] {
    return [
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  private createAudioMenuButtons(): MenuButton[] {
    return [
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  private createControlsMenuButtons(): MenuButton[] {
    return [
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  private createGameplayMenuButtons(): MenuButton[] {
    return [
      {
        id: 'back',
        text: 'Back',
        action: () => this.goBack(),
        enabled: true,
        visible: true,
        shortcut: 'Escape'
      }
    ];
  }

  /**
   * Setup input handlers
   */
  private setupInputHandlers(): void {
    const handler = (e: KeyboardEvent) => {
      if (!this.state.isVisible) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          this.navigateUp();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.navigateDown();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.activateSelected();
          break;
        case 'Escape':
          e.preventDefault();
          this.goBack();
          break;
        default:
          // Check for shortcut keys
          this.checkShortcut(e.key.toLowerCase());
          break;
      }
    };

    this.inputHandlers.set('keydown', handler);
    window.addEventListener('keydown', handler);
  }

  /**
   * Navigate up in menu
   */
  private navigateUp(): void {
    const enabledButtons = this.state.buttons.filter(b => b.enabled && b.visible);
    if (enabledButtons.length <= 1) return;

    const currentEnabledIndex = enabledButtons.findIndex(
      b => b.id === this.state.buttons[this.state.selectedIndex].id
    );
    
    const nextEnabledIndex = currentEnabledIndex <= 0 
      ? enabledButtons.length - 1 
      : currentEnabledIndex - 1;
    
    const nextButton = enabledButtons[nextEnabledIndex];
    this.state.selectedIndex = this.state.buttons.findIndex(b => b.id === nextButton.id);
  }

  /**
   * Navigate down in menu
   */
  private navigateDown(): void {
    const enabledButtons = this.state.buttons.filter(b => b.enabled && b.visible);
    if (enabledButtons.length <= 1) return;

    const currentEnabledIndex = enabledButtons.findIndex(
      b => b.id === this.state.buttons[this.state.selectedIndex].id
    );
    
    const nextEnabledIndex = currentEnabledIndex >= enabledButtons.length - 1 
      ? 0 
      : currentEnabledIndex + 1;
    
    const nextButton = enabledButtons[nextEnabledIndex];
    this.state.selectedIndex = this.state.buttons.findIndex(b => b.id === nextButton.id);
  }

  /**
   * Activate selected button
   */
  private activateSelected(): void {
    const selectedButton = this.state.buttons[this.state.selectedIndex];
    if (selectedButton && selectedButton.enabled) {
      selectedButton.action();
    }
  }

  /**
   * Check for shortcut key
   */
  private checkShortcut(key: string): void {
    const button = this.state.buttons.find(b => 
      b.enabled && b.visible && b.shortcut?.toLowerCase() === key
    );
    
    if (button) {
      this.state.selectedIndex = this.state.buttons.findIndex(b => b.id === button.id);
      button.action();
    }
  }

  /**
   * Start menu transition animation
   */
  private startTransition(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      this.state.transition.progress = Math.min(elapsed / this.state.transition.duration, 1);

      if (this.state.transition.progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.state.transition.from = null;
        this.state.transition.to = null;
        this.animationFrame = 0;
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Dispatch menu action to parent
   */
  private dispatchMenuAction(action: string): void {
    const event = new CustomEvent('menu-action', { 
      detail: { action, menu: this.state.currentMenu }
    });
    window.dispatchEvent(event);
  }

  /**
   * Update menu state (call each frame)
   */
  update(deltaTime: number): void {
    // Update button states based on game state
    this.updateButtonStates();
  }

  /**
   * Update button availability based on game state
   */
  private updateButtonStates(): void {
    // This will be expanded to check actual game state
    // For now, just ensure buttons are properly enabled
    for (const button of this.state.buttons) {
      // Update button availability based on context
      switch (button.id) {
        case 'continue':
          // Check if there's a save to continue from
          // button.enabled = hasSaveGame();
          break;
        case 'save-game':
          // Only enabled during active game
          // button.enabled = isGameActive();
          break;
      }
    }
  }

  /**
   * Render the menu system
   */
  render(): void {
    if (!this.state.isVisible) return;

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // Calculate transition alpha
    const alpha = this.state.transition.progress;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // Draw background overlay
    this.ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
    this.ctx.fillRect(0, 0, w, h);

    // Draw menu content
    this.renderMenuContent(w, h);

    this.ctx.restore();
  }

  /**
   * Render menu content
   */
  private renderMenuContent(w: number, h: number): void {
    const centerX = w / 2;
    const centerY = h / 2;

    // Draw menu title
    this.renderMenuTitle(centerX, centerY - 200);

    // Draw menu buttons
    this.renderMenuButtons(centerX, centerY - 100);

    // Draw menu footer
    this.renderMenuFooter(centerX, centerY + 200);
  }

  /**
   * Render menu title
   */
  private renderMenuTitle(x: number, y: number): void {
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const titles: Record<string, string> = {
      'main': 'Undersea Blaster',
      'pause': 'Game Paused',
      'settings': 'Settings',
      'graphics': 'Graphics Settings',
      'audio': 'Audio Settings',
      'controls': 'Control Settings',
      'gameplay': 'Gameplay Settings',
      'saves': 'Save Game',
      'load': 'Load Game',
      'highscores': 'High Scores',
      'statistics': 'Statistics'
    };

    const title = titles[this.state.currentMenu] || this.state.currentMenu;
    this.ctx.fillText(title, x, y);
    this.ctx.restore();
  }

  /**
   * Render menu buttons
   */
  private renderMenuButtons(x: number, startY: number): void {
    const buttonHeight = 60;
    const buttonSpacing = 20;
    const buttonWidth = 400;

    this.state.buttons.forEach((button, index) => {
      if (!button.visible) return;

      const y = startY + (index * (buttonHeight + buttonSpacing));
      const isSelected = index === this.state.selectedIndex;
      const isEnabled = button.enabled;

      this.renderButton(x, y, buttonWidth, buttonHeight, button.text, isSelected, isEnabled);

      // Draw shortcut hint
      if (button.shortcut && isEnabled) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '14px system-ui';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`[${button.shortcut}]`, x + buttonWidth/2 - 10, y);
        this.ctx.restore();
      }
    });
  }

  /**
   * Render individual button
   */
  private renderButton(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    text: string, 
    selected: boolean, 
    enabled: boolean
  ): void {
    this.ctx.save();

    const alpha = enabled ? 1 : 0.5;
    this.ctx.globalAlpha = alpha;

    // Button background
    if (selected) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillRect(x - width/2, y - height/2, width, height);
      
      // Selection border
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x - width/2, y - height/2, width, height);
    } else {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(x - width/2, y - height/2, width, height);
    }

    // Button text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);

    this.ctx.restore();
  }

  /**
   * Render menu footer
   */
  private renderMenuFooter(x: number, y: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '16px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const instructions = [
      '↑↓ or W/S to navigate',
      'Enter or Space to select',
      'Escape to go back'
    ];

    instructions.forEach((instruction, index) => {
      this.ctx.fillText(instruction, x, y + (index * 24));
    });

    this.ctx.restore();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Remove event listeners
    for (const [event, handler] of this.inputHandlers) {
      window.removeEventListener(event as any, handler);
    }
    
    this.inputHandlers.clear();
  }
}