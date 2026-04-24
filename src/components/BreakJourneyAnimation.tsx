import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { CharacterType, DestinationType } from '../types';

export interface BreakJourneyAnimationProps {
  progress: number;   // 0 = break just started, 1 = break almost over
  isActive: boolean;
  character?: CharacterType;
  destination?: DestinationType;
}

const characterEmojis: Record<CharacterType, string> = {
  default:  '🧍‍♂️',
  business: '👨‍💼',
  athlete:  '🏃‍♂️',
  casual:   '😎',
};

const destinationEmojis: Record<DestinationType, string> = {
  bench:  '🪑',
  coffee: '☕',
  home:   '🏠',
  beach:  '🏖️',
};

// Background scene per destination
const sceneColors: Record<DestinationType, { sky: string; ground: string }> = {
  bench:  { sky: 'from-sky-50 via-blue-50 to-indigo-50',   ground: 'from-emerald-100 to-transparent' },
  coffee: { sky: 'from-amber-50 via-orange-50 to-yellow-50', ground: 'from-amber-100 to-transparent' },
  home:   { sky: 'from-violet-50 via-purple-50 to-pink-50',  ground: 'from-green-100 to-transparent' },
  beach:  { sky: 'from-cyan-50 via-sky-50 to-blue-100',      ground: 'from-yellow-100 to-transparent' },
};

export default function BreakJourneyAnimation({
  progress,
  isActive,
  character = 'default',
  destination = 'bench',
}: BreakJourneyAnimationProps) {
  const [isJogging, setIsJogging] = useState(false);

  useEffect(() => {
    setIsJogging(progress > 0.65);
  }, [progress]);

  const scene = sceneColors[destination];
  const pct   = Math.min(1, Math.max(0, progress));

  return (
    <div
      className={`relative h-52 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${scene.sky} border border-white/70 shadow-inner`}
    >
      {/* ── Background elements ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Clouds */}
        <div className="absolute top-5 left-8  w-14 h-7  bg-white/60 rounded-full blur-sm" />
        <div className="absolute top-9 left-24 w-18 h-8  bg-white/50 rounded-full blur-sm" />
        <div className="absolute top-4 right-20 w-10 h-6 bg-white/40 rounded-full blur-sm" />

        {/* Sun / moon depending on destination */}
        {destination === 'beach' ? (
          <div className="absolute top-4 right-8 w-10 h-10 bg-yellow-300/80 rounded-full blur-[2px]" />
        ) : (
          <div className="absolute top-5 right-10 w-8 h-8 bg-yellow-200/70 rounded-full blur-[1px]" />
        )}

        {/* Ground gradient */}
        <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t ${scene.ground}`} />

        {/* Beach waves */}
        {destination === 'beach' && (
          <motion.div
            className="absolute bottom-12 left-0 right-0 h-3 opacity-30"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg viewBox="0 0 400 12" className="w-full h-full">
              <path d="M0 6 Q50 0 100 6 Q150 12 200 6 Q250 0 300 6 Q350 12 400 6" fill="none" stroke="#38bdf8" strokeWidth="2" />
            </svg>
          </motion.div>
        )}
      </div>

      {/* ── Ground path line ── */}
      <div className="absolute bottom-16 left-6 right-6 h-px bg-gradient-to-r from-transparent via-slate-400/50 to-transparent" />

      {/* ── Destination (right side, bobbing) ── */}
      <motion.div
        className="absolute bottom-14 right-6 text-4xl drop-shadow-sm select-none"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {destinationEmojis[destination]}
        {/* Glow ring when close */}
        {pct > 0.75 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-300/30 blur-md -z-10"
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* ── Dotted path ahead ── */}
      {pct < 0.92 && (
        <motion.div
          className="absolute bottom-[68px] h-px border-t-2 border-dashed border-slate-300/60"
          style={{
            left:  `calc(10% + ${pct * 68}%)`,
            right: '10%',
          }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* ── Walking / jogging person ── */}
      <motion.div
        className="absolute bottom-14 text-5xl origin-bottom select-none"
        animate={{
          left: `calc(6% + ${pct * 68}%)`,
          scale: isJogging ? 1.1 : 1,
        }}
        transition={{ type: 'spring', stiffness: 60, damping: 22 }}
      >
        {/* Body rock */}
        <motion.div
          animate={isActive ? {
            rotate: isJogging ? [-14, 14] : [-7, 7],
          } : { rotate: 0 }}
          transition={{
            duration: isJogging ? 0.26 : 0.5,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        >
          {characterEmojis[character]}
        </motion.div>

        {/* Speed lines when jogging */}
        {isJogging && isActive && (
          <motion.div
            className="absolute top-1/2 -left-6 flex flex-col gap-1 -translate-y-1/2"
            animate={{ opacity: [0, 0.7, 0], x: [0, -6] }}
            transition={{ duration: 0.35, repeat: Infinity }}
          >
            <div className="w-4 h-0.5 bg-blue-300 rounded-full" />
            <div className="w-3 h-0.5 bg-blue-200 rounded-full" />
            <div className="w-2 h-0.5 bg-blue-100 rounded-full" />
          </motion.div>
        )}
      </motion.div>

      {/* ── Bottom label ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
          {isJogging ? '🏃 Almost there · ' : '🚶 Recharging · '}
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}
