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
  // Preload Safety Check
  // ================================================================
  if (!window.orbit) {
    console.error('[renderer] window.orbit is UNDEFINED - preload did not run or failed.');

    if (window.__orbit_preload_error__) {
      console.error('[renderer] Preload error message:', window.__orbit_preload_error__);
    }

    if (window.__orbit_preload_ready__) {
      console.error('[renderer] __orbit_preload_ready__ is TRUE but window.orbit is missing - bug in preload logic.');
    } else {
      console.error('[renderer] __orbit_preload_ready__ is also FALSE - the preload script never finished executing. Check the terminal where you ran npm start for require/module errors.');
    }

    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#e06c75;color:#fff;padding:1rem;font-weight:500;z-index:100000;text-align:center;';
    banner.textContent = 'Error: window.orbit is undefined. The preload script did not run. Check the terminal for preload errors and restart the app.';
    document.body.appendChild(banner);
    return;
  }

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
  // Downloads Tab
  // ================================================================

  // DOM References
  const urlInput = document.getElementById('url-input');
  const btnAddQueue = document.getElementById('btn-add-queue');
  const btnStartDownloads = document.getElementById('btn-start-downloads');
  const btnClearQueue = document.getElementById('btn-clear-queue');
  const btnOpenFolder = document.getElementById('btn-open-folder');
  const queueContainer = document.getElementById('queue-container');
  const queueList = document.getElementById('queue-list');
  const queueEmptyState = document.getElementById('queue-empty-state');

  // State
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
    if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function truncateUrl(url, max = 50) {
    if (!url) return '';
    return url.length > max ? url.slice(0, max) + '…' : url;
  }

  function getStatusIcon(status) {
    const map = {
      pending: '🔄',
      extracting_info: '📊',
      downloading: '⬇️',
      converting: '🔄',
      completed: '✅',
      error: '❌',
      already_exists: '📁'
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
      case 'pending': return 'Waiting…';
      case 'extracting_info': return 'Getting info…';
      case 'downloading': return `${Math.round(progress || 0)}%`;
      case 'converting': return 'Converting…';
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
    if (task.duration) parts.push(`Duration: ${fmtDuration(task.duration)}`);
    if (task.speed) parts.push(`Speed: ${task.speed}`);
    parts.push(`URL: ${truncateUrl(task.url, 70)}`);
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

    item.innerHTML = `
      <div class="queue-item-header">
        <div class="queue-item-title" title="${escapeHtml(task.title || task.url)}">${escapeHtml(titleText)}</div>
        <span class="status-badge status-badge-${task.status}">${statusIcon} ${statusLabel}</span>
        <button class="queue-item-remove" data-remove-url="${escapeHtml(task.url)}" title="Remove">✕</button>
      </div>
      <div class="queue-item-meta">${escapeHtml(caption)}</div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill ${barClass}" style="width: ${progressWidth}%;"></div>
      </div>
      <div class="progress-caption">${progressCaption}</div>
      <div class="queue-item-error" style="display: ${task.errorMessage ? 'block' : 'none'};">${escapeHtml(task.errorMessage || '')}</div>
    `;

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
    badge.className = `status-badge status-badge-${task.status}`;
    badge.textContent = `${getStatusIcon(task.status)} ${getStatusLabel(task.status)}`;

    // meta caption
    const meta = el.querySelector('.queue-item-meta');
    meta.textContent = formatCaption(task);

    // progress bar
    const fill = el.querySelector('.progress-bar-fill');
    const width = getProgressForStatus(task.status, task.progress);
    fill.style.width = `${width}%`;
    fill.className = `progress-bar-fill ${getProgressBarClass(task.status)}`;

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
      tasksByUrl.set(task.url, { element: el, data: { ...task } });
    }
    updateSummary();
  }

  function patchTask(taskPartial) {
    const existing = tasksByUrl.get(taskPartial.url);
    if (!existing) return null;

    const merged = { ...existing.data, ...taskPartial };
    existing.data = merged;
    updateQueueItem(existing.element, merged);
    updateSummary();
    return merged;
  }

  function addTaskToUI(task) {
    if (tasksByUrl.has(task.url)) return; // already there
    hideEmptyState();
    const el = createQueueItem(task);
    queueList.appendChild(el);
    tasksByUrl.set(task.url, { element: el, data: { ...task } });
    updateSummary();
  }

  // ----------------------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------------------
  async function handleAddToQueue() {
    const raw = urlInput.value;
    if (!raw.trim()) return;

    // Split on both newlines and commas
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
      showToast('warning', `No valid YouTube URLs found. ${invalid.length} invalid skipped.`);
      return;
    }

    try {
      const result = await window.orbit.queueAdd(valid);
      const addedCount = result?.added?.length || 0;
      const dupCount = result?.duplicates?.length || 0;
      const invalidCount = (result?.invalid?.length || 0) + invalid.length;

      const parts = [];
      if (addedCount > 0) parts.push(`Added ${addedCount}`);
      if (dupCount > 0) parts.push(`skipped ${dupCount} duplicate`);
      if (invalidCount > 0) parts.push(`${invalidCount} invalid`);

      showToast('success', parts.join(', '));

      if (addedCount > 0) {
        urlInput.value = '';
        // Re-fetch queue to show new items
        const tasks = await window.orbit.queueGet();
        renderQueue(tasks);
      }
    } catch (err) {
      showToast('error', 'Failed to add to queue: ' + (err?.message || 'Unknown error'));
    }
  }

  async function handleStartDownloads() {
    if (isDownloading) return;
    isDownloading = true;
    btnStartDownloads.disabled = true;
    try {
      const result = await window.orbit.queueStart();
      if (result?.error) {
        showToast('error', result.error);
      } else if (result?.success) {
        showToast('info', 'Downloads started');
      }
    } catch (err) {
      showToast('error', 'Failed to start downloads: ' + (err?.message || 'Unknown error'));
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
      showToast('error', 'Failed to clear queue: ' + (err?.message || 'Unknown error'));
    }
  }

  async function handleOpenFolder() {
    try {
      const result = await window.orbit.folderOpen();
      if (!result?.success) {
        showToast('error', result?.error || 'Failed to open folder');
      }
    } catch (err) {
      showToast('error', 'Failed to open folder: ' + (err?.message || 'Unknown error'));
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
      showToast('error', 'Failed to remove: ' + (err?.message || 'Unknown error'));
    }
  }

  btnAddQueue.addEventListener('click', handleAddToQueue);
  btnStartDownloads.addEventListener('click', handleStartDownloads);
  btnClearQueue.addEventListener('click', handleClearQueue);
  btnOpenFolder.addEventListener('click', handleOpenFolder);

  // ----------------------------------------------------------------
  // Push Event Subscriptions
  // ----------------------------------------------------------------
  window.orbit.onQueueProgress((data) => {
    if (!data || !data.url) return;
    const existing = tasksByUrl.get(data.url);
    if (!existing) return;

    const merged = { ...existing.data, ...data };
    existing.data = merged;
    updateQueueItem(existing.element, merged);
  });

  window.orbit.onQueueTaskUpdated((data) => {
    if (!data || !data.url) return;
    const existing = tasksByUrl.get(data.url);
    if (existing) {
      const merged = { ...existing.data, ...data };
      existing.data = merged;
      updateQueueItem(existing.element, merged);
      updateSummary();
    } else {
      // Task might have been added while we weren't looking (rare)
      addTaskToUI(data);
      updateSummary();
    }
  });

  // ----------------------------------------------------------------
  // Tab switching + initial load
  // ----------------------------------------------------------------
  async function loadQueueOnTabShow() {
    try {
      const tasks = await window.orbit.queueGet();
      renderQueue(tasks);
    } catch (err) {
      showToast('error', 'Failed to load queue');
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'downloads') {
        loadQueueOnTabShow();
      }
    });
  });

  // ================================================================
  // Preload Safety Check
  // ================================================================
  if (!window.orbit) {
    console.error('[renderer] window.orbit is UNDEFINED — preload did not run or failed.');

    if (window.__orbit_preload_error__) {
      console.error('[renderer] Preload error message:', window.__orbit_preload_error__);
    }

    if (window.__orbit_preload_ready__) {
      console.error('[renderer] __orbit_preload_ready__ is TRUE but window.orbit is missing — bug in preload logic.');
    } else {
      console.error('[renderer] __orbit_preload_ready__ is also FALSE — the preload script never finished executing. Check the terminal where you ran npm start for require/module errors.');
    }

    // Show a visible error on the page so the user notices immediately, even if they skip DevTools
    const body = document.body;
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#e06c75;color:#fff;padding:1rem;font-weight:500;z-index:100000;text-align:center;';
    banner.textContent = 'Error: window.orbit is undefined — the preload script did not run. Check the terminal for require/module errors and run "npm start" again.';
    body.appendChild(banner);
  }

  // ================================================================
  // ================================================================
  // Startup
  // ================================================================
  (async function init() {
    await loadSettings();
    await Promise.all([validateFfmpeg(), checkYtDlpStatus()]);
    // Also load the queue initially
    await loadQueueOnTabShow();
  })();
});
