import type { UserPrefs, ThemePreference } from '@/types';

function resolveTheme(pref: ThemePreference): 'dark' | 'light' {
  if (pref !== 'auto') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(
  prefs: Pick<UserPrefs, 'theme' | 'highContrast' | 'fontSize'>,
): void {
  const el = document.documentElement;
  el.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
  el.classList.remove('font-small', 'font-medium', 'font-large');
  if (prefs.highContrast) {
    el.classList.add('theme-high-contrast');
  } else {
    el.classList.add(resolveTheme(prefs.theme) === 'light' ? 'theme-light' : 'theme-dark');
  }
  el.classList.add(`font-${prefs.fontSize}`);
}
