import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import type { WorkDay, WorkLocation } from '../types';

export function exportWeekCsv(
  workDays: WorkDay[],
  workLocations: WorkLocation[],
  formatMinutes: (m: number) => string,
) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(new Date(), { weekStartsOn: 1 });
  const locName = (id?: string) => workLocations.find(l => l.id === id)?.name ?? '';

  const rows = [['Date', 'Day', 'Clock In', 'Clock Out', 'Work Hours', 'Break Mins', 'Location']];

  const weekDays = workDays
    .filter(d => {
      const date = parseISO(d.date);
      return date >= start && date <= end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const day of weekDays) {
    const clockIn = day.logs.find(l => l.type === 'clock_in');
    const clockOut = [...day.logs].reverse().find(l => l.type === 'clock_out');
    rows.push([
      day.date,
      format(parseISO(day.date), 'EEEE'),
      clockIn ? format(clockIn.timestamp, 'HH:mm') : '',
      clockOut ? format(clockOut.timestamp, 'HH:mm') : '',
      formatMinutes(day.totalWorkMinutes),
      String(Math.round(day.totalBreakMinutes)),
      locName(clockIn?.locationId ?? clockOut?.locationId),
    ]);
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = `punchin-week-${format(start, 'yyyy-MM-dd')}.csv`;
  a.click();
}
