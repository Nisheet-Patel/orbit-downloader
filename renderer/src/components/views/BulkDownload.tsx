import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/stores/toastStore';
import { useQueue } from '@/hooks/useQueue';
import { useDownloadStore } from '@/stores/downloadStore';
import { shallow } from 'zustand/shallow';
import { validateYoutubeUrl } from '@/utils/validators';
import { QueueItem } from '@/components/ui/QueueItem';

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

export function BulkDownload() {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<Format>('video');
  const [quality, setQuality] = useState('1080');
  const addToast = useToastStore((s) => s.addToast);
  const tasks = useDownloadStore((s) => Object.values(s.tasks), shallow);
  const { addToQueue, startQueue, removeFromQueue, clearQueue } = useQueue();

  const handleAdd = useCallback(async () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const urls = lines.filter((l) => validateYoutubeUrl(l));
    if (urls.length === 0) {
      addToast('warning', 'No valid YouTube URLs found');
      return;
    }

    const res = await addToQueue(urls, { format, quality });
    if (res.added.length > 0) {
      addToast('success', `Added ${res.added.length} item(s) to queue`);
      setText((_prev) => {
        const remaining = lines.filter((l) => !urls.includes(l));
        return remaining.join('\n');
      });
    }
    if (res.duplicates.length > 0) {
      addToast('warning', `${res.duplicates.length} duplicate(s) skipped`);
    }
    if (res.invalid.length > 0) {
      addToast('error', `${res.invalid.length} invalid URL(s) skipped`);
    }
  }, [text, format, quality, addToQueue, addToast]);

  const handleRemove = useCallback(async (url: string) => {
    try {
      await removeFromQueue(url);
    } catch {
      addToast('error', 'Failed to remove item');
    }
  }, [removeFromQueue, addToast]);

  const handleClear = useCallback(async () => {
    try {
      await clearQueue();
      addToast('info', 'Queue cleared');
    } catch {
      addToast('error', 'Failed to clear queue');
    }
  }, [clearQueue, addToast]);

  const handleStart = useCallback(async () => {
    const res = await startQueue();
    if (res.success) {
      addToast('info', 'Downloads started');
    } else {
      addToast('error', res.error || 'No pending tasks');
    }
  }, [startQueue, addToast]);

  // Ctrl+D keyboard shortcut to trigger start downloads
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (tasks.length > 0) {
          handleStart();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [tasks.length, handleStart]);

  // Listen for dropped URLs to append to textarea
  useEffect(() => {
    const handleDropped = (e: Event) => {
      const urls = (e as CustomEvent).detail?.urls;
      if (urls && urls.length > 0) {
        setText((prev) => {
          const currentLines = prev.split('\n').map(l => l.trim()).filter(Boolean);
          const newLines = [...currentLines, ...urls];
          return newLines.join('\n');
        });
        addToast('success', `Added ${urls.length} dropped URL(s) to text area`);
      }
    };
    window.addEventListener('orbit:url-dropped', handleDropped);
    return () => window.removeEventListener('orbit:url-dropped', handleDropped);
  }, [addToast]);

  const qualities = useMemo(() => (format === 'video' ? videoQualities : audioQualities), [format]);

  return (
    <div className="h-full max-w-[1000px] mx-auto bg-[var(--color-surface-elevated)] rounded-3xl shadow-lg border border-[var(--color-border-subtle)] p-8 flex flex-col gap-6 min-h-0">
      <div>
        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Bulk Download</h1>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-[450px]">Add multiple YouTube URLs to the queue and download them all at once.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch flex-1 min-h-0">
        {/* Left Column - Input Builder */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--color-text-secondary)]">Add YouTube links</label>
            <div className="h-32 bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-xl overflow-hidden flex flex-col focus-within:border-[var(--color-accent-purple)] transition-all">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste YouTube URLs here, one per line...&#10;https://www.youtube.com/watch?v=..."
                className="w-full h-full resize-none bg-transparent border-0 outline-none p-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] font-[family:inherit] leading-relaxed"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['video', 'audio'] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFormat(f);
                  setQuality(f === 'video' ? '1080' : '320');
                }}
                className={`h-9 px-4 rounded-full border-[1.5px] text-[13px] font-medium transition-all cursor-pointer
                  ${format === f
                    ? 'border-[var(--color-accent-purple)] text-[var(--color-accent-purple)] bg-[var(--color-accent-purple-light)] font-semibold'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-purple)] hover:text-[var(--color-accent-purple)]'
                  }`}
              >
                {f === 'video' ? 'Video' : 'Audio'}
              </button>
            ))}
            <div className="relative flex-1 min-w-[120px]">
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full h-9 px-3 border-[1.5px] border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] text-[13px] font-medium cursor-pointer appearance-none outline-none transition-all focus:border-[var(--color-accent-purple)] focus:shadow-[0_0_0_3px_rgba(143,41,219,0.12)] pr-7"
              >
                {qualities.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
              <span className="material-icons absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-text-secondary)] pointer-events-none">expand_more</span>
            </div>
          </div>

          <Button onClick={handleAdd} disabled={!text.trim()} className="w-full h-11 text-sm bg-[var(--color-accent-purple)] hover:bg-[var(--color-accent-purple-hover)] text-white border-0 cursor-pointer">
            + Add to Queue
          </Button>
        </div>

        {/* Right Column - Queue Viewport */}
        <div className="flex flex-col h-full border-l border-[var(--color-border)] pl-0 md:pl-8 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Queue ({tasks.length})</h2>
            <button
              onClick={handleClear}
              disabled={tasks.length === 0}
              className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent-purple)] disabled:text-[var(--color-text-disabled)] transition-colors bg-transparent border-0 cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
            {tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] rounded-xl">
                <span className="material-icons text-3xl mb-1 text-[var(--color-text-disabled)]">playlist_add</span>
                <span className="text-sm font-medium">Your queue is empty</span>
                <span className="text-xs text-[var(--color-text-disabled)]">Add videos to start.</span>
              </div>
            ) : (
              tasks.map((task) => (
                <QueueItem
                  key={task.id || task.url}
                  task={task}
                  onRemove={handleRemove}
                />
              ))
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={tasks.length === 0}
            className="w-full h-11 mt-4 text-sm font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all border-0 cursor-pointer
              bg-[var(--color-accent-purple)] hover:bg-[var(--color-accent-purple-hover)] text-white disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-disabled)]"
          >
            <span className="material-icons text-lg">download</span>
            <span>Start Queue Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
