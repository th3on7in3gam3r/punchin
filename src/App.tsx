import React, { useState, useMemo } from 'react';
import { Clock, Bell, Check } from 'lucide-react';
import { calcStreak, getSessionDurationMs } from './lib/workDayStats';
import { motion, AnimatePresence } from 'motion/react';
import { View } from './types';
import { PunchInProvider, usePunchIn } from './contexts/PunchInContext';
import { cn } from './lib/utils';

import { HomeView } from './components/HomeView';
import { EntriesView } from './components/EntriesView';
import { CalendarView } from './components/CalendarView';
import { ReportView } from './components/ReportView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { WorkStatusModal } from './components/WorkStatusModal';
import { InstallBanner } from './components/InstallBanner';
import { BottomNavigation } from './components/BottomNavigation';
import { NotificationBell } from './components/NotificationBell';

function AppShell() {
  const [view, setView] = useState<View>('home');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);

  const {
    currentTime,
    currentStatus,
    workDays,
    activeNotification,
    today,
    setActiveNotification,
  } = usePunchIn();

  const streak = useMemo(() => calcStreak(workDays), [workDays]);
  const todayHours = today.totalWorkMinutes / 60;

  const sessionDuration = useMemo(
    () => getSessionDurationMs(today.logs, currentStatus, currentTime),
    [today.logs, currentStatus, currentTime],
  );

  const formatSessionTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans pb-24">
      <InstallBanner />

      <WorkStatusModal
        onLocationSelect={setSelectedLocationId}
      />

      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black tracking-tighter text-blue-600 flex items-center gap-2">
          <Clock className="fill-blue-600 text-white" size={24} />
          PUNCHIN
        </h1>

        {sessionDuration !== null && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  currentStatus === 'clocked_out' ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse',
                )}
              />
              <span className="text-xs font-black font-mono tracking-tighter text-slate-600 dark:text-slate-300">
                {formatSessionTime(sessionDuration)}
              </span>
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Session
            </p>
          </div>
        )}

        <NotificationBell status={currentStatus} todayHours={todayHours} streak={streak} />
      </header>

      <main className="max-w-md mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'home' && (
              <HomeView
                selectedLocationId={selectedLocationId}
                setSelectedLocationId={setSelectedLocationId}
              />
            )}
            {view === 'entries' && <EntriesView />}
            {view === 'calendar' && <CalendarView />}
            {view === 'report' && <ReportView />}
            {view === 'settings' && <SettingsView setView={setView} />}
            {view === 'reminders' && <RemindersView setView={setView} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNavigation activeView={view} onViewChange={setView} />

      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-6 right-6 z-50"
          >
            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Bell size={24} />
                </div>
                <div>
                  <p className="font-bold">{activeNotification.label}</p>
                  <p className="text-xs opacity-80">
                    {activeNotification.type === 'fixed'
                      ? `It's ${activeNotification.time}!`
                      : `Every ${activeNotification.intervalMinutes}m`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveNotification(null)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl"
              >
                <Check size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <PunchInProvider>
      <AppShell />
    </PunchInProvider>
  );
}
