/**
 * Enhanced Input Manager for Desktop
 * Handles keyboard, mouse, touch, and gamepad inputs
 */

export interface InputState {
  left: boolean;
  right: boolean;
  fire: boolean;
  pause: boolean;
  screenshot: boolean;
  fullscreen: boolean;
  quickSave: boolean;
  quickLoad: boolean;
  newGame: boolean;
}

export class InputManager {
  private state: InputState = {
    left: false,
    right: false,
    fire: false,
    pause: false,
    screenshot: false,
    fullscreen: false,
    quickSave: false,
    quickLoad: false,
    newGame: false
  };

  private previousState: InputState = { ...this.state };
  private gamepadIndex: number | null = null;
  private gamepadDeadzone = 0.15;
  
  // Keyboard mappings
  private keyMappings = {
    // Movement
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyA: 'left',
    KeyD: 'left',
    
    // Actions
    Space: 'fire',
    Enter: 'fire',
    KeyP: 'pause',
    Escape: 'pause',
    
    // Desktop shortcuts
    F11: 'fullscreen',
    F12: 'screenshot',
    KeyS: 'quickSave', // With Ctrl/Cmd
    KeyL: 'quickLoad', // With Ctrl/Cmd
    KeyN: 'newGame',   // With Ctrl/Cmd
    KeyR: 'newGame',   // For restart after game over
  };

  // Gamepad button mappings (Xbox/PlayStation style)
  private gamepadButtonMappings = {
    14: 'left',  // D-pad left
    15: 'right', // D-pad right
    0: 'fire',   // A/X button
    1: 'fire',   // B/Circle button
    9: 'pause',  // Start/Options button
    8: 'pause',  // Select/Share button
  };

  constructor(private canvas: HTMLElement) {
    this.setupKeyboardListeners();
    this.setupGamepadSupport();
    this.setupPointerListeners();
  }

  /**
   * Setup keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Clear controls on blur
    window.addEventListener('blur', () => this.clearControls());
    this.canvas.addEventListener('blur', () => this.clearControls());
  }

  /**
   * Handle key down events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Check for modifier keys
    const hasModifier = e.ctrlKey || e.metaKey;
    
    // Handle shortcuts with modifiers
    if (hasModifier) {
      switch(e.code) {
        case 'KeyS':
          this.state.quickSave = true;
          e.preventDefault();
          return;
        case 'KeyL':
          this.state.quickLoad = true;
          e.preventDefault();
          return;
        case 'KeyN':
          this.state.newGame = true;
          e.preventDefault();
          return;
      }
    }
    
    // Handle regular keys
    const mapping = this.keyMappings[e.code as keyof typeof this.keyMappings];
    if (mapping) {
      (this.state as any)[mapping] = true;
      e.preventDefault();
    }
  }

  /**
   * Handle key up events
   */
  private handleKeyUp(e: KeyboardEvent): void {
    const mapping = this.keyMappings[e.code as keyof typeof this.keyMappings];
    if (mapping) {
      (this.state as any)[mapping] = false;
      e.preventDefault();
    }
    
    // Clear one-shot commands
    this.state.quickSave = false;
    this.state.quickLoad = false;
    this.state.newGame = false;
    this.state.screenshot = false;
  }

  /**
   * Setup gamepad support
   */
  private setupGamepadSupport(): void {
    // Check for gamepad connection
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepadIndex = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  /**
   * Setup pointer/touch listeners
   */
  private setupPointerListeners(): void {
    let mouseHeld = false;
    
    const handlePointerDown = (e: PointerEvent) => {
      mouseHeld = true;
      this.handlePointerInput(e.clientX, e.clientY, true);
    };
    
    const handlePointerMove = (e: PointerEvent) => {
      if (mouseHeld) {
        this.handlePointerInput(e.clientX, e.clientY, true);
      }
    };
    
    const handlePointerUp = () => {
      mouseHeld = false;
      this.clearTouchControls();
    };
    
    this.canvas.addEventListener('pointerdown', handlePointerDown);
    this.canvas.addEventListener('pointermove', handlePointerMove);
    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('pointercancel', handlePointerUp);
    this.canvas.addEventListener('pointerleave', handlePointerUp);
    
    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const touch of e.touches) {
        this.handlePointerInput(touch.clientX, touch.clientY, true);
      }
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.clearTouchControls();
      for (const touch of e.touches) {
        this.handlePointerInput(touch.clientX, touch.clientY, true);
      }
    });
    
    this.canvas.addEventListener('touchend', () => {
      this.clearTouchControls();
    });
  }

  /**
   * Handle pointer input for on-screen controls
   */
  private handlePointerInput(x: number, y: number, isDown: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;
    
    const w = rect.width;
    const h = rect.height;
    
    // Check if mobile/touch device
    const isMobile = 'ontouchstart' in window;
    if (!isMobile) return;
    
    // Virtual control positions (matching the game's on-screen controls)
    const padR = 40;
    const leftCx = 24 + padR;
    const leftCy = h - (24 + padR);
    const rightCx = leftCx + (padR * 2.6);
    const rightCy = leftCy;
    const fireR = padR * 1.6;
    const fireCx = w - (24 + fireR);
    const fireCy = h - (24 + fireR);
    
    // Check which control is pressed
    if (this.hitCircle(relX, relY, leftCx, leftCy, padR)) {
      this.state.left = isDown;
    }
    if (this.hitCircle(relX, relY, rightCx, rightCy, padR)) {
      this.state.right = isDown;
    }
    if (this.hitCircle(relX, relY, fireCx, fireCy, fireR)) {
      this.state.fire = isDown;
    }
  }

  /**
   * Check if point is within circle
   */
  private hitCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
    const dx = x - cx;
    const dy = y - cy;
    return (dx * dx + dy * dy) <= (r * r);
  }

  /**
   * Update gamepad state
   */
  private updateGamepad(): void {
    if (this.gamepadIndex === null) return;
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];
    if (!gamepad) return;
    
    // Read analog sticks
    const leftStickX = gamepad.axes[0];
    
    // Apply deadzone
    if (Math.abs(leftStickX) > this.gamepadDeadzone) {
      this.state.left = leftStickX < -this.gamepadDeadzone;
      this.state.right = leftStickX > this.gamepadDeadzone;
    } else {
      // Check D-pad if analog stick is neutral
      this.state.left = gamepad.buttons[14]?.pressed || false;
      this.state.right = gamepad.buttons[15]?.pressed || false;
    }
    
    // Read buttons
    for (const [buttonIndex, action] of Object.entries(this.gamepadButtonMappings)) {
      const button = gamepad.buttons[parseInt(buttonIndex)];
      if (button && button.pressed) {
        (this.state as any)[action] = true;
      }
    }
  }

  /**
   * Clear all controls
   */
  private clearControls(): void {
    this.state.left = false;
    this.state.right = false;
    this.state.fire = false;
  }

  /**
   * Clear touch-specific controls
   */
  private clearTouchControls(): void {
    this.state.left = false;
    this.state.right = false;
    this.state.fire = false;
  }

  /**
   * Get current input state
   */
  getState(): InputState {
    // Update gamepad state
    this.updateGamepad();
    
    return this.state;
  }

  /**
   * Check if a key was just pressed (not held)
   */
  justPressed(key: keyof InputState): boolean {
    return this.state[key] && !this.previousState[key];
  }

  /**
   * Check if a key was just released
   */
  justReleased(key: keyof InputState): boolean {
    return !this.state[key] && this.previousState[key];
  }

  /**
   * Update previous state (call at end of frame)
   */
  updatePreviousState(): void {
    this.previousState = { ...this.state };
    
    // Clear one-shot inputs
    this.state.screenshot = false;
    this.state.fullscreen = false;
    this.state.quickSave = false;
    this.state.quickLoad = false;
  }

  /**
   * Set pause state externally
   */
  setPaused(paused: boolean): void {
    this.state.pause = paused;
  }

  /**
   * Reset all inputs
   */
  reset(): void {
    this.state = {
      left: false,
      right: false,
      fire: false,
      pause: false,
      screenshot: false,
      fullscreen: false,
      quickSave: false,
      quickLoad: false,
      newGame: false
    };
    this.previousState = { ...this.state };
  }
}