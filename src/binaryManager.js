const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const PLATFORM_BINARY = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

function getBundledPath() {
  // electron-builder / asar-unpacked resources
  const resourcesPath = process.resourcesPath;
  let candidate = path.join(resourcesPath, 'bin', PLATFORM_BINARY);
  if (fs.existsSync(candidate)) return candidate;

  // Fallback for development (repo root bin/win/ or bin/)
  const devSubdir = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
  candidate = path.join(__dirname, '..', 'bin', devSubdir, PLATFORM_BINARY);
  if (fs.existsSync(candidate)) return candidate;

  candidate = path.join(__dirname, '..', 'bin', PLATFORM_BINARY);
  if (fs.existsSync(candidate)) return candidate;

  return null;
}

function getDownloadedPath() {
  const binDir = app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'bin')
    : path.join(app.getAppPath(), 'bin');
  const userBin = path.join(binDir, PLATFORM_BINARY);
  if (fs.existsSync(userBin)) return userBin;
  return null;
}

/**
 * Hybrid yt-dlp path resolution:
 * 1. Manual override path
 * 2. CWD bin/yt-dlp
 * 3. CWD yt-dlp
 * 4. Bundled binary (resources/bin or repo root bin)
 * 5. Previously auto-downloaded copy in userData/bin
 * 6. Download latest from GitHub
 * 7. Fail
 *
 * @param {string} [manualOverride] — optional manual path from settings
 * @returns {Promise<{ok: boolean, path?: string, source?: string, error?: string}>}
 */
async function resolveYtDlpPath(manualOverride) {
  try {
    // 1. Manual override
    if (manualOverride) {
      let resolvedManual = manualOverride.trim();
      if (fs.existsSync(resolvedManual)) {
        const stats = fs.statSync(resolvedManual);
        if (stats.isDirectory()) {
          resolvedManual = path.join(resolvedManual, PLATFORM_BINARY);
        }
        if (fs.existsSync(resolvedManual)) {
          return { ok: true, path: resolvedManual, source: 'manual' };
        }
      }
    }

    // 2. CWD bin/yt-dlp
    let candidate = path.join(process.cwd(), 'bin', PLATFORM_BINARY);
    if (fs.existsSync(candidate)) {
      return { ok: true, path: candidate, source: 'current_bin' };
    }

    // 3. CWD yt-dlp
    candidate = path.join(process.cwd(), PLATFORM_BINARY);
    if (fs.existsSync(candidate)) {
      return { ok: true, path: candidate, source: 'current_dir' };
    }

    // 4. Bundled
    candidate = getBundledPath();
    if (candidate) {
      return { ok: true, path: candidate, source: 'bundled' };
    }

    // 5. Previously downloaded
    candidate = getDownloadedPath();
    if (candidate) {
      return { ok: true, path: candidate, source: 'downloaded' };
    }

    // 6. Fail
    return {
      ok: false,
      error: `Could not locate ${PLATFORM_BINARY}, and no valid manual path was provided.`
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { resolveYtDlpPath };
