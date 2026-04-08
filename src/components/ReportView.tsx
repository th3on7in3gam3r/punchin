import React, { useMemo, useState, useRef } from 'react';
import { 
  format, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  parseISO,
  subMonths,
  addMonths,
  addWeeks,
  subWeeks,
  isSameDay
} from 'date-fns';
import { Clock, ChevronLeft, ChevronRight, Download, ArrowRight, MapPin, TrendingUp, Zap, Target, BarChart3, PieChart as PieIcon, Activity, DollarSign } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { WorkDay, WorkLocation } from '../types';
import { Card } from './common/Card';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';


export const ReportView = ({ 
  workDays, 
  setWorkDays,
  defaultWorkStart, 
  defaultWorkEnd,
  breakDuration,
  workLocations,
  userProfile,
  hourlyRate
}: { 
  workDays: WorkDay[];
  setWorkDays: React.Dispatch<React.SetStateAction<WorkDay[]>>;
  defaultWorkStart: string;
  defaultWorkEnd: string;
  breakDuration: number;
  workLocations: WorkLocation[];
  userProfile: { hourlyRate?: number; taxRate?: number };
  hourlyRate: number;
}) => {
  const [rangeType, setRangeType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  const { startDate, endDate } = useMemo(() => {
    if (rangeType === 'weekly') {
      return { 
        startDate: startOfWeek(referenceDate, { weekStartsOn: 1 }), 
        endDate: endOfWeek(referenceDate, { weekStartsOn: 1 }) 
      };
    } else if (rangeType === 'monthly') {
      return { 
        startDate: startOfMonth(referenceDate), 
        endDate: endOfMonth(referenceDate) 
      };
    } else {
      return { 
        startDate: parseISO(customStart), 
        endDate: parseISO(customEnd) 
      };
    }
  }, [rangeType, referenceDate, customStart, customEnd]);

  const expectedDailyHours = useMemo(() => {
    const [startH, startM] = defaultWorkStart.split(':').map(Number);
    const [endH, endM] = defaultWorkEnd.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    return Math.max(0, (endTotal - startTotal - breakDuration) / 60);
  }, [defaultWorkStart, defaultWorkEnd, breakDuration]);

  const reportData = useMemo(() => {
    try {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = workDays.find(d => d.date === dateStr);
        return {
          name: rangeType === 'weekly' ? format(date, 'EEE') : format(date, 'dd'),
          hours: dayData ? parseFloat((dayData.totalWorkMinutes / 60).toFixed(1)) : 0,
          target: expectedDailyHours,
          fullDate: dateStr,
          logs: dayData?.logs || []
        };
      });
    } catch (e) {
      return [];
    }
  }, [workDays, startDate, endDate, expectedDailyHours, rangeType]);

  const locationStats = useMemo(() => {
    const stats: Record<string, number> = {};
    reportData.forEach(day => {
      day.logs.forEach(log => {
        if (log.type === 'clock_in' && log.locationId) {
          const locName = workLocations.find(l => l.id === log.locationId)?.name || 'Unknown';
          stats[locName] = (stats[locName] || 0) + 1;
        }
      });
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [reportData, workLocations]);

  const stats = useMemo(() => {
    const totalHours = reportData.reduce((acc, curr) => acc + curr.hours, 0);
    const workingDays = reportData.filter(d => d.hours > 0).length;
    const totalTarget = reportData.reduce((acc, curr) => acc + curr.target, 0);
    const completion = totalTarget > 0 ? Math.round((totalHours / totalTarget) * 100) : 0;
    const avgHours = workingDays > 0 ? totalHours / workingDays : 0;
    
    const peakDay = reportData.length > 0 ? [...reportData].sort((a,b) => b.hours - a.hours)[0] : null;

    return {
      totalHours,
      totalTarget,
      completion,
      avgHours,
      peakDay,
      workingDays,
      grossEarnings: hourlyRate > 0 ? totalHours * hourlyRate : 0,
      netEarnings: hourlyRate > 0 ? totalHours * hourlyRate * 0.75 : 0
    };
  }, [reportData, hourlyRate]);

  const currentWeekStats = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    
    let totalHours = 0;
    let totalTarget = 0;
    
    days.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = workDays.find(d => d.date === dateStr);
      totalHours += dayData ? (dayData.totalWorkMinutes / 60) : 0;
      totalTarget += expectedDailyHours;
    });
    
    const completion = totalTarget > 0 ? Math.round((totalHours / totalTarget) * 100) : 0;
    
    return { totalHours, totalTarget, completion };
  }, [workDays, expectedDailyHours]);

  const handleExport = () => {
    if (reportData.length === 0) return;
    const headers = ['Date', 'Hours', 'Target'];
    const rows = reportData.map(d => [d.fullDate, d.hours, d.target]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${format(startDate, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const recalculateDay = (day: WorkDay, logs: WorkDay['logs']): WorkDay => {
    let workMins = 0;
    let breakMins = 0;
    let lastIn: number | null = null;
    let lastBreak: number | null = null;

    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

    sortedLogs.forEach(log => {
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
      ...day,
      logs: sortedLogs,
      totalWorkMinutes: Math.round(workMins),
      totalBreakMinutes: Math.round(breakMins)
    };
  };

  const handleUploadCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const raw = await file.text();
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('CSV must contain data rows');
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const hasTypeMode = headers.includes('date') && headers.includes('type');
      const hasShiftMode = headers.includes('date') && headers.includes('start time') && headers.includes('end time');
      const hasReportMode = headers.includes('date') && headers.includes('hours');

      if (!hasTypeMode && !hasShiftMode && !hasReportMode) {
        throw new Error('CSV must contain either (date+type) or (date+start time+end time) or (date+hours).');
      }

      const parsedLogs: WorkDay['logs'] = [];

      for (let i = 1; i < lines.length; i++) {
        let values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());

        // If the date contains a comma (e.g. "Mar 31, 2026"), the naive split will create extra columns.
        // For shift-style and report-style CSVs, unify into expected column count.
        if (values.length > headers.length && headers.includes('date')) {
          const diff = values.length - headers.length;
          const dateValue = values.slice(0, diff + 1).join(',').trim();
          values = [dateValue, ...values.slice(diff + 1)];
        }
        if (values.length < headers.length) continue;
        const row = headers.reduce((acc, h, idx) => ({ ...acc, [h]: values[idx] ?? '' }), {} as Record<string,string>);

        const dateString = row.date;

        if (hasTypeMode && row.type) {
          const type = row.type as WorkDay['logs'][number]['type'];
          if (!['clock_in','clock_out','break_start','break_end'].includes(type)) continue;

          let timestamp = 0;
          if (row.timestamp) {
            timestamp = Number(row.timestamp);
          } else if (row.time) {
            const date = new Date(`${dateString}T${row.time}`);
            timestamp = date.getTime();
          } else {
            const date = new Date(`${dateString}T09:00`);
            timestamp = date.getTime();
          }
          if (!Number.isFinite(timestamp) || timestamp <= 0) continue;

          parsedLogs.push({
            id: crypto.randomUUID(),
            type,
            timestamp,
            locationId: row.locationid || row.location_id || row.location || undefined
          });
        } else if (hasShiftMode && row['start time'] && row['end time']) {
          const startDate = new Date(`${dateString} ${row['start time']}`);
          const endDate = new Date(`${dateString} ${row['end time']}`);
          if (Number.isFinite(startDate.getTime()) && Number.isFinite(endDate.getTime()) && endDate.getTime() > startDate.getTime()) {
            parsedLogs.push({
              id: crypto.randomUUID(),
              type: 'clock_in',
              timestamp: startDate.getTime(),
              locationId: row.locationid || row.location_id || row.location || undefined
            });
            parsedLogs.push({
              id: crypto.randomUUID(),
              type: 'clock_out',
              timestamp: endDate.getTime(),
              locationId: row.locationid || row.location_id || row.location || undefined
            });
          }
          continue;
        } else if (hasReportMode && row.hours) {
          const hours = Number(row.hours);
          if (!Number.isFinite(hours) || hours <= 0) continue;

          const date = new Date(`${dateString}T09:00`);
          if (!Number.isFinite(date.getTime())) continue;

          const start = date.getTime();
          const end = start + Math.round(hours * 3600 * 1000);

          parsedLogs.push({
            id: crypto.randomUUID(),
            type: 'clock_in',
            timestamp: start,
          });
          parsedLogs.push({
            id: crypto.randomUUID(),
            type: 'clock_out',
            timestamp: end,
          });
        }
      }

      if (parsedLogs.length === 0) {
        throw new Error('No valid rows were parsed from CSV');
      }

      setWorkDays(prev => {
        const dayMap = new Map(prev.map(day => [day.date, { ...day, logs: [...day.logs] }]));

        parsedLogs.forEach(log => {
          const dayKey = format(new Date(log.timestamp), 'yyyy-MM-dd');
          const existing = dayMap.get(dayKey);
          if (existing) {
            existing.logs.push(log);
            dayMap.set(dayKey, existing);
          } else {
            dayMap.set(dayKey, {
              id: crypto.randomUUID(),
              date: dayKey,
              logs: [log],
              totalWorkMinutes: 0,
              totalBreakMinutes: 0
            });
          }
        });

        const updated = Array.from(dayMap.values()).map(day => recalculateDay(day, day.logs));
        updated.sort((a,b) => b.date.localeCompare(a.date));
        return updated;
      });

      setUploadSuccess(`${parsedLogs.length} records imported from ${file.name}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setUploadError(error?.message || 'Failed to parse CSV');
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-blue-600 mb-1"
          >
            <Activity size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Analytics</span>
          </motion.div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">Performance Hub</h1>
          <p className="text-slate-400 font-bold text-sm">Tracking {stats.workingDays} productive sessions this period.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            <Clock size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Upload Data</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleUploadCsv}
          />

          {uploadError && (
            <p className="text-xs text-rose-500 font-bold">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="text-xs text-emerald-500 font-bold">{uploadSuccess}</p>
          )}
          
          <button 
            onClick={handleExport}
            className="group flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Export Data</span>
          </button>
        </div>
      </div>

    {userProfile?.hourlyRate && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="p-6 border-none bg-emerald-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-emerald-100 group-hover:scale-110 transition-transform">
            <DollarSign size={64} />
          </div>
          <div className="relative">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Gross Revenue</p>
            <h4 className="text-3xl font-black text-emerald-900 tracking-tighter">${stats.grossEarnings.toFixed(2)}</h4>
            <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 tracking-wider">Before {userProfile?.taxRate || 0}% Est. Tax</p>
          </div>
        </Card>
        <Card className="p-6 border-none bg-blue-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-blue-100 group-hover:scale-110 transition-transform">
            <Zap size={64} />
          </div>
          <div className="relative">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Estimated Net</p>
            <h4 className="text-3xl font-black text-blue-900 tracking-tighter">${stats.netEarnings.toFixed(2)}</h4>
            <p className="text-[9px] font-bold text-blue-500 uppercase mt-1 tracking-wider">Actual Take Home</p>
          </div>
        </Card>
      </div>
    )}

      {/* Modern Filter Bar */}
      <Card className="p-2 bg-white/50 backdrop-blur-md border-slate-100 flex flex-col md:flex-row items-center gap-4">
        <div className="flex p-1 bg-slate-100 rounded-2xl w-full md:w-fit">
          {(['weekly', 'monthly', 'custom'] as const).map(t => (
            <button
              key={t}
              onClick={() => setRangeType(t)}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                rangeType === t ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-center gap-4">
          {rangeType !== 'custom' ? (
            <>
              <button onClick={() => setReferenceDate(rangeType === 'weekly' ? subWeeks(referenceDate,1) : subMonths(referenceDate,1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <div className="text-center min-w-[200px]">
                <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">
                  {rangeType === 'weekly' 
                    ? `${format(startDate, 'MMM dd')} — ${format(endDate, 'MMM dd, yyyy')}`
                    : format(referenceDate, 'MMMM yyyy')}
                </p>
              </div>
              <button onClick={() => setReferenceDate(rangeType === 'weekly' ? addWeeks(referenceDate,1) : addMonths(referenceDate,1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <ChevronRight size={20} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="bg-transparent text-[10px] font-black border-b-2 border-slate-200 py-1" />
              <ArrowRight size={14} className="text-slate-300" />
              <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="bg-transparent text-[10px] font-black border-b-2 border-slate-200 py-1" />
            </div>
          )}
        </div>
      </Card>
      
      {/* Current Week Quick Summary */}
      <Card className="p-8 border-none bg-slate-900 border-slate-800 text-white relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
           <Zap size={140} strokeWidth={1} />
        </div>
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 text-blue-400 mb-1 justify-center md:justify-start">
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Active Week Snapshot</span>
              </div>
              <h3 className="text-3xl font-black tracking-tighter">Your Progress This Week</h3>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest leading-none">Current Weekly Milestone</p>
           </div>
           
           <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12 bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
              <div className="flex flex-col items-center sm:items-end">
                 <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tighter">{currentWeekStats.totalHours.toFixed(1)}</span>
                    <span className="text-xs font-black opacity-40 uppercase">Hours</span>
                 </div>
                 <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Goal: {currentWeekStats.totalTarget.toFixed(1)}h</p>
              </div>

              <div className="flex flex-col items-center">
                 <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                       <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-white/10"
                       />
                       <motion.circle
                          initial={{ strokeDashoffset: 226 }}
                          animate={{ strokeDashoffset: 226 - (226 * Math.min(100, currentWeekStats.completion)) / 100 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray="226"
                          fill="transparent"
                          className="text-blue-500"
                       />
                    </svg>
                    <span className="absolute text-sm font-black tracking-tighter">{currentWeekStats.completion}%</span>
                 </div>
                 <p className="text-[8px] font-black uppercase tracking-widest mt-2 opacity-60">Percent Complete</p>
              </div>
           </div>
        </div>
      </Card>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hour Distribution Chart */}
        <Card className="lg:col-span-8 p-8 flex flex-col gap-8 bg-white border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Hours</h3>
                <p className="text-[10px] font-bold text-slate-400">Total volume of work logged</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="hidden sm:flex items-center gap-2">
                 <div className="w-2 h-2 bg-blue-500 rounded-full" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Normal</span>
               </div>
               <div className="hidden sm:flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Met</span>
               </div>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={reportData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 8 }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontWeight: 900, fontSize: '12px', color: '#1e293b' }}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={rangeType === 'weekly' ? 32 : undefined}>
                  {reportData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.hours >= entry.target && entry.target > 0 ? '#10b981' : entry.hours > 0 ? '#3b82f6' : '#f1f5f9'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Site Breakdown Chart */}
        <Card className="lg:col-span-4 p-8 flex flex-col bg-white border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <PieIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Geo Logic</h3>
              <p className="text-[10px] font-bold text-slate-400">Site distribution</p>
            </div>
          </div>

          <div className="flex-1 relative min-h-[200px]">
            {locationStats.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={locationStats}
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {locationStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip cursor={false} content={() => null} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-black text-slate-800 leading-none">{locationStats.length}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Sites</p>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-200">
                <MapPin size={48} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No Location Logs</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-6">
            {locationStats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter truncate">{stat.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Hours */}
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
          <Card className="relative p-6 bg-blue-600 border-none text-white overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Clock size={80} />
            </div>
            <div className="relative space-y-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total Duration</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">{stats.totalHours.toFixed(1)}</span>
                  <span className="text-xs font-black opacity-60">HRS</span>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">Goal: {stats.totalTarget.toFixed(1)}h</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Efficiency */}
        <Card className="p-6 bg-white border-slate-100 hover:border-emerald-200 transition-colors">
          <div className="space-y-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Target size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-800 tracking-tighter">{stats.completion}%</span>
                <span className={cn(
                  "text-[10px] font-black",
                  stats.completion >= 100 ? "text-emerald-500" : "text-amber-500"
                )}>{stats.completion >= 100 ? 'EXCEEDED' : 'TOTAL'}</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, stats.completion)}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  stats.completion >= 100 ? "bg-emerald-500" : "bg-blue-500"
                )}
              />
            </div>
          </div>
        </Card>

        {/* Avg Session */}
        <Card className="p-6 bg-white border-slate-100">
          <div className="space-y-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Average</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-800 tracking-tighter">{stats.avgHours.toFixed(1)}</span>
                <span className="text-xs font-black text-slate-300">HRS</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Per productive day</p>
          </div>
        </Card>

        {/* Peak Session */}
        <Card className="p-6 bg-slate-900 border-none text-white">
          <div className="space-y-4">
            <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Peak Session</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">{stats.peakDay?.hours.toFixed(1) || '0.0'}</span>
                <span className="text-xs font-black opacity-40">HRS</span>
              </div>
            </div>
            {stats.peakDay?.hours > 0 && (
              <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">
                Hit on {format(parseISO(stats.peakDay.fullDate), 'MMM dd')}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
