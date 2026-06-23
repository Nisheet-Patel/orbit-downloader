const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { IPC_CHANNELS, STATUS } = require('./src/constants');
const { getSettings, saveSettings } = require('./src/settingsStore');
const { resolveYtDlpPath } = require('./src/binaryManager');
const { validateFfmpegPath, resolveFfmpegPath } = require('./src/ffmpegValidator');
const { DownloadManager } = require('./src/downloadManager');
const { startDownloads, Semaphore } = require('./src/queueRunner');
const { getMetadata, getPlaylistInfo } = require('./src/ytdlpRunner');
const metadataSemaphore = new Semaphore(3);
const { validateYoutubeUrl } = require('./src/utils');

// Keep a global reference to avoid garbage collection
let mainWindow;
const downloadManager = new DownloadManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    icon: path.join(__dirname, 'orbit-logo.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  }

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

ipcMain.on('settings:getSync', (event) => {
  event.returnValue = getSettings();
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_event, partial) => {
  // Gate: if ffmpegLocation is non-empty, it must be valid
  if (partial.ffmpegLocation && String(partial.ffmpegLocation).trim() !== '') {
    const validation = await validateFfmpegPath(partial.ffmpegLocation);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid FFmpeg path: ${validation.reason || 'Could not validate'}`,
        settings: getSettings()
      };
    }
  }

  const updated = saveSettings(partial);
  return { success: true, settings: updated };
});

ipcMain.handle(IPC_CHANNELS.FFMPEG_VALIDATE, async (_event, { path: inputPath }) => {
  return validateFfmpegPath(inputPath);
});

ipcMain.handle(IPC_CHANNELS.FFMPEG_RESOLVE, async (_event, { path: inputPath }) => {
  return resolveFfmpegPath(inputPath);
});

ipcMain.handle(IPC_CHANNELS.YTDLP_VALIDATE, async (_event, { path: inputPath }) => {
  if (!inputPath || typeof inputPath !== 'string' || inputPath.trim() === '') {
    return { valid: false, reason: 'Path is empty' };
  }

  // Validate by spawning the binary with --version
  return new Promise((resolve) => {
    const child = require('child_process').spawn(inputPath.trim(), ['--version'], { timeout: 5000 });
    let stdout = '';
    let timedOut = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('error', () => resolve({ valid: false, reason: 'Could not launch yt-dlp' }));
    child.on('timeout', () => {
      timedOut = true;
      child.kill();
      resolve({ valid: false, reason: 'yt-dlp validation timed out' });
    });

    child.on('close', (code) => {
      if (timedOut) return;
      if (code === 0) {
        resolve({ valid: true, version: (stdout.split('\n')[0] || '').trim() || undefined });
      } else {
        resolve({ valid: false, reason: `yt-dlp exited with code ${code}` });
      }
    });
  });
});

ipcMain.handle(IPC_CHANNELS.YTDLP_ENSURE, async () => {
  const settings = getSettings();
  return resolveYtDlpPath(settings.ytdlpLocation);
});

ipcMain.handle(IPC_CHANNELS.DIALOG_CHOOSE_DOWNLOAD_FOLDER, async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose Download Folder'
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// ------------------------------------------------------------------
// Queue IPC handlers
// ------------------------------------------------------------------

function getMainWebContents() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null;
}

ipcMain.handle(IPC_CHANNELS.QUEUE_ADD, async (_event, payload) => {
  const urls = Array.isArray(payload) ? payload : (payload.urls || []);
  const format = Array.isArray(payload) ? 'audio' : (payload.format || 'audio');
  const quality = Array.isArray(payload) ? '320' : (payload.quality || '320');

  if (!Array.isArray(urls)) {
    return { added: [], duplicates: [], invalid: [] };
  }

  const added = [];
  const duplicates = [];
  const invalid = [];

  const reversedUrls = [...urls].reverse();
  const settings = getSettings();
  const ytDlpResult = await resolveYtDlpPath(settings.ytdlpLocation);
  const ytdlpPath = ytDlpResult.ok ? ytDlpResult.path : 'yt-dlp';
  const webContents = getMainWebContents();

  for (const url of reversedUrls) {
    if (!validateYoutubeUrl(url)) {
      invalid.unshift(url);
      continue;
    }

    if (url.includes('list=')) {
      const playlistKey = `playlist#${url}#${format}#${quality}`;
      
      if (downloadManager.tasks.has(playlistKey)) {
        duplicates.unshift(url);
        continue;
      }

      const playlistContainer = downloadManager.addPlaylist(playlistKey, url, 'Loading playlist...', format, quality);
      added.unshift({ url, id: playlistKey, isPlaylist: true });

      // Run playlist metadata fetch asynchronously to prevent blocking the IPC return
      (async () => {
        try {
          const info = await getPlaylistInfo(url, ytdlpPath, settings.cookiesFromBrowser);
          const title = info.title || 'Playlist';
          const entries = info.entries || [];

          const videoIds = [];
          // Prepend children to task queue in reverse order
          for (const entry of [...entries].reverse()) {
            const videoUrl = entry.url || `https://www.youtube.com/watch?v=${entry.id}`;
            const result = downloadManager.addTask(videoUrl, { format, quality, playlistId: playlistKey });
            if (result.id) {
              videoIds.unshift(result.id);
              // Set title and metadata immediately
              downloadManager.updateTask(result.id, {
                title: entry.title || 'Loading...',
                duration: entry.duration || 0
              }, webContents);
            }
          }

          downloadManager.updateTask(playlistKey, {
            title,
            videoIds
          }, webContents);

          // Force a state reload in the renderer to pick up the newly loaded playlist entries
          if (webContents && !webContents.isDestroyed()) {
            webContents.send('queue:reloadNeeded');
          }
        } catch (err) {
          console.error('Failed to load playlist:', err);
          downloadManager.updateTask(playlistKey, {
            title: 'Failed to load playlist',
            status: STATUS.ERROR,
            errorMessage: err.message
          }, webContents);
        }
      })();
    } else {
      // Normal video URL
      const result = downloadManager.addTask(url, { format, quality });
      if (result.added) {
        added.unshift({ url, id: result.id });
      } else {
        duplicates.unshift(url);
      }
    }
  }

  // Trigger metadata fetch for normal videos
  for (const item of added) {
    if (item.isPlaylist) continue;
    (async () => {
      await metadataSemaphore.acquire();
      try {
        const ytDlpResult = await resolveYtDlpPath(settings.ytdlpLocation);
        if (!ytDlpResult.ok) return;
        const meta = await getMetadata(item.url, ytDlpResult.path, settings.cookiesFromBrowser);
        downloadManager.updateTask(item.id, {
          title: meta.title,
          duration: meta.duration,
          thumbnailUrl: meta.thumbnailUrl
        }, webContents);
      } catch (_err) {
        // ignore
      } finally {
        metadataSemaphore.release();
      }
    })();
  }

  return {
    added: added.map(item => item.url),
    duplicates,
    invalid
  };
});

ipcMain.handle(IPC_CHANNELS.QUEUE_REMOVE, (_event, { id, url }) => {
  const targetId = id || url;
  downloadManager.removeTask(targetId);
  return { success: true };
});

ipcMain.handle(IPC_CHANNELS.QUEUE_CLEAR, () => {
  downloadManager.clearAll();
  return { success: true };
});

ipcMain.handle(IPC_CHANNELS.QUEUE_GET, () => {
  return downloadManager.getAll();
});

ipcMain.handle(IPC_CHANNELS.QUEUE_START, async () => {
  const webContents = getMainWebContents();
  const settings = getSettings();

  const pendingTasks = downloadManager.getAll().filter(
    t => (t.status === 'pending' || t.status === 'error') && !t.isPlaylist
  );

  if (pendingTasks.length === 0) {
    return { success: false, error: 'No pending tasks to start' };
  }

  const result = await startDownloads({
    tasks: pendingTasks,
    settings,
    downloadManager,
    webContents
  });

  return result;
});

ipcMain.handle(IPC_CHANNELS.FOLDER_OPEN, async () => {
  const settings = getSettings();
  const { shell } = require('electron');
  const targetPath = settings.downloadLocation || require('electron').app.getPath('downloads');

  try {
    // Mirror Python: Path(path).mkdir(parents=True, exist_ok=True)
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    const error = await shell.openPath(targetPath);
    if (error && error !== '') {
      return { success: false, error: `Could not open folder: ${error}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to open folder' };
  }
});

ipcMain.handle('shell:openExternal', async (_event, { url }) => {
  const { shell } = require('electron');
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle(IPC_CHANNELS.METADATA_FETCH, async (_event, { url }) => {
  const settings = getSettings();
  const ytDlpResult = await resolveYtDlpPath(settings.ytdlpLocation);
  if (!ytDlpResult.ok) {
    return { ok: false, error: ytDlpResult.error || 'yt-dlp not available' };
  }
  try {
    const meta = await getMetadata(url, ytDlpResult.path, settings.cookiesFromBrowser);
    return {
      ok: true,
      title: meta.title,
      thumbnailUrl: meta.thumbnailUrl,
      duration: meta.duration,
      channel: meta.uploader,
      viewCount: meta.viewCount
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Failed to fetch metadata' };
  }
});

ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(() => {
  createWindow();

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
