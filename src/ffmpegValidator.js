const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PLATFORM_BINARY = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

/**
 * Validate whether a given path points to a working FFmpeg executable.
 * Mirrors the Python `validate_ffmpeg_path` logic.
 *  1. Empty path → invalid.
 *  2. If inputPath is a directory, look for `ffmpeg.exe` / `ffmpeg` inside it.
 *  3. Otherwise treat inputPath as the executable itself.
 *  4. Spawn `<resolved> -version` with a 5-second timeout.
 *  5. Valid only if exits with code 0 before timeout.
 *
 * @param {string} inputPath
 * @returns {Promise<{ valid: boolean, version?: string, reason?: string }>}
 */
async function validateFfmpegPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string' || inputPath.trim() === '') {
    return { valid: false, reason: 'Path is empty' };
  }

  const trimmed = inputPath.trim();
  let resolved = trimmed;

  try {
    if (fs.existsSync(trimmed)) {
      const stats = fs.statSync(trimmed);
      if (stats.isDirectory()) {
        resolved = path.join(trimmed, PLATFORM_BINARY);
        if (!fs.existsSync(resolved)) {
          return {
            valid: false,
            reason: `FFmpeg not found in directory (looked for ${PLATFORM_BINARY})`
          };
        }
      }
    }
    // Fall through to try the path as-is even if fs.existsSync fails —
    // the binary might be on the system PATH.
  } catch (_err) {
    return { valid: false, reason: 'Could not inspect path' };
  }

  // ------------------------------------------------------------------
  // Spawn the binary with a  5-second-timeout
  // ------------------------------------------------------------------
  return new Promise((resolve) => {
    const child = spawn(resolved, ['-version'], { timeout: 5000 });
    let stdout = '';
    let timedOut = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('error', (_err) => {
      resolve({ valid: false, reason: 'Could not launch FFmpeg executable' });
    });

    child.on('timeout', () => {
      timedOut = true;
      child.kill();
      resolve({ valid: false, reason: 'FFmpeg validation timed out (>5s)' });
    });

    child.on('close', (code) => {
      if (timedOut) return;
      if (code === 0) {
        // Try to grab the first line (version string) from stdout.
        const versionLine = stdout.split('\n')[0] || '';
        resolve({ valid: true, version: versionLine.trim() || undefined });
      } else {
        resolve({ valid: false, reason: `FFmpeg exited with code ${code}` });
      }
    });
  });
}

module.exports = { validateFfmpegPath };
