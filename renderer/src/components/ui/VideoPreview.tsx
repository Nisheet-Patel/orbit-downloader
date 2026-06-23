import { formatDuration } from '@/utils/formatters';

interface VideoPreviewProps {
  state: 'empty' | 'skeleton' | 'loaded';
  thumbnailUrl?: string;
  title?: string;
  caption?: string;
  duration?: number;
}

export function VideoPreview({ state, thumbnailUrl, title, caption, duration }: VideoPreviewProps) {
  if (state === 'empty') {
    return (
      <div className="w-full h-[190px] border-2 border-dashed border-[var(--color-border)] rounded-lg flex flex-col items-center justify-center gap-2 text-[var(--color-text-disabled)]">
        <span className="material-icons text-[32px] opacity-50">movie</span>
        <span className="text-sm font-medium">Paste a URL to see preview</span>
      </div>
    );
  }

  if (state === 'skeleton') {
    return (
      <div className="w-full h-[190px] flex flex-col gap-2 p-2">
        <div className="w-full h-[144px] rounded-md bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-border)] to-[var(--color-surface)] bg-[length:200%_100%] animate-shimmer" />
        <div className="w-[85%] h-4 rounded-sm bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-border)] to-[var(--color-surface)] bg-[length:200%_100%] animate-shimmer" />
        <div className="w-[60%] h-[13px] rounded-sm bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-border)] to-[var(--color-surface)] bg-[length:200%_100%] animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="relative w-full aspect-video rounded-md overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title || ''} className="w-full h-full object-cover block" />
        ) : (
          <div className="w-full h-full bg-[var(--color-surface)] flex items-center justify-center">
            <span className="material-icons text-4xl text-[var(--color-text-disabled)]">movie</span>
          </div>
        )}
        {duration && duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-xs font-medium px-2 py-[3px] rounded-sm">
            {formatDuration(duration)}
          </span>
        )}
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
        {title}
      </div>
      <div className="mt-1 text-[13px] text-[var(--color-text-secondary)] truncate">
        {caption}
      </div>
    </div>
  );
}
