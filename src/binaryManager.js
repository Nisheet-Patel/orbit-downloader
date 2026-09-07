const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const PLATFORM_YTDLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';


function getBundledPath(binaryName) {
  // electron-builder / asar-unpacked resources
  const resourcesPath = process.resourcesPath;
  let candidate = path.join(resourcesPath, 'bin', binaryName);
  if (fs.existsSync(candidate)) return candidate;

  // Fallback for development (repo root bin/win/ or bin/)
  const devSubdir = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
  candidate = path.join(__dirname, '..', 'bin', devSubdir, binaryName);
  if (fs.existsSync(candidate)) return candidate;

  candidate = path.join(__dirname, '..', 'bin', binaryName);
  if (fs.existsSync(candidate)) return candidate;

  return null;
}

function getDownloadedPath(binaryName) {
  const binDir = app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'bin')
    : path.join(app.getAppPath(), 'bin');
  const userBin = path.join(binDir, binaryName);
  if (fs.existsSync(userBin)) return userBin;
  return null;
}

async function resolveBinaryPath(binaryName, manualOverride) {
  try {
    // 1. Manual override
    if (manualOverride) {
      let resolvedManual = manualOverride.trim();
      if (fs.existsSync(resolvedManual)) {
        const stats = fs.statSync(resolvedManual);
        if (stats.isDirectory()) {
          resolvedManual = path.join(resolvedManual, binaryName);
        }
        if (fs.existsSync(resolvedManual)) {
          return { ok: true, path: resolvedManual, source: 'manual' };
        }
      }
    }

    // 2. CWD bin/
    let candidate = path.join(process.cwd(), 'bin', binaryName);
    if (fs.existsSync(candidate)) {
      return { ok: true, path: candidate, source: 'current_bin' };
    }

    // 3. CWD
    candidate = path.join(process.cwd(), binaryName);
    if (fs.existsSync(candidate)) {
      return { ok: true, path: candidate, source: 'current_dir' };
    }

    // 4. Bundled
    candidate = getBundledPath(binaryName);
    if (candidate) {
      return { ok: true, path: candidate, source: 'bundled' };
    }

    // 5. Previously downloaded
    candidate = getDownloadedPath(binaryName);
    if (candidate) {
      return { ok: true, path: candidate, source: 'downloaded' };
    }

    // 6. Fail
    return {
      ok: false,
      error: `Could not locate ${binaryName}, and no valid manual path was provided.`
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function resolveYtDlpPath(manualOverride) {
  return resolveBinaryPath(PLATFORM_YTDLP, manualOverride);
}



module.exports = { resolveYtDlpPath };
