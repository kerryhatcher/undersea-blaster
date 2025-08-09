/**
 * Developer Tools Management
 * Controls debug features and developer tools access
 */

import { BrowserWindow, ipcMain, app, Menu, MenuItem } from 'electron';
import fs from 'fs';
import path from 'path';

export interface DevToolsConfig {
  enabled: boolean;
  showOnStartup: boolean;
  detached: boolean;
  position: 'right' | 'bottom' | 'undocked' | 'detach';
  logLevel: 'verbose' | 'info' | 'warning' | 'error';
  performanceMonitoring: boolean;
  networkThrottling: boolean;
}

export class DevToolsManager {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugMode = false;
  private config: DevToolsConfig;
  private mainWindow: BrowserWindow | null = null;
  private performanceLog: any[] = [];
  private networkLog: any[] = [];
  private consoleLog: any[] = [];
  private maxLogSize = 1000;

  constructor() {
    this.config = this.loadConfig();
    this.setupIpcHandlers();
    this.checkDebugMode();
  }

  /**
   * Load developer tools configuration
   */
  private loadConfig(): DevToolsConfig {
    const defaultConfig: DevToolsConfig = {
      enabled: this.isDevelopment,
      showOnStartup: false,
      detached: false,
      position: 'right',
      logLevel: 'info',
      performanceMonitoring: false,
      networkThrottling: false
    };

    try {
      const configPath = path.join(app.getPath('userData'), 'devtools-config.json');
      if (fs.existsSync(configPath)) {
        const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return { ...defaultConfig, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load dev tools config:', error);
    }

    return defaultConfig;
  }

  /**
   * Save developer tools configuration
   */
  private saveConfig(): void {
    try {
      const configPath = path.join(app.getPath('userData'), 'devtools-config.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save dev tools config:', error);
    }
  }

  /**
   * Check if debug mode should be enabled
   */
  private checkDebugMode(): void {
    // Check command line arguments
    const args = process.argv;
    this.isDebugMode = args.includes('--debug') || args.includes('--inspect');

    // Check environment variable
    if (process.env.DEBUG === 'true' || process.env.ELECTRON_DEBUG === 'true') {
      this.isDebugMode = true;
    }

    // In development, always allow debug features
    if (this.isDevelopment) {
      this.isDebugMode = true;
    }
  }

  /**
   * Setup IPC handlers for dev tools control
   */
  private setupIpcHandlers(): void {
    // Toggle dev tools
    ipcMain.handle('devtools:toggle', () => {
      if (!this.canUseDevTools()) {
        return { success: false, message: 'Dev tools disabled in production' };
      }

      if (this.mainWindow) {
        if (this.mainWindow.webContents.isDevToolsOpened()) {
          this.mainWindow.webContents.closeDevTools();
        } else {
          this.openDevTools();
        }
      }

      return { success: true };
    });

    // Get debug info
    ipcMain.handle('devtools:get-debug-info', () => {
      return this.getDebugInfo();
    });

    // Get performance metrics
    ipcMain.handle('devtools:get-performance', async () => {
      if (!this.mainWindow) {
        return null;
      }

      const metrics = await this.mainWindow.webContents.executeJavaScript(`
        ({
          memory: performance.memory,
          timing: performance.timing,
          navigation: performance.navigation,
          fps: window.__FPS__ || 0
        })
      `).catch(() => null);

      return metrics;
    });

    // Get console logs
    ipcMain.handle('devtools:get-logs', (event, type?: string) => {
      switch (type) {
        case 'console':
          return this.consoleLog;
        case 'network':
          return this.networkLog;
        case 'performance':
          return this.performanceLog;
        default:
          return {
            console: this.consoleLog,
            network: this.networkLog,
            performance: this.performanceLog
          };
      }
    });

    // Clear logs
    ipcMain.handle('devtools:clear-logs', (event, type?: string) => {
      switch (type) {
        case 'console':
          this.consoleLog = [];
          break;
        case 'network':
          this.networkLog = [];
          break;
        case 'performance':
          this.performanceLog = [];
          break;
        default:
          this.consoleLog = [];
          this.networkLog = [];
          this.performanceLog = [];
      }
      return { success: true };
    });

    // Execute JavaScript in renderer
    ipcMain.handle('devtools:execute', async (event, code: string) => {
      if (!this.canUseDevTools()) {
        return { success: false, message: 'Execution disabled in production' };
      }

      try {
        const result = await this.mainWindow?.webContents.executeJavaScript(code);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Take heap snapshot
    ipcMain.handle('devtools:heap-snapshot', async () => {
      if (!this.canUseDevTools() || !this.mainWindow) {
        return { success: false };
      }

      try {
        const filePath = path.join(
          app.getPath('userData'),
          `heap-${Date.now()}.heapsnapshot`
        );
        
        await this.mainWindow.webContents.takeHeapSnapshot(filePath);
        return { success: true, path: filePath };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Network throttling
    ipcMain.handle('devtools:set-throttling', async (event, profile: string) => {
      if (!this.canUseDevTools() || !this.mainWindow) {
        return { success: false };
      }

      const profiles: Record<string, any> = {
        'offline': { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
        'slow-3g': { offline: false, latency: 2000, downloadThroughput: 40960, uploadThroughput: 40960 },
        'fast-3g': { offline: false, latency: 562.5, downloadThroughput: 188743, uploadThroughput: 93871 },
        'regular-4g': { offline: false, latency: 20, downloadThroughput: 4096000, uploadThroughput: 3072000 },
        'wifi': { offline: false, latency: 2, downloadThroughput: 30720000, uploadThroughput: 15360000 },
        'no-throttling': { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }
      };

      const conditions = profiles[profile] || profiles['no-throttling'];
      
      try {
        await this.mainWindow.webContents.session.setNetworkEmulationConditions(conditions);
        this.config.networkThrottling = profile !== 'no-throttling';
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
  }

  /**
   * Initialize dev tools for main window
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    // Setup console message logging
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (this.config.performanceMonitoring || this.isDebugMode) {
        this.addConsoleLog({
          level,
          message,
          line,
          sourceId,
          timestamp: Date.now()
        });
      }
    });

    // Setup render process gone handler
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Renderer process gone:', details);
      this.addConsoleLog({
        level: 3, // Error
        message: `Renderer process gone: ${details.reason}`,
        timestamp: Date.now()
      });
    });

    // Setup unresponsive handler
    mainWindow.on('unresponsive', () => {
      console.error('Window became unresponsive');
      this.addConsoleLog({
        level: 2, // Warning
        message: 'Window became unresponsive',
        timestamp: Date.now()
      });
    });

    // Setup responsive handler
    mainWindow.on('responsive', () => {
      console.log('Window became responsive again');
      this.addConsoleLog({
        level: 1, // Info
        message: 'Window became responsive again',
        timestamp: Date.now()
      });
    });

    // Monitor network requests if enabled
    if (this.config.performanceMonitoring) {
      this.setupNetworkMonitoring(mainWindow);
    }

    // Open dev tools on startup if configured
    if (this.config.enabled && this.config.showOnStartup) {
      setTimeout(() => {
        this.openDevTools();
      }, 1000);
    }

    // Add dev tools menu in development
    if (this.isDevelopment) {
      this.addDevToolsMenu();
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(window: BrowserWindow): void {
    const session = window.webContents.session;

    // Monitor requests
    session.webRequest.onBeforeRequest((details, callback) => {
      this.addNetworkLog({
        type: 'request',
        method: details.method,
        url: details.url,
        timestamp: Date.now()
      });
      callback({});
    });

    // Monitor responses
    session.webRequest.onCompleted((details) => {
      this.addNetworkLog({
        type: 'response',
        url: details.url,
        statusCode: details.statusCode,
        timestamp: Date.now()
      });
    });

    // Monitor errors
    session.webRequest.onErrorOccurred((details) => {
      this.addNetworkLog({
        type: 'error',
        url: details.url,
        error: details.error,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Add dev tools menu items
   */
  private addDevToolsMenu(): void {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;

    const devMenu = new Menu();
    
    devMenu.append(new MenuItem({
      label: 'Toggle Developer Tools',
      accelerator: 'F12',
      click: () => {
        if (this.mainWindow) {
          if (this.mainWindow.webContents.isDevToolsOpened()) {
            this.mainWindow.webContents.closeDevTools();
          } else {
            this.openDevTools();
          }
        }
      }
    }));

    devMenu.append(new MenuItem({
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => {
        if (this.mainWindow) {
          this.mainWindow.webContents.reload();
        }
      }
    }));

    devMenu.append(new MenuItem({
      label: 'Force Reload',
      accelerator: 'CmdOrCtrl+Shift+R',
      click: () => {
        if (this.mainWindow) {
          this.mainWindow.webContents.reloadIgnoringCache();
        }
      }
    }));

    devMenu.append(new MenuItem({ type: 'separator' }));

    devMenu.append(new MenuItem({
      label: 'Inspect Element',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: () => {
        if (this.mainWindow) {
          this.mainWindow.webContents.inspectElement(0, 0);
        }
      }
    }));

    menu.append(new MenuItem({
      label: 'Developer',
      submenu: devMenu
    }));

    Menu.setApplicationMenu(menu);
  }

  /**
   * Open developer tools
   */
  private openDevTools(): void {
    if (!this.mainWindow || !this.canUseDevTools()) {
      return;
    }

    const options: Electron.OpenDevToolsOptions = {
      mode: this.config.detached ? 'detach' : this.config.position as any,
      activate: true
    };

    this.mainWindow.webContents.openDevTools(options);
  }

  /**
   * Check if dev tools can be used
   */
  private canUseDevTools(): boolean {
    return this.isDevelopment || this.isDebugMode || this.config.enabled;
  }

  /**
   * Add log entry with size limit
   */
  private addConsoleLog(entry: any): void {
    this.consoleLog.push(entry);
    if (this.consoleLog.length > this.maxLogSize) {
      this.consoleLog.shift();
    }
  }

  private addNetworkLog(entry: any): void {
    this.networkLog.push(entry);
    if (this.networkLog.length > this.maxLogSize) {
      this.networkLog.shift();
    }
  }

  private addPerformanceLog(entry: any): void {
    this.performanceLog.push(entry);
    if (this.performanceLog.length > this.maxLogSize) {
      this.performanceLog.shift();
    }
  }

  /**
   * Get debug information
   */
  private getDebugInfo(): any {
    return {
      app: {
        version: app.getVersion(),
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        v8: process.versions.v8
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        version: process.getSystemVersion(),
        memory: process.getSystemMemoryInfo()
      },
      paths: {
        userData: app.getPath('userData'),
        temp: app.getPath('temp'),
        exe: app.getPath('exe')
      },
      debug: {
        isDevelopment: this.isDevelopment,
        isDebugMode: this.isDebugMode,
        devToolsEnabled: this.config.enabled
      },
      process: {
        uptime: process.uptime(),
        cpuUsage: process.getCPUUsage(),
        memoryUsage: process.memoryUsage()
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DevToolsConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.mainWindow = null;
    this.consoleLog = [];
    this.networkLog = [];
    this.performanceLog = [];
  }
}

// Export singleton instance
export const devToolsManager = new DevToolsManager();