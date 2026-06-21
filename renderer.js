// Orbit Renderer — Task 4.1 (Shell Redesign)
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // ================================================================
  // Preload Safety Check
  // ================================================================
  if (!window.orbit) {
    console.error('[renderer] window.orbit is UNDEFINED - preload did not run or failed.');
    if (window.__orbit_preload_error__) {
      console.error('[renderer] Preload error message:', window.__orbit_preload_error__);
    }
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#E8002A;color:#fff;padding:1rem;font-weight:500;z-index:100000;text-align:center;';
    banner.textContent = 'Error: window.orbit is undefined. The preload script did not run. Check the terminal for preload errors and restart the app.';
    document.body.appendChild(banner);
    return;
  }

  // --- ripple effect micro-interaction ---
  function createRipple(event) {
    const button = event.target.closest('.btn, .paste-btn, .format-pill, .chip-btn-yes, .chip-btn-dismiss, .start-queue-btn');
    if (!button) return;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  }
  document.addEventListener('mousedown', createRipple);

  // ================================================================
  // DOM References — Shell
  // ================================================================
  const panelSingle = document.getElementById('panel-single');
  const panelBulk = document.getElementById('panel-bulk');
  const modeBtnSingle = document.getElementById('mode-btn-single');
  const modeBtnBulk = document.getElementById('mode-btn-bulk');
  const modeIndicator = document.getElementById('mode-indicator');
  const themeBtnLight = document.getElementById('theme-btn-light');
  const themeBtnDark = document.getElementById('theme-btn-dark');
  const settingsModal = document.getElementById('settings-modal');
  const btnSettingsTrigger = document.getElementById('btn-settings-trigger');
  const btnModalClose = document.getElementById('modal-close');
  const navSettings = document.getElementById('nav-settings');
  const htmlEl = document.documentElement;
  const bodyEl = document.body;

  // ================================================================
  // State
  // ================================================================
  let currentMode = 'single';
  let currentTheme = 'light';

  // ================================================================
  // Mode Switching
  // ================================================================
  function updateModeIndicator() {
    const btn = currentMode === 'single' ? modeBtnSingle : modeBtnBulk;
    const toggleRect = document.getElementById('mode-toggle').getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    modeIndicator.style.width = btnRect.width + 'px';
    modeIndicator.style.transform = `translateX(${btnRect.left - toggleRect.left}px)`;
  }

  function switchMode(mode) {
    currentMode = mode;
    bodyEl.setAttribute('data-mode', mode);
    modeBtnSingle.classList.toggle('active', mode === 'single');
    modeBtnBulk.classList.toggle('active', mode === 'bulk');
    updateModeIndicator();
    if (mode === 'single') {
      panelSingle.classList.add('active');
      panelBulk.classList.remove('active');
    } else {
      panelSingle.classList.remove('active');
      panelBulk.classList.add('active');
      loadQueue();
    }
  }

  modeBtnSingle.addEventListener('click', () => switchMode('single'));
  modeBtnBulk.addEventListener('click', () => switchMode('bulk'));

  // ================================================================
  // Theme Switching
  // ================================================================
  function switchTheme(theme) {
    currentTheme = theme;
    if (theme === 'dark') {
      htmlEl.setAttribute('data-theme', 'dark');
      themeBtnDark.classList.add('active');
      themeBtnLight.classList.remove('active');
    } else {
      htmlEl.removeAttribute('data-theme');
      themeBtnLight.classList.add('active');
      themeBtnDark.classList.remove('active');
    }
    requestAnimationFrame(updateModeIndicator);
  }

  themeBtnLight.addEventListener('click', () => {
    switchTheme('light');
    window.orbit.saveSettings({ theme: 'light' }).catch(() => {});
  });
  themeBtnDark.addEventListener('click', () => {
    switchTheme('dark');
    window.orbit.saveSettings({ theme: 'dark' }).catch(() => {});
  });

  // ================================================================
  // Settings Modal
  // ================================================================
  function openSettingsModal() {
    settingsModal.classList.add('active');
    loadSettings();
  }

  function closeSettingsModal() {
    settingsModal.classList.remove('active');
  }

  btnSettingsTrigger.addEventListener('click', openSettingsModal);
  navSettings.addEventListener('click', openSettingsModal);
  btnModalClose.addEventListener('click', closeSettingsModal);

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  // ================================================================
  // About Modal
  // ================================================================
  const aboutModal = document.getElementById('about-modal');
  const btnAboutTrigger = document.querySelector('[data-nav="about"]');
  const btnAboutModalClose = document.getElementById('about-modal-close');

  function openAboutModal() {
    if (aboutModal) {
      aboutModal.classList.add('active');
      const versionEl = document.getElementById('status-version');
      const aboutVersionEl = document.getElementById('about-version');
      if (versionEl && aboutVersionEl) {
        aboutVersionEl.textContent = versionEl.textContent || 'v1.0.0';
      }
    }
  }

  function closeAboutModal() {
    if (aboutModal) aboutModal.classList.remove('active');
  }

  if (btnAboutTrigger) {
    btnAboutTrigger.addEventListener('click', openAboutModal);
  }
  if (btnAboutModalClose) {
    btnAboutModalClose.addEventListener('click', closeAboutModal);
  }
  if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) closeAboutModal();
    });
  }

  // Handle external link clicks securely
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a && a.href && a.href.startsWith('http')) {
      e.preventDefault();
      window.orbit.openExternal(a.href).catch((err) => {
        console.error('Failed to open external link:', err);
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (settingsModal.classList.contains('active')) {
        closeSettingsModal();
      }
      if (aboutModal && aboutModal.classList.contains('active')) {
        closeAboutModal();
      }
    }
  });

  // ================================================================
  // Window Controls
  // ================================================================
  document.getElementById('win-minimize').addEventListener('click', () => {
    window.orbit.windowMinimize();
  });
  document.getElementById('win-maximize').addEventListener('click', () => {
    window.orbit.windowMaximize();
  });
  document.getElementById('win-close').addEventListener('click', () => {
    window.orbit.windowClose();
  });

  // ================================================================
  // Toast Notification System
  // ================================================================
  const toastContainer = document.getElementById('toast-container');

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
      <span class="toast-close">×</span>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
      removeToast(toast);
    }, 4000);
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
  // Status Helpers
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
  // Settings Load & Save
  // ================================================================
  const downloadLocationInput = document.getElementById('download-location');
  const audioQualitySelect = document.getElementById('audio-quality');
  const maxParallelSlider = document.getElementById('max-parallel');
  const maxParallelValue = document.getElementById('max-parallel-value');
  const ffmpegLocationInput = document.getElementById('ffmpeg-location');
  const ytdlpLocationInput = document.getElementById('ytdlp-location');
  const cookiesFromBrowserSelect = document.getElementById('cookies-from-browser');
  const ffmpegStatusEl = document.getElementById('ffmpeg-status');
  const ffmpegGuideEl = document.getElementById('ffmpeg-guide');
  const ytdlpStatusDisplay = document.getElementById('ytdlp-status-display');

  async function loadSettings() {
    try {
      const settings = await window.orbit.getSettings();
      downloadLocationInput.value = settings.downloadLocation || '';
      if (audioQualitySelect) {
        audioQualitySelect.value = settings.audioQuality || '320';
      }
      maxParallelSlider.value = String(settings.maxParallelDownloads || 3);
      maxParallelValue.textContent = String(settings.maxParallelDownloads || 3);
      ffmpegLocationInput.value = settings.ffmpegLocation || '';
      ytdlpLocationInput.value = settings.ytdlpLocation || '';
      if (cookiesFromBrowserSelect) {
        cookiesFromBrowserSelect.value = settings.cookiesFromBrowser || '';
      }
      const folderEl = document.getElementById('status-folder-path');
      if (folderEl && settings.downloadLocation) {
        folderEl.textContent = settings.downloadLocation;
      }
      // Single-mode init
      if (singleSavePath) {
        singleSavePath.textContent = settings.downloadLocation || 'Downloads';
        singleSavePath.title = settings.downloadLocation || '';
      }
      if (bulkSavePath) {
        bulkSavePath.textContent = settings.downloadLocation || 'Downloads';
        bulkSavePath.title = settings.downloadLocation || '';
      }
      const savedQ = singleFormat === 'video' ? (settings.lastVideoQuality || '1080') : (settings.lastAudioQuality || '320');
      if (typeof populateQualityOptions === 'function') {
        populateQualityOptions(singleFormat === 'video', savedQ);
      }

      // Theme persistence
      if (settings.theme) switchTheme(settings.theme);

      // Single-mode format persistence
      if (settings.lastFormat && (settings.lastFormat === 'video' || settings.lastFormat === 'audio')) {
        singleFormat = settings.lastFormat;
        formatPills.forEach(p => p.classList.toggle('active', p.dataset.format === singleFormat));
        const q = singleFormat === 'video'
          ? (settings.lastVideoQuality || '1080')
          : (settings.lastAudioQuality || '320');
        populateQualityOptions(singleFormat === 'video', q);
      }

      // Bulk-mode format/quality persistence
      if (settings.lastFormat && (settings.lastFormat === 'video' || settings.lastFormat === 'audio')) {
        bulkFormat = settings.lastFormat;
        bulkFormatVideoBtn?.classList.toggle('active', bulkFormat === 'video');
        bulkFormatAudioBtn?.classList.toggle('active', bulkFormat === 'audio');
        const q = bulkFormat === 'video'
          ? (settings.lastVideoQuality || '1080')
          : (settings.lastAudioQuality || '320');
        populateBulkQualityOptions(bulkFormat === 'video', q);
      } else {
        populateBulkQualityOptions(true, '1080');
      }
    } catch (err) {
      showToast('error', 'Failed to load settings');
    }
  }

  async function saveSettings() {
    const partial = {
      downloadLocation: downloadLocationInput.value.trim(),
      audioQuality: audioQualitySelect ? audioQualitySelect.value : '320',
      maxParallelDownloads: parseInt(maxParallelSlider.value, 10),
      ffmpegLocation: ffmpegLocationInput.value.trim(),
      ytdlpLocation: ytdlpLocationInput.value.trim(),
      cookiesFromBrowser: cookiesFromBrowserSelect ? cookiesFromBrowserSelect.value : ''
    };

    try {
      const result = await window.orbit.saveSettings(partial);
      if (result.success) {
        const savedPath = result.settings && result.settings.downloadLocation;
        if (savedPath) {
          if (singleSavePath) {
            singleSavePath.textContent = savedPath;
            singleSavePath.title = savedPath;
          }
          bulkSavePath.textContent = savedPath;
          bulkSavePath.title = savedPath;
          document.getElementById('status-folder-path').textContent = savedPath;
        }
        showToast('success', 'Settings saved successfully');
        closeSettingsModal();
      } else {
        showToast('error', result.error || 'Failed to save settings');
      }
    } catch (err) {
      showToast('error', 'Failed to save settings: ' + (err.message || 'Unknown error'));
    }
  }

  document.getElementById('btn-browse').addEventListener('click', async () => {
    try {
      const path = await window.orbit.chooseDownloadFolder();
      if (path) {
        downloadLocationInput.value = path;
      }
    } catch (err) {
      showToast('error', 'Could not open folder picker');
    }
  });

  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

  maxParallelSlider.addEventListener('input', () => {
    maxParallelValue.textContent = maxParallelSlider.value;
  });

  // ================================================================
  // FFmpeg Validation
  // ================================================================
  async function validateFfmpeg() {
    setStatusPill(ffmpegStatusEl, 'neutral', 'Checking...');
    ffmpegGuideEl.classList.add('hidden');
    try {
      const path = ffmpegLocationInput.value.trim();
      const result = await window.orbit.resolveFfmpeg(path);
      if (result.ok) {
        setStatusPill(ffmpegStatusEl, 'success', 'FFmpeg found');
        ffmpegGuideEl.classList.add('hidden');
      } else {
        setStatusPill(ffmpegStatusEl, 'error', 'FFmpeg not found');
        ffmpegGuideEl.classList.remove('hidden');
      }
    } catch (err) {
      setStatusPill(ffmpegStatusEl, 'error', 'Validation failed: ' + (err.message || 'Unknown error'));
      ffmpegGuideEl.classList.remove('hidden');
    }
  }

  document.getElementById('btn-validate-ffmpeg').addEventListener('click', validateFfmpeg);

  // ================================================================
  // yt-dlp Status
  // ================================================================
  async function checkYtDlpStatus() {
    setStatusPill(ytdlpStatusDisplay, 'neutral', 'Checking...');
    try {
      const result = await window.orbit.ensureYtDlp();
      if (result.ok) {
        const sourceLabels = {
          bundled: 'Bundled binary',
          downloaded: 'Auto-downloaded',
          manual: 'Manual path',
          current_bin: 'Local bin/ folder',
          current_dir: 'Local current folder'
        };
        setStatusPill(ytdlpStatusDisplay, 'success', sourceLabels[result.source] || result.source);
      } else {
        setStatusPill(ytdlpStatusDisplay, 'error', result.error || 'Not found');
      }
    } catch (err) {
      setStatusPill(ytdlpStatusDisplay, 'error', 'Check failed: ' + (err.message || 'Unknown error'));
    }
  }

  document.getElementById('btn-recheck-ytdlp').addEventListener('click', checkYtDlpStatus);

  // ================================================================
  // Status Bar Folder Click
  // ================================================================
  const statusBarFolder = document.getElementById('status-bar-folder');
  if (statusBarFolder) {
    statusBarFolder.addEventListener('click', async () => {
      try {
        const result = await window.orbit.folderOpen();
        if (!result || !result.success) {
          showToast('error', (result && result.error) || 'Failed to open folder');
        }
      } catch (err) {
        showToast('error', 'Failed to open folder: ' + (err && err.message || 'Unknown error'));
      }
    });
  }

  // ================================================================
  // Single Download Mode
  // ================================================================

  // --- DOM refs ---
  const singleUrlInput       = document.getElementById('single-url-input');
  const singlePasteBtn       = document.getElementById('single-paste-btn');
  const clipboardChip        = document.getElementById('clipboard-chip');
  const chipYes              = document.getElementById('chip-yes');
  const chipDismiss          = document.getElementById('chip-dismiss');
  const formatPills          = document.querySelectorAll('.format-pill');
  const qualitySelect        = document.getElementById('quality-select');
  const singleSavePath       = document.getElementById('single-save-path');
  const btnSingleBrowse      = document.getElementById('btn-single-browse');
  const downloadBtn          = document.getElementById('download-btn');
  const downloadActivePanel  = document.getElementById('download-active');
  const singleProgressBar    = document.getElementById('single-progress-bar');
  const singleProgressPct    = document.getElementById('single-progress-pct');
  const singleSpeed          = document.getElementById('single-speed');
  const singleEta            = document.getElementById('single-eta');
  const singleSize           = document.getElementById('single-size');
  const previewEmpty         = document.getElementById('preview-empty');
  const previewSkeleton      = document.getElementById('preview-skeleton');
  const previewLoaded        = document.getElementById('preview-loaded');
  const previewThumbImg      = document.getElementById('preview-thumb-img');
  const previewDuration      = document.getElementById('preview-duration');
  const previewTitleEl       = document.getElementById('preview-title');
  const previewCaptionEl     = document.getElementById('preview-caption');
  const singleCancelBtn      = document.getElementById('single-cancel');
  const singleOpenFolderBtn  = document.getElementById('single-open-folder');

  // --- state ---
  let singleFormat         = 'video'; // 'video' | 'audio'
  let singleUrlValue       = '';
  let singleIsFetching     = false;
  let singleIsDownloading  = false;
  let singleActiveUrl      = null;
  let singleClipboardTimer = null;
  let singleDebounceTimer  = null;

  // --- bulk state ---
  let bulkFormat           = 'video'; // 'video' | 'audio'
  const bulkTasks          = new Map();
  let bulkQueueRunning     = false;
  let selectedQueueUrl     = null;
  const terminalStatuses   = new Set(['completed', 'already_exists', 'error']);

  const VIDEO_QUALITIES = [
    { value:'2160', label:'2160p · 4K' },
    { value:'1440', label:'1440p · 2K' },
    { value:'1080', label:'1080p · Full HD' },
    { value:'720',  label:'720p' },
    { value:'480',  label:'480p' },
    { value:'360',  label:'360p' }
  ];
  const AUDIO_QUALITIES = [
    { value:'320', label:'320 kbps' },
    { value:'256', label:'256 kbps' },
    { value:'192', label:'192 kbps' },
    { value:'128', label:'128 kbps' }
  ];

  // --- helpers ---
  function setPreviewState(state) {
    previewEmpty.classList.toggle('hidden', state !== 'empty');
    previewSkeleton.classList.toggle('hidden', state !== 'skeleton');
    previewLoaded.classList.toggle('hidden', state !== 'loaded');
  }

  function populateQualityOptions(isVideo, selectedValue) {
    qualitySelect.innerHTML = '';
    const opts = isVideo ? VIDEO_QUALITIES : AUDIO_QUALITIES;
    for (const o of opts) {
      const el = document.createElement('option');
      el.value = o.value;
      el.textContent = o.label;
      qualitySelect.appendChild(el);
    }
    qualitySelect.value = selectedValue && opts.some(o => o.value === selectedValue)
      ? selectedValue
      : (isVideo ? '1080' : '320');
  }

  function resetSinglePanel() {
    singleUrlInput.value = '';
    singleUrlInput.disabled = false;
    if (singlePasteBtn) {
      singlePasteBtn.disabled = false;
      singlePasteBtn.setAttribute('aria-disabled', 'false');
    }
    singleUrlValue = '';
    downloadBtn.disabled = true;
    setPreviewState('empty');
    previewThumbImg.src = '';
    singleIsFetching = false;
    singleIsDownloading = false;
    singleActiveUrl = null;
    // Hide active panel and show button
    downloadActivePanel.classList.add('hidden');
    downloadBtn.classList.remove('hidden');
    // Reset progress bar
    singleProgressBar.style.width = '0%';
    singleProgressPct.textContent = '0%';
    singleSpeed.textContent = '–';
    singleEta.textContent = 'ETA: –';
    singleSize.textContent = 'Size: –';
    // Reset quality from settings (handled when settings load)
  }

  // --- metadata fetch ---
  async function fetchSingleMetadata() {
    const url = singleUrlInput.value.trim();
    singleUrlValue = url;
    if (!url) {
      setPreviewState('empty');
      downloadBtn.disabled = true;
      return;
    }
    if (!isValidYoutubeUrl(url)) {
      setPreviewState('empty');
      downloadBtn.disabled = true;
      return;
    }
    // valid url
    downloadBtn.disabled = false;
    setPreviewState('skeleton');
    singleIsFetching = true;

    try {
      const result = await window.orbit.fetchMetadata(url);
      singleIsFetching = false;
      if (!result || !result.ok) {
        setPreviewState('empty');
        showToast('error', (result && result.error) || 'Failed to fetch metadata');
        return;
      }
      // Populate loaded state
      previewThumbImg.src = result.thumbnailUrl || '';
      previewDuration.textContent = (result.duration && result.duration > 0) ? fmtDuration(result.duration) : '–';
      previewTitleEl.textContent = result.title || '';
      const parts = [];
      if (result.viewCount !== undefined && result.viewCount !== null) {
        parts.push(Number(result.viewCount).toLocaleString() + ' views');
      }
      if (result.channel) {
        parts.push(result.channel);
      }
      previewCaptionEl.textContent = parts.join(' · ');
      setPreviewState('loaded');
    } catch (err) {
      singleIsFetching = false;
      showToast('error', 'Failed to fetch metadata');
      setPreviewState('empty');
    }
  }

  // --- debounced input ---
  singleUrlInput.addEventListener('input', () => {
    singleUrlValue = singleUrlInput.value.trim();
    if (singleDebounceTimer) clearTimeout(singleDebounceTimer);
    if (!singleUrlValue) {
      setPreviewState('empty');
      downloadBtn.disabled = true;
      return;
    }
    singleDebounceTimer = setTimeout(fetchSingleMetadata, 500);
  });

  // --- paste button ---
  singlePasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        singleUrlInput.value = text.trim();
        singleUrlValue = singleUrlInput.value;
        await fetchSingleMetadata();
        singlePasteBtn.classList.add('success-flash');
        setTimeout(() => singlePasteBtn.classList.remove('success-flash'), 800);
      }
    } catch (err) {
      showToast('error', 'Could not access clipboard');
    }
  });

  // --- format pills ---
  for (const pill of formatPills) {
    pill.addEventListener('click', () => {
      const format = pill.dataset.format;
      if (format === singleFormat) return;
      singleFormat = format;
      for (const p of formatPills) {
        p.classList.toggle('active', p.dataset.format === format);
      }
      // persist last format
      window.orbit.saveSettings({ lastFormat: format }).catch(() => {});

      // remember current quality before switching
      const currentQ = qualitySelect.value;
      if (singleFormat === 'video') {
        populateQualityOptions(true, currentQ);
      } else {
        populateQualityOptions(false, currentQ);
      }
    });
  }

  // --- quality select change (persist last quality per format) ---
  qualitySelect.addEventListener('change', async () => {
    const val = qualitySelect.value;
    const key = singleFormat === 'video' ? 'lastVideoQuality' : 'lastAudioQuality';
    try {
      await window.orbit.saveSettings({ [key]: val });
    } catch (_err) {
      // ignore
    }
  });

  // --- save-to browse ---
  btnSingleBrowse?.addEventListener('click', async () => {
    try {
      const path = await window.orbit.chooseDownloadFolder();
      if (!path) return;
      if (singleSavePath) {
        singleSavePath.textContent = path;
        singleSavePath.title = path;
      }
      bulkSavePath.textContent = path;
      bulkSavePath.title = path;
      // persist in settings
      await window.orbit.saveSettings({ downloadLocation: path });
      const folderEl = document.getElementById('status-folder-path');
      if (folderEl) folderEl.textContent = path;
    } catch (err) {
      showToast('error', 'Failed to select folder');
    }
  });

  // --- download button ---
  async function handleSingleDownload() {
    const url = singleUrlInput.value.trim();
    if (!url || !isValidYoutubeUrl(url)) return;
    // Ensure path exists in settings
    downloadBtn.classList.add('hidden');
    downloadActivePanel.classList.remove('hidden');
    singleIsDownloading = true;
    singleActiveUrl = url;
    singleUrlInput.disabled = true;
    if (singlePasteBtn) {
      singlePasteBtn.disabled = true;
      singlePasteBtn.setAttribute('aria-disabled', 'true');
    }
    singleProgressBar.style.width = '0%';
    singleProgressPct.textContent = '0%';
    singleSpeed.textContent = '–';
    singleEta.textContent = 'ETA: –';
    singleSize.textContent = 'Size: –';

    try {
      // always ensure the URL is actually in the queue. Add then start.
      const addResult = await window.orbit.queueAdd([url], { format: singleFormat, quality: qualitySelect.value });
      if (!addResult || (addResult.added && addResult.added.length === 0 && addResult.duplicates && addResult.duplicates.length === 0)) {
        // nothing added and not duplicate - probably invalid
        showToast('error', 'Cannot start download. Invalid URL?');
        downloadActivePanel.classList.add('hidden');
        downloadBtn.classList.remove('hidden');
        singleIsDownloading = false;
        singleActiveUrl = null;
        return;
      }
      const result = await window.orbit.queueStart();
      if (result && result.error) {
        showToast('error', result.error);
      } else if (result && result.success) {
        showToast('info', 'Download started');
      }
    } catch (err) {
      showToast('error', 'Failed to start download');
      downloadActivePanel.classList.add('hidden');
      downloadBtn.classList.remove('hidden');
      singleIsDownloading = false;
      singleActiveUrl = null;
    }
  }

  downloadBtn.addEventListener('click', handleSingleDownload);

  // --- active actions ---
  singleCancelBtn.addEventListener('click', async () => {
    if (!singleActiveUrl) return;
    try {
      await window.orbit.queueRemove(singleActiveUrl);
      showToast('info', 'Download cancelled');
    } catch (err) {
      showToast('error', 'Failed to cancel');
    }
    resetSinglePanel();
  });

  singleOpenFolderBtn.addEventListener('click', async () => {
    try {
      const result = await window.orbit.folderOpen();
      if (!result || !result.success) {
        showToast('error', (result && result.error) || 'Failed to open folder');
      }
    } catch (err) {
      showToast('error', 'Failed to open folder');
    }
  });

  // --- queue event re-routing for single mode ---
  function updateSingleProgressFromEvent(data) {
    if (!singleIsDownloading || !singleActiveUrl) return;
    if (!data || data.url !== singleActiveUrl) return;
    if (typeof data.progress === 'number') {
      singleProgressBar.style.width = data.progress + '%';
      singleProgressPct.textContent = Math.round(data.progress) + '%';
    }
    if (data.speed) singleSpeed.textContent = data.speed;
    // derive size from stats if you have it, or leave untouched
    if (data.total && data.total > 0 && typeof data.progress === 'number') {
      // rough eta placeholder – simplistic, not essential
    }
  }

  function finishSingleIfDone(data) {
    if (!singleIsDownloading || !singleActiveUrl) return;
    if (data.url !== singleActiveUrl) return;
    if (data.status === 'completed' || data.status === 'already_exists') {
      singleProgressBar.style.width = '100%';
      singleProgressBar.classList.add('status-completed');
      singleProgressPct.textContent = '✓';
      singleProgressPct.classList.add('status-completed', 'checkmark-bounce');
      singleSpeed.textContent = 'Done';
      showToast('success', 'Download completed');
      // reset after a short delay
      setTimeout(() => {
        resetSinglePanel();
        singleProgressBar.classList.remove('status-completed');
        singleProgressPct.classList.remove('status-completed', 'checkmark-bounce');
      }, 2000);
    } else if (data.status === 'error') {
      showToast('error', data.errorMessage || 'Download failed');
      setTimeout(() => resetSinglePanel(), 1500);
    }
  }

  // --- keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    // Ctrl+, (Open Settings) — global
    if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      openSettingsModal();
      return;
    }

    // Space (Pause/Resume — coming soon)
    if (e.key === ' ' && !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      showToast('info', 'Pause/Resume — coming soon');
      return;
    }

    // Escape (Close modal / dismiss chip)
    if (e.key === 'Escape') {
      if (settingsModal.classList.contains('active')) {
        closeSettingsModal();
        return;
      }
      if (!clipboardChip.classList.contains('hidden')) {
        clipboardChip.classList.add('hidden');
        return;
      }
      if (panelSingle.classList.contains('active')) {
        resetSinglePanel();
        return;
      }
    }

    // Single-mode shortcuts
    if (!panelSingle.classList.contains('active')) return;
    if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      if (!downloadBtn.disabled && !singleIsDownloading) {
        handleSingleDownload();
      }
    }
  });

  // --- clipboard detection ---
  let lastClipboardText = '';
  async function checkClipboard() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text || text === lastClipboardText || text === singleUrlInput.value.trim()) return;
      if (isValidYoutubeUrl(text)) {
        lastClipboardText = text;
        // show chip
        clipboardChip.classList.remove('hidden');
        if (singleClipboardTimer) clearTimeout(singleClipboardTimer);
        singleClipboardTimer = setTimeout(() => clipboardChip.classList.add('hidden'), 8000);
      }
    } catch (err) {
      // clipboard API may be restricted; ignore
    }
  }

  window.addEventListener('focus', checkClipboard);

  chipYes.addEventListener('click', async () => {
    if (singleClipboardTimer) clearTimeout(singleClipboardTimer);
    if (lastClipboardText) {
      singleUrlInput.value = lastClipboardText;
      singleUrlValue = lastClipboardText;
      clipboardChip.classList.add('hidden');
      await fetchSingleMetadata();
    }
  });

  chipDismiss.addEventListener('click', () => {
    clipboardChip.classList.add('hidden');
    if (singleClipboardTimer) clearTimeout(singleClipboardTimer);
  });

  // ================================================================
  // Downloads / Queue (Bulk Mode)
  // ================================================================
  if (false) {
  const urlInput = document.getElementById('url-input');
  const btnAddQueue = document.getElementById('btn-add-queue');
  const btnStartDownloads = document.getElementById('btn-start-downloads');
  const btnClearQueue = document.getElementById('btn-clear-queue');
  const btnOpenFolder = document.getElementById('btn-open-folder');
  const queueList = document.getElementById('queue-list');
  const queueEmptyState = document.getElementById('queue-empty-state');

  const tasksByUrl = new Map();
  let isDownloading = false;

  // ----------------------------------------------------------------
  // Helpers (mirroring main-process utils)
  // ----------------------------------------------------------------
  function isValidYoutubeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com'].some(d => lower.includes(d));
  }

  function fmtDuration(seconds) {
    if (!seconds || seconds <= 0) return null;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function truncateUrl(url, max) {
    max = max || 50;
    if (!url) return '';
    return url.length > max ? url.slice(0, max) + '…' : url;
  }

  function getStatusIcon(status) {
    const map = {
      pending: '\u{1F504}',
      extracting_info: '\u{1F4CA}',
      downloading: '⬇️',
      converting: '\u{1F504}',
      completed: '✅',
      error: '❌',
      already_exists: '\u{1F4C1}'
    };
    return map[status] || '●';
  }

  function getStatusLabel(status) {
    const map = {
      pending: 'Pending',
      extracting_info: 'Getting Info',
      downloading: 'Downloading',
      converting: 'Converting',
      completed: 'Completed',
      error: 'Error',
      already_exists: 'File Exists'
    };
    return map[status] || status;
  }

  function getProgressForStatus(status, progress) {
    switch (status) {
      case 'pending': return 0;
      case 'extracting_info': return 10;
      case 'downloading': return progress || 0;
      case 'converting': return 95;
      case 'completed':
      case 'already_exists': return 100;
      case 'error': return 0;
      default: return 0;
    }
  }

  function getProgressCaption(status, progress) {
    switch (status) {
      case 'pending': return 'Waiting...';
      case 'extracting_info': return 'Getting info...';
      case 'downloading': return Math.round(progress || 0) + '%';
      case 'converting': return 'Converting...';
      case 'completed':
      case 'already_exists': return 'Done';
      case 'error': return 'Error';
      default: return '';
    }
  }

  function getProgressBarClass(status) {
    switch (status) {
      case 'completed':
      case 'already_exists': return 'status-completed';
      case 'error': return 'status-error';
      case 'converting': return 'status-converting';
      default: return '';
    }
  }

  // ----------------------------------------------------------------
  // Queue Rendering
  // ----------------------------------------------------------------
  function updateSummary() {
    const tasks = Array.from(tasksByUrl.values()).map(e => e.data);
    const completed = tasks.filter(t => t.status === 'completed' || t.status === 'already_exists').length;
    const downloading = tasks.filter(t => t.status === 'downloading' || t.status === 'converting').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const errors = tasks.filter(t => t.status === 'error').length;

    document.getElementById('stat-completed').textContent = String(completed);
    document.getElementById('stat-downloading').textContent = String(downloading);
    document.getElementById('stat-pending').textContent = String(pending);
    document.getElementById('stat-errors').textContent = String(errors);

    // Update status bar
    document.getElementById('status-active').textContent = downloading + ' active';
    document.getElementById('status-completed').textContent = completed + ' completed';
  }

  function showEmptyState() {
    queueEmptyState.style.display = '';
    queueList.style.display = 'none';
  }

  function hideEmptyState() {
    queueEmptyState.style.display = 'none';
    queueList.style.display = '';
  }

  function formatCaption(task) {
    const parts = [];
    if (task.duration) parts.push('Duration: ' + fmtDuration(task.duration));
    if (task.speed) parts.push('Speed: ' + task.speed);
    parts.push('URL: ' + truncateUrl(task.url, 70));
    return parts.join(' • ');
  }

  function createQueueItem(task) {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.dataset.url = task.url;

    const titleText = task.title || truncateUrl(task.url, 50);
    const progressWidth = getProgressForStatus(task.status, task.progress);
    const progressCaption = getProgressCaption(task.status, task.progress);
    const barClass = getProgressBarClass(task.status);
    const statusIcon = getStatusIcon(task.status);
    const statusLabel = getStatusLabel(task.status);
    const caption = formatCaption(task);

    item.innerHTML = '<div class="queue-item-header">' +
      '<div class="queue-item-title" title="' + escapeHtml(task.title || task.url) + '">' + escapeHtml(titleText) + '</div>' +
      '<span class="status-badge status-badge-' + task.status + '">' + statusIcon + ' ' + statusLabel + '</span>' +
      '<button class="queue-item-remove" data-remove-url="' + escapeHtml(task.url) + '" title="Remove">✕</button>' +
      '</div>' +
      '<div class="queue-item-meta">' + escapeHtml(caption) + '</div>' +
      '<div class="progress-bar-container">' +
      '<div class="progress-bar-fill ' + barClass + '" style="width: ' + progressWidth + '%;"></div>' +
      '</div>' +
      '<div class="progress-caption">' + progressCaption + '</div>' +
      '<div class="queue-item-error" style="display: ' + (task.errorMessage ? 'block' : 'none') + ';">' + escapeHtml(task.errorMessage || '') + '</div>';

    const removeBtn = item.querySelector('.queue-item-remove');
    removeBtn.addEventListener('click', () => {
      handleRemove(task.url);
    });

    return item;
  }

  function updateQueueItem(el, task) {
    // title
    const titleEl = el.querySelector('.queue-item-title');
    const titleText = task.title || truncateUrl(task.url, 50);
    if (titleEl.textContent !== titleText) {
      titleEl.textContent = titleText;
      titleEl.title = task.title || task.url;
    }

    // status badge
    const badge = el.querySelector('.status-badge');
    badge.className = 'status-badge status-badge-' + task.status;
    badge.textContent = getStatusIcon(task.status) + ' ' + getStatusLabel(task.status);

    // meta caption
    const meta = el.querySelector('.queue-item-meta');
    meta.textContent = formatCaption(task);

    // progress bar
    const fill = el.querySelector('.progress-bar-fill');
    const width = getProgressForStatus(task.status, task.progress);
    fill.style.width = width + '%';
    fill.className = 'progress-bar-fill ' + getProgressBarClass(task.status);

    // caption
    const captionEl = el.querySelector('.progress-caption');
    captionEl.textContent = getProgressCaption(task.status, task.progress);

    // error
    const errorEl = el.querySelector('.queue-item-error');
    if (task.errorMessage) {
      errorEl.textContent = task.errorMessage;
      errorEl.style.display = 'block';
    } else {
      errorEl.style.display = 'none';
    }
  }

  function renderQueue(tasks) {
    queueList.innerHTML = '';
    tasksByUrl.clear();

    if (tasks.length === 0) {
      showEmptyState();
      updateSummary();
      return;
    }

    hideEmptyState();
    for (const task of tasks) {
      const el = createQueueItem(task);
      queueList.appendChild(el);
      tasksByUrl.set(task.url, { element: el, data: Object.assign({}, task) });
    }
    updateSummary();
  }

  function patchTask(taskPartial) {
    const existing = tasksByUrl.get(taskPartial.url);
    if (!existing) return null;

    const merged = Object.assign({}, existing.data, taskPartial);
    existing.data = merged;
    updateQueueItem(existing.element, merged);
    updateSummary();
    return merged;
  }

  function addTaskToUI(task) {
    if (tasksByUrl.has(task.url)) return;
    hideEmptyState();
    const el = createQueueItem(task);
    queueList.appendChild(el);
    tasksByUrl.set(task.url, { element: el, data: Object.assign({}, task) });
    updateSummary();
  }

  // ----------------------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------------------
  async function handleAddToQueue() {
    const raw = urlInput.value;
    if (!raw.trim()) return;

    const rawUrls = raw.split(/[\n,]+/);
    const urls = [];
    for (const u of rawUrls) {
      const trimmed = u.trim();
      if (trimmed) urls.push(trimmed);
    }

    if (urls.length === 0) return;

    const valid = [];
    const invalid = [];
    for (const url of urls) {
      if (isValidYoutubeUrl(url)) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    }

    if (valid.length === 0) {
      showToast('warning', 'No valid YouTube URLs found. ' + invalid.length + ' invalid skipped.');
      return;
    }

    try {
      const result = await window.orbit.queueAdd(valid);
      const addedCount = (result && result.added && result.added.length) || 0;
      const dupCount = (result && result.duplicates && result.duplicates.length) || 0;
      const invalidCount = ((result && result.invalid && result.invalid.length) || 0) + invalid.length;

      const parts = [];
      if (addedCount > 0) parts.push('Added ' + addedCount);
      if (dupCount > 0) parts.push('skipped ' + dupCount + ' duplicate');
      if (invalidCount > 0) parts.push(invalidCount + ' invalid');

      showToast('success', parts.join(', '));

      if (addedCount > 0) {
        urlInput.value = '';
        const tasks = await window.orbit.queueGet();
        renderQueue(tasks);
      }
    } catch (err) {
      showToast('error', 'Failed to add to queue: ' + (err && err.message || 'Unknown error'));
    }
  }

  async function handleStartDownloads() {
    if (isDownloading) return;
    isDownloading = true;
    btnStartDownloads.disabled = true;
    try {
      const result = await window.orbit.queueStart();
      if (result && result.error) {
        showToast('error', result.error);
      } else if (result && result.success) {
        showToast('info', 'Downloads started');
      }
    } catch (err) {
      showToast('error', 'Failed to start downloads: ' + (err && err.message || 'Unknown error'));
    } finally {
      isDownloading = false;
      btnStartDownloads.disabled = false;
    }
  }

  async function handleClearQueue() {
    try {
      await window.orbit.queueClear();
      showToast('success', 'Queue cleared');
      renderQueue([]);
    } catch (err) {
      showToast('error', 'Failed to clear queue: ' + (err && err.message || 'Unknown error'));
    }
  }

  async function handleOpenFolder() {
    try {
      const result = await window.orbit.folderOpen();
      if (!result || !result.success) {
        showToast('error', (result && result.error) || 'Failed to open folder');
      }
    } catch (err) {
      showToast('error', 'Failed to open folder: ' + (err && err.message || 'Unknown error'));
    }
  }

  async function handleRemove(url) {
    try {
      await window.orbit.queueRemove(url);
      const existing = tasksByUrl.get(url);
      if (existing) {
        existing.element.remove();
        tasksByUrl.delete(url);
      }
      if (tasksByUrl.size === 0) {
        showEmptyState();
      }
      updateSummary();
    } catch (err) {
      showToast('error', 'Failed to remove: ' + (err && err.message || 'Unknown error'));
    }
  }

  btnAddQueue.addEventListener('click', handleAddToQueue);
  btnStartDownloads.addEventListener('click', handleStartDownloads);
  btnClearQueue.addEventListener('click', handleClearQueue);
  btnOpenFolder.addEventListener('click', handleOpenFolder);

  // ----------------------------------------------------------------
  // Push Event Subscriptions
  // ----------------------------------------------------------------
  window.orbit.onQueueProgress(function(data) {
    if (!data || !data.url) return;
    const existing = tasksByUrl.get(data.url);
    if (!existing) return;
    const merged = Object.assign({}, existing.data, data);
    existing.data = merged;
    updateQueueItem(existing.element, merged);
    // Single mode wiring
    updateSingleProgressFromEvent(data);
  });

  window.orbit.onQueueTaskUpdated(function(data) {
    if (!data || !data.url) return;
    const existing = tasksByUrl.get(data.url);
    if (existing) {
      const merged = Object.assign({}, existing.data, data);
      existing.data = merged;
      updateQueueItem(existing.element, merged);
      updateSummary();
    } else {
      addTaskToUI(data);
      updateSummary();
    }
    // Single mode wiring
    finishSingleIfDone(data);
  });

  // ----------------------------------------------------------------
  // Queue Loading
  // ----------------------------------------------------------------
  async function loadQueue() {
    try {
      const tasks = await window.orbit.queueGet();
      renderQueue(tasks);
    } catch (err) {
      showToast('error', 'Failed to load queue');
    }
  }
  }

  // ================================================================
  // Bulk Download Mode - Task 4.3
  // ================================================================
  function isValidYoutubeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com'].some(domain => {
      return lower.includes(domain);
    });
  }

  function fmtDuration(seconds) {
    if (!seconds || seconds <= 0) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function truncateUrl(url, max = 50) {
    if (!url) return '';
    return url.length > max ? `${url.slice(0, max)}...` : url;
  }

  const bulkUrlInput = document.getElementById('bulk-url-input');
  const bulkAddBtn = document.getElementById('bulk-add-btn');
  const bulkSavePath = document.getElementById('bulk-save-path');
  const bulkBrowseBtn = document.getElementById('bulk-browse-btn');
  const queueCount = document.getElementById('queue-count');
  const queueClearBtn = document.getElementById('queue-clear-btn');
  const queueList = document.getElementById('queue-list');
  const queueEmpty = document.getElementById('queue-empty');
  const startQueueBtn = document.getElementById('start-queue-btn');
  const startQueueIcon = startQueueBtn.querySelector('.start-queue-icon');
  const startQueueLabel = startQueueBtn.querySelector('.start-queue-label');

  // Bulk format/quality references
  const bulkFormatVideoBtn = document.getElementById('bulk-format-video');
  const bulkFormatAudioBtn = document.getElementById('bulk-format-audio');
  const bulkQualitySelect = document.getElementById('bulk-quality-select');


  const BULK_VIDEO_QUALITIES = [
    { value:'2160', label:'2160p · 4K' },
    { value:'1440', label:'1440p · 2K' },
    { value:'1080', label:'1080p · Full HD' },
    { value:'720', label:'720p' },
    { value:'480', label:'480p' },
    { value:'360', label:'360p' }
  ];
  const BULK_AUDIO_QUALITIES = [
    { value:'320', label:'320 kbps' },
    { value:'256', label:'256 kbps' },
    { value:'192', label:'192 kbps' },
    { value:'128', label:'128 kbps' }
  ];

  function populateBulkQualityOptions(isVideo, selectedValue) {
    if (!bulkQualitySelect) return;
    bulkQualitySelect.innerHTML = '';
    const opts = isVideo ? BULK_VIDEO_QUALITIES : BULK_AUDIO_QUALITIES;
    for (const o of opts) {
      const el = document.createElement('option');
      el.value = o.value;
      el.textContent = o.label;
      bulkQualitySelect.appendChild(el);
    }
    bulkQualitySelect.value = selectedValue && opts.some(o => o.value === selectedValue)
      ? selectedValue
      : (isVideo ? '1080' : '320');
  }

  function switchBulkFormat(fmt) {
    bulkFormat = fmt;
    bulkFormatVideoBtn?.classList.toggle('active', fmt === 'video');
    bulkFormatAudioBtn?.classList.toggle('active', fmt === 'audio');
    const q = bulkFormat === 'video' ? '1080' : '320';
    populateBulkQualityOptions(fmt === 'video', q);
    window.orbit.saveSettings({ lastFormat: fmt }).catch(() => {});
  }

  bulkFormatVideoBtn?.addEventListener('click', () => switchBulkFormat('video'));
  bulkFormatAudioBtn?.addEventListener('click', () => switchBulkFormat('audio'));

  bulkQualitySelect?.addEventListener('change', () => {
    const val = bulkQualitySelect.value;
    const key = bulkFormat === 'video' ? 'lastVideoQuality' : 'lastAudioQuality';
    window.orbit.saveSettings({ [key]: val }).catch(() => {});
  });

  // initialize bulk quality options
  populateBulkQualityOptions(true, '1080');

  function getBulkPreference() {
    const selected = bulkQualitySelect?.options[bulkQualitySelect.selectedIndex];
    return {
      format: bulkFormat === 'video' ? 'Video' : 'Audio',
      quality: selected ? selected.textContent.trim().split(/\s+/)[0] : (bulkFormat === 'video' ? '1080p' : '320kbps')
    };
  }

  function getBulkStatusView(task) {
    const status = task.status || 'pending';
    const progress = Math.max(0, Math.min(100, Number(task.progress) || 0));
    const views = {
      pending: { label: 'Waiting', icon: '', progress: 0 },
      waiting: { label: 'Waiting', icon: '', progress: 0 },
      extracting_info: { label: 'Getting info...', icon: '', progress: 5 },
      downloading: { label: 'Downloading...', icon: '', progress },
      converting: { label: 'Converting...', icon: '', progress: Math.max(progress, 95) },
      paused: { label: 'Paused', icon: '||', progress },
      completed: { label: 'Completed', icon: '\u2713', progress: 100 },
      already_exists: { label: 'File exists', icon: '\u2713', progress: 100 },
      error: { label: task.errorMessage || 'Failed', icon: '\u00D7', progress: 0 }
    };
    return views[status] || { label: status, icon: '', progress };
  }

  function updateBulkControls() {
    const count = bulkTasks.size;
    queueCount.textContent = `Queue (${count})`;
    queueEmpty.classList.toggle('hidden', count > 0);
    queueClearBtn.disabled = count === 0 || bulkQueueRunning;
    queueClearBtn.setAttribute('aria-disabled', queueClearBtn.disabled ? 'true' : 'false');

    const hasStartable = Array.from(bulkTasks.values()).some(({ data }) => {
      return data.status === 'pending' || data.status === 'waiting' || data.status === 'error';
    });
    startQueueBtn.disabled = count === 0 || bulkQueueRunning || !hasStartable;
    startQueueBtn.setAttribute('aria-disabled', startQueueBtn.disabled ? 'true' : 'false');

    const tasks = Array.from(bulkTasks.values()).map(({ data }) => data);
    const active = tasks.filter(task => task.status === 'downloading' || task.status === 'converting').length;
    const completed = tasks.filter(task => task.status === 'completed' || task.status === 'already_exists').length;
    document.getElementById('status-active').textContent = `${active} active`;
    document.getElementById('status-completed').textContent = `${completed} completed`;
  }

  function setQueueSelection(url) {
    selectedQueueUrl = url;
    for (const [taskUrl, entry] of bulkTasks) {
      entry.element.classList.toggle('selected', taskUrl === url);
    }
  }

  function getTaskFormatQuality(task) {
    const fmt = (task.format && task.format.toLowerCase()) === 'video' ? 'Video' : 'Audio';
    let qual = task.quality || (fmt === 'Video' ? '1080' : '320');
    if (fmt === 'Video') {
      if (!String(qual).endsWith('p')) qual = qual + 'p';
    } else {
      if (!String(qual).endsWith('kbps')) qual = qual + 'kbps';
    }
    return { format: fmt, quality: qual };
  }

  function createBulkQueueItem(task, options = {}) {
    const item = document.createElement('div');
    item.className = `queue-item${options.loading ? ' loading' : ''}`;
    item.dataset.url = task.url;
    item.dataset.status = task.status || 'pending';
    item.tabIndex = 0;
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', task.title || task.url);

    const title = task.title || truncateUrl(task.url, 48);
    item.innerHTML = `
      <span class="drag-handle" aria-hidden="true">&#10239;</span>
      <img class="item-thumb" alt="">
      <span class="item-thumb-skeleton shimmer" aria-hidden="true"></span>
      <div class="item-info">
        <span class="item-title"></span>
        <span class="item-title-skeleton shimmer" aria-hidden="true"></span>
        <span class="item-duration"></span>
      </div>
      <span class="badge format-badge"></span>
      <span class="badge quality-badge"></span>
      <button class="item-remove" title="Remove" aria-label="Remove from queue">&times;</button>
      <div class="item-state">
        <span class="item-state-icon" aria-hidden="true"></span>
        <div class="mini-progress"><div class="mini-progress-fill"></div></div>
        <span class="item-state-label"></span>
        <span class="item-speed"></span>
        <button class="item-retry">Retry</button>
      </div>
    `;

    item.querySelector('.item-title').textContent = title;
    item.querySelector('.item-title').title = task.title || task.url;
    item.querySelector('.item-duration').textContent = task.duration ? fmtDuration(task.duration) : 'Waiting for metadata';
    
    const badgeInfo = getTaskFormatQuality(task);
    item.querySelector('.format-badge').textContent = badgeInfo.format;
    item.querySelector('.quality-badge').textContent = badgeInfo.quality;

    item.querySelector('.item-remove').addEventListener('click', event => {
      event.stopPropagation();
      removeBulkQueueItem(task.url);
    });
    item.querySelector('.item-retry').addEventListener('click', event => {
      event.stopPropagation();
      handleStartQueue();
    });
    item.addEventListener('click', () => setQueueSelection(task.url));
    item.addEventListener('focus', () => setQueueSelection(task.url));

    updateBulkQueueItem(item, task);
    return item;
  }

  function updateBulkQueueItem(item, task) {
    item.dataset.status = task.status || 'pending';
    item.setAttribute('aria-label', task.title || task.url);

    const titleEl = item.querySelector('.item-title');
    titleEl.textContent = task.title || truncateUrl(task.url, 48);
    titleEl.title = task.title || task.url;
    const durationEl = item.querySelector('.item-duration');
    durationEl.textContent = task.duration ? fmtDuration(task.duration) : 'Waiting for metadata';

    if (task.thumbnailUrl) {
      const thumb = item.querySelector('.item-thumb');
      if (thumb.src !== task.thumbnailUrl) thumb.src = task.thumbnailUrl;
    }

    const badgeInfo = getTaskFormatQuality(task);
    item.querySelector('.format-badge').textContent = badgeInfo.format;
    item.querySelector('.quality-badge').textContent = badgeInfo.quality;

    const statusView = getBulkStatusView(task);
    item.querySelector('.mini-progress-fill').style.width = `${statusView.progress}%`;
    item.querySelector('.item-state-label').textContent = statusView.label;
    item.querySelector('.item-state-icon').textContent = statusView.icon;
    item.querySelector('.item-speed').textContent = task.speed || '';
  }

  function upsertBulkTask(task, options = {}) {
    const existing = bulkTasks.get(task.url);
    if (existing) {
      existing.data = Object.assign({}, existing.data, task);
      if (options.preference) existing.preference = options.preference;
      updateBulkQueueItem(existing.element, existing.data);
      updateBulkControls();
      return existing;
    }

    const data = Object.assign({ status: 'pending', progress: 0 }, task);
    const element = createBulkQueueItem(data, {
      loading: Boolean(options.loading)
    });
    queueList.appendChild(element);
    const entry = { element, data };
    bulkTasks.set(task.url, entry);
    updateBulkControls();
    return entry;
  }

  async function hydrateBulkMetadata(url) {
    const entry = bulkTasks.get(url);
    if (!entry) return;

    try {
      const result = await window.orbit.fetchMetadata(url);
      const current = bulkTasks.get(url);
      if (!current) return;
      current.element.classList.remove('loading');
      if (result && result.ok) {
        current.data = Object.assign({}, current.data, {
          title: result.title,
          duration: result.duration,
          thumbnailUrl: result.thumbnailUrl
        });
        updateBulkQueueItem(current.element, current.data);
      }
    } catch (_err) {
      const current = bulkTasks.get(url);
      if (current) current.element.classList.remove('loading');
    }
  }

  async function handleBulkAdd() {
    const urls = bulkUrlInput.value
      .split(/[\n,]+/)
      .map(url => url.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    bulkAddBtn.disabled = true;
    try {
      const preference = getBulkPreference();
      const result = await window.orbit.queueAdd(urls, {
        format: bulkFormat,
        quality: bulkQualitySelect ? bulkQualitySelect.value : '1080'
      });
      const added = result && Array.isArray(result.added) ? result.added : [];
      const duplicates = result && Array.isArray(result.duplicates) ? result.duplicates : [];
      const invalid = result && Array.isArray(result.invalid) ? result.invalid : [];

      for (const url of added) {
        upsertBulkTask({
          url,
          status: 'pending',
          progress: 0,
          format: bulkFormat,
          quality: bulkQualitySelect ? bulkQualitySelect.value : '1080'
        }, {
          loading: true
        });
        hydrateBulkMetadata(url);
      }

      showToast(
        added.length > 0 ? 'success' : 'info',
        `Added ${added.length} videos, skipped ${duplicates.length} duplicates, ${invalid.length} invalid`
      );
      if (added.length > 0) {
        bulkUrlInput.value = '';
        queueCount.classList.remove('pulse-animation');
        void queueCount.offsetWidth; // Trigger CSS animation reflow
        queueCount.classList.add('pulse-animation');
      }
    } catch (err) {
      showToast('error', `Failed to add to queue: ${err && err.message || 'Unknown error'}`);
    } finally {
      bulkAddBtn.disabled = false;
    }
  }

  async function removeBulkQueueItem(url) {
    const entry = bulkTasks.get(url);
    if (!entry || entry.element.classList.contains('removing')) return;
    entry.element.classList.add('removing');

    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      await window.orbit.queueRemove(url);
      entry.element.style.display = 'none';
      entry.element.remove();
      bulkTasks.delete(url);
      if (selectedQueueUrl === url) selectedQueueUrl = null;
      updateBulkControls();
    } catch (err) {
      entry.element.classList.remove('removing');
      showToast('error', `Failed to remove: ${err && err.message || 'Unknown error'}`);
    }
  }

  async function handleClearBulkQueue() {
    if (bulkTasks.size === 0) return;
    queueClearBtn.disabled = true;

    try {
      await window.orbit.queueClear();
      const entries = Array.from(bulkTasks.values());
      entries.forEach((entry, index) => {
        setTimeout(() => entry.element.classList.add('removing'), index * 50);
      });
      await new Promise(resolve => setTimeout(resolve, 300 + Math.max(0, entries.length - 1) * 50));
      queueList.innerHTML = '';
      bulkTasks.clear();
      selectedQueueUrl = null;
      updateBulkControls();
      showToast('success', 'Queue cleared');
    } catch (err) {
      for (const entry of bulkTasks.values()) entry.element.classList.remove('removing');
      updateBulkControls();
      showToast('error', `Failed to clear queue: ${err && err.message || 'Unknown error'}`);
    }
  }

  function setBulkRunning(running) {
    bulkQueueRunning = running;
    startQueueBtn.classList.toggle('is-running', running);
    startQueueLabel.textContent = running ? 'Downloading...' : 'Start Queue Download';
    startQueueIcon.textContent = running ? '' : '\u2B07';
    updateBulkControls();
  }

  async function handleStartQueue() {
    if (bulkQueueRunning || bulkTasks.size === 0) return;
    setBulkRunning(true);
    try {
      const result = await window.orbit.queueStart();
      if (!result || !result.success) {
        showToast('error', result && result.error || 'Failed to start queue');
      }
    } catch (err) {
      showToast('error', `Failed to start queue: ${err && err.message || 'Unknown error'}`);
    } finally {
      setBulkRunning(false);
    }
  }

  function patchBulkTask(partial) {
    if (!partial || !partial.url) return;
    const entry = upsertBulkTask(partial);
    entry.element.classList.remove('loading');
    const allTerminal = bulkTasks.size > 0 && Array.from(bulkTasks.values()).every(({ data }) => {
      return terminalStatuses.has(data.status);
    });
    if (bulkQueueRunning && allTerminal) setBulkRunning(false);
  }

  async function loadQueue() {
    try {
      const tasks = await window.orbit.queueGet();
      queueList.innerHTML = '';
      bulkTasks.clear();
      for (const task of tasks) upsertBulkTask(task);
      updateBulkControls();
    } catch (err) {
      showToast('error', 'Failed to load queue');
    }
  }

  bulkAddBtn.addEventListener('click', handleBulkAdd);
  bulkUrlInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleBulkAdd();
    }
  });
  bulkBrowseBtn.addEventListener('click', async () => {
    try {
      const path = await window.orbit.chooseDownloadFolder();
      if (!path) return;
      const result = await window.orbit.saveSettings({ downloadLocation: path });
      if (!result || !result.success) {
        showToast('error', result && result.error || 'Failed to save download folder');
        return;
      }
      bulkSavePath.textContent = path;
      bulkSavePath.title = path;
      if (singleSavePath) {
        singleSavePath.textContent = path;
        singleSavePath.title = path;
      }
      downloadLocationInput.value = path;
      document.getElementById('status-folder-path').textContent = path;
    } catch (err) {
      showToast('error', 'Failed to select folder');
    }
  });
  queueClearBtn.addEventListener('click', handleClearBulkQueue);
  startQueueBtn.addEventListener('click', handleStartQueue);

  document.addEventListener('keydown', event => {
    if (!panelBulk.classList.contains('active')) return;
    if (event.key === 'Delete' && selectedQueueUrl) {
      event.preventDefault();
      removeBulkQueueItem(selectedQueueUrl);
    }
  });

  window.orbit.onQueueProgress(data => {
    if (!data || !data.url) return;
    patchBulkTask(data);
    if (data.speed) document.getElementById('status-speed').textContent = data.speed;
    updateSingleProgressFromEvent(data);
  });

  window.orbit.onQueueTaskUpdated(data => {
    if (!data || !data.url) return;
    patchBulkTask(data);
    finishSingleIfDone(data);
  });

  // ================================================================
  // Startup
  // ================================================================
  (async function init() {
    try {
      const version = await window.orbit.getVersion();
      const versionEl = document.getElementById('status-version');
      if (versionEl) versionEl.textContent = 'v' + version;
    } catch (err) {
      console.error('Failed to get app version:', err);
    }
    await loadSettings();
    await Promise.all([validateFfmpeg(), checkYtDlpStatus()]);
    await loadQueue();

    // Position the mode indicator after layout settles
    requestAnimationFrame(() => {
      updateModeIndicator();
    });
  })();
});
