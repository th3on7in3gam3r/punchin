import type { TimeLog } from '../types';

export function punchHaptic(type: TimeLog['type']) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (type === 'clock_out') navigator.vibrate([12, 40, 12]);
  else if (type === 'break_start') navigator.vibrate(20);
  else navigator.vibrate(10);
}
