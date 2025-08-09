/**
 * Auto-Updater for Electron Application
 * Handles automatic updates using electron-updater
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
  downloadProgress?: number;
  downloaded?: boolean;
}

export class AutoUpdaterManager {
  private mainWindow: BrowserWindow | null = null;
  private isUpdateAvailable = false;
  private isDownloading = false;
  private updateInfo: UpdateInfo | null = null;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.configureUpdater();
    this.setupEventHandlers();
    this.setupIpcHandlers();
  }

  /**
   * Configure auto-updater settings
   */
  private configureUpdater(): void {
    // Configure update server
    autoUpdater.autoDownload = false; // Manual download control
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;

    // Set update feed URL
    if (process.platform === 'darwin') {
      // macOS uses different update mechanism
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'your-github-username',
        repo: 'undersea-blaster'
      });
    } else {
      // Windows and Linux
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'your-github-username',
        repo: 'undersea-blaster'
      });
    }

    // Configure logging
    autoUpdater.logger = {
      info: (message?: any) => console.log('[AutoUpdater]', message),
      warn: (message?: any) => console.warn('[AutoUpdater]', message),
      error: (message?: any) => console.error('[AutoUpdater]', message),
      debug: (message?: any) => {
        if (this.isDevelopment) {
          console.debug('[AutoUpdater]', message);
        }
      }
    };
  }

  /**
   * Setup event handlers for auto-updater
   */
  private setupEventHandlers(): void {
    // Update checking
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
      this.sendStatusToWindow('checking-for-update');
    });

    // Update available
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      this.isUpdateAvailable = true;
      this.updateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string
      };
      
      this.sendStatusToWindow('update-available', this.updateInfo);
      this.promptUpdateDownload();
    });

    // No update available
    autoUpdater.on('update-not-available', (info) => {
      console.log('No updates available');
      this.isUpdateAvailable = false;
      this.sendStatusToWindow('update-not-available');
    });

    // Update error
    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.isDownloading = false;
      this.sendStatusToWindow('update-error', err.message);
      
      // Notify user in production
      if (!this.isDevelopment && this.mainWindow) {
        dialog.showErrorBox(
          'Update Error',
          'An error occurred while checking for updates. Please try again later.'
        );
      }
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      const progress = Math.round(progressObj.percent);
      
      if (this.updateInfo) {
        this.updateInfo.downloadProgress = progress;
      }
      
      this.sendStatusToWindow('download-progress', {
        percent: progress,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      });

      // Update window progress bar
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(progress / 100);
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      this.isDownloading = false;
      
      if (this.updateInfo) {
        this.updateInfo.downloaded = true;
      }
      
      // Clear progress bar
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(-1);
      }
      
      this.sendStatusToWindow('update-downloaded', this.updateInfo);
      this.promptUpdateInstall();
    });
  }

  /**
   * Setup IPC handlers for renderer communication
   */
  private setupIpcHandlers(): void {
    // Check for updates manually
    ipcMain.handle('updater:check', async () => {
      if (this.isDevelopment) {
        return { available: false, message: 'Updates disabled in development' };
      }
      
      try {
        const result = await autoUpdater.checkForUpdates();
        return {
          available: this.isUpdateAvailable,
          info: this.updateInfo
        };
      } catch (error) {
        console.error('Update check failed:', error);
        return {
          available: false,
          error: (error as Error).message
        };
      }
    });

    // Download update
    ipcMain.handle('updater:download', async () => {
      if (!this.isUpdateAvailable || this.isDownloading) {
        return { success: false, message: 'No update available or already downloading' };
      }
      
      try {
        this.isDownloading = true;
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        this.isDownloading = false;
        console.error('Update download failed:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // Install update and restart
    ipcMain.handle('updater:install', () => {
      if (!this.updateInfo?.downloaded) {
        return { success: false, message: 'No update downloaded' };
      }
      
      // Save any pending data before restart
      this.sendStatusToWindow('before-quit-for-update');
      
      // Schedule restart and install
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true);
      }, 1000);
      
      return { success: true };
    });

    // Get update info
    ipcMain.handle('updater:get-info', () => {
      return {
        available: this.isUpdateAvailable,
        downloading: this.isDownloading,
        info: this.updateInfo
      };
    });

    // Configure auto-check
    ipcMain.handle('updater:set-auto-check', (event, enabled: boolean) => {
      if (enabled) {
        this.startAutoCheck();
      } else {
        this.stopAutoCheck();
      }
      return { success: true };
    });
  }

  /**
   * Initialize the auto-updater with main window
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    
    // Start checking for updates after app is ready
    if (!this.isDevelopment) {
      // Initial check after 5 seconds
      setTimeout(() => {
        this.checkForUpdates();
      }, 5000);
      
      // Start periodic checks
      this.startAutoCheck();
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<void> {
    if (this.isDevelopment) {
      console.log('Skipping update check in development');
      return;
    }
    
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Update check error:', error);
    }
  }

  /**
   * Start automatic update checks
   */
  private startAutoCheck(): void {
    if (this.updateCheckInterval) {
      return;
    }
    
    // Check every 4 hours
    const interval = 4 * 60 * 60 * 1000;
    
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, interval);
  }

  /**
   * Stop automatic update checks
   */
  private stopAutoCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * Prompt user to download update
   */
  private promptUpdateDownload(): void {
    if (!this.mainWindow || !this.updateInfo) {
      return;
    }
    
    const options: Electron.MessageBoxOptions = {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${this.updateInfo.version}) is available.`,
      detail: this.updateInfo.releaseNotes || 'Would you like to download it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    };
    
    dialog.showMessageBox(this.mainWindow, options).then(result => {
      if (result.response === 0) {
        this.downloadUpdate();
      }
    });
  }

  /**
   * Prompt user to install update
   */
  private promptUpdateInstall(): void {
    if (!this.mainWindow || !this.updateInfo) {
      return;
    }
    
    const options: Electron.MessageBoxOptions = {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${this.updateInfo.version} has been downloaded.`,
      detail: 'The application will restart to apply the update. Would you like to install it now?',
      buttons: ['Install and Restart', 'Later'],
      defaultId: 0,
      cancelId: 1
    };
    
    dialog.showMessageBox(this.mainWindow, options).then(result => {
      if (result.response === 0) {
        this.installUpdate();
      }
    });
  }

  /**
   * Download update
   */
  private async downloadUpdate(): Promise<void> {
    if (!this.isUpdateAvailable || this.isDownloading) {
      return;
    }
    
    try {
      this.isDownloading = true;
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.isDownloading = false;
      console.error('Download error:', error);
    }
  }

  /**
   * Install update and restart
   */
  private installUpdate(): void {
    if (!this.updateInfo?.downloaded) {
      return;
    }
    
    // Give renderer time to save state
    this.sendStatusToWindow('before-quit-for-update');
    
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 1000);
  }

  /**
   * Send status to renderer
   */
  private sendStatusToWindow(status: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:status', { status, data });
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.stopAutoCheck();
    this.mainWindow = null;
  }
}

// Export singleton instance
export const autoUpdaterManager = new AutoUpdaterManager();