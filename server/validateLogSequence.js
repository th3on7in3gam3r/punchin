/** Validate ordered punch sequence for one work day. */
export function validateDayLogs(logs) {
  if (!logs?.length) return { valid: true };

  const sorted = [...logs].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  let state = 'out';

  for (const log of sorted) {
    const type = log.type;
    if (type === 'clock_in') {
      if (state === 'in' || state === 'break') {
        return { valid: false, error: 'Cannot clock in while already on shift' };
      }
      state = 'in';
    } else if (type === 'break_start') {
      if (state !== 'in') {
        return { valid: false, error: 'Break start requires an active shift (clock in first)' };
      }
      state = 'break';
    } else if (type === 'break_end') {
      if (state !== 'break') {
        return { valid: false, error: 'Break end requires a break start' };
      }
      state = 'in';
    } else if (type === 'clock_out') {
      if (state === 'out') {
        return { valid: false, error: 'Cannot clock out when not on shift' };
      }
      if (state === 'break') {
        return { valid: false, error: 'End break before clocking out' };
      }
      state = 'out';
    } else {
      return { valid: false, error: `Unknown log type: ${type}` };
    }
  }

  return { valid: true };
}
