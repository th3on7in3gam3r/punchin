import React from 'react';
import { cn } from '../../lib/utils';

export const Button3D = ({ 
  children, 
  onClick, 
  color = 'blue', 
  disabled = false,
  className = ""
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  disabled?: boolean;
  className?: string;
}) => {
  const colors = {
    blue: 'bg-blue-500 shadow-[0_6px_0_0_#1d4ed8] active:shadow-[0_2px_0_0_#1d4ed8]',
    green: 'bg-emerald-500 shadow-[0_6px_0_0_#047857] active:shadow-[0_2px_0_0_#047857]',
    orange: 'bg-orange-500 shadow-[0_6px_0_0_#c2410c] active:shadow-[0_2px_0_0_#c2410c]',
    red: 'bg-rose-500 shadow-[0_6px_0_0_#be123c] active:shadow-[0_2px_0_0_#be123c]',
    gray: 'bg-slate-400 shadow-[0_6px_0_0_#64748b] active:shadow-[0_2px_0_0_#64748b]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative px-6 py-3 rounded-xl font-bold text-white transition-all active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:shadow-none",
        colors[color],
        className
      )}
    >
      {children}
    </button>
  );
};
