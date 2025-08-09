import { app, BrowserWindow, protocol, shell, ipcMain } from 'electron';
import * as path from 'path';
import { securityManager } from './security';
import { ipcHandlers } from './ipc-handlers';
import { windowManager } from './window-manager';

let mainWindow: BrowserWindow | null = null;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure app-level security before app is ready
securityManager.configureAppSecurity();

// Additional security configurations are handled by SecurityManager

async function createWindow(): Promise<void> {
  // Create the main window using window manager
  mainWindow = await windowManager.createMainWindow();

  // Apply security configurations
  securityManager.secureWindow(mainWindow);

  // Set up IPC handlers
  ipcHandlers.setMainWindow(mainWindow);

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
        } catch (err) {
          console.log(`Port ${port} not available, trying next...`);
        }
      }
    };
    loadDevServer();
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const indexPath = path.join(__dirname, '../../../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Window closing is handled by WindowManager
}

// Security: Limit protocol access
app.on('ready', () => {
  // Register protocol for serving local files
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://', '');
    try {
      callback({ path: path.normalize(path.join(__dirname, '../../../', url)) });
    } catch (error) {
      console.error('Failed to register protocol', error);
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create window when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Security: Handle renderer process crash
app.on('render-process-gone', (_event, _webContents, details) => {
  console.error('Renderer process gone:', details);
  if (details.reason === 'crashed') {
    app.quit();
  }
});

// Create window when app is ready
app.whenReady().then(() => {
  createWindow();
});

// Handle certificate errors
app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  // In development, ignore certificate errors for localhost
  if (isDevelopment && url.startsWith('https://localhost')) {
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior (reject)
    callback(false);
  }
});