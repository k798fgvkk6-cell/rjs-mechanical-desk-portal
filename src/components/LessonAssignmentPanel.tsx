import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  Trash2,
  Maximize2,
  MessageSquare,
  Edit3,
  Lock
} from 'lucide-react';
import { supabase, StudentSession, LessonAssignmentRecord } from '../lib/supabase';
import {
  AssignmentConfig,
  getAssignmentsForLesson,
  serializeAssignmentAnswer,
  parseAssignmentAnswer,
  parseScreenshotUrls,
  serializeScreenshotUrls
} from '../data/lessonAssignmentsData';

interface LessonAssignmentPanelProps {
  activeLessonId: string;
  activeLessonDuration: string;
  isTierLocked: boolean;
  currentStudent: StudentSession | null;
  submissionsByAssignmentId: Record<string, LessonAssignmentRecord>;
  onSubmissionSaved: (record: LessonAssignmentRecord) => void;
  onToast: (type: 'success' | 'error', message: string) => void;
  onPlaySuccess: () => void;
  onPlayError: () => void;
  onPlayTone: (freq?: number, type?: OscillatorType, duration?: number) => void;
  onOpenLightbox: (urls: string[], index: number, caption: string) => void;
}

interface PendingImageSlot {
  file: File;
  previewUrl: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export const LessonAssignmentPanel: React.FC<LessonAssignmentPanelProps> = ({
  activeLessonId,
  activeLessonDuration,
  isTierLocked,
  currentStudent,
  submissionsByAssignmentId,
  onSubmissionSaved,
  onToast,
  onPlaySuccess,
  onPlayError,
  onPlayTone,
  onOpenLightbox
}) => {
  const configs = getAssignmentsForLesson(activeLessonId);
  const [selectedPartIndex, setSelectedPartIndex] = useState<number>(0);

  // Reset selected part index when changing lessons
  useEffect(() => {
    setSelectedPartIndex(0);
  }, [activeLessonId]);

  const activeConfig: AssignmentConfig | undefined = configs[selectedPartIndex] || configs[0];
  const existingRecord = activeConfig ? submissionsByAssignmentId[activeConfig.assignmentId] : undefined;

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [checkboxChecked, setCheckboxChecked] = useState<boolean>(false);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImageSlot[]>([]);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Sync form inputs whenever switching assignment part or receiving updated record
  useEffect(() => {
    // Cleanup any old object URLs
    setPendingImages((prev) => {
      prev.forEach((p) => {
        try {
          URL.revokeObjectURL(p.previewUrl);
        } catch {}
      });
      return [];
    });
    setFormError(null);

    if (!activeConfig) return;

    if (existingRecord) {
      const parsed = parseAssignmentAnswer(existingRecord.answer_text);
      const nextVals: Record<string, string> = {};
      activeConfig.fields.forEach((f) => {
        const matched = parsed.fields.find((pf) => pf.key === f.key);
        if (matched) {
          nextVals[f.key] = matched.value;
        } else if (f.type === 'rating_high_low') {
          nextVals[f.key] = 'HIGH';
        } else if (f.type === 'swing_option' && f.options?.[0]) {
          nextVals[f.key] = f.options[0].value;
        } else {
          nextVals[f.key] = '';
        }
      });
      setFieldValues(nextVals);

      if (activeConfig.requiredCheckbox) {
        const cbField = parsed.fields.find((pf) => pf.key === activeConfig.requiredCheckbox?.key);
        setCheckboxChecked(Boolean(cbField && cbField.value.startsWith('CONFIRMED:')));
      } else {
        setCheckboxChecked(false);
      }

      setExistingImageUrls(parseScreenshotUrls(existingRecord.screenshot_url));
      setIsEditingExisting(existingRecord.status === 'revision');
    } else {
      const initialVals: Record<string, string> = {};
      activeConfig.fields.forEach((f) => {
        if (f.type === 'rating_high_low') {
          initialVals[f.key] = 'HIGH';
        } else if (f.type === 'swing_option' && f.options?.[0]) {
          initialVals[f.key] = f.options[0].value;
        } else {
          initialVals[f.key] = '';
        }
      });
      setFieldValues(initialVals);
      setCheckboxChecked(false);
      setExistingImageUrls([]);
      setIsEditingExisting(true);
    }
  }, [activeConfig?.assignmentId, existingRecord?.id, existingRecord?.status, existingRecord?.answer_text, existingRecord?.screenshot_url]);

  if (!activeConfig) return null;

  const isTbdLocked = activeLessonDuration.toUpperCase() === 'TBD';
  const showForm = !existingRecord || existingRecord.status === 'revision' || isEditingExisting;
  const maxImages = activeConfig.imageUpload?.maxImages || 1;

  const validateAndAddFiles = (files: FileList | File[], targetSlotIndex?: number) => {
    setFormError(null);
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const validSlots: PendingImageSlot[] = [];
    for (const file of arr) {
      if (!file.type.startsWith('image/')) {
        setFormError('Only image files (PNG, JPG, WEBP, GIF) are accepted for chart uploads.');
        onPlayError();
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setFormError(`Image "${file.name}" exceeds the 10MB file limit.`);
        onPlayError();
        return;
      }
      validSlots.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (typeof targetSlotIndex === 'number' && maxImages === 2) {
      // Replace/assign specific slot
      const totalCurrent = existingImageUrls.length + pendingImages.length;
      if (targetSlotIndex < existingImageUrls.length) {
        const nextExisting = [...existingImageUrls];
        nextExisting.splice(targetSlotIndex, 1);
        setExistingImageUrls(nextExisting);
        setPendingImages((prev) => [...prev, validSlots[0]].slice(0, maxImages - nextExisting.length));
      } else {
        const pendingIdx = targetSlotIndex - existingImageUrls.length;
        setPendingImages((prev) => {
          const next = [...prev];
          if (pendingIdx < next.length) {
            try {
              URL.revokeObjectURL(next[pendingIdx].previewUrl);
            } catch {}
            next[pendingIdx] = validSlots[0];
          } else if (totalCurrent < maxImages) {
            next.push(validSlots[0]);
          }
          return next.slice(0, Math.max(0, maxImages - existingImageUrls.length));
        });
      }
      onPlayTone(620, 'sine', 0.04);
      return;
    }

    if (maxImages === 1) {
      // Replace any previous single image
      pendingImages.forEach((p) => {
        try {
          URL.revokeObjectURL(p.previewUrl);
        } catch {}
      });
      setExistingImageUrls([]);
      setPendingImages([validSlots[0]]);
    } else {
      const remainingCapacity = Math.max(0, maxImages - existingImageUrls.length - pendingImages.length);
      if (remainingCapacity <= 0) {
        setFormError(`Maximum of ${maxImages} chart screenshots allowed. Remove one before adding another.`);
        onPlayError();
        return;
      }
      setPendingImages((prev) => [...prev, ...validSlots.slice(0, remainingCapacity)]);
    }
    onPlayTone(620, 'sine', 0.04);
  };

  const handleRemoveExistingImage = (idx: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== idx));
    onPlayTone(440, 'sine', 0.03);
  };

  const handleRemovePendingImage = (idx: number) => {
    setPendingImages((prev) => {
      const target = prev[idx];
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      return prev.filter((_, i) => i !== idx);
    });
    onPlayTone(440, 'sine', 0.03);
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentStudent?.id) {
      setFormError('Please log in with your Desk Security Key before submitting assignments.');
      onPlayError();
      return;
    }

    // Validate required text fields
    for (const f of activeConfig.fields) {
      if (f.required && !(fieldValues[f.key] || '').trim()) {
        setFormError(`Please complete "${f.label}" before submitting.`);
        onPlayError();
        return;
      }
    }

    // Validate required checkbox
    if (activeConfig.requiredCheckbox && !checkboxChecked) {
      setFormError(`Please check the required confirmation: "${activeConfig.requiredCheckbox.label}"`);
      onPlayError();
      return;
    }

    // Validate required image upload
    const totalImagesCount = existingImageUrls.length + pendingImages.length;
    if (activeConfig.imageUpload?.enabled && activeConfig.imageUpload.required && totalImagesCount === 0) {
      setFormError(`Please attach your chart screenshot (${activeConfig.imageUpload.label}).`);
      onPlayError();
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [...existingImageUrls];

      for (let i = 0; i < pendingImages.length; i++) {
        const slot = pendingImages[i];
        const cleanName = slot.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${currentStudent.id}/${activeConfig.assignmentId}/${Date.now()}_${i}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from('assignments')
          .upload(storagePath, slot.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadErr) {
          throw new Error(`Chart upload failed: ${uploadErr.message}`);
        }

        const { data: pubData } = supabase.storage
          .from('assignments')
          .getPublicUrl(storagePath);

        if (pubData?.publicUrl) {
          uploadedUrls.push(pubData.publicUrl);
        }
      }

      const serializedAnswer = serializeAssignmentAnswer(activeConfig, fieldValues, checkboxChecked);
      const serializedImages = serializeScreenshotUrls(uploadedUrls);

      let savedRow: LessonAssignmentRecord | null = null;

      if (existingRecord?.id) {
        const { data: updated, error: updErr } = await supabase
          .from('lesson_assignments')
          .update({
            student_name: currentStudent.full_name,
            answer_text: serializedAnswer,
            screenshot_url: serializedImages,
            status: 'pending',
            mentor_feedback: null,
            created_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select('*')
          .maybeSingle();

        if (!updErr && updated) {
          savedRow = updated as LessonAssignmentRecord;
        }
      }

      if (!savedRow) {
        const { data: inserted, error: insErr } = await supabase
          .from('lesson_assignments')
          .insert({
            student_id: currentStudent.id,
            student_name: currentStudent.full_name,
            lesson_id: activeConfig.assignmentId,
            answer_text: serializedAnswer,
            screenshot_url: serializedImages,
            status: 'pending',
            mentor_feedback: null
          })
          .select('*')
          .single();

        if (insErr) {
          throw new Error(insErr.message || 'Failed to save assignment submission.');
        }
        savedRow = inserted as LessonAssignmentRecord;
      }

      onSubmissionSaved(savedRow);
      setIsEditingExisting(false);
      onPlaySuccess();
      onToast('success', `${activeConfig.title} submitted for mentor review.`);
    } catch (err: any) {
      console.error('Assignment submission error:', err);
      setFormError(err?.message || 'Unable to submit assignment. Please try again.');
      onPlayError();
      onToast('error', err?.message || 'Assignment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>APPROVED</span>
        </span>
      );
    }
    if (status === 'revision') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 font-mono text-[11px] font-bold">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>REVISION REQUESTED</span>
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold">
          <Clock className="w-3.5 h-3.5" />
          <span>PENDING MENTOR REVIEW</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e131e] border border-hairline text-slate-400 font-mono text-[11px] font-bold">
        <span>NOT SUBMITTED</span>
      </span>
    );
  };

  const getMiniDotClass = (assignmentId: string) => {
    const rec = submissionsByAssignmentId[assignmentId];
    if (!rec) return 'bg-slate-600';
    if (rec.status === 'approved') return 'bg-emerald-400';
    if (rec.status === 'revision') return 'bg-rose-400';
    return 'bg-amber-400';
  };

  // Group fields so metrics4 renders neatly in a 4-column grid
  const renderFormFields = () => {
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < activeConfig.fields.length) {
      const f = activeConfig.fields[i];

      if (f.gridGroup === 'metrics4') {
        const groupFields = [f];
        while (i + 1 < activeConfig.fields.length && activeConfig.fields[i + 1].gridGroup === 'metrics4') {
          i++;
          groupFields.push(activeConfig.fields[i]);
        }

        nodes.push(
          <div key={`metrics-grid-${f.key}`} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {groupFields.map((gf) => (
              <div key={gf.key} className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {gf.label} {gf.required && <span className="text-rose-400">*</span>}
                </label>
                <input
                  type="text"
                  value={fieldValues[gf.key] || ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [gf.key]: e.target.value }))}
                  placeholder={gf.placeholder}
                  className="w-full bg-[#070a12] border border-hairline rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 num-mono"
                />
              </div>
            ))}
          </div>
        );
        i++;
        continue;
      }

      if (f.type === 'rating_high_low') {
        const val = fieldValues[f.key] || 'HIGH';
        nodes.push(
          <div key={f.key} className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              {f.label} {f.required && <span className="text-rose-400">*</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(f.options || []).map((opt) => {
                const selected = val === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setFieldValues((prev) => ({ ...prev, [f.key]: opt.value }));
                      onPlayTone(540, 'sine', 0.03);
                    }}
                    className={`py-2 px-3 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                      selected
                        ? opt.value === 'HIGH'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-[#070a12] border-hairline text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.title}
                  </button>
                );
              })}
            </div>
          </div>
        );
        i++;
        continue;
      }

      if (f.type === 'swing_option') {
        const val = fieldValues[f.key] || f.options?.[0]?.value || '';
        nodes.push(
          <div key={f.key} className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              {f.label} {f.required && <span className="text-rose-400">*</span>}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(f.options || []).map((opt) => {
                const selected = val === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setFieldValues((prev) => ({ ...prev, [f.key]: opt.value }));
                      onPlayTone(560, 'sine', 0.03);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? 'bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                        : 'bg-[#070a12] border-hairline hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          selected ? 'border-emerald-400' : 'border-slate-500'
                        }`}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                      </span>
                      <span className={`text-xs font-mono font-bold ${selected ? 'text-emerald-400' : 'text-white'}`}>
                        {opt.title}
                      </span>
                    </div>
                    {opt.subtitle && (
                      <p className="text-[11px] text-slate-400 mt-1.5 pl-5 leading-snug">
                        {opt.subtitle}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
        i++;
        continue;
      }

      nodes.push(
        <div key={f.key} className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            {f.label} {f.required && <span className="text-rose-400">*</span>}
          </label>
          <textarea
            rows={f.rows || 4}
            value={fieldValues[f.key] || ''}
            onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="w-full bg-[#070a12] border border-hairline rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
          />
        </div>
      );
      i++;
    }

    return nodes;
  };

  const combinedPreviews = [
    ...existingImageUrls.map((url, idx) => ({ kind: 'existing' as const, url, idx })),
    ...pendingImages.map((slot, idx) => ({ kind: 'pending' as const, url: slot.previewUrl, fileName: slot.file.name, idx }))
  ];

  const submittedUrls = existingRecord ? parseScreenshotUrls(existingRecord.screenshot_url) : [];
  const parsedSubmitted = existingRecord ? parseAssignmentAnswer(existingRecord.answer_text) : null;

  return (
    <div className="glass-card rounded-xl p-5 border-hairline space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                LESSON ASSIGNMENT &amp; CHART SUBMISSION
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0e131e] border border-hairline text-slate-400">
                {activeConfig.phaseLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeConfig.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(existingRecord?.status)}
        </div>
      </div>

      {/* Multi-part Assignment Switcher (when a lesson covers 2 parts) */}
      {configs.length > 1 && (
        <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-[#070a12] border border-hairline">
          {configs.map((cfg, idx) => {
            const active = idx === selectedPartIndex;
            return (
              <button
                key={cfg.assignmentId}
                type="button"
                onClick={() => {
                  setSelectedPartIndex(idx);
                  onPlayTone(520, 'sine', 0.03);
                }}
                className={`flex-1 min-w-[180px] px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${getMiniDotClass(cfg.assignmentId)}`} />
                <span>{cfg.partLabel || cfg.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Locked State */}
      {isTierLocked || isTbdLocked ? (
        <div className="p-4 rounded-xl bg-[#070a12] border border-hairline flex items-center gap-3 text-xs font-mono text-slate-400">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isTbdLocked
              ? 'This module is upcoming (TBD). Assignments will unlock once the lesson is released.'
              : 'Settle Phase 2 access to unlock and submit this assignment.'}
          </span>
        </div>
      ) : (
        <>
          {/* Assignment Prompt Banner */}
          <div className="p-3.5 rounded-xl bg-[#0a0d15] border border-hairline">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-1">
              ASSIGNMENT PROMPT
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {activeConfig.prompt}
            </p>
          </div>

          {/* Mentor Feedback Banner (if present) */}
          {existingRecord?.mentor_feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                existingRecord.status === 'revision'
                  ? 'bg-rose-950/35 border-rose-500/45 text-rose-300'
                  : 'bg-emerald-950/35 border-emerald-500/45 text-emerald-300'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs font-mono">
                <div className="font-bold uppercase tracking-wider text-[11px]">
                  MENTOR FEEDBACK // RYAN JADE (MASTER)
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{existingRecord.mentor_feedback}</p>
              </div>
            </div>
          )}

          {/* Submitted Read-Only View (when Pending or Approved and not editing) */}
          {existingRecord && !showForm && (
            <div className="space-y-4 p-4 rounded-xl bg-[#070a12] border border-hairline">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-hairline">
                <span className="text-[11px] font-mono text-slate-400">
                  Submitted:{' '}
                  <strong className="text-white">
                    {existingRecord.created_at
                      ? new Date(existingRecord.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Just now'}
                  </strong>
                </span>
                {existingRecord.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setIsEditingExisting(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#0e131e] border border-hairline hover:border-slate-500 text-slate-300 hover:text-white font-mono text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Submission</span>
                  </button>
                )}
              </div>

              {/* Submitted Chart Thumbnails */}
              {submittedUrls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    SUBMITTED CHART MARKUP{submittedUrls.length > 1 ? 'S' : ''} (CLICK TO ZOOM)
                  </div>
                  <div className={`grid gap-3 ${submittedUrls.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {submittedUrls.map((url, idx) => (
                      <button
                        key={url + idx}
                        type="button"
                        onClick={() => onOpenLightbox(submittedUrls, idx, `${activeConfig.title} — Chart ${idx + 1}`)}
                        className="group relative rounded-xl overflow-hidden border border-hairline bg-[#0a0d15] hover:border-emerald-500/60 transition-all text-left cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Submitted Chart ${idx + 1}`}
                          className="w-full max-h-64 object-contain bg-slate-950/60"
                        />
                        <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-hairline">
                          <span>
                            {activeConfig.imageUpload?.slotLabels?.[idx] || `Chart Screenshot ${idx + 1}`}
                          </span>
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <Maximize2 className="w-3 h-3" />
                            <span>ZOOM</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatted Submitted Answers */}
              {parsedSubmitted && parsedSubmitted.fields.length > 0 && (
                <div className="space-y-2.5">
                  {parsedSubmitted.fields.map((pf) => (
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
              )}
            </div>
          )}

          {/* Editable Submission / Resubmission Form */}
          {showForm && (
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              {/* Image Uploader Section (when enabled) */}
              {activeConfig.imageUpload?.enabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {activeConfig.imageUpload.label}{' '}
                        {activeConfig.imageUpload.required && <span className="text-rose-400">*</span>}
                      </span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {combinedPreviews.length}/{maxImages} image{maxImages > 1 ? 's' : ''} · PNG/JPG/WEBP (Max 10MB)
                    </span>
                  </div>

                  {/* Two-slot dedicated uploader for HTF & LTF */}
                  {maxImages === 2 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[0, 1].map((slotIdx) => {
                        const item = combinedPreviews[slotIdx];
                        const slotTitle = activeConfig.imageUpload?.slotLabels?.[slotIdx] || `Chart ${slotIdx + 1}`;
                        return (
                          <div key={slotIdx} className="rounded-xl border border-hairline bg-[#070a12] p-3 space-y-2">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                              {slotTitle}
                            </div>
                            <input
                              ref={(el) => {
                                slotInputRefs.current[slotIdx] = el;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) validateAndAddFiles(e.target.files, slotIdx);
                                e.target.value = '';
                              }}
                            />
                            {item ? (
                              <div className="relative rounded-lg overflow-hidden border border-hairline bg-slate-950/60">
                                <img
                                  src={item.url}
                                  alt={slotTitle}
                                  onClick={() =>
                                    onOpenLightbox(
                                      combinedPreviews.map((c) => c.url),
                                      slotIdx,
                                      slotTitle
                                    )
                                  }
                                  className="w-full h-40 object-contain cursor-pointer"
                                />
                                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#0a0d15] border-t border-hairline">
                                  <button
                                    type="button"
                                    onClick={() => slotInputRefs.current[slotIdx]?.click()}
                                    className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      item.kind === 'existing'
                                        ? handleRemoveExistingImage(item.idx)
                                        : handleRemovePendingImage(item.idx)
                                    }
                                    className="text-[10px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => slotInputRefs.current[slotIdx]?.click()}
                                className="w-full h-36 rounded-lg border border-dashed border-slate-600 hover:border-emerald-500/70 bg-[#0a0d15] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer px-3 text-center"
                              >
                                <Upload className="w-5 h-5" />
                                <span className="text-[11px] font-mono font-semibold">
                                  Click to Upload {slotIdx === 0 ? 'HTF' : 'LTF'} Chart
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single-image dropzone */
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) validateAndAddFiles(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      {combinedPreviews.length > 0 ? (
                        <div className="rounded-xl border border-hairline bg-[#070a12] overflow-hidden">
                          <img
                            src={combinedPreviews[0].url}
                            alt="Chart Upload Preview"
                            onClick={() =>
                              onOpenLightbox([combinedPreviews[0].url], 0, activeConfig.imageUpload?.label || 'Chart Preview')
                            }
                            className="w-full max-h-64 object-contain bg-slate-950/60 cursor-pointer"
                          />
                          <div className="flex items-center justify-between px-3 py-2 border-t border-hairline bg-[#0a0d15] text-[11px] font-mono">
                            <span className="text-slate-400 truncate max-w-[60%]">
                              {combinedPreviews[0].kind === 'pending'
                                ? combinedPreviews[0].fileName
                                : 'Attached Chart Screenshot'}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                              >
                                Replace Chart
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  combinedPreviews[0].kind === 'existing'
                                    ? handleRemoveExistingImage(combinedPreviews[0].idx)
                                    : handleRemovePendingImage(combinedPreviews[0].idx)
                                }
                                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragActive(true);
                          }}
                          onDragLeave={() => setIsDragActive(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragActive(false);
                            if (e.dataTransfer.files) validateAndAddFiles(e.dataTransfer.files);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all ${
                            isDragActive
                              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-700 hover:border-emerald-500/70 bg-[#070a12] text-slate-400 hover:text-emerald-400'
                          }`}
                        >
                          <Upload className="w-6 h-6" />
                          <div className="text-xs font-mono font-bold">
                            {activeConfig.imageUpload.dropLabel}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Drag &amp; drop screenshot here, or click to browse files
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tailored Form Fields */}
              <div className="space-y-4">{renderFormFields()}</div>

              {/* Required Confirmation Checkbox (e.g. RJS Core System) */}
              {activeConfig.requiredCheckbox && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#070a12] border border-amber-500/35 hover:border-amber-500/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checkboxChecked}
                    onChange={(e) => setCheckboxChecked(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-slate-600 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-mono text-amber-300 leading-snug">
                    {activeConfig.requiredCheckbox.label}
                  </span>
                </label>
              )}

              {/* Validation Error */}
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                {existingRecord && existingRecord.status === 'pending' && isEditingExisting && (
                  <button
                    type="button"
                    onClick={() => setIsEditingExisting(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-[#0e131e] border border-hairline text-slate-300 hover:text-white font-mono text-xs font-semibold cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>UPLOADING &amp; SUBMITTING...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {existingRecord?.status === 'revision'
                          ? 'RESUBMIT ASSIGNMENT'
                          : existingRecord
                          ? 'UPDATE SUBMISSION'
                          : 'SUBMIT ASSIGNMENT'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
};
