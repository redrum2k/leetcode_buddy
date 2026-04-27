import { useEffect, useState } from 'react';
import { addMessageListener, type BgBackfillProgressMsg } from '@/lib/messaging';

export function BackfillProgress() {
  const [progress, setProgress] = useState<BgBackfillProgressMsg | null>(null);

  useEffect(() => {
    const remove = addMessageListener('BG_BACKFILL_PROGRESS', (msg) => {
      setProgress(msg);
      if (msg.phase === 'done' || msg.phase === 'error') {
        setTimeout(() => setProgress(null), 2500);
      }
    });
    return remove;
  }, []);

  if (!progress || progress.phase === 'done') return null;

  if (progress.phase === 'error') {
    return (
      <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-900/40 border border-red-700/50 text-xs text-red-300">
        Sync failed: {progress.error ?? 'Unknown error'}
      </div>
    );
  }

  const label =
    progress.phase === 'submissions'
      ? `Fetching submissions… (${progress.fetched} so far)`
      : `Fetching problem data… (${progress.fetched}/${progress.total ?? '?'})`;

  const pct =
    progress.total != null && progress.total > 0
      ? Math.round((progress.fetched / progress.total) * 100)
      : null;

  return (
    <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-[#f89f1b]/10 border border-[#f89f1b]/30">
      <p className="text-xs text-[#f89f1b] mb-1.5">{label}</p>
      {pct != null && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#f89f1b] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
