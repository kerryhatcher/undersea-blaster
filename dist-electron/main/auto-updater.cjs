"use strict";
/**
 * Auto-Updater for Electron Application
 * Handles automatic updates using electron-updater
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoUpdaterManager = exports.AutoUpdaterManager = void 0;
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
class AutoUpdaterManager {
    mainWindow = null;
    isUpdateAvailable = false;
    isDownloading = false;
    updateInfo = null;
    isDevelopment = process.env.NODE_ENV === 'development';
    updateCheckInterval = null;
    constructor() {
        this.configureUpdater();
        this.setupEventHandlers();
        this.setupIpcHandlers();
    }
    /**
     * Configure auto-updater settings
     */
    configureUpdater() {
        // Configure update server
        electron_updater_1.autoUpdater.autoDownload = false; // Manual download control
        electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
        electron_updater_1.autoUpdater.allowPrerelease = false;
        electron_updater_1.autoUpdater.allowDowngrade = false;
        // Set update feed URL
        if (process.platform === 'darwin') {
            // macOS uses different update mechanism
            electron_updater_1.autoUpdater.setFeedURL({
                provider: 'github',
                owner: 'your-github-username',
                repo: 'undersea-blaster'
            });
        }
        else {
            // Windows and Linux
            electron_updater_1.autoUpdater.setFeedURL({
                provider: 'github',
                owner: 'your-github-username',
                repo: 'undersea-blaster'
            });
        }
        // Configure logging
        electron_updater_1.autoUpdater.logger = {
            info: (message) => console.log('[AutoUpdater]', message),
            warn: (message) => console.warn('[AutoUpdater]', message),
            error: (message) => console.error('[AutoUpdater]', message),
            debug: (message) => {
                if (this.isDevelopment) {
                    console.debug('[AutoUpdater]', message);
                }
            }
        };
    }
    /**
     * Setup event handlers for auto-updater
     */
    setupEventHandlers() {
        // Update checking
        electron_updater_1.autoUpdater.on('checking-for-update', () => {
            console.log('Checking for updates...');
            this.sendStatusToWindow('checking-for-update');
        });
        // Update available
        electron_updater_1.autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info.version);
            this.isUpdateAvailable = true;
            this.updateInfo = {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: info.releaseNotes
            };
            this.sendStatusToWindow('update-available', this.updateInfo);
            this.promptUpdateDownload();
        });
        // No update available
        electron_updater_1.autoUpdater.on('update-not-available', (info) => {
            console.log('No updates available');
            this.isUpdateAvailable = false;
            this.sendStatusToWindow('update-not-available');
        });
        // Update error
        electron_updater_1.autoUpdater.on('error', (err) => {
            console.error('Update error:', err);
            this.isDownloading = false;
            this.sendStatusToWindow('update-error', err.message);
            // Notify user in production
            if (!this.isDevelopment && this.mainWindow) {
                electron_1.dialog.showErrorBox('Update Error', 'An error occurred while checking for updates. Please try again later.');
            }
        });
        // Download progress
        electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
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
        electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
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
    setupIpcHandlers() {
        // Check for updates manually
        electron_1.ipcMain.handle('updater:check', async () => {
            if (this.isDevelopment) {
                return { available: false, message: 'Updates disabled in development' };
            }
            try {
                const result = await electron_updater_1.autoUpdater.checkForUpdates();
                return {
                    available: this.isUpdateAvailable,
                    info: this.updateInfo
                };
            }
            catch (error) {
                console.error('Update check failed:', error);
                return {
                    available: false,
                    error: error.message
                };
            }
        });
        // Download update
        electron_1.ipcMain.handle('updater:download', async () => {
            if (!this.isUpdateAvailable || this.isDownloading) {
                return { success: false, message: 'No update available or already downloading' };
            }
            try {
                this.isDownloading = true;
                await electron_updater_1.autoUpdater.downloadUpdate();
                return { success: true };
            }
            catch (error) {
                this.isDownloading = false;
                console.error('Update download failed:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Install update and restart
        electron_1.ipcMain.handle('updater:install', () => {
            if (!this.updateInfo?.downloaded) {
                return { success: false, message: 'No update downloaded' };
            }
            // Save any pending data before restart
            this.sendStatusToWindow('before-quit-for-update');
            // Schedule restart and install
            setTimeout(() => {
                electron_updater_1.autoUpdater.quitAndInstall(false, true);
            }, 1000);
            return { success: true };
        });
        // Get update info
        electron_1.ipcMain.handle('updater:get-info', () => {
            return {
                available: this.isUpdateAvailable,
                downloading: this.isDownloading,
                info: this.updateInfo
            };
        });
        // Configure auto-check
        electron_1.ipcMain.handle('updater:set-auto-check', (event, enabled) => {
            if (enabled) {
                this.startAutoCheck();
            }
            else {
                this.stopAutoCheck();
            }
            return { success: true };
        });
    }
    /**
     * Initialize the auto-updater with main window
     */
    initialize(mainWindow) {
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
    async checkForUpdates() {
        if (this.isDevelopment) {
            console.log('Skipping update check in development');
            return;
        }
        try {
            await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            console.error('Update check error:', error);
        }
    }
    /**
     * Start automatic update checks
     */
    startAutoCheck() {
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
    stopAutoCheck() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
        }
    }
    /**
     * Prompt user to download update
     */
    promptUpdateDownload() {
        if (!this.mainWindow || !this.updateInfo) {
            return;
        }
        const options = {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${this.updateInfo.version}) is available.`,
            detail: this.updateInfo.releaseNotes || 'Would you like to download it now?',
            buttons: ['Download', 'Later'],
            defaultId: 0,
            cancelId: 1
        };
        electron_1.dialog.showMessageBox(this.mainWindow, options).then(result => {
            if (result.response === 0) {
                this.downloadUpdate();
            }
        });
    }
    /**
     * Prompt user to install update
     */
    promptUpdateInstall() {
        if (!this.mainWindow || !this.updateInfo) {
            return;
        }
        const options = {
            type: 'info',
            title: 'Update Ready',
            message: `Version ${this.updateInfo.version} has been downloaded.`,
            detail: 'The application will restart to apply the update. Would you like to install it now?',
            buttons: ['Install and Restart', 'Later'],
            defaultId: 0,
            cancelId: 1
        };
        electron_1.dialog.showMessageBox(this.mainWindow, options).then(result => {
            if (result.response === 0) {
                this.installUpdate();
            }
        });
    }
    /**
     * Download update
     */
    async downloadUpdate() {
        if (!this.isUpdateAvailable || this.isDownloading) {
            return;
        }
        try {
            this.isDownloading = true;
            await electron_updater_1.autoUpdater.downloadUpdate();
        }
        catch (error) {
            this.isDownloading = false;
            console.error('Download error:', error);
        }
    }
    /**
     * Install update and restart
     */
    installUpdate() {
        if (!this.updateInfo?.downloaded) {
            return;
        }
        // Give renderer time to save state
        this.sendStatusToWindow('before-quit-for-update');
        setTimeout(() => {
            electron_updater_1.autoUpdater.quitAndInstall(false, true);
        }, 1000);
    }
    /**
     * Send status to renderer
     */
    sendStatusToWindow(status, data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('updater:status', { status, data });
        }
    }
    /**
     * Clean up
     */
    destroy() {
        this.stopAutoCheck();
        this.mainWindow = null;
    }
}
exports.AutoUpdaterManager = AutoUpdaterManager;
// Export singleton instance
exports.autoUpdaterManager = new AutoUpdaterManager();
