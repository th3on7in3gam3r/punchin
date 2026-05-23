import { TimeLog } from '../types';

export function syncPunchToServer(log: TimeLog, date: string) {
  return fetch('/api/punch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: log.id,
      action: log.type,
      timestamp: log.timestamp,
      date,
      locationId: log.locationId,
    }),
  });
}

export function deletePunchFromServer(logId: string) {
  return fetch(`/api/punch/${logId}`, { method: 'DELETE' });
}
