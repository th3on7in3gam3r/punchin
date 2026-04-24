import { useState } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react'; // project uses motion/react, not framer-motion

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'success' | 'info' | 'warning';
}

const typeColors = {
  success: 'bg-emerald-50 border-l-4 border-emerald-400',
  info:    'bg-blue-50 border-l-4 border-blue-400',
  warning: 'bg-amber-50 border-l-4 border-amber-400',
};

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Great Work Today!',
    message: "You completed 8 hours — your best day this week 🔥",
    time: 'Just now',
    read: false,
    type: 'success',
  },
  {
    id: '2',
    title: 'Break Suggestion',
    message: "You've been working for 3 hours straight. Consider taking a break soon.",
    time: '1h ago',
    read: false,
    type: 'info',
  },
  {
    id: '3',
    title: 'Weekly Goal Progress',
    message: "You're at 87% of your weekly goal. Keep it going!",
    time: 'Yesterday',
    read: true,
    type: 'info',
  },
];

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllAsRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

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
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/60' : ''}`}
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
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                >
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
