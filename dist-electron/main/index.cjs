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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const security_1 = require("./security.cjs");
const ipc_handlers_1 = require("./ipc-handlers.cjs");
const window_manager_1 = require("./window-manager.cjs");
let mainWindow = null;
const isDevelopment = process.env.NODE_ENV !== 'production';
// Configure app-level security before app is ready
security_1.securityManager.configureAppSecurity();
// Additional security configurations are handled by SecurityManager
async function createWindow() {
    // Create the main window using window manager
    mainWindow = await window_manager_1.windowManager.createMainWindow();
    // Apply security configurations
    security_1.securityManager.secureWindow(mainWindow);
    // Set up IPC handlers
    ipc_handlers_1.ipcHandlers.setMainWindow(mainWindow);
    // Load the app
    if (isDevelopment) {
        // In development, load from Vite dev server
        // Try multiple ports in case default is in use
        const loadDevServer = async () => {
            const ports = [5173, 5174, 5175];
            for (const port of ports) {
                try {
                    await mainWindow?.loadURL(`http://localhost:${port}`);
                    console.log(`Loaded dev server on port ${port}`);
                    break;
                }
                catch (err) {
                    console.log(`Port ${port} not available, trying next...`);
                }
            }
        };
        loadDevServer();
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, load from built files
        const indexPath = path.join(__dirname, '../../../dist/index.html');
        mainWindow.loadFile(indexPath);
    }
    // Window closing is handled by WindowManager
}
// Security: Limit protocol access
electron_1.app.on('ready', () => {
    // Register protocol for serving local files
    electron_1.protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.replace('app://', '');
        try {
            callback({ path: path.normalize(path.join(__dirname, '../../../', url)) });
        }
        catch (error) {
            console.error('Failed to register protocol', error);
        }
    });
});
// Quit when all windows are closed
electron_1.app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// On macOS, re-create window when dock icon is clicked
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// Security: Handle renderer process crash
electron_1.app.on('render-process-gone', (_event, _webContents, details) => {
    console.error('Renderer process gone:', details);
    if (details.reason === 'crashed') {
        electron_1.app.quit();
    }
});
// Create window when app is ready
electron_1.app.whenReady().then(() => {
    createWindow();
});
// Handle certificate errors
electron_1.app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
    // In development, ignore certificate errors for localhost
    if (isDevelopment && url.startsWith('https://localhost')) {
        event.preventDefault();
        callback(true);
    }
    else {
        // In production, use default behavior (reject)
        callback(false);
    }
});
