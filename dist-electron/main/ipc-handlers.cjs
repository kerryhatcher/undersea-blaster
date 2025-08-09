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
const database_1 = require("./database.cjs");
/**
 * IPC Handlers for secure communication between main and renderer processes
 * All handlers validate inputs and sanitize data
 */
class IPCHandlers {
    mainWindow = null;
    constructor() {
        this.registerHandlers();
        this.initializeDatabase();
    }
    /**
     * Initialize the database
     */
    async initializeDatabase() {
        try {
            await database_1.databaseManager.initialize();
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
        }
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
        // Save game state (quick save)
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
                // Save to quicksave slot
                const success = database_1.databaseManager.saveGame('quicksave', {
                    score: sanitizedData.score,
                    level: sanitizedData.level,
                    playerHits: sanitizedData.playerHealth || 0,
                    playerMaxHits: sanitizedData.playerMaxHealth || 100,
                    bazookaActive: sanitizedData.bazookaActive || false,
                    shotgunActive: sanitizedData.shotgunActive || false,
                    laserActive: sanitizedData.laserActive || false,
                    nextUpgradeAt: sanitizedData.nextUpgradeAt || 0,
                    playTime: sanitizedData.playTime || 0
                });
                if (success) {
                    return { success: true, slotName: 'quicksave' };
                }
                else {
                    return { success: false, error: 'Failed to save to database' };
                }
            }
            catch (error) {
                console.error('Save failed:', error);
                return { success: false, error: 'Save failed' };
            }
        });
        // Load game state (quick load)
        electron_1.ipcMain.handle('game:load-state', async (event) => {
            if (!this.validateEvent(event))
                return null;
            try {
                // Load from quicksave slot first, or get most recent save
                let saveData = database_1.databaseManager.loadGame('quicksave');
                if (!saveData) {
                    const allSaves = database_1.databaseManager.getAllSaves();
                    if (allSaves.length > 0) {
                        saveData = allSaves[0]; // Most recent save
                    }
                }
                if (!saveData) {
                    return null;
                }
                // Convert to expected format
                return {
                    score: saveData.score,
                    level: saveData.level,
                    playerHealth: saveData.playerHits,
                    playerMaxHealth: saveData.playerMaxHits,
                    bazookaActive: saveData.bazookaActive,
                    shotgunActive: saveData.shotgunActive,
                    laserActive: saveData.laserActive,
                    nextUpgradeAt: saveData.nextUpgradeAt,
                    playTime: saveData.playTime
                };
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
                const saves = database_1.databaseManager.getAllSaves();
                return saves.map(save => ({
                    id: save.id,
                    slotName: save.slotName,
                    timestamp: save.timestamp,
                    data: {
                        score: save.score,
                        level: save.level,
                        playerHealth: save.playerHits,
                        playerMaxHealth: save.playerMaxHits,
                        bazookaActive: save.bazookaActive,
                        shotgunActive: save.shotgunActive,
                        laserActive: save.laserActive,
                        nextUpgradeAt: save.nextUpgradeAt,
                        playTime: save.playTime
                    }
                }));
            }
            catch (error) {
                console.error('Failed to get saves:', error);
                return [];
            }
        });
        // Delete save
        electron_1.ipcMain.handle('game:delete-save', async (event, slotName) => {
            if (!this.validateEvent(event))
                return { success: false, error: 'Invalid request' };
            try {
                // Sanitize slot name
                const sanitizedSlotName = security_1.securityManager.sanitizeInput(slotName);
                if (!sanitizedSlotName || typeof sanitizedSlotName !== 'string') {
                    return { success: false, error: 'Invalid slot name' };
                }
                const success = database_1.databaseManager.deleteSave(sanitizedSlotName);
                if (success) {
                    return { success: true };
                }
                else {
                    return { success: false, error: 'Save not found or delete failed' };
                }
            }
            catch (error) {
                console.error('Delete failed:', error);
                return { success: false, error: 'Delete failed' };
            }
        });
        // Save to specific slot
        electron_1.ipcMain.handle('game:save-to-slot', async (event, { slotName, data }) => {
            if (!this.validateEvent(event))
                return { success: false, error: 'Invalid request' };
            try {
                // Sanitize inputs
                const sanitizedSlotName = security_1.securityManager.sanitizeInput(slotName);
                const sanitizedData = security_1.securityManager.sanitizeInput(data);
                if (!sanitizedSlotName || !this.isValidGameData(sanitizedData)) {
                    return { success: false, error: 'Invalid input data' };
                }
                const success = database_1.databaseManager.saveGame(sanitizedSlotName, {
                    score: sanitizedData.score,
                    level: sanitizedData.level,
                    playerHits: sanitizedData.playerHealth || 0,
                    playerMaxHits: sanitizedData.playerMaxHealth || 100,
                    bazookaActive: sanitizedData.bazookaActive || false,
                    shotgunActive: sanitizedData.shotgunActive || false,
                    laserActive: sanitizedData.laserActive || false,
                    nextUpgradeAt: sanitizedData.nextUpgradeAt || 0,
                    playTime: sanitizedData.playTime || 0
                });
                if (success) {
                    return { success: true, slotName: sanitizedSlotName };
                }
                else {
                    return { success: false, error: 'Failed to save to database' };
                }
            }
            catch (error) {
                console.error('Save to slot failed:', error);
                return { success: false, error: 'Save failed' };
            }
        });
        // Load from specific slot
        electron_1.ipcMain.handle('game:load-from-slot', async (event, slotName) => {
            if (!this.validateEvent(event))
                return null;
            try {
                // Sanitize slot name
                const sanitizedSlotName = security_1.securityManager.sanitizeInput(slotName);
                if (!sanitizedSlotName || typeof sanitizedSlotName !== 'string') {
                    return null;
                }
                const saveData = database_1.databaseManager.loadGame(sanitizedSlotName);
                if (!saveData) {
                    return null;
                }
                // Convert to expected format
                return {
                    score: saveData.score,
                    level: saveData.level,
                    playerHealth: saveData.playerHits,
                    playerMaxHealth: saveData.playerMaxHits,
                    bazookaActive: saveData.bazookaActive,
                    shotgunActive: saveData.shotgunActive,
                    laserActive: saveData.laserActive,
                    nextUpgradeAt: saveData.nextUpgradeAt,
                    playTime: saveData.playTime
                };
            }
            catch (error) {
                console.error('Load from slot failed:', error);
                return null;
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
        // Add high score
        electron_1.ipcMain.handle('highscore:add', async (event, { playerName, score, level, playTime }) => {
            if (!this.validateEvent(event))
                return { success: false, error: 'Invalid request' };
            try {
                // Sanitize inputs
                const sanitizedName = security_1.securityManager.sanitizeInput(playerName);
                const sanitizedScore = parseInt(score, 10);
                const sanitizedLevel = parseInt(level, 10);
                const sanitizedPlayTime = parseInt(playTime, 10) || 0;
                if (!sanitizedName || isNaN(sanitizedScore) || isNaN(sanitizedLevel)) {
                    return { success: false, error: 'Invalid data' };
                }
                const success = database_1.databaseManager.addHighScore({
                    playerName: sanitizedName,
                    score: sanitizedScore,
                    level: sanitizedLevel,
                    playTime: sanitizedPlayTime,
                    timestamp: Date.now()
                });
                if (success) {
                    return { success: true };
                }
                else {
                    return { success: false, error: 'Failed to save high score' };
                }
            }
            catch (error) {
                console.error('Failed to add high score:', error);
                return { success: false, error: 'Save failed' };
            }
        });
        // Get high scores
        electron_1.ipcMain.handle('highscore:get', async (event, limit = 10) => {
            if (!this.validateEvent(event))
                return [];
            try {
                const sanitizedLimit = parseInt(limit, 10) || 10;
                const scores = database_1.databaseManager.getHighScores(Math.min(sanitizedLimit, 100)); // Cap at 100
                return scores.map(score => ({
                    id: score.id,
                    name: score.playerName,
                    score: score.score,
                    level: score.level,
                    playTime: score.playTime,
                    timestamp: score.timestamp
                }));
            }
            catch (error) {
                console.error('Failed to get high scores:', error);
                return [];
            }
        });
        // Legacy high score handlers (for backwards compatibility)
        electron_1.ipcMain.handle('game:get-high-scores', async (event) => {
            if (!this.validateEvent(event))
                return [];
            try {
                const scores = database_1.databaseManager.getHighScores(10);
                // Convert to legacy format
                return scores.map(score => ({
                    name: score.playerName,
                    score: score.score,
                    timestamp: score.timestamp
                }));
            }
            catch (error) {
                console.error('Failed to get high scores:', error);
                return [];
            }
        });
        electron_1.ipcMain.handle('game:save-high-score', async (event, { score, name }) => {
            if (!this.validateEvent(event))
                return { success: false, error: 'Invalid request' };
            try {
                // Sanitize inputs
                const sanitizedName = security_1.securityManager.sanitizeInput(name);
                const sanitizedScore = parseInt(score, 10);
                if (!sanitizedName || isNaN(sanitizedScore)) {
                    return { success: false, error: 'Invalid data' };
                }
                const success = database_1.databaseManager.addHighScore({
                    playerName: sanitizedName,
                    score: sanitizedScore,
                    level: 1, // Default level for legacy saves
                    playTime: 0, // Default play time
                    timestamp: Date.now()
                });
                if (success) {
                    return { success: true };
                }
                else {
                    return { success: false, error: 'Failed to save high score' };
                }
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
        // Get setting
        electron_1.ipcMain.handle('settings:get', async (event, key) => {
            if (!this.validateEvent(event))
                return null;
            try {
                const sanitizedKey = security_1.securityManager.sanitizeInput(key);
                if (!sanitizedKey || typeof sanitizedKey !== 'string') {
                    return null;
                }
                return database_1.databaseManager.getSetting(sanitizedKey);
            }
            catch (error) {
                console.error('Failed to get setting:', error);
                return null;
            }
        });
        // Set setting
        electron_1.ipcMain.handle('settings:set', async (event, key, value) => {
            if (!this.validateEvent(event))
                return { success: false, error: 'Invalid request' };
            try {
                // Sanitize inputs
                const sanitizedKey = security_1.securityManager.sanitizeInput(key);
                const sanitizedValue = security_1.securityManager.sanitizeInput(value);
                if (!sanitizedKey || typeof sanitizedKey !== 'string') {
                    return { success: false, error: 'Invalid key' };
                }
                const success = database_1.databaseManager.setSetting(sanitizedKey, String(sanitizedValue));
                if (success) {
                    return { success: true };
                }
                else {
                    return { success: false, error: 'Failed to save setting' };
                }
            }
            catch (error) {
                console.error('Failed to set setting:', error);
                return { success: false, error: 'Save failed' };
            }
        });
        // Get all settings
        electron_1.ipcMain.handle('settings:get-all', async (event) => {
            if (!this.validateEvent(event))
                return {};
            try {
                return database_1.databaseManager.getAllSettings();
            }
            catch (error) {
                console.error('Failed to get all settings:', error);
                return {};
            }
        });
        // Game statistics handlers
        electron_1.ipcMain.handle('stats:update', async (event, updates) => {
            if (!this.validateEvent(event))
                return { success: false, error: 'Invalid request' };
            try {
                // Sanitize updates object
                const sanitizedUpdates = security_1.securityManager.sanitizeInput(updates);
                if (!sanitizedUpdates || typeof sanitizedUpdates !== 'object') {
                    return { success: false, error: 'Invalid update data' };
                }
                const success = database_1.databaseManager.updateGameStats(sanitizedUpdates);
                if (success) {
                    return { success: true };
                }
                else {
                    return { success: false, error: 'Failed to update statistics' };
                }
            }
            catch (error) {
                console.error('Failed to update stats:', error);
                return { success: false, error: 'Update failed' };
            }
        });
        electron_1.ipcMain.handle('stats:get', async (event) => {
            if (!this.validateEvent(event))
                return null;
            try {
                return database_1.databaseManager.getGameStats();
            }
            catch (error) {
                console.error('Failed to get stats:', error);
                return null;
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
        // Check for expected properties (using both old and new property names for compatibility)
        const requiredProps = ['score', 'level'];
        for (const prop of requiredProps) {
            if (!(prop in data))
                return false;
        }
        // Check for health property (support both playerHealth and playerMaxHealth)
        const hasHealth = 'playerHealth' in data || 'playerMaxHealth' in data;
        if (!hasHealth)
            return false;
        // Validate data types
        if (typeof data.score !== 'number' || data.score < 0)
            return false;
        if (typeof data.level !== 'number' || data.level < 1)
            return false;
        if ('playerHealth' in data && (typeof data.playerHealth !== 'number' || data.playerHealth < 0)) {
            return false;
        }
        if ('playerMaxHealth' in data && (typeof data.playerMaxHealth !== 'number' || data.playerMaxHealth < 0)) {
            return false;
        }
        return true;
    }
}
exports.IPCHandlers = IPCHandlers;
// Export singleton instance
exports.ipcHandlers = new IPCHandlers();
