import { useState, useEffect } from 'react';
import { CharacterType, DestinationType } from '../types';

// Fields that live HERE (not in useWorkTracker)
export interface LocalSettings {
  showBreakAnimation: boolean;
  dailyGoalHours: number;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
}

const DEFAULTS: LocalSettings = {
  showBreakAnimation: true,
  dailyGoalHours: 8,
  theme: 'system',
  notificationsEnabled: true,
};

export function useSettings() {
  const [showBreakAnimation, setShowBreakAnimation] = useState<boolean>(() => {
    const s = localStorage.getItem('punchin_break_animation');
    return s === null ? true : s === 'true';
  });

  const [dailyGoalHours, setDailyGoalHours] = useState<number>(() => {
    const s = localStorage.getItem('punchin_daily_goal_hours');
    return s ? parseFloat(s) : 8;
  });

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('punchin_theme') as LocalSettings['theme']) || 'system';
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const s = localStorage.getItem('punchin_notifications_enabled');
    return s === null ? true : s === 'true';
  });

  // Persist
  useEffect(() => { localStorage.setItem('punchin_break_animation', String(showBreakAnimation)); }, [showBreakAnimation]);
  useEffect(() => { localStorage.setItem('punchin_daily_goal_hours', String(dailyGoalHours)); }, [dailyGoalHours]);
  useEffect(() => { localStorage.setItem('punchin_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('punchin_notifications_enabled', String(notificationsEnabled)); }, [notificationsEnabled]);

  return {
    showBreakAnimation, setShowBreakAnimation,
    dailyGoalHours,     setDailyGoalHours,
    theme,              setTheme,
    notificationsEnabled, setNotificationsEnabled,
  };
}

// Re-export types for convenience
export type { CharacterType, DestinationType };
