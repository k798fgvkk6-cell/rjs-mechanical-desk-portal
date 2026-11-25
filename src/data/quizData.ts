export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface QuizSection {
  id: number;
  title: string;
  subtitle: string;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface QuizProgressState {
  passedSections: number[];
  bestScores: Record<number, number>;
}

export const QUIZ_PASSING_SCORE = 7;

export const QUIZ_SECTIONS: QuizSection[] = [
  {
    id: 1,
    title: 'News, Sessions & Market Conditions',
    subtitle: 'Section 1 of 4 · Session Timing, High-Impact News & Holiday Defense',
    passingScore: QUIZ_PASSING_SCORE,
    questions: [
      {
        id: 1,
        question: 'There is a high-impact USD news event at 10:30 PM, and you spot a clean breakout and pullback at 10:20 PM. What should you do?',
        options: [
          'A) Enter immediately with a tighter stop loss to catch the news spike',
          'B) Double your lot size since news brings high volume',
          'C) Wait 30 minutes and let the high-impact news finish so your position is safe from getting wicked out',
          'D) Enter now and remove your Stop Loss until 10:35 PM'
        ],
        correctIndex: 2
      },
      {
        id: 2,
        question: 'According to desk rules, what is the correct action on a major high-impact news day (e.g., NFP, CPI, FOMC) marked "DON\'T TRADE"?',
        options: [
          'A) Trade half lot size during the exact minute of the release',
          'B) Only take counter-trend scalp trades',
          'C) Freeze the desk, stand down, and protect your capital ("Go To Sleep")',
          'D) Trade every 5-minute breakout before the news drops'
        ],
        correctIndex: 2
      },
      {
        id: 3,
        question: 'If the calendar marks a session as "RISKY (0.5R)" due to moderate news volatility, how should you adjust your execution?',
        options: [
          'A) Use your normal 1R risk and aim for a 1:5 target',
          'B) Cut your risk in half (0.5R) and secure profits earlier (e.g., 1:1 or fast breakeven lock)',
          'C) Skip your Stop Loss so volatility doesn\'t tag you out',
          'D) Trade twice as many setups to make up for the smaller risk'
        ],
        correctIndex: 1
      },
      {
        id: 4,
        question: 'What happens to USTECH100 market conditions during a major USD Bank Holiday?',
        options: [
          'A) Volatility explodes and creates massive 1:5 trends',
          'B) Low impact means low volume, leading to choppy, slow, and unreliable price action',
          'C) Spreads tighten to zero and breakouts always follow through',
          'D) NY Cash Open moves two hours earlier'
        ],
        correctIndex: 1
      },
      {
        id: 5,
        question: 'Why do we strictly avoid holding or entering trades 10 minutes before a Tier-1 red news release?',
        options: [
          'A) Brokers close the USTECH100 market completely',
          'B) The RSI indicator stops updating during news',
          'C) Sudden spread widening and violent news wicks can stop out valid setups in seconds before direction is clear',
          'D) Pullbacks never happen after news releases'
        ],
        correctIndex: 2
      },
      {
        id: 6,
        question: 'What is the primary trading session we focus on at the desk?',
        options: [
          'A) Asian Session Open',
          'B) London Pre-Market',
          'C) 9:30 PM NY Cash Open (Manila / PHT)',
          'D) Friday Market Close'
        ],
        correctIndex: 2
      },
      {
        id: 7,
        question: 'A high-impact news release happens at 9:30 PM PHT. When is the earliest safe window to evaluate a clean post-news setup?',
        options: [
          'A) 9:31 PM (1 minute after release)',
          'B) 9:25 PM (5 minutes before release)',
          'C) Around 10:00 PM (after letting 30 minutes pass for volatility and spreads to settle)',
          'D) Never trade for the rest of the entire week'
        ],
        correctIndex: 2
      },
      {
        id: 8,
        question: 'You wake up on a USD Holiday and see USTECH100 barely moving inside a tight 15-point box. What should you do?',
        options: [
          'A) Force a breakout trade with heavy leverage',
          'B) Respect the low-volume holiday environment and stay out of the market',
          'C) Switch to the 1-minute chart and scalp every candle',
          'D) Widen your Stop Loss to 500 points'
        ],
        correctIndex: 1
      },
      {
        id: 9,
        question: 'When the desk calendar shows "TRADABLE (1R)", what does that authorize you to do?',
        options: [
          'A) Take 4 or 5 trades in the same session',
          'B) Execute your standard 1 setup with full 1R risk and disciplined target rules',
          'C) Ignore trendline and RSI rules because the day is green',
          'D) Move your Stop Loss further away if price goes against you'
        ],
        correctIndex: 1
      },
      {
        id: 10,
        question: 'Why is consistency in trading only the 9:30 PM NY Cash Open critical for traders?',
        options: [
          'A) It guarantees a 100% win rate every single month',
          'B) It provides the real market volume and clean structure needed for valid breakouts and pullbacks',
          'C) News never occurs during the NY Cash Open',
          'D) USTECH100 only moves in one direction at 9:30 PM'
        ],
        correctIndex: 1
      }
    ]
  },
  {
    id: 2,
    title: 'Trendlines, Breakouts & Candle Anatomy',
    subtitle: 'Section 2 of 4 · 15-Minute Structure Confirmation & Wick Filtering',
    passingScore: QUIZ_PASSING_SCORE,
    questions: [
      {
        id: 11,
        question: 'Why do we avoid using the 1-minute timeframe to confirm a trendline breakout?',
        options: [
          'A) 1-minute charts do not display wicks',
          'B) Brokers block trades taken after 1-minute candles',
          'C) Low timeframes have too much noise and fake spikes that trick traders into bad entries',
          'D) 1-minute candles never reach Take Profit'
        ],
        correctIndex: 2
      },
      {
        id: 12,
        question: 'What visually defines a valid, solid breakout of a trendline?',
        options: [
          'A) A long candle wick poking through the trendline while the body closes back inside',
          'B) The full candle body closing clearly outside of the trendline',
          'C) Price touching the trendline without crossing it',
          'D) A doji candle sitting directly on top of the line'
        ],
        correctIndex: 1
      },
      {
        id: 13,
        question: 'Price spikes past your trendline with a long wick, but the 15-minute candle body closes back inside the trendline. What is this?',
        options: [
          'A) A confirmed breakout ready for immediate entry',
          'B) A fake break (wick rejection), which is a bad signal to enter',
          'C) A guaranteed 1:3 reversal setup',
          'D) A valid pullback entry'
        ],
        correctIndex: 1
      },
      {
        id: 14,
        question: 'After a solid 15-minute candle body breakout occurs, what is the next step before entering?',
        options: [
          'A) Chase the breakout candle at the very top/bottom immediately',
          'B) Wait patiently for a controlled pullback candle to retest the broken structure',
          'C) Enter in the opposite direction immediately',
          'D) Close your charts for the day'
        ],
        correctIndex: 1
      },
      {
        id: 15,
        question: 'You draw a trendline, and price slices back and forth through it repeatedly without reacting. What does this tell you?',
        options: [
          'A) The trendline is extra strong',
          'B) Price is not respecting the trendline—the structure is invalid and bad to trade',
          'C) You should enter immediately with double risk',
          'D) Switch to a smaller timeframe until it looks good'
        ],
        correctIndex: 1
      },
      {
        id: 16,
        question: 'Why is chasing a massive breakout candle without waiting for a pullback dangerous?',
        options: [
          'A) Brokers reject market orders during breakouts',
          'B) Your Stop Loss becomes too wide, ruining your R:R and exposing you to immediate pullback drawdown',
          'C) Breakouts never pull back on USTECH100',
          'D) It violates the 30-minute news rule'
        ],
        correctIndex: 1
      },
      {
        id: 17,
        question: 'What makes a 15-minute candle close superior to a 1-minute candle close when judging a trendline break?',
        options: [
          'A) 15-minute candles never have wicks',
          'B) It filters out low-timeframe noise and false spikes, proving real directional commitment',
          'C) 1-minute candles do not show price accurately',
          'D) 15-minute candles always hit 1:3 TP within 5 minutes'
        ],
        correctIndex: 1
      },
      {
        id: 18,
        question: 'During a bullish breakout above resistance, a candle closes above the zone, followed by a pullback candle that looks tight and hesitant right near the level. What is this?',
        options: [
          'A) A guaranteed 1:5 home-run trade',
          'B) A tight situation that may require me to cut my lot size in half',
          'C) An automatic reason to double my risk',
          'D) A signal to remove my Stop Loss'
        ],
        correctIndex: 1
      },
      {
        id: 19,
        question: 'If a breakout candle has a tiny body and a massive rejection wick pointing in the direction of the break, what should you do?',
        options: [
          'A) Enter right away before price leaves without you',
          'B) Wait for another candle to have a better confirmation of a breakout',
          'C) Set a 1:5 Take Profit',
          'D) Ignore the wick and look only at the color of the candle'
        ],
        correctIndex: 1
      },
      {
        id: 20,
        question: 'What candle timeframe breakout is best to look for?',
        options: [
          'A) 1-minute candle breakout',
          'B) 3-minute candle breakout',
          'C) 15-minute candle breakout',
          'D) 30-second candle breakout'
        ],
        correctIndex: 2
      }
    ]
  },
  {
    id: 3,
    title: 'Pullbacks, Fibonacci, Session High/Low & RSI',
    subtitle: 'Section 3 of 4 · Technical Confluence, Retests & Target Logic',
    passingScore: QUIZ_PASSING_SCORE,
    questions: [
      {
        id: 21,
        question: 'Price breaks a level and pulls back to retest the Session High or Session Low. When is that pullback considered INVALID (wrong)?',
        options: [
          'A) When only a candle wick briefly taps past the session level and rejects',
          'B) When a pullback candle body closes completely past/through the session high or low, failing to respect it',
          'C) When the pullback happens on a 15-minute chart',
          'D) When the pullback aligns with the Fibonacci zone'
        ],
        correctIndex: 1
      },
      {
        id: 22,
        question: 'During a pullback retest of a Session High/Low, a candle wick briefly pokes beyond the level, but the candle body closes back on the respected side. Is the setup still valid?',
        options: [
          'A) No, any wick touch invalidates the entire day',
          'B) Yes—a wick pierce is acceptable as long as the candle body respects the session level',
          'C) Only if it happens on a USD holiday',
          'D) Only if RSI is above 90'
        ],
        correctIndex: 1
      },
      {
        id: 23,
        question: 'When price breaks out and pulls back, what should you see with your Fibonacci and trendline before trusting the setup?',
        options: [
          'A) Price ignoring both levels and chopping sideways',
          'B) Price cleanly respecting the Fibonacci level and the trendline together',
          'C) Price breaking all the way back past the starting point of the move',
          'D) Candles with massive wicks slicing through every level'
        ],
        correctIndex: 1
      },
      {
        id: 24,
        question: 'You spot a bullish breakout and pullback, and you are about to click BUY—but you check the RSI and see it is already deeply Overbought. What is the right decision?',
        options: [
          'A) Buy anyway because overbought means extra strong momentum',
          'B) Do NOT enter—buying when RSI is already overbought exposes you to an immediate exhaustion reversal',
          'C) Sell immediately without a Stop Loss',
          'D) Switch to a chart without RSI'
        ],
        correctIndex: 1
      },
      {
        id: 25,
        question: 'Similarly, you see a bearish breakdown setup, and RSI is already sitting in Oversold territory. Why is entering a SELL here wrong?',
        options: [
          'A) Oversold means price is guaranteed to drop another 500 points',
          'B) Selling at the bottom into oversold conditions means the move is already extended and likely to bounce against you',
          'C) RSI only works on Forex pairs, not USTECH100',
          'D) Oversold signals only apply to Take Profit targets'
        ],
        correctIndex: 1
      },
      {
        id: 26,
        question: 'Where should your Take Profit (TP) target be placed on a valid setup?',
        options: [
          'A) 1,000 points away so you only need one win a year',
          'B) At a realistic, logical structural level (e.g., 1:1 to 1:3) rather than an unrealistic, overly distant target',
          'C) Beyond the weekly range during low volume',
          'D) Remove TP completely and hope for a miracle runner'
        ],
        correctIndex: 1
      },
      {
        id: 27,
        question: 'Why is setting an unrealistic, overly far Take Profit target considered a major mistake?',
        options: [
          'A) Brokers charge extra commission for far TPs',
          'B) Price is likely to stall at logical session/structural levels and reverse back to hit your Stop Loss before ever reaching an unrealistic target',
          'C) Far TPs automatically turn into Stop Losses',
          'D) It lowers your RSI reading'
        ],
        correctIndex: 1
      },
      {
        id: 28,
        question: 'When Session High/Low, Fibonacci retracement, and Trendline retest all align at the same price zone with neutral RSI, what do you have?',
        options: [
          'A) A low-probability gamble',
          'B) A high-confluence A+ setup',
          'C) A fake breakout signal',
          'D) A reason to skip the trade'
        ],
        correctIndex: 1
      },
      {
        id: 29,
        question: 'A pullback candle closes cleanly at the Fibonacci zone right on top of a broken trendline, and RSI has cooled off from overbought back to neutral. What is your move?',
        options: [
          'A) Wait for 10:30 PM red news first',
          'B) Execute the trade with your fixed 1R Stop Loss and realistic structural Take Profit',
          'C) Enter with 5x normal risk',
          'D) Short the market instead'
        ],
        correctIndex: 1
      },
      {
        id: 30,
        question: 'If price approaches your entry zone, fails to respect both the trendline and the Fibonacci level, and shows erratic wicks, what should you do?',
        options: [
          'A) Enter with a smaller target',
          'B) Walk away—when price disrespects key technical levels, there is no edge',
          'C) Average down as price drops',
          'D) Turn off your Stop Loss'
        ],
        correctIndex: 1
      }
    ]
  },
  {
    id: 4,
    title: 'Trading Psychology, Risk Discipline & Execution Habits',
    subtitle: 'Section 4 of 4 · Capital Preservation, Emotional Control & Data Audits',
    passingScore: QUIZ_PASSING_SCORE,
    questions: [
      {
        id: 31,
        question: 'You take your planned setup during the NY session and it cleanly hits your Stop Loss (-1R). Ten minutes later, you feel the urge to jump back into another trade right away. What is the rule?',
        options: [
          'A) Take a second trade immediately to recover the -1R before bed',
          'B) Stop for the day—entering another trade the same day because you lost the first one is revenge trading and strictly wrong',
          'C) Switch to 1-minute scalping until you are back to breakeven',
          'D) Double your lot size on the next candle'
        ],
        correctIndex: 1
      },
      {
        id: 32,
        question: 'Yesterday you took a -1R loss (-₱1,000). Today, you think about risking 2R (-₱2,000) so one win covers yesterday\'s loss plus profit. Why is this wrong?',
        options: [
          'A) It is actually the best way to grow a small account',
          'B) Oversizing your trade to make back a previous day\'s loss breaks risk management and leads to emotional blowups',
          'C) Brokers ban accounts that risk 2R',
          'D) Oversizing makes your Take Profit hit faster'
        ],
        correctIndex: 1
      },
      {
        id: 33,
        question: 'You look at the chart and see a potential setup, but something feels off—the candles are messy and you don\'t truly trust the setup. What should you do?',
        options: [
          'A) Enter anyway because you might miss a move (FOMO)',
          'B) Do NOT enter—if you don\'t trust the setup 100%, skip it and preserve mental and financial capital',
          'C) Enter with half your screen covered',
          'D) Ask someone else to click buy for you'
        ],
        correctIndex: 1
      },
      {
        id: 34,
        question: 'Why do we enforce a strict fixed 1R risk per trade regardless of how "confident" you feel?',
        options: [
          'A) Because every trade has the exact same outcome',
          'B) Because any single trade can lose; fixed risk ensures a normal losing streak never damages your account',
          'C) Because larger lot sizes don\'t work on USTECH100',
          'D) To prevent you from ever reaching your ₱10,000 milestone'
        ],
        correctIndex: 1
      },
      {
        id: 35,
        question: 'What is the difference between a disciplined loss (-1R) and a bad trade?',
        options: [
          'A) There is no difference—all losses mean you failed',
          'B) A disciplined loss followed every rule (valid structure, no news, proper 1R risk); a bad trade broke rules (revenge trading, chasing wicks, oversizing)',
          'C) A disciplined loss has no Stop Loss',
          'D) A bad trade is any trade that only hits 1:1 instead of 1:3'
        ],
        correctIndex: 1
      },
      {
        id: 36,
        question: 'You missed a clean 1:3 move because you were late to the desk, and now price is already far away from the pullback zone. What is the correct response?',
        options: [
          'A) Chase the move at market price with a random Stop Loss',
          'B) Accept that the trade left without you and wait patiently for the next valid session',
          'C) Short the top hoping for a crash',
          'D) Enter 3 back-to-back trades to catch up'
        ],
        correctIndex: 1
      },
      {
        id: 37,
        question: 'How does logging every closed trade honestly in your Trading Logs improve your trading?',
        options: [
          'A) It magically changes losing trades into winning trades',
          'B) It exposes your true R:R, win rate, and rule compliance over a 20-trade block so you trade data instead of emotion',
          'C) It locks your broker terminal',
          'D) It predicts tomorrow\'s news releases'
        ],
        correctIndex: 1
      },
      {
        id: 38,
        question: 'Which combination of factors represents a STRICT "NO TRADE" environment?',
        options: [
          'A) Tradable day, 15m body breakout, clean pullback, neutral RSI',
          'B) High-impact red news in 10 minutes, fake wick breakout, overbought RSI, and feeling frustrated from yesterday\'s loss',
          'C) NY Cash Open, respected session low wick rejection, Fibonacci confluence',
          'D) Calm post-news market with a clear 1:2 structural target'
        ],
        correctIndex: 1
      },
      {
        id: 39,
        question: 'If a trade hits 1:1 and your rules or risky-day rules call for securing the win or locking breakeven, what is the right mindset?',
        options: [
          'A) Feel disappointed that it wasn\'t 1:5',
          'B) Respect the rules—a disciplined 1:1 win (+1R) builds your equity curve steadily',
          'C) Cancel your Stop Loss and let it float',
          'D) Immediately open a second position'
        ],
        correctIndex: 1
      },
      {
        id: 40,
        question: 'What is the ultimate goal of our trading desk process?',
        options: [
          'A) Predicting every single tick of USTECH100',
          'B) Zero emotional interference—executing repeatable, high-probability setups with strict risk control and discipline',
          'C) Trading 24 hours a day across every currency pair',
          'D) Winning 100% of trades without ever taking a Stop Loss'
        ],
        correctIndex: 1
      }
    ]
  }
];

export function extractLessonIdsFromCloud(rawList: unknown): string[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(
    (item): item is string =>
      typeof item === 'string' && !item.startsWith('quiz_') && !item.startsWith('phase_current_')
  );
}

export function extractQuizProgressFromCloud(rawList: unknown): QuizProgressState {
  const passedSet = new Set<number>();
  const bestScores: Record<number, number> = {};

  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item !== 'string') continue;
      const match = /^quiz_s([1-4])_(\d+)$/.exec(item);
      if (match) {
        const secId = Number(match[1]);
        const score = Number(match[2]);
        bestScores[secId] = Math.max(bestScores[secId] ?? 0, score);
        if (score >= QUIZ_PASSING_SCORE) {
          passedSet.add(secId);
        }
      }
    }
  }

  return {
    passedSections: Array.from(passedSet).sort((a, b) => a - b),
    bestScores
  };
}

export function mergeQuizProgress(a: QuizProgressState, b: QuizProgressState): QuizProgressState {
  const bestScores: Record<number, number> = { ...a.bestScores };
  for (const [k, v] of Object.entries(b.bestScores)) {
    const secId = Number(k);
    bestScores[secId] = Math.max(bestScores[secId] ?? 0, Number(v) || 0);
  }
  const passedSet = new Set<number>([...a.passedSections, ...b.passedSections]);
  for (const [k, v] of Object.entries(bestScores)) {
    if (Number(v) >= QUIZ_PASSING_SCORE) {
      passedSet.add(Number(k));
    }
  }
  return {
    passedSections: Array.from(passedSet).sort((aNum, bNum) => aNum - bNum),
    bestScores
  };
}

export function mergeQuizTokensIntoCloudLessons(existingCloud: unknown, progress: QuizProgressState): string[] {
  const lessonOnly = extractLessonIdsFromCloud(existingCloud);
  const phaseToken =
    Array.isArray(existingCloud) && existingCloud.includes('phase_current_2')
      ? ['phase_current_2']
      : Array.isArray(existingCloud) && existingCloud.includes('phase_current_1')
      ? ['phase_current_1']
      : [];
  const quizTokens: string[] = [];
  for (const secId of [1, 2, 3, 4]) {
    const score = progress.bestScores[secId];
    const isPassed = progress.passedSections.includes(secId);
    if (typeof score === 'number' || isPassed) {
      const effectiveScore = Math.max(typeof score === 'number' ? score : 0, isPassed ? QUIZ_PASSING_SCORE : 0);
      quizTokens.push(`quiz_s${secId}_${effectiveScore}`);
    }
  }
  return [...lessonOnly, ...quizTokens, ...phaseToken];
}

export function mergeCurrentPhaseIntoCloudLessons(existingCloud: unknown, phase: 1 | 2): string[] {
  const base = Array.isArray(existingCloud)
    ? existingCloud.filter((item): item is string => typeof item === 'string' && !item.startsWith('phase_current_'))
    : [];
  return [...base, `phase_current_${phase}`];
}
