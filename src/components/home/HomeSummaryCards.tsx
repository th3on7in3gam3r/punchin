import { Flame } from 'lucide-react';
import { Card } from '../common/Card';
import type { HomeSession } from './useHomeSession';

type Props = Pick<
  HomeSession,
  'today' | 'weekMins' | 'streak' | 'hourlyRate' | 'dailyGoalHours' | 'formatMinutes'
>;

export function HomeSummaryCards({
  today,
  weekMins,
  streak,
  hourlyRate,
  dailyGoalHours,
  formatMinutes,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-4 flex flex-col gap-2 border-slate-100 dark:border-slate-700">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Today</p>
        <p className="text-base font-black text-slate-800 dark:text-white tabular-nums leading-none">
          {formatMinutes(today.totalWorkMinutes)}
        </p>
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (today.totalWorkMinutes / (dailyGoalHours * 60)) * 100)}%`,
            }}
          />
        </div>
      </Card>
      <Card className="p-4 flex flex-col gap-2 border-slate-100 dark:border-slate-700">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Week</p>
        <p className="text-base font-black text-slate-800 dark:text-white tabular-nums leading-none">
          {formatMinutes(weekMins)}
        </p>
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (weekMins / (dailyGoalHours * 60 * 5)) * 100)}%`,
            }}
          />
        </div>
      </Card>
      {hourlyRate > 0 ? (
        <Card className="p-4 flex flex-col gap-2 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800">
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Pay Est.</p>
          <p className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
            ${((weekMins / 60) * hourlyRate).toFixed(0)}
          </p>
          <p className="text-[8px] text-emerald-400 font-bold">this week</p>
        </Card>
      ) : (
        <Card className="p-4 flex flex-col gap-2 border-slate-100 dark:border-slate-700">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Streak</p>
          <div className="flex items-center gap-1">
            <Flame size={14} className={streak > 0 ? 'text-orange-500' : 'text-slate-300'} />
            <p className="text-base font-black text-slate-800 dark:text-white tabular-nums leading-none">
              {streak}d
            </p>
          </div>
          <p className="text-[8px] text-slate-400 font-bold">in a row</p>
        </Card>
      )}
    </div>
  );
}
