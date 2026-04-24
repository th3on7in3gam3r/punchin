import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone } from 'lucide-react';

// Extend the Window type to include the deferred prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // dismissed is session-only (in-memory), so it resets on every page load/refresh
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // If already running as installed PWA, don't show
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setDismissed(true);
  };

  const handleDismiss = () => {
    // Only hides for this session — reappears on next refresh
    setDismissed(true);
  };

  const show = !!deferredPrompt && !dismissed && !installed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[300] px-4 pt-3 pb-1 pointer-events-none"
        >
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="flex items-center gap-3 bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-slate-900/40 border border-white/10">
              {/* Icon */}
              <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                <Smartphone size={18} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white leading-none">Install PunchIn</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-none">Add to home screen for quick access</p>
              </div>

              {/* Install button */}
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
              >
                <Download size={11} />
                Install
              </button>

              {/* Dismiss — session only */}
              <button
                onClick={handleDismiss}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
