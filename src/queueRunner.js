const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
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
  
  const ytdlpPath = ytDlpResult.ok ? ytDlpResult.path : null;

  // We don't fail immediately. We fail per task if the required binary is missing.
  
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
      if (!downloadManager.tasks.has(task.id || task.url)) {
        return;
      }

      // extracting_info
      downloadManager.updateTask(task.id || task.url, {
        status: STATUS.EXTRACTING_INFO,
        progress: 0
      }, webContents);

      let metadata;
      let metadataProcess = null;
      try {
        const getMetadataPromise = new Promise((resolve, reject) => {
          if (!ytdlpPath) return reject(new Error('yt-dlp is not installed'));
          const args = ['--dump-single-json', '--no-warnings', '--skip-download'];
          if (settings.cookiesFromBrowser) {
            args.push('--cookies-from-browser', settings.cookiesFromBrowser);
          }
          args.push(task.url);
          const child = spawn(ytdlpPath, args, { timeout: 30000 });
          metadataProcess = child;
          
          let stdout = '';
          let stderr = '';
          child.stdout.on('data', (d) => { stdout += d.toString(); });
          child.stderr.on('data', (d) => { stderr += d.toString(); });
          child.on('error', (err) => reject(err));
          child.on('close', (code) => {
            if (code !== 0) {
              reject(new Error(stderr || stdout || 'Unknown error'));
            } else {
              try {
                const info = JSON.parse(stdout);
                resolve({
                  title: info.title || 'Unknown Title',
                  duration: info.duration || 0,
                  uploader: info.uploader || 'Unknown',
                  viewCount: info.view_count || 0,
                  thumbnailUrl: info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : '')
                });
              } catch (e) {
                reject(e);
              }
            }
          });
        });

        downloadManager.activeDownloads.set(task.id || task.url, metadataProcess);
        metadata = await getMetadataPromise;
      } catch (err) {
        if (!downloadManager.tasks.has(task.id || task.url)) {
          return;
        }
        downloadManager.updateTask(task.id || task.url, {
          status: STATUS.ERROR,
          errorMessage: `Metadata extraction failed: ${err.message}`,
          progress: 0
        }, webContents);
        return;
      } finally {
        downloadManager.activeDownloads.delete(task.id || task.url);
      }

      if (!downloadManager.tasks.has(task.id || task.url)) {
        return;
      }

      // Update task with metadata
      downloadManager.updateTask(task.id || task.url, {
        title: metadata.title,
        duration: metadata.duration
      }, webContents);

      // Pre-download file-existence check
      const isVideo = task.format === 'video';
      const expectedPath = buildExpectedPath(metadata.title, settings.downloadLocation, isVideo ? 'video' : 'audio');
      if (fs.existsSync(expectedPath)) {
        downloadManager.updateTask(task.id || task.url, {
          status: STATUS.ALREADY_EXISTS,
          progress: 100,
          filePath: expectedPath
        }, webContents);
        return;
      }

      // Start downloading
      downloadManager.updateTask(task.id || task.url, {
        status: STATUS.DOWNLOADING,
        progress: 0
      }, webContents);

      if (!downloadManager.tasks.has(task.id || task.url)) {
        return;
      }

      // Build task with fresh duration for long-video check
      const taskWithDuration = { ...task, duration: metadata.duration };
      if (!taskWithDuration.duration) taskWithDuration.duration = metadata.duration;

      await new Promise((resolve) => {
        if (!downloadManager.tasks.has(task.id || task.url)) {
          resolve();
          return;
        }

        const downloadParams = {
          url: task.url,
          task: taskWithDuration,
          settings,
          ytdlpPath,
          onProgress: ({ status, progress, speed }) => {
            if (downloadManager.tasks.has(task.id || task.url)) {
              downloadManager.updateTask(task.id || task.url, { status, progress, speed }, webContents);
            }
          },
          onError: (msg) => {
            if (downloadManager.tasks.has(task.id || task.url)) {
              downloadManager.updateTask(task.id || task.url, {
                status: STATUS.ERROR,
                errorMessage: msg,
                progress: 0
              }, webContents);
            }
          },
          onClose: (success, errorMessage) => {
            downloadManager.activeDownloads.delete(task.id || task.url);
            if (downloadManager.tasks.has(task.id || task.url)) {
              if (success) {
                downloadManager.updateTask(task.id || task.url, {
                  status: STATUS.COMPLETED,
                  progress: 100,
                  filePath: expectedPath
                }, webContents);
              } else {
                downloadManager.updateTask(task.id || task.url, {
                  status: STATUS.ERROR,
                  errorMessage: errorMessage || 'Download failed',
                  progress: 0
                }, webContents);
              }
            }
            resolve();
          }
        };

        // Route to the correct download function based on format and platform
        let handle;
        if (isVideo) {
          handle = downloadVideo({ ...downloadParams, quality: task.quality || '1080', ffmpegPath });
        } else {
          handle = downloadAudio({ ...downloadParams, ffmpegPath });
        }
        downloadManager.activeDownloads.set(task.id || task.url, handle);
      });

    } catch (err) {
      if (downloadManager.tasks.has(task.id || task.url)) {
        downloadManager.updateTask(task.id || task.url, {
          status: STATUS.ERROR,
          errorMessage: err.message || 'Unexpected error during download',
          progress: 0
        }, webContents);
      }
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
