import { useDownloadStore } from '@/stores/downloadStore';
import { useWindowControls } from '@/hooks/useWindowControls';
import { useAppStore } from '@/stores/appStore';
import { shallow } from 'zustand/shallow';

export function StatusBar() {
  const tasks = useDownloadStore((s) => Object.values(s.tasks), shallow);
  const appVersion = useAppStore((s) => s.appVersion);
  const { openFolder } = useWindowControls();

  const active = tasks.filter((t) => t.status === 'downloading' || t.status === 'converting').length;
  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'already_exists').length;

  return (
    <footer className="flex items-center justify-between h-9 px-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] z-10">
      <div className="flex items-center gap-2">
        <span>–</span>
        <span className="w-px h-4 bg-[var(--color-border)]" />
        <span>{active} active</span>
        <span className="w-px h-4 bg-[var(--color-border)]" />
        <span>{completed} completed</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={openFolder}
          className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent text-[var(--color-text-secondary)] text-xs"
        >
          <span className="material-icons text-base">folder</span>
          <span>Downloads</span>
        </button>
        <span className="w-px h-4 bg-[var(--color-border)]" />
        <span>v{appVersion}</span>
        <span className="w-px h-4 bg-[var(--color-border)]" />
        <span className="flex items-center gap-1">
          <span className="material-icons text-[8px] text-[#10B981] align-middle">circle</span>
          <span>Online</span>
        </span>
      </div>
    </footer>
  );
}
