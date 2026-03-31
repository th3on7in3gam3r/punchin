import React, { useState, useMemo } from 'react';
import { format, parseISO, isSameMonth, startOfMonth, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { FileText, MapPin, Play, Pause, Square, Clock, Calendar, ChevronDown, ChevronUp, Search, Filter, Edit2, Trash2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkDay, WorkLocation, TimeLog } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { cn } from '../lib/utils';

import { ManualEntryModal } from './ManualEntryModal';

export const EntriesView = ({ workDays, setWorkDays, formatMinutes, workLocations }: {
  workDays: WorkDay[];
  setWorkDays: React.Dispatch<React.SetStateAction<WorkDay[]>>;
  formatMinutes: (mins: number) => string;
  workLocations: WorkLocation[];
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);

  const weeklyTotalMinutes = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    return workDays
      .filter(day => {
        const date = parseISO(day.date);
        return isWithinInterval(date, { start, end });
      })
      .reduce((acc, day) => acc + day.totalWorkMinutes, 0);
  }, [workDays]);

  const toggleDay = (id: string) => {
    setExpandedDays(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const getLocationName = (id?: string) => {
    if (!id) return null;
    return workLocations.find(l => l.id === id)?.name;
  };

  const filteredDays = useMemo(() => {
    let days = [...workDays].sort((a, b) => b.date.localeCompare(a.date));
    
    if (selectedLocationId && selectedLocationId !== 'all') {
      days = days.filter(day => day.logs.some(log => log.locationId === selectedLocationId));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      days = days.filter(day => {
        const dateMatch = format(parseISO(day.date), 'MMMM dd yyyy').toLowerCase().includes(query);
        const locationMatch = day.logs.some(log => {
          const loc = getLocationName(log.locationId);
          return loc?.toLowerCase().includes(query);
        });
        return dateMatch || locationMatch;
      });
    }
    
    return days;
  }, [workDays, searchQuery, selectedLocationId, workLocations]);

  const groupedDays = useMemo(() => {
    const groups: { weekRange: string; totalWeekMinutes: number; days: WorkDay[] }[] = [];
    
    filteredDays.forEach(day => {
      const date = parseISO(day.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekRange = `Week of ${format(weekStart, 'MMMM dd')} - ${format(weekEnd, 'MMMM dd, yyyy')}`;
      
      const existingGroup = groups.find(g => g.weekRange === weekRange);
      if (existingGroup) {
        existingGroup.days.push(day);
        existingGroup.totalWeekMinutes += day.totalWorkMinutes;
      } else {
        groups.push({ 
          weekRange, 
          totalWeekMinutes: day.totalWorkMinutes, 
          days: [day] 
        });
      }
    });
    
    return groups;
  }, [filteredDays]);

  const getLogConfig = (type: TimeLog['type']) => {
    switch (type) {
      case 'clock_in': return { icon: Play, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Clock In' };
      case 'break_start': return { icon: Pause, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Break Start' };
      case 'break_end': return { icon: Play, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Break End' };
      case 'clock_out': return { icon: Square, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Clock Out' };
      default: return { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Action' };
    }
  };

  const handleUpdateLog = (dayId: string, logId: string, updates: Partial<TimeLog>) => {
    setWorkDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      const updatedLogs = day.logs.map(log => log.id === logId ? { ...log, ...updates } : log);
      return recalculateDay(day, updatedLogs);
    }));
  };

  const handleRemoveLog = (dayId: string, logId: string) => {
    setWorkDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      const updatedLogs = day.logs.filter(log => log.id !== logId);
      return recalculateDay(day, updatedLogs);
    }));
  };

  const handleAddLog = (dayId: string, type: TimeLog['type']) => {
    const day = workDays.find(d => d.id === dayId);
    if (!day) return;
    
    const newLog: TimeLog = {
      id: crypto.randomUUID(),
      type,
      timestamp: parseISO(day.date).getTime() + (9 * 60 * 60 * 1000), // Default to 9 AM
      locationId: workLocations[0]?.id
    };

    setWorkDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const updatedLogs = [...d.logs, newLog].sort((a, b) => a.timestamp - b.timestamp);
      return recalculateDay(d, updatedLogs);
    }));
  };

  const recalculateDay = (day: WorkDay, updatedLogs: TimeLog[]): WorkDay => {
    let workMins = 0;
    let breakMins = 0;
    let lastIn: number | null = null;
    let lastBreak: number | null = null;

    updatedLogs.forEach(log => {
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
      logs: updatedLogs,
      totalWorkMinutes: workMins,
      totalBreakMinutes: breakMins
    };
  };

  return (
    <div className="space-y-6 pb-12">
      <ManualEntryModal 
        isOpen={showAddEntry} 
        onClose={() => setShowAddEntry(false)} 
        workLocations={workLocations} 
        setWorkDays={setWorkDays} 
      />

      <div className="flex justify-end px-2">
        <button
          onClick={() => setShowAddEntry(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={14} />
          Add Entries
        </button>
      </div>

      <div className="space-y-10">
        {groupedDays.map((group, groupIdx) => (
          <div key={group.weekRange} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Calendar size={14} className="text-blue-500" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.weekRange}</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                 <Clock size={10} className="text-slate-400" />
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                   Week Total: {formatMinutes(group.totalWeekMinutes)}
                 </span>
              </div>
            </div>

            <div className="space-y-3">
               {group.days.map((day, dayIdx) => {
                const isExpanded = expandedDays.includes(day.id);
                const date = parseISO(day.date);
                const firstIn = day.logs.find(l => l.type === 'clock_in');
                const lastOut = [...day.logs].reverse().find(l => l.type === 'clock_out');
                const breakCount = day.logs.filter(l => l.type === 'break_start').length;
                
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (groupIdx * 0.05) + (dayIdx * 0.02) }}
                    key={day.id}
                  >
                    <Card 
                      className={cn(
                        "p-0 overflow-hidden transition-all border-slate-100",
                        isExpanded ? "ring-2 ring-blue-500/20 shadow-xl" : "hover:border-blue-200 hover:shadow-md"
                      )}
                    >
                      <div 
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4"
                        onClick={() => toggleDay(day.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{format(date, 'EEE')}</span>
                            <span className="text-lg font-black text-slate-700 leading-none">{format(date, 'dd')}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-800">{format(date, 'MMMM dd')}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <Clock size={10} className="text-emerald-500" />
                                <span className="text-slate-600">In: {firstIn ? format(firstIn.timestamp, 'HH:mm') : '--:--'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <Clock size={10} className="text-rose-500" />
                                <span className="text-slate-600">Out: {lastOut ? format(lastOut.timestamp, 'HH:mm') : '--:--'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <div className="text-left sm:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Breaks</p>
                              <p className="text-xs font-black text-slate-700">{breakCount} ({formatMinutes(day.totalBreakMinutes)})</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Work</p>
                              <p className="text-xs font-black text-blue-600">{formatMinutes(day.totalWorkMinutes)}</p>
                            </div>
                          </div>
                          <div className={cn("p-2 rounded-lg transition-colors", isExpanded ? "bg-blue-50 text-blue-500" : "text-slate-300 bg-slate-50")}>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-50/50 border-t border-slate-100"
                          >
                            <div className="p-6 space-y-6">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detailed Timeline</p>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDayId(editingDayId === day.id ? null : day.id);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                >
                                  {editingDayId === day.id ? <X size={12} /> : <Edit2 size={12} />}
                                  {editingDayId === day.id ? 'Close Edit' : 'Edit Logs'}
                                </button>
                              </div>

                              <div className="space-y-6 relative before:absolute before:left-[35px] before:top-8 before:bottom-8 before:w-0.5 before:bg-slate-200">
                                {day.logs.map((log, logIdx) => {
                                  const config = getLogConfig(log.type);
                                  const Icon = config.icon;
                                  const location = getLocationName(log.locationId);
                                  const isEditing = editingDayId === day.id;
                                  
                                  return (
                                    <div key={log.id} className="flex gap-4 relative group">
                                      <div className={cn(
                                        "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white",
                                        config.bg, config.color
                                      )}>
                                        <Icon size={14} fill={log.type !== 'clock_out' ? 'currentColor' : 'none'} />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex justify-between items-start">
                                          <div className="space-y-0.5">
                                            <p className="text-sm font-black text-slate-700 leading-none tracking-tight">{config.label}</p>
                                            {location && (
                                              <div className="flex items-center gap-1 text-slate-400">
                                                <MapPin size={10} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider truncate">{location}</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3">
                                            {isEditing ? (
                                              <div className="flex flex-wrap items-center justify-end gap-2">
                                                {/* Location Selector */}
                                                {(log.type === 'clock_in' || log.type === 'clock_out') && (
                                                  <div className="relative group/loc">
                                                    <MapPin size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <select
                                                      value={log.locationId || ''}
                                                      onChange={(e) => handleUpdateLog(day.id, log.id, { locationId: e.target.value || undefined })}
                                                      className="pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer hover:bg-slate-50 transition-all min-w-[80px]"
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
                                                  onChange={(e) => {
                                                    const [h, m] = e.target.value.split(':').map(Number);
                                                    const newDate = new Date(log.timestamp);
                                                    newDate.setHours(h, m);
                                                    handleUpdateLog(day.id, log.id, { timestamp: newDate.getTime() });
                                                  }}
                                                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold tabular-nums focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                />
                                                <button 
                                                  onClick={() => handleRemoveLog(day.id, log.id)}
                                                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            ) : (
                                              <p className="text-xs font-black text-slate-800 tabular-nums">
                                                {format(log.timestamp, 'hh:mm a')}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {editingDayId === day.id && (
                                  <div className="flex gap-4 pl-12 pt-2">
                                    <div className="flex flex-wrap gap-2">
                                      {(['clock_in', 'break_start', 'break_end', 'clock_out'] as const).map(type => (
                                        <button
                                          key={type}
                                          onClick={() => handleAddLog(day.id, type)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                        >
                                          <Plus size={10} />
                                          Add {type.replace('_', ' ')}
                                        </button>
                                      ))}
                                    </div>
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
          </div>
        ))}
      </div>

      {workDays.length === 0 && (
        <div className="text-center py-24 px-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <FileText size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">No Entries Found</h3>
          <p className="text-sm text-slate-500 max-w-[240px] mx-auto">
            {searchQuery ? "No logs match your search criteria. Try a different query." : "Clock in from the home screen to start tracking your work sessions."}
          </p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-4 text-xs font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
};
