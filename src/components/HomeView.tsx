import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Play, 
  Pause, 
  Square, 
  Clock as ClockIcon, 
  MapPin, 
  User, 
  Lock, 
  Calendar, 
  HeartPulse, 
  PartyPopper,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CircleDot,
  Activity,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkDay, WorkLocation, EntryStatus, TimeLog, DailyStatus, UserProfile } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { cn } from '../lib/utils';

interface HomeViewProps {
  currentTime: Date;
  currentStatus: EntryStatus;
  handleAction: (type: TimeLog['type'], locationId?: string) => void;
  today: WorkDay;
  formatMinutes: (mins: number) => string;
  breakDuration: number;
  setBreakDuration: (d: 15 | 30 | 60) => void;
  workLocations: WorkLocation[];
  selectedLocationId: string | undefined;
  setSelectedLocationId: (id: string | undefined) => void;
  dailyStatuses: DailyStatus[];
  userProfile: UserProfile;
}

export const HomeView = ({ 
  currentTime, 
  currentStatus, 
  handleAction, 
  today, 
  formatMinutes,
  breakDuration,
  setBreakDuration,
  workLocations,
  selectedLocationId,
  setSelectedLocationId,
  dailyStatuses,
  userProfile
}: HomeViewProps) => {
  const [confirmAction, setConfirmAction] = useState<TimeLog['type'] | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);

  const dateStr = format(currentTime, 'yyyy-MM-dd');
  const dailyStatus = dailyStatuses.find(s => s.date === dateStr);

  const currentSessionLogs = useMemo(() => {
    const logs = [...today.logs].sort((a, b) => b.timestamp - a.timestamp);
    const lastOutIndex = logs.findIndex(l => l.type === 'clock_out');
    const activeLogs = lastOutIndex === -1 ? logs : logs.slice(0, lastOutIndex);
    return activeLogs.reverse();
  }, [today.logs]);

  const hasClockedIn = today.logs.some(l => l.type === 'clock_in');
  const lastLog = today.logs[today.logs.length - 1];
  const hasClockedOut = lastLog?.type === 'clock_out';
  const hasStartedBreak = currentSessionLogs.some(l => l.type === 'break_start');
  const hasEndedBreak = currentSessionLogs.some(l => l.type === 'break_end');

  const WORK_THRESHOLD_MINS = 60; // 1 hour before break is available
  
  const currentWorkMins = useMemo(() => {
    let mins = 0;
    const logs = currentSessionLogs;
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].type === 'clock_in' || logs[i].type === 'break_end') {
        const next = logs[i+1];
        const end = next ? next.timestamp : currentTime.getTime();
        mins += (end - logs[i].timestamp) / 60000;
      }
    }
    return mins;
  }, [currentSessionLogs, currentTime]);

  const canStartBreak = currentWorkMins >= WORK_THRESHOLD_MINS && currentStatus === 'clocked_in' && !hasStartedBreak;
  const canEndBreak = currentStatus === 'on_break';

  const getWelcomeMessage = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return `Good morning, ${userProfile.name}`;
    if (hour < 18) return `Good afternoon, ${userProfile.name}`;
    return `Good evening, ${userProfile.name}`;
  };

  const getStatusColor = () => {
    if (currentStatus === 'on_break') return 'from-orange-500 to-amber-500';
    if (currentStatus === 'clocked_in') return 'from-blue-600 to-indigo-600';
    if (dailyStatus && !dailyStatus.isWorking) return 'from-slate-700 to-slate-900';
    return 'from-emerald-500 to-teal-500';
  };

  const renderTimerRing = () => {
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    let progress = 0;
    let mainDisplay = format(currentTime, 'hh:mm');
    let subDisplay = format(currentTime, 'ss');

    if (currentStatus === 'on_break') {
      const breakStart = currentSessionLogs.find(l => l.type === 'break_start')?.timestamp || 0;
      const elapsedMs = currentTime.getTime() - breakStart;
      const totalBreakMs = breakDuration * 60000;
      const remainingMs = Math.max(0, totalBreakMs - elapsedMs);
      
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      
      mainDisplay = `${mins.toString().padStart(2, '0')}`;
      subDisplay = secs.toString().padStart(2, '0');
      progress = Math.min(100, (elapsedMs / totalBreakMs) * 100);
    } else if (currentStatus === 'clocked_in') {
      const lastIn = currentSessionLogs.findLast(l => l.type === 'clock_in' || l.type === 'break_end')?.timestamp || 0;
      // We want total work mins for progress, but session duration for display? 
      // Usually the display should be the current session duration
      const totalElapsedMs = currentWorkMins * 60000;
      const h = Math.floor(totalElapsedMs / 3600000);
      const m = Math.floor((totalElapsedMs % 3600000) / 60000);
      const s = Math.floor((totalElapsedMs % 60000) / 1000);
      
      mainDisplay = h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}`;
      subDisplay = s.toString().padStart(2, '0');
      progress = Math.min(100, (currentWorkMins / 480) * 100); // 8h day
    }

    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Outer Glow */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000",
          getStatusColor() === 'from-blue-600 to-indigo-600' ? "bg-blue-500" : 
          getStatusColor() === 'from-orange-500 to-amber-500' ? "bg-orange-500" : "bg-emerald-500"
        )} />
        
        {/* Animated Background Ring */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className="stroke-slate-100 fill-none"
            strokeWidth="12"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r={radius}
            className={cn(
              "fill-none transition-colors duration-1000",
              currentStatus === 'on_break' ? "stroke-orange-500" : "stroke-blue-600"
            )}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          />
        </svg>

        {/* Center Clock */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.p 
            key={currentStatus + (currentStatus === 'on_break' ? '' : '')}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-black text-slate-800 tracking-tighter tabular-nums flex items-baseline"
          >
            {mainDisplay}
            <span className="text-xl ml-1 text-slate-400 font-bold">:{subDisplay}</span>
          </motion.p>
          <div className="flex flex-col items-center mt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">
              {currentStatus === 'on_break' ? 'Break Remaining' : currentStatus.replace('_', ' ')}
            </p>
            {currentStatus !== 'clocked_out' && (
              <div className="flex items-center gap-1 text-emerald-500 animate-pulse">
                <CircleDot size={8} fill="currentColor" />
                <span className="text-[8px] font-black uppercase tracking-wider">Active Session</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      handleAction(confirmAction, selectedLocationId || undefined);
      setConfirmAction(null);
      setIsEmergency(false);
    }
  };

  const renderActionArea = () => {
    if (dailyStatus && !dailyStatus.isWorking) {
      return (
        <Card className="p-12 text-center bg-slate-50 border-none shadow-inner flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-slate-400">
            {dailyStatus.reason === 'holiday' ? <PartyPopper size={40} /> : <HeartPulse size={40} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              {dailyStatus.reason || 'OFF DUTY'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Enjoy your time off!</p>
          </div>
        </Card>
      );
    }

    if (!hasClockedIn || hasClockedOut) {
      return (
        <div className="w-full space-y-6">
          <Button3D color="blue" onClick={() => setConfirmAction('clock_in')} className="w-full py-10">
            <div className="flex flex-col items-center gap-4">
              <Play size={44} fill="currentColor" />
              <span className="text-2xl font-black tracking-widest">START SHIFT</span>
            </div>
          </Button3D>
          <div className="flex items-center justify-between px-4">
             <div className="flex items-center gap-2 text-slate-400">
               <Calendar size={14} />
               <span className="text-[10px] font-black uppercase tracking-wider">{format(currentTime, 'EEEE, MMM dd')}</span>
             </div>
             <div className="flex items-center gap-2 text-slate-400">
               <MapPin size={14} />
               <span className="text-[10px] font-black uppercase tracking-wider">No Active HQ</span>
             </div>
          </div>
        </div>
      );
    }

    if (!hasStartedBreak) {
      return (
        <div className="w-full space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
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
              <button
                onClick={() => {
                  setBreakDuration(15);
                  handleAction('break_start', selectedLocationId);
                }}
                className="w-full py-3 bg-orange-50 border border-orange-100 rounded-2xl text-[10px] font-black text-orange-600 uppercase tracking-widest hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
              >
                <Activity size={12} />
                Quick 15m Break
              </button>
            </div>
            
            <Button3D color="red" onClick={() => setConfirmAction('clock_out')} className="w-full py-10">
              <div className="flex flex-col items-center gap-2">
                <Square size={32} fill="currentColor" />
                <span className="text-xs font-black tracking-widest">FINISH</span>
              </div>
            </Button3D>
          </div>
          
          {!canStartBreak && (
             <Card className="p-4 bg-orange-50 border-orange-100 border text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 text-orange-200 rotate-12">
                   <ClockIcon size={48} />
                </div>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Rest Period Locked</p>
                <p className="text-xs font-bold text-orange-800">Complete 60m of work first.</p>
                <div className="w-full h-1 bg-orange-200 rounded-full mt-3 overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${(currentWorkMins / 60) * 100}%` }}
                     className="h-full bg-orange-600"
                   />
                </div>
             </Card>
          )}
        </div>
      );
    }

    if (!hasEndedBreak) {
       const breakStart = currentSessionLogs.find(l => l.type === 'break_start')?.timestamp || 0;
       const elapsedMins = (currentTime.getTime() - breakStart) / 60000;
       const remainingMins = Math.max(0, breakDuration - elapsedMins);
       
       return (
         <div className="w-full space-y-8">
           <Card className="p-6 bg-slate-900 border-none text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 animate-pulse">
                 <Pause size={80} />
              </div>
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Break Protocol Active</p>
                </div>
                <div className="space-y-1">
                  {(() => {
                    const elapsedMs = currentTime.getTime() - breakStart;
                    const totalMs = Math.max(0, (breakDuration * 60000) - elapsedMs);
                    const mins = Math.floor(totalMs / 60000);
                    const secs = Math.floor((totalMs % 60000) / 1000);
                    
                    if (totalMs <= 0) {
                      return (
                        <p className="text-3xl font-black tracking-tighter text-emerald-400">
                          Break completed
                        </p>
                      );
                    }

                    return (
                      <div className="flex items-baseline gap-2">
                        <p className="text-5xl font-black tracking-tighter tabular-nums">
                          {mins.toString().padStart(2, '0')}
                          <span className="text-blue-500 opacity-80 mx-1">:</span>
                          {secs.toString().padStart(2, '0')}
                        </p>
                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
                          Secs left
                        </p>
                      </div>
                    );
                  })()}
                  <p className="text-xs font-bold opacity-40 uppercase tracking-wider">
                    Target: {breakDuration} mins
                  </p>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (elapsedMins / breakDuration) * 100)}%` }}
                     className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]"
                   />
                </div>
              </div>
           </Card>

           <div className="flex justify-center gap-2">
             {[15, 30, 60].map(d => (
               <button
                 key={d}
                 onClick={() => setBreakDuration(d as 15 | 30 | 60)}
                 className={cn(
                   "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                   breakDuration === d ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white border-slate-100 text-slate-400"
                 )}
               >
                 {d}m
               </button>
             ))}
           </div>
           
           <Button3D 
             color="blue" 
             onClick={() => handleAction('break_end', selectedLocationId)} 
             className="w-full py-10"
           >
             <div className="flex flex-col items-center gap-2">
               <Play size={32} fill="currentColor" />
               <span className="text-xs font-black tracking-widest">RESUME WORK</span>
             </div>
           </Button3D>
         </div>
       );
    }

    return (
      <Button3D color="red" onClick={() => setConfirmAction('clock_out')} className="w-full py-10">
        <div className="flex flex-col items-center gap-4">
          <Square size={44} fill="currentColor" />
          <span className="text-2xl font-black tracking-widest">CLOCK OUT</span>
        </div>
      </Button3D>
    );
  };

  return (
    <div className="space-y-8 pb-12 overflow-hidden">
      {/* Premium Header */}
      <div className="relative pt-6 px-2">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-2 text-blue-600">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] leading-none">Command Center</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
            {getWelcomeMessage()}
          </h2>
        </motion.div>
      </div>

      {/* Main Hero Card */}
      <Card className="relative p-8 border-none bg-white shadow-2xl shadow-blue-100/50 flex flex-col items-center gap-10 overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 -z-10 bg-slate-50">
           <motion.div 
             animate={{ 
               scale: [1, 1.2, 1],
               rotate: [0, 90, 0],
               x: [0, 50, 0]
             }}
             transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
             className={cn(
               "absolute top-[-50%] right-[-20%] w-[150%] h-[150%] rounded-full opacity-10 blur-[100px]",
               getStatusColor().split(' ')[0].replace('from-', 'bg-')
             )}
           />
        </div>

        {renderTimerRing()}

        <div className="w-full max-w-sm">
          {renderActionArea()}
        </div>

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
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Headquarters</p>
                <span className="text-sm font-black text-slate-700">
                  {workLocations.find(l => l.id === selectedLocationId)?.name || 'Default Site'}
                </span>
             </div>
          </div>
        )}
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {userProfile.hourlyRate ? (
          <Card className="p-5 flex flex-col gap-3 bg-emerald-600 border-none text-white overflow-hidden group">
            <div className="p-2 bg-white/20 rounded-xl w-fit">
               <DollarSign size={18} />
            </div>
            <div>
               <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Today's Earnings</p>
               <p className="text-xl font-black tracking-tight">
                 ${((today.totalWorkMinutes / 60) * userProfile.hourlyRate).toFixed(2)}
               </p>
               {userProfile.taxRate && (
                 <p className="text-[7px] font-black opacity-40 uppercase tracking-widest mt-1">
                   Est. Net: ${((today.totalWorkMinutes / 60) * userProfile.hourlyRate * (1 - (userProfile.taxRate / 100))).toFixed(2)}
                 </p>
               )}
            </div>
            <div className="absolute -bottom-4 -right-4 p-8 bg-white/5 rounded-full rotate-45 group-hover:scale-110 transition-transform" />
          </Card>
        ) : (
          <Card className="p-5 flex flex-col gap-3 bg-slate-900 border-none text-white overflow-hidden group">
             <div className="p-2 bg-white/10 rounded-xl w-fit">
                <TrendingUp size={18} />
             </div>
             <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Current Goal</p>
                <p className="text-xl font-black tracking-tight">8.0 hrs</p>
             </div>
             <div className="absolute -bottom-4 -right-4 p-8 bg-white/5 rounded-full rotate-45 group-hover:scale-110 transition-transform" />
          </Card>
        )}

        <Card className="p-5 flex flex-col gap-3 border-slate-100 group">
           <div className="p-2 bg-blue-50 text-blue-600 rounded-xl w-fit">
              <Activity size={18} />
           </div>
           <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Performance Status</p>
              <p className="text-xl font-black text-slate-800 tracking-tight">High Stability</p>
           </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
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
                    {confirmAction === 'clock_in' 
                      ? "Ready to focus and log your time?" 
                      : "Confirm your punch out for today."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button3D 
                  color={confirmAction === 'clock_in' ? 'green' : 'red'} 
                  onClick={handleConfirmAction}
                  className="py-6"
                >
                  {confirmAction === 'clock_in' ? 'YES, LET\'S GO' : 'YES, FINISH DAY'}
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
