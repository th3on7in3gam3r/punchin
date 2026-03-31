import React, { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { WorkLocation, DailyStatus, WorkDay } from '../types';
import { Card } from './common/Card';
import { Button3D } from './common/Button3D';
import { MapPin, Calendar, HeartPulse, PartyPopper, HelpCircle, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

const HOLIDAYS_2026 = [
  { date: '2026-05-25', name: 'Memorial Day' },
  { date: '2026-07-04', name: 'Independence Day' },
  { date: '2026-09-07', name: 'Labor Day' },
  { date: '2026-11-26', name: 'Thanksgiving' },
  { date: '2026-12-25', name: 'Christmas' },
];

interface WorkStatusModalProps {
  workDaysOfWeek: number[];
  dailyStatuses: DailyStatus[];
  setDailyStatuses: React.Dispatch<React.SetStateAction<DailyStatus[]>>;
  workLocations: WorkLocation[];
  onLocationSelect: (locationId: string) => void;
  todayLogs: any[]; // Passing today.logs
}

export const WorkStatusModal = ({
  workDaysOfWeek,
  dailyStatuses,
  setDailyStatuses,
  workLocations,
  onLocationSelect,
  todayLogs
}: WorkStatusModalProps) => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<'working' | 'location' | 'reason'>('working');
  const [selectedReason, setSelectedReason] = useState<DailyStatus['reason'] | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [holidayDate, setHolidayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [holidayName, setHolidayName] = useState('');
  
  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay();
  
  const holiday = HOLIDAYS_2026.find(h => h.date === dateStr);
  const isWorkDay = workDaysOfWeek.includes(dayOfWeek) || holiday;
  const alreadyAnswered = dailyStatuses.some(s => s.date === dateStr);
  const hasLogs = todayLogs.length > 0;

  useEffect(() => {
    // Only show if it's a workday, not already answered, and no logs exist yet
    if (isWorkDay && !alreadyAnswered && !hasLogs) {
      setShow(true);
    }
  }, [isWorkDay, alreadyAnswered, hasLogs]);

  const handleWorkingResponse = (isWorking: boolean) => {
    if (isWorking) {
      if (workLocations.length > 1) {
        setStep('location');
      } else {
        const locationId = workLocations[0]?.id || 'default';
        saveStatus(true, undefined, locationId);
        onLocationSelect(locationId);
      }
    } else {
      setStep('reason');
    }
  };

  const saveStatus = (isWorking: boolean, reason?: DailyStatus['reason'], locationId?: string) => {
    const newStatus: DailyStatus = {
      date: reason === 'holiday' ? holidayDate : dateStr,
      isWorking,
      reason,
      customReason: reason === 'holiday' ? holidayName : (reason === 'other' ? customReason : undefined),
      locationId
    };
    
    setDailyStatuses(prev => {
      // Overwrite if same date exists, otherwise append
      const filtered = prev.filter(s => s.date !== (reason === 'holiday' ? holidayDate : dateStr));
      return [...filtered, newStatus];
    });
    
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card className="p-8 space-y-6 shadow-2xl border-blue-100">
          {step === 'working' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-2 rotate-3">
                <Calendar size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-slate-800">Working Today?</h3>
                {holiday && (
                  <p className="text-blue-600 font-bold text-sm bg-blue-50 py-1 px-3 rounded-full inline-block">
                    Today is {holiday.name}
                  </p>
                )}
                <p className="text-slate-500 text-sm">It's a scheduled work day. Will you be clocking in?</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button3D color="blue" onClick={() => handleWorkingResponse(true)}>
                  YES, I'M WORKING
                </Button3D>
                <button 
                  onClick={() => handleWorkingResponse(false)}
                  className="py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  NO, NOT TODAY
                </button>
              </div>
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Select Location</h3>
                <p className="text-slate-500 text-sm">Which HQ are you working from today?</p>
              </div>
              <div className="space-y-3">
                {workLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      saveStatus(true, undefined, loc.id);
                      onLocationSelect(loc.id);
                    }}
                    className="w-full p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl text-left transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-blue-500 shadow-sm">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 group-hover:text-blue-700">{loc.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{loc.address}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'reason' && (
            <div className="space-y-6">
              <div className="text-center space-y-2 relative">
                <button 
                  onClick={() => setStep('working')}
                  className="absolute left-0 top-0 text-slate-400 hover:text-slate-600 p-2"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 className="text-xl font-bold text-slate-800">Reason for Absence</h3>
                <p className="text-slate-500 text-sm">Why aren't you working today?</p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
                {/* Sick Option */}
                <button
                  onClick={() => saveStatus(false, 'sick')}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all group",
                    selectedReason === 'sick' ? "bg-rose-100 border-rose-200" : "bg-rose-50 hover:bg-rose-100 border border-rose-100"
                  )}
                >
                  <div className="p-2 bg-white rounded-lg text-rose-500 shadow-sm">
                    <HeartPulse size={20} />
                  </div>
                  <span className="font-bold text-rose-700">Sick / Emergency</span>
                </button>
                
                {/* Holiday Option */}
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedReason(selectedReason === 'holiday' ? null : 'holiday')}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all group",
                      selectedReason === 'holiday' ? "bg-amber-100 border-amber-200 shadow-sm" : "bg-amber-50 hover:bg-amber-100 border border-amber-100"
                    )}
                  >
                    <div className="p-2 bg-white rounded-lg text-amber-500 shadow-sm">
                      <PartyPopper size={20} />
                    </div>
                    <span className="font-bold text-amber-700">Holiday / Vacation</span>
                  </button>
                  
                  <AnimatePresence>
                    {selectedReason === 'holiday' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Holiday Name</p>
                            <input 
                              type="text"
                              placeholder="e.g. Christmas, Family Trip"
                              value={holidayName}
                              onChange={(e) => setHolidayName(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Holiday Date</p>
                            <input 
                              type="date"
                              value={holidayDate}
                              onChange={(e) => setHolidayDate(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
                            />
                          </div>
                          <Button3D 
                            color="blue" 
                            disabled={!holidayName.trim()}
                            onClick={() => saveStatus(false, 'holiday')}
                            className="text-xs py-2.5"
                          >
                            CONFIRM HOLIDAY
                          </Button3D>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Other Option */}
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedReason(selectedReason === 'other' ? null : 'other')}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all group",
                      selectedReason === 'other' ? "bg-slate-200 border-slate-300 shadow-sm" : "bg-slate-50 hover:bg-slate-100 border border-slate-100"
                    )}
                  >
                    <div className="p-2 bg-white rounded-lg text-slate-500 shadow-sm">
                      <HelpCircle size={20} />
                    </div>
                    <span className="font-bold text-slate-700">Other Reason</span>
                  </button>

                  <AnimatePresence>
                    {selectedReason === 'other' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Specify Details</p>
                            <input 
                              type="text"
                              placeholder="Why are you not working?"
                              value={customReason}
                              onChange={(e) => setCustomReason(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                          </div>
                          <Button3D 
                            color="blue" 
                            disabled={!customReason.trim()}
                            onClick={() => saveStatus(false, 'other')}
                            className="text-xs py-2.5"
                          >
                            SUBMIT REASON
                          </Button3D>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};
