// ------------------------------------------------------------------
// Orbit Renderer — Task 2 (Settings Tab, Validation, Toasts)
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // ================================================================
  // DOM References
  // ================================================================
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const downloadLocationInput = document.getElementById('download-location');
  const audioQualitySelect = document.getElementById('audio-quality');
  const maxParallelSlider = document.getElementById('max-parallel');
  const maxParallelValue = document.getElementById('max-parallel-value');
  const ffmpegLocationInput = document.getElementById('ffmpeg-location');
  const ytdlpLocationInput = document.getElementById('ytdlp-location');
  const ffmpegStatusEl = document.getElementById('ffmpeg-status');
  const ffmpegGuideEl = document.getElementById('ffmpeg-guide');
  const ytdlpStatusDisplay = document.getElementById('ytdlp-status-display');
  const toastContainer = document.getElementById('toast-container');

  const btnBrowse = document.getElementById('btn-browse');
  const btnValidateFfmpeg = document.getElementById('btn-validate-ffmpeg');
  const btnRecheckYtDlp = document.getElementById('btn-recheck-ytdlp');
  const btnSave = document.getElementById('btn-save-settings');

  // ================================================================
  // Tab Switching
  // ================================================================
  function switchTab(tabName) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // ================================================================
  // Toast Notification System
  // ================================================================
  function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span>${iconMap[type] || '•'}</span>
      <span>${escapeHtml(message)}</span>
      <span class="toast-close">&times;</span>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });

    toastContainer.appendChild(toast);

    // Auto-dismiss after ~3 seconds
    setTimeout(() => {
      removeToast(toast);
    }, 3000);
  }

  function removeToast(toast) {
    if (!toast || toast.dataset.removing) return;
    toast.dataset.removing = 'true';
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ================================================================
  // State Helpers
  // ================================================================
  function setStatusPill(element, state, text) {
    element.className = 'status-pill';
    element.classList.add(`status-${state}`);
    const icon = element.querySelector('.status-icon');
    const label = element.querySelector('.status-text');
    if (icon) {
      icon.textContent = state === 'success' ? '✓' : state === 'error' ? '✕' : '●';
    }
    if (label) {
      label.textContent = text;
    }
  }

  // ================================================================
  // FFmpeg Validation
  // ================================================================
  async function validateFfmpeg() {
    const path = ffmpegLocationInput.value.trim();

    if (!path) {
      setStatusPill(ffmpegStatusEl, 'neutral', 'Not configured');
      ffmpegGuideEl.classList.remove('hidden');
      return;
    }

    setStatusPill(ffmpegStatusEl, 'neutral', 'Checking…');
    ffmpegGuideEl.classList.add('hidden');

    try {
      const result = await window.orbit.validateFfmpeg(path);
      if (result.valid) {
        setStatusPill(ffmpegStatusEl, 'success', 'FFmpeg found');
        ffmpegGuideEl.classList.add('hidden');
      } else {
        setStatusPill(ffmpegStatusEl, 'error', `FFmpeg not found or invalid path (${result.reason || 'unknown'})`);
        ffmpegGuideEl.classList.remove('hidden');
      }
    } catch (err) {
      setStatusPill(ffmpegStatusEl, 'error', 'Validation failed: ' + (err.message || 'Unknown error'));
      ffmpegGuideEl.classList.remove('hidden');
    }
  }

  // ================================================================
  // yt-dlp Status
  // ================================================================
  async function checkYtDlpStatus() {
    setStatusPill(ytdlpStatusDisplay, 'neutral', 'Checking…');

    try {
      const result = await window.orbit.ensureYtDlp();
      if (result.ok) {
        const sourceLabels = {
          bundled: 'Bundled binary',
          downloaded: 'Auto-downloaded',
          manual: 'Manual path'
        };
        setStatusPill(ytdlpStatusDisplay, 'success', sourceLabels[result.source] || result.source);
      } else {
        setStatusPill(ytdlpStatusDisplay, 'error', result.error || 'Not found');
      }
    } catch (err) {
      setStatusPill(ytdlpStatusDisplay, 'error', 'Check failed: ' + (err.message || 'Unknown error'));
    }
  }

  // ================================================================
  // Settings Load & Save
  // ================================================================
  async function loadSettings() {
    try {
      const settings = await window.orbit.getSettings();
      downloadLocationInput.value = settings.downloadLocation || '';
      audioQualitySelect.value = settings.audioQuality || '320';
      maxParallelSlider.value = String(settings.maxParallelDownloads || 3);
      maxParallelValue.textContent = String(settings.maxParallelDownloads || 3);
      ffmpegLocationInput.value = settings.ffmpegLocation || '';
      ytdlpLocationInput.value = settings.ytdlpLocation || '';
    } catch (err) {
      showToast('error', 'Failed to load settings');
    }
  }

  async function saveSettings() {
    const partial = {
      downloadLocation: downloadLocationInput.value.trim(),
      audioQuality: audioQualitySelect.value,
      maxParallelDownloads: parseInt(maxParallelSlider.value, 10),
      ffmpegLocation: ffmpegLocationInput.value.trim(),
      ytdlpLocation: ytdlpLocationInput.value.trim()
    };

    try {
      const result = await window.orbit.saveSettings(partial);
      if (result.success) {
        showToast('success', 'Settings saved successfully');
      } else {
        showToast('error', result.error || 'Failed to save settings');
      }
    } catch (err) {
      showToast('error', 'Failed to save settings: ' + (err.message || 'Unknown error'));
    }
  }

  // ================================================================
  // Event Listeners
  // ================================================================
  btnBrowse.addEventListener('click', async () => {
    try {
      const path = await window.orbit.chooseDownloadFolder();
      if (path) {
        downloadLocationInput.value = path;
      }
    } catch (err) {
      showToast('error', 'Could not open folder picker');
    }
  });

  btnValidateFfmpeg.addEventListener('click', validateFfmpeg);

  btnRecheckYtDlp.addEventListener('click', checkYtDlpStatus);

  btnSave.addEventListener('click', saveSettings);

  maxParallelSlider.addEventListener('input', () => {
    maxParallelValue.textContent = maxParallelSlider.value;
  });

  // ================================================================
  // ================================================================
  // Startup
  // ================================================================
  (async function init() {
    await loadSettings();
    await Promise.all([validateFfmpeg(), checkYtDlpStatus()]);
  })();
});
