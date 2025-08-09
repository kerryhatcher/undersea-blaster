"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcHandlers = exports.IPCHandlers = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const security_1 = require("./security.cjs");
/**
 * IPC Handlers for secure communication between main and renderer processes
 * All handlers validate inputs and sanitize data
 */
class IPCHandlers {
    mainWindow = null;
    constructor() {
        this.registerHandlers();
    }
    setMainWindow(window) {
        this.mainWindow = window;
    }
    /**
     * Register all IPC handlers with validation
     */
    registerHandlers() {
        // System handlers
        this.registerSystemHandlers();
        // Game handlers
        this.registerGameHandlers();
        // Settings handlers
        this.registerSettingsHandlers();
    }
    /**
     * System-related IPC handlers
     */
    registerSystemHandlers() {
        // Toggle fullscreen
        electron_1.ipcMain.handle('system:toggle-fullscreen', async (event) => {
            if (!this.validateEvent(event))
                return;
            const window = electron_1.BrowserWindow.fromWebContents(event.sender);
            if (window) {
                const isFullScreen = window.isFullScreen();
                window.setFullScreen(!isFullScreen);
                return !isFullScreen;
            }
            return false;
        });
        // Get display info
        electron_1.ipcMain.handle('system:get-display-info', async (event) => {
            if (!this.validateEvent(event))
                return;
            const displays = electron_1.screen.getAllDisplays();
            const primaryDisplay = electron_1.screen.getPrimaryDisplay();
            return {
                primary: {
                    width: primaryDisplay.workAreaSize.width,
                    height: primaryDisplay.workAreaSize.height,
                    scaleFactor: primaryDisplay.scaleFactor
                },
                all: displays.map(d => ({
                    id: d.id,
                    width: d.workAreaSize.width,
                    height: d.workAreaSize.height,
                    scaleFactor: d.scaleFactor
                }))
            };
        });
        // Window controls
        electron_1.ipcMain.handle('system:minimize', async (event) => {
            if (!this.validateEvent(event))
                return;
            const window = electron_1.BrowserWindow.fromWebContents(event.sender);
            window?.minimize();
        });
        electron_1.ipcMain.handle('system:maximize', async (event) => {
            if (!this.validateEvent(event))
                return;
            const window = electron_1.BrowserWindow.fromWebContents(event.sender);
            if (window) {
                if (window.isMaximized()) {
                    window.restore();
                }
                else {
                    window.maximize();
                }
            }
        });
        electron_1.ipcMain.handle('system:close', async (event) => {
            if (!this.validateEvent(event))
                return;
            const window = electron_1.BrowserWindow.fromWebContents(event.sender);
            window?.close();
        });
    }
    /**
     * Game-related IPC handlers
     */
    registerGameHandlers() {
        // Save game state
        electron_1.ipcMain.handle('game:save-state', async (event, data) => {
            if (!this.validateEvent(event))
                return { success: false, error: 'Invalid request' };
            try {
                // Sanitize input data
                const sanitizedData = security_1.securityManager.sanitizeInput(data);
                // Validate data structure
                if (!this.isValidGameData(sanitizedData)) {
                    return { success: false, error: 'Invalid game data' };
                }
                // Save to user data directory
                const savePath = path.join(electron_1.app.getPath('userData'), 'saves');
                await fs.mkdir(savePath, { recursive: true });
                const fileName = `save_${Date.now()}.json`;
                const filePath = path.join(savePath, fileName);
                await fs.writeFile(filePath, JSON.stringify(sanitizedData, null, 2));
                return { success: true, fileName };
            }
            catch (error) {
                console.error('Save failed:', error);
                return { success: false, error: 'Save failed' };
            }
        });
        // Load game state
        electron_1.ipcMain.handle('game:load-state', async (event) => {
            if (!this.validateEvent(event))
                return null;
            try {
                const savePath = path.join(electron_1.app.getPath('userData'), 'saves');
                // Get most recent save
                const files = await fs.readdir(savePath);
                const saveFiles = files.filter(f => f.startsWith('save_') && f.endsWith('.json'));
                if (saveFiles.length === 0) {
                    return null;
                }
                saveFiles.sort((a, b) => b.localeCompare(a));
                const latestSave = saveFiles[0];
                const data = await fs.readFile(path.join(savePath, latestSave), 'utf-8');
                return JSON.parse(data);
            }
            catch (error) {
                console.error('Load failed:', error);
                return null;
            }
        });
        // Get all saves
        electron_1.ipcMain.handle('game:get-saves', async (event) => {
            if (!this.validateEvent(event))
                return [];
            try {
                const savePath = path.join(electron_1.app.getPath('userData'), 'saves');
                await fs.mkdir(savePath, { recursive: true });
                const files = await fs.readdir(savePath);
                const saveFiles = files.filter(f => f.startsWith('save_') && f.endsWith('.json'));
                const saves = await Promise.all(saveFiles.map(async (file) => {
                    const filePath = path.join(savePath, file);
                    const stats = await fs.stat(filePath);
                    const data = await fs.readFile(filePath, 'utf-8');
                    const gameData = JSON.parse(data);
                    return {
                        id: file,
                        timestamp: stats.mtime,
                        data: gameData
                    };
                }));
                return saves.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            }
            catch (error) {
                console.error('Failed to get saves:', error);
                return [];
            }
        });
        // Delete save
        electron_1.ipcMain.handle('game:delete-save', async (event, saveId) => {
            if (!this.validateEvent(event))
                return { success: false };
            try {
                // Sanitize saveId to prevent path traversal
                const sanitizedId = path.basename(saveId);
                if (!sanitizedId.startsWith('save_') || !sanitizedId.endsWith('.json')) {
                    return { success: false, error: 'Invalid save ID' };
                }
                const savePath = path.join(electron_1.app.getPath('userData'), 'saves', sanitizedId);
                await fs.unlink(savePath);
                return { success: true };
            }
            catch (error) {
                console.error('Delete failed:', error);
                return { success: false, error: 'Delete failed' };
            }
        });
        // Take screenshot
        electron_1.ipcMain.handle('game:take-screenshot', async (event) => {
            if (!this.validateEvent(event))
                return null;
            try {
                const window = electron_1.BrowserWindow.fromWebContents(event.sender);
                if (!window)
                    return null;
                const image = await window.webContents.capturePage();
                const screenshotPath = path.join(electron_1.app.getPath('userData'), 'screenshots');
                await fs.mkdir(screenshotPath, { recursive: true });
                const fileName = `screenshot_${Date.now()}.png`;
                const filePath = path.join(screenshotPath, fileName);
                await fs.writeFile(filePath, image.toPNG());
                return filePath;
            }
            catch (error) {
                console.error('Screenshot failed:', error);
                return null;
            }
        });
        // High scores
        electron_1.ipcMain.handle('game:get-high-scores', async (event) => {
            if (!this.validateEvent(event))
                return [];
            try {
                const scoresPath = path.join(electron_1.app.getPath('userData'), 'highscores.json');
                const data = await fs.readFile(scoresPath, 'utf-8');
                return JSON.parse(data);
            }
            catch (error) {
                // Return empty array if file doesn't exist
                return [];
            }
        });
        electron_1.ipcMain.handle('game:save-high-score', async (event, { score, name }) => {
            if (!this.validateEvent(event))
                return { success: false };
            try {
                // Sanitize inputs
                const sanitizedName = security_1.securityManager.sanitizeInput(name);
                const sanitizedScore = parseInt(score, 10);
                if (!sanitizedName || isNaN(sanitizedScore)) {
                    return { success: false, error: 'Invalid data' };
                }
                const scoresPath = path.join(electron_1.app.getPath('userData'), 'highscores.json');
                let scores = [];
                try {
                    const data = await fs.readFile(scoresPath, 'utf-8');
                    scores = JSON.parse(data);
                }
                catch {
                    // File doesn't exist yet
                }
                scores.push({
                    name: sanitizedName.slice(0, 50), // Limit name length
                    score: sanitizedScore,
                    timestamp: Date.now()
                });
                // Keep top 10 scores
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 10);
                await fs.writeFile(scoresPath, JSON.stringify(scores, null, 2));
                return { success: true };
            }
            catch (error) {
                console.error('Failed to save high score:', error);
                return { success: false, error: 'Save failed' };
            }
        });
    }
    /**
     * Settings-related IPC handlers
     */
    registerSettingsHandlers() {
        const settingsPath = path.join(electron_1.app.getPath('userData'), 'settings.json');
        // Get setting
        electron_1.ipcMain.handle('settings:get', async (event, key) => {
            if (!this.validateEvent(event))
                return null;
            try {
                const data = await fs.readFile(settingsPath, 'utf-8');
                const settings = JSON.parse(data);
                return settings[key];
            }
            catch {
                return null;
            }
        });
        // Set setting
        electron_1.ipcMain.handle('settings:set', async (event, key, value) => {
            if (!this.validateEvent(event))
                return { success: false };
            try {
                let settings = {};
                try {
                    const data = await fs.readFile(settingsPath, 'utf-8');
                    settings = JSON.parse(data);
                }
                catch {
                    // File doesn't exist yet
                }
                // Sanitize inputs
                const sanitizedKey = security_1.securityManager.sanitizeInput(key);
                const sanitizedValue = security_1.securityManager.sanitizeInput(value);
                settings[sanitizedKey] = sanitizedValue;
                await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
                return { success: true };
            }
            catch (error) {
                console.error('Failed to save setting:', error);
                return { success: false };
            }
        });
        // Get all settings
        electron_1.ipcMain.handle('settings:get-all', async (event) => {
            if (!this.validateEvent(event))
                return {};
            try {
                const data = await fs.readFile(settingsPath, 'utf-8');
                return JSON.parse(data);
            }
            catch {
                return {};
            }
        });
        // Reset settings
        electron_1.ipcMain.handle('settings:reset', async (event) => {
            if (!this.validateEvent(event))
                return { success: false };
            try {
                await fs.unlink(settingsPath);
                return { success: true };
            }
            catch {
                return { success: true }; // Consider it success if file doesn't exist
            }
        });
    }
    /**
     * Validate that the event comes from our renderer
     */
    validateEvent(event) {
        // Check if sender is from our window
        const window = electron_1.BrowserWindow.fromWebContents(event.sender);
        if (!window || window !== this.mainWindow) {
            console.error('IPC request from unknown window');
            return false;
        }
        return true;
    }
    /**
     * Validate game data structure
     */
    isValidGameData(data) {
        // Basic validation - expand based on actual game data structure
        if (!data || typeof data !== 'object')
            return false;
        // Check for expected properties
        const expectedProps = ['score', 'level', 'playerHealth'];
        for (const prop of expectedProps) {
            if (!(prop in data))
                return false;
        }
        // Validate data types
        if (typeof data.score !== 'number' || data.score < 0)
            return false;
        if (typeof data.level !== 'number' || data.level < 1)
            return false;
        if (typeof data.playerHealth !== 'number' || data.playerHealth < 0)
            return false;
        return true;
    }
}
exports.IPCHandlers = IPCHandlers;
// Export singleton instance
exports.ipcHandlers = new IPCHandlers();
