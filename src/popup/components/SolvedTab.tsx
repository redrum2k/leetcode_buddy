import { useState, useEffect } from 'react';
import { getAllSubmissions } from '@/lib/db/repos';
import type { Difficulty } from '@/types';

type Filter = 'All' | Difficulty;

interface SolvedProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  solvedAt: number;
}

const DIFF_COLOR: Record<Difficulty, string> = {
  Easy: '#00b8a3',
  Medium: '#ffc01e',
  Hard: '#ff375f',
};

const PAGE_SIZE = 10;

export function SolvedTab() {
  const [allSolved, setAllSolved] = useState<SolvedProblem[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllSubmissions().then((subs) => {
      const map = new Map<string, SolvedProblem>();
      for (const sub of subs) {
        if (sub.status !== 'Accepted') continue;
        const existing = map.get(sub.problemSlug);
        if (!existing || sub.timestamp > existing.solvedAt) {
          map.set(sub.problemSlug, {
            slug: sub.problemSlug,
            title: sub.title,
            difficulty: sub.difficulty,
            solvedAt: sub.timestamp,
          });
        }
      }
      const sorted = Array.from(map.values()).sort((a, b) => b.solvedAt - a.solvedAt);
      setAllSolved(sorted);
      setLoading(false);
    });
  }, []);

  const filtered =
    filter === 'All' ? allSolved : allSolved.filter((p) => p.difficulty === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const items = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleFilter = (f: Filter) => {
    setFilter(f);
    setPage(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  if (allSolved.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm px-6 text-center">
        No solved problems yet — click Refresh Data on the Stats tab.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-4 pt-3 pb-2 shrink-0">
        {(['All', 'Easy', 'Medium', 'Hard'] as Filter[]).map((f) => {
          const active = filter === f;
          const color = f !== 'All' ? DIFF_COLOR[f as Difficulty] : null;
          return (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className="flex-1 py-1 rounded text-[11px] font-medium transition-colors"
              style={
                active
                  ? {
                      backgroundColor: color ? color + '33' : 'rgba(255,255,255,0.15)',
                      color: color ?? '#fff',
                    }
                  : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              {f === 'All' ? `All (${allSolved.length})` : f}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-white/30 text-sm">
            No {filter} problems solved yet
          </div>
        ) : (
          items.map((p, i) => (
            <div
              key={p.slug}
              className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white/25 text-[10px] w-5 text-right shrink-0 tabular-nums">
                  {safePage * PAGE_SIZE + i + 1}
                </span>
                <span className="text-sm text-white/90 truncate">{p.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span
                  className="text-[10px] font-semibold w-4 text-center"
                  style={{ color: DIFF_COLOR[p.difficulty] }}
                >
                  {p.difficulty[0]}
                </span>
                <span className="text-[10px] text-white/30 tabular-nums">
                  {new Date(p.solvedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="text-xs text-white/50 hover:text-white disabled:text-white/20 disabled:cursor-not-allowed px-2 py-1 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-[10px] text-white/30">
            {safePage + 1} / {totalPages} · {filtered.length} problems
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="text-xs text-white/50 hover:text-white disabled:text-white/20 disabled:cursor-not-allowed px-2 py-1 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
