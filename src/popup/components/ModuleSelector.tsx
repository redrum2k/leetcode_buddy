import { useEffect, useState } from 'react';
import { getAllStudyPlans } from '@/lib/db/repos';

interface ModuleSelectorProps {
  currentSlug: string | null;
  onSelect: (slug: string | null) => void;
}

// Well-known LeetCode study plan slugs. These work with getStudyPlanDetail
// without needing a separate "list all plans" API call.
const KNOWN_PLANS = [
  { slug: 'leetcode-75', name: 'LeetCode 75' },
  { slug: 'top-interview-150', name: 'Top Interview 150' },
  { slug: 'programming-skills', name: 'Programming Skills' },
  { slug: 'sql-50', name: 'SQL 50' },
  { slug: 'intro-to-pandas', name: 'Introduction to Pandas' },
  { slug: '30-days-of-javascript', name: '30 Days of JavaScript' },
  { slug: 'data-structure-ii', name: 'Data Structure II' },
  { slug: 'algorithm-ii', name: 'Algorithm II' },
  { slug: 'graph-theory-i', name: 'Graph Theory I' },
  { slug: 'dynamic-programming-i', name: 'Dynamic Programming I' },
  { slug: 'binary-search-i', name: 'Binary Search I' },
  { slug: 'backtracking-i', name: 'Backtracking I' },
];

export function ModuleSelector({ currentSlug, onSelect }: ModuleSelectorProps) {
  const [dexiePlans, setDexiePlans] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    getAllStudyPlans().then((plans) => {
      setDexiePlans(new Map(plans.map((p) => [p.slug, p.name])));
    });
  }, []);

  const merged = KNOWN_PLANS.map((p) => ({
    slug: p.slug,
    name: dexiePlans.get(p.slug) ?? p.name,
  }));

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-white/50 shrink-0">Plan:</label>
      <select
        value={currentSlug ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#f89f1b]/60"
      >
        <option value="">— None —</option>
        {merged.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
