import { useMemo } from 'react';
import type { Task } from '@/types';
import { formatDuration } from '@/utils/formatters';

interface QueueItemProps {
  task: Task;
  onRemove: (url: string) => void;
  isSelected?: boolean;
  onSelect?: (url: string) => void;
  hideThumbnail?: boolean;
}

export function QueueItem({ task, onRemove, isSelected, onSelect, hideThumbnail }: QueueItemProps) {
  const statusView = {
    pending: { label: 'Waiting', progress: 0 },
    waiting: { label: 'Waiting', progress: 0 },
    extracting_info: { label: 'Getting info...', progress: 5 },
    downloading: { label: 'Downloading...', progress: task.progress },
    converting: { label: 'Converting...', progress: Math.max(task.progress, 95) },
    paused: { label: 'Paused', progress: task.progress },
    completed: { label: 'Completed', progress: 100 },
    already_exists: { label: 'File exists', progress: 100 },
    error: { label: task.errorMessage || 'Failed', progress: 0 },
  }[task.status] || { label: task.status, progress: task.progress };

  const borderColor =
    task.status === 'downloading' || task.status === 'converting'
      ? 'border-l-[var(--color-accent-purple)] bg-[var(--color-accent-purple-light)]'
      : task.status === 'paused'
      ? 'border-l-[#F5A623]'
      : task.status === 'completed' || task.status === 'already_exists'
      ? 'border-l-[#30B67A] bg-[var(--color-success-light)]'
      : task.status === 'error'
      ? 'border-l-[#E8002A]'
      : 'border-l-transparent';

  const gridTemplate = hideThumbnail
    ? 'grid-cols-[18px_1fr_auto_28px]'
    : 'grid-cols-[18px_64px_1fr_auto_28px]';

  const qualityDisplay = useMemo(() => {
    const q = task.quality || '';
    if (task.format === 'video') {
      return q.match(/^\d+$/) ? `${q}p` : q;
    } else {
      return q.match(/^\d+$/) ? `${q} kbps` : q;
    }
  }, [task.quality, task.format]);

  return (
    <div
      className={`relative grid ${gridTemplate} gap-y-2 gap-x-2 items-center p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] border-l-[3px] rounded-md
        min-h-[72px] transition-all ${borderColor} ${isSelected ? 'outline outline-2 outline-[rgba(107,61,234,0.22)]' : ''}`}
      onClick={() => onSelect?.(task.url)}
      data-url={task.url}
      data-status={task.status}
    >
      <span className="material-icons text-[16px] text-[var(--color-text-disabled)] cursor-grab row-span-1 col-span-1 self-center opacity-0 hover:opacity-100">drag_indicator</span>
      
      {!hideThumbnail && (
        <img src={task.thumbnailUrl} alt="" className="w-16 h-[46px] object-cover rounded-sm bg-[var(--color-surface)] row-span-1 col-span-1 self-center" />
      )}

      <div className="flex flex-col min-w-0 self-center col-span-1 overflow-hidden">
        <span className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2 leading-snug">
          {task.title || ''}
        </span>
        {task.duration > 0 && (
          <span className="text-xs text-[var(--color-text-secondary)] mt-1">
            {formatDuration(task.duration)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 items-end justify-center shrink-0 row-span-1 col-span-1">
        <span className="inline-flex items-center justify-center min-h-[18px] px-2 rounded-full bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-[10px] font-bold tracking-wide uppercase whitespace-nowrap">
          {task.format === 'video' ? 'Video' : 'Audio'}
        </span>
        <span className="inline-flex items-center justify-center min-h-[18px] px-2 rounded-full bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-[10px] font-semibold whitespace-nowrap">
          {qualityDisplay}
        </span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(task.id || task.url); }}
        className="w-7 h-7 flex items-center justify-center rounded-sm bg-transparent text-[var(--color-text-disabled)] text-xl leading-none hover:text-[#E8002A] hover:bg-[rgba(232,0,42,0.07)] transition-all row-span-1 col-span-1"
        title="Remove"
      >
        ×
      </button>

      {(task.status !== 'pending' && task.status !== 'waiting') && (
        <div className={`${hideThumbnail ? 'col-span-3 col-start-2' : 'col-span-4 col-start-2'} flex items-center gap-2 min-w-0`}>
          <div className="flex-1 min-w-[40px] h-[5px] rounded-full overflow-hidden bg-[var(--color-border-subtle)]">
            <div
              className={`h-full rounded-full transition-all duration-300
                ${task.status === 'completed' || task.status === 'already_exists' ? 'bg-[#30B67A]' : task.status === 'paused' ? 'bg-[#F5A623]' : 'bg-[var(--color-accent-purple)]'}`}
              style={{ width: `${statusView.progress}%` }}
            />
          </div>
          <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
            {statusView.label}
          </span>
          {task.speed && <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">{task.speed}</span>}
          {task.status === 'error' && (
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="h-6 px-[9px] border border-[rgba(232,0,42,0.2)] rounded-sm bg-transparent text-[#E8002A] text-xs font-semibold flex items-center"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
