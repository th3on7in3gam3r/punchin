import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn("bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/60 p-6", className, onClick && "cursor-pointer")}
  >
    {children}
  </div>
);
