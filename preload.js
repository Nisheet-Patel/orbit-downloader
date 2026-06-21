const { contextBridge, ipcRenderer } = require('electron');

// NOTE: preload runs before the renderer page loads.
// If this script throws, window.orbit will be undefined.

try {
  const IPC_CHANNELS = Object.freeze({
    SETTINGS_GET: 'settings:get',
    SETTINGS_SAVE: 'settings:save',
    FFMPEG_VALIDATE: 'ffmpeg:validate',
    YTDLP_VALIDATE: 'ytdlp:validate',
    YTDLP_ENSURE: 'ytdlp:ensure',
    DIALOG_CHOOSE_DOWNLOAD_FOLDER: 'dialog:chooseDownloadFolder',
    QUEUE_ADD: 'queue:add',
    QUEUE_REMOVE: 'queue:remove',
    QUEUE_CLEAR: 'queue:clear',
    QUEUE_START: 'queue:start',
    QUEUE_GET: 'queue:get',
    FOLDER_OPEN: 'folder:open',
    QUEUE_PROGRESS: 'queue:progress',
    QUEUE_TASK_UPDATED: 'queue:taskUpdated'
  });

  const api = {
    // Settings
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    saveSettings: (partial) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, partial),

    // Validation
    validateFfmpeg: (path) => ipcRenderer.invoke(IPC_CHANNELS.FFMPEG_VALIDATE, { path }),
    validateYtDlp: (path) => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_VALIDATE, { path }),
    ensureYtDlp: () => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_ENSURE),

    // Dialogs
    chooseDownloadFolder: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_CHOOSE_DOWNLOAD_FOLDER),

    // Queue
    queueAdd: (urls) => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_ADD, urls),
    queueRemove: (url) => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_REMOVE, { url }),
    queueClear: () => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_CLEAR),
    queueGet: () => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_GET),
    queueStart: () => ipcRenderer.invoke(IPC_CHANNELS.QUEUE_START),
    folderOpen: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_OPEN),

    // Push event registration
    onQueueProgress: (callback) => {
      const channel = IPC_CHANNELS.QUEUE_PROGRESS;
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (_event, data) => callback(data));
    },
    onQueueTaskUpdated: (callback) => {
      const channel = IPC_CHANNELS.QUEUE_TASK_UPDATED;
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (_event, data) => callback(data));
    }
  };

  contextBridge.exposeInMainWorld('orbit', api);

  // Safe debug flag on window so the renderer can detect preload success
  contextBridge.exposeInMainWorld('__orbit_preload_ready__', true);

} catch (err) {
  console.error('[preload] FAILED to expose window.orbit:', err);
  contextBridge.exposeInMainWorld('__orbit_preload_error__', String(err && err.message || err));
}
