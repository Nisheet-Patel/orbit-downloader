const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

const { IPC_CHANNELS } = require('./src/constants');
const { getSettings, saveSettings } = require('./src/settingsStore');
const { resolveYtDlpPath } = require('./src/binaryManager');

// Keep a global reference to avoid garbage collection
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  // Dev tools for development — remove or gate in production builds later
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ------------------------------------------------------------------
// IPC handlers
// ------------------------------------------------------------------

ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
  return getSettings();
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, (_event, partial) => {
  const updated = saveSettings(partial);
  return { success: true, settings: updated };
});

// ------------------------------------------------------------------
// App lifecycle
// ------------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();

  // Kick off binary manager resolution non-blocking
  resolveYtDlpPath(getSettings().ytdlpLocation).then((result) => {
    console.log('[binaryManager] yt-dlp resolution result:', result);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
