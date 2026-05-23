import { createContext, useContext, type ReactNode } from 'react';
import { useWorkTracker } from '../hooks/useWorkTracker';
import { useSettings } from '../hooks/useSettings';
import { useThemeEffect } from '../hooks/useThemeEffect';

type PunchInContextValue = ReturnType<typeof useWorkTracker> & ReturnType<typeof useSettings>;

const PunchInContext = createContext<PunchInContextValue | null>(null);

export function PunchInProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  useThemeEffect(settings.theme);
  const tracker = useWorkTracker({
    notificationsEnabled: settings.notificationsEnabled,
  });

  return (
    <PunchInContext.Provider value={{ ...tracker, ...settings }}>
      {children}
    </PunchInContext.Provider>
  );
}

export function usePunchIn(): PunchInContextValue {
  const ctx = useContext(PunchInContext);
  if (!ctx) {
    throw new Error('usePunchIn must be used within PunchInProvider');
  }
  return ctx;
}
