"use strict";
/**
 * Developer Tools Management
 * Controls debug features and developer tools access
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devToolsManager = exports.DevToolsManager = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class DevToolsManager {
    isDevelopment = process.env.NODE_ENV === 'development';
    isDebugMode = false;
    config;
    mainWindow = null;
    performanceLog = [];
    networkLog = [];
    consoleLog = [];
    maxLogSize = 1000;
    constructor() {
        this.config = this.loadConfig();
        this.setupIpcHandlers();
        this.checkDebugMode();
    }
    /**
     * Load developer tools configuration
     */
    loadConfig() {
        const defaultConfig = {
            enabled: this.isDevelopment,
            showOnStartup: false,
            detached: false,
            position: 'right',
            logLevel: 'info',
            performanceMonitoring: false,
            networkThrottling: false
        };
        try {
            const configPath = path_1.default.join(electron_1.app.getPath('userData'), 'devtools-config.json');
            if (fs_1.default.existsSync(configPath)) {
                const savedConfig = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
                return { ...defaultConfig, ...savedConfig };
            }
        }
        catch (error) {
            console.error('Failed to load dev tools config:', error);
        }
        return defaultConfig;
    }
    /**
     * Save developer tools configuration
     */
    saveConfig() {
        try {
            const configPath = path_1.default.join(electron_1.app.getPath('userData'), 'devtools-config.json');
            fs_1.default.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
        }
        catch (error) {
            console.error('Failed to save dev tools config:', error);
        }
    }
    /**
     * Check if debug mode should be enabled
     */
    checkDebugMode() {
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
    setupIpcHandlers() {
        // Toggle dev tools
        electron_1.ipcMain.handle('devtools:toggle', () => {
            if (!this.canUseDevTools()) {
                return { success: false, message: 'Dev tools disabled in production' };
            }
            if (this.mainWindow) {
                if (this.mainWindow.webContents.isDevToolsOpened()) {
                    this.mainWindow.webContents.closeDevTools();
                }
                else {
                    this.openDevTools();
                }
            }
            return { success: true };
        });
        // Get debug info
        electron_1.ipcMain.handle('devtools:get-debug-info', () => {
            return this.getDebugInfo();
        });
        // Get performance metrics
        electron_1.ipcMain.handle('devtools:get-performance', async () => {
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
        electron_1.ipcMain.handle('devtools:get-logs', (event, type) => {
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
        electron_1.ipcMain.handle('devtools:clear-logs', (event, type) => {
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
        electron_1.ipcMain.handle('devtools:execute', async (event, code) => {
            if (!this.canUseDevTools()) {
                return { success: false, message: 'Execution disabled in production' };
            }
            try {
                const result = await this.mainWindow?.webContents.executeJavaScript(code);
                return { success: true, result };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
        // Take heap snapshot
        electron_1.ipcMain.handle('devtools:heap-snapshot', async () => {
            if (!this.canUseDevTools() || !this.mainWindow) {
                return { success: false };
            }
            try {
                const filePath = path_1.default.join(electron_1.app.getPath('userData'), `heap-${Date.now()}.heapsnapshot`);
                await this.mainWindow.webContents.takeHeapSnapshot(filePath);
                return { success: true, path: filePath };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
        // Network throttling
        electron_1.ipcMain.handle('devtools:set-throttling', async (event, profile) => {
            if (!this.canUseDevTools() || !this.mainWindow) {
                return { success: false };
            }
            const profiles = {
                'offline': { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
                'slow-3g': { offline: false, latency: 2000, downloadThroughput: 40960, uploadThroughput: 40960 },
                'fast-3g': { offline: false, latency: 562.5, downloadThroughput: 188743, uploadThroughput: 93871 },
                'regular-4g': { offline: false, latency: 20, downloadThroughput: 4096000, uploadThroughput: 3072000 },
                'wifi': { offline: false, latency: 2, downloadThroughput: 30720000, uploadThroughput: 15360000 },
                'no-throttling': { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }
            };
            const conditions = profiles[profile] || profiles['no-throttling'];
            try {
                // Note: setNetworkEmulationConditions is deprecated in newer Electron versions
                // await this.mainWindow.webContents.session.setNetworkEmulationConditions(conditions);
                this.config.networkThrottling = profile !== 'no-throttling';
                console.warn('Network throttling is not available in this Electron version');
                return { success: true };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Initialize dev tools for main window
     */
    initialize(mainWindow) {
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
    setupNetworkMonitoring(window) {
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
    addDevToolsMenu() {
        const menu = electron_1.Menu.getApplicationMenu();
        if (!menu)
            return;
        const devMenu = new electron_1.Menu();
        devMenu.append(new electron_1.MenuItem({
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
                if (this.mainWindow) {
                    if (this.mainWindow.webContents.isDevToolsOpened()) {
                        this.mainWindow.webContents.closeDevTools();
                    }
                    else {
                        this.openDevTools();
                    }
                }
            }
        }));
        devMenu.append(new electron_1.MenuItem({
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
                if (this.mainWindow) {
                    this.mainWindow.webContents.reload();
                }
            }
        }));
        devMenu.append(new electron_1.MenuItem({
            label: 'Force Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
                if (this.mainWindow) {
                    this.mainWindow.webContents.reloadIgnoringCache();
                }
            }
        }));
        devMenu.append(new electron_1.MenuItem({ type: 'separator' }));
        devMenu.append(new electron_1.MenuItem({
            label: 'Inspect Element',
            accelerator: 'CmdOrCtrl+Shift+I',
            click: () => {
                if (this.mainWindow) {
                    this.mainWindow.webContents.inspectElement(0, 0);
                }
            }
        }));
        menu.append(new electron_1.MenuItem({
            label: 'Developer',
            submenu: devMenu
        }));
        electron_1.Menu.setApplicationMenu(menu);
    }
    /**
     * Open developer tools
     */
    openDevTools() {
        if (!this.mainWindow || !this.canUseDevTools()) {
            return;
        }
        const options = {
            mode: this.config.detached ? 'detach' : this.config.position,
            activate: true
        };
        this.mainWindow.webContents.openDevTools(options);
    }
    /**
     * Check if dev tools can be used
     */
    canUseDevTools() {
        return this.isDevelopment || this.isDebugMode || this.config.enabled;
    }
    /**
     * Add log entry with size limit
     */
    addConsoleLog(entry) {
        this.consoleLog.push(entry);
        if (this.consoleLog.length > this.maxLogSize) {
            this.consoleLog.shift();
        }
    }
    addNetworkLog(entry) {
        this.networkLog.push(entry);
        if (this.networkLog.length > this.maxLogSize) {
            this.networkLog.shift();
        }
    }
    addPerformanceLog(entry) {
        this.performanceLog.push(entry);
        if (this.performanceLog.length > this.maxLogSize) {
            this.performanceLog.shift();
        }
    }
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            app: {
                version: electron_1.app.getVersion(),
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
                userData: electron_1.app.getPath('userData'),
                temp: electron_1.app.getPath('temp'),
                exe: electron_1.app.getPath('exe')
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
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }
    /**
     * Clean up
     */
    destroy() {
        this.mainWindow = null;
        this.consoleLog = [];
        this.networkLog = [];
        this.performanceLog = [];
    }
}
exports.DevToolsManager = DevToolsManager;
// Export singleton instance
exports.devToolsManager = new DevToolsManager();
