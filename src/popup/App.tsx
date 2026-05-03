import { useState, useEffect } from 'react';
import { StatsTab } from './components/StatsTab';
import { ProblemAreasTab } from './components/ProblemAreasTab';
import { SolvedTab } from './components/SolvedTab';
import { ChatBar } from './components/ChatBar';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';

type Tab = 'stats' | 'areas' | 'solved';

const TAB_LABELS: Record<Tab, string> = {
  stats: 'Stats',
  areas: 'Areas',
  solved: 'Solved',
};

const STORAGE_KEY_TAB = 'lb_lastTab';
const STORAGE_KEY_CHAT = 'lb_lastChatSessionId';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Restore last view on mount
  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY_TAB, STORAGE_KEY_CHAT]).then((result) => {
      if (result[STORAGE_KEY_TAB]) setActiveTab(result[STORAGE_KEY_TAB] as Tab);
      if (result[STORAGE_KEY_CHAT]) setChatSessionId(result[STORAGE_KEY_CHAT] as string);
      setLoaded(true);
    });
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    void chrome.storage.local.set({ [STORAGE_KEY_TAB]: tab, [STORAGE_KEY_CHAT]: null });
  };

  const handleOpenChat = (sid: string) => {
    setChatSessionId(sid);
    void chrome.storage.local.set({ [STORAGE_KEY_CHAT]: sid });
  };

  const handleCloseChat = () => {
    setChatSessionId(null);
    void chrome.storage.local.set({ [STORAGE_KEY_CHAT]: null });
  };

  // Blank screen while restoring state to avoid flash
  if (!loaded) return <div className="w-[400px] h-[600px] bg-[#1a1a1a] rounded-xl" />;

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-[#1a1a1a] text-[#eff1f6] font-sans overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[0.08] shrink-0 bg-[#1a1a1a]">
        <div
          className="w-7 h-7 rounded-full bg-[#ffa116] flex items-center justify-center text-[11px] font-bold text-[#1a1a1a] shrink-0 select-none"
          aria-hidden="true"
        >
          LB
        </div>
        <span className="text-sm font-semibold text-[#ffa116] flex-1 tracking-wide">
          Leetcode Buddy
        </span>
        {!chatSessionId && (
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors ${
              settingsOpen
                ? 'text-[#ffa116] bg-[#ffa116]/10'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
            }`}
            title="Settings"
          >
            ⚙
          </button>
        )}
      </div>

      {chatSessionId ? (
        <ChatView sessionId={chatSessionId} onClose={handleCloseChat} />
      ) : settingsOpen ? (
        <div className="flex-1 overflow-y-auto">
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </div>
      ) : (
        <>
          {/* Tab bar — LeetCode style: underline, no fill */}
          <div className="flex border-b border-white/[0.08] shrink-0 bg-[#1a1a1a]">
            {(['stats', 'areas', 'solved'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={[
                  'flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2',
                  activeTab === tab
                    ? 'text-white border-[#ffa116]'
                    : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/[0.03]',
                ].join(' ')}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'stats' && <StatsTab />}
            {activeTab === 'areas' && <ProblemAreasTab />}
            {activeTab === 'solved' && <SolvedTab />}
          </div>

          <ChatBar onOpenChat={handleOpenChat} />
        </>
      )}
    </div>
  );
}
