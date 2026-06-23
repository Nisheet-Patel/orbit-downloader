
interface ProgressBarProps {
  progress: number;
  color?: string;
  size?: 'sm' | 'md';
}

export function ProgressBar({ progress, color = 'bg-[var(--color-accent-purple)]', size = 'md' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-[5px]' : 'h-[6px]';
  return (
    <div className={`w-full ${height} rounded-full overflow-hidden bg-[var(--color-border-subtle)]`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
  );
}
