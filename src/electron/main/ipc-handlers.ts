import { ipcMain, BrowserWindow, app, screen, dialog, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { securityManager } from './security';
import { databaseManager, SaveGame, HighScore, GameStats } from './database';

/**
 * IPC Handlers for secure communication between main and renderer processes
 * All handlers validate inputs and sanitize data
 */

export class IPCHandlers {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.registerHandlers();
    this.initializeDatabase();
  }

  /**
   * Initialize the database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await databaseManager.initialize();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Register all IPC handlers with validation
   */
  private registerHandlers(): void {
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
  private registerSystemHandlers(): void {
    // Toggle fullscreen
    ipcMain.handle('system:toggle-fullscreen', async (event) => {
      if (!this.validateEvent(event)) return;
      
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        const isFullScreen = window.isFullScreen();
        window.setFullScreen(!isFullScreen);
        return !isFullScreen;
      }
      return false;
    });

    // Get display info
    ipcMain.handle('system:get-display-info', async (event) => {
      if (!this.validateEvent(event)) return;
      
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      
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
    ipcMain.handle('system:minimize', async (event) => {
      if (!this.validateEvent(event)) return;
      
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.minimize();
    });

    ipcMain.handle('system:maximize', async (event) => {
      if (!this.validateEvent(event)) return;
      
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        if (window.isMaximized()) {
          window.restore();
        } else {
          window.maximize();
        }
      }
    });

    ipcMain.handle('system:close', async (event) => {
      if (!this.validateEvent(event)) return;
      
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.close();
    });
  }

  /**
   * Game-related IPC handlers
   */
  private registerGameHandlers(): void {
    // Save game state (quick save)
    ipcMain.handle('game:save-state', async (event, data) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize input data
        const sanitizedData = securityManager.sanitizeInput(data);
        
        // Validate data structure
        if (!this.isValidGameData(sanitizedData)) {
          return { success: false, error: 'Invalid game data' };
        }
        
        // Save to quicksave slot
        const success = databaseManager.saveGame('quicksave', {
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
        } else {
          return { success: false, error: 'Failed to save to database' };
        }
      } catch (error) {
        console.error('Save failed:', error);
        return { success: false, error: 'Save failed' };
      }
    });

    // Load game state (quick load)
    ipcMain.handle('game:load-state', async (event) => {
      if (!this.validateEvent(event)) return null;
      
      try {
        // Load from quicksave slot first, or get most recent save
        let saveData = databaseManager.loadGame('quicksave');
        
        if (!saveData) {
          const allSaves = databaseManager.getAllSaves();
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
      } catch (error) {
        console.error('Load failed:', error);
        return null;
      }
    });

    // Get all saves
    ipcMain.handle('game:get-saves', async (event) => {
      if (!this.validateEvent(event)) return [];
      
      try {
        const saves = databaseManager.getAllSaves();
        
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
      } catch (error) {
        console.error('Failed to get saves:', error);
        return [];
      }
    });

    // Delete save
    ipcMain.handle('game:delete-save', async (event, slotName) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize slot name
        const sanitizedSlotName = securityManager.sanitizeInput(slotName);
        if (!sanitizedSlotName || typeof sanitizedSlotName !== 'string') {
          return { success: false, error: 'Invalid slot name' };
        }
        
        const success = databaseManager.deleteSave(sanitizedSlotName);
        
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: 'Save not found or delete failed' };
        }
      } catch (error) {
        console.error('Delete failed:', error);
        return { success: false, error: 'Delete failed' };
      }
    });

    // Save to specific slot
    ipcMain.handle('game:save-to-slot', async (event, { slotName, data }) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize inputs
        const sanitizedSlotName = securityManager.sanitizeInput(slotName);
        const sanitizedData = securityManager.sanitizeInput(data);
        
        if (!sanitizedSlotName || !this.isValidGameData(sanitizedData)) {
          return { success: false, error: 'Invalid input data' };
        }
        
        const success = databaseManager.saveGame(sanitizedSlotName, {
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
        } else {
          return { success: false, error: 'Failed to save to database' };
        }
      } catch (error) {
        console.error('Save to slot failed:', error);
        return { success: false, error: 'Save failed' };
      }
    });

    // Load from specific slot
    ipcMain.handle('game:load-from-slot', async (event, slotName) => {
      if (!this.validateEvent(event)) return null;
      
      try {
        // Sanitize slot name
        const sanitizedSlotName = securityManager.sanitizeInput(slotName);
        if (!sanitizedSlotName || typeof sanitizedSlotName !== 'string') {
          return null;
        }
        
        const saveData = databaseManager.loadGame(sanitizedSlotName);
        
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
      } catch (error) {
        console.error('Load from slot failed:', error);
        return null;
      }
    });

    // Take screenshot
    ipcMain.handle('game:take-screenshot', async (event) => {
      if (!this.validateEvent(event)) return null;
      
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) return null;
        
        const image = await window.webContents.capturePage();
        const screenshotPath = path.join(app.getPath('userData'), 'screenshots');
        await fs.mkdir(screenshotPath, { recursive: true });
        
        const fileName = `screenshot_${Date.now()}.png`;
        const filePath = path.join(screenshotPath, fileName);
        
        await fs.writeFile(filePath, image.toPNG());
        
        return filePath;
      } catch (error) {
        console.error('Screenshot failed:', error);
        return null;
      }
    });

    // Add high score
    ipcMain.handle('highscore:add', async (event, { playerName, score, level, playTime }) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize inputs
        const sanitizedName = securityManager.sanitizeInput(playerName);
        const sanitizedScore = parseInt(score, 10);
        const sanitizedLevel = parseInt(level, 10);
        const sanitizedPlayTime = parseInt(playTime, 10) || 0;
        
        if (!sanitizedName || isNaN(sanitizedScore) || isNaN(sanitizedLevel)) {
          return { success: false, error: 'Invalid data' };
        }
        
        const success = databaseManager.addHighScore({
          playerName: sanitizedName,
          score: sanitizedScore,
          level: sanitizedLevel,
          playTime: sanitizedPlayTime,
          timestamp: Date.now()
        });
        
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: 'Failed to save high score' };
        }
      } catch (error) {
        console.error('Failed to add high score:', error);
        return { success: false, error: 'Save failed' };
      }
    });

    // Get high scores
    ipcMain.handle('highscore:get', async (event, limit = 10) => {
      if (!this.validateEvent(event)) return [];
      
      try {
        const sanitizedLimit = parseInt(limit, 10) || 10;
        const scores = databaseManager.getHighScores(Math.min(sanitizedLimit, 100)); // Cap at 100
        
        return scores.map(score => ({
          id: score.id,
          name: score.playerName,
          score: score.score,
          level: score.level,
          playTime: score.playTime,
          timestamp: score.timestamp
        }));
      } catch (error) {
        console.error('Failed to get high scores:', error);
        return [];
      }
    });

    // Legacy high score handlers (for backwards compatibility)
    ipcMain.handle('game:get-high-scores', async (event) => {
      if (!this.validateEvent(event)) return [];
      
      try {
        const scores = databaseManager.getHighScores(10);
        
        // Convert to legacy format
        return scores.map(score => ({
          name: score.playerName,
          score: score.score,
          timestamp: score.timestamp
        }));
      } catch (error) {
        console.error('Failed to get high scores:', error);
        return [];
      }
    });

    ipcMain.handle('game:save-high-score', async (event, { score, name }) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize inputs
        const sanitizedName = securityManager.sanitizeInput(name);
        const sanitizedScore = parseInt(score, 10);
        
        if (!sanitizedName || isNaN(sanitizedScore)) {
          return { success: false, error: 'Invalid data' };
        }
        
        const success = databaseManager.addHighScore({
          playerName: sanitizedName,
          score: sanitizedScore,
          level: 1, // Default level for legacy saves
          playTime: 0, // Default play time
          timestamp: Date.now()
        });
        
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: 'Failed to save high score' };
        }
      } catch (error) {
        console.error('Failed to save high score:', error);
        return { success: false, error: 'Save failed' };
      }
    });
  }

  /**
   * Settings-related IPC handlers
   */
  private registerSettingsHandlers(): void {
    // Get setting
    ipcMain.handle('settings:get', async (event, key) => {
      if (!this.validateEvent(event)) return null;
      
      try {
        const sanitizedKey = securityManager.sanitizeInput(key);
        if (!sanitizedKey || typeof sanitizedKey !== 'string') {
          return null;
        }
        
        return databaseManager.getSetting(sanitizedKey);
      } catch (error) {
        console.error('Failed to get setting:', error);
        return null;
      }
    });

    // Set setting
    ipcMain.handle('settings:set', async (event, key, value) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize inputs
        const sanitizedKey = securityManager.sanitizeInput(key);
        const sanitizedValue = securityManager.sanitizeInput(value);
        
        if (!sanitizedKey || typeof sanitizedKey !== 'string') {
          return { success: false, error: 'Invalid key' };
        }
        
        const success = databaseManager.setSetting(sanitizedKey, String(sanitizedValue));
        
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: 'Failed to save setting' };
        }
      } catch (error) {
        console.error('Failed to set setting:', error);
        return { success: false, error: 'Save failed' };
      }
    });

    // Get all settings
    ipcMain.handle('settings:get-all', async (event) => {
      if (!this.validateEvent(event)) return {};
      
      try {
        return databaseManager.getAllSettings();
      } catch (error) {
        console.error('Failed to get all settings:', error);
        return {};
      }
    });

    // Game statistics handlers
    ipcMain.handle('stats:update', async (event, updates) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize updates object
        const sanitizedUpdates = securityManager.sanitizeInput(updates);
        
        if (!sanitizedUpdates || typeof sanitizedUpdates !== 'object') {
          return { success: false, error: 'Invalid update data' };
        }
        
        const success = databaseManager.updateGameStats(sanitizedUpdates);
        
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: 'Failed to update statistics' };
        }
      } catch (error) {
        console.error('Failed to update stats:', error);
        return { success: false, error: 'Update failed' };
      }
    });

    ipcMain.handle('stats:get', async (event) => {
      if (!this.validateEvent(event)) return null;
      
      try {
        return databaseManager.getGameStats();
      } catch (error) {
        console.error('Failed to get stats:', error);
        return null;
      }
    });
  }

  /**
   * Validate that the event comes from our renderer
   */
  private validateEvent(event: Electron.IpcMainInvokeEvent): boolean {
    // Check if sender is from our window
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window !== this.mainWindow) {
      console.error('IPC request from unknown window');
      return false;
    }
    
    return true;
  }

  /**
   * Validate game data structure
   */
  private isValidGameData(data: any): boolean {
    // Basic validation - expand based on actual game data structure
    if (!data || typeof data !== 'object') return false;
    
    // Check for expected properties (using both old and new property names for compatibility)
    const requiredProps = ['score', 'level'];
    for (const prop of requiredProps) {
      if (!(prop in data)) return false;
    }
    
    // Check for health property (support both playerHealth and playerMaxHealth)
    const hasHealth = 'playerHealth' in data || 'playerMaxHealth' in data;
    if (!hasHealth) return false;
    
    // Validate data types
    if (typeof data.score !== 'number' || data.score < 0) return false;
    if (typeof data.level !== 'number' || data.level < 1) return false;
    
    if ('playerHealth' in data && (typeof data.playerHealth !== 'number' || data.playerHealth < 0)) {
      return false;
    }
    
    if ('playerMaxHealth' in data && (typeof data.playerMaxHealth !== 'number' || data.playerMaxHealth < 0)) {
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
export const ipcHandlers = new IPCHandlers();