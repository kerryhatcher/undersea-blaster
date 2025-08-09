"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Define the API that will be exposed to the renderer process
const electronAPI = {
    // System information and controls
    system: {
        getPlatform: () => process.platform,
        getVersion: () => process.versions.electron,
        toggleFullscreen: () => electron_1.ipcRenderer.invoke('system:toggle-fullscreen'),
        getDisplayInfo: () => electron_1.ipcRenderer.invoke('system:get-display-info'),
        minimize: () => electron_1.ipcRenderer.invoke('system:minimize'),
        maximize: () => electron_1.ipcRenderer.invoke('system:maximize'),
        close: () => electron_1.ipcRenderer.invoke('system:close')
    },
    // Game-specific functions (to be implemented)
    game: {
        saveState: (data) => electron_1.ipcRenderer.invoke('game:save-state', data),
        loadState: () => electron_1.ipcRenderer.invoke('game:load-state'),
        getSaves: () => electron_1.ipcRenderer.invoke('game:get-saves'),
        deleteSave: (saveId) => electron_1.ipcRenderer.invoke('game:delete-save', saveId),
        takeScreenshot: () => electron_1.ipcRenderer.invoke('game:take-screenshot'),
        getHighScores: () => electron_1.ipcRenderer.invoke('game:get-high-scores'),
        saveHighScore: (score, name) => electron_1.ipcRenderer.invoke('game:save-high-score', { score, name })
    },
    // Settings management (to be implemented)
    settings: {
        get: (key) => electron_1.ipcRenderer.invoke('settings:get', key),
        set: (key, value) => electron_1.ipcRenderer.invoke('settings:set', key, value),
        getAll: () => electron_1.ipcRenderer.invoke('settings:get-all'),
        reset: () => electron_1.ipcRenderer.invoke('settings:reset')
    },
    // Event listeners for renderer
    on: (channel, callback) => {
        const validChannels = [
            'fullscreen-changed',
            'focus-changed',
            'update-available',
            'update-downloaded',
            'menu-new-game',
            'menu-toggle-pause',
            'menu-save-game',
            'menu-load-game',
            'menu-high-scores',
            'save-before-quit'
        ];
        if (validChannels.includes(channel)) {
            // Wrap the callback to remove the event parameter
            const subscription = (event, ...args) => callback(...args);
            electron_1.ipcRenderer.on(channel, subscription);
            // Return a function to remove the listener
            return () => {
                electron_1.ipcRenderer.removeListener(channel, subscription);
            };
        }
        console.warn(`Invalid channel: ${channel}`);
        return () => { }; // Return no-op function
    },
    // Remove event listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    }
};
// Expose the API to the renderer process
// This will be available as window.electronAPI in the renderer
try {
    electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    console.log('Electron API exposed successfully');
}
catch (error) {
    console.error('Failed to expose Electron API:', error);
}
