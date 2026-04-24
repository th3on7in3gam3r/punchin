import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isToday, subDays } from 'date-fns';
import {
  Play, Pause, Square, Clock as ClockIcon, MapPin, Lock,
  Calendar, HeartPulse, PartyPopper, Activity, DollarSign,
  TrendingUp, Flame, CircleDot, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkDay, WorkLocation, EntryStatus, TimeLog, DailyStatus, UserProfile } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { cn } from '../lib/utils';
import BreakJourneyAnimationDefault from './BreakJourneyAnimation';
import { CharacterType, DestinationType } from '../types';

interface HomeViewProps {
  currentTime: Date;
  currentStatus: EntryStatus;
  handleAction: (type: TimeLog['type'], locationId?: string) => void;
  today: WorkDay;
  workDays: WorkDay[];
  formatMinutes: (mins: number) => string;
  breakDuration: number;
  setBreakDuration: (d: 15 | 30 | 60) => void;
  workLocations: WorkLocation[];
  selectedLocationId: string | undefined;
  setSelectedLocationId: (id: string | undefined) => void;
  dailyStatuses: DailyStatus[];
  userProfile: UserProfile;
  hourlyRate: number;
  dailyGoalHours?: number;
  showBreakAnimation?: boolean;
  breakCharacter?: CharacterType;
  breakDestination?: DestinationType;
}

// ── Streak helper ──────────────────────────────────────────────────────────────
function calcStreak(workDays: WorkDay[]): number {
  let streak = 0;
  let d = new Date();
  // Don't count today if no logs yet
  const todayStr = format(d, 'yyyy-MM-dd');
  const todayHasLogs = workDays.some(w => w.date === todayStr && w.logs.length > 0);
  if (!todayHasLogs) d = subDays(d, 1);
  while (true) {
    const s = format(d, 'yyyy-MM-dd');
    const found = workDays.find(w => w.date === s && w.totalWorkMinutes > 0);
    if (!found) break;
    streak++;
    d = subDays(d, 1);
  }
  return streak;
}

// ── Weekly total helper ────────────────────────────────────────────────────────
function weeklyMinutes(workDays: WorkDay[]): number {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end   = endOfWeek(new Date(),   { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).reduce((acc, d) => {
    const s = format(d, 'yyyy-MM-dd');
    const day = workDays.find(w => w.date === s);
    return acc + (day?.totalWorkMinutes ?? 0);
  }, 0);
}

export const HomeView = ({
  currentTime, currentStatus, handleAction, today, workDays,
  formatMinutes, breakDuration, setBreakDuration,
  workLocations, selectedLocationId, setSelectedLocationId,
  dailyStatuses, userProfile, hourlyRate, dailyGoalHours = 8,
  showBreakAnimation = true,
  breakCharacter = 'default',
  breakDestination = 'bench',
}: HomeViewProps) => {
  const [confirmAction, setConfirmAction] = useState<TimeLog['type'] | null>(null);

  const dateStr = format(currentTime, 'yyyy-MM-dd');
  const dailyStatus = dailyStatuses.find(s => s.date === dateStr);

  const currentSessionLogs = useMemo(() => {
    const logs = [...today.logs].sort((a, b) => b.timestamp - a.timestamp);
    const lastOutIndex = logs.findIndex(l => l.type === 'clock_out');
    return (lastOutIndex === -1 ? logs : logs.slice(0, lastOutIndex)).reverse();
  }, [today.logs]);

  const hasClockedIn  = today.logs.some(l => l.type === 'clock_in');
  const lastLog       = today.logs[today.logs.length - 1];
  const hasClockedOut = lastLog?.type === 'clock_out';
  const hasStartedBreak = currentSessionLogs.some(l => l.type === 'break_start');
  const hasEndedBreak   = currentSessionLogs.some(l => l.type === 'break_end');

  const WORK_THRESHOLD_MINS = 60;

  const currentWorkMins = useMemo(() => {
    let mins = 0;
    for (let i = 0; i < currentSessionLogs.length; i++) {
      const log = currentSessionLogs[i];
      if (log.type === 'clock_in' || log.type === 'break_end') {
        const next = currentSessionLogs[i + 1];
        const end  = next ? next.timestamp : currentTime.getTime();
        mins += (end - log.timestamp) / 60000;
      }
    }
    return mins;
  }, [currentSessionLogs, currentTime]);

  const canStartBreak = currentWorkMins >= WORK_THRESHOLD_MINS && currentStatus === 'clocked_in' && !hasStartedBreak;
  const canEndBreak   = currentStatus === 'on_break';

  // Derived stats
  const streak       = useMemo(() => calcStreak(workDays), [workDays]);
  const weekMins     = useMemo(() => weeklyMinutes(workDays), [workDays]);
  const todayEarnings = hourlyRate > 0 ? (today.totalWorkMinutes / 60) * hourlyRate : 0;
  const liveEarnings  = hourlyRate > 0 && currentStatus === 'clocked_in'
    ? (currentWorkMins / 60) * hourlyRate : todayEarnings;

  const getWelcomeMessage = () => {
    const h = currentTime.getHours();
    const name = userProfile.name ? `, ${userProfile.name.split(' ')[0]}` : '';
    if (h < 12) return `Good morning${name}`;
    if (h < 18) return `Good afternoon${name}`;
    return `Good evening${name}`;
  };

  const statusGradient = () => {
    if (currentStatus === 'on_break')   return 'from-orange-500 to-amber-500';
    if (currentStatus === 'clocked_in') return 'from-blue-600 to-indigo-600';
    return 'from-emerald-500 to-teal-500';
  };

  // ── Timer Ring ──────────────────────────────────────────────────────────────
  const renderTimerRing = () => {
    const R1 = 118; // inner progress ring
    const R2 = 132; // outer goal ring
    const C1 = 2 * Math.PI * R1;
    const C2 = 2 * Math.PI * R2;

    let progress = 0;
    let goalProgress = Math.min(1, (today.totalWorkMinutes) / (dailyGoalHours * 60));
    let mainDisplay = format(currentTime, 'hh:mm');
    let subDisplay  = format(currentTime, 'ss');
    let label = 'Current Time';

    if (currentStatus === 'on_break') {
      const breakStart = currentSessionLogs.find(l => l.type === 'break_start')?.timestamp ?? 0;
      const elapsed    = currentTime.getTime() - breakStart;
      const total      = breakDuration * 60000;
      const remaining  = Math.max(0, total - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      mainDisplay = mins.toString().padStart(2, '0');
      subDisplay  = secs.toString().padStart(2, '0');
      progress    = Math.min(1, elapsed / total);
      label       = 'Break Remaining';
    } else if (currentStatus === 'clocked_in') {
      const h = Math.floor(currentWorkMins / 60);
      const m = Math.floor(currentWorkMins % 60);
      const s = Math.floor(((currentWorkMins * 60) % 60));
      mainDisplay = h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : m.toString().padStart(2, '0');
      subDisplay  = s.toString().padStart(2, '0');
      progress    = Math.min(1, currentWorkMins / (dailyGoalHours * 60));
      label       = 'Time Worked';
    }

    const offset1 = C1 - progress * C1;
    const offset2 = C2 - goalProgress * C2;

    const ringColor = currentStatus === 'on_break' ? '#f97316' : '#3b82f6';
    const glowColor = currentStatus === 'on_break' ? 'rgba(249,115,22,0.3)' : 'rgba(59,130,246,0.3)';

    return (
      <div className={cn(
        "relative w-72 h-72 flex items-center justify-center",
        currentStatus === 'on_break' && "animate-breathe"
      )}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000"
          style={{ background: ringColor }}
        />

        <svg className="w-full h-full -rotate-90" viewBox="0 0 288 288">
          {/* Track rings */}
          <circle cx="144" cy="144" r={R1} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <circle cx="144" cy="144" r={R2} fill="none" stroke="#f1f5f9" strokeWidth="4" strokeDasharray="4 6" />

          {/* Goal ring (outer, faint) */}
          <motion.circle
            cx="144" cy="144" r={R2}
            fill="none"
            stroke={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C2}
            initial={{ strokeDashoffset: C2 }}
            animate={{ strokeDashoffset: offset2 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            opacity={0.35}
          />

          {/* Progress ring (inner) */}
          <motion.circle
            cx="144" cy="144" r={R1}
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C1}
            initial={{ strokeDashoffset: C1 }}
            animate={{ strokeDashoffset: offset1 }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.p
            key={currentStatus}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums flex items-baseline"
          >
            {mainDisplay}
            <span className="text-xl ml-1 text-slate-400 font-bold">:{subDisplay}</span>
          </motion.p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">{label}</p>
          {currentStatus !== 'clocked_out' && (
            <div className="flex items-center gap-1 text-emerald-500 mt-1">
              <CircleDot size={8} fill="currentColor" />
              <span className="text-[8px] font-black uppercase tracking-wider">Live</span>
            </div>
          )}
          {/* Live earnings badge */}
          {hourlyRate > 0 && currentStatus === 'clocked_in' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center gap-1"
            >
              <DollarSign size={10} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {liveEarnings.toFixed(2)}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  // ── Action Area ─────────────────────────────────────────────────────────────
  const renderActionArea = () => {
    if (dailyStatus && !dailyStatus.isWorking) {
      return (
        <Card className="p-12 text-center bg-slate-50 dark:bg-slate-800 border-none shadow-inner flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-3xl shadow-xl flex items-center justify-center text-slate-400">
            {dailyStatus.reason === 'holiday' ? <PartyPopper size={40} /> : <HeartPulse size={40} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">
              {dailyStatus.reason || 'OFF DUTY'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Enjoy your time off!</p>
          </div>
        </Card>
      );
    }

    if (!hasClockedIn || hasClockedOut) {
      return (
        <div className="w-full space-y-4">
          {/* Location chips */}
          {workLocations.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-center">
              {workLocations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                    selectedLocationId === loc.id
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-300"
                  )}
                >
                  <MapPin size={10} />
                  {loc.name}
                </button>
              ))}
            </div>
          )}

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button3D color="blue" onClick={() => setConfirmAction('clock_in')} className="w-full py-10">
              <div className="flex flex-col items-center gap-4">
                <Play size={44} fill="currentColor" />
                <span className="text-2xl font-black tracking-widest">START SHIFT</span>
              </div>
            </Button3D>
          </motion.div>

          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar size={14} />
              <span className="text-[10px] font-black uppercase tracking-wider">{format(currentTime, 'EEEE, MMM dd')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={14} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {workLocations.find(l => l.id === selectedLocationId)?.name || 'No Site'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (!hasStartedBreak) {
      return (
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button3D
                  color="orange"
                  disabled={!canStartBreak}
                  onClick={() => handleAction('break_start', selectedLocationId)}
                  className={cn("w-full py-10", !canStartBreak && "opacity-40 grayscale")}
                >
                  <div className="flex flex-col items-center gap-2">
                    {canStartBreak ? <Pause size={32} fill="currentColor" /> : <Lock size={32} />}
                    <span className="text-xs font-black tracking-widest">BREAK</span>
                  </div>
                </Button3D>
              </motion.div>
              <button
                onClick={() => { setBreakDuration(15); handleAction('break_start', selectedLocationId); }}
                className="w-full py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl text-[10px] font-black text-orange-600 uppercase tracking-widest hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={12} /> Quick 15m
              </button>
            </div>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button3D color="red" onClick={() => setConfirmAction('clock_out')} className="w-full py-10">
                <div className="flex flex-col items-center gap-2">
                  <Square size={32} fill="currentColor" />
                  <span className="text-xs font-black tracking-widest">FINISH</span>
                </div>
              </Button3D>
            </motion.div>
          </div>

          {!canStartBreak && (
            <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 border text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-orange-200 rotate-12">
                <ClockIcon size={48} />
              </div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Rest Period Locked</p>
              <p className="text-xs font-bold text-orange-800 dark:text-orange-300">Complete 60m of work first.</p>
              <div className="w-full h-1 bg-orange-200 dark:bg-orange-800 rounded-full mt-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (currentWorkMins / 60) * 100)}%` }}
                  className="h-full bg-orange-500"
                />
              </div>
            </Card>
          )}
        </div>
      );
    }

    if (!hasEndedBreak) {
      const breakStart = currentSessionLogs.find(l => l.type === 'break_start')?.timestamp ?? 0;
      const elapsedMins = (currentTime.getTime() - breakStart) / 60000;
      const elapsedFraction = Math.min(1, elapsedMins / breakDuration);

      // remaining time display
      const elapsed = currentTime.getTime() - breakStart;
      const totalMs = Math.max(0, breakDuration * 60000 - elapsed);
      const remMins = Math.floor(totalMs / 60000);
      const remSecs = Math.floor((totalMs % 60000) / 1000);
      const breakDone = totalMs <= 0;

      return (
        <div className="w-full space-y-4">
          {/* On Break pill */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-orange-100 border border-orange-200 rounded-full">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
              <span className="text-xs font-black text-orange-600 uppercase tracking-widest">On Break</span>
            </div>
          </div>

          {/* Journey animation or classic card */}
          {showBreakAnimation ? (
            <div className="rounded-2xl overflow-hidden shadow-md">
              <BreakJourneyAnimationDefault
                progress={elapsedFraction}
                isActive={!breakDone}
                character={breakCharacter}
                destination={breakDestination}
              />
              {/* Time remaining overlay */}
              <div className="bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-t border-orange-100">
                <div>
                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Break time remaining</p>
                  {breakDone ? (
                    <p className="text-lg font-black text-emerald-500 tracking-tight">Break complete!</p>
                  ) : (
                    <p className="text-2xl font-black text-slate-800 tabular-nums tracking-tighter">
                      {remMins.toString().padStart(2, '0')}
                      <span className="text-orange-400 mx-0.5">:</span>
                      {remSecs.toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
                {/* Mini progress bar */}
                <div className="w-24 h-2 bg-orange-100 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${elapsedFraction * 100}%` }}
                    className="h-full bg-orange-400 rounded-full"
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Card className="p-6 bg-slate-900 border-none text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 animate-pulse">
                <Pause size={80} />
              </div>
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Break Active</p>
                </div>
                {breakDone ? (
                  <p className="text-3xl font-black tracking-tighter text-emerald-400">Break complete!</p>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black tracking-tighter tabular-nums">
                      {remMins.toString().padStart(2, '0')}
                      <span className="text-blue-500 opacity-80 mx-1">:</span>
                      {remSecs.toString().padStart(2, '0')}
                    </p>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">left</p>
                  </div>
                )}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${elapsedFraction * 100}%` }}
                    className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Break duration selector */}
          <div className="flex gap-2">
            {([15, 30, 60] as const).map(d => (
              <button
                key={d}
                onClick={() => setBreakDuration(d)}
                className={cn(
                  "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                  breakDuration === d
                    ? "bg-blue-600 text-white border-blue-600 shadow-xl"
                    : "bg-white/80 border-slate-200 text-slate-500 hover:border-blue-300"
                )}
              >
                {d}m
              </button>
            ))}
          </div>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button3D color="blue" onClick={() => handleAction('break_end', selectedLocationId)} className="w-full py-10">
              <div className="flex flex-col items-center gap-2">
                <Play size={32} fill="currentColor" />
                <span className="text-xs font-black tracking-widest">RESUME WORK</span>
              </div>
            </Button3D>
          </motion.div>
        </div>
      );
    }

    return (
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button3D color="red" onClick={() => setConfirmAction('clock_out')} className="w-full py-10">
          <div className="flex flex-col items-center gap-4">
            <Square size={44} fill="currentColor" />
            <span className="text-2xl font-black tracking-widest">CLOCK OUT</span>
          </div>
        </Button3D>
      </motion.div>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-3xl -mx-1 px-1 pt-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2 px-1 flex items-start justify-between"
      >
        <div>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">Command Center</p>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter leading-tight">
            {getWelcomeMessage()}
          </h2>
        </div>
        {/* Streak badge */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-black text-orange-600 tabular-nums">{streak}d</span>
          </div>
        )}
      </motion.div>

      {/* Timer ring card */}
      <Card className="relative p-6 border-none bg-white/80 backdrop-blur-xl shadow-xl shadow-blue-100/40 flex flex-col items-center gap-8 overflow-hidden border border-white/60">
        {/* Animated bg blob */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
          className={cn(
            "absolute top-[-60%] right-[-30%] w-[160%] h-[160%] rounded-full opacity-[0.07] blur-[80px] pointer-events-none",
            currentStatus === 'on_break' ? 'bg-orange-500' : currentStatus === 'clocked_in' ? 'bg-blue-600' : 'bg-emerald-500'
          )}
        />

        {renderTimerRing()}

        <div className="w-full max-w-sm">
          {renderActionArea()}
        </div>

        {/* Session info bar */}
        {hasClockedIn && !hasClockedOut && (
          <div className="flex items-center gap-6 pt-4 border-t border-slate-100 w-full justify-center">
            <div className="flex flex-col items-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Session</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-black tabular-nums text-slate-700">{formatMinutes(currentWorkMins)}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex flex-col items-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
              <span className="text-sm font-black text-slate-700">
                {workLocations.find(l => l.id === selectedLocationId)?.name || 'Default'}
              </span>
            </div>
            {hourlyRate > 0 && (
              <>
                <div className="w-px h-8 bg-slate-100" />
                <div className="flex flex-col items-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Earned</p>
                  <span className="text-sm font-black text-emerald-600">${liveEarnings.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Today */}
        <Card className="p-4 flex flex-col gap-2 border-slate-100">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Today</p>
          <p className="text-base font-black text-slate-800 tabular-nums leading-none">
            {formatMinutes(today.totalWorkMinutes)}
          </p>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (today.totalWorkMinutes / (dailyGoalHours * 60)) * 100)}%` }}
            />
          </div>
        </Card>

        {/* This week */}
        <Card className="p-4 flex flex-col gap-2 border-slate-100">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Week</p>
          <p className="text-base font-black text-slate-800 tabular-nums leading-none">
            {formatMinutes(weekMins)}
          </p>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (weekMins / (dailyGoalHours * 60 * 5)) * 100)}%` }}
            />
          </div>
        </Card>

        {/* Projected pay or streak */}
        {hourlyRate > 0 ? (
          <Card className="p-4 flex flex-col gap-2 bg-emerald-50 border-emerald-100">
            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Pay Est.</p>
            <p className="text-base font-black text-emerald-700 tabular-nums leading-none">
              ${((weekMins / 60) * hourlyRate).toFixed(0)}
            </p>
            <p className="text-[8px] text-emerald-400 font-bold">this week</p>
          </Card>
        ) : (
          <Card className="p-4 flex flex-col gap-2 border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Streak</p>
            <div className="flex items-center gap-1">
              <Flame size={14} className={streak > 0 ? 'text-orange-500' : 'text-slate-300'} />
              <p className="text-base font-black text-slate-800 tabular-nums leading-none">{streak}d</p>
            </div>
            <p className="text-[8px] text-slate-400 font-bold">in a row</p>
          </Card>
        )}
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full space-y-8 shadow-2xl border border-slate-100"
            >
              <div className="text-center space-y-4">
                <div className={cn(
                  "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl",
                  confirmAction === 'clock_in' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {confirmAction === 'clock_in' ? <Play size={40} fill="currentColor" /> : <Square size={40} fill="currentColor" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">
                    {confirmAction === 'clock_in' ? 'Start Session?' : 'End Session?'}
                  </h3>
                  <p className="text-slate-400 text-sm font-bold">
                    {confirmAction === 'clock_in' ? 'Ready to focus and log your time?' : 'Confirm your punch out for today.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button3D
                  color={confirmAction === 'clock_in' ? 'green' : 'red'}
                  onClick={() => {
                    handleAction(confirmAction, selectedLocationId);
                    setConfirmAction(null);
                  }}
                  className="py-6"
                >
                  {confirmAction === 'clock_in' ? "YES, LET'S GO" : 'YES, FINISH DAY'}
                </Button3D>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-[0.3em] text-[10px]"
                >
                  Wait, Nevermind
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
