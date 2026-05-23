import { format } from 'date-fns';

export function getBreakTiming(
  breakStartMs: number,
  breakDurationMins: number,
  nowMs: number,
) {
  const totalMs = breakDurationMins * 60000;
  const elapsedMs = Math.max(0, nowMs - breakStartMs);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remMins = Math.floor(remainingMs / 60000);
  const remSecs = Math.floor((remainingMs % 60000) / 1000);
  const remainingFraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const elapsedFraction = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 1;
  const breakDone = remainingMs <= 0;
  const breakEndMs = breakStartMs + totalMs;

  return {
    remainingMs,
    remMins,
    remSecs,
    remainingFraction,
    elapsedFraction,
    breakDone,
    breakEndMs,
    elapsedMins: elapsedMs / 60000,
  };
}

/** Plain-language countdown, e.g. "11 minutes left" */
export function formatBreakRemainingLabel(remMins: number, remSecs: number): string {
  if (remMins <= 0 && remSecs <= 0) return 'Break complete';
  if (remMins === 0) {
    return remSecs === 1 ? '1 second left' : `${remSecs} seconds left`;
  }
  if (remSecs === 0) {
    return remMins === 1 ? '1 minute left' : `${remMins} minutes left`;
  }
  return `${remMins} min ${remSecs}s left`;
}

export function formatBreakEndTime(breakEndMs: number): string {
  return format(new Date(breakEndMs), 'h:mm a');
}
