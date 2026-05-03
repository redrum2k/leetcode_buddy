import { useState, useEffect } from 'react';

const MODELS = [
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (recommended)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast, cheap)' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (most capable)' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-5');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local
      .get(['anthropicApiKey', 'selectedModel'])
      .then((result) => {
        if (result.anthropicApiKey) setApiKey(result.anthropicApiKey as string);
        if (result.selectedModel) setModel(result.selectedModel as string);
      });
  }, []);

  const handleSave = async () => {
    await chrome.storage.local.set({ anthropicApiKey: apiKey, selectedModel: model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#eff1f6]">Settings</h2>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/80 transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-lg"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
          Anthropic API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-api03-…"
          className="bg-[#282828] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#eff1f6] placeholder-white/20 focus:outline-none focus:border-[#ffa116]/50 transition-colors"
        />
        <p className="text-[10px] text-white/25 leading-relaxed">
          Stored locally in your browser. Get a key at{' '}
          <span className="text-[#ffa116]/70">console.anthropic.com</span>.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-[#282828] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#eff1f6] focus:outline-none focus:border-[#ffa116]/50 transition-colors"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#282828] border border-white/[0.08] rounded-lg p-3">
        <p className="text-[11px] font-semibold text-white/60 mb-1">Customise the system prompt</p>
        <p className="text-[10px] text-white/35 leading-relaxed">
          Edit{' '}
          <code className="text-[#ffa116]/80 bg-white/[0.06] px-1 py-0.5 rounded text-[10px]">
            src/lib/ai/systemPrompt.ts
          </code>{' '}
          in the extension source to change how Buddy responds. Rebuild after editing.
        </p>
      </div>

      <button
        onClick={() => void handleSave()}
        className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
          saved
            ? 'bg-[#00b8a3] text-white'
            : 'bg-[#ffa116] text-[#1a1a1a] hover:bg-[#ffa116]/90'
        }`}
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
