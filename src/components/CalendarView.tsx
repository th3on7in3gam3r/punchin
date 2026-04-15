import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  subDays, 
  addDays,
  parseISO,
  isSameMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, X, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkDay, WorkLocation } from '../types';
import { Card } from './common/Card';
import { motion, AnimatePresence } from 'motion/react';

export const CalendarView = ({ 
  workDays, 
  formatMinutes, 
  workLocations,
  defaultWorkStart,
  defaultWorkEnd,
  breakDuration
}: { 
  workDays: WorkDay[];
  formatMinutes: (mins: number) => string;
  workLocations: WorkLocation[];
  defaultWorkStart: string;
  defaultWorkEnd: string;
  breakDuration: number;
}) => {
  const expectedDailyMins = useMemo(() => {
    const [startH, startM] = defaultWorkStart.split(':').map(Number);
    const [endH, endM] = defaultWorkEnd.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    return Math.max(0, endTotal - startTotal - breakDuration);
  }, [defaultWorkStart, defaultWorkEnd, breakDuration]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<WorkDay | null>(null);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getLocationName = (id?: string) => {
    if (!id) return null;
    return workLocations.find(l => l.id === id)?.name;
  };

  const monthStats = useMemo(() => {
    const monthDays = workDays.filter(d => isSameMonth(parseISO(d.date), currentMonth));
    const totalMins = monthDays.reduce((acc, curr) => acc + curr.totalWorkMinutes, 0);
    const daysWorked = monthDays.length;
    return { totalMins, daysWorked };
  }, [workDays, currentMonth]);

  return (
    <div className="space-y-8 pb-12">
      {/* Calendar Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-blue-600 mb-1"
          >
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Monthly Schedule</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">
              {format(currentMonth, 'MMMM')}
            </h1>
            <span className="text-xl font-black text-slate-300 tracking-tight">{format(currentMonth, 'yyyy')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setCurrentMonth(subDays(startOfMonth(currentMonth), 1))} 
              className="p-2.5 hover:bg-white hover:text-blue-600 rounded-xl transition-all text-slate-400"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentMonth(addDays(endOfMonth(currentMonth), 1))} 
              className="p-2.5 hover:bg-white hover:text-blue-600 rounded-xl transition-all text-slate-400"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Month Overview Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 border-none shadow-sm bg-blue-50/50 flex flex-col gap-1">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Month Volume</p>
          <p className="text-xl font-black text-blue-700 tracking-tight">{formatMinutes(monthStats.totalMins)}</p>
        </Card>
        <Card className="p-5 border-none shadow-sm bg-emerald-50/50 flex flex-col gap-1">
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Active Days</p>
          <p className="text-xl font-black text-emerald-700 tracking-tight">{monthStats.daysWorked} days</p>
        </Card>
      </div>

      {/* Main Calendar Grid */}
      <Card className="p-4 border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="grid grid-cols-7 mb-4">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((dt, i) => (
            <div key={i} className="text-center text-[9px] font-black text-slate-300 py-2 tracking-widest">{dt}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square opacity-20" />
          ))}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayData = workDays.find(d => d.date === dateStr);
            const isSelected = selectedDay?.date === dateStr;
            const current = isToday(day);

            return (
              <button 
                key={day.toString()} 
                onClick={() => dayData ? setSelectedDay(dayData) : setSelectedDay(null)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-all group border-2",
                  dayData 
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-[0.98] hover:scale-105 active:scale-95" 
                    : "bg-white border-transparent hover:border-slate-200 text-slate-400",
                  current && !dayData && "border-blue-500 bg-blue-50/50 text-blue-600",
                  isSelected && "ring-4 ring-blue-500/20 z-10"
                )}
              >
                <span className={cn(
                  "text-sm font-black tracking-tighter",
                  dayData ? "text-white" : current ? "text-blue-600" : "text-slate-700 group-hover:text-blue-600"
                )}>
                  {format(day, 'd')}
                </span>
                
                {dayData && (
                  <div className="mt-1 flex gap-0.5">
                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                    <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Day Details */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pt-2"
          >
            <Card className="p-8 border-none bg-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-700 text-slate-900">
                <Clock size={120} />
              </div>
              
              <button 
                onClick={() => setSelectedDay(null)}
                className="absolute top-6 right-6 p-2.5 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-600 transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative">
                 <div className="space-y-1">
                   <div className="flex items-center gap-2 text-emerald-500 mb-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Day Log Analysis</span>
                   </div>
                   <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                     {format(parseISO(selectedDay.date), 'MMMM dd')}
                   </h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                     {format(parseISO(selectedDay.date), 'EEEE, yyyy')}
                   </p>
                 </div>

                 <div className="flex flex-col items-start sm:items-end gap-1 px-6 py-4 bg-slate-900 rounded-[2rem] text-white shadow-xl">
                   <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-50">Total Duty</span>
                   <div className="flex items-baseline gap-1">
                     <span className="text-3xl font-black tracking-tighter">{formatMinutes(selectedDay.totalWorkMinutes)}</span>
                   </div>
                 </div>
              </div>

              <div className="mt-10 space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-4">Event Timeline</p>
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {selectedDay.logs.map((log, i) => {
                    const locationName = getLocationName(log.locationId);
                    return (
                      <div key={log.id} className="flex gap-6 relative group">
                        <div className={cn(
                          "w-6 h-6 rounded-full border-4 border-white shadow-sm shrink-0 z-10 mt-1",
                          log.type === 'clock_in' ? "bg-emerald-500" :
                          log.type === 'clock_out' ? "bg-rose-500" : "bg-blue-500"
                        )} />
                        
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-700 capitalize tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                              {log.type.replace('_', ' ')}
                            </p>
                            {locationName && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                  {locationName}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-black text-slate-900 tabular-nums bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-widest">
                            {format(log.timestamp, 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
