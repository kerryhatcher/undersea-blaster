// Electron main process for Undersea Blaster
// CommonJS module for compatibility with electron-builder
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const isDev = process.env.NODE_ENV === 'development';

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    backgroundColor: '#062b4f',
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      devTools: !!isDev,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Load built index.html from dist with relative assets
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  win.loadFile(indexPath).catch((err) => {
    console.error('Failed to load index.html', err);
  });

  return win;
}

app.name = 'Undersea Blaster';
app.setAppUserModelId?.('com.kerryhatcher.underseablaster');

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



