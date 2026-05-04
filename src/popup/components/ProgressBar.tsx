interface ProgressBarProps {
  value: number;
  color?: string;
  label?: string;
}

export function ProgressBar({ value, color = '#ffa116', label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1.5">
          <span>{label}</span>
          <span className="font-semibold" style={{ color }}>{pct}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
