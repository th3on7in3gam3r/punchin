import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MapPin, Plus, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkDay, WorkLocation, TimeLog } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workLocations: WorkLocation[];
  setWorkDays: React.Dispatch<React.SetStateAction<WorkDay[]>>;
}

export const ManualEntryModal = ({ isOpen, onClose, workLocations, setWorkDays }: ManualEntryModalProps) => {
  const [newEntryDate, setNewEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEntryLocation, setNewEntryLocation] = useState<string>('');
  const [newEntryTime, setNewEntryTime] = useState('09:00');

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

  const handleManualAdd = () => {
    if (!newEntryDate || !newEntryLocation || !newEntryTime) return;

    const [h, m] = newEntryTime.split(':').map(Number);
    const date = parseISO(newEntryDate);
    date.setHours(h, m);

    const newLog: TimeLog = {
      id: crypto.randomUUID(),
      type: 'clock_in',
      timestamp: date.getTime(),
      locationId: newEntryLocation
    };

    setWorkDays(prev => {
      const existing = prev.find(d => d.date === newEntryDate);
      if (existing) {
        return prev.map(d => d.date === newEntryDate ? recalculateDay(d, [...d.logs, newLog]) : d);
      } else {
        const newDay: WorkDay = {
          id: crypto.randomUUID(),
          date: newEntryDate,
          logs: [newLog],
          totalWorkMinutes: 0,
          totalBreakMinutes: 0
        };
        return [...prev, recalculateDay(newDay, [newLog])];
      }
    });

    onClose();
    setNewEntryLocation('');
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

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Clock In Time</p>
                  <input 
                    type="time" 
                    value={newEntryTime}
                    onChange={(e) => setNewEntryTime(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>

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
                <Button3D 
                  color="blue" 
                  disabled={!newEntryLocation}
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
