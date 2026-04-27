import { useState, useEffect } from 'react';
import type { UserPrefs } from '@/types';

const DEFAULTS: UserPrefs = {
  selectedModuleSlug: null,
  username: null,
  lastBackfill: null,
  backfillInProgress: false,
};

export function usePrefs() {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULTS);

  useEffect(() => {
    chrome.storage.local.get(Object.keys(DEFAULTS)).then((stored) => {
      setPrefs({ ...DEFAULTS, ...(stored as Partial<UserPrefs>) });
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      setPrefs((prev) => {
        const patch: Partial<UserPrefs> = {};
        for (const [key, change] of Object.entries(changes)) {
          if (key in DEFAULTS) {
            (patch as Record<string, unknown>)[key] = change.newValue as unknown;
          }
        }
        return { ...prev, ...patch };
      });
    };

    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  const updatePref = async (patch: Partial<UserPrefs>): Promise<void> => {
    await chrome.storage.local.set(patch);
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  return { prefs, updatePref };
}
