export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'pending'
  | 'cloud-connected'
  | 'local-only';

type Listener = (status: SyncStatus, pendingCount: number, cloudReachable: boolean | null) => void;

let status: SyncStatus = 'idle';
let pendingCount = 0;
let cloudReachable: boolean | null = null;
const listeners = new Set<Listener>();

export function getSyncState() {
  return { status, pendingCount, cloudReachable };
}

export function setSyncStatus(next: SyncStatus, pending?: number) {
  status = next;
  if (pending !== undefined) pendingCount = pending;
  listeners.forEach(l => l(status, pendingCount, cloudReachable));
}

export function setCloudReachable(reachable: boolean) {
  cloudReachable = reachable;
  const q = pendingCount;
  if (reachable && q === 0 && (status === 'idle' || status === 'local-only')) {
    status = 'cloud-connected';
  }
  if (!reachable && q === 0 && status !== 'syncing' && status !== 'synced' && status !== 'pending') {
    status = 'local-only';
  }
  listeners.forEach(l => l(status, pendingCount, cloudReachable));
}

export function subscribeSyncStatus(listener: Listener) {
  listeners.add(listener);
  listener(status, pendingCount, cloudReachable);
  return () => {
    listeners.delete(listener);
  };
}
