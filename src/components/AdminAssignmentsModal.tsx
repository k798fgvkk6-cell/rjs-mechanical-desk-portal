import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Maximize2,
  User
} from 'lucide-react';
import { supabase, LessonAssignmentRecord } from '../lib/supabase';
import {
  getAssignmentMetaById,
  parseAssignmentAnswer,
  parseScreenshotUrls
} from '../data/lessonAssignmentsData';

interface AdminAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPendingCountChange: (count: number) => void;
  onToast: (type: 'success' | 'error', message: string) => void;
  onPlaySuccess: () => void;
  onPlayError: () => void;
  onPlayTone: (freq?: number, type?: OscillatorType, duration?: number) => void;
  onOpenLightbox: (urls: string[], index: number, caption: string) => void;
}

export const AdminAssignmentsModal: React.FC<AdminAssignmentsModalProps> = ({
  isOpen,
  onClose,
  onPendingCountChange,
  onToast,
  onPlaySuccess,
  onPlayError,
  onPlayTone,
  onOpenLightbox
}) => {
  const [assignments, setAssignments] = useState<LessonAssignmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('lesson_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data || []) as LessonAssignmentRecord[];
      setAssignments(list);
      onPendingCountChange(list.filter((a) => a.status === 'pending').length);

      setFeedbackDrafts((prev) => {
        const next = { ...prev };
        list.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = item.mentor_feedback || '';
          }
        });
        return next;
      });
    } catch (err: any) {
      console.error('Admin assignments fetch error:', err);
      setFetchError(err?.message || 'Unable to load student assignment submissions.');
    } finally {
      setIsLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchAssignments();
    }
  }, [isOpen, fetchAssignments]);

  if (!isOpen) return null;

  const handleReviewDecision = async (
    record: LessonAssignmentRecord,
    nextStatus: 'approved' | 'revision'
  ) => {
    if (updatingId) return;
    const feedback = (feedbackDrafts[record.id] || '').trim();

    if (nextStatus === 'revision' && !feedback) {
      onPlayError();
      onToast('error', 'Please enter brief Mentor Feedback explaining what to revise.');
      return;
    }

    setUpdatingId(record.id);
    onPlayTone(620, 'sine', 0.04);

    try {
      const { data: updated, error } = await supabase
        .from('lesson_assignments')
        .update({
          status: nextStatus,
          mentor_feedback: feedback || null
        })
        .eq('id', record.id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      const nextList = assignments.map((item) =>
        item.id === record.id
          ? {
              ...item,
              status: (updated?.status || nextStatus) as LessonAssignmentRecord['status'],
              mentor_feedback: updated?.mentor_feedback ?? (feedback || null)
            }
          : item
      );
      setAssignments(nextList);
      onPendingCountChange(nextList.filter((a) => a.status === 'pending').length);

      onPlaySuccess();
      const meta = getAssignmentMetaById(record.lesson_id);
      const lessonLabel = meta ? meta.title : record.lesson_id;
      onToast(
        'success',
        nextStatus === 'approved'
          ? `Approved ${record.student_name}'s submission for ${lessonLabel}.`
          : `Requested revision from ${record.student_name} for ${lessonLabel}.`
      );
    } catch (err: any) {
      console.error('Assignment review error:', err);
      onPlayError();
      onToast('error', `Failed to update assignment: ${err?.message || 'Database error'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = assignments.filter((a) => a.status === 'pending').length;
  const approvedCount = assignments.filter((a) => a.status === 'approved').length;
  const revisionCount = assignments.filter((a) => a.status === 'revision').length;

  const q = searchQuery.trim().toLowerCase();
  const filtered = assignments.filter((item) => {
    if (statusFilter === 'pending' && item.status !== 'pending') return false;
    if (statusFilter === 'approved' && item.status !== 'approved') return false;
    if (!q) return true;
    const meta = getAssignmentMetaById(item.lesson_id);
    const titleStr = `${meta?.title || ''} ${meta?.phaseLabel || ''} ${item.lesson_id}`.toLowerCase();
    return (
      (item.student_name || '').toLowerCase().includes(q) ||
      titleStr.includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-card max-w-5xl w-full rounded-2xl p-5 sm:p-6 border border-amber-500/35 shadow-[0_0_50px_rgba(245,158,11,0.12)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-hairline shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">
                  ADMIN // ASSIGNMENT REVIEW QUEUE
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 font-mono text-[10px] font-bold">
                  MASTER ONLY
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Inspect student chart markups &amp; written breakdowns · Approve or request revision with mentor feedback.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onPlayTone(560, 'sine', 0.03);
                fetchAssignments();
              }}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#0e131e] border border-hairline hover:border-slate-500 text-slate-300 hover:text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
              aria-label="Close Assignment Review Queue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary & Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 py-4 border-b border-hairline shrink-0">
          <div className="md:col-span-5 flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#070a12] border border-hairline font-mono text-[11px]">
            {(
              [
                { key: 'pending', label: `Pending (${pendingCount})` },
                { key: 'approved', label: `Approved (${approvedCount})` },
                { key: 'all', label: `All (${assignments.length})` }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-1 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="md:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name or lesson title..."
                className="w-full bg-[#070a12] border border-hairline rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {revisionCount > 0 && (
              <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline font-mono text-[11px] text-rose-400 font-bold shrink-0">
                Revision: {revisionCount}
              </div>
            )}
          </div>
        </div>

        {/* Review List Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {fetchError && (
            <div className="p-3 rounded-lg bg-rose-950/35 border border-rose-500/40 text-rose-300 text-xs font-mono">
              {fetchError}
            </div>
          )}

          {isLoading && assignments.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Loading student assignment submissions...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs border border-hairline rounded-xl bg-[#070a12]">
              No submissions found in this filter.
            </div>
          ) : (
            filtered.map((item) => {
              const meta = getAssignmentMetaById(item.lesson_id);
              const lessonTitle = meta ? meta.title : item.lesson_id;
              const phaseTag = meta ? meta.phaseLabel : 'LESSON';
              const urls = parseScreenshotUrls(item.screenshot_url);
              const parsed = parseAssignmentAnswer(item.answer_text);
              const isBusy = updatingId === item.id;

              const timestampLabel = item.created_at
                ? new Date(item.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Recent';

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-xl bg-[#070a12] border border-hairline space-y-4"
                >
                  {/* Submission Card Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline">
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{item.student_name}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#0e131e] border border-hairline text-emerald-400 font-mono text-[10px] font-bold">
                          {phaseTag}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-300">
                          {lessonTitle}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Submitted: {timestampLabel}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>APPROVED</span>
                        </span>
                      ) : item.status === 'revision' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 font-mono text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>REVISION REQUESTED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>PENDING REVIEW</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chart Screenshot Thumbnails + Formatted Answers */}
                  <div className={`grid gap-4 ${urls.length > 0 ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
                    {urls.length > 0 && (
                      <div className="lg:col-span-5 space-y-2">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                          CHART MARKUP{urls.length > 1 ? 'S' : ''} (CLICK TO ZOOM)
                        </div>
                        <div className={`grid gap-2.5 ${urls.length > 1 ? 'grid-cols-2 lg:grid-cols-1' : 'grid-cols-1'}`}>
                          {urls.map((url, idx) => (
                            <button
                              key={url + idx}
                              type="button"
                              onClick={() =>
                                onOpenLightbox(
                                  urls,
                                  idx,
                                  `${item.student_name} — ${lessonTitle} (Chart ${idx + 1})`
                                )
                              }
                              className="group relative rounded-xl overflow-hidden border border-hairline bg-[#0a0d15] hover:border-emerald-500/60 transition-all text-left cursor-pointer"
                            >
                              <img
                                src={url}
                                alt={`${item.student_name} chart ${idx + 1}`}
                                className="w-full h-44 object-contain bg-slate-950/70"
                              />
                              <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-hairline">
                                <span>{meta?.imageUpload?.slotLabels?.[idx] || `Chart ${idx + 1}`}</span>
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                  <Maximize2 className="w-3 h-3" />
                                  <span>LIGHTBOX ZOOM</span>
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`${urls.length > 0 ? 'lg:col-span-7' : ''} space-y-2.5`}>
                      {parsed.fields.map((pf) => (
                        <div key={pf.key} className="p-3 rounded-lg bg-[#0a0d15] border border-hairline">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">
                            {pf.label}
                          </div>
                          <div className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {pf.value || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mentor Feedback & Review Actions */}
                  <div className="pt-3 border-t border-hairline space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                        Mentor Feedback
                      </label>
                      <textarea
                        rows={2}
                        value={feedbackDrafts[item.id] ?? ''}
                        onChange={(e) =>
                          setFeedbackDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Write optional praise or specific chart/rule corrections for the student..."
                        className="w-full bg-[#0a0d15] border border-hairline rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReviewDecision(item, 'revision')}
                        className="px-4 py-2 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>REQUEST REVISION</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReviewDecision(item, 'approved')}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>APPROVE ASSIGNMENT</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
