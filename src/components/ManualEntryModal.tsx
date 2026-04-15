import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MapPin, Plus, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkDay, WorkLocation, TimeLog } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { cn } from '../lib/utils';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workLocations: WorkLocation[];
  setWorkDays: React.Dispatch<React.SetStateAction<WorkDay[]>>;
}

export const ManualEntryModal = ({ isOpen, onClose, workLocations, setWorkDays }: ManualEntryModalProps) => {
  const [newEntryDate, setNewEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEntryLocation, setNewEntryLocation] = useState<string>('');
  const [clockInTime, setClockInTime] = useState('09:00');
  const [clockOutTime, setClockOutTime] = useState('17:00');
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('12:30');
  const [includeBreak, setIncludeBreak] = useState(false);

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

  const calcPreview = () => {
    if (!clockInTime || !clockOutTime) return null;
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const totalMins = toMins(clockOutTime) - toMins(clockInTime);
    if (totalMins <= 0) return null;
    let breakMins = 0;
    if (includeBreak && breakStart && breakEnd) {
      breakMins = Math.max(0, toMins(breakEnd) - toMins(breakStart));
    }
    const workMins = totalMins - breakMins;
    const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
    return { total: fmt(totalMins), break: fmt(breakMins), work: fmt(workMins), workMins };
  };

  const preview = calcPreview();

  const handleManualAdd = () => {
    if (!newEntryDate || !newEntryLocation || !clockInTime || !clockOutTime) return;

    const makeTimestamp = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = parseISO(newEntryDate);
      d.setHours(h, m, 0, 0);
      return d.getTime();
    };

    const logs: TimeLog[] = [
      { id: crypto.randomUUID(), type: 'clock_in', timestamp: makeTimestamp(clockInTime), locationId: newEntryLocation },
    ];

    if (includeBreak) {
      logs.push({ id: crypto.randomUUID(), type: 'break_start', timestamp: makeTimestamp(breakStart), locationId: newEntryLocation });
      logs.push({ id: crypto.randomUUID(), type: 'break_end', timestamp: makeTimestamp(breakEnd), locationId: newEntryLocation });
    }

    logs.push({ id: crypto.randomUUID(), type: 'clock_out', timestamp: makeTimestamp(clockOutTime), locationId: newEntryLocation });

    // Sort by timestamp
    logs.sort((a, b) => a.timestamp - b.timestamp);

    setWorkDays(prev => {
      const existing = prev.find(d => d.date === newEntryDate);
      let newWorkDays: WorkDay[];
      if (existing) {
        const merged = [...existing.logs, ...logs].sort((a, b) => a.timestamp - b.timestamp);
        newWorkDays = prev.map(d => d.date === newEntryDate ? recalculateDay(d, merged) : d);
      } else {
        const newDay: WorkDay = { id: crypto.randomUUID(), date: newEntryDate, logs: [], totalWorkMinutes: 0, totalBreakMinutes: 0 };
        newWorkDays = [...prev, recalculateDay(newDay, logs)];
      }

      // Sync each new log to database
      Promise.all(logs.map(log => 
        fetch('/api/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: log.type, 
            locationId: log.locationId,
            timestamp: log.timestamp, 
            date: newEntryDate
          })
        })
      )).catch(err => console.error("Manual sync failed:", err));

      return newWorkDays;
    });

    onClose();
    setNewEntryLocation('');
    setIncludeBreak(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-slate-900 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm"
          >
            <Card className="p-8 space-y-6 shadow-2xl bg-white border border-slate-100">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-2">
                  <Plus size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Manual Entry</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Back-fill your schedule</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Entry Date</p>
                  <input 
                    type="date" 
                    value={newEntryDate}
                    onChange={(e) => setNewEntryDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clock In</p>
                    <input 
                      type="time" 
                      value={clockInTime}
                      onChange={(e) => setClockInTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clock Out</p>
                    <input 
                      type="time" 
                      value={clockOutTime}
                      onChange={(e) => setClockOutTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIncludeBreak(b => !b)}
                  className={cn(
                    "w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                    includeBreak ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-white border-slate-100 text-slate-400 hover:border-orange-200"
                  )}
                >
                  {includeBreak ? '− Remove Break' : '+ Add Break'}
                </button>

                {includeBreak && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-1">Break Start</p>
                      <input 
                        type="time" 
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="w-full px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-1">Break End</p>
                      <input 
                        type="time" 
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="w-full px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Work Site</p>
                  <div className="relative group/sel">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/sel:text-blue-500 transition-colors" />
                    <select
                      value={newEntryLocation}
                      onChange={(e) => setNewEntryLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                    >
                      <option value="">Select a Site</option>
                      {workLocations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                {preview && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours Summary</p>
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Total shift</span>
                      <span>{preview.total}</span>
                    </div>
                    {includeBreak && (
                      <div className="flex justify-between text-xs font-bold text-orange-400">
                        <span>Break</span>
                        <span>− {preview.break}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-blue-600 border-t border-slate-200 pt-1.5 mt-1">
                      <span>Net work time</span>
                      <span>{preview.work}</span>
                    </div>
                  </div>
                )}
                <Button3D 
                  color="blue" 
                  disabled={!newEntryLocation || !clockInTime || !clockOutTime}
                  onClick={handleManualAdd}
                >
                  CREATE ENTRY
                </Button3D>
                <button 
                  onClick={onClose}
                  className="py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-[10px]"
                >
                  CANCEL
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
