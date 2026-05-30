import {
  usePersistedState,
  booleanSerializer,
  numberSerializer,
} from './usePersistedState';
import type { Theme } from '../types';
import { parseStoredTheme } from '../lib/theme';

const themeSerializer = {
  read: (raw: string): Theme => parseStoredTheme(raw),
  write: (value: Theme) => value,
};

export function useSettings() {
  const [showBreakAnimation, setShowBreakAnimation] = usePersistedState(
    'punchin_break_animation',
    true,
    booleanSerializer,
  );

  const [dailyGoalHours, setDailyGoalHours] = usePersistedState(
    'punchin_daily_goal_hours',
    8,
    numberSerializer,
  );

  const [theme, setTheme] = usePersistedState<Theme>(
    'punchin_theme',
    'light',
    themeSerializer,
  );

  const [notificationsEnabled, setNotificationsEnabled] = usePersistedState(
    'punchin_notifications_enabled',
    true,
    booleanSerializer,
  );

  return {
    showBreakAnimation,
    setShowBreakAnimation,
    dailyGoalHours,
    setDailyGoalHours,
    theme,
    setTheme,
    notificationsEnabled,
    setNotificationsEnabled,
  };
}
