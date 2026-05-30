const KEY = 'punchin_last_sync_at';

export function recordLastSync() {
  localStorage.setItem(KEY, String(Date.now()));
}

export function getLastSyncAt(): number | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

export function formatLastSyncLabel(ts: number | null): string {
  if (!ts) return 'Not synced to cloud yet on this device';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Last cloud sync: just now (this device)';
  if (mins < 60) return `Last cloud sync: ${mins}m ago (this device)`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last cloud sync: ${hrs}h ago (this device)`;
  return `Last cloud sync: ${Math.floor(hrs / 24)}d ago (this device)`;
}
