import { useEffect } from 'react';
import type { Theme } from '../types';

export function useThemeEffect(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const prefersDark = media.matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      root.classList.toggle('dark', isDark);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
