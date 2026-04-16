import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeNotification, setActiveNotification] = useState<Reminder | null>(null);

  const [breakDuration, setBreakDuration] = useState<15 | 30 | 60>(30);

  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([
    { id: 'hq1', name: 'HQ 1', address: '123 Main St, City' },
    { id: 'hq2', name: 'HQ 2', address: '456 Business Ave, City' }
  ]);

  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', employeeId: '' });

  const [hourlyRate, setHourlyRate] = useState<number>(0);

  const [workDaysOfWeek, setWorkDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri

  const [defaultWorkStart, setDefaultWorkStart] = useState<string>('09:00');

  const [defaultWorkEnd, setDefaultWorkEnd] = useState<string>('17:00');

  const [dailyStatuses, setDailyStatuses] = useState<DailyStatus[]>([]);

  const [defaultReminderSound, setDefaultReminderSound] = useState<string>(SOUNDS[0].url);

  // Guard: don't save settings until they've been loaded from DB first
  const settingsLoaded = useRef(false);

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

  // Load all logs from DB on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/punch');
        if (!res.ok) {
          const text = await res.text();
          console.error('Failed to load history from DB:', res.status, text);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          console.error('Unexpected /api/punch response type:', contentType, text);
          return;
        }

        const { logs } = await res.json();
        if (logs && logs.length > 0) {
          setWorkDays(prev => {
            // Group logs by date
            const dayGroups: Record<string, any[]> = {};
            logs.forEach((l: any) => {
              const d = l.work_day_date;
              if (!dayGroups[d]) dayGroups[d] = [];
              dayGroups[d].push({
                id: l.id,
                type: l.type,
                timestamp: Number(l.timestamp),
                locationId: l.location_id
              });
            });

            const updatedDays: WorkDay[] = Object.entries(dayGroups).map(([date, dayLogs]) => {
              let workMins = 0;
              let breakMins = 0;
              let lastIn: number | null = null;
              let lastBreak: number | null = null;

              dayLogs.forEach((log: any) => {
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

              return {
                id: crypto.randomUUID(),
                date,
                logs: dayLogs,
                totalWorkMinutes: workMins,
                totalBreakMinutes: breakMins
              };
            });

            // Also check current status based on today's last log
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const todayLogs = dayGroups[todayStr] || [];
            const lastLog = todayLogs[todayLogs.length - 1];
            if (lastLog) {
              if (lastLog.type === 'clock_in') setCurrentStatus('clocked_in');
              if (lastLog.type === 'break_start') setCurrentStatus('on_break');
              if (lastLog.type === 'break_end') setCurrentStatus('clocked_in');
              if (lastLog.type === 'clock_out') setCurrentStatus('clocked_out');
            }

            return updatedDays.sort((a, b) => b.date.localeCompare(a.date));
          });
        }
      } catch (error) {
        console.error("Failed to load history from DB:", error);
      }
    }

    loadHistory();
  }, []);

  // Load all settings from DB on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) {
          const text = await res.text();
          console.error('Failed to load settings from DB:', res.status, text);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          console.error('Unexpected /api/settings response type:', contentType, text);
          return;
        }

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
        if (config.reminders?.length) setReminders(config.reminders);
      } catch (error) {
        console.error("Failed to load settings from DB:", error);
      } finally {
        settingsLoaded.current = true;
      }
    }
    loadSettings();
  }, []);

  // Save settings to DB when they change
  const saveSettings = useCallback(async () => {
    if (!settingsLoaded.current) return; // Don't overwrite DB before loading
    const config = {
      hourlyRate,
      workLocations,
      userProfile,
      workDaysOfWeek,
      defaultWorkStart,
      defaultWorkEnd,
      breakDuration,
      defaultReminderSound,
      reminders
    };
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [hourlyRate, workLocations, userProfile, workDaysOfWeek, defaultWorkStart, defaultWorkEnd, breakDuration, defaultReminderSound, reminders]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

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
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, []);

  const clearAllData = useCallback(() => {
    setWorkDays([]);
    setCurrentStatus('clocked_out');
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
