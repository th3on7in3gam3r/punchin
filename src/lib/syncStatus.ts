export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'pending';

type Listener = (status: SyncStatus, pendingCount: number) => void;

let status: SyncStatus = 'idle';
let pendingCount = 0;
const listeners = new Set<Listener>();

export function getSyncState() {
  return { status, pendingCount };
}

export function setSyncStatus(next: SyncStatus, pending?: number) {
  status = next;
  if (pending !== undefined) pendingCount = pending;
  listeners.forEach(l => l(status, pendingCount));
}

export function subscribeSyncStatus(listener: Listener) {
  listeners.add(listener);
  listener(status, pendingCount);
  return () => {
    listeners.delete(listener);
  };
}
