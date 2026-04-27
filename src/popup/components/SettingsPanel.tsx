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
    // API key stored in chrome.storage.local — acceptable for a personal extension.
    // For a production/shared extension, route API calls through a backend proxy
    // that holds the key server-side instead of storing it on the client.
    await chrome.storage.local.set({ anthropicApiKey: apiKey, selectedModel: model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Settings</h2>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/5"
        >
          ✕
        </button>
      </div>

      {/* API key */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-white/50 font-medium">Anthropic API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-api03-…"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#f89f1b]/50"
        />
        <p className="text-[10px] text-white/25 leading-relaxed">
          Stored locally in your browser — never sent anywhere except Anthropic's API.
          Get a key at console.anthropic.com.
        </p>
      </div>

      {/* Model */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-white/50 font-medium">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f89f1b]/50"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id} className="bg-[#1a1a2e]">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* System prompt note */}
      <div className="bg-white/5 rounded-lg p-3 text-[10px] text-white/40 leading-relaxed">
        <p className="font-medium text-white/60 mb-1">Customise the system prompt</p>
        <p>
          Edit <code className="text-[#f89f1b]/80">src/lib/ai/systemPrompt.ts</code> in the
          extension source to change how Buddy responds. Rebuild after editing.
        </p>
      </div>

      <button
        onClick={() => void handleSave()}
        className="w-full py-2 rounded-lg bg-[#f89f1b] text-[#1a1a2e] text-xs font-semibold hover:bg-[#f89f1b]/90 transition-colors"
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
