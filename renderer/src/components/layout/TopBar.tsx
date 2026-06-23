import { useAppStore } from '@/stores/appStore';
import type { AppMode } from '@/types';
import { useWindowControls } from '@/hooks/useWindowControls';

export function TopBar() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const { minimize, maximize, close } = useWindowControls();

  const modes: { key: AppMode; label: string; icon: string }[] = [
    { key: 'single', label: 'Single Download', icon: 'file_download' },
    { key: 'bulk', label: 'Bulk Download', icon: 'playlist_play' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10 select-none">
      <div className="flex items-center gap-2.5 h-full w-full" style={({ WebkitAppRegion: 'drag' } as any)}>
        <img src="./orbit-logo.svg" alt="Orbit" className="w-[26px] h-[26px] object-contain" />
        <span className="text-base font-bold text-[var(--color-text-primary)]">Orbit</span>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex items-center h-9 bg-[var(--color-border)] rounded-full p-[3px] gap-[3px]">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex items-center gap-1.5 px-3.5 h-[30px] rounded-full text-[13px] font-medium transition-colors relative z-10 whitespace-nowrap cursor-pointer border-0
                ${mode === m.key ? (m.key === 'single' ? 'text-[#E8002A] font-semibold' : 'text-[#6B3DEA] font-semibold') : 'text-[var(--color-text-secondary)]'}`}
            >
              <span className="material-icons text-base">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-0.5">
          <button onClick={minimize} className="w-8 h-8 flex items-center justify-center border-0 bg-transparent rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-all text-[11px] cursor-pointer">
            ─
          </button>
          <button onClick={maximize} className="w-8 h-8 flex items-center justify-center border-0 bg-transparent rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-all text-[10px] cursor-pointer">
            □
          </button>
          <button onClick={close} className="w-8 h-8 flex items-center justify-center border-0 bg-transparent rounded-md text-[var(--color-text-secondary)] hover:bg-[#E8002A] hover:text-white transition-all text-sm cursor-pointer">
            ×
          </button>
        </div>
      </div>
    </header>
  );
}
