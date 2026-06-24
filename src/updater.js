const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure electron-log
log.transports.file.level = 'info';
autoUpdater.logger = log;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function initUpdater() {
  if (isDev) {
    log.info('Auto-updater: Disabled in development mode');
    return;
  }

  log.info('Auto-updater: Initializing');

  autoUpdater.on('checking-for-update', () => {
    log.info('Auto-updater: Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Auto-updater: Update available:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Auto-updater: Update not available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater: Error occurred:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let logMsg = `Auto-updater: Download speed: ${progressObj.bytesPerSecond}`;
    logMsg = `${logMsg} - Downloaded ${progressObj.percent}%`;
    logMsg = `${logMsg} (${progressObj.transferred}/${progressObj.total})`;
    log.info(logMsg);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Auto-updater: Update downloaded:', info.version);

    dialog.showMessageBox({
      type: 'info',
      title: 'Orbit Downloader Update Ready',
      message: `A new version of Orbit Downloader (${info.version}) has been downloaded.`,
      detail: 'Restart the application to install the update now?',
      buttons: ['Restart Now', 'Install on Exit'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        log.info('Auto-updater: quitAndInstall() called');
        // Use setImmediate to safely trigger application restart
        setImmediate(() => {
          autoUpdater.quitAndInstall();
        });
      }
    });
  });

  // Perform initial check
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log.error('Auto-updater: Initial check failed:', err);
  });

  // Check for updates every 2 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Auto-updater: Interval check failed:', err);
    });
  }, 2 * 60 * 60 * 1000);
}

module.exports = { initUpdater };
