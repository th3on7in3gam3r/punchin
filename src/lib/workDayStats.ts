import { format, subDays } from 'date-fns';
import { WorkDay, TimeLog, EntryStatus } from '../types';

/** Recompute work/break totals from an ordered list of logs. */
export function recalculateDay(day: WorkDay, logs: TimeLog[]): WorkDay {
  let workMins = 0;
  let breakMins = 0;
  let lastIn: number | null = null;
  let lastBreak: number | null = null;

  for (const log of logs) {
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
  }

  return {
    ...day,
    logs,
    totalWorkMinutes: Math.round(workMins),
    totalBreakMinutes: Math.round(breakMins),
  };
}

/** Consecutive days with logged work minutes (skips today if no work yet). */
export function calcStreak(workDays: WorkDay[]): number {
  let streak = 0;
  let d = new Date();
  const todayStr = format(d, 'yyyy-MM-dd');
  if (!workDays.find(w => w.date === todayStr && w.totalWorkMinutes > 0)) {
    d = subDays(d, 1);
  }
  while (true) {
    const str = format(d, 'yyyy-MM-dd');
    if (!workDays.find(w => w.date === str && w.totalWorkMinutes > 0)) break;
    streak++;
    d = subDays(d, 1);
  }
  return streak;
}

export function statusFromLastLog(type?: TimeLog['type']): EntryStatus {
  if (type === 'clock_in' || type === 'break_end') return 'clocked_in';
  if (type === 'break_start') return 'on_break';
  return 'clocked_out';
}

export function getSessionDurationMs(
  logs: TimeLog[],
  currentStatus: EntryStatus,
  currentTime: Date,
): number | null {
  if (!logs.length) return null;
  let lastInIndex = -1;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].type === 'clock_in') {
      lastInIndex = i;
      break;
    }
  }
  if (lastInIndex === -1) return null;
  const startTime = logs[lastInIndex].timestamp;
  if (currentStatus !== 'clocked_out') return currentTime.getTime() - startTime;
  const lastOut = logs.slice(lastInIndex).find(l => l.type === 'clock_out');
  return lastOut ? lastOut.timestamp - startTime : null;
}

export function dbLogToTimeLog(l: {
  id: string;
  type: TimeLog['type'];
  timestamp: number | string;
  location_id?: string | null;
}): TimeLog {
  return {
    id: l.id,
    type: l.type,
    timestamp: Number(l.timestamp),
    locationId: l.location_id ?? undefined,
  };
}

/** Merge local work days with DB-backed days (by log id; DB wins on conflict). */
export function mergeWorkDays(local: WorkDay[], fromDb: WorkDay[]): WorkDay[] {
  const byDate = new Map<string, WorkDay>();

  for (const day of local) {
    byDate.set(day.date, day);
  }

  for (const dbDay of fromDb) {
    const existing = byDate.get(dbDay.date);
    if (!existing) {
      byDate.set(dbDay.date, dbDay);
      continue;
    }
    const logMap = new Map<string, TimeLog>();
    for (const log of existing.logs) logMap.set(log.id, log);
    for (const log of dbDay.logs) logMap.set(log.id, log);
    const mergedLogs = [...logMap.values()].sort((a, b) => a.timestamp - b.timestamp);
    byDate.set(
      dbDay.date,
      recalculateDay({ ...existing, id: existing.id || dbDay.id }, mergedLogs),
    );
  }

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function workDaysFromDbLogs(
  logs: Array<{
    id: string;
    work_day_date: string;
    type: TimeLog['type'];
    timestamp: number | string;
    location_id?: string | null;
  }>,
): WorkDay[] {
  const dayGroups: Record<string, TimeLog[]> = {};
  for (const l of logs) {
    const d = l.work_day_date;
    if (!dayGroups[d]) dayGroups[d] = [];
    dayGroups[d].push(dbLogToTimeLog(l));
  }

  return Object.entries(dayGroups).map(([date, dayLogs]) => {
    const sorted = dayLogs.sort((a, b) => a.timestamp - b.timestamp);
    return recalculateDay(
      {
        id: crypto.randomUUID(),
        date,
        logs: sorted,
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
      },
      sorted,
    );
  });
}
