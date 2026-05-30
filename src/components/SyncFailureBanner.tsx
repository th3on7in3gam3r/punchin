import { motion, AnimatePresence } from 'motion/react';
import { CloudOff } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';

export function SyncFailureBanner() {
  const { status, pendingCount } = useSyncStatus();
  const show =
    (status === 'pending' || status === 'offline') && pendingCount > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50"
        >
          <div className="px-4 py-2.5 flex items-center gap-2 max-w-md mx-auto">
            <CloudOff size={16} className="text-amber-600 shrink-0" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
              Couldn&apos;t reach cloud — will retry
              {pendingCount > 0 ? ` (${pendingCount} punch${pendingCount > 1 ? 'es' : ''} queued)` : ''}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
