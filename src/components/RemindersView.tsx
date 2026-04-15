import React, { useState } from 'react';
import { ChevronLeft, Plus, Volume2, Trash2, X, Bell, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Reminder, View } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { SOUNDS } from '../constants';

export const RemindersView = ({ reminders, setReminders, setView, defaultReminderSound }: {
  reminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
  setView: (view: View) => void;
  defaultReminderSound: string;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: 'Work Start',
    type: 'fixed',
    time: '09:00',
    intervalMinutes: 30,
    days: [1, 2, 3, 4, 5],
    enabled: true,
    sound: defaultReminderSound
  });

  const saveReminder = () => {
    if (editingReminderId) {
      setReminders(reminders.map(r => r.id === editingReminderId ? {
        ...r,
        label: newReminder.label || r.label,
        type: newReminder.type || r.type,
        time: newReminder.type === 'fixed' ? (newReminder.time || r.time) : undefined,
        intervalMinutes: newReminder.type === 'interval' ? (newReminder.intervalMinutes || r.intervalMinutes) : undefined,
        days: newReminder.days || r.days,
        sound: newReminder.sound || r.sound
      } as Reminder : r));
    } else {
      const reminder: Reminder = {
        id: crypto.randomUUID(),
        label: newReminder.label || 'Reminder',
        type: newReminder.type || 'fixed',
        time: newReminder.type === 'fixed' ? (newReminder.time || '09:00') : undefined,
        intervalMinutes: newReminder.type === 'interval' ? (newReminder.intervalMinutes || 30) : undefined,
        days: newReminder.days || [1, 2, 3, 4, 5],
        enabled: true,
        sound: newReminder.sound || defaultReminderSound
      };
      setReminders([...reminders, reminder]);
    }
    setIsAdding(false);
    setEditingReminderId(null);
  };

  const startEdit = (reminder: Reminder) => {
    setNewReminder(reminder);
    setEditingReminderId(reminder.id);
    setIsAdding(true);
  };

  const toggleDay = (day: number) => {
    const currentDays = newReminder.days || [];
    if (currentDays.includes(day)) {
      setNewReminder({ ...newReminder, days: currentDays.filter(d => d !== day) });
    } else {
      setNewReminder({ ...newReminder, days: [...currentDays, day] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('settings')} className="p-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Reminders</h2>
        <button onClick={() => setIsAdding(true)} className="p-2 bg-blue-50 text-blue-600 rounded-full">
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {reminders.map(r => (
          <div key={r.id}>
            <Card className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800">{r.label}</p>
                  <span className="text-xs text-slate-400">
                    {r.type === 'fixed' ? r.time : `Every ${r.intervalMinutes}m`}
                  </span>
                </div>
                <div className="flex gap-1 mt-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i} className={cn(
                      "text-[10px] w-4 h-4 flex items-center justify-center rounded-full",
                      r.days.includes(i) ? "bg-blue-100 text-blue-600 font-bold" : "text-slate-300"
                    )}>{d}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => startEdit(r)}
                  className="p-2 text-slate-400 hover:text-blue-500"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => {
                    const audio = new Audio(r.sound);
                    audio.play();
                  }}
                  className="p-2 text-slate-400 hover:text-blue-500"
                >
                  <Volume2 size={18} />
                </button>
                <button 
                  onClick={() => setReminders(reminders.filter(rem => rem.id !== r.id))}
                  className="p-2 text-slate-400 hover:text-rose-500"
                >
                  <Trash2 size={18} />
                </button>
                <div 
                  onClick={() => setReminders(reminders.map(rem => rem.id === r.id ? { ...rem, enabled: !rem.enabled } : rem))}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-all cursor-pointer ml-2",
                    r.enabled ? "bg-emerald-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                    r.enabled ? "right-1" : "left-1"
                  )} />
                </div>
              </div>
            </Card>
          </div>
        ))}
        {reminders.length === 0 && !isAdding && (
          <div className="text-center py-12 text-slate-400">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p>No reminders set yet.</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 100 }} 
            animate={{ y: 0 }}
            className="bg-white w-full max-w-md rounded-3xl p-6 space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingReminderId ? 'Edit Reminder' : 'New Reminder'}</h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingReminderId(null);
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setNewReminder({ ...newReminder, type: 'fixed' })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                      newReminder.type === 'fixed' ? "bg-blue-500 text-white border-blue-500" : "bg-slate-50 text-slate-400 border-slate-100"
                    )}
                  >
                    Fixed Time
                  </button>
                  <button
                    onClick={() => setNewReminder({ ...newReminder, type: 'interval' })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                      newReminder.type === 'interval' ? "bg-blue-500 text-white border-blue-500" : "bg-slate-50 text-slate-400 border-slate-100"
                    )}
                  >
                    Interval
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Label</label>
                <input 
                  type="text" 
                  value={newReminder.label}
                  onChange={e => setNewReminder({ ...newReminder, label: e.target.value })}
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {newReminder.type === 'fixed' ? (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</label>
                  <input 
                    type="time" 
                    value={newReminder.time}
                    onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
                    className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interval (Minutes)</label>
                  <input 
                    type="number" 
                    value={newReminder.intervalMinutes}
                    onChange={e => setNewReminder({ ...newReminder, intervalMinutes: parseInt(e.target.value) })}
                    className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Days</label>
                <div className="flex justify-between mt-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "w-10 h-10 rounded-xl font-bold transition-all",
                        newReminder.days?.includes(i) ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-slate-50 text-slate-400"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sound</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SOUNDS.map(s => (
                    <button
                      key={s.name}
                      onClick={() => {
                        setNewReminder({ ...newReminder, sound: s.url });
                        new Audio(s.url).play();
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-sm font-medium transition-all",
                        newReminder.sound === s.url ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-100 text-slate-500"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button3D 
              color="blue" 
              onClick={saveReminder} 
              className="w-full py-4 text-sm font-black tracking-widest"
            >
              {editingReminderId ? 'UPDATE REMINDER' : 'SAVE REMINDER'}
            </Button3D>
          </motion.div>
        </div>
      )}
    </div>
  );
};
