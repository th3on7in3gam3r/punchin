import { format } from 'date-fns';
import { Play, Pause, Square, Clock as ClockIcon, MapPin, Lock, Calendar, HeartPulse, PartyPopper, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import BreakJourneyAnimation from '../BreakJourneyAnimation';
import { Card } from '../common/Card';
import { Button3D } from '../common/Button3D';
import { cn } from '../../lib/utils';
import type { HomeSession } from './useHomeSession';

type Props = HomeSession & {
  setSelectedLocationId: (id: string | undefined) => void;
  onConfirm: (action: 'clock_in' | 'clock_out') => void;
};

export function HomeActionArea({
  currentTime,
  currentStatus,
  dailyStatus,
  hasClockedIn,
  hasClockedOut,
  hasStartedBreak,
  hasEndedBreak,
  currentSessionLogs,
  currentWorkMins,
  canStartBreak,
  workLocations,
  selectedLocationId,
  setSelectedLocationId,
  breakDuration,
  setBreakDuration,
  showBreakAnimation,
  breakCharacter,
  breakDestination,
  onAction,
  onConfirm,
}: Props) {
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
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Enjoy your time off!
          </p>
        </div>
      </Card>
    );
  }

  if (!hasClockedIn || hasClockedOut) {
    return (
      <div className="w-full space-y-4">
        {workLocations.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {workLocations.map(loc => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocationId(loc.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 transition-all',
                  selectedLocationId === loc.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-300',
                )}
              >
                <MapPin size={10} />
                {loc.name}
              </button>
            ))}
          </div>
        )}
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button3D color="blue" onClick={() => onConfirm('clock_in')} className="w-full py-10">
            <div className="flex flex-col items-center gap-4">
              <Play size={44} fill="currentColor" />
              <span className="text-2xl font-black tracking-widest">START SHIFT</span>
            </div>
          </Button3D>
        </motion.div>
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {format(currentTime, 'EEEE, MMM dd')}
            </span>
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
                onClick={() => onAction('break_start')}
                className={cn('w-full py-10', !canStartBreak && 'opacity-40 grayscale')}
              >
                <div className="flex flex-col items-center gap-2">
                  {canStartBreak ? <Pause size={32} fill="currentColor" /> : <Lock size={32} />}
                  <span className="text-xs font-black tracking-widest">BREAK</span>
                </div>
              </Button3D>
            </motion.div>
            <button
              onClick={() => {
                setBreakDuration(15);
                onAction('break_start');
              }}
              className="w-full py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl text-[10px] font-black text-orange-600 uppercase tracking-widest hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={12} /> Quick 15m
            </button>
          </div>
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button3D color="red" onClick={() => onConfirm('clock_out')} className="w-full py-10">
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
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">
              Rest Period Locked
            </p>
            <p className="text-xs font-bold text-orange-800 dark:text-orange-300">
              Complete 60m of work first.
            </p>
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
    const elapsed = currentTime.getTime() - breakStart;
    const totalMs = Math.max(0, breakDuration * 60000 - elapsed);
    const remMins = Math.floor(totalMs / 60000);
    const remSecs = Math.floor((totalMs % 60000) / 1000);
    const breakDone = totalMs <= 0;

    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-orange-100 border border-orange-200 rounded-full">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
            <span className="text-xs font-black text-orange-600 uppercase tracking-widest">
              On Break
            </span>
          </div>
        </div>
        {showBreakAnimation ? (
          <div className="rounded-2xl overflow-hidden shadow-md">
            <BreakJourneyAnimation
              progress={elapsedFraction}
              isActive={!breakDone}
              character={breakCharacter}
              destination={breakDestination}
            />
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-t border-orange-100">
              <div>
                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">
                  Break time remaining
                </p>
                {breakDone ? (
                  <p className="text-lg font-black text-emerald-500 tracking-tight">Break complete!</p>
                ) : (
                  <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter">
                    {remMins.toString().padStart(2, '0')}
                    <span className="text-orange-400 mx-0.5">:</span>
                    {remSecs.toString().padStart(2, '0')}
                  </p>
                )}
              </div>
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
        <div className="flex gap-2">
          {([15, 30, 60] as const).map(d => (
            <button
              key={d}
              onClick={() => setBreakDuration(d)}
              className={cn(
                'flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all',
                breakDuration === d
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xl'
                  : 'bg-white/80 border-slate-200 text-slate-500 hover:border-blue-300',
              )}
            >
              {d}m
            </button>
          ))}
        </div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button3D color="blue" onClick={() => onAction('break_end')} className="w-full py-10">
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
      <Button3D color="red" onClick={() => onConfirm('clock_out')} className="w-full py-10">
        <div className="flex flex-col items-center gap-4">
          <Square size={44} fill="currentColor" />
          <span className="text-2xl font-black tracking-widest">CLOCK OUT</span>
        </div>
      </Button3D>
    </motion.div>
  );
}
