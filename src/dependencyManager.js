const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
const { app, ipcMain, dialog } = require('electron');
const Store = require('electron-store');
const log = require('electron-log');
const AdmZip = require('adm-zip');

const store = new Store();

const { resolveYtDlpPath } = require('./binaryManager');
const { resolveFfmpegPath } = require('./ffmpegValidator');
const { getSettings } = require('./settingsStore');

// Registry of external dependencies
const DEPENDENCY_REGISTRY = {
  ytdlp: {
    id: 'ytdlp',
    name: 'yt-dlp',
    exeName: 'yt-dlp.exe',
    defaultUrl: 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.06.09/yt-dlp.exe',
    validationArgs: ['--version']
  },
  ffmpeg: {
    id: 'ffmpeg',
    name: 'FFmpeg',
    exeName: 'ffmpeg.exe',
    defaultUrl: 'https://github.com/GyanD/codexffmpeg/releases/download/7.0.1/ffmpeg-7.0.1-essentials_build.zip',
    validationArgs: ['-version']
  }
};

// State cache
const dependencyStates = {
  ytdlp: { status: 'missing', progress: 0, error: null },
  ffmpeg: { status: 'missing', progress: 0, error: null }
};

let webContentsRef = null;

function setWebContents(wc) {
  webContentsRef = wc;
}

function notifyState(id) {
  if (webContentsRef && !webContentsRef.isDestroyed()) {
    webContentsRef.send('dependency:status-change', {
      id,
      ...dependencyStates[id]
    });
  }
}

function getBinDir() {
  return app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'bin')
    : path.join(app.getAppPath(), 'bin');
}

// Check if a dependency is installed and matches its configured URL
async function checkDependency(id) {
  if (dependencyStates[id] && dependencyStates[id].status === 'downloading') {
    return 'downloading';
  }

  const dep = DEPENDENCY_REGISTRY[id];
  if (!dep) return 'missing';

  const settings = getSettings();
  let resolved = false;
  let resolvedPath = '';

  if (id === 'ytdlp') {
    const res = await resolveYtDlpPath(settings.ytdlpLocation);
    if (res.ok) {
      resolved = true;
      resolvedPath = res.path;
    }
  } else if (id === 'ffmpeg') {
    const res = await resolveFfmpegPath(settings.ffmpegLocation);
    if (res.ok) {
      resolved = true;
      resolvedPath = res.path;
    }
  }

  if (!resolved) {
    dependencyStates[id] = { status: 'missing', progress: 0, error: null };
    return 'missing';
  }

  // Check if configured URL has changed
  const downloadedUrls = store.get('downloadedDependencyUrls') || {};
  if (downloadedUrls[id] !== dep.defaultUrl) {
    // If it's a local bin directory file, mark missing so we download the new URL
    const userBinDir = getBinDir();
    const exePath = path.join(userBinDir, dep.exeName);
    if (fs.existsSync(exePath)) {
      dependencyStates[id] = { status: 'missing', progress: 0, error: null };
      return 'missing';
    }
  }

  dependencyStates[id] = { status: 'installed', progress: 100, error: null, path: resolvedPath };
  return 'installed';
}

async function checkAllDependencies() {
  const results = {};
  for (const id of Object.keys(DEPENDENCY_REGISTRY)) {
    results[id] = await checkDependency(id);
  }
  return results;
}

// Download a file with progress tracking
function downloadFileWithProgress(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        return downloadFileWithProgress(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Server returned code ${response.statusCode}`));
      }

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        file.write(chunk);

        if (totalBytes > 0) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100);
          onProgress(percent);
        }
      });

      response.on('end', () => {
        file.end();
      });

      file.on('finish', () => {
        file.close(() => resolve());
      });
    });

    request.on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => { });
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      fs.unlink(destPath, () => { });
      reject(new Error('Connection timed out'));
    });
  });
}

// Helper to find a file inside an extracted directory recursively
function findFileInDir(dir, fileName) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const found = findFileInDir(filePath, fileName);
      if (found) return found;
    } else if (file.toLowerCase() === fileName.toLowerCase()) {
      return filePath;
    }
  }
  return null;
}

// Validate binary by executing it
function validateBinary(filePath, args) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve(false);
      return;
    }

    try {
      const child = spawn(filePath, args, { timeout: 5000 });
      child.on('error', () => {
        resolve(false);
      });
      child.on('close', (code) => {
        resolve(code === 0);
      });
    } catch {
      resolve(false);
    }
  });
}

// Main download and installation handler
async function installDependency(id, retryCount = 3) {
  const dep = DEPENDENCY_REGISTRY[id];
  if (!dep) throw new Error(`Unknown dependency ${id}`);

  dependencyStates[id] = { status: 'downloading', progress: 0, error: null };
  notifyState(id);

  const userBinDir = getBinDir();
  if (!fs.existsSync(userBinDir)) {
    fs.mkdirSync(userBinDir, { recursive: true });
  }

  const tempDir = path.join(app.getPath('userData'), 'temp_dep');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const isZip = dep.defaultUrl.toLowerCase().endsWith('.zip');
  const tempFileName = isZip ? `${id}_temp_${Date.now()}.zip` : `${id}_temp_${Date.now()}.exe`;
  const tempFilePath = path.join(tempDir, tempFileName);
  const finalDest = path.join(userBinDir, dep.exeName);

  let attempt = 0;
  while (attempt < retryCount) {
    try {
      attempt++;
      log.info(`Dependency [${id}]: Download attempt ${attempt}/${retryCount} from ${dep.defaultUrl}`);

      // Download
      await downloadFileWithProgress(dep.defaultUrl, tempFilePath, (percent) => {
        dependencyStates[id].progress = percent;
        notifyState(id);
      });

      log.info(`Dependency [${id}]: Download completed. Processing...`);

      // Ensure final destination directory exists
      if (!fs.existsSync(path.dirname(finalDest))) {
        fs.mkdirSync(path.dirname(finalDest), { recursive: true });
      }

      // Try to remove old binary at target if it exists, to avoid locked-file EPERM errors
      if (fs.existsSync(finalDest)) {
        try {
          fs.unlinkSync(finalDest);
        } catch (unlinkErr) {
          log.warn(`Could not delete existing binary at ${finalDest}: ${unlinkErr.message}`);
          if (process.platform === 'win32') {
            try {
              require('child_process').execSync(`taskkill /F /IM ${dep.exeName}`, { stdio: 'ignore' });
              await new Promise(r => setTimeout(r, 500));
              fs.unlinkSync(finalDest);
            } catch (killErr) {
              log.error(`Failed to kill process or delete file: ${killErr.message}`);
            }
          }
        }
      }

      if (isZip) {
        // Extract ZIP
        const extractDir = path.join(tempDir, `${id}_extracted_${Date.now()}`);
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        }
        fs.mkdirSync(extractDir, { recursive: true });

        const zip = new AdmZip(tempFilePath);
        zip.extractAllTo(extractDir, true);

        // Find executable inside extracted files
        const extractedExe = findFileInDir(extractDir, dep.exeName);
        if (!extractedExe) {
          throw new Error(`Could not find ${dep.exeName} inside the downloaded archive`);
        }

        // Copy to final dest
        fs.copyFileSync(extractedExe, finalDest);

        // Clean up extracted files
        fs.rmSync(extractDir, { recursive: true, force: true });
      } else {
        // Single binary
        fs.copyFileSync(tempFilePath, finalDest);
      }

      // Cleanup temp download file
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkErr) {
          log.warn(`Could not clean up temp file ${tempFilePath}: ${unlinkErr.message}`);
        }
      }

      // Validate
      log.info(`Dependency [${id}]: Validating executable...`);
      const isValid = await validateBinary(finalDest, dep.validationArgs);
      if (!isValid) {
        throw new Error('Downloaded binary failed execution validation');
      }

      // Success
      log.info(`Dependency [${id}]: Installed successfully`);
      dependencyStates[id] = { status: 'installed', progress: 100, error: null };

      // Save downloaded URL
      const downloadedUrls = store.get('downloadedDependencyUrls') || {};
      downloadedUrls[id] = dep.defaultUrl;
      store.set('downloadedDependencyUrls', downloadedUrls);

      notifyState(id);
      return;

    } catch (err) {
      log.error(`Dependency [${id}]: Attempt ${attempt} failed: ${err.message}`);
      
      // Clean up temp file on failure
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkErr) {}
      }

      if (attempt >= retryCount) {
        dependencyStates[id] = { status: 'failed', progress: 0, error: err.message };
        notifyState(id);
        throw err;
      }
      // Wait 1s before retry
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Register IPC handlers
function registerDependencyIPC() {
  ipcMain.handle('dependency:get-status', async () => {
    await checkAllDependencies();
    const result = {};
    for (const id of Object.keys(DEPENDENCY_REGISTRY)) {
      result[id] = {
        id,
        name: DEPENDENCY_REGISTRY[id].name,
        exeName: DEPENDENCY_REGISTRY[id].exeName,
        url: DEPENDENCY_REGISTRY[id].defaultUrl,
        ...dependencyStates[id]
      };
    }
    return result;
  });

  ipcMain.handle('dependency:download-one', async (event, id) => {
    setWebContents(event.sender);
    try {
      await installDependency(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('dependency:download-all', async (event) => {
    setWebContents(event.sender);
    const ids = Object.keys(DEPENDENCY_REGISTRY);
    const promises = ids.map(id => {
      if (dependencyStates[id].status !== 'installed') {
        return installDependency(id).catch(() => { }); // handle individually
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    return await checkAllDependencies();
  });
}

module.exports = {
  setWebContents,
  checkAllDependencies,
  installDependency,
  registerDependencyIPC,
  DEPENDENCY_REGISTRY
};
