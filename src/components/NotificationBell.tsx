import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react'; // project uses motion/react

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'success' | 'info' | 'warning';
}

interface NotificationBellProps {
  status: 'clocked_in' | 'on_break' | 'clocked_out';
  todayHours: number;
  streak: number;
}

export function NotificationBell({ status, todayHours, streak }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const lastBreakReminder = useRef<number>(Date.now());

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notif: Omit<AppNotification, 'id' | 'time'>) => {
    setNotifications(prev => {
      // Deduplicate by title — don't re-add the same notification
      if (prev.some(n => n.title === notif.title && !n.read)) return prev;
      return [{ ...notif, id: Date.now().toString(), time: 'Just now' }, ...prev].slice(0, 12);
    });
  };

  // ── Real-time triggers ────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Daily goal reached (8h window: 8.0–8.5 to avoid re-firing)
    if (todayHours >= 8 && todayHours < 8.5) {
      addNotification({
        title: '🎉 Daily Goal Reached!',
        message: `You've worked ${todayHours.toFixed(1)} hours today. Amazing!`,
        read: false,
        type: 'success',
      });
    }

    // 2. Break reminder — every 2h while clocked in
    if (status === 'clocked_in') {
      const now = Date.now();
      if (now - lastBreakReminder.current > 2 * 60 * 60 * 1000) {
        addNotification({
          title: '⏰ Break Time',
          message: "You've been focused for over 2 hours. Time for a quick break?",
          read: false,
          type: 'warning',
        });
        lastBreakReminder.current = now;
      }
    }

    // 3. Shift completed
    if (status === 'clocked_out' && todayHours >= 4) {
      addNotification({
        title: '✅ Shift Completed',
        message: `Great job today! You worked ${todayHours.toFixed(1)} hours.`,
        read: false,
        type: 'success',
      });
    }

    // 4. Streak milestones (every 3 days)
    if (streak >= 3 && streak % 3 === 0) {
      addNotification({
        title: '🔥 Streak Milestone',
        message: `You're on a ${streak}-day streak! Keep the momentum going!`,
        read: false,
        type: 'success',
      });
    }
  }, [status, todayHours, streak]);

  const markAsRead    = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllAsRead = ()           => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const typeAccent: Record<AppNotification['type'], string> = {
    success: 'border-l-2 border-emerald-400',
    info:    'border-l-2 border-blue-400',
    warning: 'border-l-2 border-amber-400',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="relative w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all active:scale-90"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 border-2 border-white text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-11 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800">
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell size={28} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/60' : ''} ${typeAccent[n.type]}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-xs font-black leading-tight ${!n.read ? 'text-slate-800' : 'text-slate-500'}`}>
                          {n.title}
                        </p>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap font-bold uppercase tracking-wider shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                <button onClick={() => setIsOpen(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
                  Dismiss
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
