import { useState } from 'react';
import { StatsTab } from './components/StatsTab';
import { ProblemAreasTab } from './components/ProblemAreasTab';
import { SolvedTab } from './components/SolvedTab';

type Tab = 'stats' | 'areas' | 'solved';

const TAB_LABELS: Record<Tab, string> = {
  stats: 'Stats',
  areas: 'Areas',
  solved: 'Solved',
};

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-[#1a1a2e] text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div
          className="w-7 h-7 rounded-full bg-[#f89f1b] flex items-center justify-center text-xs font-bold shrink-0"
          aria-hidden="true"
        >
          LB
        </div>
        <span className="text-sm font-semibold tracking-wide text-[#f89f1b]">
          Leetcode Buddy
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10">
        {(['stats', 'areas', 'solved'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'flex-1 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
              activeTab === tab
                ? 'text-[#f89f1b] border-b-2 border-[#f89f1b]'
                : 'text-white/50 hover:text-white/80',
            ].join(' ')}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'areas' && <ProblemAreasTab />}
        {activeTab === 'solved' && <SolvedTab />}
      </div>
    </div>
  );
}
