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
}

export interface WorkDay {
  id: string;
  date: string; // ISO date string
  logs: TimeLog[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
}

export type View = 'home' | 'entries' | 'calendar' | 'report' | 'settings' | 'reminders';

export interface Reminder {
  id: string;
  label: string;
  type: 'fixed' | 'interval';
  time?: string; // HH:mm for fixed
  intervalMinutes?: number; // for interval
  days: number[]; // 0-6
  enabled: boolean;
  sound: string;
  lastTriggered?: number; // timestamp to prevent double triggers
}

export interface UserProfile {
  name: string;
  employeeId: string;
  hourlyRate?: number;
  taxRate?: number;
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
  workDaysOfWeek: number[]; // 0-6
}
