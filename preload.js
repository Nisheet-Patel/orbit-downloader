const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('./src/constants');

contextBridge.exposeInMainWorld('orbit', {
  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  saveSettings: (partial) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, partial)

  // Future tasks will append more channels here (e.g. ffmpeg:validate, queue:add, etc.)
  // Do NOT remove or restructure the object above.
});
