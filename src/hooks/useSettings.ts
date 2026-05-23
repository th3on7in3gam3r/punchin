import {
  usePersistedState,
  booleanSerializer,
  numberSerializer,
  stringSerializer,
} from './usePersistedState';
import type { Theme } from '../types';

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
    'system',
    stringSerializer as { read: (raw: string) => Theme; write: (v: Theme) => string },
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
