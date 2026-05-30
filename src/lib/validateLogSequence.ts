import type { TimeLog } from '../types';

/** Client-side mirror of server punch sequence rules. */
export function validateDayLogs(logs: TimeLog[]): { valid: boolean; error?: string } {
  if (!logs.length) return { valid: true };

  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  let state: 'out' | 'in' | 'break' = 'out';

  for (const log of sorted) {
    if (log.type === 'clock_in') {
      if (state === 'in' || state === 'break') {
        return { valid: false, error: 'Cannot clock in while already on shift' };
      }
      state = 'in';
    } else if (log.type === 'break_start') {
      if (state !== 'in') return { valid: false, error: 'Clock in before starting a break' };
      state = 'break';
    } else if (log.type === 'break_end') {
      if (state !== 'break') return { valid: false, error: 'Start a break before ending it' };
      state = 'in';
    } else if (log.type === 'clock_out') {
      if (state === 'out') return { valid: false, error: 'Clock in before clocking out' };
      if (state === 'break') return { valid: false, error: 'End break before clocking out' };
      state = 'out';
    }
  }

  return { valid: true };
}
