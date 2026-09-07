import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ipcService } from '@/services/ipcService';
import { VideoPreview } from '@/components/ui/VideoPreview';
import { Button } from '@/components/ui/Button';
import { useClipboard } from '@/hooks/useClipboard';
import { useToastStore } from '@/stores/toastStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { validateUrl } from '@/utils/validators';
import { useQueue } from '@/hooks/useQueue';
import { useAppStore } from '@/stores/appStore';

type Format = 'video' | 'audio';

const videoQualities = [
  { value: '2160', label: '2160p · 4K' },
  { value: '1440', label: '1440p · 2K' },
  { value: '1080', label: '1080p · Full HD' },
  { value: '720', label: '720p' },
  { value: '480', label: '480p' },
  { value: '360', label: '360p' },
];

const audioQualities = [
  { value: '320', label: '320 kbps' },
  { value: '256', label: '256 kbps' },
  { value: '192', label: '192 kbps' },
  { value: '128', label: '128 kbps' },
];

export function SingleDownload() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<Format>('video');
  const [quality, setQuality] = useState('1080');
  const [previewState, setPreviewState] = useState<'empty' | 'skeleton' | 'loaded'>('empty');
  const [meta, setMeta] = useState<{ title: string; thumbnailUrl: string; duration: number; channel: string; viewCount: number } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setMode = useAppStore((s) => s.setMode);
  const setBulkText = useAppStore((s) => s.setBulkText);
  const addToast = useToastStore((s) => s.addToast);
  const { addToQueue, startQueue } = useQueue();
  const { detectedUrl, showChip, dismissChip } = useClipboard();

  const checkAndRedirectPlaylist = useCallback((targetUrl: string): boolean => {
    const trimmed = targetUrl.trim();
    if (trimmed.includes('list=')) {
      setBulkText(trimmed);
      setMode('bulk');
      addToast('info', 'Playlist detected. Managing download in Bulk Downloads.');
      setUrl('');
      setPreviewState('empty');
      setMeta(null);
      return true;
    }
    return false;
  }, [setBulkText, setMode, addToast]);
  const task = useDownloadStore(useCallback((s) => {
    if (!url) return undefined;
    const key = `${url.trim()}#${format}#${quality}`;
    return s.tasks[key] || s.tasks[url.trim()];
  }, [url, format, quality]));
  const progress = task?.progress ?? 0;
  const speed = task?.speed ?? '';

  const fetchMeta = useCallback(async (targetUrl: string) => {
    if (!validateUrl(targetUrl)) {
      setPreviewState('empty');
      return;
    }
    setPreviewState('skeleton');
    try {
      const res = await ipcService.fetchMetadata(targetUrl);
      if (res.ok && res.title) {
        setMeta({
          title: res.title,
          thumbnailUrl: res.thumbnailUrl || '',
          duration: res.duration || 0,
          channel: res.channel || '',
          viewCount: res.viewCount || 0,
        });
        setPreviewState('loaded');
      } else {
        setPreviewState('empty');
        const errLower = (res.error || '').toLowerCase();
        if (errLower.includes('yt-dlp not available') || errLower.includes('yt-dlp is not installed') || errLower.includes('could not locate yt-dlp')) {
          addToast('error', (
            <span>
              yt-dlp not found.{' '}
              <button
                onClick={() => setMode('settings')}
                className="underline font-bold text-rose-300 bg-transparent border-0 cursor-pointer p-0 ml-1 hover:text-rose-100 transition-colors"
              >
                Open Settings
              </button>
            </span>
          ));
        } else {
          addToast('error', res.error || 'Failed to fetch metadata');
        }
      }
    } catch {
      setPreviewState('empty');
    }
  }, [addToast, setMode]);

  useEffect(() => {
    const handleDropped = (e: Event) => {
      const urls = (e as CustomEvent).detail?.urls;
      if (urls && urls.length > 0) {
        if (checkAndRedirectPlaylist(urls[0])) return;
        setUrl(urls[0]);
        fetchMeta(urls[0]);
      }
    };
    window.addEventListener('orbit:url-dropped', handleDropped);
    return () => window.removeEventListener('orbit:url-dropped', handleDropped);
  }, [fetchMeta, checkAndRedirectPlaylist]);

  const handleUrlChange = (value: string) => {
    if (checkAndRedirectPlaylist(value)) return;
    setUrl(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!value.trim()) {
      setPreviewState('empty');
      return;
    }
    debounceTimer.current = setTimeout(() => fetchMeta(value.trim()), 500);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (checkAndRedirectPlaylist(text)) return;
        setUrl(text.trim());
        await fetchMeta(text.trim());
      }
    } catch {
      addToast('error', 'Could not access clipboard');
    }
  };

  const handleDownload = useCallback(async () => {
    if (!url.trim() || !validateUrl(url.trim())) return;
    setDownloading(true);
    try {
      const res = await addToQueue([url.trim()], { 
        format, 
        quality,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined
      });
      if (res.error) {
        setDownloading(false);
        const errLower = res.error.toLowerCase();
        if (errLower.includes('yt-dlp not available') || errLower.includes('yt-dlp is not installed') || errLower.includes('could not locate yt-dlp')) {
          addToast('error', (
            <span>
              yt-dlp not found.{' '}
              <button
                onClick={() => setMode('settings')}
                className="underline font-bold text-rose-300 bg-transparent border-0 cursor-pointer p-0 ml-1 hover:text-rose-100 transition-colors"
              >
                Open Settings
              </button>
            </span>
          ));

        } else if (errLower.includes('ffmpeg')) {
          addToast('error', (
            <span>
              FFmpeg not found.{' '}
              <button
                onClick={() => setMode('settings')}
                className="underline font-bold text-rose-300 bg-transparent border-0 cursor-pointer p-0 ml-1 hover:text-rose-100 transition-colors"
              >
                Open Settings
              </button>
            </span>
          ));
        } else {
          addToast('error', res.error);
        }
        return;
      }

      if (res.added.length > 0) {
        const startRes = await startQueue();
        if (!startRes.success) {
          setDownloading(false);
          const errLower = (startRes.error || '').toLowerCase();
          if (errLower.includes('yt-dlp not available') || errLower.includes('yt-dlp is not installed') || errLower.includes('could not locate yt-dlp')) {
            addToast('error', (
              <span>
                yt-dlp not found.{' '}
                <button
                  onClick={() => setMode('settings')}
                  className="underline font-bold text-rose-300 bg-transparent border-0 cursor-pointer p-0 ml-1 hover:text-rose-100 transition-colors"
                >
                  Open Settings
                </button>
              </span>
            ));

          } else if (errLower.includes('ffmpeg')) {
            addToast('error', (
              <span>
                FFmpeg not found.{' '}
                <button
                  onClick={() => setMode('settings')}
                  className="underline font-bold text-rose-300 bg-transparent border-0 cursor-pointer p-0 ml-1 hover:text-rose-100 transition-colors"
                >
                  Open Settings
                </button>
              </span>
            ));
          } else {
            addToast('error', startRes.error || 'Failed to start download');
          }
        } else {
          addToast('info', 'Download started');
        }
      } else if (res.duplicates.length > 0) {
        addToast('warning', 'Already in queue');
      }
    } catch {
      setDownloading(false);
      addToast('error', 'Failed to start download');
    }
  }, [url, format, quality, addToQueue, startQueue, addToast, setMode]);

  const handleCancel = async () => {
    // Remove from queue
    try {
      await ipcService.queueRemove(url);
      setUrl('');
      setPreviewState('empty');
      setMeta(null);
      setDownloading(false);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!task) {
      setDownloading(false);
    } else {
      if (task.status === 'completed' || task.status === 'already_exists' || task.status === 'error') {
        setDownloading(false);
      } else if (task.status === 'downloading' || task.status === 'converting' || task.status === 'extracting_info') {
        setDownloading(true);
      }
    }
  }, [task, task?.status]);

  // Ctrl+D keyboard shortcut for download
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (url && validateUrl(url) && !downloading) {
          handleDownload();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [url, downloading, handleDownload]);

  const qualities = useMemo(() => (format === 'video' ? videoQualities : audioQualities), [format]);

  return (
    <div className="max-w-[900px] mx-auto bg-[var(--color-surface-elevated)] rounded-3xl shadow-lg border border-[var(--color-border-subtle)] p-8 flex gap-8 items-start">
      <div className="flex-1 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Single Download</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Download a single video or audio file from YouTube and other platforms</p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={url}
              disabled={downloading}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste link here (YouTube, etc.)..."
              className="w-full h-11 pl-4 pr-10 border-[1.5px] border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-disabled)] text-[13px] outline-none transition-all focus:border-[var(--color-accent-red)] focus:shadow-[0_0_0_3px_rgba(232,0,42,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {url && !downloading && (
              <button
                onClick={() => handleUrlChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)] border-0 bg-transparent cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
          <Button variant="secondary" onClick={handlePaste} disabled={downloading} className="h-11 px-4">
            Paste
          </Button>
        </div>

        {showChip && detectedUrl && (
          <div className="flex items-center justify-between p-3 bg-[var(--color-success-light)] border border-[rgba(48,182,122,0.12)] rounded-md">
            <span className="text-[13px] text-[var(--color-text-primary)] line-clamp-1">
              Link detected: <span className="font-semibold text-[#30B67A]">{detectedUrl}</span>
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  if (checkAndRedirectPlaylist(detectedUrl)) {
                    dismissChip();
                    return;
                  }
                  setUrl(detectedUrl);
                  fetchMeta(detectedUrl);
                  dismissChip();
                }}
                className="h-7 px-3 bg-[#30B67A] text-white text-xs font-semibold rounded-sm hover:bg-[#289E68] transition-all"
              >
                Download
              </button>
              <button
                onClick={dismissChip}
                className="h-7 px-3 bg-transparent text-[var(--color-text-secondary)] text-xs font-medium rounded-sm hover:bg-[rgba(0,0,0,0.04)] transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-4">
          <div className="flex gap-2">
            {(['video', 'audio'] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFormat(f);
                  setQuality(f === 'video' ? '1080' : '320');
                }}
                className={`h-9 px-4 rounded-full border-[1.5px] text-[13px] font-medium transition-all
                  ${format === f
                    ? 'border-[var(--color-accent-red)] text-[var(--color-accent-red)] bg-[var(--color-accent-red-light)] font-semibold'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-red)] hover:text-[var(--color-accent-red)]'
                  }`}
              >
                {f === 'video' ? 'Video' : 'Audio'}
              </button>
            ))}
          </div>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="h-9 px-3 border-[1.5px] border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] text-[13px] font-medium cursor-pointer appearance-none outline-none transition-all focus:border-[var(--color-accent-red)] focus:shadow-[0_0_0_3px_rgba(232,0,42,0.12)] pr-7 bg-[right_10px_center] bg-[length:12px] bg-no-repeat"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%276E6E80%27%3E%3Cpath d=%27M6 8L1 3h10z%27/%3E%3C/svg%3E")' }}
          >
            {qualities.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>
        </div>

        <div>
          <button 
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors bg-transparent border-0 p-0 cursor-pointer"
          >
            <span className={`material-icons text-[18px] transition-transform ${advancedOpen ? 'rotate-180' : ''}`}>expand_more</span>
            Advanced Options
          </button>
          
          {advancedOpen && (
            <div className="mt-4 p-4 bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] border border-[var(--color-border-subtle)] rounded-lg flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Start Time (optional)</label>
                <input 
                  type="text" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 00:01:30 or 1m30s"
                  className="w-full h-9 px-3 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-disabled)] outline-none focus:border-[var(--color-accent-red)] transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">End Time / Duration (optional)</label>
                <input 
                  type="text" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="e.g. 00:02:45 or 2m45s"
                  className="w-full h-9 px-3 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-disabled)] outline-none focus:border-[var(--color-accent-red)] transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-2">
          {!downloading ? (
            <Button variant="primary" onClick={handleDownload} disabled={!url || !validateUrl(url)} className="w-full h-12 text-[15px]">
              ⬇ Download
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-accent-red)] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-semibold text-[var(--color-accent-red)] min-w-[2.5rem] text-right">{Math.round(progress)}%</span>
              </div>
              <div className="flex gap-4 text-[13px] text-[var(--color-text-secondary)] justify-between items-center">
                <span className="font-semibold text-[var(--color-accent-red)]">
                  {task ? (
                    task.status === 'extracting_info' ? 'Extracting info...' :
                    task.status === 'converting' ? 'Converting/Merging...' :
                    task.status === 'completed' ? 'Completed' :
                    task.status === 'already_exists' ? 'File already exists' :
                    task.status === 'error' ? 'Error' : 'Downloading...'
                  ) : 'Starting...'}
                </span>
                {speed && <span>{speed}</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
                <Button variant="secondary" size="sm" onClick={() => ipcService.folderOpen()}>Open Folder</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="w-[260px] shrink-0">
        <VideoPreview
          state={previewState}
          thumbnailUrl={meta?.thumbnailUrl}
          title={meta?.title}
          caption={meta ? `${meta.viewCount ? meta.viewCount.toLocaleString() + ' views · ' : ''}${meta.channel || ''}` : ''}
          duration={meta?.duration}
        />
      </div>
    </div>
  );
}
