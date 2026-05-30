import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { calcStreak } from '../../lib/workDayStats';
import { usePunchIn } from '../../contexts/PunchInContext';
import type { TimeLog } from '../../types';

function weeklyMinutes(workDays: ReturnType<typeof usePunchIn>['workDays']) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(new Date(), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).reduce((acc, d) => {
    const s = format(d, 'yyyy-MM-dd');
    const day = workDays.find(w => w.date === s);
    return acc + (day?.totalWorkMinutes ?? 0);
  }, 0);
}

export function useHomeSession(selectedLocationId: string | undefined) {
  const {
    currentTime,
    currentStatus,
    handleAction,
    today,
    workDays,
    formatMinutes,
    breakDuration,
    setBreakDuration,
    workLocations,
    dailyStatuses,
    userProfile,
    hourlyRate,
    dailyGoalHours,
    showBreakAnimation,
    breakCharacter,
    breakDestination,
  } = usePunchIn();

  const dateStr = format(currentTime, 'yyyy-MM-dd');
  const dailyStatus = dailyStatuses.find(s => s.date === dateStr);

  const currentSessionLogs = useMemo(() => {
    const logs = [...today.logs].sort((a, b) => b.timestamp - a.timestamp);
    const lastOutIndex = logs.findIndex(l => l.type === 'clock_out');
    return (lastOutIndex === -1 ? logs : logs.slice(0, lastOutIndex)).reverse();
  }, [today.logs]);

  const hasClockedIn = today.logs.some(l => l.type === 'clock_in');
  const lastLog = today.logs[today.logs.length - 1];
  const hasClockedOut = lastLog?.type === 'clock_out';
  const hasStartedBreak = currentSessionLogs.some(l => l.type === 'break_start');
  const hasEndedBreak = currentSessionLogs.some(l => l.type === 'break_end');

  const currentWorkMins = useMemo(() => {
    let mins = 0;
    for (let i = 0; i < currentSessionLogs.length; i++) {
      const log = currentSessionLogs[i];
      if (log.type === 'clock_in' || log.type === 'break_end') {
        const next = currentSessionLogs[i + 1];
        const end = next ? next.timestamp : currentTime.getTime();
        mins += (end - log.timestamp) / 60000;
      }
    }
    return mins;
  }, [currentSessionLogs, currentTime]);

  const canStartBreak =
    currentWorkMins >= 60 && currentStatus === 'clocked_in' && !hasStartedBreak;
  const canEndBreak = currentStatus === 'on_break';

  const streak = useMemo(() => calcStreak(workDays), [workDays]);
  const weekMins = useMemo(() => weeklyMinutes(workDays), [workDays]);
  const todayEarnings = hourlyRate > 0 ? (today.totalWorkMinutes / 60) * hourlyRate : 0;
  const liveEarnings =
    hourlyRate > 0 && currentStatus === 'clocked_in'
      ? (currentWorkMins / 60) * hourlyRate
      : todayEarnings;

  const onAction = (type: TimeLog['type']) =>
    handleAction(type, selectedLocationId);

  const welcomeMessage = (() => {
    const h = currentTime.getHours();
    const name = userProfile.name ? `, ${userProfile.name.split(' ')[0]}` : '';
    if (h < 12) return `Good morning${name}`;
    if (h < 18) return `Good afternoon${name}`;
    return `Good evening${name}`;
  })();

  return {
    currentTime,
    currentStatus,
    today,
    workDays,
    formatMinutes,
    breakDuration,
    setBreakDuration,
    workLocations,
    selectedLocationId,
    dailyStatus,
    currentSessionLogs,
    hasClockedIn,
    hasClockedOut,
    hasStartedBreak,
    hasEndedBreak,
    currentWorkMins,
    canStartBreak,
    canEndBreak,
    streak,
    weekMins,
    todayEarnings,
    liveEarnings,
    hourlyRate,
    dailyGoalHours,
    showBreakAnimation,
    breakCharacter,
    breakDestination,
    onAction,
    welcomeMessage,
  };
}

export type HomeSession = ReturnType<typeof useHomeSession>;
