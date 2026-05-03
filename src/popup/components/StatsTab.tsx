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
    <div className="bg-[#282828] border border-white/[0.08] rounded-lg px-3 py-3 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{label}</span>
      <span className="text-2xl font-bold text-[#eff1f6] leading-tight">{value}</span>
      {sub && <span className="text-[10px] text-white/35 mt-0.5">{sub}</span>}
    </div>
  );
}

export function StatsTab() {
  const { prefs, updatePref, prefsLoaded } = usePrefs();
  const [refreshKey, setRefreshKey] = useState(0);
  const { stats, loading } = useStats(prefs.selectedModuleSlug, refreshKey);

  useEffect(() => {
    if (!prefsLoaded) return;
    if (prefs.lastBackfill === null && !prefs.backfillInProgress) {
      void sendMessage({ type: 'POPUP_TRIGGER_BACKFILL' });
    }
  }, [prefsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        Loading…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <p className="text-white/40 text-sm">No data yet — sync to get started.</p>
        <button
          onClick={handleRefresh}
          className="px-5 py-2 rounded-lg bg-[#ffa116] text-[#1a1a1a] text-sm font-bold hover:bg-[#ffa116]/90 transition-colors"
        >
          Sync Now
        </button>
      </div>
    );
  }

  const planPct = stats.planProgress
    ? Math.round((stats.planProgress.solved / Math.max(1, stats.planProgress.total)) * 100)
    : 0;

  const diffRows = [
    { label: 'Easy', value: stats.easySolved, color: '#00b8a3' },
    { label: 'Medium', value: stats.mediumSolved, color: '#ffc01e' },
    { label: 'Hard', value: stats.hardSolved, color: '#ef4743' },
  ];

  return (
    <div className="p-4 flex flex-col gap-3">
      <BackfillProgress />

      <ModuleSelector currentSlug={prefs.selectedModuleSlug} onSelect={handleModuleChange} />

      {/* Plan progress card */}
      {stats.activePlan && stats.planProgress && (
        <div className="bg-[#282828] border border-white/[0.08] rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#eff1f6] truncate max-w-[200px]">
              {stats.activePlan.name}
            </span>
            <span className="text-xs font-bold text-[#ffa116] shrink-0 ml-2">
              {stats.planProgress.solved}
              <span className="text-white/30 font-normal"> / {stats.planProgress.total}</span>
            </span>
          </div>
          <ProgressBar value={planPct} />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total Submissions" value={stats.totalSubmissions} />
        <StatCard
          label="Accepted"
          value={stats.acceptedSubmissions}
          sub={`${stats.acceptanceRate}% acceptance rate`}
        />
      </div>

      {/* Difficulty breakdown */}
      <div className="bg-[#282828] border border-white/[0.08] rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
          Solved by Difficulty
        </p>
        <div className="flex gap-2 justify-around text-center">
          {diffRows.map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold" style={{ color }}>{value}</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color, backgroundColor: color + '20' }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleRefresh}
        disabled={prefs.backfillInProgress}
        className="w-full py-2 rounded-lg bg-[#282828] border border-white/[0.08] text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
      >
        {prefs.backfillInProgress ? 'Syncing…' : 'Refresh Data'}
      </button>
    </div>
  );
}
