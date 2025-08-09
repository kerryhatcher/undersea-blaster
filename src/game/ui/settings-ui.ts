/**
 * Settings Menu UI Component
 * Visual interface for game settings configuration
 */

import { settingsManager, type GameSettings } from '../settings-manager';

export interface SettingItem {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'select' | 'slider' | 'keybind';
  category: keyof GameSettings;
  property: string;
  value: any;
  options?: string[] | number[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  enabled?: boolean;
}

export interface SettingsUIState {
  currentCategory: keyof GameSettings;
  selectedIndex: number;
  items: SettingItem[];
  isEditing: boolean;
  editingKey: string | null;
  pendingKeyPress: boolean;
}

export class SettingsUI {
  private state: SettingsUIState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onAction?: (action: string, data?: any) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    this.state = {
      currentCategory: 'graphics',
      selectedIndex: 0,
      items: [],
      isEditing: false,
      editingKey: null,
      pendingKeyPress: false
    };
  }

  /**
   * Set action callback
   */
  setActionCallback(callback: (action: string, data?: any) => void): void {
    this.onAction = callback;
  }

  /**
   * Initialize with category
   */
  initialize(category: keyof GameSettings): void {
    this.state.currentCategory = category;
    this.state.selectedIndex = 0;
    this.state.isEditing = false;
    this.state.editingKey = null;
    this.loadCategoryItems();
  }

  /**
   * Load items for current category
   */
  private loadCategoryItems(): void {
    this.state.items = [];

    switch (this.state.currentCategory) {
      case 'graphics':
        this.state.items = this.createGraphicsItems();
        break;
      case 'audio':
        this.state.items = this.createAudioItems();
        break;
      case 'controls':
        this.state.items = this.createControlsItems();
        break;
      case 'gameplay':
        this.state.items = this.createGameplayItems();
        break;
      case 'performance':
        this.state.items = this.createPerformanceItems();
        break;
    }
  }

  /**
   * Create graphics settings items
   */
  private createGraphicsItems(): SettingItem[] {
    const graphics = settingsManager.get('graphics');
    
    return [
      {
        key: 'resolution',
        label: 'Resolution',
        type: 'select',
        category: 'graphics',
        property: 'resolution',
        value: graphics.resolution,
        options: ['1280x720', '1920x1080', '2560x1440', '3840x2160'],
        description: 'Display resolution'
      },
      {
        key: 'fullscreen',
        label: 'Fullscreen',
        type: 'boolean',
        category: 'graphics',
        property: 'fullscreen',
        value: graphics.fullscreen,
        description: 'Run in fullscreen mode'
      },
      {
        key: 'vsync',
        label: 'V-Sync',
        type: 'boolean',
        category: 'graphics',
        property: 'vsync',
        value: graphics.vsync,
        description: 'Vertical synchronization'
      },
      {
        key: 'targetFPS',
        label: 'Target FPS',
        type: 'select',
        category: 'graphics',
        property: 'targetFPS',
        value: graphics.targetFPS,
        options: [30, 60, 120, 0],
        description: 'Target frames per second (0 = unlimited)'
      },
      {
        key: 'quality',
        label: 'Graphics Quality',
        type: 'select',
        category: 'graphics',
        property: 'quality',
        value: graphics.quality,
        options: ['low', 'medium', 'high'],
        description: 'Overall graphics quality'
      },
      {
        key: 'particleEffects',
        label: 'Particle Effects',
        type: 'boolean',
        category: 'graphics',
        property: 'particleEffects',
        value: graphics.particleEffects,
        description: 'Enable particle effects'
      },
      {
        key: 'showFPS',
        label: 'Show FPS Counter',
        type: 'boolean',
        category: 'graphics',
        property: 'showFPS',
        value: graphics.showFPS,
        description: 'Display FPS counter'
      },
      {
        key: 'screenShake',
        label: 'Screen Shake',
        type: 'boolean',
        category: 'graphics',
        property: 'screenShake',
        value: graphics.screenShake,
        description: 'Enable screen shake effects'
      }
    ];
  }

  /**
   * Create audio settings items
   */
  private createAudioItems(): SettingItem[] {
    const audio = settingsManager.get('audio');
    
    return [
      {
        key: 'masterVolume',
        label: 'Master Volume',
        type: 'slider',
        category: 'audio',
        property: 'masterVolume',
        value: audio.masterVolume,
        min: 0,
        max: 100,
        step: 5,
        description: 'Overall audio volume'
      },
      {
        key: 'sfxVolume',
        label: 'SFX Volume',
        type: 'slider',
        category: 'audio',
        property: 'sfxVolume',
        value: audio.sfxVolume,
        min: 0,
        max: 100,
        step: 5,
        description: 'Sound effects volume'
      },
      {
        key: 'musicVolume',
        label: 'Music Volume',
        type: 'slider',
        category: 'audio',
        property: 'musicVolume',
        value: audio.musicVolume,
        min: 0,
        max: 100,
        step: 5,
        description: 'Background music volume'
      },
      {
        key: 'muteOnFocusLoss',
        label: 'Mute When Unfocused',
        type: 'boolean',
        category: 'audio',
        property: 'muteOnFocusLoss',
        value: audio.muteOnFocusLoss,
        description: 'Mute audio when game loses focus'
      },
      {
        key: 'enableAmbience',
        label: 'Ambient Sounds',
        type: 'boolean',
        category: 'audio',
        property: 'enableAmbience',
        value: audio.enableAmbience,
        description: 'Enable ambient background sounds'
      }
    ];
  }

  /**
   * Create controls settings items
   */
  private createControlsItems(): SettingItem[] {
    const controls = settingsManager.get('controls');
    
    return [
      {
        key: 'moveLeft',
        label: 'Move Left',
        type: 'keybind',
        category: 'controls',
        property: 'keyBindings.moveLeft',
        value: controls.keyBindings.moveLeft,
        description: 'Key to move left'
      },
      {
        key: 'moveRight',
        label: 'Move Right',
        type: 'keybind',
        category: 'controls',
        property: 'keyBindings.moveRight',
        value: controls.keyBindings.moveRight,
        description: 'Key to move right'
      },
      {
        key: 'fire',
        label: 'Fire',
        type: 'keybind',
        category: 'controls',
        property: 'keyBindings.fire',
        value: controls.keyBindings.fire,
        description: 'Key to fire'
      },
      {
        key: 'pause',
        label: 'Pause',
        type: 'keybind',
        category: 'controls',
        property: 'keyBindings.pause',
        value: controls.keyBindings.pause,
        description: 'Key to pause game'
      },
      {
        key: 'screenshot',
        label: 'Screenshot',
        type: 'keybind',
        category: 'controls',
        property: 'keyBindings.screenshot',
        value: controls.keyBindings.screenshot,
        description: 'Key to take screenshot'
      },
      {
        key: 'fullscreen',
        label: 'Fullscreen Toggle',
        type: 'keybind',
        category: 'controls',
        property: 'keyBindings.fullscreen',
        value: controls.keyBindings.fullscreen,
        description: 'Key to toggle fullscreen'
      },
      {
        key: 'gamepadEnabled',
        label: 'Gamepad Support',
        type: 'boolean',
        category: 'controls',
        property: 'gamepadEnabled',
        value: controls.gamepadEnabled,
        description: 'Enable gamepad/controller support'
      },
      {
        key: 'gamepadDeadzone',
        label: 'Gamepad Deadzone',
        type: 'slider',
        category: 'controls',
        property: 'gamepadDeadzone',
        value: Math.round(controls.gamepadDeadzone * 100),
        min: 0,
        max: 50,
        step: 5,
        description: 'Gamepad analog stick deadzone'
      },
      {
        key: 'touchControlsSize',
        label: 'Touch Controls Size',
        type: 'select',
        category: 'controls',
        property: 'touchControlsSize',
        value: controls.touchControlsSize,
        options: ['small', 'medium', 'large'],
        description: 'Size of on-screen touch controls'
      }
    ];
  }

  /**
   * Create gameplay settings items
   */
  private createGameplayItems(): SettingItem[] {
    const gameplay = settingsManager.get('gameplay');
    
    return [
      {
        key: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        category: 'gameplay',
        property: 'difficulty',
        value: gameplay.difficulty,
        options: ['easy', 'normal', 'hard'],
        description: 'Game difficulty level'
      },
      {
        key: 'autoSave',
        label: 'Auto Save',
        type: 'boolean',
        category: 'gameplay',
        property: 'autoSave',
        value: gameplay.autoSave,
        description: 'Automatically save game progress'
      },
      {
        key: 'autoSaveInterval',
        label: 'Auto Save Interval',
        type: 'select',
        category: 'gameplay',
        property: 'autoSaveInterval',
        value: gameplay.autoSaveInterval,
        options: [1, 2, 5, 10, 15],
        description: 'Auto save interval in minutes'
      },
      {
        key: 'showHints',
        label: 'Show Hints',
        type: 'boolean',
        category: 'gameplay',
        property: 'showHints',
        value: gameplay.showHints,
        description: 'Display gameplay hints'
      },
      {
        key: 'showDamageNumbers',
        label: 'Damage Numbers',
        type: 'boolean',
        category: 'gameplay',
        property: 'showDamageNumbers',
        value: gameplay.showDamageNumbers,
        description: 'Show floating damage numbers'
      },
      {
        key: 'colorblindMode',
        label: 'Colorblind Mode',
        type: 'boolean',
        category: 'gameplay',
        property: 'colorblindMode',
        value: gameplay.colorblindMode,
        description: 'Enable colorblind-friendly colors'
      }
    ];
  }

  /**
   * Create performance settings items
   */
  private createPerformanceItems(): SettingItem[] {
    const performance = settingsManager.get('performance');
    
    return [
      {
        key: 'enableObjectPooling',
        label: 'Object Pooling',
        type: 'boolean',
        category: 'performance',
        property: 'enableObjectPooling',
        value: performance.enableObjectPooling,
        description: 'Enable object pooling for better performance'
      },
      {
        key: 'enableAssetPreRendering',
        label: 'Asset Pre-rendering',
        type: 'boolean',
        category: 'performance',
        property: 'enableAssetPreRendering',
        value: performance.enableAssetPreRendering,
        description: 'Pre-render assets for faster drawing'
      },
      {
        key: 'enableSpatialGrid',
        label: 'Spatial Grid',
        type: 'boolean',
        category: 'performance',
        property: 'enableSpatialGrid',
        value: performance.enableSpatialGrid,
        description: 'Use spatial grid for collision detection'
      },
      {
        key: 'maxEntities',
        label: 'Max Entities',
        type: 'select',
        category: 'performance',
        property: 'maxEntities',
        value: performance.maxEntities,
        options: [100, 200, 300, 500, 1000],
        description: 'Maximum number of entities on screen'
      },
      {
        key: 'reducedEffects',
        label: 'Reduced Effects',
        type: 'boolean',
        category: 'performance',
        property: 'reducedEffects',
        value: performance.reducedEffects,
        description: 'Reduce visual effects for better performance'
      }
    ];
  }

  /**
   * Handle input
   */
  handleInput(key: string): boolean {
    if (this.state.pendingKeyPress) {
      this.handleKeyBind(key);
      return true;
    }

    if (this.state.isEditing) {
      return this.handleEditingInput(key);
    }

    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        this.navigateUp();
        return true;
      case 'arrowdown':
      case 's':
        this.navigateDown();
        return true;
      case 'enter':
      case ' ':
        this.activateSelected();
        return true;
      case 'arrowleft':
      case 'a':
        this.adjustValueLeft();
        return true;
      case 'arrowright':
      case 'd':
        this.adjustValueRight();
        return true;
      case 'escape':
        this.onAction?.('back');
        return true;
      case 'r':
        this.onAction?.('reset-category', this.state.currentCategory);
        return true;
    }

    return false;
  }

  /**
   * Handle input while editing
   */
  private handleEditingInput(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'enter':
        this.finishEditing();
        return true;
      case 'escape':
        this.cancelEditing();
        return true;
    }
    return false;
  }

  /**
   * Handle key binding
   */
  private handleKeyBind(key: string): void {
    if (key === 'Escape') {
      this.cancelEditing();
      return;
    }

    const item = this.state.items[this.state.selectedIndex];
    if (item && item.type === 'keybind') {
      // Update the setting
      const keyPath = item.property.split('.');
      if (keyPath.length === 2) {
        const [category, prop] = keyPath;
        (settingsManager.get(category as any) as any)[prop] = key;
      } else {
        settingsManager.set(item.category, item.property as any, key);
      }
      
      // Update the item value
      item.value = key;
      
      this.state.pendingKeyPress = false;
      this.state.isEditing = false;
    }
  }

  /**
   * Navigation methods
   */
  private navigateUp(): void {
    this.state.selectedIndex = this.state.selectedIndex > 0 
      ? this.state.selectedIndex - 1 
      : this.state.items.length - 1;
  }

  private navigateDown(): void {
    this.state.selectedIndex = this.state.selectedIndex < this.state.items.length - 1
      ? this.state.selectedIndex + 1 
      : 0;
  }

  /**
   * Activate selected item
   */
  private activateSelected(): void {
    const item = this.state.items[this.state.selectedIndex];
    if (!item) return;

    switch (item.type) {
      case 'boolean':
        this.toggleBoolean(item);
        break;
      case 'select':
        this.cycleSelect(item);
        break;
      case 'keybind':
        this.startKeyBinding(item);
        break;
      case 'slider':
        this.startSliderEdit(item);
        break;
    }
  }

  /**
   * Adjust value left/right
   */
  private adjustValueLeft(): void {
    const item = this.state.items[this.state.selectedIndex];
    if (!item) return;

    switch (item.type) {
      case 'select':
        this.selectPrevious(item);
        break;
      case 'slider':
        this.adjustSlider(item, -1);
        break;
    }
  }

  private adjustValueRight(): void {
    const item = this.state.items[this.state.selectedIndex];
    if (!item) return;

    switch (item.type) {
      case 'select':
        this.selectNext(item);
        break;
      case 'slider':
        this.adjustSlider(item, 1);
        break;
    }
  }

  /**
   * Setting manipulation methods
   */
  private toggleBoolean(item: SettingItem): void {
    const newValue = !item.value;
    item.value = newValue;
    
    if (item.property.includes('.')) {
      const [category, prop] = item.property.split('.');
      (settingsManager.get(category as any) as any)[prop] = newValue;
    } else {
      settingsManager.set(item.category, item.property as any, newValue);
    }
  }

  private cycleSelect(item: SettingItem): void {
    if (!item.options) return;
    
    const currentIndex = item.options.indexOf(item.value);
    const nextIndex = (currentIndex + 1) % item.options.length;
    const newValue = item.options[nextIndex];
    
    item.value = newValue;
    settingsManager.set(item.category, item.property as any, newValue);
  }

  private selectPrevious(item: SettingItem): void {
    if (!item.options) return;
    
    const currentIndex = item.options.indexOf(item.value);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : item.options.length - 1;
    const newValue = item.options[prevIndex];
    
    item.value = newValue;
    settingsManager.set(item.category, item.property as any, newValue);
  }

  private selectNext(item: SettingItem): void {
    if (!item.options) return;
    
    const currentIndex = item.options.indexOf(item.value);
    const nextIndex = (currentIndex + 1) % item.options.length;
    const newValue = item.options[nextIndex];
    
    item.value = newValue;
    settingsManager.set(item.category, item.property as any, newValue);
  }

  private adjustSlider(item: SettingItem, direction: number): void {
    const step = item.step || 1;
    const newValue = Math.max(
      item.min || 0, 
      Math.min(
        item.max || 100, 
        item.value + (step * direction)
      )
    );
    
    item.value = newValue;
    
    // Handle special cases for properties like gamepadDeadzone
    let settingValue = newValue;
    if (item.key === 'gamepadDeadzone') {
      settingValue = newValue / 100; // Convert back to 0-1 range
    }
    
    settingsManager.set(item.category, item.property as any, settingValue);
  }

  private startKeyBinding(item: SettingItem): void {
    this.state.isEditing = true;
    this.state.pendingKeyPress = true;
    this.state.editingKey = item.key;
  }

  private startSliderEdit(item: SettingItem): void {
    this.state.isEditing = true;
    this.state.editingKey = item.key;
  }

  private finishEditing(): void {
    this.state.isEditing = false;
    this.state.editingKey = null;
    this.state.pendingKeyPress = false;
  }

  private cancelEditing(): void {
    this.state.isEditing = false;
    this.state.editingKey = null;
    this.state.pendingKeyPress = false;
  }

  /**
   * Render the settings UI
   */
  render(): void {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.save();

    // Background overlay
    this.ctx.fillStyle = 'rgba(0, 20, 40, 0.95)';
    this.ctx.fillRect(0, 0, w, h);

    this.renderSettingsContent(w, h);

    this.ctx.restore();
  }

  /**
   * Render settings content
   */
  private renderSettingsContent(w: number, h: number): void {
    const centerX = w / 2;
    
    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    const categoryNames: Record<string, string> = {
      graphics: 'Graphics Settings',
      audio: 'Audio Settings',
      controls: 'Control Settings',
      gameplay: 'Gameplay Settings',
      performance: 'Performance Settings'
    };
    
    const title = categoryNames[this.state.currentCategory] || 'Settings';
    this.ctx.fillText(title, centerX, 40);

    // Settings items
    const startY = 120;
    const itemHeight = 60;
    const itemSpacing = 5;
    
    this.state.items.forEach((item, index) => {
      const y = startY + (index * (itemHeight + itemSpacing));
      const isSelected = index === this.state.selectedIndex;
      const isEditing = this.state.isEditing && this.state.editingKey === item.key;
      
      this.renderSettingItem(centerX, y, 700, itemHeight, item, isSelected, isEditing);
    });

    // Instructions
    this.renderSettingsInstructions(centerX, h - 80);
  }

  /**
   * Render individual setting item
   */
  private renderSettingItem(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    item: SettingItem, 
    selected: boolean, 
    editing: boolean
  ): void {
    this.ctx.save();

    const left = x - width / 2;
    const right = x + width / 2;

    // Item background
    if (selected) {
      this.ctx.fillStyle = editing ? 'rgba(255, 165, 0, 0.3)' : 'rgba(255, 255, 255, 0.15)';
      this.ctx.fillRect(left, y, width, height);
      
      // Selection border
      this.ctx.strokeStyle = editing ? '#ffa500' : '#4a9eff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(left, y, width, height);
    }

    // Label
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(item.label, left + 20, y + height / 2 - 5);

    // Value
    this.renderSettingValue(right - 20, y + height / 2 - 5, item, editing);

    // Description
    if (item.description) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.font = '12px system-ui';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(item.description, left + 20, y + height / 2 + 15);
    }

    this.ctx.restore();
  }

  /**
   * Render setting value
   */
  private renderSettingValue(x: number, y: number, item: SettingItem, editing: boolean): void {
    this.ctx.save();
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';

    if (editing && item.type === 'keybind') {
      this.ctx.fillStyle = '#ffa500';
      this.ctx.font = 'bold 16px system-ui';
      this.ctx.fillText('Press key...', x, y);
    } else {
      this.ctx.fillStyle = '#4a9eff';
      this.ctx.font = '16px system-ui';

      let displayValue = '';
      
      switch (item.type) {
        case 'boolean':
          displayValue = item.value ? 'ON' : 'OFF';
          break;
        case 'slider':
          displayValue = `${item.value}${item.key.includes('Volume') ? '%' : ''}`;
          break;
        case 'select':
          if (item.key === 'targetFPS' && item.value === 0) {
            displayValue = 'Unlimited';
          } else {
            displayValue = String(item.value).toUpperCase();
          }
          break;
        case 'keybind':
          displayValue = item.value;
          break;
        default:
          displayValue = String(item.value);
      }

      this.ctx.fillText(displayValue, x, y);

      // Slider visualization
      if (item.type === 'slider') {
        const sliderWidth = 100;
        const sliderHeight = 4;
        const sliderX = x - sliderWidth - 60;
        const sliderY = y + 15;

        // Slider track
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(sliderX, sliderY, sliderWidth, sliderHeight);

        // Slider fill
        const fillWidth = (item.value - (item.min || 0)) / ((item.max || 100) - (item.min || 0)) * sliderWidth;
        this.ctx.fillStyle = '#4a9eff';
        this.ctx.fillRect(sliderX, sliderY, fillWidth, sliderHeight);
      }
    }

    this.ctx.restore();
  }

  /**
   * Render instructions
   */
  private renderSettingsInstructions(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '14px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    const instructions = [
      '↑↓ Navigate • ←→ Adjust • Enter to edit • R to reset category • Escape to go back'
    ];

    instructions.forEach((instruction, index) => {
      this.ctx.fillText(instruction, x, y + (index * 18));
    });
  }
}