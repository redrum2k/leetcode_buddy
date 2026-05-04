import { useState, useEffect } from 'react';
import { usePrefs } from '../hooks/usePrefs';
import type { ThemePreference, FontSize } from '@/types';

const MODELS = [
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (recommended)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast, cheap)' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (most capable)' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { prefs, updatePref } = usePrefs();
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
        <h2 className="text-sm font-bold text-theme-text">Settings</h2>
        <button
          onClick={onClose}
          className="text-[var(--color-muted)] hover:text-theme-text transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-border)] text-lg"
        >
          ✕
        </button>
      </div>

      {/* API Key */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
          Anthropic API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-api03-…"
          className="bg-theme-surface border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-theme-text placeholder-[var(--color-muted)] focus:outline-none focus:border-theme-accent transition-colors"
        />
        <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
          Stored locally in your browser. Get a key at{' '}
          <span className="text-theme-accent">console.anthropic.com</span>.
        </p>
      </div>

      {/* Model */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-theme-surface border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Appearance */}
      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
        <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
          Appearance
        </p>

        {/* Theme */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Theme
          </label>
          <div className="flex gap-1.5">
            {(['auto', 'light', 'dark'] as ThemePreference[]).map((t) => (
              <button
                key={t}
                onClick={() => void updatePref({ theme: t })}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                  prefs.theme === t
                    ? 'bg-theme-accent-tint text-theme-accent border border-[var(--color-accent-tint)]'
                    : 'bg-theme-surface text-[var(--color-muted)] border border-[var(--color-border)] hover:text-theme-text'
                }`}
              >
                {t === 'auto' ? 'Auto' : t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-theme-text">High Contrast</p>
            <p className="text-[10px] text-[var(--color-muted)]">Pure black/white with amber accent</p>
          </div>
          <button
            onClick={() => void updatePref({ highContrast: !prefs.highContrast })}
            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
              prefs.highContrast
                ? 'bg-theme-accent'
                : 'bg-theme-surface border border-[var(--color-border)]'
            }`}
            role="switch"
            aria-checked={prefs.highContrast}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                prefs.highContrast ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Font Size */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Font Size
          </label>
          <div className="flex gap-1.5">
            {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
              <button
                key={s}
                onClick={() => void updatePref({ fontSize: s })}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                  prefs.fontSize === s
                    ? 'bg-theme-accent-tint text-theme-accent border border-[var(--color-accent-tint)]'
                    : 'bg-theme-surface text-[var(--color-muted)] border border-[var(--color-border)] hover:text-theme-text'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System prompt info */}
      <div className="bg-theme-surface border border-[var(--color-border)] rounded-lg p-3">
        <p className="text-[11px] font-semibold text-[var(--color-muted)] mb-1">Customise the system prompt</p>
        <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
          Edit{' '}
          <code className="text-theme-accent bg-[var(--color-border)] px-1 py-0.5 rounded text-[10px]">
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
            : 'bg-theme-accent text-theme-on-accent hover:bg-theme-accent'
        }`}
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
