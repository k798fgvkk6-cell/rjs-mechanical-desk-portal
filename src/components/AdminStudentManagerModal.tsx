import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Loader2,
  BookOpen,
  Award,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { supabase, StudentSession, extractCurrentPhase } from '../lib/supabase';
import {
  extractLessonIdsFromCloud,
  extractQuizProgressFromCloud,
  mergeCurrentPhaseIntoCloudLessons
} from '../data/quizData';

interface TradeSummary {
  count: number;
  netPnL: number;
}

interface AdminStudentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  phase1LessonIds: string[];
  phase2LessonIds: string[];
  isMasterAccountFn: (student?: StudentSession | null) => boolean;
  onCurrentStudentUpdated?: (updatedStudent: StudentSession) => void;
  onToast: (type: 'success' | 'error', message: string) => void;
  onPlaySuccess: () => void;
  onPlayError: () => void;
  onPlayTone: (freq?: number, type?: OscillatorType, duration?: number) => void;
}

const normalizeId = (id: string): string =>
  id.toLowerCase().replace(/[-_]/g, '').replace(/^pro(?=\d)/, 'pa');

export const AdminStudentManagerModal: React.FC<AdminStudentManagerModalProps> = ({
  isOpen,
  onClose,
  phase1LessonIds,
  phase2LessonIds,
  isMasterAccountFn,
  onCurrentStudentUpdated,
  onToast,
  onPlaySuccess,
  onPlayError,
  onPlayTone
}) => {
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [tradeSummaryByStudent, setTradeSummaryByStudent] = useState<Record<string, TradeSummary>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [updatingPhaseStudentId, setUpdatingPhaseStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'PHASE1' | 'PHASE2'>('ALL');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRoster = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [studentsRes, tradesRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('trade_logs')
          .select('student_id, net_pnl')
      ]);

      if (studentsRes.error) {
        throw studentsRes.error;
      }

      const list: StudentSession[] = (studentsRes.data || []).map((s: any) => {
        const unlocked = Array.isArray(s.unlocked_lessons) ? s.unlocked_lessons : [];
        return {
          id: s.id,
          full_name: s.full_name,
          email: s.email ?? null,
          tier: s.tier || 'phase1',
          currentPhase: extractCurrentPhase(unlocked, s.current_phase),
          current_phase: s.current_phase ?? null,
          is_active: s.is_active,
          unlocked_lessons: unlocked,
          passcode: s.passcode,
          created_at: s.created_at
        };
      });
      setStudents(list);

      const summaryMap: Record<string, TradeSummary> = {};
      if (!tradesRes.error && Array.isArray(tradesRes.data)) {
        for (const tr of tradesRes.data as { student_id: string; net_pnl: number }[]) {
          if (!tr.student_id) continue;
          if (!summaryMap[tr.student_id]) {
            summaryMap[tr.student_id] = { count: 0, netPnL: 0 };
          }
          summaryMap[tr.student_id].count += 1;
          summaryMap[tr.student_id].netPnL += Number(tr.net_pnl) || 0;
        }
      }
      setTradeSummaryByStudent(summaryMap);
    } catch (err: any) {
      console.error('Admin roster fetch error:', err);
      setFetchError(err?.message || 'Unable to load enrolled student roster from Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRoster();
    }
  }, [isOpen, fetchRoster]);

  if (!isOpen) return null;

  const isSettledPhase2 = (student: StudentSession): boolean => {
    const t = (student.tier || 'phase1').toLowerCase();
    return t === 'phase2' || t === 'pro' || isMasterAccountFn(student);
  };

  const getStudentCurrentPhase = (student: StudentSession): 1 | 2 =>
    student.currentPhase ?? extractCurrentPhase(student.unlocked_lessons, student.current_phase);

  const handleToggleStudentTier = async (student: StudentSession) => {
    if (isMasterAccountFn(student) || updatingStudentId) return;

    const currentlySettled = isSettledPhase2(student);
    const nextTier = currentlySettled ? 'phase1' : 'phase2';

    setUpdatingStudentId(student.id);
    onPlayTone(620, 'sine', 0.04);

    try {
      const { data: updated, error } = await supabase
        .from('students')
        .update({ tier: nextTier })
        .eq('id', student.id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      const nextRow: StudentSession = {
        ...student,
        tier: updated?.tier || nextTier
      };

      setStudents((prev) => prev.map((row) => (row.id === student.id ? nextRow : row)));
      onCurrentStudentUpdated?.(nextRow);

      onPlaySuccess();
      onToast(
        'success',
        nextTier === 'phase2'
          ? `${student.full_name} set to PHASE 2 SETTLED — All Phase 2 modules unlocked.`
          : `${student.full_name} set to PHASE 1 — Phase 2 content locked.`
      );
    } catch (err: any) {
      console.error('Supabase tier toggle error:', err);
      onPlayError();
      onToast(
        'error',
        `Failed to update tier for ${student.full_name}: ${err?.message || 'Database error'}`
      );
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleSetStudentCurrentPhase = async (student: StudentSession, targetPhase?: 1 | 2) => {
    if (updatingPhaseStudentId) return;
    const currentPhase = getStudentCurrentPhase(student);
    const nextPhase: 1 | 2 = targetPhase ?? (currentPhase === 2 ? 1 : 2);
    if (nextPhase === currentPhase) return;

    const nextUnlocked = mergeCurrentPhaseIntoCloudLessons(student.unlocked_lessons, nextPhase);

    setUpdatingPhaseStudentId(student.id);
    onPlayTone(660, 'sine', 0.04);

    try {
      let updatedRow: any = null;
      const firstAttempt = await supabase
        .from('students')
        .update({ unlocked_lessons: nextUnlocked, current_phase: nextPhase })
        .eq('id', student.id)
        .select('*')
        .maybeSingle();

      if (firstAttempt.error) {
        const msg = String(firstAttempt.error.message || '').toLowerCase();
        if (msg.includes('current_phase') || firstAttempt.error.code === '42703' || firstAttempt.error.code === 'PGRST204') {
          const fallbackAttempt = await supabase
            .from('students')
            .update({ unlocked_lessons: nextUnlocked })
            .eq('id', student.id)
            .select('*')
            .maybeSingle();
          if (fallbackAttempt.error) throw fallbackAttempt.error;
          updatedRow = fallbackAttempt.data;
        } else {
          throw firstAttempt.error;
        }
      } else {
        updatedRow = firstAttempt.data;
      }

      const finalUnlocked = Array.isArray(updatedRow?.unlocked_lessons)
        ? updatedRow.unlocked_lessons
        : nextUnlocked;

      const nextStudent: StudentSession = {
        ...student,
        unlocked_lessons: finalUnlocked,
        current_phase: updatedRow?.current_phase ?? nextPhase,
        currentPhase: extractCurrentPhase(finalUnlocked, updatedRow?.current_phase ?? nextPhase)
      };

      setStudents((prev) => prev.map((row) => (row.id === student.id ? nextStudent : row)));
      onCurrentStudentUpdated?.(nextStudent);

      onPlaySuccess();
      onToast(
        'success',
        nextPhase === 2
          ? `${student.full_name} promoted to PHASE 2 — Goal switched to ₱20,000 + Swing Wins tracker; Phase 1 logs archived.`
          : `${student.full_name} switched to PHASE 1 — Goal set to ₱10,000.`
      );
    } catch (err: any) {
      console.error('Supabase currentPhase update error:', err);
      onPlayError();
      onToast(
        'error',
        `Failed to update Phase for ${student.full_name}: ${err?.message || 'Database error'}`
      );
    } finally {
      setUpdatingPhaseStudentId(null);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !normalizedQuery ||
      (s.full_name || '').toLowerCase().includes(normalizedQuery) ||
      (s.email || '').toLowerCase().includes(normalizedQuery);
    if (!matchesSearch) return false;

    const settled = isSettledPhase2(s);
    if (tierFilter === 'PHASE1') return !settled;
    if (tierFilter === 'PHASE2') return settled;
    return true;
  });

  const nonMasterStudents = students.filter((s) => !isMasterAccountFn(s));
  const phase1Count = nonMasterStudents.filter((s) => !isSettledPhase2(s)).length;
  const phase2Count = nonMasterStudents.filter((s) => isSettledPhase2(s)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-card max-w-4xl w-full rounded-2xl p-5 sm:p-6 border border-amber-500/35 shadow-[0_0_50px_rgba(245,158,11,0.12)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-hairline shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">
                  ADMIN // STUDENT ACCESS MANAGER
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 font-mono text-[10px] font-bold">
                  MASTER ONLY
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Live Supabase roster · Toggle Phase 2 access or promote any student&apos;s active trading logbook between Phase 1 (₱10k) and Phase 2 (₱20k).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onPlayTone(560, 'sine', 0.03);
                fetchRoster();
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
              aria-label="Close Student Access Manager"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metrics & Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 py-4 border-b border-hairline shrink-0">
          <div className="md:col-span-5 grid grid-cols-3 gap-2">
            <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Enrolled</div>
              <div className="text-base font-mono font-bold text-white num-mono">{students.length}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Phase 1</div>
              <div className="text-base font-mono font-bold text-emerald-400 num-mono">{phase1Count}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Phase 2</div>
              <div className="text-base font-mono font-bold text-cyan-400 num-mono">{phase2Count}</div>
            </div>
          </div>

          <div className="md:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name or email..."
                className="w-full bg-[#070a12] border border-hairline rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a12] border border-hairline font-mono text-[11px] shrink-0">
              {(['ALL', 'PHASE1', 'PHASE2'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTierFilter(f)}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    tierFilter === f
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'ALL' ? 'ALL' : f === 'PHASE1' ? 'PHASE 1' : 'PHASE 2'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Roster Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-2.5 pr-1">
          {fetchError && (
            <div className="p-3 rounded-lg bg-rose-950/35 border border-rose-500/40 text-rose-300 text-xs font-mono">
              {fetchError}
            </div>
          )}

          {isLoading && students.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Loading enrolled student roster from Supabase...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center text-slate-400 font-mono text-xs border border-hairline rounded-xl bg-[#070a12]">
              No matching students found.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isMaster = isMasterAccountFn(student);
              const settled = isSettledPhase2(student);
              const activePhase = getStudentCurrentPhase(student);
              const isUpdating = updatingStudentId === student.id;
              const isUpdatingPhase = updatingPhaseStudentId === student.id;

              const lessonIds = extractLessonIdsFromCloud(student.unlocked_lessons);
              const p1Done = phase1LessonIds.filter((id) =>
                lessonIds.some((u) => normalizeId(u) === normalizeId(id))
              ).length;
              const p2Done = phase2LessonIds.filter((id) =>
                lessonIds.some((u) => normalizeId(u) === normalizeId(id))
              ).length;
              const quizProg = extractQuizProgressFromCloud(student.unlocked_lessons);
              const quizPassed = quizProg.passedSections.length;
              const tradeStats = tradeSummaryByStudent[student.id] || { count: 0, netPnL: 0 };

              const joinedLabel = student.created_at
                ? new Date(student.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Enrolled';

              return (
                <div
                  key={student.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-[#070a12] border border-hairline flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all"
                >
                  {/* Student Name / Email & Progress */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          student.is_active ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                        title={student.is_active ? 'Active Account' : 'Inactive Account'}
                      />
                      <span className="text-sm font-bold text-white truncate">
                        {student.full_name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 truncate">
                        {student.email ? student.email : `Enrolled ${joinedLabel}`}
                      </span>
                      {!student.is_active && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-bold">
                          INACTIVE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0e131e] border border-hairline num-mono">
                        <BookOpen className="w-3 h-3 text-emerald-400" />
                        <span>P1: <strong className="text-white">{p1Done}/{phase1LessonIds.length}</strong></span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0e131e] border border-hairline num-mono">
                        <BookOpen className="w-3 h-3 text-cyan-400" />
                        <span>P2: <strong className="text-white">{p2Done}/{phase2LessonIds.length}</strong></span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0e131e] border border-hairline num-mono">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>Quizzes: <strong className="text-white">{quizPassed}/4</strong></span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0e131e] border border-hairline num-mono">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span>
                          Logs: <strong className="text-white">{tradeStats.count}</strong> (
                          <strong className={tradeStats.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {tradeStats.netPnL >= 0 ? '+' : '-'}₱{Math.abs(Math.round(tradeStats.netPnL)).toLocaleString()}
                          </strong>
                          )
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Phase Promotion + Access Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-hairline">
                    {/* Logbook Phase Promotion Control (currentPhase 1 vs 2) */}
                    <div className="flex items-center gap-1.5">
                      {activePhase === 1 ? (
                        <button
                          type="button"
                          disabled={isUpdatingPhase}
                          onClick={() => handleSetStudentCurrentPhase(student, 2)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold tracking-wider flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                          title="Promote student's trading logbook & profit goal to Phase 2 (₱20,000)"
                        >
                          {isUpdatingPhase ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          <span>PROMOTE TO PHASE 2</span>
                        </button>
                      ) : (
                        <div className="inline-flex items-center rounded-lg bg-[#0e131e] border border-cyan-500/40 p-0.5 font-mono text-[10px]">
                          <button
                            type="button"
                            disabled={isUpdatingPhase}
                            onClick={() => handleSetStudentCurrentPhase(student, 1)}
                            className="px-2 py-0.5 rounded text-slate-400 hover:text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="Switch logbook back to Phase 1"
                          >
                            PHASE 1
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingPhase}
                            onClick={() => handleSetStudentCurrentPhase(student, 2)}
                            className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/45 text-cyan-300 font-bold cursor-default"
                          >
                            {isUpdatingPhase ? '...' : 'PHASE 2'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tier Access Switch */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5">
                      {isMaster ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>MASTER ADMIN</span>
                          </span>
                        </>
                      ) : (
                        <>
                          {settled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>PHASE 2 SETTLED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e131e] border border-hairline text-slate-300 font-mono text-[11px] font-bold">
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>PHASE 1</span>
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={settled}
                              aria-label={`Toggle Phase 2 access for ${student.full_name}`}
                              disabled={isUpdating}
                              onClick={() => handleToggleStudentTier(student)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none cursor-pointer disabled:opacity-50 ${
                                settled
                                  ? 'bg-emerald-600 border-emerald-400'
                                  : 'bg-slate-800 border-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  settled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </>
                      )}
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
