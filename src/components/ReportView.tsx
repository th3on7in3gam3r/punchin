import React, { useMemo, useState, useRef } from 'react';
import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, parseISO, subMonths, addMonths, addWeeks, subWeeks, isSameDay
} from 'date-fns';
import {
  Clock, ChevronLeft, ChevronRight, Download, ArrowRight, MapPin,
  TrendingUp, Zap, Target, BarChart3, PieChart as PieIcon, Activity,
  DollarSign, Flame, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { WorkDay, WorkLocation } from '../types';
import { Card } from './common/Card';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// ─────────────────────────────────────────────────────────────────────────────

export const ReportView = ({
  workDays,
  setWorkDays,
  defaultWorkStart,
  defaultWorkEnd,
  breakDuration,
  workLocations,
  userProfile,
  hourlyRate,
}: {
  workDays: WorkDay[];
  setWorkDays: React.Dispatch<React.SetStateAction<WorkDay[]>>;
  defaultWorkStart: string;
  defaultWorkEnd: string;
  breakDuration: number;
  workLocations: WorkLocation[];
  userProfile: { taxRate?: number };
  hourlyRate: number;
}) => {
  const [rangeType, setRangeType]     = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd,   setCustomEnd]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode]       = useState<'time' | 'earnings'>('time');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  // ── date range ──────────────────────────────────────────────────────────────
  const { startDate, endDate } = useMemo(() => {
    if (rangeType === 'weekly')  return { startDate: startOfWeek(referenceDate, { weekStartsOn: 0 }), endDate: endOfWeek(referenceDate, { weekStartsOn: 0 }) };
    if (rangeType === 'monthly') return { startDate: startOfMonth(referenceDate), endDate: endOfMonth(referenceDate) };
    return { startDate: parseISO(customStart), endDate: parseISO(customEnd) };
  }, [rangeType, referenceDate, customStart, customEnd]);

  const expectedDailyHours = useMemo(() => {
    const [sh, sm] = defaultWorkStart.split(':').map(Number);
    const [eh, em] = defaultWorkEnd.split(':').map(Number);
    return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm) - breakDuration) / 60);
  }, [defaultWorkStart, defaultWorkEnd, breakDuration]);

  // ── per-day chart data ───────────────────────────────────────────────────────
  const reportData = useMemo(() => {
    try {
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = workDays.find(d => d.date === dateStr);
        const hours   = dayData ? parseFloat((dayData.totalWorkMinutes / 60).toFixed(1)) : 0;
        return {
          name:     rangeType === 'weekly' ? format(date, 'EEE') : format(date, 'dd'),
          hours,
          earnings: parseFloat((hours * hourlyRate).toFixed(2)),
          target:   expectedDailyHours,
          fullDate: dateStr,
          logs:     dayData?.logs || [],
        };
      });
    } catch { return []; }
  }, [workDays, startDate, endDate, expectedDailyHours, rangeType, hourlyRate]);

  // ── heatmap: last 35 days ────────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 35 }, (_, i) => {
      const d       = subDays(now, 34 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayData = workDays.find(w => w.date === dateStr);
      const hours   = dayData ? Math.round((dayData.totalWorkMinutes / 60) * 10) / 10 : 0;
      return { date: dateStr, hours, label: format(d, 'MMM dd') };
    });
  }, [workDays]);

  // ── streak ───────────────────────────────────────────────────────────────────
  const streak = useMemo(() => {
    let s = 0;
    let d = new Date();
    // don't count today if no work yet
    const todayStr = format(d, 'yyyy-MM-dd');
    if (!workDays.find(w => w.date === todayStr && w.totalWorkMinutes > 0)) d = subDays(d, 1);
    while (true) {
      const str = format(d, 'yyyy-MM-dd');
      if (!workDays.find(w => w.date === str && w.totalWorkMinutes > 0)) break;
      s++;
      d = subDays(d, 1);
    }
    return s;
  }, [workDays]);

  // ── aggregate stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalHours   = reportData.reduce((a, c) => a + c.hours, 0);
    const workingDays  = reportData.filter(d => d.hours > 0).length;
    const totalTarget  = reportData.reduce((a, c) => a + c.target, 0);
    const completion   = totalTarget > 0 ? Math.round((totalHours / totalTarget) * 100) : 0;
    const avgHours     = workingDays > 0 ? totalHours / workingDays : 0;
    const peakDay      = reportData.length > 0 ? [...reportData].sort((a, b) => b.hours - a.hours)[0] : null;
    const grossEarnings = hourlyRate > 0 ? totalHours * hourlyRate : 0;
    const netEarnings   = hourlyRate > 0 ? grossEarnings * (1 - ((userProfile.taxRate || 25) / 100)) : 0;
    return { totalHours, totalTarget, completion, avgHours, peakDay, workingDays, grossEarnings, netEarnings };
  }, [reportData, hourlyRate, userProfile]);

  // ── current week snapshot ────────────────────────────────────────────────────
  const currentWeekStats = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const end   = endOfWeek(new Date(),   { weekStartsOn: 0 });
    let totalHours = 0, totalTarget = 0;
    eachDayOfInterval({ start, end }).forEach(date => {
      const d = workDays.find(w => w.date === format(date, 'yyyy-MM-dd'));
      totalHours  += d ? d.totalWorkMinutes / 60 : 0;
      totalTarget += expectedDailyHours;
    });
    return { totalHours, totalTarget, completion: totalTarget > 0 ? Math.round((totalHours / totalTarget) * 100) : 0 };
  }, [workDays, expectedDailyHours]);

  // ── location pie ─────────────────────────────────────────────────────────────
  const locationStats = useMemo(() => {
    const stats: Record<string, number> = {};
    reportData.forEach(day => day.logs.forEach(log => {
      if (log.type === 'clock_in' && log.locationId) {
        const name = workLocations.find(l => l.id === log.locationId)?.name || 'Unknown';
        stats[name] = (stats[name] || 0) + 1;
      }
    }));
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [reportData, workLocations]);

  // ── time distribution (work vs break) ────────────────────────────────────────
  const timeDistribution = useMemo(() => {
    const totalWork  = reportData.reduce((a, c) => {
      const d = workDays.find(w => w.date === c.fullDate);
      return a + (d?.totalWorkMinutes ?? 0);
    }, 0);
    const totalBreak = reportData.reduce((a, c) => {
      const d = workDays.find(w => w.date === c.fullDate);
      return a + (d?.totalBreakMinutes ?? 0);
    }, 0);
    const total = totalWork + totalBreak || 1;
    return [
      { name: 'Work',  value: Math.round((totalWork  / total) * 100), color: '#3b82f6' },
      { name: 'Break', value: Math.round((totalBreak / total) * 100), color: '#8b5cf6' },
    ].filter(d => d.value > 0);
  }, [reportData, workDays]);

  // ── heatmap colour ───────────────────────────────────────────────────────────
  const heatColor = (hours: number) => {
    if (hours === 0)  return 'bg-slate-100';
    if (hours < 4)    return 'bg-emerald-200';
    if (hours < 7)    return 'bg-emerald-400';
    if (hours < 9)    return 'bg-emerald-500';
    return 'bg-emerald-600';
  };

  // ── CSV export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!reportData.length) return;
    const csv = ['Date,Hours,Earnings,Target',
      ...reportData.map(d => `${d.fullDate},${d.hours},${d.earnings},${d.target}`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `punchin-report-${format(startDate, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // ── CSV upload (preserved from original) ─────────────────────────────────────
  const recalculateDay = (day: WorkDay, logs: WorkDay['logs']): WorkDay => {
    let workMins = 0, breakMins = 0;
    let lastIn: number | null = null, lastBreak: number | null = null;
    [...logs].sort((a, b) => a.timestamp - b.timestamp).forEach(log => {
      if (log.type === 'clock_in')    { lastIn = log.timestamp; }
      if (log.type === 'break_start') { if (lastIn) workMins += (log.timestamp - lastIn) / 60000; lastBreak = log.timestamp; lastIn = null; }
      if (log.type === 'break_end')   { if (lastBreak) breakMins += (log.timestamp - lastBreak) / 60000; lastIn = log.timestamp; lastBreak = null; }
      if (log.type === 'clock_out')   { if (lastIn) workMins += (log.timestamp - lastIn) / 60000; lastIn = null; }
    });
    return { ...day, logs, totalWorkMinutes: Math.round(workMins), totalBreakMinutes: Math.round(breakMins) };
  };

  const handleUploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null); setUploadSuccess(null);
    try {
      const raw   = await file.text();
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) throw new Error('CSV must contain data rows');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const hasType  = headers.includes('date') && headers.includes('type');
      const hasShift = headers.includes('date') && headers.includes('start time') && headers.includes('end time');
      const hasHours = headers.includes('date') && headers.includes('hours');
      if (!hasType && !hasShift && !hasHours) throw new Error('CSV must have (date+type) or (date+start time+end time) or (date+hours)');
      const parsedLogs: WorkDay['logs'] = [];
      for (let i = 1; i < lines.length; i++) {
        let vals = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        if (vals.length > headers.length) { const diff = vals.length - headers.length; vals = [vals.slice(0, diff + 1).join(','), ...vals.slice(diff + 1)]; }
        if (vals.length < headers.length) continue;
        const row = headers.reduce((acc, h, idx) => ({ ...acc, [h]: vals[idx] ?? '' }), {} as Record<string, string>);
        if (hasType && row.type) {
          const type = row.type as WorkDay['logs'][number]['type'];
          if (!['clock_in','clock_out','break_start','break_end'].includes(type)) continue;
          const ts = row.timestamp ? Number(row.timestamp) : row.time ? new Date(`${row.date}T${row.time}`).getTime() : new Date(`${row.date}T09:00`).getTime();
          if (!Number.isFinite(ts) || ts <= 0) continue;
          parsedLogs.push({ id: crypto.randomUUID(), type, timestamp: ts, locationId: row.locationid || row.location_id || row.location || undefined });
        } else if (hasShift && row['start time'] && row['end time']) {
          const s = new Date(`${row.date} ${row['start time']}`).getTime();
          const en = new Date(`${row.date} ${row['end time']}`).getTime();
          if (Number.isFinite(s) && Number.isFinite(en) && en > s) {
            parsedLogs.push({ id: crypto.randomUUID(), type: 'clock_in',  timestamp: s,  locationId: row.locationid || undefined });
            parsedLogs.push({ id: crypto.randomUUID(), type: 'clock_out', timestamp: en, locationId: row.locationid || undefined });
          }
        } else if (hasHours && row.hours) {
          const h = Number(row.hours);
          if (!Number.isFinite(h) || h <= 0) continue;
          const s = new Date(`${row.date}T09:00`).getTime();
          parsedLogs.push({ id: crypto.randomUUID(), type: 'clock_in',  timestamp: s });
          parsedLogs.push({ id: crypto.randomUUID(), type: 'clock_out', timestamp: s + Math.round(h * 3600000) });
        }
      }
      if (!parsedLogs.length) throw new Error('No valid rows parsed');
      setWorkDays(prev => {
        const map = new Map(prev.map(d => [d.date, { ...d, logs: [...d.logs] }]));
        parsedLogs.forEach(log => {
          const key = format(new Date(log.timestamp), 'yyyy-MM-dd');
          const ex  = map.get(key);
          if (ex) { ex.logs.push(log); map.set(key, ex); }
          else map.set(key, { id: crypto.randomUUID(), date: key, logs: [log], totalWorkMinutes: 0, totalBreakMinutes: 0 });
        });
        return Array.from(map.values()).map(d => recalculateDay(d, d.logs)).sort((a, b) => b.date.localeCompare(a.date));
      });
      setUploadSuccess(`${parsedLogs.length} records imported`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) { setUploadError(err?.message || 'Failed to parse CSV'); }
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600">
            <Activity size={16} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Analytics</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">Reports</h1>
          <p className="text-slate-400 text-sm font-bold">{stats.workingDays} productive sessions this period</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95">
            <Clock size={14} /> Upload CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleUploadCsv} />
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {uploadError   && <p className="text-xs text-rose-500 font-bold px-1">{uploadError}</p>}
      {uploadSuccess && <p className="text-xs text-emerald-500 font-bold px-1">{uploadSuccess}</p>}

      {/* ── Streak + KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Streak — spans 2 cols */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="col-span-2 bg-gradient-to-br from-orange-500 to-rose-500 text-white p-6 rounded-3xl flex items-center gap-5 shadow-lg shadow-orange-200"
        >
          <Flame size={48} className="shrink-0 opacity-90" />
          <div>
            <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest">Current Streak</p>
            <p className="text-5xl font-black tracking-tighter leading-none">{streak}<span className="text-2xl ml-1 opacity-70">d</span></p>
            <p className="text-orange-200 text-xs mt-1">Don't break the chain! 🔥</p>
          </div>
        </motion.div>

        {/* Total hours */}
        <motion.div whileHover={{ scale: 1.02 }}
          className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
            <Clock size={16} />
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Hours</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">{stats.totalHours.toFixed(1)}<span className="text-sm text-slate-400 ml-1">h</span></p>
        </motion.div>

        {/* Earnings */}
        <motion.div whileHover={{ scale: 1.02 }}
          className={cn("p-5 rounded-3xl shadow-sm border", hourlyRate > 0 ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100")}>
          <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={16} />
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Earnings</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">
            {hourlyRate > 0 ? `$${stats.grossEarnings.toFixed(0)}` : '—'}
          </p>
          {hourlyRate > 0 && userProfile.taxRate && (
            <p className="text-[9px] text-emerald-500 font-bold mt-0.5">Net ~${stats.netEarnings.toFixed(0)}</p>
          )}
        </motion.div>

        {/* Daily avg */}
        <motion.div whileHover={{ scale: 1.02 }}
          className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
          <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={16} />
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Avg</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">{stats.avgHours.toFixed(1)}<span className="text-sm text-slate-400 ml-1">h</span></p>
        </motion.div>
      </div>

      {/* ── Activity Heatmap ── */}
      <Card className="p-6 border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-5 flex items-center gap-2">
          <Award size={16} className="text-emerald-500" /> Activity Heatmap · Last 5 Weeks
        </h3>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <p key={d} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-wider">{d}</p>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapData.map((day, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.25 }}
              title={`${day.label} — ${day.hours}h`}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center text-[9px] font-black cursor-pointer transition-all",
                heatColor(day.hours),
                day.hours >= 7 ? 'text-white' : 'text-slate-600'
              )}
            >
              {day.hours > 0 ? day.hours : ''}
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-[9px] text-slate-400 font-bold">Darker = more productive · 4h+ maintains streak</p>
          <div className="flex items-center gap-1.5">
            {['bg-slate-100','bg-emerald-200','bg-emerald-400','bg-emerald-600'].map((c, i) => (
              <div key={i} className={cn("w-4 h-4 rounded-md", c)} />
            ))}
            <span className="text-[9px] text-slate-400 font-bold ml-1">Less → More</span>
          </div>
        </div>
      </Card>

      {/* ── Range filter ── */}
      <Card className="p-2 bg-white/60 backdrop-blur-md border-slate-100 flex flex-col md:flex-row items-center gap-3">
        <div className="flex p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
          {(['weekly','monthly','custom'] as const).map(t => (
            <button key={t} onClick={() => setRangeType(t)}
              className={cn(
                "flex-1 md:flex-none px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                rangeType === t ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-center gap-3">
          {rangeType !== 'custom' ? (
            <>
              <button onClick={() => setReferenceDate(rangeType === 'weekly' ? subWeeks(referenceDate,1) : subMonths(referenceDate,1))}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <p className="text-xs font-black text-slate-800 uppercase tracking-tight min-w-[180px] text-center">
                {rangeType === 'weekly'
                  ? `${format(startDate,'MMM dd')} — ${format(endDate,'MMM dd, yyyy')}`
                  : format(referenceDate,'MMMM yyyy')}
              </p>
              <button onClick={() => setReferenceDate(rangeType === 'weekly' ? addWeeks(referenceDate,1) : addMonths(referenceDate,1))}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <ChevronRight size={18} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="bg-transparent text-[10px] font-black border-b-2 border-slate-200 py-1 outline-none" />
              <ArrowRight size={12} className="text-slate-300" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="bg-transparent text-[10px] font-black border-b-2 border-slate-200 py-1 outline-none" />
            </div>
          )}
        </div>
      </Card>

      {/* ── This week snapshot ── */}
      <Card className="p-7 border-none bg-slate-900 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 -rotate-12">
          <Zap size={120} strokeWidth={1} />
        </div>
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">This Week</span>
            </div>
            <h3 className="text-2xl font-black tracking-tighter">Weekly Progress</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
              {currentWeekStats.totalHours.toFixed(1)}h of {currentWeekStats.totalTarget.toFixed(1)}h goal
            </p>
          </div>

          <div className="flex items-center gap-8 bg-white/5 px-6 py-4 rounded-3xl border border-white/5">
            <div className="text-center">
              <p className="text-4xl font-black tracking-tighter">{currentWeekStats.totalHours.toFixed(1)}</p>
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">Hours</p>
            </div>
            {/* Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                <motion.circle
                  cx="32" cy="32" r="28"
                  stroke="currentColor" strokeWidth="6" fill="transparent"
                  strokeDasharray="176"
                  className="text-blue-400"
                  initial={{ strokeDashoffset: 176 }}
                  animate={{ strokeDashoffset: 176 - (176 * Math.min(100, currentWeekStats.completion)) / 100 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />
              </svg>
              <span className="absolute text-xs font-black">{currentWeekStats.completion}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Bar chart */}
        <Card className="lg:col-span-8 p-6 flex flex-col gap-5 border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Activity Overview</h3>
                <p className="text-[10px] font-bold text-slate-400">Hours logged per day</p>
              </div>
            </div>
            {/* Time / Earnings toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('time')}
                className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'time' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50")}>
                Hours
              </button>
              <button onClick={() => setViewMode('earnings')}
                className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'earnings' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50",
                  !hourlyRate && "opacity-40 cursor-not-allowed")}>
                Earnings
              </button>
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={reportData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={8} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc', radius: 8 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '10px' }}
                  itemStyle={{ fontWeight: 900, fontSize: '12px', color: '#1e293b' }}
                />
                <Bar dataKey={viewMode === 'time' ? 'hours' : 'earnings'}
                  radius={[6, 6, 0, 0]}
                  barSize={rangeType === 'weekly' ? 32 : undefined}>
                  {reportData.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.hours >= entry.target && entry.target > 0 ? '#10b981' : entry.hours > 0 ? '#3b82f6' : '#f1f5f9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Normal</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Met</span></div>
          </div>
        </Card>

        {/* Pie charts column */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Time distribution */}
          <Card className="p-6 flex flex-col border-slate-100 shadow-sm flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
                <PieIcon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Time Split</h3>
                <p className="text-[10px] font-bold text-slate-400">Work vs break</p>
              </div>
            </div>
            <div className="flex-1 min-h-[140px] relative">
              {timeDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={timeDistribution} innerRadius={45} outerRadius={62}
                        paddingAngle={4} dataKey="value" stroke="none">
                        {timeDistribution.map((_, i) => <Cell key={i} fill={timeDistribution[i].color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-lg font-black text-slate-800">{timeDistribution[0]?.value}%</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Work</p>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300">
                  <p className="text-[10px] font-black uppercase tracking-widest">No data</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-3">
              {timeDistribution.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{d.name} {d.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Location breakdown */}
          <Card className="p-6 flex flex-col border-slate-100 shadow-sm flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Sites</h3>
                <p className="text-[10px] font-bold text-slate-400">Location breakdown</p>
              </div>
            </div>
            {locationStats.length > 0 ? (
              <div className="space-y-2">
                {locationStats.map((s, i) => {
                  const total = locationStats.reduce((a, c) => a + c.value, 0);
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{s.name}</span>
                        <span className="text-[10px] font-black text-slate-400">{s.value}d</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(s.value / total) * 100}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-300">
                <p className="text-[10px] font-black uppercase tracking-widest">No location logs</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Bottom KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Efficiency', value: `${stats.completion}%`, sub: stats.completion >= 100 ? 'Exceeded' : 'of target', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Target size={16} /> },
          { label: 'Peak Day',   value: `${stats.peakDay?.hours.toFixed(1) ?? '0.0'}h`, sub: stats.peakDay?.fullDate ? format(parseISO(stats.peakDay.fullDate), 'MMM dd') : '—', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Zap size={16} /> },
          { label: 'Avg / Day',  value: `${stats.avgHours.toFixed(1)}h`, sub: 'per active day', color: 'text-amber-600', bg: 'bg-amber-50', icon: <TrendingUp size={16} /> },
          { label: 'Days Worked', value: `${stats.workingDays}`, sub: `of ${reportData.length} days`, color: 'text-violet-600', bg: 'bg-violet-50', icon: <Award size={16} /> },
        ].map((kpi, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }}>
            <Card className="p-5 border-slate-100 shadow-sm">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-3", kpi.bg, kpi.color)}>
                {kpi.icon}
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-2xl font-black text-slate-800 tracking-tighter">{kpi.value}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">{kpi.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

    </div>
  );
};
