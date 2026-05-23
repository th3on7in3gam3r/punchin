import { Play, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button3D } from '../common/Button3D';
import { cn } from '../../lib/utils';
import type { TimeLog } from '../../types';

type Props = {
  confirmAction: TimeLog['type'] | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function HomeConfirmModal({ confirmAction, onConfirm, onCancel }: Props) {
  if (!confirmAction || (confirmAction !== 'clock_in' && confirmAction !== 'clock_out')) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 max-w-sm w-full space-y-8 shadow-2xl border border-slate-100 dark:border-slate-700"
        >
          <div className="text-center space-y-4">
            <div
              className={cn(
                'w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl',
                confirmAction === 'clock_in'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600',
              )}
            >
              {confirmAction === 'clock_in' ? (
                <Play size={40} fill="currentColor" />
              ) : (
                <Square size={40} fill="currentColor" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
                {confirmAction === 'clock_in' ? 'Start Session?' : 'End Session?'}
              </h3>
              <p className="text-slate-400 text-sm font-bold">
                {confirmAction === 'clock_in'
                  ? 'Ready to focus and log your time?'
                  : 'Confirm your punch out for today.'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button3D
              color={confirmAction === 'clock_in' ? 'green' : 'red'}
              onClick={onConfirm}
              className="py-6"
            >
              {confirmAction === 'clock_in' ? "YES, LET'S GO" : 'YES, FINISH DAY'}
            </Button3D>
            <button
              onClick={onCancel}
              className="py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-[0.3em] text-[10px]"
            >
              Wait, Nevermind
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
