import React, { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Clock, Bell, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { View } from './types';
import { useWorkTracker } from './hooks/useWorkTracker';
import { useSettings } from './hooks/useSettings';
import { cn } from './lib/utils';

// Components
import { HomeView }        from './components/HomeView';
import { EntriesView }     from './components/EntriesView';
import { CalendarView }    from './components/CalendarView';
import { ReportView }      from './components/ReportView';
import { RemindersView }   from './components/RemindersView';
import { SettingsView }    from './components/SettingsView';
import { WorkStatusModal } from './components/WorkStatusModal';
import { InstallBanner }   from './components/InstallBanner';
import { BottomNavigation } from './components/BottomNavigation';
import { NotificationBell } from './components/NotificationBell';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);

  // ── hooks ──────────────────────────────────────────────────────────────────
  const tracker = useWorkTracker();
  const settings = useSettings();

  const {
    currentTime, currentStatus, workDays, reminders, activeNotification,
    today, handleAction, formatMinutes, setReminders, setActiveNotification,
    setWorkDays, breakDuration, setBreakDuration, workLocations, setWorkLocations,
    userProfile, setUserProfile, hourlyRate, setHourlyRate,
    workDaysOfWeek, setWorkDaysOfWeek, defaultWorkStart, setDefaultWorkStart,
    defaultWorkEnd, setDefaultWorkEnd, dailyStatuses, setDailyStatuses,
    defaultReminderSound, setDefaultReminderSound,
    breakCharacter, setBreakCharacter, breakDestination, setBreakDestination,
    clearAllData,
  } = tracker;

  const {
    showBreakAnimation, setShowBreakAnimation,
    dailyGoalHours,
  } = settings;

  // ── streak (same logic as HomeView) ───────────────────────────────────────
  const streak = useMemo(() => {
    let s = 0;
    let d = new Date();
    const todayStr = format(d, 'yyyy-MM-dd');
    if (!workDays.some(w => w.date === todayStr && w.logs.length > 0)) d = subDays(d, 1);
    while (true) {
      const str = format(d, 'yyyy-MM-dd');
      if (!workDays.find(w => w.date === str && w.totalWorkMinutes > 0)) break;
      s++;
      d = subDays(d, 1);
    }
    return s;
  }, [workDays]);

  const todayHours = today.totalWorkMinutes / 60;

  // ── session timer ──────────────────────────────────────────────────────────
  const sessionDuration = useMemo(() => {
    const logs = today.logs;
    if (!logs.length) return null;
    let lastInIndex = -1;
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].type === 'clock_in') { lastInIndex = i; break; }
    }
    if (lastInIndex === -1) return null;
    const startTime = logs[lastInIndex].timestamp;
    if (currentStatus !== 'clocked_out') return currentTime.getTime() - startTime;
    const lastOut = logs.slice(lastInIndex).find(l => l.type === 'clock_out');
    return lastOut ? lastOut.timestamp - startTime : null;
  }, [today.logs, currentStatus, currentTime]);

  const formatSessionTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  // ── notification alerts ────────────────────────────────────────────────────
  const notificationAlerts = useMemo(() => {
    const alerts: { label: string; time: string }[] = [];
    const timeStr  = format(currentTime, 'HH:mm');
    const isWorkDay = workDaysOfWeek.includes(currentTime.getDay());
    const todayStr  = format(currentTime, 'yyyy-MM-dd');
    const todayStatus = dailyStatuses.find(s => s.date === todayStr);
    const isWorking = todayStatus ? todayStatus.isWorking : isWorkDay;

    if (isWorking && timeStr > defaultWorkStart && today.logs.length === 0)
      alerts.push({ label: 'Forgot to clock in', time: defaultWorkStart });

    if (isWorkDay && timeStr > defaultWorkEnd && currentStatus === 'clocked_in')
      alerts.push({ label: 'Forgot to clock out', time: defaultWorkEnd });

    if (currentStatus === 'on_break') {
      const lastBreakStart = today.logs.findLast(l => l.type === 'break_start')?.timestamp;
      if (lastBreakStart) {
        const elapsed = (currentTime.getTime() - lastBreakStart) / 60000;
        if (elapsed > breakDuration) {
          alerts.push({ label: 'Break time exceeded', time: format(new Date(lastBreakStart + breakDuration * 60000), 'HH:mm') });
        }
      }
    }
    return alerts;
  }, [currentTime, today.logs, currentStatus, defaultWorkStart, defaultWorkEnd, breakDuration, workDaysOfWeek, dailyStatuses]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-24">
      <InstallBanner />

      <WorkStatusModal
        workDaysOfWeek={workDaysOfWeek}
        dailyStatuses={dailyStatuses}
        setDailyStatuses={setDailyStatuses}
        workLocations={workLocations}
        onLocationSelect={setSelectedLocationId}
        todayLogs={today.logs}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black tracking-tighter text-blue-600 flex items-center gap-2">
          <Clock className="fill-blue-600 text-white" size={24} />
          PUNCHIN
        </h1>

        {/* Session timer */}
        {sessionDuration !== null && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <div className={cn('w-1.5 h-1.5 rounded-full', currentStatus === 'clocked_out' ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse')} />
              <span className="text-xs font-black font-mono tracking-tighter text-slate-600">{formatSessionTime(sessionDuration)}</span>
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Session</p>
          </div>
        )}

        {/* Bell */}
        <NotificationBell
          status={currentStatus}
          todayHours={todayHours}
          streak={streak}
        />
      </header>

      {/* ── Main content ── */}
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
                currentTime={currentTime}
                currentStatus={currentStatus}
                handleAction={(type, locId) => handleAction(type, locId || selectedLocationId)}
                today={today}
                workDays={workDays}
                formatMinutes={formatMinutes}
                breakDuration={breakDuration}
                setBreakDuration={setBreakDuration}
                workLocations={workLocations}
                selectedLocationId={selectedLocationId}
                setSelectedLocationId={setSelectedLocationId}
                dailyStatuses={dailyStatuses}
                userProfile={userProfile}
                hourlyRate={hourlyRate}
                showBreakAnimation={showBreakAnimation}
                breakCharacter={breakCharacter}
                breakDestination={breakDestination}
                dailyGoalHours={dailyGoalHours}
              />
            )}
            {view === 'entries' && (
              <EntriesView
                workDays={workDays}
                setWorkDays={setWorkDays}
                formatMinutes={formatMinutes}
                workLocations={workLocations}
              />
            )}
            {view === 'calendar' && (
              <CalendarView
                workDays={workDays}
                formatMinutes={formatMinutes}
                workLocations={workLocations}
                defaultWorkStart={defaultWorkStart}
                defaultWorkEnd={defaultWorkEnd}
                breakDuration={breakDuration}
              />
            )}
            {view === 'report' && (
              <ReportView
                workDays={workDays}
                setWorkDays={setWorkDays}
                defaultWorkStart={defaultWorkStart}
                defaultWorkEnd={defaultWorkEnd}
                breakDuration={breakDuration}
                workLocations={workLocations}
                userProfile={userProfile}
                hourlyRate={hourlyRate}
              />
            )}
            {view === 'settings' && (
              <SettingsView
                setView={setView}
                clearAllData={clearAllData}
                breakDuration={breakDuration}
                setBreakDuration={setBreakDuration}
                workLocations={workLocations}
                setWorkLocations={setWorkLocations}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                hourlyRate={hourlyRate}
                setHourlyRate={setHourlyRate}
                workDaysOfWeek={workDaysOfWeek}
                setWorkDaysOfWeek={setWorkDaysOfWeek}
                defaultWorkStart={defaultWorkStart}
                setDefaultWorkStart={setDefaultWorkStart}
                defaultWorkEnd={defaultWorkEnd}
                setDefaultWorkEnd={setDefaultWorkEnd}
                defaultReminderSound={defaultReminderSound}
                setDefaultReminderSound={setDefaultReminderSound}
                showBreakAnimation={showBreakAnimation}
                setShowBreakAnimation={setShowBreakAnimation}
                breakCharacter={breakCharacter}
                setBreakCharacter={setBreakCharacter}
                breakDestination={breakDestination}
                setBreakDestination={setBreakDestination}
              />
            )}
            {view === 'reminders' && (
              <RemindersView
                reminders={reminders}
                setReminders={setReminders}
                setView={setView}
                defaultReminderSound={defaultReminderSound}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNavigation activeView={view} onViewChange={setView} />

      {/* ── Reminder toast ── */}
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
                <div className="p-2 bg-white/20 rounded-xl"><Bell size={24} /></div>
                <div>
                  <p className="font-bold">{activeNotification.label}</p>
                  <p className="text-xs opacity-80">
                    {activeNotification.type === 'fixed' ? `It's ${activeNotification.time}!` : `Every ${activeNotification.intervalMinutes}m`}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveNotification(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl">
                <Check size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
