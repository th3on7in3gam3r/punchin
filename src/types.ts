export type EntryStatus = 'clocked_in' | 'on_break' | 'clocked_out';

export interface TimeLog {
  id: string;
  type: 'clock_in' | 'break_start' | 'break_end' | 'clock_out';
  timestamp: number;
  locationId?: string;
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  emoji?: string; // optional display emoji
}

export interface WorkDay {
  id: string;
  date: string;
  logs: TimeLog[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
}

export type View = 'home' | 'entries' | 'calendar' | 'report' | 'settings' | 'reminders';

export type Theme = 'light' | 'dark' | 'system';

export interface Reminder {
  id: string;
  label: string;
  type: 'fixed' | 'interval';
  time?: string;
  intervalMinutes?: number;
  days: number[];
  enabled: boolean;
  sound: string;
  lastTriggered?: number;
}

export interface UserProfile {
  name: string;
  employeeId: string;
  taxRate?: number;
  avatar?: string;
}

export interface DailyStatus {
  date: string;
  isWorking: boolean;
  reason?: 'sick' | 'holiday' | 'other';
  customReason?: string;
  locationId?: string;
}

export interface UserSettings {
  reminders: Reminder[];
  defaultWorkStart: string;
  defaultWorkEnd: string;
  breakDuration: 15 | 30 | 60;
  workDaysOfWeek: number[];
}

export type CharacterType = 'default' | 'business' | 'athlete' | 'casual';
export type DestinationType = 'bench' | 'coffee' | 'home' | 'beach';
