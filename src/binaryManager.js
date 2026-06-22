const fs = require('fs');
const path = require('path');
const https = require('https');
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
  const userBin = path.join(app.getPath('userData'), 'bin', PLATFORM_BINARY);
  if (fs.existsSync(userBin)) return userBin;
  return null;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Download failed with status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    });
    request.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
    request.on('timeout', () => {
      request.destroy();
      fs.unlink(dest, () => {});
      reject(new Error('Download request timed out'));
    });
  });
}

async function downloadYtDlp() {
  const destDir = path.join(app.getPath('userData'), 'bin');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const destPath = path.join(destDir, PLATFORM_BINARY);

  const assetName = process.platform === 'win32'
    ? 'yt-dlp.exe'
    : process.platform === 'darwin'
      ? 'yt-dlp_macos'
      : 'yt-dlp_linux';

  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;

  try {
    await downloadFile(url, destPath);
    if (process.platform !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    return destPath;
  } catch (err) {
    throw new Error(`Failed to download yt-dlp: ${err.message}`);
  }
}

/**
 * Hybrid yt-dlp path resolution:
 * 1. Bundled binary (resources/bin or repo root bin)
 * 2. Previously auto-downloaded copy in userData/bin
 * 3. Download latest from GitHub
 * 4. Manual override path
 * 5. Fail
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

    // 6. Download latest
    try {
      const downloaded = await downloadYtDlp();
      return { ok: true, path: downloaded, source: 'downloaded' };
    } catch (downloadErr) {
      // continue
    }

    // 7. Fail
    return {
      ok: false,
      error: `Could not locate or download ${PLATFORM_BINARY}, and no valid manual path was provided.`
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { resolveYtDlpPath };
