import { ipcMain, BrowserWindow, app, screen, dialog, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { securityManager } from './security';

/**
 * IPC Handlers for secure communication between main and renderer processes
 * All handlers validate inputs and sanitize data
 */

export class IPCHandlers {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.registerHandlers();
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
    // Save game state
    ipcMain.handle('game:save-state', async (event, data) => {
      if (!this.validateEvent(event)) return { success: false, error: 'Invalid request' };
      
      try {
        // Sanitize input data
        const sanitizedData = securityManager.sanitizeInput(data);
        
        // Validate data structure
        if (!this.isValidGameData(sanitizedData)) {
          return { success: false, error: 'Invalid game data' };
        }
        
        // Save to user data directory
        const savePath = path.join(app.getPath('userData'), 'saves');
        await fs.mkdir(savePath, { recursive: true });
        
        const fileName = `save_${Date.now()}.json`;
        const filePath = path.join(savePath, fileName);
        
        await fs.writeFile(filePath, JSON.stringify(sanitizedData, null, 2));
        
        return { success: true, fileName };
      } catch (error) {
        console.error('Save failed:', error);
        return { success: false, error: 'Save failed' };
      }
    });

    // Load game state
    ipcMain.handle('game:load-state', async (event) => {
      if (!this.validateEvent(event)) return null;
      
      try {
        const savePath = path.join(app.getPath('userData'), 'saves');
        
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
      } catch (error) {
        console.error('Load failed:', error);
        return null;
      }
    });

    // Get all saves
    ipcMain.handle('game:get-saves', async (event) => {
      if (!this.validateEvent(event)) return [];
      
      try {
        const savePath = path.join(app.getPath('userData'), 'saves');
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
      } catch (error) {
        console.error('Failed to get saves:', error);
        return [];
      }
    });

    // Delete save
    ipcMain.handle('game:delete-save', async (event, saveId) => {
      if (!this.validateEvent(event)) return { success: false };
      
      try {
        // Sanitize saveId to prevent path traversal
        const sanitizedId = path.basename(saveId);
        if (!sanitizedId.startsWith('save_') || !sanitizedId.endsWith('.json')) {
          return { success: false, error: 'Invalid save ID' };
        }
        
        const savePath = path.join(app.getPath('userData'), 'saves', sanitizedId);
        await fs.unlink(savePath);
        
        return { success: true };
      } catch (error) {
        console.error('Delete failed:', error);
        return { success: false, error: 'Delete failed' };
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

    // High scores
    ipcMain.handle('game:get-high-scores', async (event) => {
      if (!this.validateEvent(event)) return [];
      
      try {
        const scoresPath = path.join(app.getPath('userData'), 'highscores.json');
        const data = await fs.readFile(scoresPath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        // Return empty array if file doesn't exist
        return [];
      }
    });

    ipcMain.handle('game:save-high-score', async (event, { score, name }) => {
      if (!this.validateEvent(event)) return { success: false };
      
      try {
        // Sanitize inputs
        const sanitizedName = securityManager.sanitizeInput(name);
        const sanitizedScore = parseInt(score, 10);
        
        if (!sanitizedName || isNaN(sanitizedScore)) {
          return { success: false, error: 'Invalid data' };
        }
        
        const scoresPath = path.join(app.getPath('userData'), 'highscores.json');
        
        let scores = [];
        try {
          const data = await fs.readFile(scoresPath, 'utf-8');
          scores = JSON.parse(data);
        } catch {
          // File doesn't exist yet
        }
        
        scores.push({
          name: sanitizedName.slice(0, 50), // Limit name length
          score: sanitizedScore,
          timestamp: Date.now()
        });
        
        // Keep top 10 scores
        scores.sort((a: any, b: any) => b.score - a.score);
        scores = scores.slice(0, 10);
        
        await fs.writeFile(scoresPath, JSON.stringify(scores, null, 2));
        
        return { success: true };
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
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    
    // Get setting
    ipcMain.handle('settings:get', async (event, key) => {
      if (!this.validateEvent(event)) return null;
      
      try {
        const data = await fs.readFile(settingsPath, 'utf-8');
        const settings = JSON.parse(data);
        return settings[key];
      } catch {
        return null;
      }
    });

    // Set setting
    ipcMain.handle('settings:set', async (event, key, value) => {
      if (!this.validateEvent(event)) return { success: false };
      
      try {
        let settings = {};
        try {
          const data = await fs.readFile(settingsPath, 'utf-8');
          settings = JSON.parse(data);
        } catch {
          // File doesn't exist yet
        }
        
        // Sanitize inputs
        const sanitizedKey = securityManager.sanitizeInput(key);
        const sanitizedValue = securityManager.sanitizeInput(value);
        
        (settings as any)[sanitizedKey] = sanitizedValue;
        
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        
        return { success: true };
      } catch (error) {
        console.error('Failed to save setting:', error);
        return { success: false };
      }
    });

    // Get all settings
    ipcMain.handle('settings:get-all', async (event) => {
      if (!this.validateEvent(event)) return {};
      
      try {
        const data = await fs.readFile(settingsPath, 'utf-8');
        return JSON.parse(data);
      } catch {
        return {};
      }
    });

    // Reset settings
    ipcMain.handle('settings:reset', async (event) => {
      if (!this.validateEvent(event)) return { success: false };
      
      try {
        await fs.unlink(settingsPath);
        return { success: true };
      } catch {
        return { success: true }; // Consider it success if file doesn't exist
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
    
    // Check for expected properties
    const expectedProps = ['score', 'level', 'playerHealth'];
    for (const prop of expectedProps) {
      if (!(prop in data)) return false;
    }
    
    // Validate data types
    if (typeof data.score !== 'number' || data.score < 0) return false;
    if (typeof data.level !== 'number' || data.level < 1) return false;
    if (typeof data.playerHealth !== 'number' || data.playerHealth < 0) return false;
    
    return true;
  }
}

// Export singleton instance
export const ipcHandlers = new IPCHandlers();