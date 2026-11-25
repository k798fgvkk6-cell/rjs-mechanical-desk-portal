import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ListChecks,
  RefreshCw,
  X,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export interface AiTradeReviewResult {
  disciplineScore: number;
  scoreLabel: string;
  topStrength: string;
  primaryLeak: string;
  actionPlan: string[];
  summaryNote: string;
  periodLabel: string;
  tradeCount: number;
}

interface AiTradeReviewCardProps {
  review: AiTradeReviewResult | null;
  isLoading: boolean;
  error: string | null;
  periodLabel: string;
  onRefresh: () => void;
  onDismiss: () => void;
}

export const AiTradeReviewCard: React.FC<AiTradeReviewCardProps> = ({
  review,
  isLoading,
  error,
  periodLabel,
  onRefresh,
  onDismiss
}) => {
  if (!isLoading && !error && !review) return null;

  const score = review?.disciplineScore ?? 0;
  const scoreTone =
    score >= 80
      ? {
          text: 'text-emerald-400',
          bar: 'bg-emerald-500',
          badge: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
        }
      : score >= 60
      ? {
          text: 'text-amber-400',
          bar: 'bg-amber-500',
          badge: 'bg-amber-500/15 border-amber-500/35 text-amber-300'
        }
      : {
          text: 'text-rose-400',
          bar: 'bg-rose-500',
          badge: 'bg-rose-500/15 border-rose-500/35 text-rose-300'
        };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-emerald-500/30 shadow-[0_12px_35px_-12px_rgba(16,185,129,0.18)] space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide font-mono">
                AI DESK PERFORMANCE REVIEW
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-[#0e131e] border border-hairline text-[10px] font-mono text-slate-300">
                {review?.periodLabel || periodLabel}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              RJS Mechanical USTECH100 Risk &amp; Tilt Audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-lg bg-[#0e131e] border border-hairline hover:border-emerald-500/40 text-slate-300 hover:text-white font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Re-run AI Desk Performance Review"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Re-Analyze</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            aria-label="Close AI Desk Performance Review"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <div className="text-xs font-mono font-semibold text-white">
            Auditing {periodLabel} execution logs against RJS Desk rules...
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Checking R:R consistency, sizing discipline, and tilt clusters.
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-3.5 rounded-xl bg-rose-950/35 border border-rose-500/40 flex items-start gap-2.5 text-xs font-mono text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-300">AI Review Unavailable</div>
            <div className="text-[11px] mt-0.5 text-rose-300/90">{error}</div>
          </div>
        </div>
      )}

      {/* Coaching Report */}
      {!isLoading && !error && review && (
        <div className="space-y-4">
          {/* Discipline Score + Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 rounded-xl p-4 bg-[#070a12] border border-hairline flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Discipline &amp; Rule Score</span>
                </span>
                <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${scoreTone.badge}`}>
                  {review.scoreLabel}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className={`text-3xl font-extrabold font-mono num-mono ${scoreTone.text}`}>
                  {score}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreTone.bar}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Top Strength */}
              <div className="rounded-xl p-4 bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Top Strength</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {review.topStrength}
                </p>
              </div>

              {/* Primary Leak / Tilt Warning */}
              <div className="rounded-xl p-4 bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Primary Leak / Tilt Warning</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {review.primaryLeak}
                </p>
              </div>
            </div>
          </div>

          {/* 3-Point Action Plan */}
          <div className="rounded-xl p-4 bg-[#070a12] border border-hairline space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                <span>3-Point Action Plan — Next Trading Week</span>
              </div>
              {review.summaryNote && (
                <span className="text-[11px] font-mono text-slate-400">
                  {review.summaryNote}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {review.actionPlan.map((step, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3 bg-[#0e131e] border border-hairline flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
