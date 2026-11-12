import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zdhsoqcduoipgljoyhyr.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_u050uKy-V3Xzw1haQc8JqQ_4r4ZbkYE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type StudentTier = 'phase1' | 'phase2' | 'pro';

export interface StudentSession {
  id: string;
  full_name: string;
  tier: StudentTier | string;
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
}
