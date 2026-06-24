import { useState, useCallback, useEffect } from 'react';
import { ipcService } from '@/services/ipcService';
import { useAppStore } from '@/stores/appStore';
import { useToastStore } from '@/stores/toastStore';
import { useTheme } from '@/hooks/useTheme';
import type { Settings } from '@/types';

export function SettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const appVersion = useAppStore((s) => s.appVersion);
  const { theme, setTheme } = useTheme();
  const [settings, setLocalSettings] = useState<Partial<Settings>>({});
  const [ffmpegValid, setFfmpegValid] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [ytdlpValid, setYtdlpValid] = useState<'neutral' | 'success' | 'error'>('neutral');

  const load = useCallback(async () => {
    try {
      const s = await ipcService.getSettings();
      setLocalSettings(s);
      
      if (s.ffmpegLocation) {
        ipcService.resolveFfmpeg(s.ffmpegLocation)
          .then(res => setFfmpegValid(res.ok ? 'success' : 'error'))
          .catch(() => setFfmpegValid('error'));
      } else {
        ipcService.resolveFfmpeg('')
          .then(res => setFfmpegValid(res.ok ? 'success' : 'error'))
          .catch(() => setFfmpegValid('error'));
      }

      if (s.ytdlpLocation) {
        ipcService.validateYtDlp(s.ytdlpLocation)
          .then(res => setYtdlpValid(res.valid ? 'success' : 'error'))
          .catch(() => setYtdlpValid('error'));
      } else {
        ipcService.ensureYtDlp()
          .then(res => setYtdlpValid(res.ok ? 'success' : 'error'))
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
      } else {
        const res = await ipcService.validateYtDlp(path);
        setYtdlpValid(res.valid ? 'success' : 'error');
      }
    } catch {
      setYtdlpValid('error');
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
              <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                ffmpegValid === 'success' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                ffmpegValid === 'error' ? 'bg-[rgba(232,0,42,0.08)] text-[var(--color-error)]' :
                'bg-[rgba(0,0,0,0.04)] text-[var(--color-text-disabled)]'
              }`}>
                <span className="text-[11px]">●</span>
                <span>{ffmpegValid === 'success' ? 'FFmpeg found' : ffmpegValid === 'error' ? 'FFmpeg not found' : 'Checking...'}</span>
              </div>
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
              </div>
              <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                ytdlpValid === 'success' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                ytdlpValid === 'error' ? 'bg-[rgba(232,0,42,0.08)] text-[var(--color-error)]' :
                'bg-[rgba(0,0,0,0.04)] text-[var(--color-text-disabled)]'
              }`}>
                <span className="text-[11px]">●</span>
                <span>{ytdlpValid === 'success' ? 'yt-dlp found' : ytdlpValid === 'error' ? 'yt-dlp not found' : 'Checking...'}</span>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="pt-5 border-t border-[var(--color-border)] flex items-center gap-4 select-none">
            <img src="./orbit-logo.svg" alt="Orbit" className="w-14 h-14 object-contain" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-[var(--color-text-primary)] m-0">Orbit Downloader v{appVersion}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] m-0 mt-0.5">A modern cross-platform media downloader supporting YouTube, Spotify, and other platforms.</p>
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
    </div>
  );
}
