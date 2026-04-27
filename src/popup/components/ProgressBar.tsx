interface ProgressBarProps {
  value: number;
  color?: string;
  label?: string;
}

export function ProgressBar({ value, color = '#f89f1b', label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
