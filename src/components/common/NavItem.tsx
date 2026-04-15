import React from 'react';
import { cn } from '../../lib/utils';

export function NavItem({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all",
        active ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
