const fs = require('fs');
const path = require('path');
const { STATUS } = require('./constants');
const { getMetadata, downloadAudio, downloadVideo, buildExpectedPath } = require('./ytdlpRunner');
const { validateFfmpegPath, resolveFfmpegPath } = require('./ffmpegValidator');
const { resolveYtDlpPath } = require('./binaryManager');

// ------------------------------------------------------------------
// Worker Pool Semaphore
// ------------------------------------------------------------------

class Semaphore {
  constructor(capacity) {
    this.capacity = capacity;
    this.running = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.running < this.capacity) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.running--;
    }
  }
}

// ------------------------------------------------------------------
// Download Orchestration
// ------------------------------------------------------------------

/**
 * Start processing pending tasks through the download engine.
 * @param {Object} params
 * @param {Array} params.tasks — array of task objects (must have .url)
 * @param {Object} params.settings — full settings object
 * @param {DownloadManager} params.downloadManager
 * @param {Electron.WebContents} params.webContents
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function startDownloads({ tasks, settings, downloadManager, webContents }) {
  // 1. Resolve FFmpeg path
  const ffmpegResult = await resolveFfmpegPath(settings.ffmpegLocation);
  if (!ffmpegResult.ok) {
    return {
      success: false,
      error: ffmpegResult.error
    };
  }
  const ffmpegPath = ffmpegResult.path;

  // 2. Resolve yt-dlp path
  const ytDlpResult = await resolveYtDlpPath(settings.ytdlpLocation);
  if (!ytDlpResult.ok) {
    // Mark all tasks as error
    for (const task of tasks) {
      downloadManager.updateTask(task.url, {
        status: STATUS.ERROR,
        errorMessage: `yt-dlp not available: ${ytDlpResult.error}`
      }, webContents);
    }
    return { success: false, error: ytDlpResult.error };
  }

  const ytdlpPath = ytDlpResult.path;
  const maxParallel = Math.max(1, Math.min(10, settings.maxParallelDownloads || 3));
  const semaphore = new Semaphore(maxParallel);

  // Ensure download directory exists
  if (!fs.existsSync(settings.downloadLocation)) {
    fs.mkdirSync(settings.downloadLocation, { recursive: true });
  }

  // Process each task independently
  const promises = tasks.map(async (task) => {
    await semaphore.acquire();

    try {
      // extracting_info
      downloadManager.updateTask(task.url, {
        status: STATUS.EXTRACTING_INFO,
        progress: 0
      }, webContents);

      let metadata;
      try {
        metadata = await getMetadata(task.url, ytdlpPath);
      } catch (err) {
        downloadManager.updateTask(task.url, {
          status: STATUS.ERROR,
          errorMessage: `Metadata extraction failed: ${err.message}`,
          progress: 0
        }, webContents);
        return;
      }

      // Update task with metadata
      downloadManager.updateTask(task.url, {
        title: metadata.title,
        duration: metadata.duration
      }, webContents);

      // Pre-download file-existence check
      const isVideo = task.format === 'video';
      const expectedPath = buildExpectedPath(metadata.title, settings.downloadLocation, isVideo ? 'video' : 'audio');
      if (fs.existsSync(expectedPath)) {
        downloadManager.updateTask(task.url, {
          status: STATUS.ALREADY_EXISTS,
          progress: 100,
          filePath: expectedPath
        }, webContents);
        return;
      }

      // Start downloading
      downloadManager.updateTask(task.url, {
        status: STATUS.DOWNLOADING,
        progress: 0
      }, webContents);

      // Build task with fresh duration for long-video check
      const taskWithDuration = { ...task, duration: metadata.duration };
      if (!taskWithDuration.duration) taskWithDuration.duration = metadata.duration;

      await new Promise((resolve) => {
        const downloadParams = {
          url: task.url,
          task: taskWithDuration,
          settings,
          ytdlpPath,
          onProgress: ({ status, progress, speed }) => {
            downloadManager.updateTask(task.url, { status, progress, speed }, webContents);
          },
          onError: (msg) => {
            downloadManager.updateTask(task.url, {
              status: STATUS.ERROR,
              errorMessage: msg,
              progress: 0
            }, webContents);
          },
          onClose: (success, errorMessage) => {
            if (success) {
              downloadManager.updateTask(task.url, {
                status: STATUS.COMPLETED,
                progress: 100,
                filePath: expectedPath
              }, webContents);
            } else {
              downloadManager.updateTask(task.url, {
                status: STATUS.ERROR,
                errorMessage: errorMessage || 'Download failed',
                progress: 0
              }, webContents);
            }
            resolve();
          }
        };

        // Route to the correct download function based on format
        if (isVideo) {
          downloadVideo({ ...downloadParams, quality: task.quality || '1080' });
        } else {
          downloadAudio({ ...downloadParams, ffmpegPath });
        }
      });

    } catch (err) {
      downloadManager.updateTask(task.url, {
        status: STATUS.ERROR,
        errorMessage: err.message || 'Unexpected error during download',
        progress: 0
      }, webContents);
    } finally {
      semaphore.release();
    }
  });

  // Fire and forget — downloads run async
  Promise.allSettled(promises).then(() => {
    console.log('[queueRunner] All downloads finished or errored');
  });

  return { success: true };
}

module.exports = { startDownloads, Semaphore };
