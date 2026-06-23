import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/types';

export function Sidebar() {
  const openSettingsModal = useAppStore((s) => s.openSettingsModal);
  const openAboutModal = useAppStore((s) => s.openAboutModal);
  const { theme, setTheme } = useTheme();

  return (
    <nav className="flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] p-3 gap-1 overflow-y-auto h-full">
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-[var(--color-border)] mb-3 select-none" style={({ WebkitAppRegion: 'drag' } as any)}>
        <img src="./orbit-logo.svg" alt="Orbit" className="w-[28px] h-[28px] object-contain" />
        <span className="text-lg font-bold text-[var(--color-text-primary)]">Orbit</span>
      </div>
      <button className="flex items-center gap-3 h-10 px-3 mx-1 rounded-md text-sm font-medium text-[var(--color-accent-red)] bg-[var(--color-accent-red-light)]">
        <span className="material-icons text-xl">home</span>
        <span>Home</span>
      </button>
      <button
        onClick={openSettingsModal}
        className="flex items-center gap-3 h-10 px-3 mx-1 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] transition-all text-left bg-transparent border-0"
      >
        <span className="material-icons text-xl">settings</span>
        <span>Settings</span>
      </button>
      <button
        onClick={openAboutModal}
        className="flex items-center gap-3 h-10 px-3 mx-1 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] transition-all text-left bg-transparent border-0"
      >
        <span className="material-icons text-xl">info</span>
        <span>About</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center justify-center gap-1 pt-3 border-t border-[var(--color-border)] mt-auto">
        {(['light', 'dark'] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border-0 cursor-pointer
              ${theme === t ? 'bg-[var(--color-border)] text-[var(--color-text-primary)]' : 'bg-transparent text-[var(--color-text-secondary)]'}`}
          >
            <span className="material-icons text-base">{t === 'light' ? 'light_mode' : 'dark_mode'}</span>
            <span className="capitalize">{t}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
