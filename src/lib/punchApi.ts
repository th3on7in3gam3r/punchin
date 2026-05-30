import { TimeLog } from '../types';
import { queuePunchSync, queuePunchDelete } from './punchSyncQueue';

/** @deprecated Use queuePunchSync — retries on failure */
export function syncPunchToServer(log: TimeLog, date: string) {
  return queuePunchSync(log, date);
}

export function deletePunchFromServer(logId: string) {
  return queuePunchDelete(logId);
}
