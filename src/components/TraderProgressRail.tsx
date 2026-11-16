import React from 'react';
import { Lock, TrendingUp, BookOpen, Layers, Award } from 'lucide-react';

interface ProgressRingCardProps {
  title: string;
  percentage: number;
  subtitle: string;
  strokeColor: string;
  accentTextClass: string;
  icon: React.ReactNode;
  locked?: boolean;
  lockedLabel?: string;
  onClick?: () => void;
}

const ProgressRingCard: React.FC<ProgressRingCardProps> = ({
  title,
  percentage,
  subtitle,
  strokeColor,
  accentTextClass,
  icon,
  locked = false,
  lockedLabel = 'LOCKED — PHASE 2',
  onClick
}) => {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const roundedPct = Math.round(clampedPct);
  const size = 84;
  const strokeWidth = 7;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div
      onClick={!locked ? onClick : undefined}
      className={`relative rounded-xl p-3.5 bg-[#070a12] border border-hairline transition-all ${
        !locked && onClick ? 'hover:border-slate-600 cursor-pointer' : ''
      }`}
    >
      <div className={locked ? 'blur-[3px] opacity-40 grayscale pointer-events-none select-none' : ''}>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
            {title}
          </span>
          <span className={accentTextClass}>{icon}</span>
        </div>

        <div className="flex flex-col items-center justify-center py-1">
          <div className="relative w-[84px] h-[84px] flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className="progress-ring-track"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-mono font-extrabold text-white num-mono">
                {roundedPct}%
              </span>
            </div>
          </div>

          <div className={`mt-2 text-[11px] font-mono font-semibold num-mono text-center ${accentTextClass}`}>
            {subtitle}
          </div>
        </div>
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e131e] border border-slate-700 shadow-lg text-[10px] font-mono font-bold tracking-wider text-slate-300">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{lockedLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface TraderProgressRailProps {
  phase1Completed: number;
  phase1Total: number;
  phase2Completed: number;
  phase2Total: number;
  isPhase2Unlocked: boolean;
  netPnL: number;
  profitGoalTarget?: number;
  passedQuizSections: number;
  totalQuizSections?: number;
  onNavigateTab?: (tab: 'defense' | 'vault' | 'audit' | 'quizzes' | 'simulator', phase?: 1 | 2) => void;
}

export const TraderProgressRail: React.FC<TraderProgressRailProps> = ({
  phase1Completed,
  phase1Total,
  phase2Completed,
  phase2Total,
  isPhase2Unlocked,
  netPnL,
  profitGoalTarget = 10000,
  passedQuizSections,
  totalQuizSections = 4,
  onNavigateTab
}) => {
  const phase1Pct = phase1Total > 0 ? (phase1Completed / phase1Total) * 100 : 0;
  const phase2Pct = isPhase2Unlocked && phase2Total > 0 ? (phase2Completed / phase2Total) * 100 : 0;
  const profitPct = Math.min(100, Math.max(0, (netPnL / profitGoalTarget) * 100));
  const quizPct = totalQuizSections > 0 ? (passedQuizSections / totalQuizSections) * 100 : 0;

  const formattedNetPnL =
    netPnL < 0 ? `-₱${Math.abs(netPnL).toLocaleString()}` : `₱${netPnL.toLocaleString()}`;

  return (
    <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-[128px]">
      <div className="glass-card rounded-xl p-4 border-hairline space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-hairline">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              TRADER PROGRESS RAIL
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">LIVE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {/* 1. PHASE 1 LESSONS */}
          <ProgressRingCard
            title="PHASE 1 LESSONS"
            percentage={phase1Pct}
            subtitle={`${phase1Completed}/${phase1Total} Completed`}
            strokeColor="#10b981"
            accentTextClass="text-emerald-400"
            icon={<BookOpen className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab?.('vault', 1)}
          />

          {/* 2. PHASE 2 LESSONS */}
          <ProgressRingCard
            title="PHASE 2 LESSONS"
            percentage={phase2Pct}
            subtitle={`${phase2Completed}/${phase2Total} Completed`}
            strokeColor="#06b6d4"
            accentTextClass="text-cyan-400"
            icon={<Layers className="w-3.5 h-3.5" />}
            locked={!isPhase2Unlocked}
            lockedLabel="LOCKED — PHASE 2"
            onClick={() => onNavigateTab?.('vault', 2)}
          />

          {/* 3. ₱10,000 PROFIT GOAL */}
          <ProgressRingCard
            title="₱10,000 PROFIT GOAL"
            percentage={profitPct}
            subtitle={`${formattedNetPnL} / ₱${profitGoalTarget.toLocaleString()}`}
            strokeColor={profitPct >= 100 ? '#10b981' : '#f59e0b'}
            accentTextClass={
              netPnL < 0 ? 'text-rose-400' : profitPct >= 100 ? 'text-emerald-400' : 'text-amber-400'
            }
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab?.('audit')}
          />

          {/* 4. QUIZ MASTERY (40 Qs) */}
          <ProgressRingCard
            title="QUIZ MASTERY (40 Qs)"
            percentage={quizPct}
            subtitle={`${passedQuizSections}/${totalQuizSections} Sections Passed`}
            strokeColor="#10b981"
            accentTextClass="text-emerald-400"
            icon={<Award className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab?.('quizzes')}
          />
        </div>
      </div>
    </aside>
  );
};
