import React, { useState, useEffect } from 'react';
import {
  Lock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  Award,
  ClipboardCheck,
  AlertTriangle
} from 'lucide-react';
import {
  QUIZ_SECTIONS,
  QUIZ_PASSING_SCORE,
  QuizProgressState
} from '../data/quizData';

interface SectionAttemptState {
  answers: Record<number, number>;
  submitted: boolean;
  score: number | null;
  passed: boolean;
}

interface QuizzesTabProps {
  studentId?: string;
  isPhase2Unlocked: boolean;
  isMasterAccount?: boolean;
  progress: QuizProgressState;
  onSaveProgress: (nextProgress: QuizProgressState) => void;
  onPlayTone: (freq?: number, type?: OscillatorType, duration?: number) => void;
  onPlaySuccess: () => void;
  onPlayError: () => void;
}

export const QuizzesTab: React.FC<QuizzesTabProps> = ({
  studentId,
  isPhase2Unlocked,
  isMasterAccount = false,
  progress,
  onSaveProgress,
  onPlayTone,
  onPlaySuccess,
  onPlayError
}) => {
  const [activeSectionId, setActiveSectionId] = useState<number>(1);
  const [attempts, setAttempts] = useState<Record<number, SectionAttemptState>>({});
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Reset per-attempt transient state when student changes
  useEffect(() => {
    setActiveSectionId(1);
    setAttempts({});
    setLockedNotice(null);
  }, [studentId]);

  // If tier changes to Phase 1 while viewing Section 3 or 4, safely return to Section 1
  useEffect(() => {
    if (!isPhase2Unlocked && !isMasterAccount && activeSectionId >= 3) {
      setActiveSectionId(1);
    }
    if (isPhase2Unlocked || isMasterAccount) {
      setLockedNotice(null);
    }
  }, [isPhase2Unlocked, isMasterAccount, activeSectionId]);

  const isPhase2TierLocked = (sectionId: number): boolean => {
    if (isMasterAccount || isPhase2Unlocked) return false;
    return sectionId >= 3;
  };

  const isSectionUnlocked = (sectionId: number): boolean => {
    if (isMasterAccount) return true;
    if (isPhase2TierLocked(sectionId)) return false;
    if (sectionId === 1) return true;
    return progress.passedSections.includes(sectionId - 1);
  };

  const activeSection = QUIZ_SECTIONS.find((s) => s.id === activeSectionId) || QUIZ_SECTIONS[0];
  const currentAttempt: SectionAttemptState = attempts[activeSection.id] || {
    answers: {},
    submitted: false,
    score: null,
    passed: false
  };

  const answeredCount = activeSection.questions.filter(
    (q) => typeof currentAttempt.answers[q.id] === 'number'
  ).length;
  const allAnswered = answeredCount === activeSection.questions.length;

  const handleSelectSection = (sectionId: number) => {
    if (isPhase2TierLocked(sectionId)) {
      onPlayError();
      setLockedNotice(
        `SECTION 0${sectionId} LOCKED — SETTLE PHASE 2 TO UNLOCK. Upgrade to Phase 2 to unlock Sections 3 & 4.`
      );
      return;
    }
    if (!isSectionUnlocked(sectionId)) {
      onPlayError();
      setLockedNotice(
        `SECTION ${sectionId} LOCKED // Pass Section ${sectionId - 1} with at least ${QUIZ_PASSING_SCORE}/10 (70%) to unlock.`
      );
      return;
    }
    setLockedNotice(null);
    setActiveSectionId(sectionId);
    onPlayTone(540, 'sine', 0.04);
  };

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    if (currentAttempt.submitted) return;
    onPlayTone(520, 'sine', 0.02);
    setAttempts((prev) => {
      const existing = prev[activeSection.id] || {
        answers: {},
        submitted: false,
        score: null,
        passed: false
      };
      return {
        ...prev,
        [activeSection.id]: {
          ...existing,
          answers: {
            ...existing.answers,
            [questionId]: optionIdx
          }
        }
      };
    });
  };

  const handleSubmitSection = () => {
    if (!allAnswered || currentAttempt.submitted) return;

    let score = 0;
    for (const q of activeSection.questions) {
      if (currentAttempt.answers[q.id] === q.correctIndex) {
        score += 1;
      }
    }

    const passed = score >= QUIZ_PASSING_SCORE;

    setAttempts((prev) => ({
      ...prev,
      [activeSection.id]: {
        ...currentAttempt,
        submitted: true,
        score,
        passed
      }
    }));

    const prevBest = progress.bestScores[activeSection.id] ?? 0;
    const nextBest = Math.max(prevBest, score);
    const nextPassedSet = new Set(progress.passedSections);
    if (passed) {
      nextPassedSet.add(activeSection.id);
    }

    onSaveProgress({
      passedSections: Array.from(nextPassedSet).sort((a, b) => a - b),
      bestScores: {
        ...progress.bestScores,
        [activeSection.id]: nextBest
      }
    });

    if (passed) {
      onPlaySuccess();
    } else {
      onPlayError();
    }
  };

  const handleRetakeSection = (sectionId: number) => {
    onPlayTone(580, 'sine', 0.04);
    setAttempts((prev) => ({
      ...prev,
      [sectionId]: {
        answers: {},
        submitted: false,
        score: null,
        passed: false
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* TOP SUMMARY & SEQUENTIAL 4-SECTION STEPPER */}
      <div className="glass-card rounded-xl p-5 border-hairline">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                DESK MASTERY ASSESSMENT // 40-QUESTION EXAMINATION
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Pass each 10-question section with at least 7/10 (70%) to unlock the next section. Incorrect answers are masked to protect exam integrity.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-[#0e131e] border border-hairline font-mono text-xs flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">SECTIONS PASSED:</span>
              <span className="font-bold text-emerald-400 num-mono">
                {progress.passedSections.length}/4
              </span>
            </div>
          </div>
        </div>

        {lockedNotice && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/35 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{lockedNotice}</span>
          </div>
        )}

        {/* 4 Section Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {QUIZ_SECTIONS.map((sec) => {
            const tierLocked = isPhase2TierLocked(sec.id);
            const unlocked = isSectionUnlocked(sec.id);
            const isPassed = progress.passedSections.includes(sec.id);
            const bestScore = progress.bestScores[sec.id];
            const isActive = activeSection.id === sec.id;

            let cardStyle = 'bg-[#070a12] border-hairline hover:border-slate-600 cursor-pointer';
            if (tierLocked) {
              cardStyle = 'bg-[#07090e] border-hairline cursor-not-allowed';
            } else if (!unlocked) {
              cardStyle = 'bg-[#07090e] border-hairline opacity-60 cursor-not-allowed';
            } else if (isActive) {
              cardStyle = 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.12)] cursor-pointer';
            } else if (isPassed) {
              cardStyle = 'bg-emerald-950/20 border-emerald-500/35 hover:border-emerald-500/60 cursor-pointer';
            }

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSelectSection(sec.id)}
                className={`relative overflow-hidden text-left rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-2 ${cardStyle}`}
              >
                <div
                  className={`flex flex-col justify-between gap-2 w-full h-full ${
                    tierLocked ? 'blur-[2.5px] opacity-40 grayscale pointer-events-none select-none' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
                      SECTION 0{sec.id}
                    </span>
                    {!unlocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
                        <Lock className="w-3 h-3" />
                        LOCKED
                      </span>
                    ) : isPassed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400">
                        UNLOCKED
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-white leading-snug">
                    {sec.title}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-hairline">
                    <span>10 Questions</span>
                    <span className={typeof bestScore === 'number' ? (bestScore >= QUIZ_PASSING_SCORE ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold') : ''}>
                      {typeof bestScore === 'number' ? `Best: ${bestScore}/10` : 'Not attempted'}
                    </span>
                  </div>
                </div>

                {tierLocked && (
                  <div className="absolute inset-0 flex items-center justify-center p-2.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e131e] border border-amber-500/40 shadow-lg text-[10px] font-mono font-bold tracking-wider text-amber-300 text-center leading-tight">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>LOCKED — SETTLE PHASE 2 TO UNLOCK</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE SECTION QUESTIONS PANEL */}
      <div className="glass-card rounded-xl p-5 border-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline mb-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              {activeSection.subtitle}
            </span>
            <h4 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Section {activeSection.id}: {activeSection.title}
            </h4>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-[#0e131e] border border-hairline text-slate-300 num-mono">
              Answered: <strong className="text-white">{answeredCount}/10</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#0e131e] border border-hairline text-slate-400 num-mono">
              Pass: <strong className="text-emerald-400">7/10</strong>
            </span>
          </div>
        </div>

        {/* Submission Result Banner (Shown After Submit) */}
        {currentAttempt.submitted && currentAttempt.score !== null && (
          <div
            className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              currentAttempt.passed
                ? 'bg-emerald-950/35 border-emerald-500/40'
                : 'bg-rose-950/35 border-rose-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              {currentAttempt.passed ? (
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <div
                  className={`text-sm sm:text-base font-mono font-bold num-mono ${
                    currentAttempt.passed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {currentAttempt.score}/10 — {currentAttempt.passed ? 'PASSED' : 'FAILED, TRY AGAIN'}
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {currentAttempt.passed
                    ? activeSection.id < 4
                      ? isPhase2TierLocked(activeSection.id + 1)
                        ? `Section ${activeSection.id} passed! Settle Phase 2 to unlock Sections 3 & 4. Incorrect answers remain hidden.`
                        : `Section ${activeSection.id + 1} is now unlocked. Incorrect answers remain hidden.`
                      : 'All 4 mastery sections completed. Incorrect answers remain hidden.'
                    : `Minimum ${QUIZ_PASSING_SCORE}/10 (70%) required to pass. Review your flagged responses and retake.`}
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleRetakeSection(activeSection.id)}
                className="px-3.5 py-2 rounded-lg bg-[#0e131e] border border-hairline hover:border-slate-500 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Section</span>
              </button>

              {currentAttempt.passed && activeSection.id < 4 && !isPhase2TierLocked(activeSection.id + 1) && (
                <button
                  type="button"
                  onClick={() => handleSelectSection(activeSection.id + 1)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Next: Section {activeSection.id + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {currentAttempt.passed && activeSection.id < 4 && isPhase2TierLocked(activeSection.id + 1) && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0e131e] border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>LOCKED — SETTLE PHASE 2 TO UNLOCK</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {activeSection.questions.map((q, qIdx) => {
            const selectedIdx = currentAttempt.answers[q.id];
            const isSubmitted = currentAttempt.submitted;
            const isQuestionCorrect = isSubmitted && selectedIdx === q.correctIndex;
            const isQuestionIncorrect = isSubmitted && selectedIdx !== q.correctIndex;

            let questionCardClass = 'bg-[#070a12] border-hairline';
            if (isQuestionCorrect) {
              questionCardClass = 'bg-[#070a12] border-emerald-500/40';
            } else if (isQuestionIncorrect) {
              questionCardClass = 'bg-[#070a12] border-rose-500/40';
            }

            return (
              <div
                key={q.id}
                className={`rounded-xl p-4 sm:p-5 border transition-all ${questionCardClass}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-[#0e131e] border border-hairline font-mono text-[11px] font-bold text-emerald-400 num-mono shrink-0 mt-0.5">
                      Q{String(qIdx + 1).padStart(2, '0')}
                    </span>
                    <h5 className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                      {q.question}
                    </h5>
                  </div>

                  {isQuestionCorrect && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                      ✓ Correct
                    </span>
                  )}
                  {isQuestionIncorrect && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-bold">
                      ✕ Incorrect
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:pl-9">
                  {q.options.map((optText, optIdx) => {
                    const isSelected = selectedIdx === optIdx;

                    let optionStyle =
                      'bg-[#0a0d15] border-hairline text-slate-300 hover:border-slate-600 hover:text-white';
                    let statusTag: React.ReactNode = null;

                    if (!isSubmitted) {
                      if (isSelected) {
                        optionStyle =
                          'bg-emerald-500/15 border-emerald-500 text-white font-medium';
                      }
                    } else {
                      // CRITICAL ANTI-CHEAT: ONLY highlight the student's chosen option!
                      // Never highlight or reveal any unchosen option even when incorrect.
                      if (isSelected && optIdx === q.correctIndex) {
                        optionStyle =
                          'bg-emerald-950/35 border-emerald-500 text-emerald-300 font-semibold';
                        statusTag = (
                          <span className="shrink-0 text-[11px] font-mono font-bold text-emerald-400">
                            ✓ Correct
                          </span>
                        );
                      } else if (isSelected && optIdx !== q.correctIndex) {
                        optionStyle =
                          'bg-rose-950/35 border-rose-500 text-rose-300 font-semibold';
                        statusTag = (
                          <span className="shrink-0 text-[11px] font-mono font-bold text-rose-400">
                            ✕ Incorrect
                          </span>
                        );
                      } else {
                        optionStyle =
                          'bg-[#0a0d15] border-hairline text-slate-400 opacity-75';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs sm:text-[13px] transition-all flex items-center justify-between gap-3 ${optionStyle} ${
                          isSubmitted ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <span className="leading-snug">{optText}</span>
                        {statusTag}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Submit / Retake Bar */}
        <div className="mt-6 pt-4 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            {currentAttempt.submitted ? (
              <span>
                Submitted Score:{' '}
                <strong className={currentAttempt.passed ? 'text-emerald-400' : 'text-rose-400'}>
                  {currentAttempt.score}/10 ({currentAttempt.passed ? 'PASSED' : 'FAILED, TRY AGAIN'})
                </strong>
              </span>
            ) : allAnswered ? (
              <span className="text-emerald-400 font-semibold">
                All 10 questions answered — ready to submit Section {activeSection.id}.
              </span>
            ) : (
              <span>
                Answer all 10 questions to unlock submission ({answeredCount}/10 completed).
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {!currentAttempt.submitted ? (
              <button
                type="button"
                disabled={!allAnswered}
                onClick={handleSubmitSection}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-mono text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  allAnswered
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>SUBMIT SECTION</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleRetakeSection(activeSection.id)}
                  className="px-4 py-2.5 rounded-lg bg-[#0e131e] border border-hairline hover:border-slate-500 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Section</span>
                </button>
                {currentAttempt.passed && activeSection.id < 4 && !isPhase2TierLocked(activeSection.id + 1) && (
                  <button
                    type="button"
                    onClick={() => handleSelectSection(activeSection.id + 1)}
                    className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Proceed to Section {activeSection.id + 1}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
