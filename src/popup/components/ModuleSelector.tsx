import { useEffect, useState } from 'react';
import { getAllStudyPlans } from '@/lib/db/repos';
import type { StudyPlan } from '@/types';

interface ModuleSelectorProps {
  currentSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export function ModuleSelector({ currentSlug, onSelect }: ModuleSelectorProps) {
  const [plans, setPlans] = useState<StudyPlan[]>([]);

  useEffect(() => {
    getAllStudyPlans().then(setPlans);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-white/50 shrink-0">Plan:</label>
      <select
        value={currentSlug ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#f89f1b]/60"
      >
        <option value="">— None —</option>
        {plans.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name || p.slug}
          </option>
        ))}
      </select>
    </div>
  );
}
