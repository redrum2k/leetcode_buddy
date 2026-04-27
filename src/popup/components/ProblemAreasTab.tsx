import { useState, useEffect } from 'react';
import { getAllSubmissions } from '@/lib/db/repos';
import { computeProblemAreas, type ProblemArea } from '@/lib/scoring/problemAreas';

function TopicRow({
  area,
  isExpanded,
  onToggle,
}: {
  area: ProblemArea;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-[#f89f1b]/15 flex items-center justify-center text-sm font-bold text-[#f89f1b] shrink-0">
            {area.painScore}
          </span>
          <div>
            <p className="text-sm font-medium text-white capitalize">
              {area.topic.replace(/-/g, ' ')}
            </p>
            <p className="text-[10px] text-white/40">
              {area.uniqueProblemsFailed} problem
              {area.uniqueProblemsFailed !== 1 ? 's' : ''} failed
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-white/30 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 text-xs text-white/40 italic">
          Similar problems coming soon
        </div>
      )}
    </div>
  );
}

export function ProblemAreasTab() {
  const [areas, setAreas] = useState<ProblemArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getAllSubmissions().then((subs) => {
      setAreas(computeProblemAreas(subs));
      setLoading(false);
    });
  }, []);

  const toggle = (topic: string) => {
    const next = expanded === topic ? null : topic;
    if (next) console.log('[LeetcodeBuddy] Topic expanded:', topic);
    setExpanded(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  if (areas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm px-6 text-center">
        No failed submissions yet — keep grinding!
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-white/30">
        Topics sorted by pain score
      </p>
      {areas.map((area) => (
        <TopicRow
          key={area.topic}
          area={area}
          isExpanded={expanded === area.topic}
          onToggle={() => toggle(area.topic)}
        />
      ))}
    </div>
  );
}
