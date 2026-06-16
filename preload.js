const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('./src/constants');

contextBridge.exposeInMainWorld('orbit', {
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

  // Push event registration (renderer → main)
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
});
