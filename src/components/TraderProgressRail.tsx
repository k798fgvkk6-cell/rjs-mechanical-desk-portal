import React from 'react';
import { Lock, TrendingUp, BookOpen, Layers, Award, CheckCircle2, Trophy } from 'lucide-react';

interface ProgressRingCardProps {
  title: string;
  percentage: number;
  subtitle: string;
  strokeColor: string;
  accentTextClass: string;
  icon: React.ReactNode;
  subNote?: string;
  locked?: boolean;
  lockedLabel?: string;
  footerContent?: React.ReactNode;
  onClick?: () => void;
}

const ProgressRingCard: React.FC<ProgressRingCardProps> = ({
  title,
  percentage,
  subtitle,
  strokeColor,
  accentTextClass,
  icon,
  subNote,
  locked = false,
  lockedLabel = 'LOCKED — PHASE 2',
  footerContent,
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
          {subNote && (
            <div className="mt-0.5 text-[10px] font-mono text-slate-400 text-center">
              {subNote}
            </div>
          )}
        </div>

        {footerContent}
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
  currentPhase?: 1 | 2;
  netPnL: number;
  swingWinsCount?: number;
  profitGoalTarget?: number;
  profitGoalPeriodLabel?: string;
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
  currentPhase = 1,
  netPnL,
  swingWinsCount = 0,
  profitGoalTarget,
  profitGoalPeriodLabel,
  passedQuizSections,
  totalQuizSections = 4,
  onNavigateTab
}) => {
  const effectiveTarget = profitGoalTarget ?? (currentPhase === 2 ? 20000 : 10000);
  const phase1Pct = phase1Total > 0 ? (phase1Completed / phase1Total) * 100 : 0;
  const phase2Pct = isPhase2Unlocked && phase2Total > 0 ? (phase2Completed / phase2Total) * 100 : 0;
  const profitPct = Math.min(100, Math.max(0, (netPnL / effectiveTarget) * 100));
  const quizPct = totalQuizSections > 0 ? (passedQuizSections / totalQuizSections) * 100 : 0;

  const formattedNetPnL =
    netPnL < 0 ? `-₱${Math.abs(netPnL).toLocaleString()}` : `₱${netPnL.toLocaleString()}`;

  const swingTarget = 2;
  const clampedSwingWins = Math.min(swingTarget, Math.max(0, swingWinsCount));

  const swingMilestoneFooter =
    currentPhase === 2 ? (
      <div className="mt-3 pt-2.5 border-t border-hairline space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-1">
            <Trophy className="w-3 h-3 shrink-0" />
            <span>1:4 / 1:5 SWING WINS</span>
          </span>
          <span
            className={`text-[10px] font-mono font-bold num-mono ${
              clampedSwingWins >= swingTarget ? 'text-emerald-400' : 'text-slate-300'
            }`}
          >
            {swingWinsCount} / {swingTarget} Completed
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1].map((idx) => {
            const done = swingWinsCount > idx;
            return (
              <div
                key={idx}
                className={`h-6 rounded-md border flex items-center justify-center gap-1 text-[9px] font-mono font-bold transition-all ${
                  done
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#0e131e] border-hairline text-slate-500'
                }`}
              >
                {done ? <CheckCircle2 className="w-3 h-3" /> : null}
                <span>WIN #{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    ) : undefined;

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

          {/* 3. DYNAMIC PHASE 1 / PHASE 2 PROFIT GOAL + SWING MILESTONE */}
          <ProgressRingCard
            title={currentPhase === 2 ? 'PHASE 2 PROFIT GOAL' : 'PHASE 1 PROFIT GOAL'}
            percentage={profitPct}
            subtitle={`${formattedNetPnL} / ₱${effectiveTarget.toLocaleString()}`}
            subNote={profitGoalPeriodLabel}
            strokeColor={
              profitPct >= 100 ? '#10b981' : currentPhase === 2 ? '#06b6d4' : '#f59e0b'
            }
            accentTextClass={
              netPnL < 0
                ? 'text-rose-400'
                : profitPct >= 100
                ? 'text-emerald-400'
                : currentPhase === 2
                ? 'text-cyan-400'
                : 'text-amber-400'
            }
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            footerContent={swingMilestoneFooter}
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
