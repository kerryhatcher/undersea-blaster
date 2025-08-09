import { BrowserWindow, screen, app, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Window state interface
 */
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

/**
 * Window Manager - Handles window creation, state persistence, and behaviors
 */
export class WindowManager {
  private windows: Map<string, BrowserWindow> = new Map();
  private stateFile: string;
  private defaultState: WindowState = {
    width: 1280,
    height: 720,
    isMaximized: false,
    isFullScreen: false
  };
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.stateFile = path.join(app.getPath('userData'), 'window-state.json');
  }

  /**
   * Create the main game window
   */
  async createMainWindow(): Promise<BrowserWindow> {
    // Load previous window state
    const state = await this.loadWindowState();

    // Validate window bounds
    const validatedState = this.validateWindowBounds(state);

    // Create the browser window
    const mainWindow = new BrowserWindow({
      x: validatedState.x,
      y: validatedState.y,
      width: validatedState.width,
      height: validatedState.height,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#062b4f',
      title: 'Undersea Blaster',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: path.join(__dirname, '../preload/index.cjs')
      },
      icon: this.getIconPath(),
      show: false,
      frame: true,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      // Game-specific settings
      autoHideMenuBar: false,
      fullscreenable: true,
      resizable: true,
      movable: true,
      closable: true,
      focusable: true,
      hasShadow: true
    });

    // Track this window
    this.windows.set('main', mainWindow);

    // Set up window event handlers
    this.setupWindowEventHandlers(mainWindow);

    // Apply saved state
    if (validatedState.isMaximized) {
      mainWindow.maximize();
    }
    if (validatedState.isFullScreen) {
      mainWindow.setFullScreen(true);
    }

    // Create application menu
    this.createApplicationMenu(mainWindow);

    return mainWindow;
  }

  /**
   * Set up event handlers for window
   */
  private setupWindowEventHandlers(window: BrowserWindow): void {
    // Save state on resize and move
    let saveStateTimer: NodeJS.Timeout | null = null;
    
    const saveState = () => {
      if (saveStateTimer) {
        clearTimeout(saveStateTimer);
      }
      saveStateTimer = setTimeout(() => {
        this.saveWindowState(window);
      }, 1000); // Debounce for 1 second
    };

    window.on('resize', saveState);
    window.on('move', saveState);
    window.on('maximize', saveState);
    window.on('unmaximize', saveState);
    window.on('enter-full-screen', saveState);
    window.on('leave-full-screen', saveState);

    // Show window when ready
    window.once('ready-to-show', () => {
      window.show();
      
      // Focus window on creation
      if (this.isDevelopment) {
        window.webContents.openDevTools();
      }
      window.focus();
    });

    // Handle window closed
    window.on('closed', () => {
      // Remove from tracking
      this.windows.delete('main');
    });

    // Prevent navigation away from the app
    window.webContents.on('will-navigate', (event, url) => {
      if (!this.isDevelopment) {
        const appUrl = window.webContents.getURL();
        if (url !== appUrl) {
          event.preventDefault();
        }
      }
    });

    // Handle external links
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    // Handle close confirmation for unsaved games
    window.on('close', async (event) => {
      // Check if game has unsaved progress
      const hasUnsavedProgress = await this.checkUnsavedProgress(window);
      
      if (hasUnsavedProgress) {
        event.preventDefault();
        
        const choice = dialog.showMessageBoxSync(window, {
          type: 'question',
          buttons: ['Save and Quit', 'Quit Without Saving', 'Cancel'],
          defaultId: 2,
          cancelId: 2,
          title: 'Unsaved Progress',
          message: 'You have unsaved game progress. What would you like to do?'
        });

        if (choice === 0) {
          // Save and quit
          window.webContents.send('save-before-quit');
          // Wait for save to complete, then close
          setTimeout(() => {
            window.destroy();
          }, 1000);
        } else if (choice === 1) {
          // Quit without saving
          window.destroy();
        }
        // choice === 2 is cancel, do nothing
      }
    });
  }

  /**
   * Create application menu
   */
  private createApplicationMenu(window: BrowserWindow): void {
    const isMac = process.platform === 'darwin';

    const template: Electron.MenuItemConstructorOptions[] = [
      // macOS app menu
      ...(isMac ? [{
        label: app.getName(),
        submenu: [
          { role: 'about' as const },
          { type: 'separator' as const },
          { role: 'services' as const, submenu: [] },
          { type: 'separator' as const },
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const }
        ]
      }] : []),

      // Game menu
      {
        label: 'Game',
        submenu: [
          {
            label: 'New Game',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              window.webContents.send('menu-new-game');
            }
          },
          {
            label: 'Pause/Resume',
            accelerator: 'Space',
            click: () => {
              window.webContents.send('menu-toggle-pause');
            }
          },
          { type: 'separator' },
          {
            label: 'Save Game',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              window.webContents.send('menu-save-game');
            }
          },
          {
            label: 'Load Game',
            accelerator: 'CmdOrCtrl+L',
            click: () => {
              window.webContents.send('menu-load-game');
            }
          },
          { type: 'separator' },
          {
            label: 'High Scores',
            accelerator: 'CmdOrCtrl+H',
            click: () => {
              window.webContents.send('menu-high-scores');
            }
          },
          { type: 'separator' },
          ...(isMac ? [] : [
            {
              label: 'Quit',
              accelerator: 'CmdOrCtrl+Q',
              click: () => {
                app.quit();
              }
            }
          ])
        ]
      },

      // View menu
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Fullscreen',
            accelerator: 'F11',
            click: () => {
              const isFullScreen = window.isFullScreen();
              window.setFullScreen(!isFullScreen);
            }
          },
          { type: 'separator' },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => {
              const currentZoom = window.webContents.getZoomFactor();
              window.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 3.0));
            }
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => {
              const currentZoom = window.webContents.getZoomFactor();
              window.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
            }
          },
          {
            label: 'Reset Zoom',
            accelerator: 'CmdOrCtrl+0',
            click: () => {
              window.webContents.setZoomFactor(1.0);
            }
          },
          { type: 'separator' },
          ...(this.isDevelopment ? [
            {
              label: 'Toggle Developer Tools',
              accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
              click: () => {
                window.webContents.toggleDevTools();
              }
            },
            {
              label: 'Reload',
              accelerator: 'CmdOrCtrl+R',
              click: () => {
                window.webContents.reload();
              }
            }
          ] : [])
        ]
      },

      // Window menu
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' as const },
          ...(isMac ? [
            { type: 'separator' as const },
            { role: 'front' as const },
            { type: 'separator' as const },
            { role: 'window' as const }
          ] : [
            { role: 'close' as const }
          ])
        ]
      },

      // Help menu
      {
        label: 'Help',
        submenu: [
          {
            label: 'Game Controls',
            click: () => {
              dialog.showMessageBox(window, {
                type: 'info',
                title: 'Game Controls',
                message: 'Undersea Blaster Controls',
                detail: `Keyboard Controls:
• Arrow Keys or A/D - Move left/right
• Space or Enter - Fire
• P - Pause/Resume
• F11 - Toggle fullscreen
• Escape - Pause/Menu

Mouse/Touch Controls:
• Click/Tap - Fire
• On-screen controls for mobile`,
                buttons: ['OK']
              });
            }
          },
          {
            label: 'About',
            click: () => {
              dialog.showMessageBox(window, {
                type: 'info',
                title: 'About Undersea Blaster',
                message: 'Undersea Blaster',
                detail: 'Version 0.1.0\n\nA fun underwater shooting game.\n\n© 2024 Kerry Hatcher',
                buttons: ['OK']
              });
            }
          },
          { type: 'separator' },
          {
            label: 'View on GitHub',
            click: () => {
              shell.openExternal('https://github.com/kerryhatcher/undersea-blaster');
            }
          },
          {
            label: 'Report Issue',
            click: () => {
              shell.openExternal('https://github.com/kerryhatcher/undersea-blaster/issues');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  /**
   * Load window state from disk
   */
  private async loadWindowState(): Promise<WindowState> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      return { ...this.defaultState, ...JSON.parse(data) };
    } catch (error) {
      // File doesn't exist or is corrupted, use defaults
      return this.defaultState;
    }
  }

  /**
   * Save window state to disk
   */
  private async saveWindowState(window: BrowserWindow): Promise<void> {
    if (!window || window.isDestroyed()) return;

    try {
      const bounds = window.getBounds();
      const state: WindowState = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: window.isMaximized(),
        isFullScreen: window.isFullScreen()
      };

      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save window state:', error);
    }
  }

  /**
   * Validate window bounds to ensure window is visible
   */
  private validateWindowBounds(state: WindowState): WindowState {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    // Check if window would be visible on any display
    let isVisible = false;
    
    if (state.x !== undefined && state.y !== undefined) {
      for (const display of displays) {
        const bounds = display.bounds;
        if (state.x >= bounds.x - state.width / 2 &&
            state.x <= bounds.x + bounds.width - state.width / 2 &&
            state.y >= bounds.y &&
            state.y <= bounds.y + bounds.height - 100) {
          isVisible = true;
          break;
        }
      }
    }

    // If not visible, center on primary display
    if (!isVisible) {
      const bounds = primaryDisplay.bounds;
      state.x = Math.round(bounds.x + (bounds.width - state.width) / 2);
      state.y = Math.round(bounds.y + (bounds.height - state.height) / 2);
    }

    // Ensure size is within limits
    state.width = Math.max(800, Math.min(state.width, primaryDisplay.bounds.width));
    state.height = Math.max(600, Math.min(state.height, primaryDisplay.bounds.height));

    return state;
  }

  /**
   * Check if game has unsaved progress
   */
  private async checkUnsavedProgress(window: BrowserWindow): Promise<boolean> {
    try {
      // Send IPC to renderer to check game state
      const result = await window.webContents.executeJavaScript(`
        // Check if game has unsaved progress
        // This would need to be implemented in the game
        window.gameHasUnsavedProgress ? window.gameHasUnsavedProgress() : false
      `);
      return result;
    } catch {
      // If we can't check, assume no unsaved progress
      return false;
    }
  }

  /**
   * Get appropriate icon path for the platform
   */
  private getIconPath(): string {
    const iconName = process.platform === 'win32' ? 'icon.ico' :
                     process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
    
    // For now, return undefined as we haven't created icons yet
    // return path.join(__dirname, '../../../assets', iconName);
    return undefined as any;
  }

  /**
   * Get main window
   */
  getMainWindow(): BrowserWindow | null {
    return this.windows.get('main') || null;
  }

  /**
   * Get all windows
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Focus main window
   */
  focusMainWindow(): void {
    const mainWindow = this.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  }
}

// Export singleton instance
export const windowManager = new WindowManager();