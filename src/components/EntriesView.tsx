import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  FileText, MapPin, Play, Pause, Square, Clock, Calendar,
  ChevronDown, ChevronUp, Edit2, Trash2, Plus, X, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkDay, WorkLocation, TimeLog } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { cn } from '../lib/utils';
import { ManualEntryModal } from './ManualEntryModal';

const PAGE_SIZE = 10; // entries (days) shown per page

export const EntriesView = ({
  workDays, setWorkDays, formatMinutes, workLocations
}: {
  workDays: WorkDay[];
  setWorkDays: React.Dispatch<React.SetStateAction<WorkDay[]>>;
  formatMinutes: (mins: number) => string;
  workLocations: WorkLocation[];
}) => {
  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [expandedDays, setExpandedDays]         = useState<string[]>([]);
  const [editingDayId, setEditingDayId]         = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry]         = useState(false);
  const [visibleCount, setVisibleCount]         = useState(PAGE_SIZE);
  const [savedDayId, setSavedDayId]             = useState<string | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────
  const toggleDay = (id: string) =>
    setExpandedDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  const getLocationName = (id?: string) =>
    id ? workLocations.find(l => l.id === id)?.name ?? null : null;

  const recalculateDay = (day: WorkDay, updatedLogs: TimeLog[]): WorkDay => {
    let workMins = 0, breakMins = 0;
    let lastIn: number | null = null, lastBreak: number | null = null;
    updatedLogs.forEach(log => {
      if (log.type === 'clock_in')    { lastIn = log.timestamp; }
      if (log.type === 'break_start') { if (lastIn) workMins += (log.timestamp - lastIn) / 60000; lastBreak = log.timestamp; lastIn = null; }
      if (log.type === 'break_end')   { if (lastBreak) breakMins += (log.timestamp - lastBreak) / 60000; lastIn = log.timestamp; lastBreak = null; }
      if (log.type === 'clock_out')   { if (lastIn) workMins += (log.timestamp - lastIn) / 60000; lastIn = null; }
    });
    return { ...day, logs: updatedLogs, totalWorkMinutes: workMins, totalBreakMinutes: breakMins };
  };

  const handleUpdateLog = (dayId: string, logId: string, updates: Partial<TimeLog>) =>
    setWorkDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      return recalculateDay(day, day.logs.map(l => l.id === logId ? { ...l, ...updates } : l));
    }));

  const handleRemoveLog = (dayId: string, logId: string) =>
    setWorkDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      return recalculateDay(day, day.logs.filter(l => l.id !== logId));
    }));

  const handleAddLog = (dayId: string, type: TimeLog['type']) => {
    const day = workDays.find(d => d.id === dayId);
    if (!day) return;
    const newLog: TimeLog = {
      id: crypto.randomUUID(), type,
      timestamp: parseISO(day.date).getTime() + 9 * 3600000,
      locationId: workLocations[0]?.id
    };
    fetch('/api/punch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: type, locationId: newLog.locationId, timestamp: newLog.timestamp, date: day.date })
    }).catch(console.error);
    setWorkDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      return recalculateDay(d, [...d.logs, newLog].sort((a, b) => a.timestamp - b.timestamp));
    }));
  };

  // Sync all logs for a day to the DB and show confirmation
  const handleSaveDay = async (dayId: string) => {
    const day = workDays.find(d => d.id === dayId);
    if (!day) return;
    try {
      await Promise.all(day.logs.map(log =>
        fetch('/api/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: log.id,          // pass existing id → triggers ON CONFLICT UPDATE
            action: log.type,
            locationId: log.locationId,
            timestamp: log.timestamp,
            date: day.date,
          }),
        })
      ));
      setSavedDayId(dayId);
      setTimeout(() => setSavedDayId(null), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const getLogConfig = (type: TimeLog['type']) => {
    switch (type) {
      case 'clock_in':    return { icon: Play,   color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Clock In' };
      case 'break_start': return { icon: Pause,  color: 'text-orange-500',  bg: 'bg-orange-50',  label: 'Break Start' };
      case 'break_end':   return { icon: Play,   color: 'text-blue-500',    bg: 'bg-blue-50',    label: 'Break End' };
      case 'clock_out':   return { icon: Square, color: 'text-rose-500',    bg: 'bg-rose-50',    label: 'Clock Out' };
      default:            return { icon: Clock,  color: 'text-slate-500',   bg: 'bg-slate-50',   label: 'Action' };
    }
  };

  // ── filtering ──────────────────────────────────────────────────────────────
  const filteredDays = useMemo(() => {
    let days = [...workDays].sort((a, b) => b.date.localeCompare(a.date));
    if (selectedLocationId !== 'all')
      days = days.filter(d => d.logs.some(l => l.locationId === selectedLocationId));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      days = days.filter(d => {
        const dateMatch = format(parseISO(d.date), 'MMMM dd yyyy').toLowerCase().includes(q);
        const locMatch  = d.logs.some(l => getLocationName(l.locationId)?.toLowerCase().includes(q));
        return dateMatch || locMatch;
      });
    }
    return days;
  }, [workDays, searchQuery, selectedLocationId]);

  // weekly total for the current week
  const weeklyTotalMinutes = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const end   = endOfWeek(new Date(),   { weekStartsOn: 0 });
    return workDays
      .filter(d => isWithinInterval(parseISO(d.date), { start, end }))
      .reduce((acc, d) => acc + d.totalWorkMinutes, 0);
  }, [workDays]);

  // paginated slice
  const visibleDays = filteredDays.slice(0, visibleCount);
  const hasMore     = filteredDays.length > visibleCount;

  // reset pagination when filters change
  const handleSearch = (v: string) => { setSearchQuery(v); setVisibleCount(PAGE_SIZE); };
  const handleLocFilter = (id: string) => { setSelectedLocationId(id); setVisibleCount(PAGE_SIZE); };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-12">
      <ManualEntryModal
        isOpen={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        workLocations={workLocations}
        setWorkDays={setWorkDays}
      />

      {/* ── Top bar: search + add ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search date or location…"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
          />
          {searchQuery && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAddEntry(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all active:scale-95 shrink-0"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* ── Location filter chips ── */}
      {workLocations.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleLocFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 transition-all",
              selectedLocationId === 'all'
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
            )}
          >
            All Sites
          </button>
          {workLocations.map(loc => (
            <button
              key={loc.id}
              onClick={() => handleLocFilter(loc.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                selectedLocationId === loc.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
              )}
            >
              <MapPin size={9} />
              {loc.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Summary bar ── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {filteredDays.length} {filteredDays.length === 1 ? 'day' : 'days'} found
        </p>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full">
          <Clock size={10} className="text-blue-400" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
            This week: {formatMinutes(weeklyTotalMinutes)}
          </span>
        </div>
      </div>

      {/* ── Entry list ── */}
      <div className="space-y-3">
        {visibleDays.map((day, idx) => {
          const isExpanded = expandedDays.includes(day.id);
          const date       = parseISO(day.date);
          const firstIn    = day.logs.find(l => l.type === 'clock_in');
          const lastOut    = [...day.logs].reverse().find(l => l.type === 'clock_out');
          const breakCount = day.logs.filter(l => l.type === 'break_start').length;
          // unique locations for this day
          const dayLocIds  = [...new Set(day.logs.map(l => l.locationId).filter(Boolean))];

          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
            >
              <Card className={cn(
                "p-0 overflow-hidden transition-all",
                isExpanded ? "ring-2 ring-blue-500/20 shadow-xl border-blue-100" : "hover:border-blue-200 hover:shadow-md border-slate-100"
              )}>
                {/* ── Day header row ── */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => toggleDay(day.id)}
                >
                  {/* Date badge */}
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">{format(date, 'EEE')}</span>
                    <span className="text-lg font-black text-slate-700 leading-none">{format(date, 'dd')}</span>
                    <span className="text-[8px] font-bold text-slate-400 leading-none mt-0.5">{format(date, 'MMM')}</span>
                  </div>

                  {/* Middle info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-black text-slate-800 leading-none">{format(date, 'MMMM dd, yyyy')}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock size={9} className="text-emerald-500" />
                        {firstIn ? format(firstIn.timestamp, 'HH:mm') : '--:--'}
                        <span className="text-slate-300 mx-0.5">→</span>
                        <Clock size={9} className="text-rose-500" />
                        {lastOut ? format(lastOut.timestamp, 'HH:mm') : '--:--'}
                      </span>
                      {/* Location chips on the row */}
                      {dayLocIds.map(locId => {
                        const name = getLocationName(locId);
                        return name ? (
                          <span key={locId} className="flex items-center gap-0.5 text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            <MapPin size={8} />{name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Right stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Breaks</p>
                      <p className="text-xs font-black text-slate-600">{breakCount} · {formatMinutes(day.totalBreakMinutes)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Work</p>
                      <p className="text-sm font-black text-blue-600 tabular-nums">{formatMinutes(day.totalWorkMinutes)}</p>
                    </div>
                    <div className={cn("p-1.5 rounded-lg transition-colors", isExpanded ? "bg-blue-50 text-blue-500" : "text-slate-300 bg-slate-50")}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* ── Expanded timeline ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-slate-50/60 border-t border-slate-100"
                    >
                      <div className="p-5 space-y-4">
                        {/* Edit toggle */}
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</p>
                          <div className="flex items-center gap-2">
                            {editingDayId === day.id && (
                              <button
                                onClick={e => { e.stopPropagation(); handleSaveDay(day.id); }}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                  savedDayId === day.id
                                    ? "bg-emerald-500 text-white border border-emerald-500"
                                    : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                )}
                              >
                                {savedDayId === day.id ? '✓ Saved' : 'Save'}
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); setEditingDayId(editingDayId === day.id ? null : day.id); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-slate-200 rounded-xl text-[9px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                            >
                              {editingDayId === day.id ? <><X size={11} /> Done</> : <><Edit2 size={11} /> Edit</>}
                            </button>
                          </div>
                        </div>

                        {/* Log items */}
                        <div className="space-y-3 relative before:absolute before:left-[15px] before:top-6 before:bottom-6 before:w-0.5 before:bg-slate-200">
                          {day.logs.map(log => {
                            const cfg      = getLogConfig(log.type);
                            const Icon     = cfg.icon;
                            const location = getLocationName(log.locationId);
                            const isEditing = editingDayId === day.id;

                            return (
                              <div key={log.id} className="flex gap-3 relative">
                                <div className={cn(
                                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white",
                                  cfg.bg, cfg.color
                                )}>
                                  <Icon size={13} fill={log.type !== 'clock_out' ? 'currentColor' : 'none'} />
                                </div>

                                <div className="flex-1 min-w-0 pt-1">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="text-xs font-black text-slate-700 leading-none">{cfg.label}</p>
                                      {location && (
                                        <div className="flex items-center gap-1 mt-0.5 text-slate-400">
                                          <MapPin size={9} />
                                          <span className="text-[9px] font-bold uppercase tracking-wider">{location}</span>
                                        </div>
                                      )}
                                    </div>

                                    {isEditing ? (
                                      <div className="flex flex-wrap items-center gap-2 justify-end">
                                        {(log.type === 'clock_in' || log.type === 'clock_out') && (
                                          <div className="relative">
                                            <MapPin size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                              value={log.locationId || ''}
                                              onChange={e => handleUpdateLog(day.id, log.id, { locationId: e.target.value || undefined })}
                                              className="pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none min-w-[80px]"
                                            >
                                              <option value="">No Site</option>
                                              {workLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}
                                        <input
                                          type="time"
                                          value={format(log.timestamp, 'HH:mm')}
                                          onChange={e => {
                                            const [h, m] = e.target.value.split(':').map(Number);
                                            const d = new Date(log.timestamp);
                                            d.setHours(h, m);
                                            handleUpdateLog(day.id, log.id, { timestamp: d.getTime() });
                                          }}
                                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold tabular-nums focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        />
                                        <button
                                          onClick={() => handleRemoveLog(day.id, log.id)}
                                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-xs font-black text-slate-800 tabular-nums shrink-0">
                                        {format(log.timestamp, 'hh:mm a')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Add log buttons */}
                          {editingDayId === day.id && (
                            <div className="pl-11 flex flex-wrap gap-2 pt-1">
                              {(['clock_in', 'break_start', 'break_end', 'clock_out'] as const).map(type => (
                                <button
                                  key={type}
                                  onClick={() => handleAddLog(day.id, type)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                >
                                  <Plus size={9} /> {type.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Show more / less ── */}
      {filteredDays.length > PAGE_SIZE && (
        <div className="flex items-center gap-3 pt-2">
          {hasMore && (
            <button
              onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
              className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest transition-all active:scale-95"
            >
              Show {Math.min(PAGE_SIZE, filteredDays.length - visibleCount)} more
            </button>
          )}
          {visibleCount > PAGE_SIZE && (
            <button
              onClick={() => setVisibleCount(PAGE_SIZE)}
              className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest transition-all active:scale-95"
            >
              Collapse
            </button>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {filteredDays.length === 0 && (
        <div className="text-center py-20 px-6">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <FileText size={28} className="text-slate-300" />
          </div>
          <h3 className="text-base font-black text-slate-800 mb-1">No Entries Found</h3>
          <p className="text-sm text-slate-400 max-w-[220px] mx-auto">
            {searchQuery || selectedLocationId !== 'all'
              ? 'No logs match your filters.'
              : 'Clock in from the home screen to start tracking.'}
          </p>
          {(searchQuery || selectedLocationId !== 'all') && (
            <button
              onClick={() => { handleSearch(''); handleLocFilter('all'); }}
              className="mt-3 text-xs font-black text-blue-500 uppercase tracking-widest hover:text-blue-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
