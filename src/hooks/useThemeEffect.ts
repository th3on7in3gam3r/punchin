import { useEffect } from 'react';
import type { Theme } from '../types';
import { applyTheme } from '../lib/theme';

export function useThemeEffect(theme: Theme) {
  useEffect(() => {
    applyTheme(theme);

    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);
}
