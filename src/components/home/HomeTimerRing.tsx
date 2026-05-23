import { format } from 'date-fns';
import { motion } from 'motion/react';
import { CircleDot, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getBreakTiming,
  formatBreakRemainingLabel,
} from '../../lib/breakTiming';
import type { HomeSession } from './useHomeSession';

type Props = Pick<
  HomeSession,
  | 'currentTime'
  | 'currentStatus'
  | 'today'
  | 'currentSessionLogs'
  | 'currentWorkMins'
  | 'dailyGoalHours'
  | 'breakDuration'
  | 'hourlyRate'
  | 'liveEarnings'
>;

export function HomeTimerRing({
  currentTime,
  currentStatus,
  today,
  currentSessionLogs,
  currentWorkMins,
  dailyGoalHours,
  breakDuration,
  hourlyRate,
  liveEarnings,
}: Props) {
  const R1 = 118;
  const R2 = 132;
  const C1 = 2 * Math.PI * R1;
  const C2 = 2 * Math.PI * R2;

  let progress = 0;
  let goalProgress = Math.min(1, today.totalWorkMinutes / (dailyGoalHours * 60));
  let mainDisplay = format(currentTime, 'hh:mm');
  let subDisplay = format(currentTime, 'ss');
  let label = 'Current Time';
  let breakSubtitle: string | null = null;

  if (currentStatus === 'on_break') {
    const breakStart = currentSessionLogs.find(l => l.type === 'break_start')?.timestamp ?? 0;
    const timing = getBreakTiming(breakStart, breakDuration, currentTime.getTime());
    mainDisplay = timing.remMins.toString().padStart(2, '0');
    subDisplay = timing.remSecs.toString().padStart(2, '0');
    progress = timing.remainingFraction;
    label = 'Break Remaining';
    breakSubtitle = formatBreakRemainingLabel(timing.remMins, timing.remSecs);
  } else if (currentStatus === 'clocked_in') {
    const h = Math.floor(currentWorkMins / 60);
    const m = Math.floor(currentWorkMins % 60);
    const s = Math.floor((currentWorkMins * 60) % 60);
    mainDisplay = h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : m.toString().padStart(2, '0');
    subDisplay = s.toString().padStart(2, '0');
    progress = Math.min(1, currentWorkMins / (dailyGoalHours * 60));
    label = 'Time Worked';
  }

  const offset1 = C1 - progress * C1;
  const offset2 = C2 - goalProgress * C2;
  const ringColor = currentStatus === 'on_break' ? '#f97316' : '#3b82f6';
  const glowColor =
    currentStatus === 'on_break' ? 'rgba(249,115,22,0.3)' : 'rgba(59,130,246,0.3)';

  return (
    <div
      className={cn(
        'relative w-72 h-72 flex items-center justify-center',
        currentStatus === 'on_break' && 'animate-breathe',
      )}
    >
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000"
        style={{ background: ringColor }}
      />
      <svg className="w-full h-full -rotate-90" viewBox="0 0 288 288">
        <circle cx="144" cy="144" r={R1} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="144"
          cy="144"
          r={R2}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="4"
          strokeDasharray="4 6"
        />
        <motion.circle
          cx="144"
          cy="144"
          r={R2}
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
        <motion.circle
          cx="144"
          cy="144"
          r={R1}
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
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
          {label}
        </p>
        {breakSubtitle && (
          <p className="text-sm font-bold text-orange-500 dark:text-orange-400 mt-1 tabular-nums">
            {breakSubtitle}
          </p>
        )}
        {currentStatus !== 'clocked_out' && currentStatus !== 'on_break' && (
          <div className="flex items-center gap-1 text-emerald-500 mt-1">
            <CircleDot size={8} fill="currentColor" />
            <span className="text-[8px] font-black uppercase tracking-wider">Live</span>
          </div>
        )}
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
}
