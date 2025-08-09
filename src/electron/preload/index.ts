import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // System information and controls
  system: {
    getPlatform: () => process.platform,
    getVersion: () => process.versions.electron,
    toggleFullscreen: () => ipcRenderer.invoke('system:toggle-fullscreen'),
    getDisplayInfo: () => ipcRenderer.invoke('system:get-display-info'),
    minimize: () => ipcRenderer.invoke('system:minimize'),
    maximize: () => ipcRenderer.invoke('system:maximize'),
    close: () => ipcRenderer.invoke('system:close')
  },

  // Game-specific functions (to be implemented)
  game: {
    saveState: (data: any) => ipcRenderer.invoke('game:save-state', data),
    loadState: () => ipcRenderer.invoke('game:load-state'),
    getSaves: () => ipcRenderer.invoke('game:get-saves'),
    deleteSave: (saveId: string) => ipcRenderer.invoke('game:delete-save', saveId),
    takeScreenshot: () => ipcRenderer.invoke('game:take-screenshot'),
    getHighScores: () => ipcRenderer.invoke('game:get-high-scores'),
    saveHighScore: (score: number, name: string) => 
      ipcRenderer.invoke('game:save-high-score', { score, name })
  },

  // Settings management (to be implemented)
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    reset: () => ipcRenderer.invoke('settings:reset')
  },

  // Event listeners for renderer
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'fullscreen-changed',
      'focus-changed',
      'update-available',
      'update-downloaded'
    ];
    
    if (validChannels.includes(channel)) {
      // Wrap the callback to remove the event parameter
      const subscription = (event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to remove the listener
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    
    console.warn(`Invalid channel: ${channel}`);
    return () => {}; // Return no-op function
  },

  // Remove event listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Expose the API to the renderer process
// This will be available as window.electronAPI in the renderer
try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('Electron API exposed successfully');
} catch (error) {
  console.error('Failed to expose Electron API:', error);
}

// Export types for TypeScript support
export type ElectronAPI = typeof electronAPI;