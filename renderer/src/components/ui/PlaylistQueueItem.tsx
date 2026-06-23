import { useState } from 'react';
import type { Task } from '@/types';
import { QueueItem } from './QueueItem';

interface PlaylistQueueItemProps {
  task: Task;
  allTasks: Task[];
  onRemove: (url: string) => void;
}

export function PlaylistQueueItem({ task, allTasks, onRemove }: PlaylistQueueItemProps) {
  const [expanded, setExpanded] = useState(false);
  const children = allTasks.filter((t) => t.playlistId === task.id);

  const completedCount = children.filter((t) => t.status === 'completed' || t.status === 'already_exists').length;
  const totalCount = children.length;

  const statusView = {
    pending: { label: 'Waiting', progress: 0, color: 'text-[var(--color-text-secondary)] bg-[var(--color-border)]' },
    waiting: { label: 'Waiting', progress: 0, color: 'text-[var(--color-text-secondary)] bg-[var(--color-border)]' },
    extracting_info: { label: 'Parsing...', progress: 10, color: 'text-[var(--color-accent-purple)] bg-[var(--color-accent-purple-light)]' },
    downloading: { label: 'Downloading', progress: task.progress, color: 'text-[var(--color-accent-purple)] bg-[var(--color-accent-purple-light)]' },
    converting: { label: 'Converting', progress: Math.max(task.progress, 95), color: 'text-[var(--color-accent-purple)] bg-[var(--color-accent-purple-light)]' },
    paused: { label: 'Paused', progress: task.progress, color: 'text-[#F5A623] bg-[rgba(245,166,35,0.1)]' },
    completed: { label: 'Completed', progress: 100, color: 'text-[#30B67A] bg-[var(--color-success-light)]' },
    already_exists: { label: 'Exists', progress: 100, color: 'text-[#30B67A] bg-[var(--color-success-light)]' },
    error: { label: 'Failed', progress: 0, color: 'text-[#E8002A] bg-[rgba(232,0,42,0.08)]' },
  }[task.status] || { label: task.status, progress: task.progress, color: 'text-[var(--color-text-secondary)] bg-[var(--color-border)]' };

  const borderLeftColor =
    task.status === 'downloading' || task.status === 'converting'
      ? 'border-l-[var(--color-accent-purple)]'
      : task.status === 'completed' || task.status === 'already_exists'
      ? 'border-l-[#30B67A]'
      : task.status === 'error'
      ? 'border-l-[#E8002A]'
      : 'border-l-[var(--color-border)]';

  return (
    <div className={`p-4 bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 ${borderLeftColor} rounded-xl flex flex-col gap-3 transition-all`}>
      {/* Playlist Header Row */}
      <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <span className="material-icons text-[22px] text-[var(--color-text-secondary)] transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
        <span className="material-icons text-[22px] text-[var(--color-accent-purple)]">
          playlist_play
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1 m-0">
            {task.title}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] m-0 mt-0.5">
            {totalCount > 0 ? `${completedCount}/${totalCount} videos downloaded` : 'Loading playlist items...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusView.color}`}>
            {statusView.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(task.id || task.url);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-sm bg-transparent text-[var(--color-text-disabled)] text-xl leading-none hover:text-[#E8002A] hover:bg-[rgba(232,0,42,0.07)] transition-all"
            title="Remove Playlist"
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress Bar (Overall) */}
      {totalCount > 0 && (task.status === 'downloading' || task.status === 'converting' || task.status === 'error' || task.status === 'completed') && (
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${task.status === 'completed' ? 'bg-[#30B67A]' : 'bg-[var(--color-accent-purple)]'}`}
              style={{ width: `${statusView.progress}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] whitespace-nowrap min-w-[32px] text-right">
            {Math.round(statusView.progress)}%
          </span>
        </div>
      )}

      {/* Expanded Child List */}
      {expanded && (
        <div className="pl-4 border-l border-dashed border-[var(--color-border)] ml-2.5 mt-1 space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {totalCount === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--color-text-disabled)] animate-pulse">
              Fetching playlist videos...
            </div>
          ) : (
            children.map((childTask) => (
              <QueueItem
                key={childTask.id || childTask.url}
                task={childTask}
                onRemove={onRemove}
                hideThumbnail={true}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
