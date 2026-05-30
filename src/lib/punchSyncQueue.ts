import type { TimeLog } from '../types';
import { setSyncStatus } from './syncStatus';

const QUEUE_KEY = 'punchin_sync_queue';

export type QueuedPunch =
  | {
      action: 'upsert';
      id: string;
      type: TimeLog['type'];
      timestamp: number;
      date: string;
      locationId?: string;
    }
  | { action: 'delete'; id: string };

function loadQueue(): QueuedPunch[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedPunch[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function updatePendingStatus() {
  const q = loadQueue();
  if (q.length === 0) {
    if (statusIsOffline()) setSyncStatus('offline');
    else setSyncStatus('synced');
    return;
  }
  setSyncStatus(statusIsOffline() ? 'offline' : 'pending', q.length);
}

function statusIsOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

async function sendUpsert(item: Extract<QueuedPunch, { action: 'upsert' }>) {
  return fetch('/api/punch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: item.id,
      action: item.type,
      timestamp: item.timestamp,
      date: item.date,
      locationId: item.locationId,
    }),
  });
}

async function sendDelete(item: Extract<QueuedPunch, { action: 'delete' }>) {
  return fetch(`/api/punch/${item.id}`, { method: 'DELETE' });
}

function enqueue(item: QueuedPunch) {
  const queue = loadQueue();
  const idx = queue.findIndex(q => q.id === item.id && q.action === item.action);
  if (idx >= 0) queue[idx] = item;
  else queue.push(item);
  saveQueue(queue);
  updatePendingStatus();
}

export function clearPunchSyncQueue() {
  localStorage.removeItem(QUEUE_KEY);
  setSyncStatus('idle', 0);
}

export async function flushPunchSyncQueue(): Promise<void> {
  if (statusIsOffline()) {
    updatePendingStatus();
    return;
  }

  let queue = loadQueue();
  if (queue.length === 0) return;

  setSyncStatus('syncing', queue.length);

  while (queue.length > 0) {
    const item = queue[0];
    try {
      const res =
        item.action === 'delete' ? await sendDelete(item) : await sendUpsert(item);
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
      queue = queue.slice(1);
      saveQueue(queue);
    } catch {
      updatePendingStatus();
      return;
    }
  }

  setSyncStatus('synced', 0);
  scheduleIdleFade();
}

let flushTimer: ReturnType<typeof setInterval> | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleIdleFade() {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    if (loadQueue().length === 0 && !statusIsOffline()) setSyncStatus('idle', 0);
  }, 4000);
}

export function initPunchSyncQueue() {
  if (typeof window === 'undefined') return;

  const run = () => void flushPunchSyncQueue();

  window.addEventListener('online', run);
  if (!flushTimer) flushTimer = setInterval(run, 30_000);

  void probeCloudConnection();
  void run();
}

export async function probeCloudConnection(): Promise<boolean> {
  try {
    const res = await fetch('/health', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      setSyncStatus(statusIsOffline() ? 'offline' : 'idle', loadQueue().length);
      return false;
    }
    const q = loadQueue();
    if (q.length > 0) setSyncStatus('pending', q.length);
    else if (!statusIsOffline()) setSyncStatus('idle', 0);
    return true;
  } catch {
    setSyncStatus(statusIsOffline() ? 'offline' : 'offline', loadQueue().length);
    return false;
  }
}

export async function queuePunchSync(log: TimeLog, date: string): Promise<void> {
  const item: QueuedPunch = {
    action: 'upsert',
    id: log.id,
    type: log.type,
    timestamp: log.timestamp,
    date,
    locationId: log.locationId,
  };

  if (statusIsOffline()) {
    enqueue(item);
    return;
  }

  setSyncStatus('syncing', loadQueue().length);
  try {
    const res = await sendUpsert(item);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await flushPunchSyncQueue();
    if (loadQueue().length === 0) {
      setSyncStatus('synced', 0);
      scheduleIdleFade();
    }
  } catch {
    enqueue(item);
  }
}

export async function queuePunchDelete(logId: string): Promise<void> {
  const item: QueuedPunch = { action: 'delete', id: logId };

  if (statusIsOffline()) {
    enqueue(item);
    return;
  }

  setSyncStatus('syncing', loadQueue().length);
  try {
    const res = await sendDelete(item);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await flushPunchSyncQueue();
    if (loadQueue().length === 0) {
      setSyncStatus('synced', 0);
      scheduleIdleFade();
    }
  } catch {
    enqueue(item);
  }
}
