import type { Theme } from '../types';

export function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function parseStoredTheme(raw: string | null): Theme {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

/** Apply theme to <html> — must match blocking script in index.html */
export function applyTheme(theme: Theme) {
  const isDark = resolveIsDark(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#2563eb');
}

export function themeStatusLabel(theme: Theme): string {
  const isDark = resolveIsDark(theme);
  if (theme === 'system') {
    return isDark ? 'System · dark' : 'System · light';
  }
  return theme === 'dark' ? 'Dark' : 'Light';
}
