import React, { useState } from 'react';
import { Bell, User, Clock, Trash2, Pause, Check, Plus, MapPin, X, Volume2, DollarSign, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { View, WorkDay, EntryStatus, WorkLocation, UserProfile } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { cn } from '../lib/utils';
import { SOUNDS } from '../constants';

export const SettingsView = ({ 
  setView, 
  clearAllData, 
  breakDuration, 
  setBreakDuration,
  workLocations,
  setWorkLocations,
  userProfile,
  setUserProfile,
  workDaysOfWeek,
  setWorkDaysOfWeek,
  defaultWorkStart,
  setDefaultWorkStart,
  defaultWorkEnd,
  setDefaultWorkEnd,
  defaultReminderSound,
  setDefaultReminderSound
}: {
  setView: (view: View) => void;
  clearAllData: () => void;
  breakDuration: 15 | 30 | 60;
  setBreakDuration: (val: 15 | 30 | 60) => void;
  workLocations: WorkLocation[];
  setWorkLocations: (locations: WorkLocation[]) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  workDaysOfWeek: number[];
  setWorkDaysOfWeek: (days: number[]) => void;
  defaultWorkStart: string;
  setDefaultWorkStart: (val: string) => void;
  defaultWorkEnd: string;
  setDefaultWorkEnd: (val: string) => void;
  defaultReminderSound: string;
  setDefaultReminderSound: (val: string) => void;
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  
  // Local Settings State
  const [localBreakDuration, setLocalBreakDuration] = useState(breakDuration);
  const [localWorkLocations, setLocalWorkLocations] = useState(workLocations);
  const [localProfile, setLocalProfile] = useState(userProfile);
  const [localDaysOfWeek, setLocalDaysOfWeek] = useState(workDaysOfWeek);
  const [localStart, setLocalStart] = useState(defaultWorkStart);
  const [localEnd, setLocalEnd] = useState(defaultWorkEnd);
  const [localReminderSound, setLocalReminderSound] = useState(defaultReminderSound);

  // UI State
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  const toggleWorkDay = (day: number) => {
    if (localDaysOfWeek.includes(day)) {
      setLocalDaysOfWeek(localDaysOfWeek.filter(d => d !== day));
    } else {
      setLocalDaysOfWeek([...localDaysOfWeek, day].sort());
    }
  };

  const addLocation = () => {
    if (!newLocationName || !newLocationAddress) return;
    const newLoc: WorkLocation = {
      id: crypto.randomUUID(),
      name: newLocationName,
      address: newLocationAddress
    };
    setLocalWorkLocations([...localWorkLocations, newLoc]);
    setNewLocationName('');
    setNewLocationAddress('');
    setIsAdding(false);
  };

  const removeLocation = (id: string) => {
    setLocalWorkLocations(localWorkLocations.filter(loc => loc.id !== id));
  };

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  const handleGlobalSave = () => {
    setBreakDuration(localBreakDuration);
    setWorkLocations(localWorkLocations);
    setUserProfile(localProfile);
    setWorkDaysOfWeek(localDaysOfWeek);
    setDefaultWorkStart(localStart);
    setDefaultWorkEnd(localEnd);
    setDefaultReminderSound(localReminderSound);
    
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
    setIsEditingProfile(false);
    setIsEditingSchedule(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
      
      <div className="space-y-4">
        {/* Work Locations Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <MapPin size={20} />
              </div>
              <p className="font-bold text-slate-700">Work Locations</p>
            </div>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-blue-600"
            >
              {isAdding ? <X size={20} /> : <Plus size={20} />}
            </button>
          </div>

          <div className="space-y-3">
            {localWorkLocations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                <div>
                  <p className="text-sm font-bold text-slate-700">{loc.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{loc.address}</p>
                </div>
                <button 
                  onClick={() => removeLocation(loc.id)}
                  className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {isAdding && (
            <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
              <input 
                type="text" 
                placeholder="Location Name (e.g., HQ 1)"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
              <input 
                type="text" 
                placeholder="Address"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <Button3D color="green" onClick={addLocation} className="flex-1 py-2 text-xs">
                  SAVE LOCATION
                </Button3D>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <Pause size={20} />
            </div>
            <p className="font-bold text-slate-700">Break Duration</p>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Break Duration</p>
            <div className="flex gap-2">
              {[15, 30, 60].map((dur) => (
                <button
                  key={dur}
                  onClick={() => setLocalBreakDuration(dur as any)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-sm font-black transition-all border-2",
                    localBreakDuration === dur 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-blue-200"
                  )}
                >
                  {dur}m
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Bell size={20} />
            </div>
            <p className="font-bold text-slate-700">Reminder Settings</p>
          </div>
          
          <div className="space-y-4">
            <div 
              className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors"
              onClick={() => setView('reminders')}
            >
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">Manage Reminders</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Set work & break alerts</p>
              </div>
              <Plus size={16} className="text-blue-500" />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Default Sound</label>
                <div className="flex items-center gap-2">
                  <select 
                    value={localReminderSound}
                    onChange={(e) => {
                      setLocalReminderSound(e.target.value);
                      playSound(e.target.value);
                    }}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {SOUNDS.map(s => (
                      <option key={s.name} value={s.url}>{s.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => playSound(localReminderSound)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div 
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
          >
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <User size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-700">Profile Settings</p>
              <p className="text-xs text-slate-500">
                {localProfile.name ? `${localProfile.name} (${localProfile.employeeId || 'No ID'})` : 'Manage your personal info'}
              </p>
            </div>
            <Plus size={20} className={cn("text-blue-600 transition-transform", isEditingProfile && "rotate-45")} />
          </div>

          {isEditingProfile && (
            <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Your Name"
                  value={localProfile.name}
                  onChange={(e) => setLocalProfile({...localProfile, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Employee ID</label>
                <input 
                  type="text" 
                  placeholder="ID Number"
                  value={localProfile.employeeId}
                  onChange={(e) => setLocalProfile({...localProfile, employeeId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Hourly Rate ($)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={localProfile.hourlyRate || ''}
                      onChange={(e) => setLocalProfile({...localProfile, hourlyRate: parseFloat(e.target.value)})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tax Rate (%)</label>
                   <div className="relative">
                    <Percent size={14} className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="number" 
                      placeholder="0"
                      value={localProfile.taxRate || ''}
                      onChange={(e) => setLocalProfile({...localProfile, taxRate: parseFloat(e.target.value)})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div 
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => setIsEditingSchedule(!isEditingSchedule)}
          >
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Clock size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-700">Work Schedule</p>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-slate-500">
                  {localDaysOfWeek.length === 7 ? 'Every day' : 
                   localDaysOfWeek.length === 0 ? 'No days set' :
                   localDaysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                </p>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                  {localStart} - {localEnd}
                </p>
              </div>
            </div>
            <Plus size={20} className={cn("text-blue-600 transition-transform", isEditingSchedule && "rotate-45")} />
          </div>

          {isEditingSchedule && (
            <div className="pt-4 border-t border-slate-100 space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Default Start</label>
                  <input 
                    type="time" 
                    value={localStart}
                    onChange={(e) => setLocalStart(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Default End</label>
                  <input 
                    type="time" 
                    value={localEnd}
                    onChange={(e) => setLocalEnd(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Working Days</p>
                <div className="flex justify-between gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <button
                      key={i}
                      onClick={() => toggleWorkDay(i)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all border-2",
                        localDaysOfWeek.includes(i)
                          ? "bg-blue-600 border-blue-600 text-white shadow-md font-black"
                          : "bg-white border-slate-100 text-slate-400 hover:border-blue-200"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 italic">
                These defaults help calculate expected hours and pre-fill logs.
              </p>
            </div>
          )}
        </Card>

        <Card 
          className="flex items-center gap-4 cursor-pointer hover:bg-rose-50 transition-colors border-rose-100"
          onClick={() => setShowConfirm(true)}
        >
          <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
            <Trash2 size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-rose-700">Clear All Data</p>
            <p className="text-xs text-rose-500">Reset the application</p>
          </div>
        </Card>
      </div>

      <div className="sticky bottom-4 pt-4 animate-in slide-in-from-bottom-4 duration-500">
        <Button3D color="blue" onClick={handleGlobalSave} className="w-full py-6 flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
          <motion.div
            animate={showSaved ? { scale: [1, 1.2, 1], rotate: [0, 360, 360] } : {}}
            transition={{ duration: 0.5 }}
          >
            {showSaved ? <Check size={24} /> : <div className="w-3 h-3 bg-white rounded-full animate-pulse" />}
          </motion.div>
          <span className="text-sm font-black tracking-[0.2em]">{showSaved ? 'SETTINGS SAVED!' : 'SAVE ALL SETTINGS'}</span>
        </Button3D>
      </div>

      <div className="pt-8 text-center pb-12">
        <p className="text-xs text-slate-400">PunchIn Tracker Pro • v1.2.0</p>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Clear All Data?</h3>
                <p className="text-slate-500">This action cannot be undone. All your work logs and settings will be permanently deleted.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button3D 
                  color="red" 
                  onClick={() => {
                    clearAllData();
                    setShowConfirm(false);
                  }}
                >
                  YES, CLEAR EVERYTHING
                </Button3D>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="py-3 text-slate-500 font-bold hover:text-slate-800 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
