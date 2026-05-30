import { useSyncStatus } from '../hooks/useSyncStatus';
import { cn } from '../lib/utils';

const LABELS: Record<string, string> = {
  synced: 'Saved to cloud',
  syncing: 'Saving…',
  pending: 'Sync pending',
  offline: 'Offline only',
  idle: 'Cloud ready',
};

export function SyncIndicator() {
  const { status, pendingCount } = useSyncStatus();

  const label =
    status === 'pending' && pendingCount > 0
      ? `${LABELS.pending} (${pendingCount})`
      : LABELS[status] ?? LABELS.idle;

  const dotClass = {
    synced: 'bg-emerald-500',
    syncing: 'bg-amber-400 animate-pulse',
    pending: 'bg-amber-500 animate-pulse',
    offline: 'bg-slate-400',
    idle: 'bg-slate-300 dark:bg-slate-600',
  }[status];

  if (status === 'idle') return null;

  return (
    <div
      className="flex items-center gap-1.5 max-w-[7.5rem]"
      title={label}
      aria-live="polite"
    >
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
      <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight truncate">
        {label}
      </span>
    </div>
  );
}
