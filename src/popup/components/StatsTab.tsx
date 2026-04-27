import { useCallback, useEffect, useState } from 'react';
import { sendMessage, addMessageListener } from '@/lib/messaging';
import { usePrefs } from '../hooks/usePrefs';
import { useStats } from '../hooks/useStats';
import { ProgressBar } from './ProgressBar';
import { BackfillProgress } from './BackfillProgress';
import { ModuleSelector } from './ModuleSelector';

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <span className="text-xl font-semibold text-white">{value}</span>
      {sub && <span className="text-[10px] text-white/40">{sub}</span>}
    </div>
  );
}

export function StatsTab() {
  const { prefs, updatePref, prefsLoaded } = usePrefs();
  const [refreshKey, setRefreshKey] = useState(0);
  const { stats, loading } = useStats(prefs.selectedModuleSlug, refreshKey);

  // Auto-trigger backfill on first open when never synced
  useEffect(() => {
    if (!prefsLoaded) return;
    if (prefs.lastBackfill === null && !prefs.backfillInProgress) {
      void sendMessage({ type: 'POPUP_TRIGGER_BACKFILL' });
    }
  }, [prefsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh stats display when backfill finishes
  useEffect(() => {
    return addMessageListener('BG_BACKFILL_PROGRESS', (msg) => {
      if (msg.phase === 'done') setRefreshKey((k) => k + 1);
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    await sendMessage({ type: 'POPUP_TRIGGER_BACKFILL' });
  }, []);

  const handleModuleChange = useCallback(
    async (slug: string | null) => {
      await updatePref({ selectedModuleSlug: slug });
      await sendMessage({ type: 'POPUP_SET_MODULE', slug });
    },
    [updatePref],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <p className="text-white/60 text-sm">No data yet.</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-[#f89f1b] text-[#1a1a2e] text-sm font-semibold hover:bg-[#f89f1b]/90 transition-colors"
        >
          Sync Now
        </button>
      </div>
    );
  }

  const planPct = stats.planProgress
    ? Math.round(
        (stats.planProgress.solved / Math.max(1, stats.planProgress.total)) * 100,
      )
    : 0;

  return (
    <div className="p-4 flex flex-col gap-4">
      <BackfillProgress />

      <ModuleSelector currentSlug={prefs.selectedModuleSlug} onSelect={handleModuleChange} />

      {stats.activePlan && stats.planProgress && (
        <div className="bg-white/5 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80 truncate max-w-[200px]">
              {stats.activePlan.name}
            </span>
            <span className="text-xs text-[#f89f1b] font-semibold shrink-0 ml-2">
              {stats.planProgress.solved}/{stats.planProgress.total}
            </span>
          </div>
          <ProgressBar value={planPct} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Submissions" value={stats.totalSubmissions} />
        <StatCard
          label="Accepted"
          value={stats.acceptedSubmissions}
          sub={`${stats.acceptanceRate}% acceptance`}
        />
      </div>

      <div className="bg-white/5 rounded-lg p-3 flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-widest text-white/40">
          Solved by Difficulty
        </span>
        <div className="flex gap-4 justify-around text-center">
          {[
            { label: 'Easy', value: stats.easySolved, color: '#00b8a3' },
            { label: 'Medium', value: stats.mediumSolved, color: '#ffc01e' },
            { label: 'Hard', value: stats.hardSolved, color: '#ff375f' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-semibold" style={{ color }}>
                {value}
              </span>
              <span className="text-[10px] text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleRefresh}
        disabled={prefs.backfillInProgress}
        className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {prefs.backfillInProgress ? 'Syncing…' : 'Refresh Data'}
      </button>
    </div>
  );
}
