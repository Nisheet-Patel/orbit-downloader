const path = require('path');

// ------------------------------------------------------------------
// Status lifecycle (project-context.md §6 — must match exactly)
// ------------------------------------------------------------------
const STATUS = Object.freeze({
  PENDING: 'pending',
  EXTRACTING_INFO: 'extracting_info',
  DOWNLOADING: 'downloading',
  CONVERTING: 'converting',
  COMPLETED: 'completed',
  ERROR: 'error',
  ALREADY_EXISTS: 'already_exists'
});

// ------------------------------------------------------------------
// IPC channels (project-context.md §7)
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Default settings (project-context.md §5)
// NOTE: this is exported as a factory function so it can be safely
// required in the preload script (which cannot access app.getPath).
// ------------------------------------------------------------------
function getDefaultSettings() {
  const { app } = require('electron');
  return Object.freeze({
    downloadLocation: path.join(app.getPath('downloads'), 'OrbitDownloader'),
    audioQuality: '320',
    maxParallelDownloads: 3,
    ffmpegLocation: '',
    ytdlpLocation: '',
    theme: 'light',
    lastFormat: 'video',
    lastVideoQuality: '1080',
    lastAudioQuality: '320',
    cookiesFromBrowser: ''
  });
}

module.exports = { STATUS, IPC_CHANNELS, getDefaultSettings };
