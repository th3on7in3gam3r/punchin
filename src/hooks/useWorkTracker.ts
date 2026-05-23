import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import {
  WorkDay,
  EntryStatus,
  TimeLog,
  Reminder,
  WorkLocation,
  UserProfile,
  DailyStatus,
  CharacterType,
  DestinationType,
} from '../types';
import { SOUNDS } from '../constants';
import {
  recalculateDay,
  mergeWorkDays,
  workDaysFromDbLogs,
  statusFromLastLog,
} from '../lib/workDayStats';
import { syncPunchToServer } from '../lib/punchApi';
import { clearPunchinStorage } from '../lib/storageKeys';
import {
  usePersistedState,
  booleanSerializer,
  numberSerializer,
  stringSerializer,
} from './usePersistedState';

const breakDurationSerializer = {
  read: (raw: string) => parseInt(raw, 10) as 15 | 30 | 60,
  write: (v: 15 | 30 | 60) => String(v),
};

const workDaysSerializer = {
  read: (raw: string): WorkDay[] => {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  },
  write: (v: WorkDay[]) => JSON.stringify(v),
};

const remindersSerializer = {
  read: (raw: string): Reminder[] => {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  },
  write: (v: Reminder[]) => JSON.stringify(v),
};

const defaultLocations: WorkLocation[] = [
  { id: 'hq1', name: 'HQ 1', address: '123 Main St, City' },
  { id: 'hq2', name: 'HQ 2', address: '456 Business Ave, City' },
];

type UseWorkTrackerOptions = {
  notificationsEnabled?: boolean;
};

export function useWorkTracker(options: UseWorkTrackerOptions = {}) {
  const { notificationsEnabled = true } = options;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentStatus, setCurrentStatus] = useState<EntryStatus>('clocked_out');
  const [activeNotification, setActiveNotification] = useState<Reminder | null>(null);

  const [workDays, setWorkDays] = usePersistedState<WorkDay[]>(
    'punchin_data',
    [],
    workDaysSerializer,
  );
  const [reminders, setReminders] = usePersistedState<Reminder[]>(
    'punchin_reminders',
    [],
    remindersSerializer,
  );
  const [breakDuration, setBreakDuration] = usePersistedState<15 | 30 | 60>(
    'punchin_break_duration',
    30,
    breakDurationSerializer,
  );
  const [workLocations, setWorkLocations] = usePersistedState<WorkLocation[]>(
    'punchin_locations',
    defaultLocations,
  );
  const [userProfile, setUserProfile] = usePersistedState<UserProfile>(
    'punchin_profile',
    { name: '', employeeId: '' },
  );
  const [hourlyRate, setHourlyRate] = usePersistedState(
    'punchin_hourly_rate',
    0,
    numberSerializer,
  );
  const [workDaysOfWeek, setWorkDaysOfWeek] = usePersistedState<number[]>(
    'punchin_work_days_of_week',
    [1, 2, 3, 4, 5],
  );
  const [defaultWorkStart, setDefaultWorkStart] = usePersistedState(
    'punchin_default_start',
    '09:00',
    stringSerializer,
  );
  const [defaultWorkEnd, setDefaultWorkEnd] = usePersistedState(
    'punchin_default_end',
    '17:00',
    stringSerializer,
  );
  const [dailyStatuses, setDailyStatuses] = usePersistedState<DailyStatus[]>(
    'punchin_daily_statuses',
    [],
  );
  const [defaultReminderSound, setDefaultReminderSound] = usePersistedState(
    'punchin_default_reminder_sound',
    SOUNDS[0].url,
    stringSerializer,
  );
  const [breakCharacter, setBreakCharacter] = usePersistedState<CharacterType>(
    'punchin_break_character',
    'default',
    stringSerializer as { read: (raw: string) => CharacterType; write: (v: CharacterType) => string },
  );
  const [breakDestination, setBreakDestination] = usePersistedState<DestinationType>(
    'punchin_break_destination',
    'bench',
    stringSerializer as {
      read: (raw: string) => DestinationType;
      write: (v: DestinationType) => string;
    },
  );

  // Timer & reminder checks
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (!notificationsEnabled) return;

      const currentDay = now.getDay();
      const currentTimeStr = format(now, 'HH:mm');
      const currentTimestamp = now.getTime();

      setReminders(prev => {
        let changed = false;
        const next = prev.map(reminder => {
          if (!reminder.enabled || !reminder.days.includes(currentDay)) return reminder;

          let shouldTrigger = false;

          if (reminder.type === 'fixed') {
            if (
              reminder.time === currentTimeStr &&
              (!reminder.lastTriggered || !isSameDay(reminder.lastTriggered, now))
            ) {
              shouldTrigger = true;
            }
          } else if (reminder.type === 'interval' && reminder.intervalMinutes) {
            const lastTriggered = reminder.lastTriggered || 0;
            if (currentTimestamp - lastTriggered >= reminder.intervalMinutes * 60 * 1000) {
              shouldTrigger = true;
            }
          }

          if (shouldTrigger) {
            setActiveNotification(reminder);
            changed = true;
            const audio = new Audio(reminder.sound);
            audio.play().catch(e => console.error('Audio play failed', e));
            return { ...reminder, lastTriggered: currentTimestamp };
          }
          return reminder;
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [notificationsEnabled, setReminders]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/punch');
        if (res.ok) {
          const { logs } = await res.json();
          if (logs?.length > 0) {
            setWorkDays(prev => {
              const fromDb = workDaysFromDbLogs(logs);
              const merged = mergeWorkDays(prev, fromDb);
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              const todayDay = merged.find(w => w.date === todayStr);
              const lastLog = todayDay?.logs[todayDay.logs.length - 1];
              if (lastLog) setCurrentStatus(statusFromLastLog(lastLog.type));
              return merged;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load history from DB:', error);
      }
    }
    loadHistory();
  }, [setWorkDays]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const { config } = await res.json();
          if (!config) return;
          if (config.hourlyRate !== undefined) setHourlyRate(config.hourlyRate);
          if (config.workLocations?.length) setWorkLocations(config.workLocations);
          if (config.userProfile) setUserProfile(config.userProfile);
          if (config.workDaysOfWeek?.length) setWorkDaysOfWeek(config.workDaysOfWeek);
          if (config.defaultWorkStart) setDefaultWorkStart(config.defaultWorkStart);
          if (config.defaultWorkEnd) setDefaultWorkEnd(config.defaultWorkEnd);
          if (config.breakDuration) setBreakDuration(config.breakDuration);
          if (config.defaultReminderSound) setDefaultReminderSound(config.defaultReminderSound);
        }
      } catch (error) {
        console.error('Failed to load settings from DB:', error);
      }
    }
    loadSettings();
  }, [
    setHourlyRate,
    setWorkLocations,
    setUserProfile,
    setWorkDaysOfWeek,
    setDefaultWorkStart,
    setDefaultWorkEnd,
    setBreakDuration,
    setDefaultReminderSound,
  ]);

  const handleAction = useCallback(async (type: TimeLog['type'], locationId?: string) => {
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const newLog: TimeLog = {
      id: crypto.randomUUID(),
      type,
      timestamp: now.getTime(),
      locationId,
    };

    setWorkDays(prev => {
      const existingDayIndex = prev.findIndex(d => d.date === dateStr);
      const updatedDays = [...prev];

      if (existingDayIndex >= 0) {
        const day = updatedDays[existingDayIndex];
        updatedDays[existingDayIndex] = recalculateDay(day, [...day.logs, newLog]);
      } else {
        updatedDays.push(
          recalculateDay(
            {
              id: crypto.randomUUID(),
              date: dateStr,
              logs: [],
              totalWorkMinutes: 0,
              totalBreakMinutes: 0,
            },
            [newLog],
          ),
        );
      }
      return updatedDays;
    });

    setCurrentStatus(statusFromLastLog(type));

    try {
      await syncPunchToServer(newLog, dateStr);
    } catch (error) {
      console.error('Database sync failed:', error);
    }
  }, [setWorkDays]);

  const today = useMemo(() => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    return (
      workDays.find(d => d.date === dateStr) ?? {
        id: 'today',
        date: dateStr,
        logs: [],
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
      }
    );
  }, [workDays]);

  const formatMinutes = useCallback((mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, []);

  const clearAllData = useCallback(async () => {
    setWorkDays([]);
    setReminders([]);
    setCurrentStatus('clocked_out');
    setActiveNotification(null);
    clearPunchinStorage();

    try {
      await fetch('/api/data', { method: 'DELETE' });
    } catch (error) {
      console.error('Server data clear failed:', error);
    }
  }, [setWorkDays, setReminders]);

  return {
    currentTime,
    currentStatus,
    workDays,
    reminders,
    activeNotification,
    today,
    handleAction,
    formatMinutes,
    setReminders,
    setActiveNotification,
    setWorkDays,
    setCurrentStatus,
    breakDuration,
    setBreakDuration,
    workLocations,
    setWorkLocations,
    userProfile,
    setUserProfile,
    hourlyRate,
    setHourlyRate,
    workDaysOfWeek,
    setWorkDaysOfWeek,
    defaultWorkStart,
    setDefaultWorkStart,
    defaultWorkEnd,
    setDefaultWorkEnd,
    dailyStatuses,
    setDailyStatuses,
    defaultReminderSound,
    setDefaultReminderSound,
    breakCharacter,
    setBreakCharacter,
    breakDestination,
    setBreakDestination,
    clearAllData,
  };
}
