import { useState } from 'react';
import { StatsTab } from './components/StatsTab';
import { ProblemAreasTab } from './components/ProblemAreasTab';
import { SolvedTab } from './components/SolvedTab';
import { ChatBar } from './components/ChatBar';
import { SettingsPanel } from './components/SettingsPanel';

type Tab = 'stats' | 'areas' | 'solved';

const TAB_LABELS: Record<Tab, string> = {
  stats: 'Stats',
  areas: 'Areas',
  solved: 'Solved',
};

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-[#1a1a2e] text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
        <div
          className="w-7 h-7 rounded-full bg-[#f89f1b] flex items-center justify-center text-xs font-bold shrink-0"
          aria-hidden="true"
        >
          LB
        </div>
        <span className="text-sm font-semibold tracking-wide text-[#f89f1b] flex-1">
          Leetcode Buddy
        </span>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className={`w-7 h-7 rounded flex items-center justify-center text-base transition-colors ${
            settingsOpen ? 'text-[#f89f1b] bg-[#f89f1b]/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {settingsOpen ? (
        /* Settings overlay replaces tab content */
        <div className="flex-1 overflow-y-auto">
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-white/10 shrink-0">
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

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'stats' && <StatsTab />}
            {activeTab === 'areas' && <ProblemAreasTab />}
            {activeTab === 'solved' && <SolvedTab />}
          </div>
        </>
      )}

      {/* Chat bar — always visible at bottom */}
      <ChatBar />
    </div>
  );
}
