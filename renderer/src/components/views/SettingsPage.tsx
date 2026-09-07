import { useState, useCallback, useEffect } from 'react';
import { ipcService } from '@/services/ipcService';
import { useAppStore } from '@/stores/appStore';
import { useToastStore } from '@/stores/toastStore';
import { useTheme } from '@/hooks/useTheme';
import { DependencyDownloadModal } from '@/components/ui/DependencyDownloadModal';
import type { Settings } from '@/types';

export function SettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const appVersion = useAppStore((s) => s.appVersion);
  const { theme, setTheme } = useTheme();
  const [settings, setLocalSettings] = useState<Partial<Settings>>({});
  const [ffmpegValid, setFfmpegValid] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [ytdlpValid, setYtdlpValid] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [ffmpegPath, setFfmpegPath] = useState<string>('');
  const [ytdlpPath, setYtdlpPath] = useState<string>('');
  const [activeDownloadDep, setActiveDownloadDep] = useState<string | null>(null);
  const [ytdlpUpdating, setYtdlpUpdating] = useState<boolean>(false);
  
  const [dependencies, setDependencies] = useState<Record<string, any>>({});

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadDependencies = useCallback(async () => {
    try {
      const deps = await ipcService.getDependencyStatus();
      setDependencies(deps);
    } catch (err) {
      console.error('Failed to load dependency statuses:', err);
    }
  }, []);

  useEffect(() => {
    loadDependencies();
    const removeListener = ipcService.onDependencyStatusChange((updatedDep) => {
      setDependencies(prev => ({ ...prev, [updatedDep.id]: updatedDep }));
    });

    const removeUpdateListener = ipcService.onUpdateStatusChange((data) => {
      if (data.event === 'checking') {
        setUpdateStatus('checking');
        setUpdateError(null);
      } else if (data.event === 'available') {
        setUpdateStatus('available');
        if (data.version) setUpdateVersion(data.version);
        setUpdateError(null);
      } else if (data.event === 'not-available') {
        setUpdateStatus('not-available');
        if (data.version) setUpdateVersion(data.version);
        setUpdateError(null);
      } else if (data.event === 'downloading') {
        setUpdateStatus('downloading');
        if (data.percent !== undefined) setUpdateProgress(data.percent);
      } else if (data.event === 'downloaded') {
        setUpdateStatus('downloaded');
        if (data.version) setUpdateVersion(data.version);
      } else if (data.event === 'error') {
        setUpdateStatus('error');
        if (data.error) setUpdateError(data.error);
      }
    });

    return () => {
      removeListener();
      removeUpdateListener();
    };
  }, [loadDependencies]);

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError(null);
    try {
      const res = await ipcService.checkUpdates();
      if (!res.success) {
        setUpdateStatus('error');
        setUpdateError(res.error || 'Failed to check for updates');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err.message || String(err));
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateStatus('downloading');
    setUpdateProgress(0);
    try {
      const res = await ipcService.downloadUpdate();
      if (!res.success) {
        setUpdateStatus('error');
        setUpdateError(res.error || 'Failed to download update');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err.message || String(err));
    }
  };

  const handleInstallUpdate = async () => {
    try {
      const res = await ipcService.installUpdate();
      if (!res.success) {
        setUpdateStatus('error');
        setUpdateError(res.error || 'Failed to install update');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err.message || String(err));
    }
  };

  const load = useCallback(async () => {
    try {
      const s = await ipcService.getSettings();
      setLocalSettings(s);
      
      if (s.ffmpegLocation) {
        ipcService.resolveFfmpeg(s.ffmpegLocation)
          .then(res => {
            setFfmpegValid(res.ok ? 'success' : 'error');
            if (res.ok && res.path) setFfmpegPath(res.path);
          })
          .catch(() => setFfmpegValid('error'));
      } else {
        ipcService.resolveFfmpeg('')
          .then(res => {
            setFfmpegValid(res.ok ? 'success' : 'error');
            if (res.ok && res.path) setFfmpegPath(res.path);
          })
          .catch(() => setFfmpegValid('error'));
      }

      if (s.ytdlpLocation) {
        ipcService.validateYtDlp(s.ytdlpLocation)
          .then(res => {
            setYtdlpValid(res.valid ? 'success' : 'error');
            if (res.valid) setYtdlpPath(s.ytdlpLocation || '');
          })
          .catch(() => setYtdlpValid('error'));
      } else {
        ipcService.ensureYtDlp()
          .then(res => {
            setYtdlpValid(res.ok ? 'success' : 'error');
            if (res.ok && res.path) setYtdlpPath(res.path);
          })
          .catch(() => setYtdlpValid('error'));
      }


    } catch {
      addToast('error', 'Failed to load settings');
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const browse = async () => {
    try {
      const path = await ipcService.chooseDownloadFolder();
      if (path) setLocalSettings((prev) => ({ ...prev, downloadLocation: path }));
    } catch {
      addToast('error', 'Failed to open folder picker');
    }
  };

  const save = async () => {
    try {
      const result = await ipcService.saveSettings(settings);
      if (result.success) {
        addToast('success', 'Settings saved successfully');
      } else {
        addToast('error', result.error || 'Failed to save settings');
      }
    } catch {
      addToast('error', 'Failed to save settings');
    }
  };

  const validateFfmpeg = async () => {
    setFfmpegValid('neutral');
    try {
      const res = await ipcService.resolveFfmpeg(settings.ffmpegLocation || '');
      setFfmpegValid(res.ok ? 'success' : 'error');
      if (res.ok && res.path) setFfmpegPath(res.path);
    } catch {
      setFfmpegValid('error');
    }
  };

  const validateYtdlp = async () => {
    setYtdlpValid('neutral');
    try {
      const path = settings.ytdlpLocation || '';
      if (!path) {
        const res = await ipcService.ensureYtDlp();
        setYtdlpValid(res.ok ? 'success' : 'error');
        if (res.ok && res.path) setYtdlpPath(res.path);
      } else {
        const res = await ipcService.validateYtDlp(path);
        setYtdlpValid(res.valid ? 'success' : 'error');
        if (res.valid) setYtdlpPath(path);
      }
    } catch {
      setYtdlpValid('error');
    }
  };

  const updateYtdlp = async () => {
    setYtdlpUpdating(true);
    try {
      const res = await ipcService.updateYtDlp();
      if (res.success) {
        addToast('success', 'yt-dlp updated successfully');
        validateYtdlp();
      } else {
        addToast('error', res.error || 'Failed to update yt-dlp');
      }
    } catch {
      addToast('error', 'Failed to update yt-dlp');
    } finally {
      setYtdlpUpdating(false);
    }
  };


  return (
    <div className="h-full w-full max-w-[1000px] mx-auto bg-[var(--color-surface-elevated)] rounded-3xl shadow-lg border border-[var(--color-border-subtle)] p-4 sm:p-6 md:p-8 flex flex-col gap-4 md:gap-6 min-h-0">
      <div>
        <h1 className="text-2xl md:text-[28px] font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] max-w-[500px]">
          Configure download directories, parallel task limits, browser cookies integration, and external tool paths.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch flex-1 min-h-0 overflow-y-auto pr-1">
        {/* Left Column - Form fields */}
        <div className="space-y-5 flex flex-col justify-between md:h-full">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Download Location</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={settings.downloadLocation || ''}
                  readOnly
                  className="flex-1 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none"
                />
                <button
                  onClick={browse}
                  className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border-0"
                >
                  Browse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Max Parallel Downloads</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={settings.maxParallelDownloads || 3}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, maxParallelDownloads: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-[var(--color-border)] rounded-full appearance-none outline-none cursor-pointer accent-[var(--color-accent-purple)]"
                />
                <span className="text-base font-semibold text-[var(--color-accent-purple)] min-w-[1.5rem] text-center">
                  {settings.maxParallelDownloads || 3}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Cookies from Browser</label>
              <select
                value={settings.cookiesFromBrowser || ''}
                onChange={(e) => setLocalSettings((p) => ({ ...p, cookiesFromBrowser: e.target.value }))}
                className="w-full h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none appearance-none cursor-pointer"
              >
                <option value="">None</option>
                <option value="chrome">Chrome</option>
                <option value="firefox">Firefox</option>
                <option value="edge">Edge</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">App Theme</label>
              <div className="flex gap-3">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      setLocalSettings((p) => ({ ...p, theme: t }));
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-[1.5px] text-sm font-medium transition-all cursor-pointer
                      ${theme === t
                        ? 'border-[var(--color-accent-purple)] text-[var(--color-accent-purple)] bg-[var(--color-accent-purple-light)] font-semibold'
                        : 'border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-accent-purple)] hover:text-[var(--color-accent-purple)]'
                      }`}
                  >
                    <span className="material-icons text-lg">{t === 'light' ? 'light_mode' : 'dark_mode'}</span>
                    <span className="capitalize">{t} Theme</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <button
              onClick={save}
              className="w-full h-11 rounded-md text-sm font-semibold bg-[var(--color-accent-purple)] text-white hover:bg-[var(--color-accent-purple-hover)] transition-colors cursor-pointer border-0"
            >
              Save Settings
            </button>
          </div>
        </div>

        {/* Right Column - Binary Tools & About */}
        <div className="border-t md:border-t-0 md:border-l border-[var(--color-border)] pt-6 md:pt-0 pl-0 md:pl-8 flex flex-col md:justify-between md:h-full min-h-0 space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">FFmpeg Location</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={settings.ffmpegLocation || ''}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, ffmpegLocation: e.target.value }))}
                  className="flex-1 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none"
                  placeholder="Leave empty for auto-resolution..."
                />
                <button
                  onClick={validateFfmpeg}
                  className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border-0"
                >
                  Validate
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  ffmpegValid === 'success' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                  ffmpegValid === 'error' ? 'bg-[rgba(232,0,42,0.08)] text-[var(--color-error)]' :
                  'bg-[rgba(0,0,0,0.04)] text-[var(--color-text-disabled)]'
                }`}>
                  <span className="text-[11px]">●</span>
                  <span>{ffmpegValid === 'success' ? 'FFmpeg found' : ffmpegValid === 'error' ? 'FFmpeg missing' : 'Checking...'}</span>
                </div>
                {ffmpegValid === 'error' && (
                  <button
                    onClick={() => setActiveDownloadDep('ffmpeg')}
                    className="h-8 px-3 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer border-0 flex items-center gap-1 shadow-sm"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Auto Resolve
                  </button>
                )}
              </div>
              {ffmpegValid === 'success' && ffmpegPath && (
                <div className="mt-1.5 text-[11px] text-[var(--color-text-secondary)] font-mono break-all bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] p-2 rounded border border-[var(--color-border)] select-text">
                  Path: {ffmpegPath}
                </div>
              )}
              {dependencies['ffmpeg']?.status === 'downloading' && (
                <div className="mt-2 space-y-1.5 p-3 rounded-lg border border-[var(--color-border)] bg-[rgba(0,0,0,0.01)] dark:bg-[rgba(255,255,255,0.01)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text-secondary)]">Downloading FFmpeg...</span>
                    <span className="text-[var(--color-accent-purple)] font-bold">{dependencies['ffmpeg'].progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--color-border)] rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-[var(--color-accent-purple)] h-1 rounded-full transition-all duration-300"
                      style={{ width: `${dependencies['ffmpeg'].progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">yt-dlp Location</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={settings.ytdlpLocation || ''}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, ytdlpLocation: e.target.value }))}
                  className="flex-1 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none"
                  placeholder="Leave empty for auto-resolution..."
                />
                <button
                  onClick={validateYtdlp}
                  className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border-0"
                >
                  Validate
                </button>
                <button
                  onClick={updateYtdlp}
                  disabled={ytdlpUpdating || ytdlpValid === 'error' || ytdlpValid === 'neutral'}
                  className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ytdlpUpdating ? 'Updating...' : 'Update'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  ytdlpValid === 'success' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                  ytdlpValid === 'error' ? 'bg-[rgba(232,0,42,0.08)] text-[var(--color-error)]' :
                  'bg-[rgba(0,0,0,0.04)] text-[var(--color-text-disabled)]'
                }`}>
                  <span className="text-[11px]">●</span>
                  <span>{ytdlpValid === 'success' ? 'yt-dlp found' : ytdlpValid === 'error' ? 'yt-dlp missing' : 'Checking...'}</span>
                </div>
                {ytdlpValid === 'error' && (
                  <button
                    onClick={() => setActiveDownloadDep('ytdlp')}
                    className="h-8 px-3 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer border-0 flex items-center gap-1 shadow-sm"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Auto Resolve
                  </button>
                )}
              </div>
              {ytdlpValid === 'success' && ytdlpPath && (
                <div className="mt-1.5 text-[11px] text-[var(--color-text-secondary)] font-mono break-all bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] p-2 rounded border border-[var(--color-border)] select-text">
                  Path: {ytdlpPath}
                </div>
              )}
              {dependencies['ytdlp']?.status === 'downloading' && (
                <div className="mt-2 space-y-1.5 p-3 rounded-lg border border-[var(--color-border)] bg-[rgba(0,0,0,0.01)] dark:bg-[rgba(255,255,255,0.01)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text-secondary)]">Downloading yt-dlp...</span>
                    <span className="text-[var(--color-accent-purple)] font-bold">{dependencies['ytdlp'].progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--color-border)] rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-[var(--color-accent-purple)] h-1 rounded-full transition-all duration-300"
                      style={{ width: `${dependencies['ytdlp'].progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Updates Section */}
          <div className="pt-5 border-t border-[var(--color-border)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] m-0">Updates</h3>
            <div className="bg-[rgba(0,0,0,0.01)] dark:bg-[rgba(255,255,255,0.01)] border border-[var(--color-border)] rounded-lg p-3 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-secondary)]">Current Version</span>
                <span className="font-mono text-[var(--color-text-primary)]">v{appVersion}</span>
              </div>

              {updateVersion && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-secondary)]">Latest Version</span>
                  <span className="font-mono text-[var(--color-text-primary)]">v{updateVersion}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-secondary)]">Status</span>
                <span className={`font-semibold capitalize ${
                  updateStatus === 'checking' ? 'text-[var(--color-accent-purple)]' :
                  updateStatus === 'available' ? 'text-indigo-400' :
                  updateStatus === 'not-available' ? 'text-[var(--color-success)]' :
                  updateStatus === 'downloading' ? 'text-[var(--color-accent-purple)]' :
                  updateStatus === 'downloaded' ? 'text-[var(--color-success)]' :
                  updateStatus === 'error' ? 'text-[var(--color-error)]' :
                  'text-[var(--color-text-disabled)]'
                }`}>
                  {updateStatus === 'idle' && 'Up to date'}
                  {updateStatus === 'checking' && 'Checking...'}
                  {updateStatus === 'available' && 'Update available'}
                  {updateStatus === 'not-available' && 'Up to date'}
                  {updateStatus === 'downloading' && `Downloading (${updateProgress}%)`}
                  {updateStatus === 'downloaded' && 'Ready to install'}
                  {updateStatus === 'error' && 'Error'}
                </span>
              </div>

              {updateStatus === 'downloading' && (
                <div className="w-full bg-[var(--color-border)] rounded-full h-1 overflow-hidden mt-1">
                  <div
                    className="bg-[var(--color-accent-purple)] h-1 rounded-full transition-all duration-300"
                    style={{ width: `${updateProgress}%` }}
                  ></div>
                </div>
              )}

              {updateError && (
                <div className="text-[11px] text-[var(--color-error)] bg-[rgba(232,0,42,0.05)] border border-[rgba(232,0,42,0.1)] rounded p-2 leading-relaxed">
                  {updateError}
                </div>
              )}

              <div className="pt-1 flex gap-2">
                {(updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error') && (
                  <button
                    onClick={handleCheckUpdates}
                    className="flex-1 h-9 rounded-md text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                  >
                    Check for Updates
                  </button>
                )}

                {updateStatus === 'checking' && (
                  <button
                    disabled
                    className="flex-1 h-9 rounded-md text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-text-disabled)] border border-[var(--color-border)] transition-colors cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <svg className="animate-spin h-3.5 w-3.5 text-[var(--color-text-disabled)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking...
                  </button>
                )}

                {updateStatus === 'available' && (
                  <button
                    onClick={handleDownloadUpdate}
                    className="flex-1 h-9 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white border-0 transition-colors cursor-pointer shadow-sm"
                  >
                    Download Update
                  </button>
                )}

                {updateStatus === 'downloaded' && (
                  <button
                    onClick={handleInstallUpdate}
                    className="flex-1 h-9 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0 transition-colors cursor-pointer shadow-sm"
                  >
                    Install & Restart
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="pt-5 border-t border-[var(--color-border)] flex items-center gap-4 select-none">
            <img src="./orbit-logo.svg" alt="Orbit" className="w-14 h-14 object-contain" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-[var(--color-text-primary)] m-0">Orbit Downloader v{appVersion}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] m-0 mt-0.5">A modern cross-platform media downloader supporting YouTube and other platforms.</p>
              <p className="text-xs text-[var(--color-text-primary)] m-0 mt-1">
                <strong>Developer:</strong>{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    ipcService.openExternal('https://nisheetpatel.vercel.app/');
                  }}
                  className="text-[var(--color-accent-purple)] no-underline font-medium hover:underline cursor-pointer"
                >
                  Nisheet Patel
                </a>
              </p>
            </div>
            <div className="text-right text-[10px] text-[var(--color-text-disabled)] leading-normal max-w-[150px]">
              Powered by yt-dlp & FFmpeg.
              <br />All rights reserved.
            </div>
          </div>
        </div>
      </div>
      {activeDownloadDep && (
        <DependencyDownloadModal
          dependencyId={activeDownloadDep}
          onClose={() => setActiveDownloadDep(null)}
          onSuccess={() => {
            load();
            setActiveDownloadDep(null);
          }}
        />
      )}
    </div>
  );
}
