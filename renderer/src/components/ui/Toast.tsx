import type { Toast as ToastType } from '@/types';

const typeStyles: Record<ToastType['type'], string> = {
  success: 'border-l-[#30B67A]',
  error: 'border-l-[#E8002A]',
  warning: 'border-l-[#F5A623]',
  info: 'border-l-[#6B3DEA]',
};

const icons: Record<ToastType['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function Toast({ toast, onClose }: { toast: ToastType; onClose: (id: string) => void }) {
  return (
    <div
      className={`flex items-center gap-2.5 p-3.5 rounded-md text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-elevated)] shadow-md border-l-4 animate-toast-in max-w-[340px] break-words ${typeStyles[toast.type]}`}
    >
      <span className="shrink-0">{icons[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="shrink-0 text-lg leading-none text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] opacity-50 hover:opacity-100 transition-opacity ml-auto">
        ×
      </button>
    </div>
  );
}
