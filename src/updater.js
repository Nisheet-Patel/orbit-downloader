const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure electron-log
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Disable automatic checks and downloads
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

// 1. MUST allow prereleases because the current GitHub release is marked as "beta/prerelease"
autoUpdater.allowPrerelease = true;

// 2. Enable local testing of the update flow (forces electron-updater to use dev-app-update.yml)
if (!app.isPackaged) {
  const path = require('path');
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.updateConfigPath = path.join(__dirname, '..', 'dev-app-update.yml');
}

let webContentsRef = null;

function notifyState(event, data) {
  if (webContentsRef && !webContentsRef.isDestroyed()) {
    webContentsRef.send('update:status-change', { event, ...data });
  }
}

function initUpdater() {
  log.info('Auto-updater: Initializing manual updater');

  autoUpdater.on('checking-for-update', () => {
    log.info('Auto-updater: Checking for update...');
    notifyState('checking', {});
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Auto-updater: Update available:', info.version);
    notifyState('available', { version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Auto-updater: Update not available');
    notifyState('not-available', { version: info ? info.version : app.getVersion() });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater: Error occurred:', err);
    notifyState('error', { error: err.message || String(err) });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    notifyState('downloading', {
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Auto-updater: Update downloaded:', info.version);
    notifyState('downloaded', { version: info.version });
  });

  ipcMain.handle('update:check', async (event) => {
    webContentsRef = event.sender;
    try {
      const result = await autoUpdater.checkForUpdates();
      if (!result || !result.updateInfo) {
        log.info('Auto-updater: No update info returned');
        return { success: true, version: null };
      }
      return { success: true, version: result.updateInfo.version };
    } catch (err) {
      log.error('Auto-updater: Check failed:', err);
      let friendlyError = err.message || String(err);
      if (friendlyError.includes('Cannot parse releases feed') || friendlyError.includes('406') || friendlyError.includes('Unable to find latest version')) {
        friendlyError = 'No production release configuration (latest.yml) was found on GitHub. Please ensure that a release exists with the built assets uploaded.';
      } else if (friendlyError.includes('is not packed') || friendlyError.includes('application in development mode')) {
        friendlyError = 'Updates cannot be checked in development mode without dev-app-update.yml configuration.';
      }
      notifyState('error', { error: friendlyError });
      return { success: false, error: friendlyError };
    }
  });

  ipcMain.handle('update:download', async (event) => {
    webContentsRef = event.sender;
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      log.error('Auto-updater: Download failed:', err);
      let friendlyError = err.message || String(err);
      if (friendlyError.includes('404') || friendlyError.includes('not found')) {
        friendlyError = 'Update installer asset was not found on GitHub releases.';
      }
      notifyState('error', { error: friendlyError });
      return { success: false, error: friendlyError };
    }
  });

  ipcMain.handle('update:install', async () => {
    try {
      setImmediate(() => {
        autoUpdater.quitAndInstall();
      });
      return { success: true };
    } catch (err) {
      log.error('Auto-updater: Install failed:', err);
      return { success: false, error: err.message || String(err) };
    }
  });
}

module.exports = { initUpdater };
