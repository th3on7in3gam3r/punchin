// useSettings is a convenience wrapper that surfaces the settings-related
// slice of useWorkTracker in a shape matching the AppSettings interface.
// It does NOT own any state — all state lives in useWorkTracker.

import { CharacterType, DestinationType, WorkLocation, UserProfile } from '../types';

export interface AppSettings {
  hourlyRate: number;
  breakDuration: 15 | 30 | 60;
  breakCharacter: CharacterType;
  breakDestination: DestinationType;
  workLocations: WorkLocation[];
  userProfile: UserProfile;
  dailyGoalHours: number;
  enableBreakAnimation: boolean;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  workDaysOfWeek: number[];
  defaultWorkStart: string;
  defaultWorkEnd: string;
  defaultReminderSound: string;
}

// Re-export so consumers can import from one place
export type { CharacterType, DestinationType };
