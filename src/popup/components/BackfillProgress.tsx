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
      <div className="mx-4 mt-3 px-3 py-2.5 rounded-lg bg-[#ef4743]/10 border border-[#ef4743]/30 text-xs text-[#ef4743]">
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
    <div className="mx-4 mt-3 px-3 py-2.5 rounded-lg bg-[#ffa116]/[0.08] border border-[#ffa116]/25">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116] animate-pulse shrink-0" />
        <p className="text-xs text-[#ffa116] font-medium">{label}</p>
      </div>
      {pct != null && (
        <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#ffa116] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
