import { useState } from 'react';
import { Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './common/Card';
import { cn } from '../lib/utils';
import type { TimeLog } from '../types';
import { useHomeSession } from './home/useHomeSession';
import { HomeTimerRing } from './home/HomeTimerRing';
import { HomeActionArea } from './home/HomeActionArea';
import { HomeSummaryCards } from './home/HomeSummaryCards';
import { HomeConfirmModal } from './home/HomeConfirmModal';

type HomeViewProps = {
  selectedLocationId: string | undefined;
  setSelectedLocationId: (id: string | undefined) => void;
};

export function HomeView({ selectedLocationId, setSelectedLocationId }: HomeViewProps) {
  const session = useHomeSession(selectedLocationId);
  const [confirmAction, setConfirmAction] = useState<TimeLog['type'] | null>(null);

  return (
    <div className="space-y-6 pb-12 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-3xl -mx-1 px-1 pt-1">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2 px-1 flex items-start justify-between"
      >
        <div>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">
            Command Center
          </p>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-tight">
            {session.welcomeMessage}
          </h2>
        </div>
        {session.streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800 rounded-full">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-black text-orange-600 tabular-nums">{session.streak}d</span>
          </div>
        )}
      </motion.div>

      <Card className="relative p-6 border-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-xl shadow-blue-100/40 dark:shadow-none flex flex-col items-center gap-8 overflow-hidden border border-white/60 dark:border-slate-700">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
          className={cn(
            'absolute top-[-60%] right-[-30%] w-[160%] h-[160%] rounded-full opacity-[0.07] blur-[80px] pointer-events-none',
            session.currentStatus === 'on_break'
              ? 'bg-orange-500'
              : session.currentStatus === 'clocked_in'
                ? 'bg-blue-600'
                : 'bg-emerald-500',
          )}
        />
        <HomeTimerRing {...session} />
        <div className="w-full max-w-sm">
          <HomeActionArea
            {...session}
            setSelectedLocationId={setSelectedLocationId}
            onConfirm={setConfirmAction}
          />
        </div>
        {session.hasClockedIn && !session.hasClockedOut && (
          <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-700 w-full justify-center">
            <div className="flex flex-col items-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Session
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-black tabular-nums text-slate-700 dark:text-slate-200">
                  {session.formatMinutes(session.currentWorkMins)}
                </span>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-600" />
            <div className="flex flex-col items-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Location
              </p>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                {session.workLocations.find(l => l.id === selectedLocationId)?.name || 'Default'}
              </span>
            </div>
            {session.hourlyRate > 0 && (
              <>
                <div className="w-px h-8 bg-slate-100 dark:bg-slate-600" />
                <div className="flex flex-col items-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Earned
                  </p>
                  <span className="text-sm font-black text-emerald-600">
                    ${session.liveEarnings.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      <HomeSummaryCards {...session} />

      {confirmAction && (confirmAction === 'clock_in' || confirmAction === 'clock_out') && (
        <HomeConfirmModal
          confirmAction={confirmAction}
          onConfirm={() => {
            session.onAction(confirmAction);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
