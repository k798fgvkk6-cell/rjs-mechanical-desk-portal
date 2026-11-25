import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zdhsoqcduoipgljoyhyr.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_u050uKy-V3Xzw1haQc8JqQ_4r4ZbkYE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type StudentTier = 'phase1' | 'phase2' | 'pro';

export interface StudentSession {
  id: string;
  full_name: string;
  email?: string | null;
  tier: StudentTier | string;
  currentPhase?: 1 | 2;
  current_phase?: number | null;
  is_active: boolean;
  unlocked_lessons: string[];
  passcode?: string;
  created_at?: string;
}

export interface SupabaseTradeLog {
  id: string;
  created_at?: string;
  student_id: string;
  trade_date: string;
  direction: 'BUY' | 'SELL';
  lot_size: number;
  entry_price?: number | string | null;
  stop_loss?: number | string | null;
  take_profit?: number | string | null;
  outcome: string;
  net_pnl: number;
  notes?: string | null;
  phase?: number | null;
}

export type LessonAssignmentStatus = 'pending' | 'approved' | 'revision';

export interface LessonAssignmentRecord {
  id: string;
  created_at?: string;
  student_id: string;
  student_name: string;
  lesson_id: string;
  answer_text: string;
  screenshot_url?: string | null;
  status: LessonAssignmentStatus;
  mentor_feedback?: string | null;
}

export function extractCurrentPhase(unlockedLessons: unknown, explicitCurrentPhase?: unknown): 1 | 2 {
  const num = Number(explicitCurrentPhase);
  if (num === 2) return 2;
  if (num === 1) return 1;
  if (Array.isArray(unlockedLessons)) {
    if (unlockedLessons.includes('phase_current_2')) return 2;
    if (unlockedLessons.includes('phase_current_1')) return 1;
  }
  return 1;
}

export function encodeTradePhaseNote(phase: 1 | 2, cleanNote?: string | null): string | null {
  const trimmed = String(cleanNote || '').replace(/^\[(PHASE1|PHASE2)\]\s*/i, '').trim();
  if (phase === 2) {
    return trimmed ? `[PHASE2] ${trimmed}` : '[PHASE2]';
  }
  return trimmed || null;
}

export function decodeTradePhaseAndNote(
  rawNotes?: unknown,
  explicitPhase?: unknown
): { phase: 1 | 2; note: string } {
  const raw = typeof rawNotes === 'string' ? rawNotes : '';
  let phase: 1 | 2 = Number(explicitPhase) === 2 ? 2 : 1;
  let note = raw;

  if (/^\[PHASE2\]/i.test(raw)) {
    phase = 2;
    note = raw.replace(/^\[PHASE2\]\s*/i, '');
  } else if (/^\[PHASE1\]/i.test(raw)) {
    if (Number(explicitPhase) !== 2) phase = 1;
    note = raw.replace(/^\[PHASE1\]\s*/i, '');
  }

  return { phase, note: note.trim() };
}

export function extractRrrMultiple(rrr?: string | null): number {
  const match = /1:(\d+(?:\.\d+)?)/.exec(String(rrr || ''));
  return match ? Number(match[1]) || 0 : 0;
}

export function isPhase2SwingWin(trade: { phase?: 1 | 2; pnl: number; rrr?: string }): boolean {
  if ((trade.phase || 1) !== 2) return false;
  if (!(trade.pnl > 0)) return false;
  return trade.pnl >= 4000 || extractRrrMultiple(trade.rrr) >= 4;
}
