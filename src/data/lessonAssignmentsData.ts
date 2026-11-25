export type AssignmentFieldType =
  | 'textarea'
  | 'text'
  | 'rating_high_low'
  | 'swing_option';

export interface AssignmentFieldConfig {
  key: string;
  label: string;
  type: AssignmentFieldType;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  gridGroup?: 'metrics4';
  options?: { value: string; title: string; subtitle?: string }[];
}

export interface AssignmentConfig {
  assignmentId: string;
  parentLessonId: string;
  partLabel?: string;
  title: string;
  prompt: string;
  phaseLabel: string;
  imageUpload?: {
    enabled: boolean;
    required: boolean;
    maxImages: 1 | 2;
    label: string;
    dropLabel: string;
    slotLabels?: string[];
  };
  requiredCheckbox?: {
    key: string;
    label: string;
  };
  fields: AssignmentFieldConfig[];
}

export interface ParsedAnswerField {
  key: string;
  label: string;
  value: string;
}

export interface ParsedAssignmentAnswer {
  isStructured: boolean;
  fields: ParsedAnswerField[];
  rawText: string;
}

export const LESSON_ASSIGNMENT_CONFIGS: AssignmentConfig[] = [
  // ============================================================================
  // PHASE 1 LESSONS
  // ============================================================================
  {
    assignmentId: 'p1_01',
    parentLessonId: 'p1_01',
    title: 'Types of Trading',
    phaseLabel: 'PHASE 1 · 01',
    prompt: 'List and explain each type of trading (Scalping, Intraday, Swing, Position).',
    fields: [
      {
        key: 'types_of_trading',
        label: 'Explanation: Scalping, Intraday, Swing & Position Trading',
        type: 'textarea',
        rows: 6,
        required: true,
        placeholder:
          'Break down Scalping, Intraday, Swing, and Position trading — include typical holding times, chart timeframes, and why our desk focuses on USTECH100 intraday execution...'
      }
    ]
  },
  {
    assignmentId: 'p1_02',
    parentLessonId: 'p1_02',
    partLabel: 'Part 1: Objective & Identity',
    title: 'Objective & Trader Identity',
    phaseLabel: 'PHASE 1 · 02A',
    prompt: 'Define your trading objective and trader identity, and explain what intraday trading is.',
    fields: [
      {
        key: 'objective_identity',
        label: '1. Objective & Trader Identity',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Define your clear trading objective, risk discipline, and identity as a rule-based trader...'
      },
      {
        key: 'what_is_intraday',
        label: '2. What is Intraday?',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain what intraday trading is, session windows, and how entries/exits are managed within the same trading day...'
      }
    ]
  },
  {
    assignmentId: 'p1_02_chart',
    parentLessonId: 'p1_02',
    partLabel: 'Part 2: Chart an Intraday Trade',
    title: 'Chart an Intraday Trade',
    phaseLabel: 'PHASE 1 · 02B',
    prompt: 'Upload a clean USTECH100 chart marking an intraday trade setup and explain why it qualifies.',
    imageUpload: {
      enabled: true,
      required: true,
      maxImages: 1,
      label: 'USTECH100 Chart Screenshot Upload',
      dropLabel: 'Drop or Click to Upload USTECH100 Intraday Chart'
    },
    fields: [
      {
        key: 'intraday_explanation',
        label: 'Explanation: Why This Intraday Setup Qualifies',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain the marked intraday setup on USTECH100 (session window, structure, SL/TP placement, and why it qualifies)...'
      }
    ]
  },
  {
    assignmentId: 'p1_03',
    parentLessonId: 'p1_03',
    title: 'RJS Core System',
    phaseLabel: 'PHASE 1 · 03',
    prompt: 'Upload your chart showing a valid 15m candle body trendline breakout + pullback (confirming no bounce trades), and explain your trade setup.',
    imageUpload: {
      enabled: true,
      required: true,
      maxImages: 1,
      label: 'Send Chart Here',
      dropLabel: 'Send Chart Here — 15m Candle Body Breakout + Pullback Screenshot'
    },
    requiredCheckbox: {
      key: 'confirm_breakout_only',
      label: 'I confirm this entry is a 15m candle body breakout + pullback, NOT a trendline bounce.'
    },
    fields: [
      {
        key: 'rjs_explanation',
        label: 'Submit Explanation Here',
        type: 'textarea',
        rows: 5,
        required: true,
        placeholder: 'Explain the trendline draw, the full 15m candle body close outside the trendline, the pullback candle, RSI, and your SL/TP...'
      }
    ]
  },
  {
    assignmentId: 'p1_04',
    parentLessonId: 'p1_04',
    title: 'Forex Factory Update',
    phaseLabel: 'PHASE 1 · 04',
    prompt: 'Create your trading schedule for the week and explain every news/folder event that may affect each trading day.',
    imageUpload: {
      enabled: true,
      required: false,
      maxImages: 1,
      label: 'Optional: Forex Factory Screenshot',
      dropLabel: 'Optional: Upload Your Weekly Forex Factory Calendar Screenshot'
    },
    fields: [
      {
        key: 'weekly_schedule',
        label: 'Weekly Schedule & News Breakdown (Monday – Friday)',
        type: 'textarea',
        rows: 6,
        required: true,
        placeholder: 'Monday: ...\nTuesday: ...\nWednesday: ...\nThursday: ...\nFriday: ...\nInclude USD red/orange folders, bank holidays, and whether each day is Tradable (1R), Risky (0.5R), or Stand Down...'
      }
    ]
  },
  {
    assignmentId: 'p1_05',
    parentLessonId: 'p1_05',
    partLabel: 'Part 1: Master Class (News)',
    title: 'Master Class',
    phaseLabel: 'PHASE 1 · 05A',
    prompt: 'Explain Forex Factory / market conditions BEFORE, DURING, and AFTER high-impact news.',
    fields: [
      {
        key: 'before_news',
        label: 'Before News',
        type: 'textarea',
        rows: 3,
        required: true,
        placeholder: 'Describe liquidity, spread behavior, and our desk rules BEFORE high-impact USD news drops...'
      },
      {
        key: 'during_news',
        label: 'During News',
        type: 'textarea',
        rows: 3,
        required: true,
        placeholder: 'Describe volatility spikes, whipsaws, spread widening, and why we stand down DURING the release...'
      },
      {
        key: 'after_news',
        label: 'After News',
        type: 'textarea',
        rows: 3,
        required: true,
        placeholder: 'Describe the 30-minute post-news cooldown, structure stabilization, and when valid setups resume AFTER news...'
      }
    ]
  },
  {
    assignmentId: 'p1_05_fib',
    parentLessonId: 'p1_05',
    partLabel: 'Part 2: Power of Fibonacci',
    title: 'Power of Fibonacci',
    phaseLabel: 'PHASE 1 · 05B',
    prompt: 'Upload your chart showing the Power of Fibonacci aligned with our structure and explain your levels.',
    imageUpload: {
      enabled: true,
      required: true,
      maxImages: 1,
      label: 'Chart Screenshot Upload',
      dropLabel: 'Drop or Upload Chart Showing Fibonacci Alignment'
    },
    fields: [
      {
        key: 'fib_explanation',
        label: 'Fibonacci Structure & Levels Explanation',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain your anchor high/low, key Fibonacci retracement levels, confluence with the 15m breakout/pullback, and SL protection...'
      }
    ]
  },
  {
    assignmentId: 'p1_06',
    parentLessonId: 'p1_06',
    partLabel: 'Part 1: Psychology of TP',
    title: 'Psychology of TP',
    phaseLabel: 'PHASE 1 · 06A',
    prompt: 'Explain: (1) What is TP 1st part? (2) What is TP 2nd part?',
    fields: [
      {
        key: 'tp_first_part',
        label: '1. What is TP 1st Part?',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain the first part of Take Profit psychology, securing partial/breakeven rules, and letting trades breathe...'
      },
      {
        key: 'tp_second_part',
        label: '2. What is TP 2nd Part?',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain the second part of Take Profit psychology, holding to full target without greed or post-win overtrading...'
      }
    ]
  },
  {
    assignmentId: 'p1_06_vision',
    parentLessonId: 'p1_06',
    partLabel: 'Part 2: Personal TP Vision',
    title: 'Personal TP Vision',
    phaseLabel: 'PHASE 1 · 06B',
    prompt: 'What does Take Profit (TP) look like for you?',
    fields: [
      {
        key: 'tp_vision',
        label: 'Your Personal Take Profit (TP) Vision',
        type: 'textarea',
        rows: 5,
        required: true,
        placeholder: 'Reflect on what achieving consistent Take Profit means for your trading journey, lifestyle, discipline, and long-term goals...'
      }
    ]
  },

  // ============================================================================
  // PHASE 2 LESSONS
  // ============================================================================
  {
    assignmentId: 'p2_01',
    parentLessonId: 'p2_01',
    title: 'Phase 2 Kickoff & Readiness',
    phaseLabel: 'PHASE 2 · 01',
    prompt: 'Summarize your key Phase 1 mechanical takeaways and define your execution focus as you enter Phase 2.',
    fields: [
      {
        key: 'phase2_readiness',
        label: 'Phase 2 Readiness & Execution Focus',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Summarize your Phase 1 consistency habits and what you are locking in for Phase 2...'
      }
    ]
  },
  {
    assignmentId: 'p2_02',
    parentLessonId: 'p2_02',
    title: 'Protecting Your Trading Journey',
    phaseLabel: 'PHASE 2 · 02',
    prompt: 'Rate your Phase 1 and Phase 2 discipline/mindset (High or Low) and explain why.',
    fields: [
      {
        key: 'phase1_rating',
        label: 'Phase 1 Discipline / Mindset Rating',
        type: 'rating_high_low',
        required: true,
        options: [
          { value: 'HIGH', title: 'HIGH' },
          { value: 'LOW', title: 'LOW' }
        ]
      },
      {
        key: 'phase1_why',
        label: 'Phase 1 Why',
        type: 'textarea',
        rows: 3,
        required: true,
        placeholder: 'Explain why you rated your Phase 1 discipline/mindset High or Low...'
      },
      {
        key: 'phase2_rating',
        label: 'Phase 2 Discipline / Mindset Rating',
        type: 'rating_high_low',
        required: true,
        options: [
          { value: 'HIGH', title: 'HIGH' },
          { value: 'LOW', title: 'LOW' }
        ]
      },
      {
        key: 'phase2_why',
        label: 'Phase 2 Why',
        type: 'textarea',
        rows: 3,
        required: true,
        placeholder: 'Explain why you rated your Phase 2 discipline/mindset High or Low...'
      }
    ]
  },
  {
    assignmentId: 'p2_03',
    parentLessonId: 'p2_03',
    title: 'Swing',
    phaseLabel: 'PHASE 2 · 03',
    prompt: 'On your USTECH100 chart, encircle a SCALP trade, an INTRADAY trade, and a SWING trade using different color-coded circles, and explain the difference in structure and hold time.',
    imageUpload: {
      enabled: true,
      required: true,
      maxImages: 1,
      label: 'Color-Coded USTECH100 Chart Upload',
      dropLabel: 'Drop or Upload USTECH100 Chart with Scalp / Intraday / Swing Circles'
    },
    fields: [
      {
        key: 'color_coded_breakdown',
        label: 'Color-Coded Breakdown (Structure & Hold Time)',
        type: 'textarea',
        rows: 5,
        required: true,
        placeholder: 'Specify which circle color represents SCALP, INTRADAY, and SWING on your chart, and explain the difference in market structure and hold time...'
      }
    ]
  },
  {
    assignmentId: 'p2_04',
    parentLessonId: 'p2_04',
    title: 'RJS + Support and Resistance',
    phaseLabel: 'PHASE 2 · 04',
    prompt: 'Show your chart combining the RJS Core System with Support & Resistance levels and explain your setup.',
    imageUpload: {
      enabled: true,
      required: true,
      maxImages: 1,
      label: 'Chart Screenshot Upload',
      dropLabel: 'Drop or Upload RJS + Support & Resistance Chart'
    },
    fields: [
      {
        key: 'rjs_sr_explanation',
        label: 'Setup Explanation (RJS + Support & Resistance)',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain how your Support & Resistance zones align with the 15m candle body trendline breakout and pullback...'
      }
    ]
  },
  {
    assignmentId: 'p2_05',
    parentLessonId: 'p2_05',
    title: 'Aiming a 1:4, 1:5',
    phaseLabel: 'PHASE 2 · 05',
    prompt: 'Find an intraday trade at 9:30 PM (NY Open) and evaluate if it can become a swing trade.',
    imageUpload: {
      enabled: true,
      required: true,
      maxImages: 1,
      label: 'Chart Screenshot Upload',
      dropLabel: 'Drop Screenshot Here'
    },
    fields: [
      {
        key: 'reason_to_take_trade',
        label: 'Reason why you want to take this trade',
        type: 'textarea',
        rows: 3,
        required: true,
        placeholder: 'Explain the 9:30 PM NY Open setup confluence and why you want to enter this trade...'
      },
      {
        key: 'starting_balance',
        label: 'Starting Balance',
        type: 'text',
        required: true,
        gridGroup: 'metrics4',
        placeholder: 'e.g. ₱10,000'
      },
      {
        key: 'lot_size_used',
        label: 'Lot Size Used',
        type: 'text',
        required: true,
        gridGroup: 'metrics4',
        placeholder: 'e.g. 0.10'
      },
      {
        key: 'tp_target',
        label: 'TP',
        type: 'text',
        required: true,
        gridGroup: 'metrics4',
        placeholder: 'e.g. 1:4 (+₱4,000)'
      },
      {
        key: 'sl_level',
        label: 'SL',
        type: 'text',
        required: true,
        gridGroup: 'metrics4',
        placeholder: 'e.g. -1R (-₱1,000)'
      },
      {
        key: 'swing_option',
        label: 'Scaling / Swing Conversion Option',
        type: 'swing_option',
        required: true,
        options: [
          {
            value: 'Option 1: Same SL, Higher TP',
            title: 'Option 1: Same SL, Higher TP',
            subtitle: 'Keep the intraday SL distance and extend TP to 1:4 / 1:5.'
          },
          {
            value: 'Option 2: Tight SL, Different Lot Size & Same TP',
            title: 'Option 2: Tight SL, Different Lot Size & Same TP',
            subtitle: 'Tighten structural SL, adjust lot size for fixed risk, and keep target.'
          }
        ]
      },
      {
        key: 'explain_why',
        label: 'Explain Why',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain why you chose Option 1 or Option 2 and whether this 9:30 PM setup can hold into a swing trade...'
      }
    ]
  },
  {
    assignmentId: 'p2_06',
    parentLessonId: 'p2_06',
    title: 'POI For A Swing',
    phaseLabel: 'PHASE 2 · 06',
    prompt: 'Show a Higher Time Frame (HTF) and Lower Time Frame (LTF) Support & Resistance chart and explain the Support & Resistance zones you identified.',
    imageUpload: {
      enabled: true,
      required: true,
      maxImages: 2,
      label: 'HTF & LTF Chart Screenshots (Up to 2 Images)',
      dropLabel: 'Upload HTF & LTF Chart Screenshots (Max 2 Images)',
      slotLabels: ['Chart 1 · HTF Support & Resistance', 'Chart 2 · LTF Entry / Confirmation']
    },
    fields: [
      {
        key: 'sr_identified',
        label: 'Explain the Support & Resistance identified',
        type: 'textarea',
        rows: 5,
        required: true,
        placeholder: 'Break down the Higher Time Frame (HTF) POI zone and how the Lower Time Frame (LTF) Support & Resistance confirms your swing entry...'
      }
    ]
  },

  // ============================================================================
  // PRO ARCHIVES (OPTIONAL TAPE STUDY)
  // ============================================================================
  {
    assignmentId: 'pa_01',
    parentLessonId: 'pa_01',
    title: 'Pro Archives · Tradable vs Not Tradable Tape Study',
    phaseLabel: 'PRO ARCHIVES · 01',
    prompt: 'Submit a USTECH100 chart screenshot comparing a tradable session vs. choppy/untradable session and explain your filter.',
    imageUpload: {
      enabled: true,
      required: false,
      maxImages: 1,
      label: 'Optional Chart Screenshot',
      dropLabel: 'Upload Optional USTECH100 Tape Study Screenshot'
    },
    fields: [
      {
        key: 'tape_notes',
        label: 'Tape Study Breakdown',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Summarize the key structural differences between tradable and non-tradable tape conditions...'
      }
    ]
  },
  {
    assignmentId: 'pa_02',
    parentLessonId: 'pa_02',
    title: 'Pro Archives · Live Trade Review Breakdown',
    phaseLabel: 'PRO ARCHIVES · 02',
    prompt: 'Document your trade review findings and highlight one execution rule you will enforce next session.',
    imageUpload: {
      enabled: true,
      required: false,
      maxImages: 1,
      label: 'Optional Chart Screenshot',
      dropLabel: 'Upload Optional Trade Review Screenshot'
    },
    fields: [
      {
        key: 'review_notes',
        label: 'Trade Review Notes',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Record your trade review observations and mechanical adjustments...'
      }
    ]
  },
  {
    assignmentId: 'pa_03',
    parentLessonId: 'pa_03',
    title: 'Pro Archives · Unstable Market Defense Notes',
    phaseLabel: 'PRO ARCHIVES · 03',
    prompt: 'Identify the warning signs of unstable/unpredictable market delivery and how you protect capital during chop.',
    imageUpload: {
      enabled: true,
      required: false,
      maxImages: 1,
      label: 'Optional Chart Screenshot',
      dropLabel: 'Upload Optional Unstable Market Example'
    },
    fields: [
      {
        key: 'unstable_notes',
        label: 'Market Defense Breakdown',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Explain the price action cues that tell you to stand down...'
      }
    ]
  }
];

export const getAssignmentsForLesson = (lessonId: string): AssignmentConfig[] => {
  const norm = lessonId.toLowerCase().replace(/[-_]/g, '');
  return LESSON_ASSIGNMENT_CONFIGS.filter(
    (cfg) => cfg.parentLessonId.toLowerCase().replace(/[-_]/g, '') === norm
  );
};

export const getAssignmentMetaById = (assignmentId: string): AssignmentConfig | undefined => {
  return LESSON_ASSIGNMENT_CONFIGS.find((cfg) => cfg.assignmentId === assignmentId);
};

export const serializeAssignmentAnswer = (
  config: AssignmentConfig,
  values: Record<string, string>,
  checkboxChecked: boolean
): string => {
  const fields: ParsedAnswerField[] = config.fields.map((f) => ({
    key: f.key,
    label: f.label,
    value: (values[f.key] || '').trim()
  }));

  if (config.requiredCheckbox) {
    fields.push({
      key: config.requiredCheckbox.key,
      label: 'Confirmation Attestation',
      value: checkboxChecked ? `CONFIRMED: ${config.requiredCheckbox.label}` : 'NOT CONFIRMED'
    });
  }

  return JSON.stringify({
    __format: 'rjs_assignment_v1',
    assignmentId: config.assignmentId,
    title: config.title,
    fields
  });
};

export const parseAssignmentAnswer = (rawText?: string | null): ParsedAssignmentAnswer => {
  const text = String(rawText || '').trim();
  if (!text) {
    return { isStructured: false, fields: [], rawText: '' };
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.__format === 'rjs_assignment_v1' && Array.isArray(parsed.fields)) {
      return {
        isStructured: true,
        fields: parsed.fields.map((f: any) => ({
          key: String(f.key || ''),
          label: String(f.label || f.key || 'Response'),
          value: String(f.value || '')
        })),
        rawText: text
      };
    }
  } catch {
    // Plain text fallback
  }
  return {
    isStructured: false,
    fields: [{ key: 'response', label: 'Submitted Answer', value: text }],
    rawText: text
  };
};

export const isSafeImageUrl = (url: string): boolean => {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

export const parseScreenshotUrls = (raw?: string | null): string[] => {
  const s = String(raw || '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x || '').trim()).filter(isSafeImageUrl);
      }
    } catch {
      // Fallback
    }
  }
  return s
    .split(',')
    .map((part) => part.trim())
    .filter(isSafeImageUrl);
};

export const serializeScreenshotUrls = (urls: string[]): string | null => {
  const clean = urls.map((u) => u.trim()).filter(isSafeImageUrl);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
};
