import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Clock,
  Lock,
  Unlock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileDown,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Trash2,
  Key,
  ExternalLink,
  ChevronRight,
  Maximize2,
  TrendingUp,
  Target,
  User,
  Loader2
} from 'lucide-react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { supabase, StudentSession } from './lib/supabase';

ChartJS.register(...registerables);

/* -------------------------------------------------------------
   TYPES & INTERFACES
-------------------------------------------------------------- */
interface LessonItem {
  id: string;
  phase: number;
  num: string;
  title: string;
  duration: string;
  secretKeyword: string;
  hint: string;
  driveId?: string;
  videoUrl: string;
  poster: string;
  notes: string[];
}

interface CalendarEvent {
  id: string;
  day: string;
  dayNum: number;
  timePHT?: string;
  event: string;
  impact: 'TRADABLE' | 'RISKY' | 'DONT_TRADE';
  directive: string;
  directiveNote?: string;
  events?: string;
  statusLabel?: string;
}

interface AuditTrade {
  id: string;
  index?: number;
  pair: string;
  tradeDate?: string;
  position: 'BUY' | 'SELL';
  entryPrice?: string;
  lotSize: number;
  stopLoss: string;
  takeProfit: string;
  executionTime: string;
  result: string;
  rrr: string;
  pnl: number;
  balanceAfter?: number;
  note: string;
  createdAt: number;
}

/* -------------------------------------------------------------
   CONSTANTS & CURRICULUM DATA
-------------------------------------------------------------- */
const AUTH_STORAGE_KEY = 'rjs_desk_auth';
const STUDENT_SESSION_KEY = 'rjs_student_session';
const TRADES_STORAGE_KEY = 'rjs_phase2_logs';
const KEYWORDS_STORAGE_KEY = 'rjs_desk_unlocked_keywords';
const START_BAL_KEY = 'rjs_desk_start_bal';

const NOVEMBER_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-nov-02',
    day: 'Nov 02',
    dayNum: 2,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '10:45 PM US Final Mfg PMI, 11:00 PM ISM Mfg PMI',
    event: '10:45 PM US Final Mfg PMI, 11:00 PM ISM Mfg PMI',
    directive: 'Standard 9:30 PM entry. Maintain 1:3 RRR.',
    directiveNote: 'Standard 9:30 PM entry. Maintain 1:3 RRR.'
  },
  {
    id: 'cal-nov-03',
    day: 'Nov 03',
    dayNum: 3,
    impact: 'RISKY',
    statusLabel: 'RISKY (0.5R)',
    events: 'All Day US Congressional Elections, 11:00 PM JOLTS',
    event: 'All Day US Congressional Elections, 11:00 PM JOLTS',
    directive: 'Election volatility risk. Fast 1:1 BE Lock advised.',
    directiveNote: 'Election volatility risk. Fast 1:1 BE Lock advised.'
  },
  {
    id: 'cal-nov-04',
    day: 'Nov 04',
    dayNum: 4,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '9:15 PM ADP Non-Farm, 11:00 PM ISM Services',
    event: '9:15 PM ADP Non-Farm, 11:00 PM ISM Services',
    directive: 'Pre-open release clears early. Clean 9:30 PM session.',
    directiveNote: 'Pre-open release clears early. Clean 9:30 PM session.'
  },
  {
    id: 'cal-nov-05',
    day: 'Nov 05',
    dayNum: 5,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '9:30 PM USD Unemployment Claims',
    event: '9:30 PM USD Unemployment Claims',
    directive: 'Standard weekly release. Normal RJS execution.',
    directiveNote: 'Standard weekly release. Normal RJS execution.'
  },
  {
    id: 'cal-nov-06',
    day: 'Nov 06',
    dayNum: 6,
    impact: 'DONT_TRADE',
    statusLabel: 'DONT TRADE',
    events: '9:30 PM Non-Farm Payrolls (NFP) & Unemployment Rate',
    event: '9:30 PM Non-Farm Payrolls (NFP) & Unemployment Rate',
    directive: 'STAND DOWN. Tier-1 Red USD catalyst collision.',
    directiveNote: 'STAND DOWN. Tier-1 Red USD catalyst collision.'
  },
  {
    id: 'cal-nov-09',
    day: 'Nov 09',
    dayNum: 9,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: 'No Major US Data, 11:00 PM Final Wholesale Inventories',
    event: 'No Major US Data, 11:00 PM Final Wholesale Inventories',
    directive: 'Pristine conditions. Standard 1:3 protocol.',
    directiveNote: 'Pristine conditions. Standard 1:3 protocol.'
  },
  {
    id: 'cal-nov-10',
    day: 'Nov 10',
    dayNum: 10,
    impact: 'DONT_TRADE',
    statusLabel: 'DONT TRADE',
    events: '9:30 PM Core CPI m/m & CPI y/y',
    event: '9:30 PM Core CPI m/m & CPI y/y',
    directive: 'STAND DOWN. Major Red USD inflation drop on bell.',
    directiveNote: 'STAND DOWN. Major Red USD inflation drop on bell.'
  },
  {
    id: 'cal-nov-11',
    day: 'Nov 11',
    dayNum: 11,
    impact: 'RISKY',
    statusLabel: 'RISKY (0.5R)',
    events: 'All Day USD Bank Holiday (Veterans Day - Bond Market Closed)',
    event: 'All Day USD Bank Holiday (Veterans Day - Bond Market Closed)',
    directive: 'Low volume session. Lock BE early or pass.',
    directiveNote: 'Low volume session. Lock BE early or pass.'
  },
  {
    id: 'cal-nov-12',
    day: 'Nov 12',
    dayNum: 12,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '9:30 PM Unemployment Claims, 11:00 PM Existing Home Sales',
    event: '9:30 PM Unemployment Claims, 11:00 PM Existing Home Sales',
    directive: 'Routine data. Standard 1 trade / 1:3 target.',
    directiveNote: 'Routine data. Standard 1 trade / 1:3 target.'
  },
  {
    id: 'cal-nov-13',
    day: 'Nov 13',
    dayNum: 13,
    impact: 'DONT_TRADE',
    statusLabel: 'DONT TRADE',
    events: '9:30 PM Core PPI & PPI m/m',
    event: '9:30 PM Core PPI & PPI m/m',
    directive: 'STAND DOWN. Dual Red folders on opening bell.',
    directiveNote: 'STAND DOWN. Dual Red folders on opening bell.'
  },
  {
    id: 'cal-nov-16',
    day: 'Nov 16',
    dayNum: 16,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '9:30 PM Empire State Mfg',
    event: '9:30 PM Empire State Mfg',
    directive: 'Clean opening flow. Normal 1:3 execution.',
    directiveNote: 'Clean opening flow. Normal 1:3 execution.'
  },
  {
    id: 'cal-nov-17',
    day: 'Nov 17',
    dayNum: 17,
    impact: 'RISKY',
    statusLabel: 'RISKY (0.5R)',
    events: '9:30 PM Core Retail Sales & Retail Sales m/m',
    event: '9:30 PM Core Retail Sales & Retail Sales m/m',
    directive: 'Let news volatility settle first before considering entry.',
    directiveNote: 'Let news volatility settle first before considering entry.'
  },
  {
    id: 'cal-nov-18',
    day: 'Nov 18',
    dayNum: 18,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '9:30 PM Building Permits, 3:00 AM Next Day FOMC Minutes',
    event: '9:30 PM Building Permits, 3:00 AM Next Day FOMC Minutes',
    directive: 'Tradable open. Close all positions by 2:00 AM.',
    directiveNote: 'Tradable open. Close all positions by 2:00 AM.'
  },
  {
    id: 'cal-nov-19',
    day: 'Nov 19',
    dayNum: 19,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '3:00 AM FOMC Minutes Cleared, 9:30 PM Philly Fed & Claims',
    event: '3:00 AM FOMC Minutes Cleared, 9:30 PM Philly Fed & Claims',
    directive: 'FOMC cleared hours ago. Trade open normally.',
    directiveNote: 'FOMC cleared hours ago. Trade open normally.'
  },
  {
    id: 'cal-nov-20',
    day: 'Nov 20',
    dayNum: 20,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '11:00 PM Revised UoM Sentiment',
    event: '11:00 PM Revised UoM Sentiment',
    directive: 'Clear open. Complete execution before 11:00 PM.',
    directiveNote: 'Clear open. Complete execution before 11:00 PM.'
  },
  {
    id: 'cal-nov-23',
    day: 'Nov 23',
    dayNum: 23,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '10:45 PM Flash Mfg & Services PMI',
    event: '10:45 PM Flash Mfg & Services PMI',
    directive: '9:30 PM open is completely clear. Standard 1:3.',
    directiveNote: '9:30 PM open is completely clear. Standard 1:3.'
  },
  {
    id: 'cal-nov-24',
    day: 'Nov 24',
    dayNum: 24,
    impact: 'TRADABLE',
    statusLabel: 'TRADABLE (1R)',
    events: '11:00 PM CB Consumer Confidence & Richmond Mfg',
    event: '11:00 PM CB Consumer Confidence & Richmond Mfg',
    directive: 'Clean liquidity window. Standard trade protocol.',
    directiveNote: 'Clean liquidity window. Standard trade protocol.'
  },
  {
    id: 'cal-nov-25',
    day: 'Nov 25',
    dayNum: 25,
    impact: 'DONT_TRADE',
    statusLabel: 'DONT TRADE',
    events: '9:30 PM Core PCE Price Index & Prelim GDP q/q',
    event: '9:30 PM Core PCE Price Index & Prelim GDP q/q',
    directive: 'STAND DOWN. Dual Red USD tier-1 data shock.',
    directiveNote: 'STAND DOWN. Dual Red USD tier-1 data shock.'
  },
  {
    id: 'cal-nov-26',
    day: 'Nov 26',
    dayNum: 26,
    impact: 'DONT_TRADE',
    statusLabel: 'DONT TRADE',
    events: 'Thanksgiving Day Holiday (Markets CLOSED)',
    event: 'Thanksgiving Day Holiday (Markets CLOSED)',
    directive: 'MARKET CLOSED. Full desk shutdown.',
    directiveNote: 'MARKET CLOSED. Full desk shutdown.'
  },
  {
    id: 'cal-nov-27',
    day: 'Nov 27',
    dayNum: 27,
    impact: 'RISKY',
    statusLabel: 'RISKY (0.5R)',
    events: 'Black Friday Half-Day US Session (1:00 PM ET close)',
    event: 'Black Friday Half-Day US Session (1:00 PM ET close)',
    directive: 'Thin post-holiday liquidity. Caution advised.',
    directiveNote: 'Thin post-holiday liquidity. Caution advised.'
  }
];

const PHASE_1_LESSONS: LessonItem[] = [
  {
    id: 'p1_01',
    phase: 1,
    num: '01',
    title: 'Phase 1 Start',
    duration: '32:40 MIN',
    secretKeyword: 'START',
    hint: 'The foundational keyword to commence your institutional curriculum.',
    driveId: '1bN38WpXgX6eZy6Bae_uHJ6KBJSNK6avV',
    videoUrl: 'https://drive.google.com/file/d/1bN38WpXgX6eZy6Bae_uHJ6KBJSNK6avV/preview',
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Establish foundational mechanical rules and core desk expectations.',
      'Eliminate discretionary guesswork before taking live executions.',
      'Set up your terminal workspace for daily session discipline.'
    ]
  },
  {
    id: 'p1_02',
    phase: 1,
    num: '02',
    title: 'Objective And Trader Identity',
    duration: '40:47 MIN',
    secretKeyword: 'VENUM',
    hint: 'The fuel that algorithms seek above old highs and below old lows.',
    driveId: '1j7LBf2TgNZmHEfFOpXIWqjuwVIEoQdiE',
    videoUrl: 'https://drive.google.com/file/d/1j7LBf2TgNZmHEfFOpXIWqjuwVIEoQdiE/preview',
    poster: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Define your specific edge and risk tolerance profile.',
      'Separate emotional gambling tendencies from systematic mechanical execution.',
      'Build consistency around one fixed setup rather than chasing every move.'
    ]
  },
  {
    id: 'p1_03',
    phase: 1,
    num: '03',
    title: 'RJS Core System',
    duration: '53:12 MIN',
    secretKeyword: 'yummy',
    hint: 'The 3-candle price distortion where only one side had delivery.',
    driveId: '1Hk9zuQaHkAgO2v3Sz2OJXUGI2_7vkNbx',
    videoUrl: 'https://drive.google.com/file/d/1Hk9zuQaHkAgO2v3Sz2OJXUGI2_7vkNbx/preview',
    poster: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Master the non-negotiable entry checklist of the RJS system.',
      'Identify high-probability order flow alignment across your execution timeframes.',
      'Standardize trade triggers to remove hesitation during session opens.'
    ]
  },
  {
    id: 'p1_04',
    phase: 1,
    num: '04',
    title: 'Forex Factory Updates',
    duration: '13:24 MIN',
    secretKeyword: 'websling',
    hint: 'The exact equities cash market bell in New York (9:30 AM EST).',
    driveId: '16DmsW_1pQ5Fy0M0GhrBOlD6SpmUeBsvs',
    videoUrl: 'https://drive.google.com/file/d/16DmsW_1pQ5Fy0M0GhrBOlD6SpmUeBsvs/preview',
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Filter high-impact red-folder news drivers before market open.',
      'Identify institutional volatility injection windows and avoid false breakouts.',
      'Enforce session defense rules during major macroeconomic data releases.'
    ]
  },
  {
    id: 'p1_05',
    phase: 1,
    num: '05',
    title: 'Masterclass Part 1: Trading Flow, Review & Power Of Fibonacci',
    duration: '38:42 MIN',
    secretKeyword: 'Justice',
    hint: 'Two words: your non-negotiable rule-based trading advantage.',
    driveId: '1lt1SxiB-GrjWf-fDyUhOeuziSlYiFlEk',
    videoUrl: 'https://drive.google.com/file/d/1lt1SxiB-GrjWf-fDyUhOeuziSlYiFlEk/preview',
    poster: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Map premium and discount pricing zones using institutional Fibonacci retracements.',
      'Audit live trade flow to spot structural liquidity sweeps.',
      'Align deep-discount entries with multi-timeframe directional order flow.'
    ]
  },
  {
    id: 'p1_06',
    phase: 1,
    num: '06',
    title: 'Psychology Of TP',
    duration: '50:51 MIN',
    secretKeyword: 'SWAG',
    hint: 'The #1 rule of a prop trader: protecting the initial deposit.',
    driveId: '1d167jiwwivwW3LVAcjetwQEivAHSHap2',
    videoUrl: 'https://drive.google.com/file/d/1d167jiwwivwW3LVAcjetwQEivAHSHap2/preview',
    poster: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Protect unrealized profits without cutting winners prematurely.',
      'Execute pre-planned take-profit targets mechanically without greed.',
      'Avoid the urge to re-enter impulsively after closing a winning trade.'
    ]
  },
  {
    id: 'p1_07',
    phase: 1,
    num: '07',
    title: 'Psychology Of SL',
    duration: 'TBD',
    secretKeyword: 'DISCIPLINE',
    hint: 'Adhering strictly to rules regardless of emotion.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Accept stop losses as the routine operational cost of running a trading desk.',
      'Enforce zero emotional interference when an invalidation level is breached.',
      'Eliminate revenge trading by stepping away immediately after taking a planned loss.'
    ]
  }
];

const PHASE_2_LESSONS: LessonItem[] = [
  {
    id: 'p2_01',
    phase: 2,
    num: '01',
    title: 'PHASE 2 START',
    duration: '22:40 MIN',
    secretKeyword: 'Peter Parker',
    hint: 'The institutional momentum shift on the 1-minute chart.',
    driveId: '1dbLDHj1umPj3y0eXaZIqvrEJpelIOZLS',
    videoUrl: 'https://drive.google.com/file/d/1dbLDHj1umPj3y0eXaZIqvrEJpelIOZLS/preview',
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Transition from basic rule execution to advanced institutional order flow tracking.',
      'Refine trade selectivity to target higher-quality execution setups.',
      'Calibrate desk sizing rules for higher-tier capital allocation.'
    ]
  },
  {
    id: 'p2_02',
    phase: 2,
    num: '02',
    title: 'PROTECTING YOUR TRADING JOURNEY',
    duration: '1:02:36 MIN',
    secretKeyword: 'Never Say Never',
    hint: 'The iconic 10:00 PM - 11:00 PM Manila high-probability algorithm.',
    driveId: '1YxkjgQfYZOARrsJgx65zmwol2v5TuzeF',
    videoUrl: 'https://drive.google.com/file/d/1YxkjgQfYZOARrsJgx65zmwol2v5TuzeF/preview',
    poster: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Implement strict risk circuit breakers to safeguard accrued profits.',
      'Protect your trading psychology from burnout and severe drawdown spirals.',
      'Treat capital preservation as your primary metric over short-term returns.'
    ]
  },
  {
    id: 'p2_03',
    phase: 2,
    num: '03',
    title: 'SWING',
    duration: '45:20 MIN',
    secretKeyword: 'Spider Sense',
    hint: 'The false opening directional move that traps breakout traders.',
    driveId: '1XkfhtqqErwCK1eZEQN09_O1mXm4aUrgC',
    videoUrl: 'https://drive.google.com/file/d/1XkfhtqqErwCK1eZEQN09_O1mXm4aUrgC/preview',
    poster: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Frame multi-day directional bias using high-timeframe structural anchors.',
      'Hold through intraday noise while trailing invalidation points systematically.',
      'Balance patience and conviction when managing positions across multiple sessions.'
    ]
  },
  {
    id: 'p2_04',
    phase: 2,
    num: '04',
    title: 'RJS + Support And Resistance',
    duration: '37:39 MIN',
    secretKeyword: 'Believe The Setup',
    hint: 'Moving stop to entry once +1.5R or structural milestone is reached.',
    driveId: '1x-AvqRFy_RryrdpyKHam0zN1L7SUy2Zo',
    videoUrl: 'https://drive.google.com/file/d/1x-AvqRFy_RryrdpyKHam0zN1L7SUy2Zo/preview',
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Combine RJS algorithmic triggers with key institutional support and resistance levels.',
      'Distinguish between retail chart patterns and actual institutional supply/demand zones.',
      'Avoid trap breakouts around obvious horizontal support and resistance lines.'
    ]
  },
  {
    id: 'p2_05',
    phase: 2,
    num: '05',
    title: 'Aiming a 1:4, 1:5',
    duration: '1:04:40 MIN',
    secretKeyword: 'Probability',
    hint: 'Protecting capital against broker spread widening during data.',
    driveId: '1pFzQNMdW-mcQfnUoOMG2JV5Mo1HWsh-5',
    videoUrl: 'https://drive.google.com/file/d/1pFzQNMdW-mcQfnUoOMG2JV5Mo1HWsh-5/preview',
    poster: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Identify asymmetric market opportunities offering outsized 1:4 and 1:5 risk-to-reward ratios.',
      'Tighten invalidation levels on lower timeframes without suffocating the setup.',
      'Scale out strategically while allowing runner positions to reach maximum targets.'
    ]
  },
  {
    id: 'p2_06',
    phase: 2,
    num: '06',
    title: 'Surprise Module',
    duration: '50:51 MIN',
    secretKeyword: 'RJS',
    hint: 'A sequence of 20 executions evaluated only after completion.',
    driveId: '1wbFX1I9xiFvzbAXueqqj6L46b_ExBzDm',
    videoUrl: 'https://drive.google.com/file/d/1wbFX1I9xiFvzbAXueqqj6L46b_ExBzDm/preview',
    poster: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Pinpoint high-confluence Points of Interest (POI) on daily and 4-hour charts.',
      'Wait for institutional confirmation inside POI zones before placing orders.',
      'Execute precision swing entries with minimal drawdown and maximum leverage efficiency.'
    ]
  },
  {
    id: 'p2_07',
    phase: 2,
    num: '07',
    title: 'POI For A Swing',
    duration: 'TBD',
    secretKeyword: 'SWING',
    hint: 'Transitioning from ₱10,000 testing base to institutional prop funding.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Execute swing entries aligned with macro directional order flow.',
      'Manage risk on extended swings without panic liquidation.',
      'Secure partial take profits into opposing weekly liquidity pools.'
    ]
  }
];

const PRO_ARCHIVES_LESSONS: LessonItem[] = [
  {
    id: 'pa_01',
    phase: 3,
    num: '01',
    title: 'Tradable and Not Tradable',
    duration: '27:40 MIN',
    secretKeyword: 'RJS',
    hint: 'Differentiating clean institutional order flow from low-probability chop.',
    driveId: '1mm9Is914ysqYxNNAiKh-Gg3ZDGnGqZ_x',
    videoUrl: 'https://drive.google.com/file/d/1mm9Is914ysqYxNNAiKh-Gg3ZDGnGqZ_x/preview',
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Deconstruct live execution entries and exits against the mechanical playbook rules.',
      'Identify subtle execution leaks, hesitation errors, and management deviations.',
      'Document key trade metrics to systematically reinforce winning behavioral patterns.'
    ]
  },
  {
    id: 'pa_02',
    phase: 3,
    num: '02',
    title: 'TRADE REVIEW',
    duration: '27:59 MIN',
    secretKeyword: 'RJS',
    hint: 'Deconstructing real live market entries using institutional order flow.',
    driveId: '1sR5dnvCUCDffCdjej7U-FOwUdGOBJEVI',
    videoUrl: 'https://drive.google.com/file/d/1sR5dnvCUCDffCdjej7U-FOwUdGOBJEVI/preview',
    poster: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Identify erratic liquidity voids, erratic spread widening, and whipsaw price action.',
      'Implement total desk defense protocols to prevent severe drawdown during chaotic sessions.',
      'Recognize when algorithmic delivery pauses and prioritize risk avoidance over forcing setups.'
    ]
  },
  {
    id: 'pa_03',
    phase: 3,
    num: '03',
    title: 'Unpredictable Market Condition, Unstable',
    duration: '28:16 MIN',
    secretKeyword: 'RJS',
    hint: 'Handling catalyst volatility spikes and recognizing smart money traps.',
    driveId: '1IW8jwHrtEIkdfgsr-Wlv6zHQzewSEMao',
    videoUrl: 'https://drive.google.com/file/d/1IW8jwHrtEIkdfgsr-Wlv6zHQzewSEMao/preview',
    poster: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1280&auto=format&fit=crop',
    notes: [
      'Differentiate between clean institutional order delivery and low-probability chop.',
      'Enforce the non-negotiable checklist to qualify a valid market environment before deploying capital.',
      'Preserve capital and mental bandwidth by staying cash during invalid conditions.'
    ]
  }
];

export default function App() {
  /* -------------------------------------------------------------
     STATE MANAGEMENT
  -------------------------------------------------------------- */
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentStudent, setCurrentStudent] = useState<StudentSession | null>(() => {
    try {
      const saved = localStorage.getItem(STUDENT_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [passcodeKey, setPasscodeKey] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('ACCESS DENIED // INVALID OR INACTIVE DESK SECURITY KEY');
  const [activeTab, setActiveTab] = useState<'defense' | 'vault' | 'audit'>('defense');

  // Clocks
  const [manilaClock, setManilaClock] = useState<string>('--:--:-- PHT');
  const [nyCountdown, setNyCountdown] = useState<string>('CALCULATING...');
  const [isNyActive, setIsNyActive] = useState<boolean>(false);

  // Audio Synth
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Pre-Trade Risk Matrix & Execution Rules
  const [startingBalance, setStartingBalance] = useState<number>(10000);
  const [currentBalanceInput, setCurrentBalanceInput] = useState<number>(10000);
  const [currency, setCurrency] = useState<'PHP' | 'USD'>('PHP');
  const [riskProfile, setRiskProfile] = useState<5 | 10>(10);
  const [checklist, setChecklist] = useState<boolean[]>([true, true, true, true, true, true, true, true]);

  // November Risk Calendar
  const [calendarFilter, setCalendarFilter] = useState<'ALL' | 'TRADABLE' | 'RISKY' | 'DONT_TRADE'>('ALL');
  const [selectedCalendarDayNum, setSelectedCalendarDayNum] = useState<number | null>(null);

  // Video Vault & Curriculum & Tier Gating
  const [curriculumPhase, setCurriculumPhase] = useState<number>(1);
  const [activeLesson, setActiveLesson] = useState<LessonItem>(PHASE_1_LESSONS[0]);
  const [unlockedKeywords, setUnlockedKeywords] = useState<string[]>([]);
  const [inputKeyword, setInputKeyword] = useState<string>('');
  const [keywordFeedback, setKeywordFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [accessDeniedAlert, setAccessDeniedAlert] = useState<string | null>(null);
  const [tierRestrictedNotice, setTierRestrictedNotice] = useState<string | null>(null);
  const [worksheetModalOpen, setWorksheetModalOpen] = useState<boolean>(false);

  // Normalization helper for lesson IDs across formats (e.g. 'p1-01' vs 'p1_01')
  const normalizeLessonId = (id: string): string => id.toLowerCase().replace(/[-_]/g, '');

  const isLessonVerified = (lessonId: string, unlockedList: string[]): boolean => {
    return unlockedList.some(id => normalizeLessonId(id) === normalizeLessonId(lessonId));
  };

  // Helper to determine if a lesson is accessible based on sequential completion of previous lesson
  const isLessonUnlocked = (lesson: LessonItem, phaseList: LessonItem[], unlockedList: string[]): boolean => {
    const index = phaseList.findIndex(l => normalizeLessonId(l.id) === normalizeLessonId(lesson.id));
    if (index <= 0) return true; // Lesson 01 of each active section is always unlocked by default
    const prevLesson = phaseList[index - 1];
    return isLessonVerified(prevLesson.id, unlockedList);
  };

  // Video Player
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoTimeText, setVideoTimeText] = useState<string>('00:00 / 18:42');

  // Execution Audit Logger (Phase 2 Specification)
  const [trades, setTrades] = useState<AuditTrade[]>([]);
  const [tradeDate, setTradeDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [tradePosition, setTradePosition] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeEntryPrice, setTradeEntryPrice] = useState<string>('');
  const [tradeLotSize, setTradeLotSize] = useState<number>(1.0);
  const [tradeStopLoss, setTradeStopLoss] = useState<string>('20,410.50');
  const [tradeTakeProfit, setTradeTakeProfit] = useState<string>('20,530.50');
  const [tradeExecutionTime, setTradeExecutionTime] = useState<string>('09:30 PM PHT');
  const [tradeResult, setTradeResult] = useState<string>('Take Profit (TP)');
  const [tradeRRR, setTradeRRR] = useState<string>('1:3.0R');
  const [tradePnL, setTradePnL] = useState<number>(3000);
  const [tradeDisciplineNote, setTradeDisciplineNote] = useState<string>('');
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'WINS' | 'LOSSES' | 'BE'>('ALL');

  // Trajectory Chart Canvas Ref
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  /* -------------------------------------------------------------
     AUDIO SYNTHESIS
  -------------------------------------------------------------- */
  const playTone = (freq = 880, type: OscillatorType = 'sine', duration = 0.08) => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + duration);
    } catch {
      // AudioContext fallback
    }
  };

  const playSuccessChime = () => {
    playTone(523.25, 'triangle', 0.08);
    setTimeout(() => playTone(659.25, 'triangle', 0.08), 80);
    setTimeout(() => playTone(783.99, 'triangle', 0.15), 160);
  };

  const playErrorTone = () => {
    playTone(220, 'sawtooth', 0.18);
  };

  /* -------------------------------------------------------------
     INITIALIZATION & CLOCKS
  -------------------------------------------------------------- */
  useEffect(() => {
    // 1. Check Auth Status & Restore Student Session
    const isAuth = localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    const savedSession = localStorage.getItem(STUDENT_SESSION_KEY);

    if (savedSession) {
      try {
        const student = JSON.parse(savedSession);
        if (student && student.id) {
          setCurrentStudent(student);
          setIsAuthenticated(true);
          if (Array.isArray(student.unlocked_lessons) && student.unlocked_lessons.length > 0) {
            setUnlockedKeywords(student.unlocked_lessons);
          }
          // Load trades for this student from Supabase
          loadStudentTrades(student.id);

          // Background sync to ensure freshest profile/tier data from Supabase
          supabase
            .from('students')
            .select('*')
            .eq('id', student.id)
            .eq('is_active', true)
            .maybeSingle()
            .then(({ data: freshStudent, error }) => {
              if (freshStudent && !error) {
                const refreshed: StudentSession = {
                  id: freshStudent.id,
                  full_name: freshStudent.full_name,
                  tier: freshStudent.tier || 'phase1',
                  is_active: freshStudent.is_active,
                  unlocked_lessons: Array.isArray(freshStudent.unlocked_lessons) ? freshStudent.unlocked_lessons : [],
                  passcode: freshStudent.passcode,
                  created_at: freshStudent.created_at
                };
                setCurrentStudent(refreshed);
                localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(refreshed));
                if (refreshed.unlocked_lessons && refreshed.unlocked_lessons.length > 0) {
                  setUnlockedKeywords(refreshed.unlocked_lessons);
                  localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(refreshed.unlocked_lessons));
                }
              }
            });
        }
      } catch {}
    } else if (isAuth) {
      setIsAuthenticated(true);
    }

    // 2. Load Start Balance & Fallback Unlocked Keywords
    const savedStartBal = localStorage.getItem(START_BAL_KEY);
    if (savedStartBal) {
      const parsed = parseFloat(savedStartBal);
      if (!isNaN(parsed)) {
        setStartingBalance(parsed);
        setCurrentBalanceInput(parsed);
      }
    }

    try {
      const savedKeywords = localStorage.getItem(KEYWORDS_STORAGE_KEY);
      if (savedKeywords && unlockedKeywords.length === 0) {
        setUnlockedKeywords(JSON.parse(savedKeywords));
      }
    } catch {}

    // Initialize Timestamp
    refreshPhtTimestamp();

    // Clock Interval
    const interval = setInterval(updateClocks, 1000);
    updateClocks();

    return () => clearInterval(interval);
  }, []);

  const refreshPhtTimestamp = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const manilaTime = new Date(utc + 3600000 * 8);
    const hours = manilaTime.getHours();
    const minutes = manilaTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = String(hours % 12 || 12).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    setTradeExecutionTime(`${formattedHours}:${formattedMinutes} ${ampm} PHT`);
  };

  const updateClocks = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const manilaTime = new Date(utc + 3600000 * 8);

    const hours = String(manilaTime.getHours()).padStart(2, '0');
    const mins = String(manilaTime.getMinutes()).padStart(2, '0');
    const secs = String(manilaTime.getSeconds()).padStart(2, '0');
    setManilaClock(`${hours}:${mins}:${secs} PHT`);

    // Target 9:30 PM (21:30) Manila
    const targetToday = new Date(manilaTime);
    targetToday.setHours(21, 30, 0, 0);

    let diff = targetToday.getTime() - manilaTime.getTime();

    if (diff < 0) {
      const sessionEndTime = new Date(manilaTime);
      sessionEndTime.setHours(23, 30, 0, 0);
      if (manilaTime < sessionEndTime) {
        setIsNyActive(true);
        setNyCountdown('● SESSION ACTIVE NOW');
        return;
      } else {
        targetToday.setDate(targetToday.getDate() + 1);
        diff = targetToday.getTime() - manilaTime.getTime();
      }
    }

    setIsNyActive(false);
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    setNyCountdown(`IN ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  };

  /* -------------------------------------------------------------
     SUPABASE TRADE LOADER & ACTIONS
  -------------------------------------------------------------- */
  const loadStudentTrades = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('trade_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('trade_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading trade logs from Supabase:', error);
        return;
      }

      if (data) {
        const mappedTrades: AuditTrade[] = data.map((t, idx) => ({
          id: t.id,
          pair: 'USTECH100',
          tradeDate: t.trade_date || new Date().toISOString().split('T')[0],
          position: (t.direction as 'BUY' | 'SELL') || 'BUY',
          entryPrice: t.entry_price != null ? String(t.entry_price) : '-',
          lotSize: Number(t.lot_size) || 1.0,
          stopLoss: t.stop_loss != null ? String(t.stop_loss) : '-',
          takeProfit: t.take_profit != null ? String(t.take_profit) : '-',
          executionTime: t.created_at ? new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '09:30 PM PHT',
          result: t.outcome || 'TP',
          rrr: Number(t.net_pnl) > 0 ? `1:${(Number(t.net_pnl) / 1000).toFixed(1)}R` : (Number(t.net_pnl) < 0 ? `${(Number(t.net_pnl) / 1000).toFixed(1)}R` : '0.0R'),
          pnl: Number(t.net_pnl) || 0,
          note: t.notes || '',
          createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now() + idx
        }));

        setTrades(mappedTrades);
        localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(mappedTrades));
        const net = mappedTrades.reduce((acc, tr) => acc + tr.pnl, 0);
        setCurrentBalanceInput(startingBalance + net);
      }
    } catch (err) {
      console.error('Failed to load student trade logs:', err);
    }
  };

  /* -------------------------------------------------------------
     AUTHENTICATION ACTIONS (SUPABASE DYNAMIC GATE)
  -------------------------------------------------------------- */
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = passcodeKey.trim();
    if (!entered) return;

    setIsAuthenticating(true);
    setAuthError(false);

    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('passcode', entered)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !student) {
        setAuthError(true);
        setAuthErrorMessage('ACCESS DENIED // INVALID OR INACTIVE DESK SECURITY KEY');
        setIsShaking(true);
        playErrorTone();
        setTimeout(() => setIsShaking(false), 500);
        setIsAuthenticating(false);
        return;
      }

      // Valid active student found
      const sessionData: StudentSession = {
        id: student.id,
        full_name: student.full_name,
        tier: student.tier || 'phase1',
        is_active: student.is_active,
        unlocked_lessons: Array.isArray(student.unlocked_lessons) ? student.unlocked_lessons : [],
        passcode: student.passcode,
        created_at: student.created_at
      };

      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(sessionData));
      setCurrentStudent(sessionData);
      setIsAuthenticated(true);
      setAuthError(false);

      if (sessionData.unlocked_lessons && sessionData.unlocked_lessons.length > 0) {
        setUnlockedKeywords(sessionData.unlocked_lessons);
        localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(sessionData.unlocked_lessons));
      }

      setCurriculumPhase(1);
      setActiveLesson(PHASE_1_LESSONS[0]);

      await loadStudentTrades(student.id);
      playSuccessChime();
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(true);
      setAuthErrorMessage('ACCESS DENIED // INVALID OR INACTIVE DESK SECURITY KEY');
      setIsShaking(true);
      playErrorTone();
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(STUDENT_SESSION_KEY);
    setIsAuthenticated(false);
    setCurrentStudent(null);
    setPasscodeKey('');
    setAuthError(false);
    setTierRestrictedNotice(null);
    playTone(400, 'sine', 0.08);
  };

  const getTierBadge = (tier?: string) => {
    const t = (tier || 'phase1').toLowerCase();
    if (t === 'pro') {
      return {
        label: 'TIER: PRO VIP',
        dotClass: 'bg-amber-400 animate-ping',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
      };
    }
    if (t === 'phase2') {
      return {
        label: 'TIER: PHASE 2',
        dotClass: 'bg-cyan-400 animate-ping',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
      };
    }
    return {
      label: 'TIER: PHASE 1',
      dotClass: 'bg-emerald-400 animate-ping',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
    };
  };

  const handleSwitchCurriculumPhase = (targetPhase: 1 | 2 | 3) => {
    const currentTier = (currentStudent?.tier || 'phase1').toLowerCase();

    // PHASE 1 is accessible to all enrolled tiers
    if (targetPhase === 1) {
      setTierRestrictedNotice(null);
      setCurriculumPhase(1);
      setActiveLesson(PHASE_1_LESSONS[0]);
      setInputKeyword('');
      setKeywordFeedback(null);
      playTone(500, 'sine', 0.03);
      return;
    }

    // PHASE 2 requires tier === 'phase2' or 'pro'
    if (targetPhase === 2) {
      if (currentTier === 'phase1') {
        playErrorTone();
        setTierRestrictedNotice(
          "MODULE RESTRICTED // PHASE 2 ACCESS REQUIRED. Complete your Phase 2 enrollment upgrade to unlock institutional swing & advanced execution modules."
        );
        return;
      }
      setTierRestrictedNotice(null);
      setCurriculumPhase(2);
      setActiveLesson(PHASE_2_LESSONS[0]);
      setInputKeyword('');
      setKeywordFeedback(null);
      playTone(500, 'sine', 0.03);
      return;
    }

    // PRO ARCHIVES requires tier === 'pro'
    if (targetPhase === 3) {
      if (currentTier === 'phase1') {
        playErrorTone();
        setTierRestrictedNotice(
          "MODULE RESTRICTED // PHASE 2 ACCESS REQUIRED. Complete your Phase 2 enrollment upgrade to unlock institutional swing & advanced execution modules."
        );
        return;
      }
      if (currentTier === 'phase2') {
        playErrorTone();
        setTierRestrictedNotice(
          "MODULE RESTRICTED // PRO ARCHIVES ACCESS REQUIRED. Upgrade your student tier to unlock institutional trade reviews and advanced archives."
        );
        return;
      }
      setTierRestrictedNotice(null);
      setCurriculumPhase(3);
      setActiveLesson(PRO_ARCHIVES_LESSONS[0]);
      setInputKeyword('');
      setKeywordFeedback(null);
      playTone(500, 'sine', 0.03);
      return;
    }
  };

  /* -------------------------------------------------------------
     PRE-TRADE RISK MATRIX & CONFLUENCE CALCULATOR LOGIC
  -------------------------------------------------------------- */
  const currencySymbol = currency === 'PHP' ? '₱' : '$';
  const riskRate = riskProfile === 5 ? 0.05 : 0.10;
  const targetRate = riskProfile === 5 ? 0.15 : 0.30;
  const calcMaxLoss = startingBalance * riskRate;
  const calcTarget3R = startingBalance * targetRate;

  const matrix1R = startingBalance * (riskProfile === 5 ? 0.05 : 0.10);
  const matrix2R = startingBalance * (riskProfile === 5 ? 0.10 : 0.20);
  const matrix3R = startingBalance * (riskProfile === 5 ? 0.15 : 0.30);
  const matrixCircuit = startingBalance * (riskProfile === 5 ? 0.10 : 0.20);

  const oneR = startingBalance * 0.10; // Baseline 1R for trade audit logger
  const target3R = oneR * 3;

  const toggleChecklistItem = (idx: number) => {
    setChecklist(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
    playTone(520, 'sine', 0.02);
  };

  const checkedCount = checklist.filter(Boolean).length;
  const executionProbability = (checkedCount / 8) * 100;
  const executionProbFormatted = executionProbability % 1 === 0 ? executionProbability.toFixed(0) : executionProbability.toFixed(1);

  let confluenceBadgeClass = 'bg-rose-950/80 border-rose-500/40 text-rose-400';
  let confluenceBarClass = 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]';
  let confluenceStatusText = 'INSUFFICIENT CONFLUENCE — DO NOT EXECUTE';

  if (executionProbability >= 87.5) {
    confluenceBadgeClass = 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400';
    confluenceBarClass = 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
    confluenceStatusText = 'PRIME MECHANICAL CONFLUENCE — EXECUTION CLEARED';
  } else if (executionProbability >= 62.5) {
    confluenceBadgeClass = 'bg-amber-950/80 border-amber-500/40 text-amber-300';
    confluenceBarClass = 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]';
    confluenceStatusText = 'MODERATE CONFLUENCE — DISCIPLINE REQUIRED';
  }

  const handleStartingBalanceChange = (val: number) => {
    setStartingBalance(val);
    localStorage.setItem(START_BAL_KEY, val.toString());
  };

  const syncCalculatorWithAudit = () => {
    const net = trades.reduce((acc, t) => acc + t.pnl, 0);
    setCurrentBalanceInput(startingBalance + net);
    playTone(720, 'sine', 0.05);
  };

  /* -------------------------------------------------------------
     ACTIVE DIRECTIVE DATE DETECTION & THEME LOGIC
  -------------------------------------------------------------- */
  const getManilaInfo = () => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short'
      });
      const parts = formatter.formatToParts(now);
      const m = parseInt(parts.find(p => p.type === 'month')?.value || '11', 10) - 1; // 10 = Nov
      const d = parseInt(parts.find(p => p.type === 'day')?.value || '11', 10);
      const dayName = parts.find(p => p.type === 'weekday')?.value || 'Wed';
      const isWknd = dayName === 'Sat' || dayName === 'Sun';
      return { month: m, day: d, isWeekend: isWknd, fullDate: now };
    } catch {
      const now = new Date();
      return { month: now.getMonth(), day: now.getDate(), isWeekend: now.getDay() === 0 || now.getDay() === 6, fullDate: now };
    }
  };

  const manilaToday = getManilaInfo();
  const currentCalMonth = manilaToday.month;
  const currentCalDay = manilaToday.day;
  const isWeekend = manilaToday.isWeekend;
  const isNovember = currentCalMonth === 10;

  const calMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const formattedTodayDateString = `${calMonthNames[currentCalMonth]} ${currentCalDay.toString().padStart(2, '0')}, ${manilaToday.fullDate.getFullYear()}`;

  const activeProjectedDay = selectedCalendarDayNum !== null ? selectedCalendarDayNum : currentCalDay;
  const activeDisplayedEvent = NOVEMBER_EVENTS.find(e => e.dayNum === activeProjectedDay);
  const todayMatchedEvent = isNovember ? NOVEMBER_EVENTS.find(e => e.dayNum === currentCalDay) : undefined;

  const getRelativeTimeBadge = (dayNum: number, currentDay: number) => {
    const diff = dayNum - currentDay;
    if (diff === 0) {
      return {
        text: "TODAY",
        dotClass: "bg-amber-400 animate-ping",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse"
      };
    } else if (diff === 1) {
      return {
        text: "TOMORROW / 1 DAY FROM NOW",
        dotClass: "bg-sky-400",
        badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm"
      };
    } else if (diff > 1) {
      return {
        text: `${diff} DAYS FROM NOW`,
        dotClass: "bg-sky-400",
        badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm"
      };
    } else if (diff === -1) {
      return {
        text: "1 DAY AGO",
        dotClass: "bg-slate-400",
        badgeClass: "bg-slate-800/80 text-slate-300 border-slate-700 shadow-sm"
      };
    } else {
      return {
        text: `${Math.abs(diff)} DAYS AGO`,
        dotClass: "bg-slate-400",
        badgeClass: "bg-slate-800/80 text-slate-300 border-slate-700 shadow-sm"
      };
    }
  };

  /* -------------------------------------------------------------
     VIDEO PLAYER LOGIC
  -------------------------------------------------------------- */
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || isNaN(videoRef.current.duration)) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    setVideoProgress((current / duration) * 100);

    const curM = Math.floor(current / 60);
    const curS = Math.floor(current % 60);
    const durM = Math.floor(duration / 60);
    const durS = Math.floor(duration % 60);
    setVideoTimeText(
      `${String(curM).padStart(2, '0')}:${String(curS).padStart(2, '0')} / ${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`
    );
  };

  const handleVideoSeek = (pct: number) => {
    if (!videoRef.current || isNaN(videoRef.current.duration)) return;
    videoRef.current.currentTime = (pct / 100) * videoRef.current.duration;
    setVideoProgress(pct);
  };

  const handlePlaybackSpeed = (rate: string) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(rate);
      playTone(600, 'sine', 0.03);
    }
  };

  const handleSelectLesson = (lesson: LessonItem) => {
    const currentList = lesson.phase === 1 
      ? PHASE_1_LESSONS 
      : lesson.phase === 2 
      ? PHASE_2_LESSONS 
      : PRO_ARCHIVES_LESSONS;

    const isUnlocked = isLessonUnlocked(lesson, currentList, unlockedKeywords);

    if (!isUnlocked) {
      playErrorTone();
      const alertMsg = "ACCESS DENIED // Validate the previous lesson's secret keyword to unlock this module.";
      setAccessDeniedAlert(alertMsg);
      setKeywordFeedback({
        type: 'error',
        msg: alertMsg
      });
      return;
    }

    setAccessDeniedAlert(null);
    setActiveLesson(lesson);
    setInputKeyword('');
    setKeywordFeedback(null);
    setIsPlaying(false);
    playTone(620, 'sine', 0.04);
  };

  const handleValidateKeyword = async () => {
    const entered = inputKeyword.trim();
    if (!entered) {
      setKeywordFeedback({ type: 'error', msg: 'Please enter a verification keyword.' });
      return;
    }

    // Case-insensitive, whitespace-normalized matching (e.g. "venum" matches "VENUM", "peter parker" matches "Peter Parker")
    const cleanEntered = entered.toLowerCase().replace(/[\s_]+/g, ' ');
    const cleanExpected = activeLesson.secretKeyword.trim().toLowerCase().replace(/[\s_]+/g, ' ');

    if (cleanEntered === cleanExpected) {
      const nextUnlocked = Array.from(new Set([...unlockedKeywords, activeLesson.id]));
      setUnlockedKeywords(nextUnlocked);
      localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(nextUnlocked));

      // Cloud Sync to Supabase students table so progress follows across devices
      if (currentStudent?.id) {
        try {
          const cloudLessons = Array.from(new Set([...(currentStudent.unlocked_lessons || []), activeLesson.id]));
          const { error: syncErr } = await supabase
            .from('students')
            .update({ unlocked_lessons: cloudLessons })
            .eq('id', currentStudent.id);

          if (!syncErr) {
            const updatedStudent: StudentSession = {
              ...currentStudent,
              unlocked_lessons: cloudLessons
            };
            setCurrentStudent(updatedStudent);
            localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(updatedStudent));
          } else {
            console.error('Supabase keywords sync error:', syncErr);
          }
        } catch (err) {
          console.error('Failed to update student unlocked lessons in Supabase:', err);
        }
      }

      setAccessDeniedAlert(null);
      setKeywordFeedback({
        type: 'success',
        msg: `VERIFIED: Lesson ${activeLesson.num} accredited to your permanent student record. Next module unlocked!`
      });
      playSuccessChime();
    } else {
      setKeywordFeedback({
        type: 'error',
        msg: 'INVALID KEYWORD. Re-check the watermark notes in this lesson.'
      });
      playErrorTone();
    }
  };

  /* -------------------------------------------------------------
     AUDIT LOGGER ACTIONS (WITH SUPABASE CLOUD SYNC)
  -------------------------------------------------------------- */
  const handleResultSelection = (resultVal: string) => {
    setTradeResult(resultVal);
    if (resultVal.includes('SL') || resultVal.includes('Stop Loss')) {
      setTradePnL(-oneR);
      setTradeRRR('-1.0R');
    } else if (resultVal.includes('BE') || resultVal.includes('Breakeven')) {
      setTradePnL(0);
      setTradeRRR('0.0R');
    } else {
      setTradePnL(oneR * 3);
      setTradeRRR('1:3.0R');
    }
  };

  const handleCommitTrade = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auto capture Manila desk clock time
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const manila = new Date(utc + 3600000 * 8);
    const hours = manila.getHours();
    const mins = String(manila.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = String(hours % 12 || 12).padStart(2, '0');
    const autoTime = `${hours12}:${mins} ${ampm}`;

    const pnlVal = Number(tradePnL) || 0;
    const rRatio = pnlVal / 1000;
    let rrr = '0.0R';
    if (pnlVal > 0) {
      rrr = `1:${rRatio.toFixed(1)}R`;
    } else if (pnlVal < 0) {
      rrr = `${rRatio.toFixed(1)}R`;
    }

    let outcome = 'TP';
    if (pnlVal > 0 || tradeResult.includes('TP') || tradeResult.includes('Take Profit')) {
      outcome = `TP (${rrr})`;
    } else if (pnlVal < 0 || tradeResult.includes('SL') || tradeResult.includes('Stop Loss')) {
      outcome = `SL (${rrr})`;
    } else {
      outcome = `BE (${rrr})`;
    }

    const cleanDate = tradeDate || new Date().toISOString().split('T')[0];
    const numLot = Number(tradeLotSize) || 1.0;
    const cleanEntry = tradeEntryPrice ? parseFloat(tradeEntryPrice.replace(/,/g, '')) || null : null;
    const cleanStop = tradeStopLoss ? parseFloat(tradeStopLoss.replace(/,/g, '')) || null : null;
    const cleanTarget = tradeTakeProfit ? parseFloat(tradeTakeProfit.replace(/,/g, '')) || null : null;

    let assignedId = 'T' + Date.now();

    // If student is logged in, insert to Supabase trade_logs
    if (currentStudent?.id) {
      try {
        const { data: inserted, error: insertErr } = await supabase
          .from('trade_logs')
          .insert({
            student_id: currentStudent.id,
            trade_date: cleanDate,
            direction: tradePosition,
            lot_size: numLot,
            entry_price: cleanEntry,
            stop_loss: cleanStop,
            take_profit: cleanTarget,
            outcome,
            net_pnl: pnlVal,
            notes: tradeDisciplineNote || null
          })
          .select()
          .single();

        if (!insertErr && inserted) {
          assignedId = inserted.id;
        } else if (insertErr) {
          console.error('Supabase trade insert error:', insertErr);
        }
      } catch (err) {
        console.error('Failed to commit trade to Supabase:', err);
      }
    }

    const newTrade: AuditTrade = {
      id: assignedId,
      pair: 'USTECH100',
      tradeDate: cleanDate,
      position: tradePosition,
      entryPrice: tradeEntryPrice || '-',
      lotSize: numLot,
      stopLoss: tradeStopLoss || '-',
      takeProfit: tradeTakeProfit || '-',
      executionTime: autoTime,
      result: outcome,
      rrr,
      pnl: pnlVal,
      note: tradeDisciplineNote,
      createdAt: Date.now()
    };

    const nextTrades = [...trades, newTrade];
    setTrades(nextTrades);
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(nextTrades));

    // Update calculator current balance
    const net = nextTrades.reduce((acc, t) => acc + t.pnl, 0);
    setCurrentBalanceInput(startingBalance + net);

    // Reset Form fields
    setTradeEntryPrice('');
    setTradeStopLoss('');
    setTradeTakeProfit('');
    setTradeDisciplineNote('');
    playSuccessChime();
  };

  const handleDeleteTrade = async (id: string) => {
    if (window.confirm('Delete this trade entry from the Phase 2 audit ledger?')) {
      if (currentStudent?.id) {
        try {
          const { error: delErr } = await supabase
            .from('trade_logs')
            .delete()
            .eq('id', id)
            .eq('student_id', currentStudent.id);
          if (delErr) {
            console.error('Supabase trade delete error:', delErr);
          }
        } catch (err) {
          console.error('Failed to delete trade from Supabase:', err);
        }
      }

      const nextTrades = trades.filter(t => t.id !== id);
      setTrades(nextTrades);
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(nextTrades));
      const net = nextTrades.reduce((acc, t) => acc + t.pnl, 0);
      setCurrentBalanceInput(startingBalance + net);
      playTone(330, 'sawtooth', 0.08);
    }
  };

  const handleResetAuditBlock = async () => {
    if (window.confirm('RESET 20-TRADE AUDIT BLOCK?\n\nThis will clear all logged Phase 2 trades. Make sure you exported your CSV report first.')) {
      if (currentStudent?.id) {
        try {
          await supabase
            .from('trade_logs')
            .delete()
            .eq('student_id', currentStudent.id);
        } catch (err) {
          console.error('Failed to reset trades in Supabase:', err);
        }
      }
      setTrades([]);
      localStorage.removeItem(TRADES_STORAGE_KEY);
      localStorage.removeItem('rjs_audit_trades_log');
      setCurrentBalanceInput(startingBalance);
      playTone(300, 'sawtooth', 0.15);
    }
  };

  const handleExportCSV = () => {
    if (trades.length === 0) {
      alert('No audit trades to export.');
      return;
    }
    const startingBal = parseFloat(localStorage.getItem(START_BAL_KEY) || '10000');
    let runningBal = startingBal;

    let csv = 'Index,Date_Time,Pair,Position,Position_Value,Lot_Size,Stop_Loss,Take_Profit,Result,RRR,PnL_PHP,Running_Balance_PHP,Discipline_Notes\n';
    trades.forEach((t, i) => {
      runningBal += t.pnl;
      const cleanNote = (t.note || '').replace(/"/g, '""');
      csv += `${i + 1},"${t.executionTime || '09:30 PM PHT'}","${t.pair || 'USTECH100'}","${t.position}","${t.entryPrice || '-'}","${Number(t.lotSize ?? 1.0).toFixed(2)}","${t.stopLoss || '-'}","${t.takeProfit || '-'}","${t.result}","${t.rrr}",${t.pnl},${runningBal},"${cleanNote}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RyanJade_Phase2_AuditLedger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playTone(700, 'sine', 0.05);
  };

  /* -------------------------------------------------------------
     STATISTICS COMPUTATION
  -------------------------------------------------------------- */
  const netPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
  const currentTotalBalance = startingBalance + netPnL;
  const balanceDelta = currentTotalBalance - startingBalance;
  const pctDelta = ((balanceDelta / startingBalance) * 100).toFixed(1);

  const winsCount = trades.filter(t => t.pnl > 0).length;
  const lossesCount = trades.filter(t => t.pnl < 0).length;
  const beCount = trades.filter(t => t.pnl === 0).length;
  const totalTradesCount = trades.length;
  const winRate = totalTradesCount > 0 ? ((winsCount / totalTradesCount) * 100).toFixed(1) : '0.0';
  const totalR = (netPnL / oneR).toFixed(1);

  const cappedAuditTrades = Math.min(totalTradesCount, 20);
  const auditProgressPct = ((cappedAuditTrades / 20) * 100).toFixed(0);

  // Filtered trades for table
  let runningBal = startingBalance;
  const tradesWithBalance = trades.map((t, idx) => {
    runningBal += t.pnl;
    return { ...t, index: idx + 1, balanceAfter: runningBal };
  });

  const filteredTrades = tradesWithBalance.filter(t => {
    if (auditFilter === 'WINS') return t.pnl > 0;
    if (auditFilter === 'LOSSES') return t.pnl < 0;
    if (auditFilter === 'BE') return t.pnl === 0;
    return true;
  });

  // Goal Trajectory Metrics (Milestone Target: ₱10,000)
  const milestoneTarget = 10000;
  const trajectoryProgressPct = Math.min(100, Math.max(0, (netPnL / milestoneTarget) * 100));

  let peakGain = 0;
  let maxDrawdown = 0;
  let runningCum = 0;
  trades.forEach(t => {
    runningCum += t.pnl;
    if (runningCum > peakGain) peakGain = runningCum;
    if (runningCum < maxDrawdown) maxDrawdown = runningCum;
  });
  const distanceToTarget = Math.max(0, milestoneTarget - netPnL);

  // Initialize and Reactively Update Chart.js Trajectory Canvas
  useEffect(() => {
    if (activeTab !== 'audit' || !chartCanvasRef.current) return;

    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels: string[] = ['Start'];
    const dataPoints: number[] = [0];
    let cum = 0;
    trades.forEach((t, i) => {
      cum += t.pnl;
      labels.push(`Trade ${i + 1}`);
      dataPoints.push(cum);
    });

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = dataPoints;
      chartInstanceRef.current.data.datasets[1].data = labels.map(() => milestoneTarget);
      chartInstanceRef.current.update();
      return;
    }

    const newChart = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Target 10,000',
            data: dataPoints,
            borderWidth: 2.5,
            tension: 0.25,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#10b981',
            segment: {
              borderColor: (ctxSegment) => {
                const prev = ctxSegment.p0.parsed?.y ?? 0;
                const next = ctxSegment.p1.parsed?.y ?? 0;
                return next >= prev ? '#10b981' : '#f43f5e';
              }
            },
            fill: {
              target: 'origin',
              above: 'rgba(16, 185, 129, 0.08)',
              below: 'rgba(244, 63, 94, 0.08)'
            }
          },

        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 400
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: {
                family: 'monospace',
                size: 11
              },
              usePointStyle: true,
              pointStyle: 'line'
            }
          },
          tooltip: {
            backgroundColor: '#0a0f1d',
            titleColor: '#e2e8f0',
            bodyColor: '#38bdf8',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleFont: { family: 'monospace', size: 12 },
            bodyFont: { family: 'monospace', size: 12 },
            padding: 10,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const val = context.parsed?.y ?? 0;
                if (context.datasetIndex === 1) return ` Target Milestone: ₱${val.toLocaleString()}`;
                return ` Cumulative P&L: ${val >= 0 ? '+' : ''}₱${val.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.04)'
            },
            ticks: {
              color: '#64748b',
              font: { family: 'monospace', size: 10 }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#64748b',
              font: { family: 'monospace', size: 10 },
              callback: (value) => `₱${Number(value).toLocaleString()}`
            }
          }
        }
      }
    });

    chartInstanceRef.current = newChart;

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [activeTab, trades]);

  /* -------------------------------------------------------------
     AUTHENTICATION GATE OVERLAY
  -------------------------------------------------------------- */
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]">
        <div className={`glass-card max-w-md w-full rounded-2xl p-6 sm:p-8 border border-emerald-500/30 shadow-[0_0_80px_rgba(16,185,129,0.14)] ${isShaking ? 'shake-error' : ''}`}>
          
          <div className="flex items-center justify-between pb-4 border-b border-hairline mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-bold">RYAN JADE // STUDENT TERMINAL ACCESS</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">GATE // 01</span>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 mb-3 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Enter Desk Passcode</h2>
            <p className="text-xs text-slate-400 mt-1">Restricted terminal for active enrolled traders only.</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between">
                <span>Desk Security Key</span>
                <span className="text-[10px] text-slate-500 font-normal">Passcode required</span>
              </label>
              <input
                type="password"
                value={passcodeKey}
                onChange={(e) => setPasscodeKey(e.target.value)}
                placeholder="••••••"
                disabled={isAuthenticating}
                className={`w-full bg-[#0a0d15] border ${authError ? 'border-rose-500' : 'border-slate-700/80'} rounded-lg px-4 py-3.5 text-center text-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono tracking-[0.35em] transition-all disabled:opacity-50`}
                required
                autoFocus
              />
              {authError && (
                <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-xs font-mono text-rose-300 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="font-semibold text-center">{authErrorMessage}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-3.5 px-4 rounded-lg text-xs font-mono tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>VERIFYING CREDENTIALS...</span>
                </>
              ) : (
                <>
                  <span>UNLOCK TERMINAL</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     MAIN TERMINAL DASHBOARD
  -------------------------------------------------------------- */
  return (
    <div className="min-h-screen flex flex-col text-slate-200">
      
      {/* HEADER ECOSYSTEM */}
      <header className="border-b border-hairline bg-[#07090e]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Brand & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-wider text-white">RYAN JADE</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">//</span>
                <span className="text-xs sm:text-sm font-semibold tracking-wide text-slate-300">MECHANICAL DESK</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span className="text-emerald-400">STUDENT TERMINAL</span>
                <span>·</span>
                <span>USTECH100 EXCLUSIVE</span>
              </div>
            </div>
          </div>

          {/* Center / Right: Live Clock, NY Countdown, Student Identity & Tier Badge & LOG OUT */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-4">
            
            {/* Student Trader Full Name */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e131e] border border-hairline">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-[11px] leading-tight">
                <div className="text-slate-400 text-[9px] uppercase tracking-wider font-mono">ENROLLED TRADER</div>
                <div className="text-white font-mono font-bold truncate max-w-[140px] sm:max-w-[200px]">
                  {currentStudent?.full_name || 'STUDENT TRADER'}
                </div>
              </div>
            </div>

            {/* Staggered Tier Badge */}
            {(() => {
              const tierInfo = getTierBadge(currentStudent?.tier);
              return (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${tierInfo.badgeClass}`}>
                  <span className={`w-2 h-2 rounded-full ${tierInfo.dotClass}`}></span>
                  <span>{tierInfo.label}</span>
                </div>
              );
            })()}

            {/* Manila Desk Time */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e131e] border border-hairline">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <div className="text-[11px] leading-tight">
                <div className="text-slate-400 text-[9px] uppercase tracking-wider font-mono">MANILA (PHT)</div>
                <div className="text-white font-mono font-bold num-mono text-xs">{manilaClock}</div>
              </div>
            </div>

            {/* Countdown to 9:30 PM NY Open */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isNyActive ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isNyActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`}></div>
              <div className="text-[11px] leading-tight">
                <div className={`text-[9px] uppercase tracking-wider font-mono ${isNyActive ? 'text-emerald-400' : 'text-amber-400/80'}`}>9:30 PM NY OPEN</div>
                <div className={`font-mono font-bold num-mono text-xs ${isNyActive ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {nyCountdown}
                </div>
              </div>
            </div>

            {/* Sleek LOG OUT Button in Top Nav */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 hover:text-white hover:bg-rose-900/50 hover:border-rose-400 font-mono text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              title="Log Out / Lock Desk Terminal"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>LOG OUT</span>
            </button>

            {/* Standalone portal.html Quick Access Link */}
            <a
              href="/portal.html"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e131e] border border-hairline text-slate-400 hover:text-emerald-400 text-xs font-mono transition-colors"
              title="Open the standalone single-file portal.html application"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>portal.html</span>
            </a>

            {/* Audio Toggle Action */}
            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                playTone(660);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Toggle Institutional Terminal Audio Blips"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

          </div>

        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-hairline">
          <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setActiveTab('defense');
                playTone(550, 'sine', 0.04);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide border transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'defense'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>TRADING CALENDAR & RISK ASSESSMENT</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vault');
                playTone(550, 'sine', 0.04);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide border transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>PHASE 1 AND PHASE 2 LESSONS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                {unlockedKeywords.length}/14
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('audit');
                playTone(550, 'sine', 0.04);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide border transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>TRADING LOGS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {trades.length}/20
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* WORKSPACE VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ============================================================== */}
        {/* TAB 1: SESSION DEFENSE & RISK CLEARANCE                        */}
        {/* ============================================================== */}
        {activeTab === 'defense' && (
          <div className="space-y-6">
            
            {/* 1. TOP: NOVEMBER MASTER RISK CALENDAR */}
            <div className="glass-card rounded-xl p-5 border-hairline">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <h4 className="text-sm font-bold tracking-wide text-white uppercase">CALENDAR</h4>
                  </div>
                  <p className="text-[11px] font-mono mt-0.5">
                    <span className="text-emerald-400 font-bold">TRADABLE</span> = Trade,{' '}
                    <span className="text-amber-400 font-bold">RISKY</span> = Half Risk,{' '}
                    <span className="text-rose-400 font-bold">DONT TRADE</span> = Go To Sleep, -ryanjadehandsome
                  </p>
                </div>

                {/* Filter buttons with Statistical Counts */}
                <div className="flex items-center gap-1 p-1 bg-[#0a0d15] rounded-lg border border-hairline text-[11px] font-mono">
                  {(
                    [
                      { key: 'ALL', label: 'ALL (20)' },
                      { key: 'TRADABLE', label: 'TRADABLE (11)' },
                      { key: 'RISKY', label: 'RISKY (4)' },
                      { key: 'DONT_TRADE', label: 'DONT TRADE (5)' }
                    ] as const
                  ).map(f => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setCalendarFilter(f.key);
                        playTone(480, 'sine', 0.03);
                      }}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        calendarFilter === f.key
                          ? 'bg-slate-800 text-white'
                          : f.key === 'TRADABLE'
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : f.key === 'RISKY'
                          ? 'text-amber-400 hover:text-amber-300'
                          : f.key === 'DONT_TRADE'
                          ? 'text-rose-400 hover:text-rose-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic ACTIVE DIRECTIVE Top Banner (Clickable to Reset) */}
              {activeDisplayedEvent ? (() => {
                const isProjectingToday = isNovember && activeDisplayedEvent.dayNum === currentCalDay;
                const relBadge = getRelativeTimeBadge(activeDisplayedEvent.dayNum, currentCalDay);
                return (
                  <div
                    onClick={() => {
                      setSelectedCalendarDayNum(null);
                      playTone(600, 'sine', 0.04);
                    }}
                    title="Click banner to reset to Today's Directive (Nov 11)"
                    className={`mb-4 rounded-xl p-4 border transition-all duration-300 relative cursor-pointer select-none group ${
                      activeDisplayedEvent.impact === 'TRADABLE'
                        ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/50 via-[#0c1815] to-[#0a0d15] shadow-[0_0_25px_rgba(16,185,129,0.22)]'
                        : activeDisplayedEvent.impact === 'RISKY'
                        ? 'border-amber-500/60 bg-gradient-to-r from-amber-950/50 via-[#18140c] to-[#0a0d15] shadow-[0_0_25px_rgba(245,158,11,0.22)]'
                        : 'border-rose-500/60 bg-gradient-to-r from-rose-950/50 via-[#180d12] to-[#0a0d15] shadow-[0_0_25px_rgba(244,63,94,0.22)]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-hairline">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-2.5 h-2.5 rounded-full tactical-pulse ${
                            activeDisplayedEvent.impact === 'TRADABLE'
                              ? 'bg-emerald-400'
                              : activeDisplayedEvent.impact === 'RISKY'
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                        ></span>
                        <span className="text-xs font-mono uppercase font-bold tracking-wider text-white">
                          {activeDisplayedEvent.day.toUpperCase()} (NOVEMBER {activeDisplayedEvent.dayNum.toString().padStart(2, '0')}, 2026)
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${relBadge.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${relBadge.dotClass}`}></span>
                          ● {relBadge.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isProjectingToday ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCalendarDayNum(null);
                              playTone(600, 'sine', 0.04);
                            }}
                            className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            RESET TO TODAY (NOV {currentCalDay.toString().padStart(2, '0')})
                          </button>
                        ) : null}
                        <span
                          className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full border ${
                            activeDisplayedEvent.impact === 'TRADABLE'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                              : activeDisplayedEvent.impact === 'RISKY'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                          }`}
                        >
                          {activeDisplayedEvent.impact === 'TRADABLE'
                            ? '✓ TRADABLE (1R)'
                            : activeDisplayedEvent.impact === 'RISKY'
                            ? '⚠ RISKY (0.5R)'
                            : '⛔ DONT TRADE (STAND DOWN)'}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2.5 space-y-1.5 text-xs font-mono">
                      <div className="text-slate-300 flex items-start gap-2">
                        <span className="text-slate-400 font-bold shrink-0">EVENTS:</span>
                        <span className="text-slate-200">{activeDisplayedEvent.events || activeDisplayedEvent.event}</span>
                      </div>
                      <div className="text-slate-300 flex items-start gap-2">
                        <strong className="font-bold text-white shrink-0">NOTE:</strong>
                        <span
                          className={`font-semibold ${
                            activeDisplayedEvent.impact === 'TRADABLE'
                              ? 'text-emerald-300'
                              : activeDisplayedEvent.impact === 'RISKY'
                              ? 'text-amber-300'
                              : 'text-rose-300'
                          }`}
                        >
                          {activeDisplayedEvent.directiveNote || activeDisplayedEvent.directive}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })() : isWeekend ? (
                <div
                  onClick={() => {
                    setSelectedCalendarDayNum(null);
                    playTone(600, 'sine', 0.04);
                  }}
                  className="mb-4 rounded-xl p-4 border border-slate-700/60 bg-gradient-to-r from-slate-900/80 via-[#0e131d] to-[#0a0d15] shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      <span className="text-xs font-mono uppercase font-bold tracking-wider text-white">
                        {formattedTodayDateString.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
                        WEEKEND
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-300">
                        WEEKEND — MARKET CLOSED
                      </span>
                    </div>
                  </div>
                  <div className="pt-2.5 space-y-1.5 text-xs font-mono">
                    <div className="text-slate-300 flex items-start gap-2">
                      <span className="text-slate-400 font-bold shrink-0">EVENTS:</span>
                      <span className="text-slate-300">No Active US Sessions • Global Equity &amp; FX Markets Closed</span>
                    </div>
                    <div className="text-slate-300 flex items-start gap-2">
                      <strong className="font-bold text-white shrink-0">NOTE:</strong>
                      <span className="text-amber-300">Weekly review &amp; study protocol. Terminal locked.</span>
                    </div>
                  </div>
                </div>
              ) : !isNovember ? (
                <div
                  onClick={() => {
                    setSelectedCalendarDayNum(null);
                    playTone(600, 'sine', 0.04);
                  }}
                  className="mb-4 rounded-xl p-4 border border-slate-700/60 bg-[#0a0d15] shadow-md transition-all duration-300 cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      <span className="text-xs font-mono uppercase font-bold tracking-wider text-white">
                        {formattedTodayDateString.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-300">
                        STANDBY
                      </span>
                    </div>
                  </div>
                  <div className="pt-2.5 space-y-1.5 text-xs font-mono">
                    <div className="text-slate-300 flex items-start gap-2">
                      <strong className="font-bold text-white shrink-0">NOTE:</strong>
                      <span className="text-slate-300">STANDBY — Follow standard desk risk protocols.</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Legend with Day Counts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 text-[11px] font-mono">
                <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>TRADABLE: Standard 1R</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">11 Days</span>
                </div>
                <div className="p-2 rounded bg-amber-950/30 border border-amber-500/20 text-amber-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>RISKY: Half Risk 0.5R</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">4 Days</span>
                </div>
                <div className="p-2 rounded bg-rose-950/30 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>DONT TRADE: Freeze Desk</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">5 Days</span>
                </div>
              </div>

              {/* Events list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {NOVEMBER_EVENTS.filter(ev => calendarFilter === 'ALL' || ev.impact === calendarFilter).map(ev => {
                  const isToday = isNovember && ev.dayNum === currentCalDay;
                  const isPast = isNovember && ev.dayNum < currentCalDay;
                  const isFuture = !isNovember || ev.dayNum > currentCalDay;
                  const isSelected = ev.dayNum === activeProjectedDay;
                  const cardRelBadge = getRelativeTimeBadge(ev.dayNum, currentCalDay);

                  const isTradable = ev.impact === 'TRADABLE';
                  const isRisky = ev.impact === 'RISKY';

                  let badgeStyle = isTradable
                    ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                    : isRisky
                    ? 'bg-amber-950/80 border-amber-500/30 text-amber-300'
                    : 'bg-rose-950/80 border-rose-500/30 text-rose-300';

                  let statusLabel = isTradable
                    ? 'TRADABLE (1R)'
                    : isRisky
                    ? 'RISKY (0.5R)'
                    : 'DONT TRADE';

                  let noteColor = isTradable
                    ? 'text-emerald-300/90'
                    : isRisky
                    ? 'text-amber-300/90'
                    : 'text-rose-300/90';

                  let cardBorderClasses = '';
                  if (isSelected) {
                    cardBorderClasses = 'p-3.5 rounded-xl bg-[#111622] ring-2 ring-white/60 border-white/70 shadow-[0_0_20px_rgba(255,255,255,0.25)] opacity-100 transition-all cursor-pointer select-none flex flex-col justify-between relative';
                  } else if (isToday) {
                    cardBorderClasses = 'p-3.5 rounded-xl bg-gradient-to-br from-[#1b150b] via-[#141008] to-[#0a0d15] ring-2 ring-amber-500/80 border-amber-500/90 shadow-[0_0_22px_rgba(245,158,11,0.35)] opacity-100 transition-all cursor-pointer select-none flex flex-col justify-between relative';
                  } else if (isPast) {
                    cardBorderClasses = 'p-3 rounded-xl bg-[#090b10] border border-slate-800/60 opacity-50 hover:opacity-100 transition duration-200 cursor-pointer select-none flex flex-col justify-between';
                  } else {
                    cardBorderClasses = 'p-3 rounded-xl bg-[#0a0d15] border border-hairline hover:border-white/30 hover:bg-[#0f1422] opacity-100 transition-all cursor-pointer select-none flex flex-col justify-between';
                  }

                  let dayPillHtml = <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-[#131926] border border-hairline">{ev.day}</span>;
                  let eventsText = <div className="text-xs text-slate-200 font-medium leading-relaxed">{ev.events || ev.event}</div>;
                  let noteRow = (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-1.5">
                      <strong className="font-bold text-white shrink-0">NOTE:</strong>
                      <span className={noteColor}>{ev.directiveNote || ev.directive}</span>
                    </div>
                  );

                  if (isPast && !isSelected) {
                    dayPillHtml = <span className="font-mono text-xs font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">{ev.day}</span>;
                    badgeStyle = 'bg-slate-900/90 border-slate-800 text-slate-400';
                    eventsText = <div className="text-xs text-slate-400 font-medium leading-relaxed">{ev.events || ev.event}</div>;
                    noteRow = (
                      <div className="mt-2.5 pt-2 border-t border-slate-900 text-[11px] text-slate-500 flex items-start gap-1.5">
                        <strong className="font-bold text-slate-400 shrink-0">NOTE:</strong>
                        <span className="text-slate-400">{ev.directiveNote || ev.directive}</span>
                      </div>
                    );
                  } else if (isToday) {
                    dayPillHtml = <span className="font-mono text-xs font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">{ev.day}</span>;
                    eventsText = <div className="text-xs text-white font-semibold leading-relaxed">{ev.events || ev.event}</div>;
                    noteRow = (
                      <div className="mt-2.5 pt-2 border-t border-amber-500/30 text-[11px] text-slate-300 flex items-start gap-1.5">
                        <strong className="font-bold text-white shrink-0">NOTE:</strong>
                        <span className="text-amber-300 font-semibold">{ev.directiveNote || ev.directive}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedCalendarDayNum(ev.dayNum);
                        playTone(520, 'sine', 0.03);
                      }}
                      title={`Click to inspect directive for ${ev.day}`}
                      className={cardBorderClasses}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {dayPillHtml}
                            {isToday && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/60 flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block"></span>
                                ● TODAY
                              </span>
                            )}
                            {isSelected && !isToday && (
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${cardRelBadge.badgeClass} flex items-center gap-1`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cardRelBadge.dotClass} inline-block`}></span>
                                ● {cardRelBadge.text}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {eventsText}
                      </div>
                      {noteRow}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* 2. PRE-TRADE RISK MATRIX & EXECUTION RULES */}
            <div className="glass-card rounded-xl p-5 border-hairline relative">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-hairline mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h4 className="text-sm font-bold tracking-wide text-white uppercase">RISK ASSESSMENT</h4>
                </div>

                {/* 2. Title & Currency Toggle Switch */}
                <div className="flex items-center gap-1 p-1 bg-[#0a0d15] rounded-lg border border-hairline text-[11px] font-mono self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => { setCurrency('PHP'); playTone(600, 'sine', 0.03); }}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      currency === 'PHP'
                        ? 'font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'font-medium text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    ₱ PHP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCurrency('USD'); playTone(600, 'sine', 0.03); }}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      currency === 'USD'
                        ? 'font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'font-medium text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Inputs & Risk Parameters (Left 6 cols) */}
                <div className="lg:col-span-6 space-y-4">
                  
                  {/* Starting & Current Balance Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Starting Balance ({currencySymbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          value={startingBalance}
                          step={500}
                          onChange={(e) => handleStartingBalanceChange(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#0a0d15] border border-slate-700/80 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono num-mono focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Current Balance ({currencySymbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          value={currentBalanceInput}
                          step={100}
                          onChange={(e) => setCurrentBalanceInput(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#0a0d15] border border-slate-700/80 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono num-mono focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Risk Toggle: 2-Button Risk Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                        RISK PROFILE SELECTOR
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {riskProfile === 5 ? '5% SL / 15% TP (Conservative Drill)' : '10% SL / 30% TP (Aggressive Drill)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[#0a0d15] rounded-lg border border-hairline font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => { setRiskProfile(5); playTone(560, 'sine', 0.03); }}
                        className={`py-2 px-3 rounded-md transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          riskProfile === 5
                            ? 'font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                            : 'font-semibold text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="font-bold text-xs">5% SL / 15% TP</span>
                        <span className="text-[10px] opacity-75 font-normal">Conservative (5% Risk Drill)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRiskProfile(10); playTone(560, 'sine', 0.03); }}
                        className={`py-2 px-3 rounded-md transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          riskProfile === 10
                            ? 'font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                            : 'font-semibold text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="font-bold text-xs">10% SL / 30% TP</span>
                        <span className="text-[10px] opacity-75 font-normal">Aggressive (10% Risk Drill)</span>
                      </button>
                    </div>
                  </div>

                  {/* Max Loss & 1:3 Target Display */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold">
                        Max Allowed Loss (-1R)
                      </div>
                      <div className="text-lg font-mono font-bold text-rose-400 num-mono mt-0.5">
                        -{currencySymbol}{calcMaxLoss.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {(riskRate * 100).toFixed(1)}% OF CAPITAL BASE
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                        1:3 Target (+3R)
                      </div>
                      <div className="text-lg font-mono font-bold text-emerald-400 num-mono mt-0.5">
                        +{currencySymbol}{calcTarget3R.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {(targetRate * 100).toFixed(1)}% RETURN CAP
                      </div>
                    </div>
                  </div>

                  {/* Target Matrix Table */}
                  <div className="space-y-2 py-3 px-3.5 rounded-lg bg-[#0a0d15] border border-hairline text-xs font-mono">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex justify-between">
                      <span>Target Matrix</span>
                      <span>Projected Account</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>1:1 Target ({riskProfile === 5 ? '+5%' : '+10%'})</span>
                      <span className="text-emerald-400 num-mono font-bold">
                        +{currencySymbol}{matrix1R.toLocaleString()} ({currencySymbol}{(currentBalanceInput + matrix1R).toLocaleString()})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>1:2 Target ({riskProfile === 5 ? '+10%' : '+20%'})</span>
                      <span className="text-emerald-400 num-mono font-bold">
                        +{currencySymbol}{matrix2R.toLocaleString()} ({currencySymbol}{(currentBalanceInput + matrix2R).toLocaleString()})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>1:3 Target ({riskProfile === 5 ? '+15%' : '+30%'})</span>
                      <span className="text-emerald-300 num-mono font-bold">
                        +{currencySymbol}{matrix3R.toLocaleString()} ({currencySymbol}{(currentBalanceInput + matrix3R).toLocaleString()})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-rose-400/90 pt-1 border-t border-slate-800">
                      <span>Daily Circuit Breaker (-2R)</span>
                      <span className="num-mono font-bold">
                        -{currencySymbol}{matrixCircuit.toLocaleString()} (TERMINAL LOCK)
                      </span>
                    </div>
                  </div>

                </div>

                {/* 4. REPLACE CHECKLIST RULES & 5. CONFLUENCE CALCULATOR (Right 6 cols) */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="p-4 rounded-xl bg-[#0e131e] border border-hairline flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between pb-2.5 border-b border-hairline mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 tactical-pulse"></div>
                          <span className="text-xs font-mono text-white uppercase tracking-wider font-bold">
                            RULES CHECKLIST
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {checkedCount}/8 RULES MET
                        </span>
                      </div>

                      {/* Exact 8 Rules with Checkboxes */}
                      <div className="space-y-1.5 text-xs text-slate-300">
                        {[
                          'No red folders',
                          'Trendline breakout',
                          'Whole candle breakout (body outside of trendline)',
                          '15 minute candle pullback (body outside of trendline)',
                          'Fibbonnacci respected',
                          'Session high and session low respected',
                          'RSI not oversold/overbought',
                          'Stop loss protected by a session high/low or a fibb'
                        ].map((ruleText, idx) => (
                          <label
                            key={idx}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0a0d15] border border-hairline hover:border-slate-700 cursor-pointer select-none transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checklist[idx]}
                              onChange={() => toggleChecklistItem(idx)}
                              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                            />
                            <span className="flex-1 leading-snug">
                              <strong className="font-mono text-emerald-400 mr-1.5">{idx + 1}.</strong> {ruleText}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 5. CONFLUENCE CALCULATOR READOUT */}
                    <div className="mt-4 pt-3.5 border-t border-hairline space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                          CONFLUENCE CALCULATOR
                        </span>
                        <span className="text-xs font-mono font-bold text-white num-mono">
                          Probability of Winning: {executionProbFormatted}%
                        </span>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full h-2 rounded-full bg-[#07090e] border border-slate-800 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${confluenceBarClass}`}
                          style={{ width: `${executionProbability}%` }}
                        />
                      </div>

                      {/* Status badge below the bar */}
                      <div className="flex justify-center">
                        <div className={`w-full text-center text-[11px] font-mono font-bold px-3 py-1 rounded border ${confluenceBadgeClass}`}>
                          {confluenceStatusText}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PROPRIETARY VIDEO VAULT                                 */}
        {/* ============================================================== */}
        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT PANEL: 2-COLUMN MEMBER CURRICULUM VIEWER */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card rounded-xl p-4 sm:p-5 border-hairline">
                
                <div className="flex items-center justify-between pb-3 border-b border-hairline mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wide">Member Curriculum</h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {curriculumPhase === 3 ? 'Institutional Tape Reading & Case Studies' : 'Phase 1 & Phase 2 Mechanical Matrix'}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">
                    {curriculumPhase === 3
                      ? `${PRO_ARCHIVES_LESSONS.filter(l => isLessonVerified(l.id, unlockedKeywords)).length} / ${PRO_ARCHIVES_LESSONS.length} Unlocked`
                      : `${[...PHASE_1_LESSONS, ...PHASE_2_LESSONS].filter(l => isLessonVerified(l.id, unlockedKeywords)).length} / 14 Unlocked`}
                  </span>
                </div>

                {/* Staggered Tier Notice Banner */}
                {tierRestrictedNotice && (
                  <div className="mb-3 p-3 rounded-lg bg-[#0e111a] border border-amber-500/50 text-amber-300 font-mono text-xs flex items-start gap-2.5 shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-pulse">
                    <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-[11px] text-amber-400 tracking-wider">MODULE RESTRICTED</div>
                      <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{tierRestrictedNotice}</div>
                    </div>
                    <button
                      onClick={() => setTierRestrictedNotice(null)}
                      className="text-slate-400 hover:text-white px-1 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Phase Switcher */}
                {(() => {
                  const studentTier = (currentStudent?.tier || 'phase1').toLowerCase();
                  const isPhase2Locked = studentTier === 'phase1';
                  const isProLocked = studentTier === 'phase1' || studentTier === 'phase2';

                  return (
                    <div className="flex gap-1.5 p-1 bg-[#0a0d15] rounded-lg border border-hairline mb-3 text-xs font-mono">
                      <button
                        onClick={() => handleSwitchCurriculumPhase(1)}
                        className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all cursor-pointer ${
                          curriculumPhase === 1
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        PHASE 1 (01 - 07)
                      </button>
                      <button
                        onClick={() => handleSwitchCurriculumPhase(2)}
                        className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          curriculumPhase === 2
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isPhase2Locked
                            ? 'text-slate-500 hover:text-slate-400 bg-slate-900/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={isPhase2Locked ? 'Locked for Phase 1 Tier' : 'Phase 2 Lessons'}
                      >
                        <span>PHASE 2 (01 - 07)</span>
                        {isPhase2Locked && <span className="text-[11px]">🔒</span>}
                      </button>
                      <button
                        onClick={() => handleSwitchCurriculumPhase(3)}
                        className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          curriculumPhase === 3
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isProLocked
                            ? 'text-slate-500 hover:text-slate-400 bg-slate-900/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={isProLocked ? 'Locked for non-Pro Tiers' : 'Pro Archives'}
                      >
                        <span>PRO ARCHIVES</span>
                        {isProLocked && <span className="text-[11px]">🔒</span>}
                      </button>
                    </div>
                  );
                })()}

                {/* Lesson List */}
                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {(curriculumPhase === 1
                    ? PHASE_1_LESSONS
                    : curriculumPhase === 2
                    ? PHASE_2_LESSONS
                    : PRO_ARCHIVES_LESSONS
                  ).map(lesson => {
                    const currentPhaseLessons = curriculumPhase === 1
                      ? PHASE_1_LESSONS
                      : curriculumPhase === 2
                      ? PHASE_2_LESSONS
                      : PRO_ARCHIVES_LESSONS;
                    const isCurrent = lesson.id === activeLesson.id;
                    const isVerified = unlockedKeywords.includes(lesson.id);
                    const isUnlocked = isLessonUnlocked(lesson, currentPhaseLessons, unlockedKeywords);
                    const isLocked = !isUnlocked;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson)}
                        className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                          isLocked
                            ? 'opacity-50 hover:opacity-70 bg-[#07090e] border-slate-800/60 cursor-not-allowed select-none'
                            : isCurrent
                            ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer'
                            : 'bg-[#0a0d15] border-hairline hover:bg-slate-800/40 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`font-mono text-xs font-bold ${isCurrent ? 'text-emerald-400' : isLocked ? 'text-slate-600' : 'text-slate-500'}`}>
                            {lesson.num}
                          </span>
                          <div className="truncate">
                            <h5 className={`text-xs font-semibold ${isCurrent ? 'text-white' : isLocked ? 'text-slate-500' : 'text-slate-300'} truncate flex items-center gap-1.5`}>
                              <span>{lesson.title}</span>
                            </h5>
                            <span className="text-[10px] font-mono text-slate-500">{lesson.duration}</span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isVerified ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold" title="Keyword Verified">
                              ✓
                            </span>
                          ) : isLocked ? (
                            <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center text-[11px]" title="Locked Module">
                              🔒
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]" title="Ready To Validate">
                              ○
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: VIDEO PLAYER, NOTES, KEYWORD VALIDATOR & WORKSHEET */}
            <div className="lg:col-span-7 space-y-6">
              <div className="glass-card rounded-xl p-5 border-hairline">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-hairline mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold">
                        {activeLesson.phase === 3 ? 'PRO ARCHIVES' : `PHASE ${activeLesson.phase}`} // LESSON {activeLesson.num}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{activeLesson.duration}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {activeLesson.num}: {activeLesson.title}
                    </h3>
                  </div>
                </div>

                {/* TIER RESTRICTED DARK TERMINAL NOTICE */}
                {tierRestrictedNotice && (
                  <div className="mb-4 p-4 rounded-xl bg-[#090d16] border border-amber-500/50 text-amber-300 font-mono text-xs flex items-start justify-between gap-3 shadow-[0_0_25px_rgba(245,158,11,0.2)] animate-pulse">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-400 tracking-wider">MODULE RESTRICTED // TIER UPGRADE REQUIRED</div>
                        <div className="text-slate-200 mt-1 leading-relaxed">{tierRestrictedNotice}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setTierRestrictedNotice(null)}
                      className="text-amber-400 hover:text-white text-xs font-bold font-mono px-2 py-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* ACCESS DENIED ALERT BANNER */}
                {accessDeniedAlert && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-mono text-xs flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{accessDeniedAlert}</span>
                    </div>
                    <button 
                      onClick={() => setAccessDeniedAlert(null)}
                      className="text-rose-400 hover:text-white text-xs font-bold font-mono px-2 py-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Embedded Responsive Video Player Container */}
                <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl aspect-video group">
                  <iframe
                    id="activeLessonFrame"
                    src={activeLesson.driveId ? `https://drive.google.com/file/d/${activeLesson.driveId}/preview` : activeLesson.videoUrl}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                </div>

                {/* Lesson Notes & Keyword Validator */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  
                  {/* Notes */}
                  <div className="p-4 rounded-xl bg-[#0a0d15] border border-hairline">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" />
                      <span>Lesson Execution Notes</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {activeLesson.notes.map((n, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">›</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Secret Keyword Validator */}
                  <div className="p-4 rounded-xl bg-[#0a0d15] border border-hairline flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                          <Key className="w-4 h-4" />
                          <span>Secret Keyword Validator</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            unlockedKeywords.includes(activeLesson.id)
                              ? 'bg-emerald-950 border border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {unlockedKeywords.includes(activeLesson.id) ? 'VERIFIED' : 'UNVERIFIED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2">
                        Enter the secret keyword revealed at the video timestamp watermark to verify completion.
                      </p>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={inputKeyword}
                          onChange={(e) => setInputKeyword(e.target.value)}
                          placeholder="e.g. DISPLACEMENT"
                          className="w-full bg-[#07090e] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                        />
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              alert(
                                `[SECRET KEYWORD HINT]\n\nLesson ${activeLesson.num} Hint: "${activeLesson.hint}"\nTarget keyword has ${activeLesson.secretKeyword.length} characters.`
                              )
                            }
                            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 underline cursor-pointer"
                          >
                            Need Hint?
                          </button>
                          <button
                            type="button"
                            onClick={handleValidateKeyword}
                            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors cursor-pointer"
                          >
                            VALIDATE KEY
                          </button>
                        </div>
                      </div>
                    </div>

                    {keywordFeedback && (
                      <div
                        className={`mt-2 text-xs font-mono ${
                          keywordFeedback.type === 'success' ? 'text-emerald-400 font-bold' : 'text-rose-400'
                        }`}
                      >
                        {keywordFeedback.msg}
                      </div>
                    )}

                  </div>

                </div>

              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: EXECUTION AUDIT LOGGER                                  */}
        {/* ============================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            
            {/* Top Metric Stats Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              
              <div className="glass-card rounded-xl p-4 border-hairline">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Starting Balance</div>
                <div className="text-xl font-bold font-mono text-white num-mono mt-1">
                  ₱{startingBalance.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">LOCKED BASE</div>
              </div>

              <div className="glass-card rounded-xl p-4 border-hairline">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Current Balance</div>
                <div className="text-xl font-bold font-mono text-emerald-400 num-mono mt-1">
                  ₱{currentTotalBalance.toLocaleString()}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${balanceDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {balanceDelta >= 0 ? '+' : '-'}₱{Math.abs(balanceDelta).toLocaleString()} ({pctDelta}%)
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 border-hairline">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Net Realized P&amp;L</div>
                <div className={`text-xl font-bold font-mono num-mono mt-1 ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netPnL >= 0 ? '+' : '-'}₱{Math.abs(netPnL).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {parseFloat(totalR) >= 0 ? '+' : ''}{totalR}R TOTAL
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 border-hairline">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Win Rate %</div>
                <div className="text-xl font-bold font-mono text-white num-mono mt-1">{winRate}%</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {winsCount} W / {lossesCount} L / {beCount} BE
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 border-emerald-500/30 col-span-2 md:col-span-1 bg-emerald-950/10">
                <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex justify-between">
                  <span>Audit Block</span>
                  <span className="num-mono">{totalTradesCount} / 20</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${auditProgressPct}%` }}></div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1.5 flex justify-between">
                  <span>Sample Size Gate</span>
                  <span className="text-emerald-400">{auditProgressPct}%</span>
                </div>
              </div>

            </div>

            {/* Compacted Mechanical Audit Commit Engine */}
            <div className="glass-card rounded-xl p-3.5 sm:p-4 border-hairline">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2.5 border-b border-hairline mb-3 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">Mechanical Audit Commit Engine</h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] sm:text-xs font-bold">
                    <Lock className="w-3 h-3" />
                    <span>LOCKED: USTECH100</span>
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Session: <span className="text-amber-400 font-semibold">9:30 PM NY Cash Open</span>
                </div>
              </div>

              <form onSubmit={handleCommitTrade}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 items-end">
                  {/* 1. DATE */}
                  <div className="col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold uppercase">DATE</label>
                    <input
                      type="date"
                      value={tradeDate}
                      onChange={(e) => setTradeDate(e.target.value)}
                      className="w-full bg-[#0a0d15] border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>

                  {/* 2. DIRECTION: BUY/SELL */}
                  <div className="col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold uppercase">DIRECTION</label>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#07090e] border border-slate-800 rounded-md h-[33px] items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setTradePosition('BUY');
                          playTone(520, 'sine', 0.03);
                        }}
                        className={`h-full rounded font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                          tradePosition === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTradePosition('SELL');
                          playTone(520, 'sine', 0.03);
                        }}
                        className={`h-full rounded font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                          tradePosition === 'SELL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        SELL
                      </button>
                    </div>
                  </div>

                  {/* 3. LOT SIZE */}
                  <div className="col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold uppercase">LOT SIZE</label>
                    <input
                      type="number"
                      value={tradeLotSize}
                      onChange={(e) => setTradeLotSize(parseFloat(e.target.value) || 0.01)}
                      step={0.01}
                      min={0.01}
                      className="w-full bg-[#0a0d15] border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white num-mono focus:outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>

                  {/* 4. ENTRY PRICE */}
                  <div className="col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold uppercase">ENTRY</label>
                    <input
                      type="number"
                      step="any"
                      value={tradeEntryPrice}
                      onChange={(e) => setTradeEntryPrice(e.target.value)}
                      placeholder="e.g. 21,186"
                      className="w-full bg-[#0a0d15] border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white num-mono focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                      required
                    />
                  </div>

                  {/* 5. STOP LOSS */}
                  <div className="col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold uppercase">STOP LOSS</label>
                    <input
                      type="number"
                      step="any"
                      value={tradeStopLoss}
                      onChange={(e) => setTradeStopLoss(e.target.value)}
                      placeholder="e.g. 20,410"
                      className="w-full bg-[#0a0d15] border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white num-mono focus:outline-none focus:border-rose-500/80 placeholder-slate-600 transition-colors"
                      required
                    />
                  </div>

                  {/* 6. TAKE PROFIT */}
                  <div className="col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold uppercase">TAKE PROFIT</label>
                    <input
                      type="number"
                      step="any"
                      value={tradeTakeProfit}
                      onChange={(e) => setTradeTakeProfit(e.target.value)}
                      placeholder="e.g. 20,530"
                      className="w-full bg-[#0a0d15] border border-slate-700 rounded-md py-1.5 px-2.5 text-xs font-mono text-white num-mono focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                      required
                    />
                  </div>

                  {/* 7. RESULT */}
                  <div className="col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold uppercase">RESULT</label>
                    <select
                      value={tradeResult}
                      onChange={(e) => handleResultSelection(e.target.value)}
                      className="w-full bg-[#0a0d15] border border-slate-700 rounded-md py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Take Profit (TP)">Take Profit (TP)</option>
                      <option value="Breakeven (BE)">Breakeven (BE)</option>
                      <option value="Stop Loss (SL)">Stop Loss (SL)</option>
                    </select>
                  </div>

          

                  {/* 9. COMMIT TRADE BUTTON */}
                  <div className="col-span-2 sm:col-span-1">
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-1.5 px-3 rounded-md text-xs font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer h-[33px]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">COMMIT</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Streamlined Audit Execution Journal Table */}
            <div className="glass-card rounded-xl p-4 sm:p-5 border-hairline">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-hairline mb-3 gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide">Audit Execution Journal</h4>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">Real-time mechanical trading log</p>
                </div>
                <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value as 'ALL' | 'WINS' | 'LOSSES' | 'BE')}
                    className="bg-[#0a0d15] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Outcomes</option>
                    <option value="WINS">Wins Only (TP)</option>
                    <option value="LOSSES">Losses Only (SL)</option>
                    <option value="BE">Breakeven Only</option>
                  </select>

                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 rounded-lg bg-[#0e131e] border border-hairline hover:border-emerald-500/50 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Export audit log to CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleResetAuditBlock}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/20 border border-rose-500/30 hover:bg-rose-900/30 text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Reset current 20-trade cycle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset 20-Trade Block</span>
                  </button>
                </div>
              </div>

              {/* Table (8 Columns with Date & Time) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#090c13] text-slate-400 uppercase text-[10px] tracking-wider border-b border-hairline">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">DATE &amp; TIME</th>
                      <th className="py-2.5 px-3">POSITION</th>
                      <th className="py-2.5 px-3">BRACKET</th>
                      <th className="py-2.5 px-3">OUTCOME</th>
                      <th className="py-2.5 px-3 text-right">NET P&amp;L</th>
                      <th className="py-2.5 px-3 text-right">RUNNING BALANCE</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {[...filteredTrades].reverse().map(t => {
                      const isWin = t.pnl > 0;
                      const isLoss = t.pnl < 0;
                      let resultBadge = '';
                      const resStr = String(t.result);
                      if (resStr.includes('SL')) {
                        resultBadge = 'bg-rose-950/80 border-rose-500/40 text-rose-400';
                      } else if (resStr.includes('BE') || resStr.includes('0.0R')) {
                        resultBadge = 'bg-slate-800 border-slate-700 text-slate-300';
                      } else {
                        resultBadge = 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400';
                      }

                      const outcomeText = resStr.includes('SL')
                        ? 'SL -1R'
                        : resStr.includes('BE') || resStr.includes('0.0R')
                        ? 'BE'
                        : resStr.includes('1:1')
                        ? 'TP 1:1'
                        : 'TP 1:3';

                      const timeClean = (t.executionTime || '09:30 PM').replace(' PHT', '');
                      const dateClean = t.tradeDate || '2026-11-11';
                      const numClean = `#${String(t.index).padStart(2, '0')}`;
                      const entryDisplay = (t.entryPrice && t.entryPrice !== '-') ? ` @ ${t.entryPrice}` : '';

                      return (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition-colors border-b border-hairline">
                          {/* 1. # */}
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono font-bold">
                            {numClean}
                          </td>

                          {/* 2. DATE & TIME */}
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap font-mono">
                            <span className="text-white font-medium">{dateClean}</span>
                            <span className="text-slate-500 mx-1.5">•</span>
                            <span className="text-slate-400">{timeClean}</span>
                            {t.note && (
                              <span className="inline-block text-[9px] text-amber-400/90 bg-amber-950/40 border border-amber-500/30 px-1 py-0.2 rounded ml-1.5 cursor-help" title={t.note}>
                                NOTE
                              </span>
                            )}
                          </td>

                          {/* 3. POSITION */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {t.position === 'BUY' ? (
                              <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold whitespace-nowrap text-[11px]">
                                BUY{entryDisplay}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-500/40 text-rose-400 font-bold whitespace-nowrap text-[11px]">
                                SELL{entryDisplay}
                              </span>
                            )}
                          </td>

                          {/* 4. BRACKET */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-xs">
                            <span className="text-rose-400/90 font-mono">SL: {t.stopLoss || '-'}</span>
                            <span className="text-slate-600 font-mono mx-1">|</span>
                            <span className="text-emerald-400/90 font-mono">TP: {t.takeProfit || '-'}</span>
                          </td>

                          {/* 5. OUTCOME */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded font-bold border ${resultBadge}`}>
                              {outcomeText}
                            </span>
                          </td>

                          {/* 6. NET P&L */}
                          <td className={`py-2.5 px-3 text-right font-mono num-mono whitespace-nowrap ${isWin ? 'text-emerald-400 font-bold' : isLoss ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                            {isWin ? `+₱${t.pnl.toLocaleString()}` : isLoss ? `-₱${Math.abs(t.pnl).toLocaleString()}` : '₱0'}
                          </td>

                          {/* 7. RUNNING BALANCE */}
                          <td className="py-2.5 px-3 text-right text-white font-mono num-mono font-bold whitespace-nowrap">
                            ₱{(t.balanceAfter ?? 10000).toLocaleString()}
                          </td>

                          {/* 8. ACTION */}
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                              title="Delete trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredTrades.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No audit trades committed yet.</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Execute your setup during NY Cash Open and record your first trade.
                  </p>
                </div>
              )}
            </div>

            {/* Auto-Updating Equity & Goal Trajectory Chart */}
            <div className="glass-card rounded-xl p-4 sm:p-5 border-hairline bg-[#0a0f1d]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-hairline mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide font-mono">
                    GOAL TRAJECTORY // ₱10,000 MILESTONE
                  </h4>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Target: <span className="text-amber-400 font-semibold">+₱10,000 Milestone</span>
                </div>
              </div>

              {/* 4 Live-Updating Compact Stat Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
                {/* Metric 1: Net P&L Progress Bar */}
                <div className="bg-[#070a12] border border-hairline rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>PROGRESS</span>
                    <span className="text-emerald-400 font-bold">{trajectoryProgressPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      style={{ width: `${trajectoryProgressPct}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 num-mono text-right">
                    ₱{Math.max(0, netPnL).toLocaleString()} / ₱10,000
                  </div>
                </div>

                {/* Metric 2: Peak Gain */}
                <div className="bg-[#070a12] border border-hairline rounded-lg p-2.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">PEAK GAIN</div>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 num-mono mt-0.5">
                    +₱{peakGain.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">Highest cumulative P&amp;L</div>
                </div>

                {/* Metric 3: Max Drawdown */}
                <div className="bg-[#070a12] border border-hairline rounded-lg p-2.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">MAX DRAWDOWN</div>
                  <div className={`text-base sm:text-lg font-bold font-mono num-mono mt-0.5 ${maxDrawdown < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {maxDrawdown < 0 ? `-₱${Math.abs(maxDrawdown).toLocaleString()}` : '₱0'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">Deepest dip from start</div>
                </div>

                {/* Metric 4: Distance to Target */}
                <div className="bg-[#070a12] border border-hairline rounded-lg p-2.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">DISTANCE TO TARGET</div>
                  <div className="text-base sm:text-lg font-bold font-mono text-amber-400 num-mono mt-0.5">
                    ₱{distanceToTarget.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">To +₱10,000 milestone</div>
                </div>
              </div>

              {/* Chart.js Canvas Container */}
              <div className="relative w-full h-[260px] sm:h-[300px]">
                <canvas ref={chartCanvasRef}></canvas>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-hairline bg-[#07090e]/80 py-4 px-4 sm:px-6 lg:px-8 text-xs font-mono text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>RYAN JADE MECHANICAL TRADING DESK</span>
            <span>·</span>
            <span>STUDENT TERMINAL BUILD 2.4</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Strict institutional compliance: Zero emotional interference · Hard 1:3 RR targets
          </div>
        </div>
      </footer>

      {/* WORKSHEET MODAL */}
      {worksheetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070b]/90 backdrop-blur-xl">
          <div className="glass-card max-w-2xl w-full rounded-2xl p-6 relative max-h-[90vh] flex flex-col border border-emerald-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <h3 className="text-base font-bold text-white uppercase">
                  Fillable Worksheet: Phase {activeLesson.phase} Lesson {activeLesson.num}
                </h3>
              </div>
              <button onClick={() => setWorksheetModalOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="border border-slate-700 rounded-xl p-5 bg-[#07090e] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">RYAN JADE // MECHANICAL DESK</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{activeLesson.num}: {activeLesson.title}</h3>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-400">
                    <div>INSTRUMENT: USTECH100</div>
                    <div>DATE: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-lg text-xs font-mono">
                  <div>
                    <span className="text-slate-400">STUDENT TRADER:</span>
                    <input type="text" placeholder="Enter Full Name" className="bg-transparent border-b border-slate-600 px-1 text-white w-full focus:outline-none" />
                  </div>
                  <div>
                    <span className="text-slate-400">DESK BADGE ID:</span>
                    <input type="text" placeholder="RJS-MEMBER-XXXX" className="bg-transparent border-b border-slate-600 px-1 text-white w-full focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">1. Mechanical Pre-Execution Checklist</h5>
                  <div className="space-y-1.5 text-slate-300">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-slate-700" />
                      <span>Did the 9:30 PM NY Open candle print with unambiguous displacement?</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-slate-700" />
                      <span>Has high-timeframe buy/sell-side liquidity been cleanly taken?</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-slate-700" />
                      <span>Is the Stop Loss precisely hard-set at -1R (Max ₱1,000 on ₱10k)?</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-slate-700" />
                      <span>Is Take Profit locked at exactly 1:3 RR (+₱3,000)?</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">2. Session Notes &amp; Key Level Coordinates</h5>
                  <textarea
                    rows={3}
                    placeholder="Record your entry price, swing high/low, displacement candle size, and emotional state prior to fill..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none font-mono text-xs"
                  ></textarea>
                </div>

                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-300">Secret Verification Keyword:</span>
                  <span className="text-emerald-400 font-bold">{activeLesson.secretKeyword}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-hairline flex items-center justify-end gap-3 shrink-0 mt-4">
              <button
                onClick={() => setWorksheetModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-mono text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
