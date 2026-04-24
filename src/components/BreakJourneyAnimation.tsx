import React from 'react';
import { motion, useAnimationFrame } from 'motion/react';

export interface BreakJourneyAnimationProps {
  progress: number;  // 0 = just started, 1 = break almost over (near bench)
  isActive: boolean;
}

// ── tiny helpers ──────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const BreakJourneyAnimation: React.FC<BreakJourneyAnimationProps> = ({
  progress,
  isActive,
}) => {
  // progress 0→1 maps person from x=8% to x=72% (bench is at ~80%)
  const personX = lerp(8, 72, Math.min(1, progress));

  // last 25% → jogging (faster cycle, slight bounce)
  const isJogging = progress > 0.75;

  // walk/jog cycle speed
  const cycleDuration = isJogging ? 0.38 : 0.55;

  // ── SVG dimensions (viewBox 400×160) ─────────────────────────────────────
  const W = 400;
  const H = 160;
  const groundY = 128;

  // person geometry (all relative, will be translated)
  const headR   = 9;
  const bodyTop = groundY - 52;
  const bodyBot = groundY - 28;
  const hipX    = 0;

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 55%, #7dd3fc 100%)' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ display: 'block' }}
        aria-label="Break journey animation"
      >
        {/* ── Sky / background ── */}

        {/* Sun */}
        <circle cx={340} cy={28} r={16} fill="#fde68a" opacity={0.9} />
        <circle cx={340} cy={28} r={12} fill="#fbbf24" opacity={0.7} />

        {/* Clouds */}
        <g opacity={0.55}>
          <ellipse cx={60}  cy={22} rx={22} ry={10} fill="white" />
          <ellipse cx={78}  cy={18} rx={16} ry={9}  fill="white" />
          <ellipse cx={44}  cy={20} rx={14} ry={8}  fill="white" />
        </g>
        <g opacity={0.45}>
          <ellipse cx={200} cy={30} rx={18} ry={8}  fill="white" />
          <ellipse cx={215} cy={26} rx={13} ry={7}  fill="white" />
          <ellipse cx={186} cy={28} rx={12} ry={7}  fill="white" />
        </g>

        {/* ── Ground ── */}
        {/* Grass strip */}
        <rect x={0} y={groundY} width={W} height={H - groundY} fill="#86efac" />
        {/* Path */}
        <rect x={0} y={groundY + 4} width={W} height={10} fill="#d1fae5" opacity={0.6} rx={2} />
        {/* Ground line */}
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#4ade80" strokeWidth={1.5} />

        {/* ── Background trees (faint) ── */}
        {[30, 110, 170, 260].map((tx, i) => (
          <g key={i} opacity={0.22 + (i % 2) * 0.08}>
            <rect x={tx - 3} y={groundY - 28} width={6} height={28} fill="#92400e" rx={2} />
            <ellipse cx={tx} cy={groundY - 32} rx={14} ry={18} fill="#16a34a" />
          </g>
        ))}

        {/* ── Bench (destination) ── */}
        <g transform={`translate(316, ${groundY - 22})`}>
          {/* legs */}
          <rect x={2}  y={14} width={4} height={12} fill="#92400e" rx={1} />
          <rect x={26} y={14} width={4} height={12} fill="#92400e" rx={1} />
          {/* seat */}
          <rect x={0}  y={12} width={32} height={4} fill="#b45309" rx={2} />
          {/* back */}
          <rect x={0}  y={4}  width={32} height={4} fill="#b45309" rx={2} />
          <rect x={2}  y={4}  width={4}  height={10} fill="#92400e" rx={1} />
          <rect x={26} y={4}  width={4}  height={10} fill="#92400e" rx={1} />
          {/* destination glow when close */}
          {progress > 0.7 && (
            <motion.ellipse
              cx={16} cy={26} rx={18} ry={4}
              fill="#fbbf24"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </g>

        {/* ── Walking person ── */}
        <motion.g
          animate={{ x: `${personX}%` }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.5 }}
        >
          {/* Slight vertical bounce while walking */}
          <motion.g
            animate={isActive ? {
              y: isJogging ? [0, -4, 0, -4, 0] : [0, -2, 0, -2, 0]
            } : { y: 0 }}
            transition={{ duration: cycleDuration, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Shadow */}
            <motion.ellipse
              cx={0} cy={groundY - 1} rx={10} ry={3}
              fill="rgba(0,0,0,0.12)"
              animate={isActive ? { scaleX: [1, 0.8, 1] } : {}}
              transition={{ duration: cycleDuration, repeat: Infinity }}
            />

            {/* ── Left leg ── */}
            <motion.line
              x1={hipX} y1={bodyBot}
              x2={hipX} y2={groundY}
              stroke="#1d4ed8" strokeWidth={5} strokeLinecap="round"
              animate={isActive ? { x2: [-5, 5, -5], y2: [groundY - 2, groundY, groundY - 2] } : {}}
              transition={{ duration: cycleDuration, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* ── Right leg ── */}
            <motion.line
              x1={hipX} y1={bodyBot}
              x2={hipX} y2={groundY}
              stroke="#1d4ed8" strokeWidth={5} strokeLinecap="round"
              animate={isActive ? { x2: [5, -5, 5], y2: [groundY, groundY - 2, groundY] } : {}}
              transition={{ duration: cycleDuration, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* ── Body ── */}
            <rect
              x={-6} y={bodyTop}
              width={12} height={bodyBot - bodyTop}
              fill="#3b82f6" rx={4}
            />

            {/* ── Left arm ── */}
            <motion.line
              x1={-6} y1={bodyTop + 6}
              x2={-6} y2={bodyTop + 6}
              stroke="#93c5fd" strokeWidth={4} strokeLinecap="round"
              animate={isActive ? {
                x2: [-14, -2, -14],
                y2: [bodyTop + 14, bodyTop + 20, bodyTop + 14]
              } : { x2: -12, y2: bodyTop + 18 }}
              transition={{ duration: cycleDuration, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* ── Right arm ── */}
            <motion.line
              x1={6} y1={bodyTop + 6}
              x2={6} y2={bodyTop + 6}
              stroke="#93c5fd" strokeWidth={4} strokeLinecap="round"
              animate={isActive ? {
                x2: [14, 2, 14],
                y2: [bodyTop + 20, bodyTop + 14, bodyTop + 20]
              } : { x2: 12, y2: bodyTop + 18 }}
              transition={{ duration: cycleDuration, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* ── Head ── */}
            <circle cx={0} cy={bodyTop - headR - 1} r={headR} fill="#fde68a" />
            {/* Hair */}
            <path
              d={`M ${-headR} ${bodyTop - headR * 2 + 2} 
                  Q 0 ${bodyTop - headR * 2 - 8} ${headR} ${bodyTop - headR * 2 + 2}`}
              fill="#92400e" strokeWidth={0}
            />
            {/* Eyes */}
            <circle cx={-3} cy={bodyTop - headR - 2} r={1.2} fill="#1e293b" />
            <circle cx={3}  cy={bodyTop - headR - 2} r={1.2} fill="#1e293b" />
            {/* Smile */}
            <path
              d={`M -3 ${bodyTop - headR + 2} Q 0 ${bodyTop - headR + 5} 3 ${bodyTop - headR + 2}`}
              stroke="#92400e" strokeWidth={1.2} fill="none" strokeLinecap="round"
            />

            {/* Jogging speed lines */}
            {isJogging && isActive && (
              <motion.g
                animate={{ opacity: [0, 0.6, 0], x: [-4, -10] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              >
                <line x1={-14} y1={bodyTop + 4}  x2={-20} y2={bodyTop + 4}  stroke="#bfdbfe" strokeWidth={2} strokeLinecap="round" />
                <line x1={-14} y1={bodyTop + 10} x2={-22} y2={bodyTop + 10} stroke="#bfdbfe" strokeWidth={1.5} strokeLinecap="round" />
                <line x1={-14} y1={bodyTop + 16} x2={-19} y2={bodyTop + 16} stroke="#bfdbfe" strokeWidth={1} strokeLinecap="round" />
              </motion.g>
            )}
          </motion.g>
        </motion.g>

        {/* ── Dotted path ahead of person ── */}
        {progress < 0.95 && (
          <motion.line
            x1={`${personX + 4}%`} y1={groundY + 8}
            x2="79%" y2={groundY + 8}
            stroke="#a7f3d0" strokeWidth={2}
            strokeDasharray="4 6"
            strokeLinecap="round"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </svg>
    </div>
  );
};
