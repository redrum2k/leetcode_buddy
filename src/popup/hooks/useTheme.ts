import { useEffect } from 'react';
import type { UserPrefs } from '@/types';
import { applyTheme } from '@/lib/theme';

export function useTheme(
  prefs: Pick<UserPrefs, 'theme' | 'highContrast' | 'fontSize'>,
): void {
  useEffect(() => {
    applyTheme(prefs);
  }, [prefs.theme, prefs.highContrast, prefs.fontSize]);

  useEffect(() => {
    if (prefs.theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(prefs);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefs.theme, prefs.highContrast, prefs.fontSize]);
}
