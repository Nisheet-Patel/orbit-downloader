const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PLATFORM_BINARY = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

/**
 * Validate whether a given path points to a working FFmpeg executable.
 * Mirrors the Python `validate_ffmpeg_path` logic.
 *
 * @param {string} inputPath
 * @returns {Promise<{ valid: boolean, version?: string, reason?: string, resolvedPath?: string }>}
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
  } catch (_err) {
    return { valid: false, reason: 'Could not inspect path' };
  }

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
        const versionLine = stdout.split('\n')[0] || '';
        resolve({ valid: true, version: versionLine.trim() || undefined, resolvedPath: resolved });
      } else {
        resolve({ valid: false, reason: `FFmpeg exited with code ${code}` });
      }
    });
  });
}

/**
 * Resolves FFmpeg using the priority:
 * 1. Manual override path
 * 2. CWD /bin/ffmpeg.exe
 * 3. CWD /ffmpeg.exe
 * 4. Repo root /bin/ffmpeg.exe
 * 5. Repo root /ffmpeg.exe
 * 6. System PATH
 *
 * @param {string} [manualPath]
 * @returns {Promise<{ ok: boolean, path?: string, error?: string }>}
 */
async function resolveFfmpegPath(manualPath) {
  const candidates = [];
  if (manualPath && manualPath.trim()) {
    candidates.push(manualPath.trim());
  }
  const { app } = require('electron');
  const binDir = app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'bin')
    : path.join(app.getAppPath(), 'bin');
  candidates.push(path.join(binDir, PLATFORM_BINARY));

  const devSubdir = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
  candidates.push(path.join(process.resourcesPath, 'bin', PLATFORM_BINARY));
  candidates.push(path.join(process.cwd(), 'bin', devSubdir, PLATFORM_BINARY));
  candidates.push(path.join(process.cwd(), 'bin', PLATFORM_BINARY));
  candidates.push(path.join(process.cwd(), PLATFORM_BINARY));
  candidates.push(path.join(__dirname, '..', 'bin', devSubdir, PLATFORM_BINARY));
  candidates.push(path.join(__dirname, '..', 'bin', PLATFORM_BINARY));
  candidates.push(path.join(__dirname, '..', PLATFORM_BINARY));
  candidates.push(PLATFORM_BINARY);

  for (const candidate of candidates) {
    const check = await validateFfmpegPath(candidate);
    if (check.valid) {
      return { ok: true, path: check.resolvedPath };
    }
  }

  return {
    ok: false,
    error: 'Could not locate a working FFmpeg executable in Settings, bin folders, current directory, or system PATH.'
  };
}

module.exports = { validateFfmpegPath, resolveFfmpegPath };
