const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { sanitizeFilename } = require('./utils');

// ------------------------------------------------------------------
// Metadata extraction
// ------------------------------------------------------------------

/**
 * Fetch video metadata via yt-dlp without downloading.
 * @param {string} url
 * @param {string} ytdlpPath
 * @param {string} [cookiesFromBrowser]
 * @returns {Promise<{title, duration, uploader, viewCount}>}
 */
function getMetadata(url, ytdlpPath, cookiesFromBrowser) {
  return new Promise((resolve, reject) => {
    const args = ['--dump-single-json', '--no-warnings', '--skip-download'];
    if (cookiesFromBrowser) {
      args.push('--cookies-from-browser', cookiesFromBrowser);
    }
    args.push(url);
    const child = spawn(ytdlpPath, args, { timeout: 30000 });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp for metadata: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp metadata extraction failed (exit ${code}): ${stderr || stdout || 'Unknown error'}`));
        return;
      }
      try {
        const info = JSON.parse(stdout);
        resolve({
          title: info.title || 'Unknown Title',
          duration: info.duration || 0,
          uploader: info.uploader || 'Unknown',
          viewCount: info.view_count || 0,
          thumbnailUrl: info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : '')
        });
      } catch (err) {
        reject(new Error(`Failed to parse metadata JSON: ${err.message}`));
      }
    });
  });
}

// ------------------------------------------------------------------
// Download + progress parsing
// ------------------------------------------------------------------

/**
 * Format raw speed (bytes/sec) into human-readable string.
 * Mirrors Python: speed > 1024*1024 → MB/s, > 1024 → KB/s, else B/s.
 */
function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  if (bytesPerSec > 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  } else if (bytesPerSec > 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${Math.round(bytesPerSec)} B/s`;
}

/**
 * Spawns yt-dlp to download audio, with progress callbacks.
 * @param {Object} params
 * @param {string} params.url
 * @param {Object} params.task — task object (for duration check)
 * @param {Object} params.settings — { downloadLocation, audioQuality }
 * @param {string} params.ytdlpPath
 * @param {string} params.ffmpegPath
 * @param {Function} params.onProgress — called with { status, progress, speed }
 * @param {Function} params.onError — called with error message string
 * @param {Function} params.onClose — called with (success) on process close
 * @returns {{kill: Function}} returns a kill function for cancellation
 */
function downloadAudio({ url, task, settings, ytdlpPath, ffmpegPath, onProgress, onError, onClose }) {
  const args = [
    '-f', 'bestaudio/best',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', (task && task.quality) || settings.audioQuality || '320',
    '--ffmpeg-location', ffmpegPath || 'ffmpeg',
    '-o', path.join(settings.downloadLocation, '%(title)s.%(ext)s'),
    '--newline',
    '-v', // verbose for progress lines
  ];

  if (settings && settings.cookiesFromBrowser) {
    args.push('--cookies-from-browser', settings.cookiesFromBrowser);
  }

  // Long video (> 30 min) handling
  if (task && task.duration && task.duration > 1800) {
    args.push('--fragment-retries', '5', '--concurrent-fragments', '6');
  }

  args.push(url);

  const child = spawn(ytdlpPath, args, { timeout: 0 });
  let stderrBuffer = '';

  // ----------------------------------------------------------------
  // stdout line parsing
  // ----------------------------------------------------------------
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data) => {
    const lines = data.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect conversion/post-processing
      if (/(ExtractAudio|ffmpeg|Merger)/.test(trimmed)) {
        onProgress({ status: 'converting', progress: 100, speed: '' });
        continue;
      }

      // Match: [download]  12.3% of ~56.78MiB at  1.23MiB/s ETA 00:45
      const match = trimmed.match(/\[download\]\s+([\d.]+)%\s+of\s+.+\s+at\s+(\S+\/s)\s+ETA/);
      if (match) {
        const progress = parseFloat(match[1]);
        const speed = match[2];
        onProgress({ status: 'downloading', progress, speed });
        continue;
      }

      // Fallback: looser match for speed and percent
      const looseMatch = trimmed.match(/([\d.]+%)\s+.+(KiB\/s|MiB\/s|B\/s)/);
      if (looseMatch) {
        const rawPct = looseMatch[1].replace('%', '');
        const speed = looseMatch[2];
        const progress = parseFloat(rawPct);
        onProgress({ status: 'downloading', progress, speed });
      }
    }
  });

  child.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
  });

  child.on('error', (err) => {
    const msg = `Spawn error: ${err.message}`;
    onClose(false, msg);
  });

  child.on('close', (code) => {
    if (code === 0) {
      onClose(true);
    } else {
      // Extract useful part of stderr/stdout
      const errorTail = stderrBuffer.split('\n').slice(-5).join('\n').trim();
      const message = errorTail || `yt-dlp exited with code ${code}`;
      onClose(false, message);
    }
  });

  return {
    kill: () => child.kill('SIGTERM')
  };
}

// ------------------------------------------------------------------
// Video download + progress parsing
// ------------------------------------------------------------------

/**
 * Spawns yt-dlp to download video, with progress callbacks.
 * @param {Object} params
 * @param {string} params.url
 * @param {Object} params.task
 * @param {Object} params.settings
 * @param {string} params.ytdlpPath
 * @param {string} params.quality
 * @param {Function} params.onProgress
 * @param {Function} params.onError
 * @param {Function} params.onClose
 * @returns {{kill: Function}}
 */
function downloadVideo({ url, task, settings, ytdlpPath, quality, onProgress, onError, onClose }) {
  const height = parseInt(quality, 10) || 1080;
  const formatFilter = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;

  const args = [
    '-f', formatFilter,
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', settings.ffmpegLocation || 'ffmpeg',
    '-o', path.join(settings.downloadLocation, '%(title)s.%(ext)s'),
    '--newline',
    '-v',
  ];

  if (settings && settings.cookiesFromBrowser) {
    args.push('--cookies-from-browser', settings.cookiesFromBrowser);
  }

  if (task && task.duration && task.duration > 1800) {
    args.push('--fragment-retries', '5', '--concurrent-fragments', '6');
  }

  args.push(url);

  const child = spawn(ytdlpPath, args, { timeout: 0 });
  let stderrBuffer = '';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data) => {
    const lines = data.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/\b(Merger|ffmpeg)\b/.test(trimmed)) {
        onProgress({ status: 'converting', progress: 95, speed: '' });
        continue;
      }

      const match = trimmed.match(/\[download\]\s+([\d.]+)%\s+of\s+.+\s+at\s+(\S+\/s)\s+ETA/);
      if (match) {
        const progress = parseFloat(match[1]);
        const speed = match[2];
        onProgress({ status: 'downloading', progress, speed });
        continue;
      }

      const looseMatch = trimmed.match(/([\d.]+%)\s+.+?(KiB\/s|MiB\/s|B\/s)/);
      if (looseMatch) {
        const rawPct = looseMatch[1].replace('%', '');
        const speed = looseMatch[2];
        const progress = parseFloat(rawPct);
        onProgress({ status: 'downloading', progress, speed });
      }
    }
  });

  child.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
  });

  child.on('error', (err) => {
    onClose(false, `Spawn error: ${err.message}`);
  });

  child.on('close', (code) => {
    if (code === 0) {
      onClose(true);
    } else {
      const errorTail = stderrBuffer.split('\n').slice(-5).join('\n').trim();
      const message = errorTail || `yt-dlp exited with code ${code}`;
      onClose(false, message);
    }
  });

  return {
    kill: () => child.kill('SIGTERM')
  };
}

/**
 * Build the expected output MP3 path for a video title.
 * @param {string} title
 * @param {string} downloadLocation
 * @returns {string}
 */
function buildExpectedPath(title, downloadLocation, format = 'audio') {
  const safeTitle = sanitizeFilename(title);
  const ext = format === 'video' ? '.mp4' : '.mp3';
  return path.join(downloadLocation, `${safeTitle}${ext}`);
}

module.exports = {
  getMetadata,
  downloadAudio,
  downloadVideo,
  buildExpectedPath,
  formatSpeed
};
