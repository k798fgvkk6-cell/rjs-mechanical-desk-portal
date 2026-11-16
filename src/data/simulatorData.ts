export type SimulatorDifficulty = 'easy' | 'medium' | 'hard';
export type SimulatorRoundMode = 'PRE_ENTRY' | 'MANAGE_TRADE';
export type PreEntryAction = 'BUY' | 'SELL' | 'HALF_SIZE' | 'PASS';
export type ManageTradeAction = 'MOVE_BE' | 'HOLD_SL' | 'ADD_LOTS';
export type SimulatorAction = PreEntryAction | ManageTradeAction;
export type SimulatorChartPattern = 'wedge' | 'single_resistance' | 'single_support';

export interface SimCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SimTrendline {
  x1Index: number;
  y1: number;
  x2Index: number;
  y2: number;
  label: string;
  role?: 'buy_breakout' | 'sell_breakout' | 'neutral';
}

export interface SimSessionLevel {
  price: number;
  label: string;
  type: 'high' | 'low';
}

export interface SimFibZone {
  price: number;
  label: string;
}

export interface SimActivePosition {
  direction: 'BUY' | 'SELL';
  entry: number;
  initialSl: number;
  tp: number;
  floatingR: number;
}

export interface SimScenario {
  id: number;
  difficulty: SimulatorDifficulty;
  roundInTier: number;
  mode: SimulatorRoundMode;
  chartPattern: SimulatorChartPattern;
  title: string;
  sessionBanner: string;
  bannerTone: 'clear' | 'warning' | 'danger';
  rsiValue: number;
  rsiStatus: 'NEUTRAL' | 'OVERBOUGHT' | 'OVERSOLD';
  setupSummary: string;
  correctAction: SimulatorAction;
  halfDirection?: 'BUY' | 'SELL';
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  sessionLevel: SimSessionLevel;
  trendline: SimTrendline;
  secondaryTrendline?: SimTrendline;
  fibZone?: SimFibZone;
  buyLevel?: { entry: number; sl: number; tp: number };
  sellLevel?: { entry: number; sl: number; tp: number };
  activePosition?: SimActivePosition;
  feedback: {
    correctTitle: string;
    correctDetail: string;
    wrongTitle: string;
    wrongDetail: string;
  };
}

export interface TierHighScoreRecord {
  highScore: number;
  bestStreak: number;
  bestCorrect: number;
  totalRounds: number;
}

export type SimulatorTierStats = Record<SimulatorDifficulty, TierHighScoreRecord>;

export const DEFAULT_TIER_STATS: SimulatorTierStats = {
  easy: { highScore: 0, bestStreak: 0, bestCorrect: 0, totalRounds: 15 },
  medium: { highScore: 0, bestStreak: 0, bestCorrect: 0, totalRounds: 15 },
  hard: { highScore: 0, bestStreak: 0, bestCorrect: 0, totalRounds: 20 }
};

/* ---------------------------------------------------------------------------
   DETERMINISTIC PRICE-ACTION CANDLE GENERATORS (USTECH100 15m)
   Breakout-Only Rules:
   - Type A: 2-Trendline Converging Wedge (Upper BUY Breakout + Lower SELL Breakout)
   - Type B: 1-Trendline Setup (Breakout only; bounces off trendline = PASS)
--------------------------------------------------------------------------- */
function makeTimes(startHour: number, startMin: number, count: number): string[] {
  const out: string[] = [];
  let mins = startHour * 60 + startMin;
  for (let i = 0; i < count; i++) {
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    mins += 15;
  }
  return out;
}

type WedgeVariant =
  | 'buy_win'
  | 'buy_news_whipsaw'
  | 'buy_tight_half'
  | 'sell_win'
  | 'sell_news_whipsaw'
  | 'sell_tight_half'
  | 'inside_bounce_lower_pass'
  | 'inside_bounce_upper_pass'
  | 'fake_wick_upper_pass'
  | 'fake_wick_lower_pass';

// TYPE A: Two Converging Trendlines (Upper Descending = BUY Breakout, Lower Ascending = SELL Breakout)
// Upper line: x=1 -> +128, x=11 -> +78 (slope -5/candle; x=12 -> +73, x=13 -> +68)
// Lower line: x=0 -> +12,  x=11 -> +56 (slope +4/candle; x=12 -> +60, x=13 -> +64)
function buildWedgeScenario(
  base: number,
  startH: number,
  startM: number,
  variant: WedgeVariant
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  secondaryTrendline: SimTrendline;
  sessionLevel: SimSessionLevel;
  fibZone?: SimFibZone;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  const wedgeBaseOffsets: [number, number, number, number][] = [
    [34, 54, 12, 46],   // i=0 touches lower (+12)
    [46, 128, 42, 114], // i=1 touches upper (+128)
    [114, 118, 20, 32], // i=2 touches lower (+20)
    [32, 118, 28, 104], // i=3 touches upper (+118)
    [104, 108, 28, 42], // i=4 touches lower (+28)
    [42, 108, 38, 94],  // i=5 touches upper (+108)
    [94, 98, 36, 48],   // i=6 touches lower (+36)
    [48, 98, 44, 86],   // i=7 touches upper (+98)
    [86, 88, 44, 56],   // i=8 touches lower (+44)
    [56, 88, 52, 78],   // i=9 touches upper (+88)
    [78, 80, 52, 64]    // i=10 touches lower (+52)
  ];

  let tailSetup: [number, number, number, number][] = [];
  let futureOffsets: [number, number, number, number][] = [];
  let sessionLevel: SimSessionLevel = {
    price: base + 215,
    label: `SESSION HIGH · ${(base + 215).toLocaleString()}`,
    type: 'high'
  };
  let fibZone: SimFibZone | undefined;
  let buyLevel = { entry: base + 94, sl: base + 56, tp: base + 208 };
  let sellLevel = { entry: base + 94, sl: base + 132, tp: base - 20 };

  if (variant === 'buy_win' || variant === 'buy_news_whipsaw') {
    tailSetup = [
      [64, 114, 60, 108], // Full 15m body close above upper line (+78)
      [108, 110, 72, 82], // Clean pullback touching broken upper line (+73)
      [82, 98, 78, 94]
    ];
    fibZone = { price: base + 80, label: '50.0% FIB ZONE' };
    futureOffsets =
      variant === 'buy_news_whipsaw'
        ? [
            [94, 142, 34, 42],
            [42, 68, 14, 26],
            [26, 84, 18, 70],
            [70, 88, 34, 46],
            [46, 74, 28, 60],
            [60, 78, 38, 48],
            [48, 66, 32, 54]
          ]
        : [
            [94, 120, 90, 116],
            [116, 142, 110, 136],
            [136, 150, 126, 134],
            [134, 166, 130, 160],
            [160, 190, 154, 184],
            [184, 208, 178, 200],
            [200, 220, 192, 212]
          ];
  } else if (variant === 'buy_tight_half') {
    tailSetup = [
      [64, 112, 60, 106],
      [106, 108, 93, 97], // Tight, hesitant pullback candle
      [97, 103, 94, 100]
    ];
    fibZone = { price: base + 84, label: '38.2% FIB ZONE' };
    buyLevel = { entry: base + 100, sl: base + 70, tp: base + 190 };
    sellLevel = { entry: base + 100, sl: base + 130, tp: base + 10 };
    futureOffsets = [
      [100, 124, 96, 118],
      [118, 140, 112, 134],
      [134, 152, 126, 146],
      [146, 172, 140, 166],
      [166, 192, 160, 186],
      [186, 202, 178, 194],
      [194, 210, 184, 202]
    ];
  } else if (variant === 'sell_win' || variant === 'sell_news_whipsaw') {
    tailSetup = [
      [64, 68, 22, 28], // Full bearish 15m body close below lower line (+56)
      [28, 61, 26, 50], // Clean retest touching broken lower line (+60)
      [50, 54, 34, 38]
    ];
    sessionLevel = {
      price: base - 85,
      label: `SESSION LOW · ${(base - 85).toLocaleString()}`,
      type: 'low'
    };
    fibZone = { price: base + 48, label: '61.8% FIB ZONE' };
    buyLevel = { entry: base + 38, sl: base + 2, tp: base + 146 };
    sellLevel = { entry: base + 38, sl: base + 76, tp: base - 76 };
    futureOffsets =
      variant === 'sell_news_whipsaw'
        ? [
            [38, 96, -8, 86],
            [86, 114, 58, 102],
            [102, 110, 44, 54],
            [54, 88, 46, 78],
            [78, 94, 60, 70],
            [70, 92, 56, 82],
            [82, 98, 66, 76]
          ]
        : [
            [38, 44, 14, 18],
            [18, 24, -10, -4],
            [-4, 8, -28, -22],
            [-22, -14, -48, -44],
            [-44, -34, -70, -64],
            [-64, -54, -84, -76],
            [-76, -68, -94, -82]
          ];
  } else if (variant === 'sell_tight_half') {
    tailSetup = [
      [64, 68, 24, 30],
      [30, 42, 28, 38], // Tight compressed pullback
      [38, 41, 31, 34]
    ];
    sessionLevel = {
      price: base - 65,
      label: `SESSION LOW · ${(base - 65).toLocaleString()}`,
      type: 'low'
    };
    fibZone = { price: base + 42, label: '38.2% FIB ZONE' };
    buyLevel = { entry: base + 34, sl: base + 6, tp: base + 118 };
    sellLevel = { entry: base + 34, sl: base + 62, tp: base - 50 };
    futureOffsets = [
      [34, 40, 12, 16],
      [16, 22, -8, -4],
      [-4, 6, -26, -20],
      [-20, -12, -44, -40],
      [-40, -30, -60, -54],
      [-54, -46, -68, -60],
      [-60, -52, -74, -66]
    ];
  } else if (variant === 'inside_bounce_lower_pass') {
    // Price touches lower ascending SELL line and bounces UPWARD while staying INSIDE the wedge -> NO BREAKOUT
    tailSetup = [
      [64, 72, 54, 68], // Wick touches lower (+56), closes inside wedge
      [68, 74, 58, 70], // Still inside [60, 73]
      [70, 72, 62, 66]  // Trapped inside wedge apex [64, 68]
    ];
    buyLevel = { entry: base + 66, sl: base + 38, tp: base + 150 };
    sellLevel = { entry: base + 66, sl: base + 94, tp: base - 18 };
    futureOffsets = [
      [66, 74, 32, 38],
      [38, 86, 30, 80],
      [80, 92, 42, 48],
      [48, 78, 40, 68],
      [68, 76, 36, 44],
      [44, 68, 34, 58],
      [58, 66, 42, 52]
    ];
  } else if (variant === 'inside_bounce_upper_pass') {
    // Price touches upper descending BUY line and rejects DOWNWARD inside the wedge -> NO BREAKOUT
    tailSetup = [
      [64, 79, 58, 62], // Rejects upper (+78), stays inside wedge
      [62, 74, 59, 64], // Stays inside [60, 73]
      [64, 70, 61, 65]  // Still inside [64, 68]
    ];
    sessionLevel = {
      price: base - 35,
      label: `SESSION LOW · ${(base - 35).toLocaleString()}`,
      type: 'low'
    };
    buyLevel = { entry: base + 65, sl: base + 37, tp: base + 149 };
    sellLevel = { entry: base + 65, sl: base + 93, tp: base - 19 };
    futureOffsets = [
      [65, 98, 62, 92],
      [92, 96, 50, 56],
      [56, 88, 52, 82],
      [82, 86, 44, 50],
      [50, 76, 42, 68],
      [68, 74, 48, 56],
      [56, 70, 44, 62]
    ];
  } else if (variant === 'fake_wick_upper_pass') {
    // Upper wick pokes above upper line (+78/+73), 15m body closes BACK INSIDE wedge!
    tailSetup = [
      [64, 108, 60, 72], // Wick 108 > 78, body closes 72 < 78 (inside!)
      [72, 96, 62, 67],  // Wick 96 > 73, body closes 67 < 73 (inside!)
      [67, 74, 52, 56]
    ];
    buyLevel = { entry: base + 56, sl: base + 24, tp: base + 152 };
    sellLevel = { entry: base + 56, sl: base + 108, tp: base - 100 };
    futureOffsets = [
      [56, 64, 24, 28],
      [28, 38, 6, 12],
      [12, 24, -8, 0],
      [0, 14, -18, -10],
      [-10, 8, -22, -4],
      [-4, 12, -16, -10],
      [-10, 4, -24, -16]
    ];
  } else {
    // fake_wick_lower_pass: Lower wick pokes below lower line (+56/+60), body closes BACK INSIDE wedge!
    tailSetup = [
      [64, 70, 26, 60], // Wick 26 < 56, body closes 60 > 56 (inside!)
      [60, 68, 34, 64], // Wick 34 < 60, body closes 64 > 60 (inside!)
      [64, 82, 58, 76]
    ];
    sessionLevel = {
      price: base - 35,
      label: `SESSION LOW · ${(base - 35).toLocaleString()}`,
      type: 'low'
    };
    buyLevel = { entry: base + 76, sl: base + 34, tp: base + 202 };
    sellLevel = { entry: base + 76, sl: base + 110, tp: base - 26 };
    futureOffsets = [
      [76, 104, 72, 98],
      [98, 124, 92, 118],
      [118, 138, 110, 130],
      [130, 152, 124, 144],
      [144, 162, 136, 154],
      [154, 172, 146, 164],
      [164, 180, 156, 172]
    ];
  }

  return {
    chartPattern: 'wedge',
    setupCandles: [...wedgeBaseOffsets, ...tailSetup].map(toCandle),
    futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
    trendline: {
      x1Index: 1,
      y1: base + 128,
      x2Index: 11,
      y2: base + 78,
      label: 'UPPER BUY BREAKOUT LINE',
      role: 'buy_breakout'
    },
    secondaryTrendline: {
      x1Index: 0,
      y1: base + 12,
      x2Index: 11,
      y2: base + 56,
      label: 'LOWER SELL BREAKOUT LINE',
      role: 'sell_breakout'
    },
    sessionLevel,
    fibZone,
    buyLevel,
    sellLevel
  };
}

// TYPE B (1 TRENDLINE): Single Descending Resistance Breakout + Pullback
function buildSingleDescBreakout(
  base: number,
  startH: number,
  startM: number,
  outcome: 'win' | 'news_whipsaw' | 'tight_half'
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  sessionLevel: SimSessionLevel;
  fibZone: SimFibZone;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const setupOffsets: [number, number, number, number][] = [
    [90, 115, 75, 104],
    [104, 114, 80, 86],
    [86, 98, 65, 72],
    [72, 96, 64, 88],
    [88, 96, 54, 60],
    [60, 74, 40, 48],
    [48, 76, 42, 68],
    [68, 75, 38, 42],
    [42, 55, 18, 26],
    [26, 45, 15, 38],
    [38, 52, 28, 44],
    [44, 88, 40, 82],
    outcome === 'tight_half' ? [82, 86, 68, 72] : [82, 86, 54, 64],
    outcome === 'tight_half' ? [72, 80, 69, 77] : [64, 78, 58, 74]
  ];

  const futureOffsets: [number, number, number, number][] =
    outcome === 'news_whipsaw'
      ? [
          [74, 128, 12, 20],
          [20, 42, -5, 10],
          [10, 68, 2, 55],
          [55, 72, 18, 28],
          [28, 58, 14, 45],
          [45, 62, 24, 34],
          [34, 52, 20, 40]
        ]
      : [
          [74, 98, 70, 94],
          [94, 118, 88, 112],
          [112, 125, 102, 108],
          [108, 142, 105, 136],
          [136, 165, 130, 158],
          [158, 182, 150, 174],
          [174, 192, 166, 182]
        ];

  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  const entryOffset = outcome === 'tight_half' ? 77 : 74;
  return {
    chartPattern: 'single_resistance',
    setupCandles: setupOffsets.map((o, i) => toCandle(o, i)),
    futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
    trendline: {
      x1Index: 1,
      y1: base + 110,
      x2Index: 12,
      y2: base + 44,
      label: 'BUY BREAKOUT LINE (DESCENDING)',
      role: 'buy_breakout'
    },
    sessionLevel: {
      price: base + 185,
      label: `SESSION HIGH · ${(base + 185).toLocaleString()}`,
      type: 'high'
    },
    fibZone: {
      price: base + 62,
      label: '50.0% FIB ZONE'
    },
    buyLevel: { entry: base + entryOffset, sl: base + 38, tp: base + entryOffset + 108 },
    sellLevel: { entry: base + entryOffset, sl: base + 110, tp: base + entryOffset - 108 }
  };
}

// TYPE B (1 TRENDLINE): Single Ascending Support Breakdown + Retest
function buildSingleAscBreakdown(
  base: number,
  startH: number,
  startM: number,
  outcome: 'win' | 'news_whipsaw' | 'tight_half'
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  sessionLevel: SimSessionLevel;
  fibZone: SimFibZone;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const setupOffsets: [number, number, number, number][] = [
    [20, 38, 0, 30],
    [30, 45, 6, 14],
    [14, 48, 10, 42],
    [42, 62, 22, 56],
    [56, 66, 28, 36],
    [36, 72, 32, 65],
    [65, 85, 44, 78],
    [78, 88, 52, 60],
    [60, 95, 56, 88],
    [88, 102, 68, 76],
    [76, 92, 70, 82],
    [82, 86, 30, 36],
    outcome === 'tight_half' ? [36, 50, 32, 46] : [36, 68, 32, 58],
    outcome === 'tight_half' ? [46, 49, 38, 41] : [58, 64, 38, 44]
  ];

  const futureOffsets: [number, number, number, number][] =
    outcome === 'news_whipsaw'
      ? [
          [44, 104, -10, 94],
          [94, 118, 62, 106],
          [106, 115, 48, 58],
          [58, 92, 50, 82],
          [82, 98, 64, 74],
          [74, 96, 60, 86],
          [86, 102, 70, 80]
        ]
      : [
          [44, 50, 18, 22],
          [22, 28, -4, 0],
          [0, 12, -22, -16],
          [-16, -8, -42, -38],
          [-38, -28, -64, -58],
          [-58, -48, -78, -70],
          [-70, -62, -88, -76]
        ];

  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  const entryOffset = outcome === 'tight_half' ? 41 : 44;
  return {
    chartPattern: 'single_support',
    setupCandles: setupOffsets.map((o, i) => toCandle(o, i)),
    futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
    trendline: {
      x1Index: 1,
      y1: base + 5,
      x2Index: 12,
      y2: base + 82,
      label: 'SELL BREAKOUT LINE (ASCENDING)',
      role: 'sell_breakout'
    },
    sessionLevel: {
      price: base - 80,
      label: `SESSION LOW · ${(base - 80).toLocaleString()}`,
      type: 'low'
    },
    fibZone: {
      price: base + 60,
      label: '61.8% FIB ZONE'
    },
    buyLevel: { entry: base + entryOffset, sl: base + 8, tp: base + entryOffset + 108 },
    sellLevel: { entry: base + entryOffset, sl: base + 80, tp: base + entryOffset - 108 }
  };
}

// TYPE B (1 TRENDLINE): NO BOUNCE TRADES RULE -> PASS / NO TRADE
// - 'support_bounce_pass': Single ascending support line; price touches & bounces upward without breaking below -> PASS
// - 'resistance_bounce_pass': Single descending resistance line; price touches & rejects downward without breaking above -> PASS
function buildSingleTrendlineBounceTrap(
  base: number,
  startH: number,
  startM: number,
  kind: 'support_bounce_pass' | 'resistance_bounce_pass'
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  sessionLevel: SimSessionLevel;
  fibZone: SimFibZone;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  if (kind === 'support_bounce_pass') {
    const setupOffsets: [number, number, number, number][] = [
      [-10, 16, -15, 10],
      [10, 32, 6, 26],
      [26, 44, 18, 36],
      [36, 46, 22, 30],
      [30, 62, 26, 56],
      [56, 74, 42, 64],
      [64, 86, 52, 78],
      [78, 92, 60, 72],
      [72, 106, 66, 98],
      [98, 126, 92, 120],
      [120, 134, 102, 114],
      [114, 122, 92, 106],
      [106, 114, 78, 104], // Touches ascending support (y12 = 87) and bounces up
      [104, 122, 86, 118]  // Bounces upward again — NO downside SELL break!
    ];
    // Future candles chop & snap lower through the bounce buyer's stop
    const futureOffsets: [number, number, number, number][] = [
      [118, 124, 92, 98],
      [98, 106, 74, 80],
      [80, 92, 64, 70],
      [70, 82, 52, 60],
      [60, 76, 46, 68],
      [68, 78, 54, 62],
      [62, 74, 48, 56]
    ];
    return {
      chartPattern: 'single_support',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: {
        x1Index: 1,
        y1: base + 10,
        x2Index: 13,
        y2: base + 94,
        label: 'SELL BREAKOUT LINE (ASCENDING)',
        role: 'sell_breakout'
      },
      sessionLevel: {
        price: base + 205,
        label: `SESSION HIGH · ${(base + 205).toLocaleString()}`,
        type: 'high'
      },
      fibZone: { price: base + 98, label: '61.8% FIB ZONE' },
      buyLevel: { entry: base + 118, sl: base + 78, tp: base + 238 },
      sellLevel: { entry: base + 118, sl: base + 158, tp: base - 2 }
    };
  } else {
    const setupOffsets: [number, number, number, number][] = [
      [205, 214, 182, 188],
      [188, 194, 166, 172],
      [172, 180, 154, 160],
      [160, 178, 156, 170],
      [170, 174, 140, 146],
      [146, 156, 130, 136],
      [136, 148, 114, 122],
      [122, 140, 116, 130],
      [130, 134, 96, 102],
      [102, 108, 76, 82],
      [82, 98, 78, 90],
      [90, 106, 84, 94],
      [94, 122, 86, 96],  // Touches descending resistance (y12 = 113) and rejects down
      [96, 114, 78, 84]   // Rejects downward again — NO upside BUY break!
    ];
    // Future candles squeeze back up through short-bounce stops
    const futureOffsets: [number, number, number, number][] = [
      [84, 114, 80, 108],
      [108, 134, 102, 126],
      [126, 142, 114, 136],
      [136, 156, 128, 148],
      [148, 164, 136, 142],
      [142, 160, 134, 152],
      [152, 168, 142, 158]
    ];
    return {
      chartPattern: 'single_resistance',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: {
        x1Index: 1,
        y1: base + 190,
        x2Index: 13,
        y2: base + 106,
        label: 'BUY BREAKOUT LINE (DESCENDING)',
        role: 'buy_breakout'
      },
      sessionLevel: {
        price: base - 10,
        label: `SESSION LOW · ${(base - 10).toLocaleString()}`,
        type: 'low'
      },
      fibZone: { price: base + 104, label: '61.8% FIB ZONE' },
      buyLevel: { entry: base + 84, sl: base + 44, tp: base + 204 },
      sellLevel: { entry: base + 84, sl: base + 124, tp: base - 36 }
    };
  }
}

// TYPE B (1 TRENDLINE): Fake Wick Breakout (Wick pokes outside trendline, 15m body closes BACK INSIDE -> PASS)
function buildSingleFakeWickBreakout(
  base: number,
  startH: number,
  startM: number,
  side: 'bull_trap' | 'bear_trap'
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  sessionLevel: SimSessionLevel;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  if (side === 'bull_trap') {
    const setupOffsets: [number, number, number, number][] = [
      [98, 125, 86, 114],
      [114, 122, 90, 95],
      [95, 108, 76, 82],
      [82, 106, 74, 98],
      [98, 104, 65, 70],
      [70, 86, 52, 58],
      [58, 84, 48, 75],
      [75, 80, 44, 49],
      [49, 64, 30, 36],
      [36, 55, 26, 48],
      [48, 62, 36, 44],
      [44, 104, 38, 50],
      [50, 92, 36, 42],
      [42, 62, 28, 34]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [34, 42, 6, 10],
      [10, 20, -12, -8],
      [-8, 8, -26, -20],
      [-20, -5, -38, -30],
      [-30, -12, -42, -24],
      [-24, -8, -36, -32],
      [-32, -16, -45, -38]
    ];
    return {
      chartPattern: 'single_resistance',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: {
        x1Index: 1,
        y1: base + 120,
        x2Index: 13,
        y2: base + 48,
        label: 'BUY BREAKOUT LINE (DESCENDING)',
        role: 'buy_breakout'
      },
      sessionLevel: { price: base + 170, label: `SESSION HIGH · ${(base + 170).toLocaleString()}`, type: 'high' },
      buyLevel: { entry: base + 34, sl: base + 2, tp: base + 130 },
      sellLevel: { entry: base + 34, sl: base + 96, tp: base - 152 }
    };
  } else {
    const setupOffsets: [number, number, number, number][] = [
      [10, 26, -4, 18],
      [18, 30, 4, 12],
      [12, 36, 8, 28],
      [28, 48, 18, 40],
      [40, 52, 22, 32],
      [32, 60, 28, 52],
      [52, 72, 38, 64],
      [64, 76, 46, 56],
      [56, 84, 50, 76],
      [76, 90, 58, 68],
      [68, 82, 62, 74],
      [74, 80, 24, 72],
      [72, 84, 34, 76],
      [76, 94, 68, 88]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [88, 114, 84, 108],
      [108, 132, 102, 126],
      [126, 146, 118, 138],
      [138, 158, 130, 150],
      [150, 166, 140, 156],
      [156, 174, 148, 168],
      [168, 182, 158, 176]
    ];
    return {
      chartPattern: 'single_support',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: {
        x1Index: 1,
        y1: base + 5,
        x2Index: 13,
        y2: base + 77,
        label: 'SELL BREAKOUT LINE (ASCENDING)',
        role: 'sell_breakout'
      },
      sessionLevel: { price: base - 45, label: `SESSION LOW · ${(base - 45).toLocaleString()}`, type: 'low' },
      buyLevel: { entry: base + 88, sl: base + 42, tp: base + 226 },
      sellLevel: { entry: base + 88, sl: base + 120, tp: base - 8 }
    };
  }
}

// Pullback vs Session High / Low Boundary (Supports both 1-Line & 2-Line Wedge breakouts)
function buildSessionBoundarySetup(
  base: number,
  startH: number,
  startM: number,
  variant: 'wick_respects_buy' | 'wick_respects_sell' | 'body_past_high_pass' | 'body_past_low_pass',
  useWedge = false
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  secondaryTrendline?: SimTrendline;
  sessionLevel: SimSessionLevel;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  if (variant === 'wick_respects_buy') {
    if (useWedge) {
      // Converging wedge breakout above upper line (+78), pullback wick pierces Session Low (+66) down to +46, body closes INSIDE at +78!
      const setupOffsets: [number, number, number, number][] = [
        [34, 54, 12, 46],
        [46, 128, 42, 114],
        [114, 118, 20, 32],
        [32, 118, 28, 104],
        [104, 108, 28, 42],
        [42, 108, 38, 94],
        [94, 98, 36, 48],
        [48, 98, 44, 86],
        [86, 88, 44, 56],
        [56, 88, 52, 78],
        [78, 80, 52, 64],
        [64, 114, 60, 108], // Clean 15m body break above upper line (+78)
        [108, 112, 46, 80], // Pullback wick pierces Session Low (+66) down to +46, body closes INSIDE above +66 at +80!
        [80, 104, 76, 98]
      ];
      const futureOffsets: [number, number, number, number][] = [
        [98, 124, 94, 118],
        [118, 146, 112, 140],
        [140, 166, 134, 158],
        [158, 186, 152, 180],
        [180, 206, 174, 198],
        [198, 224, 190, 214],
        [214, 236, 204, 226]
      ];
      return {
        chartPattern: 'wedge',
        setupCandles: setupOffsets.map(toCandle),
        futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
        trendline: { x1Index: 1, y1: base + 128, x2Index: 11, y2: base + 78, label: 'UPPER BUY BREAKOUT LINE', role: 'buy_breakout' },
        secondaryTrendline: { x1Index: 0, y1: base + 12, x2Index: 11, y2: base + 56, label: 'LOWER SELL BREAKOUT LINE', role: 'sell_breakout' },
        sessionLevel: { price: base + 66, label: `SESSION LOW · ${(base + 66).toLocaleString()}`, type: 'low' },
        buyLevel: { entry: base + 98, sl: base + 58, tp: base + 218 },
        sellLevel: { entry: base + 98, sl: base + 138, tp: base - 22 }
      };
    }

    const setupOffsets: [number, number, number, number][] = [
      [60, 82, 54, 76],
      [76, 94, 68, 88],
      [88, 102, 74, 80],
      [80, 96, 66, 72],
      [72, 86, 58, 64],
      [64, 78, 52, 60],
      [60, 74, 48, 58],
      [58, 72, 46, 54],
      [54, 68, 44, 52],
      [52, 70, 46, 64],
      [64, 96, 60, 90],
      [90, 104, 72, 84],
      [84, 92, 36, 70],
      [70, 98, 66, 92]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [92, 118, 88, 112],
      [112, 138, 106, 132],
      [132, 154, 126, 148],
      [148, 174, 142, 168],
      [168, 192, 160, 184],
      [184, 208, 176, 198],
      [198, 218, 190, 210]
    ];
    return {
      chartPattern: 'single_resistance',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: { x1Index: 1, y1: base + 94, x2Index: 10, y2: base + 58, label: 'BUY BREAKOUT LINE (DESCENDING)', role: 'buy_breakout' },
      sessionLevel: { price: base + 50, label: `SESSION LOW · ${(base + 50).toLocaleString()}`, type: 'low' },
      buyLevel: { entry: base + 92, sl: base + 52, tp: base + 212 },
      sellLevel: { entry: base + 92, sl: base + 132, tp: base - 28 }
    };
  } else if (variant === 'wick_respects_sell') {
    if (useWedge) {
      // Converging wedge breakdown below lower line (+56), pullback wick pierces Session High (+76) up to +96, body closes INSIDE at +58!
      const setupOffsets: [number, number, number, number][] = [
        [34, 54, 12, 46],
        [46, 128, 42, 114],
        [114, 118, 20, 32],
        [32, 118, 28, 104],
        [104, 108, 28, 42],
        [42, 108, 38, 94],
        [94, 98, 36, 48],
        [48, 98, 44, 86],
        [86, 88, 44, 56],
        [56, 88, 52, 78],
        [78, 80, 52, 64],
        [64, 68, 22, 28], // Clean 15m body break below lower line (+56)
        [28, 96, 24, 56], // Pullback wick pierces Session High (+76) up to +96, body closes INSIDE below +76 at +56!
        [56, 62, 34, 38]
      ];
      const futureOffsets: [number, number, number, number][] = [
        [38, 44, 14, 18],
        [18, 24, -10, -4],
        [-4, 8, -32, -24],
        [-24, -14, -52, -46],
        [-46, -34, -74, -68],
        [-68, -58, -90, -82],
        [-82, -72, -102, -92]
      ];
      return {
        chartPattern: 'wedge',
        setupCandles: setupOffsets.map(toCandle),
        futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
        trendline: { x1Index: 1, y1: base + 128, x2Index: 11, y2: base + 78, label: 'UPPER BUY BREAKOUT LINE', role: 'buy_breakout' },
        secondaryTrendline: { x1Index: 0, y1: base + 12, x2Index: 11, y2: base + 56, label: 'LOWER SELL BREAKOUT LINE', role: 'sell_breakout' },
        sessionLevel: { price: base + 76, label: `SESSION HIGH · ${(base + 76).toLocaleString()}`, type: 'high' },
        buyLevel: { entry: base + 38, sl: base + 0, tp: base + 152 },
        sellLevel: { entry: base + 38, sl: base + 78, tp: base - 82 }
      };
    }

    const setupOffsets: [number, number, number, number][] = [
      [60, 74, 48, 54],
      [54, 72, 46, 66],
      [66, 84, 58, 78],
      [78, 96, 70, 88],
      [88, 106, 80, 98],
      [98, 114, 90, 108],
      [108, 118, 96, 102],
      [102, 116, 92, 110],
      [110, 118, 98, 104],
      [104, 112, 74, 80],
      [80, 136, 76, 102],
      [102, 112, 82, 88],
      [88, 96, 74, 80],
      [80, 88, 66, 72]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [72, 78, 46, 52],
      [52, 60, 28, 34],
      [34, 44, 12, 18],
      [18, 28, -4, 4],
      [4, 14, -22, -16],
      [-16, -6, -38, -32],
      [-32, -22, -48, -40]
    ];
    return {
      chartPattern: 'single_support',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: { x1Index: 1, y1: base + 46, x2Index: 9, y2: base + 98, label: 'SELL BREAKOUT LINE (ASCENDING)', role: 'sell_breakout' },
      sessionLevel: { price: base + 120, label: `SESSION HIGH · ${(base + 120).toLocaleString()}`, type: 'high' },
      buyLevel: { entry: base + 72, sl: base + 32, tp: base + 192 },
      sellLevel: { entry: base + 72, sl: base + 112, tp: base - 48 }
    };
  } else if (variant === 'body_past_high_pass') {
    if (useWedge) {
      const setupOffsets: [number, number, number, number][] = [
        [34, 54, 12, 46],
        [46, 128, 42, 114],
        [114, 118, 20, 32],
        [32, 118, 28, 104],
        [104, 108, 28, 42],
        [42, 108, 38, 94],
        [94, 98, 36, 48],
        [48, 98, 44, 86],
        [86, 88, 44, 56],
        [56, 88, 52, 78],
        [78, 122, 74, 116],
        [116, 166, 112, 160],
        [160, 164, 134, 142], // Pullback body completely ABOVE Session High (+128)
        [142, 156, 132, 150]
      ];
      const futureOffsets: [number, number, number, number][] = [
        [150, 158, 118, 122],
        [122, 132, 92, 98],
        [98, 110, 72, 78],
        [78, 94, 62, 68],
        [68, 84, 56, 62],
        [62, 76, 48, 56],
        [56, 70, 44, 52]
      ];
      return {
        chartPattern: 'wedge',
        setupCandles: setupOffsets.map(toCandle),
        futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
        trendline: { x1Index: 1, y1: base + 128, x2Index: 10, y2: base + 83, label: 'UPPER BUY BREAKOUT LINE', role: 'buy_breakout' },
        secondaryTrendline: { x1Index: 0, y1: base + 12, x2Index: 10, y2: base + 52, label: 'LOWER SELL BREAKOUT LINE', role: 'sell_breakout' },
        sessionLevel: { price: base + 128, label: `SESSION HIGH · ${(base + 128).toLocaleString()}`, type: 'high' },
        buyLevel: { entry: base + 150, sl: base + 120, tp: base + 240 },
        sellLevel: { entry: base + 150, sl: base + 180, tp: base + 60 }
      };
    }

    const setupOffsets: [number, number, number, number][] = [
      [96, 120, 82, 110],
      [110, 118, 86, 92],
      [92, 106, 74, 80],
      [80, 108, 72, 98],
      [98, 104, 68, 74],
      [74, 96, 62, 88],
      [88, 95, 60, 66],
      [66, 84, 55, 78],
      [78, 92, 66, 86],
      [86, 126, 82, 120],
      [120, 138, 112, 134],
      [134, 178, 130, 172],
      [172, 176, 146, 154],
      [154, 168, 144, 162]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [162, 170, 132, 136],
      [136, 144, 104, 110],
      [110, 122, 84, 90],
      [90, 105, 74, 80],
      [80, 96, 68, 74],
      [74, 88, 60, 68],
      [68, 82, 55, 64]
    ];
    return {
      chartPattern: 'single_resistance',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: { x1Index: 1, y1: base + 115, x2Index: 11, y2: base + 75, label: 'BUY BREAKOUT LINE (DESCENDING)', role: 'buy_breakout' },
      sessionLevel: { price: base + 140, label: `SESSION HIGH · ${(base + 140).toLocaleString()}`, type: 'high' },
      buyLevel: { entry: base + 162, sl: base + 132, tp: base + 252 },
      sellLevel: { entry: base + 162, sl: base + 192, tp: base + 72 }
    };
  } else {
    if (useWedge) {
      const setupOffsets: [number, number, number, number][] = [
        [34, 54, 12, 46],
        [46, 128, 42, 114],
        [114, 118, 20, 32],
        [32, 118, 28, 104],
        [104, 108, 28, 42],
        [42, 108, 38, 94],
        [94, 98, 36, 48],
        [48, 98, 44, 86],
        [86, 88, 44, 56],
        [56, 88, 52, 78],
        [78, 82, 34, 40],
        [40, 44, -12, -6],
        [-6, 14, -10, 6],   // Pullback body completely BELOW Session Low (+24)
        [6, 12, -6, 0]
      ];
      const futureOffsets: [number, number, number, number][] = [
        [0, 34, -4, 28],
        [28, 62, 22, 54],
        [54, 80, 46, 72],
        [72, 92, 64, 84],
        [84, 100, 74, 90],
        [90, 104, 78, 96],
        [96, 110, 86, 102]
      ];
      return {
        chartPattern: 'wedge',
        setupCandles: setupOffsets.map(toCandle),
        futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
        trendline: { x1Index: 1, y1: base + 128, x2Index: 10, y2: base + 83, label: 'UPPER BUY BREAKOUT LINE', role: 'buy_breakout' },
        secondaryTrendline: { x1Index: 0, y1: base + 12, x2Index: 10, y2: base + 52, label: 'LOWER SELL BREAKOUT LINE', role: 'sell_breakout' },
        sessionLevel: { price: base + 24, label: `SESSION LOW · ${(base + 24).toLocaleString()}`, type: 'low' },
        buyLevel: { entry: base + 0, sl: base - 30, tp: base + 90 },
        sellLevel: { entry: base + 0, sl: base + 30, tp: base - 90 }
      };
    }

    const setupOffsets: [number, number, number, number][] = [
      [104, 116, 84, 90],
      [90, 108, 82, 102],
      [102, 118, 92, 112],
      [112, 122, 96, 104],
      [104, 126, 98, 118],
      [118, 132, 108, 124],
      [124, 136, 114, 120],
      [120, 134, 112, 128],
      [128, 134, 92, 98],
      [98, 106, 68, 72],
      [72, 80, 26, 32],
      [32, 56, 28, 48],
      [48, 54, 34, 40],
      [40, 48, 28, 34]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [34, 68, 30, 62],
      [62, 96, 56, 88],
      [88, 114, 80, 106],
      [106, 126, 98, 118],
      [118, 134, 108, 124],
      [124, 138, 112, 130],
      [130, 144, 120, 136]
    ];
    return {
      chartPattern: 'single_support',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: { x1Index: 1, y1: base + 82, x2Index: 10, y2: base + 124, label: 'SELL BREAKOUT LINE (ASCENDING)', role: 'sell_breakout' },
      sessionLevel: { price: base + 60, label: `SESSION LOW · ${(base + 60).toLocaleString()}`, type: 'low' },
      buyLevel: { entry: base + 34, sl: base + 4, tp: base + 124 },
      sellLevel: { entry: base + 34, sl: base + 64, tp: base - 56 }
    };
  }
}

// Extreme RSI Exhaustion (Overbought 75+ or Oversold 25- -> PASS)
function buildExtremeRsiTrap(
  base: number,
  startH: number,
  startM: number,
  kind: 'overbought' | 'oversold',
  useWedge = false
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  secondaryTrendline?: SimTrendline;
  sessionLevel: SimSessionLevel;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  if (kind === 'overbought') {
    const setupOffsets: [number, number, number, number][] = [
      [10, 32, 4, 26],
      [26, 65, 22, 58],
      [58, 95, 52, 88],
      [88, 125, 80, 118],
      [118, 140, 100, 108],
      [108, 128, 96, 122],
      [122, 148, 115, 142],
      [142, 165, 130, 158],
      [158, 182, 146, 174],
      [174, 192, 155, 164],
      [164, 188, 152, 180],
      [180, 215, 174, 208],
      [208, 214, 186, 192],
      [192, 205, 184, 198]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [198, 206, 168, 174],
      [174, 180, 140, 146],
      [146, 156, 118, 122],
      [122, 135, 96, 104],
      [104, 120, 88, 96],
      [96, 110, 82, 90],
      [90, 106, 75, 84]
    ];
    return {
      chartPattern: useWedge ? 'wedge' : 'single_resistance',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: {
        x1Index: 3,
        y1: base + 125,
        x2Index: 11,
        y2: base + 190,
        label: useWedge ? 'UPPER BUY BREAKOUT LINE' : 'BUY BREAKOUT LINE (DESCENDING)',
        role: 'buy_breakout'
      },
      ...(useWedge
        ? {
            secondaryTrendline: {
              x1Index: 1,
              y1: base + 22,
              x2Index: 11,
              y2: base + 150,
              label: 'LOWER SELL BREAKOUT LINE',
              role: 'sell_breakout' as const
            }
          }
        : {}),
      sessionLevel: { price: base + 250, label: `SESSION HIGH · ${(base + 250).toLocaleString()}`, type: 'high' },
      buyLevel: { entry: base + 198, sl: base + 164, tp: base + 300 },
      sellLevel: { entry: base + 198, sl: base + 232, tp: base + 96 }
    };
  } else {
    const setupOffsets: [number, number, number, number][] = [
      [220, 226, 192, 196],
      [196, 204, 160, 166],
      [166, 172, 128, 134],
      [134, 144, 100, 106],
      [106, 118, 82, 90],
      [90, 102, 68, 74],
      [74, 88, 54, 60],
      [60, 75, 38, 44],
      [44, 62, 25, 32],
      [32, 46, 16, 22],
      [22, 38, 6, 12],
      [12, 20, -16, -10],
      [-10, 12, -14, 4],
      [4, 10, -8, -4]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [-4, 32, -8, 26],
      [26, 68, 20, 62],
      [62, 95, 52, 88],
      [88, 112, 78, 106],
      [106, 120, 88, 98],
      [98, 126, 92, 118],
      [118, 138, 108, 128]
    ];
    return {
      chartPattern: useWedge ? 'wedge' : 'single_support',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: useWedge
        ? {
            x1Index: 1,
            y1: base + 204,
            x2Index: 11,
            y2: base + 36,
            label: 'UPPER BUY BREAKOUT LINE',
            role: 'buy_breakout'
          }
        : {
            x1Index: 1,
            y1: base + 160,
            x2Index: 11,
            y2: base + 8,
            label: 'SELL BREAKOUT LINE (ASCENDING)',
            role: 'sell_breakout'
          },
      ...(useWedge
        ? {
            secondaryTrendline: {
              x1Index: 1,
              y1: base + 160,
              x2Index: 11,
              y2: base + 6,
              label: 'LOWER SELL BREAKOUT LINE',
              role: 'sell_breakout' as const
            }
          }
        : {}),
      sessionLevel: { price: base - 30, label: `SESSION LOW · ${(base - 30).toLocaleString()}`, type: 'low' },
      buyLevel: { entry: base - 4, sl: base - 34, tp: base + 86 },
      sellLevel: { entry: base - 4, sl: base + 28, tp: base - 100 }
    };
  }
}

// Choppy Tight Consolidation (Bank Holiday / NFP / CPI / FOMC -> PASS)
function buildChoppyRange(
  base: number,
  startH: number,
  startM: number,
  wildNews: boolean
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  secondaryTrendline: SimTrendline;
  sessionLevel: SimSessionLevel;
  buyLevel: { entry: number; sl: number; tp: number };
  sellLevel: { entry: number; sl: number; tp: number };
} {
  const times = makeTimes(startH, startM, 21);
  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });
  const setupOffsets: [number, number, number, number][] = [
    [14, 34, 4, 18],
    [18, 34, 6, 12],
    [12, 31, 4, 20],
    [20, 33, 6, 14],
    [14, 31, 5, 17],
    [17, 32, 6, 12],
    [12, 29, 7, 19],
    [19, 31, 8, 14],
    [14, 30, 8, 16],
    [16, 30, 9, 13],
    [13, 28, 9, 18],
    [18, 29, 10, 15],
    [15, 28, 10, 21],
    [21, 28, 11, 16]
  ];
  const futureOffsets: [number, number, number, number][] = wildNews
    ? [
        [16, 86, -42, -26],
        [-26, 74, -54, 58],
        [58, 92, -38, -22],
        [-22, 48, -46, 28],
        [28, 62, -18, 10],
        [10, 44, -24, 18],
        [18, 40, -14, 12]
      ]
    : [
        [16, 38, -2, 8],
        [8, 36, 0, 24],
        [24, 40, -4, 4],
        [4, 34, -2, 20],
        [20, 38, 2, 10],
        [10, 34, 0, 18],
        [18, 36, 4, 12]
      ];
  return {
    chartPattern: 'wedge',
    setupCandles: setupOffsets.map(toCandle),
    futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
    trendline: { x1Index: 0, y1: base + 35, x2Index: 13, y2: base + 27, label: 'UPPER BUY BREAKOUT LINE', role: 'buy_breakout' },
    secondaryTrendline: { x1Index: 0, y1: base + 3, x2Index: 13, y2: base + 11, label: 'LOWER SELL BREAKOUT LINE', role: 'sell_breakout' },
    sessionLevel: { price: base + 42, label: `SESSION HIGH · ${(base + 42).toLocaleString()}`, type: 'high' },
    buyLevel: { entry: base + 16, sl: base - 2, tp: base + 70 },
    sellLevel: { entry: base + 16, sl: base + 34, tp: base - 38 }
  };
}

// Mode B: Active Winning Trade Management (Floating +1.3R to +1.6R, then reverses back to Entry!)
function buildManageTradeScenario(
  base: number,
  startH: number,
  startM: number,
  direction: 'BUY' | 'SELL',
  floatingR: number,
  useWedge = false
): {
  chartPattern: SimulatorChartPattern;
  setupCandles: SimCandle[];
  futureCandles: SimCandle[];
  trendline: SimTrendline;
  secondaryTrendline?: SimTrendline;
  sessionLevel: SimSessionLevel;
  activePosition: SimActivePosition;
} {
  const times = makeTimes(startH, startM, 20);
  const toCandle = (o: [number, number, number, number], i: number): SimCandle => ({
    time: times[i],
    open: base + o[0],
    high: base + o[1],
    low: base + o[2],
    close: base + o[3]
  });

  if (direction === 'BUY') {
    const currentCloseOffset = 40 + Math.round(40 * floatingR);
    const setupOffsets: [number, number, number, number][] = [
      [25, 68, 12, 56],
      [56, 62, 16, 22],
      [22, 56, 18, 48],
      [48, 52, 22, 28],
      [28, 46, 24, 34],
      [34, 42, 26, 30],
      [30, 50, 26, 44], // Breakout above upper line
      [44, 52, 30, 40], // Pullback entry filled at +40
      [40, 62, 36, 58],
      [58, 76, 52, 72],
      [72, 88, 66, 82],
      [82, 98, 76, 92],
      [92, currentCloseOffset + 4, 86, currentCloseOffset - 4],
      [currentCloseOffset - 4, currentCloseOffset + 10, currentCloseOffset - 8, currentCloseOffset]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [currentCloseOffset, currentCloseOffset + 4, currentCloseOffset - 22, currentCloseOffset - 18],
      [currentCloseOffset - 18, currentCloseOffset - 12, 56, 62],
      [62, 68, 36, 40],
      [40, 46, 14, 18],
      [18, 24, -10, -4],
      [-4, 10, -18, 4]
    ];
    return {
      chartPattern: useWedge ? 'wedge' : 'single_resistance',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: {
        x1Index: 0,
        y1: base + 68,
        x2Index: 6,
        y2: base + 40,
        label: 'BROKEN BUY BREAKOUT LINE',
        role: 'buy_breakout'
      },
      ...(useWedge
        ? {
            secondaryTrendline: {
              x1Index: 0,
              y1: base + 12,
              x2Index: 6,
              y2: base + 30,
              label: 'LOWER SELL BREAKOUT LINE',
              role: 'sell_breakout' as const
            }
          }
        : {}),
      sessionLevel: { price: base + 165, label: `SESSION HIGH · ${(base + 165).toLocaleString()}`, type: 'high' },
      activePosition: {
        direction: 'BUY',
        entry: base + 40,
        initialSl: base + 0,
        tp: base + 160,
        floatingR
      }
    };
  } else {
    const currentCloseOffset = 120 - Math.round(40 * floatingR);
    const setupOffsets: [number, number, number, number][] = [
      [135, 148, 92, 104],
      [104, 144, 98, 138],
      [138, 142, 104, 112],
      [112, 138, 108, 132],
      [132, 136, 114, 126],
      [126, 134, 118, 130],
      [130, 134, 110, 116], // Breakdown below lower line
      [116, 130, 108, 120], // Pullback entry filled at +120
      [120, 124, 98, 102],
      [102, 108, 84, 88],
      [88, 94, 72, 78],
      [78, 84, 62, 68],
      [68, 74, currentCloseOffset - 4, currentCloseOffset + 4],
      [currentCloseOffset + 4, currentCloseOffset + 8, currentCloseOffset - 10, currentCloseOffset]
    ];
    const futureOffsets: [number, number, number, number][] = [
      [currentCloseOffset, currentCloseOffset + 22, currentCloseOffset - 4, currentCloseOffset + 18],
      [currentCloseOffset + 18, 104, currentCloseOffset + 12, 98],
      [98, 124, 92, 120],
      [120, 146, 114, 142],
      [142, 170, 136, 164],
      [164, 178, 150, 156]
    ];
    return {
      chartPattern: useWedge ? 'wedge' : 'single_support',
      setupCandles: setupOffsets.map(toCandle),
      futureCandles: futureOffsets.map((o, i) => toCandle(o, i + 14)),
      trendline: useWedge
        ? {
            x1Index: 0,
            y1: base + 148,
            x2Index: 6,
            y2: base + 130,
            label: 'UPPER BUY BREAKOUT LINE',
            role: 'buy_breakout'
          }
        : {
            x1Index: 0,
            y1: base + 92,
            x2Index: 6,
            y2: base + 120,
            label: 'BROKEN SELL BREAKOUT LINE',
            role: 'sell_breakout'
          },
      ...(useWedge
        ? {
            secondaryTrendline: {
              x1Index: 0,
              y1: base + 92,
              x2Index: 6,
              y2: base + 120,
              label: 'BROKEN LOWER SELL LINE',
              role: 'sell_breakout' as const
            }
          }
        : {}),
      sessionLevel: { price: base - 5, label: `SESSION LOW · ${(base - 5).toLocaleString()}`, type: 'low' },
      activePosition: {
        direction: 'SELL',
        entry: base + 120,
        initialSl: base + 160,
        tp: base + 0,
        floatingR
      }
    };
  }
}

/* ---------------------------------------------------------------------------
   50 CURATED SCENARIOS: EASY (15) + MEDIUM (15) + HARD (20)
   Strict Mix of 2-Trendline Converging Wedges & 1-Trendline Breakout Charts
--------------------------------------------------------------------------- */
export const SIMULATOR_SCENARIOS: SimScenario[] = [
  /* =========================================================================
     EASY TIER — 15 ROUNDS (2-Line Wedges + 1-Line Breakouts, No Bounce Trades)
     ========================================================================= */
  (() => {
    const g = buildWedgeScenario(21200, 18, 30, 'buy_win');
    return {
      id: 1,
      difficulty: 'easy',
      roundInTier: 1,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Upper Line Breakout & Clean Pullback',
      sessionBanner: '9:45 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 53.4,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Price compresses inside a converging 2-trendline wedge, closes a full 15m bullish body ABOVE the upper BUY Breakout Line, and pulls back cleanly to retest it.',
      correctAction: 'BUY',
      ...g,
      feedback: {
        correctTitle: 'WEDGE BREAKOUT LONG // +3R TARGET HIT',
        correctDetail: 'Full 15m candle body close above the upper BUY Breakout Line, clean pullback retest, neutral RSI (53.4), and clear NY Open delivered +3R.',
        wrongTitle: 'MISSED CLEAN WEDGE BUY BREAKOUT',
        wrongDetail: 'All breakout rules aligned: clear NY Open, neutral RSI, 15m body close above the upper wedge line, and clean pullback.'
      }
    };
  })(),
  (() => {
    const g = buildSingleDescBreakout(21240, 19, 0, 'news_whipsaw');
    return {
      id: 2,
      difficulty: 'easy',
      roundInTier: 2,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Red News in 10 Minutes Trap',
      sessionBanner: '10:20 PM — Red News at 10:30 PM',
      bannerTone: 'danger',
      rsiValue: 51.2,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single descending resistance line breaks and pulls back cleanly, but High-Impact USD Red News drops in 10 minutes at 10:30 PM.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'RISK AVOIDED // 10:30 PM RED NEWS RULE',
        correctDetail: 'Standing aside 10 minutes before Red News saved 1R. Always wait until 30 minutes after high-impact red news before entering.',
        wrongTitle: 'STOPPED OUT BY 10:30 PM RED NEWS SPIKE',
        wrongDetail: 'Never enter a breakout right before high-impact red news. The 10:30 PM release whipsawed violently through stop losses.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21160, 18, 45, 'sell_win');
    return {
      id: 3,
      difficulty: 'easy',
      roundInTier: 3,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Lower Line Breakdown & Clean Retest',
      sessionBanner: '9:50 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 44.6,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Price snaps BELOW the lower ascending SELL Breakout Line with a full bearish 15m body close, followed by a clean retest underneath it.',
      correctAction: 'SELL',
      ...g,
      feedback: {
        correctTitle: 'WEDGE BREAKDOWN SHORT // +3R TARGET HIT',
        correctDetail: 'Decisive bearish 15m body close below the lower SELL Breakout Line, clean retest, neutral RSI (44.6), and clear Session Low room hit +3R.',
        wrongTitle: 'MISSED CLEAN WEDGE SELL BREAKDOWN',
        wrongDetail: 'Clear session, neutral RSI, full bearish body break below the lower wedge line, and clean retest confirmed the SELL setup.'
      }
    };
  })(),
  (() => {
    const g = buildSingleTrendlineBounceTrap(21290, 18, 30, 'support_bounce_pass');
    return {
      id: 4,
      difficulty: 'easy',
      roundInTier: 4,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Ascending Support Bounce Trap (No Bounce Trades)',
      sessionBanner: '9:55 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 54.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single ascending support trendline (SELL Breakout Line): price touches the line and bounces upward with lower wicks without breaking below it.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'NO BOUNCE TRADES // 1R SAVED',
        correctDetail: 'We don\'t trade trendline bounces—we were waiting for a downside SELL breakout that didn\'t happen. Passing protected you when price chopped lower.',
        wrongTitle: 'TRADED AN UNCONFIRMED TRENDLINE BOUNCE',
        wrongDetail: 'We don\'t trade trendline bounces—on an ascending support line we only wait for a confirmed bearish body breakdown below the line, which never happened.'
      }
    };
  })(),
  (() => {
    const g = buildExtremeRsiTrap(21180, 18, 45, 'overbought', true);
    return {
      id: 5,
      difficulty: 'easy',
      roundInTier: 5,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Overbought RSI Exhaustion Trap (RSI 79.2)',
      sessionBanner: '10:00 PM NY Session — Clear',
      bannerTone: 'warning',
      rsiValue: 79.2,
      rsiStatus: 'OVERBOUGHT',
      setupSummary: 'After a steep climb inside an expanding wedge, price breaks higher while RSI (14) reads 79.2 in Overbought territory.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'OVERBOUGHT FILTER WORKED // 1R SAVED',
        correctDetail: 'RSI above 75 shows buyers are overextended. Passing kept you out of the immediate reversal.',
        wrongTitle: 'BOUGHT AT OVERBOUGHT RSI (79.2)',
        wrongDetail: 'Entering longs when RSI is already Overbought (75+) leaves little upside room and exposes your stop to quick pullbacks.'
      }
    };
  })(),
  (() => {
    const g = buildSingleFakeWickBreakout(21310, 18, 30, 'bull_trap');
    return {
      id: 6,
      difficulty: 'easy',
      roundInTier: 6,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Fake Wick Breakout (Body Closed Back Inside)',
      sessionBanner: '9:45 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 49.4,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single descending resistance line: upper wicks spike above the line, but every 15m candle body closes BACK INSIDE below resistance.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'FAKE WICK BREAKOUT AVOIDED // 1R SAVED',
        correctDetail: 'A wick alone never confirms a breakout. Because the 15m bodies closed back below the resistance trendline, passing kept you safe.',
        wrongTitle: 'CAUGHT IN FAKE WICK BREAKOUT',
        wrongDetail: 'Always wait for a full 15m candle body close outside the trendline. Wick pokes that close back inside frequently reverse.'
      }
    };
  })(),
  (() => {
    const g = buildSingleTrendlineBounceTrap(21350, 18, 45, 'resistance_bounce_pass');
    return {
      id: 7,
      difficulty: 'easy',
      roundInTier: 7,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Descending Resistance Bounce Trap (No Bounce Trades)',
      sessionBanner: '10:05 PM NY Session — Clear',
      bannerTone: 'clear',
      rsiValue: 43.7,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single descending resistance trendline (BUY Breakout Line): price touches resistance and rejects downward with upper wicks without breaking above it.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'NO BOUNCE TRADES // 1R SAVED',
        correctDetail: 'We don\'t trade trendline bounces—we were waiting for an upside BUY breakout that didn\'t happen. Shorting the bounce got squeezed upward.',
        wrongTitle: 'SHORTED A TRENDLINE REJECTION BOUNCE',
        wrongDetail: 'We don\'t trade trendline bounces—on a descending resistance line we strictly wait for an upside BUY breakout body close, which didn\'t happen.'
      }
    };
  })(),
  (() => {
    const g = buildExtremeRsiTrap(21120, 18, 45, 'oversold', true);
    return {
      id: 8,
      difficulty: 'easy',
      roundInTier: 8,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Oversold RSI Trap (RSI 21.4)',
      sessionBanner: '10:10 PM NY Session — Clear',
      bannerTone: 'warning',
      rsiValue: 21.4,
      rsiStatus: 'OVERSOLD',
      setupSummary: 'Price drops out of a descending channel/wedge after a multi-hour selloff while RSI (14) sits deeply Oversold at 21.4.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'OVERSOLD TRAP SKIPPED // 1R SAVED',
        correctDetail: 'Selling at RSI 21.4 risks getting caught in a sharp relief bounce. Passing kept your capital untouched.',
        wrongTitle: 'SOLD INTO OVERSOLD RSI (21.4)',
        wrongDetail: 'Avoid fresh shorts when RSI is already Oversold (25 or below). Price bounced strongly right after.'
      }
    };
  })(),
  (() => {
    const g = buildChoppyRange(21260, 18, 30, false);
    return {
      id: 9,
      difficulty: 'easy',
      roundInTier: 9,
      mode: 'PRE_ENTRY',
      title: '[2-Line] USD Bank Holiday Low-Volume Chop',
      sessionBanner: '9:35 PM — USD Bank Holiday — Low Volume',
      bannerTone: 'danger',
      rsiValue: 50.1,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Small overlapping candles drift sideways inside two tight converging lines during a USD Bank Holiday.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'BANK HOLIDAY PATIENCE // CAPITAL SAFE',
        correctDetail: 'USD Bank Holidays strip volume from USTECH100, trapping price in slow chop. Passing is the only correct play.',
        wrongTitle: 'FORCED A TRADE ON A USD BANK HOLIDAY',
        wrongDetail: 'Low-volume bank holidays produce false starts and directionless chop. Always sit out bank holiday sessions.'
      }
    };
  })(),
  (() => {
    const g = buildSingleDescBreakout(21410, 19, 0, 'win');
    return {
      id: 10,
      difficulty: 'easy',
      roundInTier: 10,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Descending Breakout + 50% Fib Retest',
      sessionBanner: '10:00 PM NY Session — Clear',
      bannerTone: 'clear',
      rsiValue: 56.2,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single descending resistance line breaks with a full bullish 15m body close, followed by a tidy pullback to the 50% Fib zone well below Session High.',
      correctAction: 'BUY',
      ...g,
      feedback: {
        correctTitle: 'SINGLE-LINE BREAKOUT LONG // +3R HIT',
        correctDetail: 'Full 15m body close above the single descending resistance line, neutral RSI (56.2), and 50% Fib retest delivered a clean +3R.',
        wrongTitle: 'MISSED CLEAN 1-LINE BUY BREAKOUT',
        wrongDetail: 'No traps were present: clear session, neutral RSI, clean body break through resistance, and 50% Fib pullback.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21220, 18, 30, 'body_past_high_pass', false);
    return {
      id: 11,
      difficulty: 'easy',
      roundInTier: 11,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Pullback Body Closed Past Session High',
      sessionBanner: '9:55 PM NY Open — Clear',
      bannerTone: 'warning',
      rsiValue: 58.6,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'After breaking the single descending trendline, price surged past the dashed Session High and the pullback candle body closed COMPLETELY ABOVE Session High.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'SESSION HIGH RULE APPLIED // 1R SAVED',
        correctDetail: 'When a pullback body closes completely past Session High, the move is overextended. Passing avoided the sharp drop back inside.',
        wrongTitle: 'BOUGHT BEYOND SESSION HIGH BOUNDARY',
        wrongDetail: 'Check the horizontal Session High dashed line: the pullback candle body closed completely past it, invalidating a late entry.'
      }
    };
  })(),
  (() => {
    const g = buildSingleAscBreakdown(21330, 19, 0, 'win');
    return {
      id: 12,
      difficulty: 'easy',
      roundInTier: 12,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Ascending Breakdown + 61.8% Fib Retest',
      sessionBanner: '10:15 PM NY Session — Clear',
      bannerTone: 'clear',
      rsiValue: 42.3,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single ascending support line snaps on a full bearish 15m body close, followed by a clean retest into the 61.8% Fib zone and neutral RSI (42.3).',
      correctAction: 'SELL',
      ...g,
      feedback: {
        correctTitle: 'SINGLE-LINE BREAKDOWN SHORT // +3R HIT',
        correctDetail: 'Bearish body close below ascending support, clean 61.8% Fib retest, and neutral RSI produced a textbook +3R drop.',
        wrongTitle: 'MISSED TEXTBOOK 1-LINE SELL BREAKDOWN',
        wrongDetail: 'Clear session and neutral RSI paired with a decisive body breakdown and 61.8% Fib retest called for a SELL.'
      }
    };
  })(),
  (() => {
    const g = buildChoppyRange(21280, 18, 30, true);
    return {
      id: 13,
      difficulty: 'easy',
      roundInTier: 13,
      mode: 'PRE_ENTRY',
      title: '[2-Line] Major NFP / CPI / FOMC "DON\'T TRADE" Day',
      sessionBanner: '9:35 PM — Major NFP / CPI / FOMC DON\'T TRADE Day',
      bannerTone: 'danger',
      rsiValue: 50.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Calendar marks today as a red DON\'T TRADE day (NFP/CPI/FOMC). Price compresses inside a tight range ahead of extreme news volatility.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'DON\'T TRADE DAY HONORED // CAPITAL SAFE',
        correctDetail: 'Major NFP/CPI/FOMC days trigger erratic two-sided spikes that stop out both buyers and sellers. Sitting out protected 1R.',
        wrongTitle: 'TRADED ON A RED "DON\'T TRADE" DAY',
        wrongDetail: 'Desk rules classify NFP, CPI, and FOMC days as strict no-trade sessions regardless of intraday chart appearance.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21190, 18, 45, 'fake_wick_lower_pass');
    return {
      id: 14,
      difficulty: 'easy',
      roundInTier: 14,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Fake Lower Wick Breakdown (Body Inside Wedge)',
      sessionBanner: '9:50 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 48.9,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Two candles poke lower wicks beneath the lower ascending SELL line of the wedge, yet both 15m bodies close BACK INSIDE the wedge.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'WEDGE BEAR TRAP AVOIDED // 1R SAVED',
        correctDetail: 'Because both 15m candle bodies closed back inside the wedge, no breakdown was confirmed and price snapped upward.',
        wrongTitle: 'SHORTED AN UNCONFIRMED WEDGE WICK POKE',
        wrongDetail: 'Never short a wick poke beneath the lower wedge line—require a full 15m candle body close outside the wedge first.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21420, 19, 0, 'inside_bounce_lower_pass');
    return {
      id: 15,
      difficulty: 'easy',
      roundInTier: 15,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Price Bounces Inside Wedge (No Breakout)',
      sessionBanner: '10:05 PM NY Session — Clear',
      bannerTone: 'clear',
      rsiValue: 55.1,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Price touches the lower ascending wedge line and bounces slightly upward, remaining trapped strictly INSIDE the upper and lower trendlines with zero breakout close.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'NO WEDGE BREAKOUT // CAPITAL PROTECTED',
        correctDetail: 'Price stayed inside the converging wedge and never closed outside either line. We never trade bounces inside a wedge—PASS kept you safe.',
        wrongTitle: 'TRADED INSIDE AN UNBROKEN WEDGE',
        wrongDetail: 'Until a 15m candle body closes cleanly outside either the Upper BUY Line or Lower SELL Line, stand aside.'
      }
    };
  })(),

  /* =========================================================================
     MEDIUM TIER — 15 ROUNDS (30m Post-News, Session Wicks, No-Bounce 1-Line, 0.5R)
     ========================================================================= */
  (() => {
    const g = buildWedgeScenario(21360, 19, 15, 'buy_win');
    return {
      id: 16,
      difficulty: 'medium',
      roundInTier: 1,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] 32 Mins Post 9:30 PM Red News — Cleared',
      sessionBanner: '10:02 PM — 9:30 PM Red News Cleared (32m Passed)',
      bannerTone: 'clear',
      rsiValue: 54.0,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Red news dropped at 9:30 PM. It is now 10:02 PM (32 minutes later). Price closes a clean 15m bullish body ABOVE the upper BUY Breakout Line and pulls back cleanly.',
      correctAction: 'BUY',
      ...g,
      feedback: {
        correctTitle: 'POST-NEWS WEDGE BREAKOUT // +3R HIT',
        correctDetail: 'With 32 minutes elapsed after 9:30 PM news, the 30-minute wait rule passed and the confirmed upper wedge breakout ran straight to +3R.',
        wrongTitle: 'OVER-FILTERED AFTER 30-MIN NEWS WINDOW',
        wrongDetail: 'The rule is to wait 30 minutes after red news. At 10:02 PM following 9:30 PM news, the window is cleared for a valid breakout.'
      }
    };
  })(),
  (() => {
    const g = buildSingleAscBreakdown(21290, 19, 0, 'news_whipsaw');
    return {
      id: 17,
      difficulty: 'medium',
      roundInTier: 2,
      mode: 'PRE_ENTRY',
      title: '[1-Line] 18 Minutes Before Red News Trap',
      sessionBanner: '10:12 PM — Red News at 10:30 PM (18m Left)',
      bannerTone: 'danger',
      rsiValue: 45.2,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single ascending support breaks cleanly at 10:12 PM, but high-impact Red News arrives in 18 minutes at 10:30 PM.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'PRE-NEWS BUFFER SAVED 1R',
        correctDetail: 'With red news only 18 minutes away, a +3R swing does not have safe room before the spike. Passing avoided the whipsaw.',
        wrongTitle: 'CAUGHT IN 10:30 PM RED NEWS REVERSAL',
        wrongDetail: 'Entering 18 minutes before red news leaves your open risk exposed to unpredictable news spikes.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21250, 18, 30, 'wick_respects_buy', false);
    return {
      id: 18,
      difficulty: 'medium',
      roundInTier: 3,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Pullback Wick Pierces Session Low, Body Respects',
      sessionBanner: '9:50 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 51.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'After breaking above the single descending BUY Breakout Line, the pullback wick dips below Session Low while its 15m body closes cleanly INSIDE above Session Low.',
      correctAction: 'BUY',
      ...g,
      feedback: {
        correctTitle: 'SESSION LOW REJECTION LONG // +3R HIT',
        correctDetail: 'Only the wick dipped beneath Session Low while the 15m candle body closed cleanly back above it—confirming buyers held support.',
        wrongTitle: 'CONFUSED A WICK POKE WITH A BODY CLOSE',
        wrongDetail: 'Check the candle body vs. the wick: because the 15m body respected Session Low, the post-breakout long setup remained valid.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21310, 18, 30, 'body_past_low_pass', false);
    return {
      id: 19,
      difficulty: 'medium',
      roundInTier: 4,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Pullback Body Closed Completely Past Session Low',
      sessionBanner: '9:55 PM NY Open — Clear',
      bannerTone: 'warning',
      rsiValue: 41.9,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single ascending SELL line breakdown extended too far, and the pullback candle body closed COMPLETELY BELOW the dashed Session Low line.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'SESSION LOW EXTENSION AVOIDED // 1R SAVED',
        correctDetail: 'When the pullback body closes completely past Session Low, sellers are chasing an already stretched move. Passing avoided the rebound.',
        wrongTitle: 'SOLD PAST SESSION LOW BOUNDARY',
        wrongDetail: 'Look at the Session Low dashed line: the pullback candle body closed completely below it, invalidating the short.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21380, 18, 45, 'buy_tight_half');
    return {
      id: 20,
      difficulty: 'medium',
      roundInTier: 5,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Moderate "RISKY" Session + Tight Pullback',
      sessionBanner: '9:50 PM — Moderate "RISKY" News Session',
      bannerTone: 'warning',
      rsiValue: 54.5,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Moderate "RISKY" news session. Price breaks cleanly above the upper BUY Breakout Line of the wedge, printing a tight, hesitant pullback candle.',
      correctAction: 'HALF_SIZE',
      halfDirection: 'BUY',
      ...g,
      feedback: {
        correctTitle: 'DISCIPLINED HALF SIZE (0.5R) // +1.5R BANKED',
        correctDetail: 'Cutting risk to 0.5R on a Moderate "RISKY" session with a tight wedge pullback honored both breakout structure and risk control.',
        wrongTitle: 'OVERSIZED OR SKIPPED A 0.5R WEDGE SETUP',
        wrongDetail: 'Moderate "RISKY" calendar days and tight hesitant pullbacks call for HALF SIZE (0.5R)—not full 1R risk and not sitting out.'
      }
    };
  })(),
  (() => {
    const g = buildSingleTrendlineBounceTrap(21460, 18, 45, 'resistance_bounce_pass');
    return {
      id: 21,
      difficulty: 'medium',
      roundInTier: 6,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Resistance Rejection Bounce (Waiting for BUY Break)',
      sessionBanner: '10:00 PM NY Session — Clear',
      bannerTone: 'clear',
      rsiValue: 44.1,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single descending resistance trendline (BUY Breakout Line): price rallies up to touch the line and rejects downward with upper wicks without breaking above it.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'NO BOUNCE SHORT TAKEN // 1R SAVED',
        correctDetail: 'We don\'t trade trendline bounces—we were waiting for an upside BUY breakout that didn\'t happen. Shorting the bounce failed immediately.',
        wrongTitle: 'TRADED A TRENDLINE REJECTION BOUNCE',
        wrongDetail: 'We never short rejections off a descending BUY Breakout Line—we only wait for a confirmed 15m body close ABOVE it.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21210, 19, 15, 'sell_win');
    return {
      id: 22,
      difficulty: 'medium',
      roundInTier: 7,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] 35 Mins Post-News Lower Line Breakdown',
      sessionBanner: '10:05 PM — 9:30 PM Red News Cleared (35m Passed)',
      bannerTone: 'clear',
      rsiValue: 43.2,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'It is 10:05 PM (35 minutes after 9:30 PM red news). Price snaps BELOW the lower SELL Breakout Line on a full bearish 15m body and retests cleanly.',
      correctAction: 'SELL',
      ...g,
      feedback: {
        correctTitle: 'POST-NEWS WEDGE SHORT // +3R HIT',
        correctDetail: 'The 30-minute post-news buffer elapsed cleanly, allowing the confirmed lower wedge breakdown and retest to pay +3R.',
        wrongTitle: 'MISSED CLEARED POST-NEWS WEDGE SHORT',
        wrongDetail: '35 minutes after the 9:30 PM news release is past the 30-minute wait rule; the wedge breakdown and retest were valid.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21490, 18, 30, 'fake_wick_upper_pass');
    return {
      id: 23,
      difficulty: 'medium',
      roundInTier: 8,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Upper Wick Poke (No Body Close Outside)',
      sessionBanner: '9:45 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 50.4,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Two 15m candles push wicks above the upper BUY Breakout Line of the wedge, yet both candle bodies close BACK INSIDE the wedge.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'UNCONFIRMED WEDGE BREAK SKIPPED // 1R SAVED',
        correctDetail: 'Without a 15m candle body closing outside the upper wedge line, there is no confirmed breakout. Passing saved you from the drop.',
        wrongTitle: 'BOUGHT AN UNCONFIRMED WEDGE WICK',
        wrongDetail: 'Wick pokes outside a wedge that close back inside are classic fakeouts—always require a full 15m body close above the line.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21340, 18, 45, 'wick_respects_sell', false);
    return {
      id: 24,
      difficulty: 'medium',
      roundInTier: 9,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Pullback Wick Pierces Session High, Body Respects',
      sessionBanner: '9:55 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 45.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'After a clean bearish breakdown below the single ascending SELL Breakout Line, the pullback wicks above Session High before closing its 15m body back below it.',
      correctAction: 'SELL',
      ...g,
      feedback: {
        correctTitle: 'SESSION HIGH REJECTION SHORT // +3R HIT',
        correctDetail: 'Because the pullback candle body closed cleanly back inside below Session High, resistance held and price dropped to +3R.',
        wrongTitle: 'SKIPPED VALID SESSION HIGH REJECTION',
        wrongDetail: 'A wick piercing Session High while the 15m body closes below it shows rejection, not invalidation.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21430, 18, 45, 'sell_tight_half');
    return {
      id: 25,
      difficulty: 'medium',
      roundInTier: 10,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Tight Pullback on Moderate Risky Session',
      sessionBanner: '10:00 PM — Moderate "RISKY" News Session',
      bannerTone: 'warning',
      rsiValue: 44.0,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Valid bearish body break below the lower SELL Breakout Line on a Moderate "RISKY" session, followed by a tight, hesitant pullback candle.',
      correctAction: 'HALF_SIZE',
      halfDirection: 'SELL',
      ...g,
      feedback: {
        correctTitle: 'HALF SIZE SHORT (0.5R) // +1.5R BANKED',
        correctDetail: 'Using HALF SIZE (0.5R) matched the Moderate "RISKY" calendar status and tight hesitant pullback without sacrificing discipline.',
        wrongTitle: 'WRONG RISK SIZING FOR MODERATE SESSION',
        wrongDetail: 'Valid breakdown during a Moderate "RISKY" session or tight hesitant pullback calls for HALF SIZE (0.5R).'
      }
    };
  })(),
  (() => {
    const g = buildExtremeRsiTrap(21510, 19, 0, 'overbought', false);
    return {
      id: 26,
      difficulty: 'medium',
      roundInTier: 11,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Overbought RSI Pullback Mirage (RSI 76.8)',
      sessionBanner: '10:15 PM NY Session — Clear',
      bannerTone: 'warning',
      rsiValue: 76.8,
      rsiStatus: 'OVERBOUGHT',
      setupSummary: 'Price clears a single resistance line after rallying 200 points, pushing RSI (14) to 76.8 Overbought.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'OVERBOUGHT EXHAUSTION AVOIDED // 1R SAVED',
        correctDetail: 'Passing when RSI sits at 76.8 kept you from buying the top right before a sharp pullback.',
        wrongTitle: 'BOUGHT AT OVERBOUGHT RSI (76.8)',
        wrongDetail: 'Do not initiate fresh buys when RSI is already Overbought (75+).'
      }
    };
  })(),
  (() => {
    const g = buildSingleTrendlineBounceTrap(21150, 18, 30, 'support_bounce_pass');
    return {
      id: 27,
      difficulty: 'medium',
      roundInTier: 12,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Ascending Support Bounce (Waiting for SELL Break)',
      sessionBanner: '9:50 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 52.6,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single ascending support line (SELL Breakout Line): price dips to touch the support trendline and bounces upward with lower wicks without breaking below it.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'NO BOUNCE LONG TAKEN // 1R SAVED',
        correctDetail: 'We don\'t trade trendline bounces—we were waiting for a downside SELL breakout that didn\'t happen. Passing protected you from the chop.',
        wrongTitle: 'BOUGHT AN ASCENDING SUPPORT BOUNCE',
        wrongDetail: 'Even when wicks look bullish off an ascending line, we don\'t trade bounces—wait for a confirmed SELL breakdown or skip.'
      }
    };
  })(),
  (() => {
    const g = buildChoppyRange(21390, 18, 30, false);
    return {
      id: 28,
      difficulty: 'medium',
      roundInTier: 13,
      mode: 'PRE_ENTRY',
      title: '[2-Line] USD Bank Holiday — Tight Wedge Mirage',
      sessionBanner: '9:45 PM — USD Bank Holiday — Low Volume',
      bannerTone: 'danger',
      rsiValue: 49.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Candles overlap sideways inside a tight 25-point range between two lines on a USD Bank Holiday with flat volume.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'BANK HOLIDAY AVOIDED // CAPITAL SAFE',
        correctDetail: 'Passing on a low-volume USD Bank Holiday prevented getting chopped up inside a dead range.',
        wrongTitle: 'CHOPPED IN BANK HOLIDAY RANGE',
        wrongDetail: 'Never trade USD Bank Holiday low-volume sessions—there is no follow-through.'
      }
    };
  })(),
  (() => {
    const g = buildSingleDescBreakout(21270, 19, 15, 'news_whipsaw');
    return {
      id: 29,
      difficulty: 'medium',
      roundInTier: 14,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Only 14 Minutes Since 9:30 PM Red News (Too Early)',
      sessionBanner: '9:44 PM — 9:30 PM Red News Only 14m Ago',
      bannerTone: 'danger',
      rsiValue: 52.1,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Red news released at 9:30 PM and it is only 9:44 PM (14 minutes later). Price pops above the single descending resistance line on lingering volatility.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: '30-MINUTE POST-NEWS RULE ENFORCED',
        correctDetail: 'Only 14 minutes had passed since 9:30 PM red news. Waiting the full 30 minutes saved you from the secondary aftershock.',
        wrongTitle: 'ENTERED BEFORE 30 MINUTES PASSED AFTER NEWS',
        wrongDetail: 'You must wait a full 30 minutes after red news drops (10:00 PM or later for 9:30 PM news) to avoid secondary whipsaws.'
      }
    };
  })(),
  (() => {
    const g = buildExtremeRsiTrap(21240, 19, 0, 'oversold', false);
    return {
      id: 30,
      difficulty: 'medium',
      roundInTier: 15,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Oversold RSI Trap After Extended Drop (RSI 23.5)',
      sessionBanner: '10:10 PM NY Session — Clear',
      bannerTone: 'warning',
      rsiValue: 23.5,
      rsiStatus: 'OVERSOLD',
      setupSummary: 'Sellers break lower after a steep decline, leaving RSI (14) stretched at 23.5 Oversold.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'OVERSOLD SHORT AVOIDED // 1R SAVED',
        correctDetail: 'Passing at RSI 23.5 kept you safe from the rapid mean-reversion rally.',
        wrongTitle: 'SHORTED AT OVERSOLD EXHAUSTION (RSI 23.5)',
        wrongDetail: 'Never sell into an Oversold RSI (25 or below)—wait for RSI to reset toward neutral first.'
      }
    };
  })(),

  /* =========================================================================
     HARD TIER — 20 ROUNDS (Multi-Factor Traps, 0.5R, Both Chart Types, Mode B)
     ========================================================================= */
  (() => {
    const g = buildManageTradeScenario(21300, 18, 30, 'BUY', 1.4, true);
    return {
      id: 31,
      difficulty: 'hard',
      roundInTier: 1,
      mode: 'MANAGE_TRADE',
      title: '[2-Line Wedge] Winning Long (+1.4R) Meets Overbought RSI 77.8',
      sessionBanner: '10:15 PM NY Session — Active Trade (+1.4R)',
      bannerTone: 'warning',
      rsiValue: 77.8,
      rsiStatus: 'OVERBOUGHT',
      setupSummary: 'You entered BUY at 21,340 after the wedge upper breakout (SL 21,300 · TP 21,460). Your trade floats +1.4R, and RSI (14) just hit 77.8 Overbought.',
      correctAction: 'MOVE_BE',
      ...g,
      feedback: {
        correctTitle: 'BREAKEVEN LOCKED (0R) // SAVED FROM -1R REVERSAL',
        correctDetail: 'Sliding your SL to Entry (21,340) as RSI hit 77.8 Overbought locked out all downside risk—the sharp pullback stopped you at 0R instead of -1R.',
        wrongTitle: 'GAVE BACK +1.4R AND TOOK A FULL LOSS',
        wrongDetail: 'When an open winner hits Overbought RSI (76+), always Move SL to Breakeven. Leaving the SL untouched or adding lots turned a +1.4R winner into a loss.'
      }
    };
  })(),
  (() => {
    const g = buildSingleDescBreakout(21470, 18, 45, 'tight_half');
    return {
      id: 32,
      difficulty: 'hard',
      roundInTier: 2,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Tight Hesitant Pullback Candle (Half Lot 0.5R)',
      sessionBanner: '9:55 PM NY Open — Clear',
      bannerTone: 'warning',
      rsiValue: 55.4,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single descending resistance breaks cleanly on a 15m body close, but the pullback candle is very tight and hesitant on compressed range.',
      correctAction: 'HALF_SIZE',
      halfDirection: 'BUY',
      ...g,
      feedback: {
        correctTitle: 'HALF LOT (0.5R) DISCIPLINE // +1.5R BANKED',
        correctDetail: 'Tight, hesitant pullbacks reduce stop-out margin. Entering with 0.5R captured the upside cleanly while capping potential risk.',
        wrongTitle: 'WRONG POSITION SIZING FOR TIGHT PULLBACK',
        wrongDetail: 'When a valid breakout prints a tight hesitant pullback candle, cut size to HALF SIZE (0.5R) to protect your drawdown.'
      }
    };
  })(),
  (() => {
    const g = buildManageTradeScenario(21250, 18, 45, 'SELL', 1.5, false);
    return {
      id: 33,
      difficulty: 'hard',
      roundInTier: 3,
      mode: 'MANAGE_TRADE',
      title: '[1-Line] Winning Short (+1.5R) Before 10:30 PM Red News',
      sessionBanner: '10:20 PM — Red News in 10 Mins (+1.5R Open)',
      bannerTone: 'danger',
      rsiValue: 36.2,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'You are short from 21,370 after the single-line breakdown (SL 21,410 · TP 21,250) floating +1.5R, and High-Impact Red News drops in 10 minutes at 10:30 PM.',
      correctAction: 'MOVE_BE',
      ...g,
      feedback: {
        correctTitle: 'PRE-NEWS BREAKEVEN LOCKED // CAPITAL PROTECTED',
        correctDetail: 'Moving SL to Entry before 10:30 PM Red News eliminated risk on your +1.5R trade—the news spike snapped back through entry and past original SL.',
        wrongTitle: 'HELD FULL RISK INTO RED NEWS SPIKE',
        wrongDetail: 'Never leave an open trade unprotected at original SL (or add lots) 10 minutes before Red News. Lock Breakeven immediately.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21370, 18, 30, 'fake_wick_upper_pass');
    return {
      id: 34,
      difficulty: 'hard',
      roundInTier: 4,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Subtle Upper Fake Wick (Body Closed Inside)',
      sessionBanner: '9:50 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 52.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Clear NY Open and neutral RSI. Price spikes an upper wick 30+ points above the upper BUY Breakout Line, yet the 15m body closes BACK INSIDE the wedge.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'BODY-CLOSE DISCIPLINE // FAKEOUT FILTERED',
        correctDetail: 'Even when RSI and news are clear, a candle body closing back inside the wedge invalidates the breakout.',
        wrongTitle: 'TRAPPED BY INCOMPLETE WEDGE BREAKOUT',
        wrongDetail: 'No matter how strong the wick looks, require a 15m candle body close outside the upper wedge line before committing risk.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21520, 19, 0, 'inside_bounce_upper_pass');
    return {
      id: 35,
      difficulty: 'hard',
      roundInTier: 5,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Upper Rejection Inside Wedge (No Breakout)',
      sessionBanner: '10:05 PM — 9:30 PM Red News Cleared (35m Passed)',
      bannerTone: 'clear',
      rsiValue: 51.3,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'News is cleared (35m passed) and RSI is neutral, but price rejects off the upper BUY line and compresses inside the wedge apex with NO body breakout.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'WEDGE APEX CHOP AVOIDED // 1R SAVED',
        correctDetail: 'Even with clear news and RSI, price stayed trapped inside the converging wedge without breaking either line. Passing avoided two-sided chop.',
        wrongTitle: 'FORCED AN ENTRY INSIDE AN UNBROKEN WEDGE',
        wrongDetail: 'We never trade bounces inside a wedge. Wait for a confirmed 15m body close above the upper line or below the lower line.'
      }
    };
  })(),
  (() => {
    const g = buildManageTradeScenario(21400, 19, 0, 'SELL', 1.6, true);
    return {
      id: 36,
      difficulty: 'hard',
      roundInTier: 6,
      mode: 'MANAGE_TRADE',
      title: '[2-Line Wedge] Winning Short (+1.6R) Hits Oversold RSI 22.8',
      sessionBanner: '10:25 PM NY Session — Active Short (+1.6R)',
      bannerTone: 'warning',
      rsiValue: 22.8,
      rsiStatus: 'OVERSOLD',
      setupSummary: 'Your SELL from 21,520 after the lower wedge breakdown (SL 21,560 · TP 21,400) floats +1.6R, and RSI (14) just dropped to 22.8 Oversold.',
      correctAction: 'MOVE_BE',
      ...g,
      feedback: {
        correctTitle: 'BREAKEVEN LOCKED AT OVERSOLD // RISK REMOVED',
        correctDetail: 'Moving SL to Entry when an active short hits RSI 22.8 Oversold prevented the snap-back rally from turning your +1.6R trade red.',
        wrongTitle: 'TOOK A FULL LOSS AFTER +1.6R PROFIT',
        wrongDetail: 'When RSI hits Oversold (24 or below) while in a winning short, move SL to Breakeven immediately—never add lots into exhaustion.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21480, 18, 30, 'body_past_high_pass', true);
    return {
      id: 37,
      difficulty: 'hard',
      roundInTier: 7,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Pullback Body Closed Completely Past Session High',
      sessionBanner: '9:55 PM NY Open — Clear',
      bannerTone: 'warning',
      rsiValue: 59.4,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Session is clear and RSI is 59.4. After breaking the upper wedge line, price surged so far that the pullback candle body closed COMPLETELY ABOVE Session High.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'BOUNDARY TRAP CAUGHT // 1R SAVED',
        correctDetail: 'Even with clear news and neutral RSI, a pullback body closing completely past Session High disqualifies the entry.',
        wrongTitle: 'IGNORED SESSION HIGH BOUNDARY',
        wrongDetail: 'Every rule must pass together. Because the pullback body closed completely above Session High, this setup was overextended.'
      }
    };
  })(),
  (() => {
    const g = buildSingleAscBreakdown(21310, 18, 45, 'tight_half');
    return {
      id: 38,
      difficulty: 'hard',
      roundInTier: 8,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Tight Pullback + Moderate Risky Session (0.5R)',
      sessionBanner: '9:55 PM — Moderate "RISKY" News Session',
      bannerTone: 'warning',
      rsiValue: 43.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single ascending support breaks cleanly on a bearish 15m body close, followed by a tight, compressed pullback candle during a Moderate "RISKY" news window.',
      correctAction: 'HALF_SIZE',
      halfDirection: 'SELL',
      ...g,
      feedback: {
        correctTitle: 'CONTROLLED HALF SIZE SHORT // +1.5R HIT',
        correctDetail: 'Sizing down to HALF SIZE (0.5R) honored the Moderate "RISKY" session and tight pullback candle while capturing the downward move.',
        wrongTitle: 'FULL 1R OR PASS WAS SUBOPTIMAL',
        wrongDetail: 'Valid trend breakdown + moderate risk + tight pullback = HALF SIZE (0.5R) execution.'
      }
    };
  })(),
  (() => {
    const g = buildExtremeRsiTrap(21560, 19, 0, 'overbought', false);
    return {
      id: 39,
      difficulty: 'hard',
      roundInTier: 9,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Borderline RSI Overbought Trap (RSI 75.6)',
      sessionBanner: '10:10 PM NY Session — Clear',
      bannerTone: 'warning',
      rsiValue: 75.6,
      rsiStatus: 'OVERBOUGHT',
      setupSummary: 'Clear NY session and clean pullback above a single resistance line, but RSI (14) sits at 75.6 Overbought.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'BORDERLINE RSI FILTER SAVED 1R',
        correctDetail: 'At 75.6 Overbought, upside room is exhausted. Passing kept you out of the immediate sharp pullback.',
        wrongTitle: 'CHASED AT RSI 75.6 OVERBOUGHT',
        wrongDetail: 'Do not bend the RSI rule at 75+. Exhausted momentum routinely snaps back into stops.'
      }
    };
  })(),
  (() => {
    const g = buildManageTradeScenario(21360, 18, 30, 'BUY', 1.3, false);
    return {
      id: 40,
      difficulty: 'hard',
      roundInTier: 10,
      mode: 'MANAGE_TRADE',
      title: '[1-Line] Winning Long (+1.3R) With Red News in 10 Mins',
      sessionBanner: '10:20 PM — Red News in 10 Mins (+1.3R Open)',
      bannerTone: 'danger',
      rsiValue: 64.5,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'You are long from 21,400 after the single-line breakout (SL 21,360 · TP 21,520) floating +1.3R, with High-Impact USD Red News scheduled in 10 minutes.',
      correctAction: 'MOVE_BE',
      ...g,
      feedback: {
        correctTitle: 'BREAKEVEN LOCKED BEFORE NEWS // 0R SAFE',
        correctDetail: 'Sliding your stop to Breakeven before 10:30 PM Red News protected your capital when the news candle reversed violently.',
        wrongTitle: 'EXPOSED +1.3R WINNER TO RED NEWS WHIPSAW',
        wrongDetail: 'When red news approaches within 10 minutes on an open winner, Move SL to Breakeven immediately.'
      }
    };
  })(),
  (() => {
    const g = buildSingleTrendlineBounceTrap(21260, 19, 15, 'resistance_bounce_pass');
    return {
      id: 41,
      difficulty: 'hard',
      roundInTier: 11,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Post-News Resistance Bounce Trap (No BUY Break)',
      sessionBanner: '10:08 PM — 9:30 PM Red News Cleared (38m Passed)',
      bannerTone: 'clear',
      rsiValue: 41.8,
      rsiStatus: 'NEUTRAL',
      setupSummary: '38 minutes after 9:30 PM red news, price tests the single descending BUY Breakout Line and prints upper rejection wicks downward without breaking above it.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'NO BOUNCE SHORT TAKEN // 1R SAVED',
        correctDetail: 'Even after news clears, we don\'t trade trendline bounces—we were waiting for an upside BUY breakout that didn\'t happen.',
        wrongTitle: 'SHORTED A DESCENDING TRENDLINE BOUNCE',
        wrongDetail: 'We don\'t trade trendline bounces—we were waiting for an upside BUY breakout above the descending line, which never closed outside.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21410, 18, 45, 'wick_respects_buy', true);
    return {
      id: 42,
      difficulty: 'hard',
      roundInTier: 12,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Breakout + Wick Pierces Session Low, Body Respects',
      sessionBanner: '9:55 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 50.9,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'After a full 15m body close above the upper BUY Breakout Line, the pullback wick dips below Session Low while the 15m candle body closes cleanly inside above it.',
      correctAction: 'BUY',
      ...g,
      feedback: {
        correctTitle: 'WEDGE BREAK + SESSION LOW RESPECT // +3R HIT',
        correctDetail: 'Because the 15m candle body respected Session Low on the post-breakout pullback, buyers drove price cleanly to +3R.',
        wrongTitle: 'MISSED VALID POST-BREAKOUT RETEST',
        wrongDetail: 'A wick poking past Session Low while the pullback body closes cleanly inside confirms support—not invalidation.'
      }
    };
  })(),
  (() => {
    const g = buildSingleFakeWickBreakout(21290, 18, 45, 'bear_trap');
    return {
      id: 43,
      difficulty: 'hard',
      roundInTier: 13,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Double Lower Wick Poke Below Support (No Body Close)',
      sessionBanner: '9:50 PM NY Open — Clear',
      bannerTone: 'clear',
      rsiValue: 46.7,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Single ascending support line: two consecutive 15m candles drop wicks underneath the SELL Breakout Line, yet both bodies recover to close back inside above support.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'DOUBLE BEAR TRAP FILTERED // 1R SAVED',
        correctDetail: 'Two lower wick pokes with zero bearish body close below the ascending line showed sellers could not hold the break.',
        wrongTitle: 'SHORTED UNCONFIRMED WICK POKES',
        wrongDetail: 'Always require at least one full 15m candle body close outside the trendline before looking for a pullback entry.'
      }
    };
  })(),
  (() => {
    const g = buildManageTradeScenario(21490, 19, 0, 'BUY', 1.6, true);
    return {
      id: 44,
      difficulty: 'hard',
      roundInTier: 14,
      mode: 'MANAGE_TRADE',
      title: '[2-Line Wedge] Winning Long (+1.6R) Reaches Overbought RSI 80.1',
      sessionBanner: '10:30 PM NY Session — Active Long (+1.6R)',
      bannerTone: 'warning',
      rsiValue: 80.1,
      rsiStatus: 'OVERBOUGHT',
      setupSummary: 'Your long at 21,530 from the wedge upper breakout (SL 21,490 · TP 21,650) is floating +1.6R, and RSI (14) just spiked to 80.1 Overbought.',
      correctAction: 'MOVE_BE',
      ...g,
      feedback: {
        correctTitle: 'BREAKEVEN LOCKED AT RSI 80.1 // 0R SAFE',
        correctDetail: 'Protecting your +1.6R position by moving SL to Entry eliminated all risk right before price reversed through your original stop.',
        wrongTitle: 'LEFT STOP UNPROTECTED AT RSI 80.1',
        wrongDetail: 'Extreme RSI (80+) on an active winner demands moving SL to Breakeven to guarantee zero loss.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21350, 18, 45, 'body_past_low_pass', true);
    return {
      id: 45,
      difficulty: 'hard',
      roundInTier: 15,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Pullback Body Closed Past Session Low',
      sessionBanner: '10:00 PM NY Session — Clear',
      bannerTone: 'warning',
      rsiValue: 40.5,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Following a sharp lower-line wedge breakdown, the pullback candle body closes COMPLETELY BELOW the horizontal Session Low line.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'SESSION LOW BOUNDARY RESPECTED // 1R SAVED',
        correctDetail: 'With the pullback body closing completely below Session Low, the short is overextended. Passing avoided the rebound.',
        wrongTitle: 'CHASED SHORT PAST SESSION LOW',
        wrongDetail: 'When the pullback candle body closes completely past Session Low, stand aside.'
      }
    };
  })(),
  (() => {
    const g = buildWedgeScenario(21540, 19, 15, 'buy_win');
    return {
      id: 46,
      difficulty: 'hard',
      roundInTier: 16,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] 31 Mins Post-News Upper Breakout & 50% Fib',
      sessionBanner: '10:01 PM — 9:30 PM Red News Cleared (31m Passed)',
      bannerTone: 'clear',
      rsiValue: 53.9,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Red news dropped at 9:30 PM and it is now 10:01 PM (31 minutes passed). Price closed a clean 15m body above the upper BUY Breakout Line and pulled back to 50% Fib.',
      correctAction: 'BUY',
      ...g,
      feedback: {
        correctTitle: '31-MIN POST-NEWS WEDGE LONG // +3R HIT',
        correctDetail: 'With 31 minutes passed after 9:30 PM red news and a textbook 50% Fib pullback above the broken upper wedge line, BUY delivered +3R.',
        wrongTitle: 'MISSED CLEARED POST-NEWS WEDGE LONG',
        wrongDetail: '31 minutes satisfies the 30-minute post-news rule; all wedge breakout confluences were aligned for BUY.'
      }
    };
  })(),
  (() => {
    const g = buildChoppyRange(21460, 18, 30, true);
    return {
      id: 47,
      difficulty: 'hard',
      roundInTier: 17,
      mode: 'PRE_ENTRY',
      title: '[2-Line] FOMC Rate Decision "DON\'T TRADE" Day Trap',
      sessionBanner: '9:35 PM — FOMC Rate Day (DON\'T TRADE)',
      bannerTone: 'danger',
      rsiValue: 50.0,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'Price looks calm inside a tight 2-line range before FOMC, but today is marked as a strict DON\'T TRADE day on the risk calendar.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'FOMC RULE FOLLOWED // 1R SAVED',
        correctDetail: 'FOMC days produce massive two-sided whipsaws. Passing preserved your account.',
        wrongTitle: 'CAUGHT IN FOMC RATE WHIPSAW',
        wrongDetail: 'Never trade on NFP, CPI, or FOMC DON\'T TRADE days.'
      }
    };
  })(),
  (() => {
    const g = buildSessionBoundarySetup(21280, 18, 45, 'wick_respects_sell', true);
    return {
      id: 48,
      difficulty: 'hard',
      roundInTier: 18,
      mode: 'PRE_ENTRY',
      title: '[2-Line Wedge] Breakdown + Wick Pierces Session High, Body Respects',
      sessionBanner: '10:05 PM NY Session — Clear',
      bannerTone: 'clear',
      rsiValue: 44.5,
      rsiStatus: 'NEUTRAL',
      setupSummary: 'After breaking below the lower SELL Breakout Line, a pullback wick pokes above Session High before the 15m candle body closes cleanly back below Session High.',
      correctAction: 'SELL',
      ...g,
      feedback: {
        correctTitle: 'WEDGE BREAK + SESSION HIGH RESPECT // +3R HIT',
        correctDetail: 'Because the 15m candle body closed inside below Session High, resistance held and price dropped cleanly to +3R.',
        wrongTitle: 'MISSED SESSION HIGH BODY-RESPECT SHORT',
        wrongDetail: 'Only a candle body closing past Session High invalidates the setup—a rejected wick confirms SELL.'
      }
    };
  })(),
  (() => {
    const g = buildExtremeRsiTrap(21330, 19, 0, 'oversold', false);
    return {
      id: 49,
      difficulty: 'hard',
      roundInTier: 19,
      mode: 'PRE_ENTRY',
      title: '[1-Line] Borderline Oversold Trap (RSI 24.4)',
      sessionBanner: '10:15 PM NY Session — Clear',
      bannerTone: 'warning',
      rsiValue: 24.4,
      rsiStatus: 'OVERSOLD',
      setupSummary: 'Bearish pullback forms below a single support line in a clear NY session, while RSI (14) already sits at 24.4 Oversold.',
      correctAction: 'PASS',
      ...g,
      feedback: {
        correctTitle: 'OVERSOLD FILTER SAVED 1R',
        correctDetail: 'Selling at RSI 24.4 invites a sharp relief bounce. Passing kept you safely flat.',
        wrongTitle: 'SOLD INTO OVERSOLD RSI (24.4)',
        wrongDetail: 'Avoid short entries when RSI is already Oversold (25 or lower).'
      }
    };
  })(),
  (() => {
    const g = buildManageTradeScenario(21540, 19, 0, 'SELL', 1.5, false);
    return {
      id: 50,
      difficulty: 'hard',
      roundInTier: 20,
      mode: 'MANAGE_TRADE',
      title: '[1-Line] Final Exam: Winning Short (+1.5R) Hits RSI 21.9 Oversold',
      sessionBanner: '10:30 PM NY Session — Active Short (+1.5R)',
      bannerTone: 'warning',
      rsiValue: 21.9,
      rsiStatus: 'OVERSOLD',
      setupSummary: 'Final round: Your short at 21,660 from the single-line breakdown (SL 21,700 · TP 21,540) floats +1.5R, and RSI (14) just dropped to 21.9 Oversold.',
      correctAction: 'MOVE_BE',
      ...g,
      feedback: {
        correctTitle: 'BREAKEVEN LOCKED (0R) // PERFECT RISK CONTROL',
        correctDetail: 'Moving SL to Breakeven at RSI 21.9 Oversold protected your account from the immediate bounce back through original SL.',
        wrongTitle: 'UNPROTECTED WINNER REVERSED TO LOSS',
        wrongDetail: 'When an active winner hits Oversold RSI (24 or below), always Move SL to Breakeven to lock risk at 0R.'
      }
    };
  })()
];

export function getScenariosByDifficulty(difficulty: SimulatorDifficulty): SimScenario[] {
  return SIMULATOR_SCENARIOS.filter((s) => s.difficulty === difficulty);
}

export interface SimulatorRankInfo {
  rank: string;
  label: string;
  colorClass: string;
  summary: string;
}

export function getSimulatorRank(correctCount: number, totalRounds: number): SimulatorRankInfo {
  const pct = totalRounds > 0 ? (correctCount / totalRounds) * 100 : 0;
  if (pct >= 85) {
    return {
      rank: 'S-RANK',
      label: 'MASTER EXECUTOR',
      colorClass: 'text-emerald-400',
      summary: 'Elite discipline across 1-line and 2-line wedge breakouts, no-bounce patience, RSI filters, news rules, and breakeven trade management.'
    };
  }
  if (pct >= 70) {
    return {
      rank: 'A-RANK',
      label: 'DISCIPLINED TRADER',
      colorClass: 'text-cyan-400',
      summary: 'Strong decision consistency. Review any missed bounce traps, news windows, or sizing calls to push into S-Rank.'
    };
  }
  if (pct >= 50) {
    return {
      rank: 'B-RANK',
      label: 'DEVELOPING TRADER',
      colorClass: 'text-amber-400',
      summary: 'Solid progress, though occasional bounce traps or sizing errors cost R. Focus on 15m body breakouts, RSI limits, and news buffers.'
    };
  }
  return {
    rank: 'C-RANK',
    label: 'REVIEW DESK RULES',
    colorClass: 'text-rose-400',
    summary: 'High exposure to rule-based traps. Revisit Phase 1 & Phase 2 modules on breakout-only rules, news timing, and risk sizing.'
  };
}
