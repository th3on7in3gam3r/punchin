import React from 'react';
import { Home, List, Calendar, BarChart3, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { View } from '../types';

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'home',     label: 'Home',     icon: Home },
  { id: 'entries',  label: 'Entries',  icon: List },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'report',   label: 'Report',   icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface BottomNavigationProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function BottomNavigation({ activeView, onViewChange }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 z-20">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id;
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.88 }}
              onClick={() => onViewChange(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <motion.div
                animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="relative"
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
                  />
                )}
              </motion.div>
              <span className={`text-[10px] font-black uppercase tracking-wider leading-none ${isActive ? 'text-blue-600' : ''}`}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
