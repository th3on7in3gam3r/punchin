import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { WorkDay, EntryStatus, TimeLog, Reminder, WorkLocation, UserProfile, DailyStatus } from '../types';

const SOUNDS = [
  { name: 'Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { name: 'Bell', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
  { name: 'Digital', url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
  { name: 'Success', url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3' },
];

export function useWorkTracker() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentStatus, setCurrentStatus] = useState<EntryStatus>('clocked_out');
  const [workDays, setWorkDays] = useState<WorkDay[]>(() => {
    try {
      const saved = localStorage.getItem('punchin_data');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse workDays from localStorage", e);
      return [];
    }
  });
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const saved = localStorage.getItem('punchin_reminders');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse reminders from localStorage", e);
      return [];
    }
  });
  const [activeNotification, setActiveNotification] = useState<Reminder | null>(null);

  const [breakDuration, setBreakDuration] = useState<15 | 30 | 60>(() => {
    const saved = localStorage.getItem('punchin_break_duration');
    return saved ? (parseInt(saved) as 15 | 30 | 60) : 30;
  });

  const [workLocations, setWorkLocations] = useState<WorkLocation[]>(() => {
    const saved = localStorage.getItem('punchin_locations');
    if (!saved) return [
      { id: 'hq1', name: 'HQ 1', address: '123 Main St, City' },
      { id: 'hq2', name: 'HQ 2', address: '456 Business Ave, City' }
    ];
    return JSON.parse(saved);
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('punchin_profile');
    return saved ? JSON.parse(saved) : { name: '', employeeId: '' };
  });

  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('punchin_hourly_rate');
    return saved ? parseFloat(saved) : 0;
  });

  const [workDaysOfWeek, setWorkDaysOfWeek] = useState<number[]>(() => {
    const saved = localStorage.getItem('punchin_work_days_of_week');
    return saved ? JSON.parse(saved) : [1, 2, 3, 4, 5]; // Default Mon-Fri
  });

  const [defaultWorkStart, setDefaultWorkStart] = useState<string>(() => {
    const saved = localStorage.getItem('punchin_default_start');
    return saved || '09:00';
  });

  const [defaultWorkEnd, setDefaultWorkEnd] = useState<string>(() => {
    const saved = localStorage.getItem('punchin_default_end');
    return saved || '17:00';
  });

  const [dailyStatuses, setDailyStatuses] = useState<DailyStatus[]>(() => {
    const saved = localStorage.getItem('punchin_daily_statuses');
    return saved ? JSON.parse(saved) : [];
  });

  const [defaultReminderSound, setDefaultReminderSound] = useState<string>(() => {
    const saved = localStorage.getItem('punchin_default_reminder_sound');
    return saved || SOUNDS[0].url;
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('punchin_data', JSON.stringify(workDays));
  }, [workDays]);

  useEffect(() => {
    localStorage.setItem('punchin_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('punchin_break_duration', breakDuration.toString());
  }, [breakDuration]);

  useEffect(() => {
    localStorage.setItem('punchin_locations', JSON.stringify(workLocations));
  }, [workLocations]);

  useEffect(() => {
    localStorage.setItem('punchin_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('punchin_hourly_rate', hourlyRate.toString());
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem('punchin_work_days_of_week', JSON.stringify(workDaysOfWeek));
  }, [workDaysOfWeek]);

  useEffect(() => {
    localStorage.setItem('punchin_default_start', defaultWorkStart);
  }, [defaultWorkStart]);

  useEffect(() => {
    localStorage.setItem('punchin_default_end', defaultWorkEnd);
  }, [defaultWorkEnd]);

  useEffect(() => {
    localStorage.setItem('punchin_daily_statuses', JSON.stringify(dailyStatuses));
  }, [dailyStatuses]);

  useEffect(() => {
    localStorage.setItem('punchin_default_reminder_sound', defaultReminderSound);
  }, [defaultReminderSound]);

  // Timer & Reminder Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check reminders
      const currentDay = now.getDay();
      const currentTimeStr = format(now, 'HH:mm');
      const currentTimestamp = now.getTime();

      setReminders(prev => {
        let changed = false;
        const next = prev.map(reminder => {
          if (!reminder.enabled || !reminder.days.includes(currentDay)) return reminder;

          let shouldTrigger = false;

          if (reminder.type === 'fixed') {
            if (reminder.time === currentTimeStr && (!reminder.lastTriggered || !isSameDay(reminder.lastTriggered, now))) {
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
            audio.play().catch(e => console.error("Audio play failed", e));
            return { ...reminder, lastTriggered: currentTimestamp };
          }
          return reminder;
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load today's logs from DB on mount
  useEffect(() => {
    async function loadToday() {
      try {
        const res = await fetch('/api/punch');
        if (res.ok) {
          const { logs } = await res.json();
          if (logs && logs.length > 0) {
            const dateStr = format(new Date(), 'yyyy-MM-dd');
            setWorkDays(prev => {
              const others = prev.filter(d => d.date !== dateStr);
              
              const mappedLogs = logs.map((l: any) => ({
                id: l.id,
                type: l.type,
                timestamp: Number(l.timestamp),
                locationId: l.location_id
              }));

              let workMins = 0;
              let breakMins = 0;
              let lastIn: number | null = null;
              let lastBreak: number | null = null;

              mappedLogs.forEach((log: any) => {
                if (log.type === 'clock_in') lastIn = log.timestamp;
                if (log.type === 'break_start') {
                  if (lastIn) workMins += (log.timestamp - lastIn) / 60000;
                  lastBreak = log.timestamp;
                  lastIn = null;
                }
                if (log.type === 'break_end') {
                  if (lastBreak) breakMins += (log.timestamp - lastBreak) / 60000;
                  lastIn = log.timestamp;
                  lastBreak = null;
                }
                if (log.type === 'clock_out') {
                  if (lastIn) workMins += (log.timestamp - lastIn) / 60000;
                  lastIn = null;
                }
              });

              const todayObj: WorkDay = {
                id: crypto.randomUUID(),
                date: dateStr,
                logs: mappedLogs,
                totalWorkMinutes: workMins,
                totalBreakMinutes: breakMins
              };

              const lastLog = mappedLogs[mappedLogs.length - 1];
              if (lastLog) {
                if (lastLog.type === 'clock_in') setCurrentStatus('clocked_in');
                if (lastLog.type === 'break_start') setCurrentStatus('on_break');
                if (lastLog.type === 'break_end') setCurrentStatus('clocked_in');
                if (lastLog.type === 'clock_out') setCurrentStatus('clocked_out');
              }

              return [...others, todayObj];
            });
          }
        }
      } catch (error) {
        console.error("Failed to load from DB:", error);
      }
    }
    loadToday();
  }, []);

  // Load hourlyRate from DB settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const { config } = await res.json();
          if (config?.hourlyRate !== undefined) {
            setHourlyRate(config.hourlyRate);
          }
        }
      } catch (error) {
        console.error("Failed to load settings from DB:", error);
      }
    }
    loadSettings();
  }, []);

  const handleAction = useCallback(async (type: TimeLog['type'], locationId?: string) => {
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const newLog: TimeLog = {
      id: crypto.randomUUID(),
      type,
      timestamp: now.getTime(),
      locationId
    };

    setWorkDays(prev => {
      const existingDayIndex = prev.findIndex(d => d.date === dateStr);
      let updatedDays = [...prev];

      if (existingDayIndex >= 0) {
        const day = updatedDays[existingDayIndex];
        const updatedLogs = [...day.logs, newLog];
        
        let workMins = 0;
        let breakMins = 0;
        let lastIn: number | null = null;
        let lastBreak: number | null = null;

        updatedLogs.forEach(log => {
          if (log.type === 'clock_in') lastIn = log.timestamp;
          if (log.type === 'break_start') {
            if (lastIn) workMins += (log.timestamp - lastIn) / 60000;
            lastBreak = log.timestamp;
            lastIn = null;
          }
          if (log.type === 'break_end') {
            if (lastBreak) breakMins += (log.timestamp - lastBreak) / 60000;
            lastIn = log.timestamp;
            lastBreak = null;
          }
          if (log.type === 'clock_out') {
            if (lastIn) workMins += (log.timestamp - lastIn) / 60000;
            lastIn = null;
          }
        });

        updatedDays[existingDayIndex] = {
          ...day,
          logs: updatedLogs,
          totalWorkMinutes: workMins,
          totalBreakMinutes: breakMins
        };
      } else {
        updatedDays.push({
          id: crypto.randomUUID(),
          date: dateStr,
          logs: [newLog],
          totalWorkMinutes: 0,
          totalBreakMinutes: 0
        });
      }
      return updatedDays;
    });

    if (type === 'clock_in') setCurrentStatus('clocked_in');
    if (type === 'break_start') setCurrentStatus('on_break');
    if (type === 'break_end') setCurrentStatus('clocked_in');
    if (type === 'clock_out') setCurrentStatus('clocked_out');

    try {
      await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: type, locationId })
      });
    } catch (error) {
      console.error("Database sync failed:", error);
    }
  }, []);

  const today = useMemo(() => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    return workDays.find(d => d.date === dateStr) || {
      id: 'today',
      date: dateStr,
      logs: [],
      totalWorkMinutes: 0,
      totalBreakMinutes: 0
    };
  }, [workDays]);

  const formatMinutes = useCallback((mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }, []);

  const clearAllData = useCallback(() => {
    setWorkDays([]);
    setCurrentStatus('clocked_out');
    localStorage.removeItem('punchin_data');
  }, []);

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
    clearAllData
  };
}
