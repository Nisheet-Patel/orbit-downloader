const { contextBridge, ipcRenderer } = require('electron');

// NOTE: preload runs before the renderer page loads.
// If this script throws, window.orbit will be undefined.

try {
  try {
    const settings = ipcRenderer.sendSync('settings:getSync');
    if (settings && settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (err) {
    console.error('[preload] theme check failed:', err);
  }

  const IPC_CHANNELS = Object.freeze({
    SETTINGS_GET: 'settings:get',
    SETTINGS_SAVE: 'settings:save',
    FFMPEG_VALIDATE: 'ffmpeg:validate',
    FFMPEG_RESOLVE: 'ffmpeg:resolve',
    YTDLP_VALIDATE: 'ytdlp:validate',
    YTDLP_ENSURE: 'ytdlp:ensure',
    DIALOG_CHOOSE_DOWNLOAD_FOLDER: 'dialog:chooseDownloadFolder',
    QUEUE_ADD: 'queue:add',
    QUEUE_REMOVE: 'queue:remove',
    QUEUE_CLEAR: 'queue:clear',
    QUEUE_START: 'queue:start',
    QUEUE_GET: 'queue:get',
    FOLDER_OPEN: 'folder:open',
    METADATA_FETCH: 'metadata:fetch',
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE: 'window:maximize',
    WINDOW_CLOSE: 'window:close',
    QUEUE_PROGRESS: 'queue:progress',
    QUEUE_TASK_UPDATED: 'queue:taskUpdated'
  });

  const api = {
    // Settings
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    saveSettings: (partial) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, partial),

    // Validation
    validateFfmpeg: (path) => ipcRenderer.invoke(IPC_CHANNELS.FFMPEG_VALIDATE, { path }),
    resolveFfmpeg: (path) => ipcRenderer.invoke(IPC_CHANNELS.FFMPEG_RESOLVE, { path }),
    validateYtDlp: (path) => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_VALIDATE, { path }),
    ensureYtDlp: () => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_ENSURE),

    // Dialogs
    chooseDownloadFolder: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_CHOOSE_DOWNLOAD_FOLDER),

    // Queue
    queueAdd: (urls, options) => {
      const opts = options || {};
      return ipcRenderer.invoke(IPC_CHANNELS.QUEUE_ADD, {
        urls,
        format: opts.format || 'audio',
        quality: opts.quality || '320'
      });
    },
    queueRemove: (idOrUrl) => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_REMOVE, { id: idOrUrl, url: idOrUrl }),
    queueClear: () => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_CLEAR),
    queueGet: () => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_GET),
    queueStart: () => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_START),
    folderOpen: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_OPEN),
    fetchMetadata: (url) => ipcRenderer.invoke(IPC_CHANNELS.METADATA_FETCH, { url }),
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', { url }),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getDependencyStatus: () => ipcRenderer.invoke('dependency:get-status'),
    downloadDependency: (id) => ipcRenderer.invoke('dependency:download-one', id),
    downloadAllDependencies: () => ipcRenderer.invoke('dependency:download-all'),
    checkUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    windowMinimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    windowMaximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    windowClose: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),

    // Push event registration
    onQueueProgress: (callback) => {
      const channel = IPC_CHANNELS.QUEUE_PROGRESS;
      const handler = (_event, data) => callback(data);
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },
    onQueueTaskUpdated: (callback) => {
      const channel = IPC_CHANNELS.QUEUE_TASK_UPDATED;
      const handler = (_event, data) => callback(data);
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },
    onQueueReloadNeeded: (callback) => {
      const channel = 'queue:reloadNeeded';
      const handler = () => callback();
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },
    onDependencyStatusChange: (callback) => {
      const channel = 'dependency:status-change';
      const handler = (_event, data) => callback(data);
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },
    onUpdateStatusChange: (callback) => {
      const channel = 'update:status-change';
      const handler = (_event, data) => callback(data);
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    }
  };

  contextBridge.exposeInMainWorld('orbit', api);

  // Safe debug flag on window so the renderer can detect preload success
  contextBridge.exposeInMainWorld('__orbit_preload_ready__', true);

} catch (err) {
  console.error('[preload] FAILED to expose window.orbit:', err);
  contextBridge.exposeInMainWorld('__orbit_preload_error__', String(err && err.message || err));
}
