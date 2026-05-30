import { useSyncStatus } from '../hooks/useSyncStatus';
import { cn } from '../lib/utils';

export function SyncIndicator() {
  const { status, pendingCount, cloudReachable } = useSyncStatus();

  let label: string;
  if (status === 'pending' && pendingCount > 0) {
    label = `Sync pending (${pendingCount})`;
  } else if (status === 'cloud-connected') {
    label = 'Cloud connected';
  } else if (status === 'local-only' || cloudReachable === false) {
    label = 'Local only';
  } else {
    const labels: Record<string, string> = {
      synced: 'Saved to cloud',
      syncing: 'Saving…',
      pending: 'Sync pending',
      offline: 'Offline only',
      idle: 'Cloud ready',
    };
    label = labels[status] ?? 'Sync';
  }

  const dotClass = {
    synced: 'bg-emerald-500',
    syncing: 'bg-amber-400 animate-pulse',
    pending: 'bg-amber-500 animate-pulse',
    offline: 'bg-slate-400',
    idle: 'bg-slate-300 dark:bg-slate-600',
    'cloud-connected': 'bg-emerald-500',
    'local-only': 'bg-slate-400',
  }[status];

  const alwaysShow = status === 'cloud-connected' || status === 'local-only';
  if (!alwaysShow && status === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 max-w-[8rem]" title={label} aria-live="polite">
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
      <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight truncate">
        {label}
      </span>
    </div>
  );
}
