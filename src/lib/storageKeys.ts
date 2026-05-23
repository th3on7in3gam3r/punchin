export const STORAGE_KEYS = [
  'punchin_data',
  'punchin_reminders',
  'punchin_break_duration',
  'punchin_locations',
  'punchin_profile',
  'punchin_hourly_rate',
  'punchin_work_days_of_week',
  'punchin_default_start',
  'punchin_default_end',
  'punchin_daily_statuses',
  'punchin_default_reminder_sound',
  'punchin_break_character',
  'punchin_break_destination',
  'punchin_break_animation',
  'punchin_daily_goal_hours',
  'punchin_theme',
  'punchin_notifications_enabled',
] as const;

export function clearPunchinStorage() {
  for (const key of STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
