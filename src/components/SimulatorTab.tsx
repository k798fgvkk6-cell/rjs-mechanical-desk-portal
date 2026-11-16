import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Trophy,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Scale,
  Lock,
  PlusCircle,
  PauseCircle
} from 'lucide-react';
import {
  SimulatorAction,
  SimulatorDifficulty,
  SimulatorTierStats,
  SimScenario,
  getScenariosByDifficulty,
  getSimulatorRank
} from '../data/simulatorData';

interface RoundHistoryItem {
  round: number;
  title: string;
  mode: string;
  userAction: SimulatorAction;
  correctAction: SimulatorAction;
  isCorrect: boolean;
  pointsDelta: number;
}

interface SimulatorTabProps {
  studentId?: string;
  isBrightMode: boolean;
  isPhase2Unlocked: boolean;
  tierStats: SimulatorTierStats;
  onUpdateTierStats: (difficulty: SimulatorDifficulty, score: number, bestStreak: number, correctCount: number) => void;
  onPlayTone: (freq?: number, type?: OscillatorType, duration?: number) => void;
  onPlaySuccess: () => void;
  onPlayError: () => void;
}

const ACTION_LABELS: Record<SimulatorAction, string> = {
  BUY: 'BUY (1R)',
  SELL: 'SELL (1R)',
  HALF_SIZE: 'HALF SIZE (0.5R)',
  PASS: 'PASS / NO TRADE',
  MOVE_BE: 'MOVE SL TO BREAKEVEN',
  HOLD_SL: 'LET IT PLAY OUT',
  ADD_LOTS: 'ADD MORE LOTS'
};

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  studentId,
  isBrightMode,
  isPhase2Unlocked,
  tierStats,
  onUpdateTierStats,
  onPlayTone,
  onPlaySuccess,
  onPlayError
}) => {
  const [difficulty, setDifficulty] = useState<SimulatorDifficulty>('easy');
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [userAction, setUserAction] = useState<SimulatorAction | null>(null);
  const [revealedFutureCount, setRevealedFutureCount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [roundComplete, setRoundComplete] = useState<boolean>(false);
  const [lastPointsDelta, setLastPointsDelta] = useState<number>(0);
  const [history, setHistory] = useState<RoundHistoryItem[]>([]);
  const [showFinalSummary, setShowFinalSummary] = useState<boolean>(false);
  const [beatHighScoreThisRun, setBeatHighScoreThisRun] = useState<boolean>(false);
  const [animatedSlPrice, setAnimatedSlPrice] = useState<number | null>(null);
  const [slLockedAtBe, setSlLockedAtBe] = useState<boolean>(false);
  const [tierLockedNotice, setTierLockedNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const tierScenarios = getScenariosByDifficulty(difficulty);
  const scenario: SimScenario = tierScenarios[roundIndex] || tierScenarios[0];
  const currentTierBest = tierStats[difficulty]?.highScore || 0;

  const clearTimers = () => {
    if (animTimerRef.current !== null) {
      window.clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    handleRestartGame(false, 'easy');
    setTierLockedNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    if (!isPhase2Unlocked && difficulty !== 'easy') {
      handleRestartGame(false, 'easy');
    }
    if (isPhase2Unlocked) {
      setTierLockedNotice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhase2Unlocked]);

  const drawCandlestickChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(340, Math.floor(rect.height));

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const bgColor = isBrightMode ? '#ffffff' : '#070a12';
    const gridColor = isBrightMode ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.09)';
    const axisTextColor = isBrightMode ? '#475569' : '#94a3b8';
    const dividerColor = isBrightMode ? 'rgba(15, 23, 42, 0.2)' : 'rgba(148, 163, 184, 0.25)';
    const futureZoneBg = isBrightMode ? 'rgba(241, 245, 249, 0.65)' : 'rgba(15, 23, 42, 0.38)';
    const bullColor = isBrightMode ? '#059669' : '#10b981';
    const bearColor = isBrightMode ? '#e11d48' : '#f43f5e';
    const trendlineBuyColor = isBrightMode ? '#0284c7' : '#38bdf8';
    const trendlineSellColor = isBrightMode ? '#ea580c' : '#fb923c';
    const fibColor = isBrightMode ? '#6366f1' : '#818cf8';
    const sessionLineColor =
      scenario.sessionLevel.type === 'high'
        ? isBrightMode
          ? '#d97706'
          : '#f59e0b'
        : isBrightMode
        ? '#7c3aed'
        : '#a78bfa';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const padLeft = 16;
    const padRight = 76;
    const padTop = 28;
    const padBottom = 34;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const totalSlots = scenario.setupCandles.length + scenario.futureCandles.length;
    const visibleCandles = [
      ...scenario.setupCandles,
      ...scenario.futureCandles.slice(0, revealedFutureCount)
    ];

    const allPrices: number[] = [scenario.sessionLevel.price, scenario.trendline.y1, scenario.trendline.y2];
    if (scenario.secondaryTrendline) {
      allPrices.push(scenario.secondaryTrendline.y1, scenario.secondaryTrendline.y2);
    }
    if (scenario.fibZone) allPrices.push(scenario.fibZone.price);
    visibleCandles.forEach((c) => {
      allPrices.push(c.high, c.low);
    });

    if (scenario.mode === 'MANAGE_TRADE' && scenario.activePosition) {
      allPrices.push(
        scenario.activePosition.entry,
        scenario.activePosition.initialSl,
        scenario.activePosition.tp
      );
    } else if (userAction === 'BUY' && scenario.buyLevel) {
      allPrices.push(scenario.buyLevel.sl, scenario.buyLevel.tp);
    } else if (userAction === 'SELL' && scenario.sellLevel) {
      allPrices.push(scenario.sellLevel.sl, scenario.sellLevel.tp);
    } else if (userAction === 'HALF_SIZE') {
      const dir =
        scenario.halfDirection ||
        (scenario.correctAction === 'SELL' ? 'SELL' : 'BUY');
      const lvl = dir === 'SELL' ? scenario.sellLevel : scenario.buyLevel;
      if (lvl) allPrices.push(lvl.sl, lvl.tp);
    }

    const rawMin = Math.min(...allPrices);
    const rawMax = Math.max(...allPrices);
    const rawSpan = Math.max(20, rawMax - rawMin);
    const priceMin = rawMin - rawSpan * 0.12;
    const priceMax = rawMax + rawSpan * 0.14;
    const priceSpan = priceMax - priceMin;

    const slotWidth = plotWidth / totalSlots;
    const xAt = (idx: number) => padLeft + (idx + 0.5) * slotWidth;
    const yAt = (price: number) => padTop + ((priceMax - price) / priceSpan) * plotHeight;

    const decisionBoundaryX = padLeft + scenario.setupCandles.length * slotWidth;
    ctx.fillStyle = futureZoneBg;
    ctx.fillRect(decisionBoundaryX, padTop, padLeft + plotWidth - decisionBoundaryX, plotHeight);

    // Price Grid & Axis
    const gridSteps = 5;
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= gridSteps; g++) {
      const ratio = g / gridSteps;
      const y = padTop + ratio * plotHeight;
      const pVal = priceMax - ratio * priceSpan;

      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotWidth, y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = axisTextColor;
      ctx.textAlign = 'left';
      ctx.fillText(Math.round(pVal).toLocaleString(), padLeft + plotWidth + 8, y);
    }

    // Decision Point Vertical Divider
    ctx.save();
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(decisionBoundaryX, padTop);
    ctx.lineTo(decisionBoundaryX, padTop + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = axisTextColor;
    ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      scenario.mode === 'MANAGE_TRADE' ? 'MANAGEMENT POINT' : 'DECISION POINT',
      decisionBoundaryX,
      padTop - 11
    );
    ctx.restore();

    // Optional Fibonacci Zone Dashed Line
    if (scenario.fibZone) {
      const fibY = yAt(scenario.fibZone.price);
      if (fibY >= padTop && fibY <= padTop + plotHeight) {
        ctx.save();
        ctx.strokeStyle = fibColor;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, fibY);
        ctx.lineTo(padLeft + plotWidth, fibY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = fibColor;
        ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(scenario.fibZone.label, padLeft + plotWidth - 8, fibY - 8);
        ctx.restore();
      }
    }

    // Horizontal Session High / Low Dashed Line
    const sessionY = yAt(scenario.sessionLevel.price);
    ctx.save();
    ctx.strokeStyle = sessionLineColor;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(padLeft, sessionY);
    ctx.lineTo(padLeft + plotWidth, sessionY);
    ctx.stroke();
    ctx.setLineDash([]);

    const sessLabel = scenario.sessionLevel.label;
    ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    const sessLabelW = ctx.measureText(sessLabel).width + 14;
    const tagY = Math.max(padTop + 10, Math.min(padTop + plotHeight - 10, sessionY - 12));
    ctx.fillStyle = isBrightMode ? 'rgba(255, 255, 255, 0.94)' : 'rgba(11, 16, 27, 0.92)';
    ctx.strokeStyle = sessionLineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(padLeft + 6, tagY - 9, sessLabelW, 18, 4);
    else ctx.rect(padLeft + 6, tagY - 9, sessLabelW, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sessionLineColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sessLabel, padLeft + 13, tagY);
    ctx.restore();

    // Diagonal Trendline(s): 1-Line Breakout OR 2-Line Converging Wedge
    const maxDrawIdx = scenario.setupCandles.length - 0.25;
    const computeExtendedEnd = (tl: typeof scenario.trendline) => {
      const dx = tl.x2Index - tl.x1Index;
      const dy = tl.y2 - tl.y1;
      const extEndIdx = Math.min(maxDrawIdx, tl.x2Index + 1.5);
      const extFactor = dx !== 0 ? (extEndIdx - tl.x1Index) / dx : 1;
      return {
        extEndIdx,
        extY2: tl.y1 + dy * extFactor
      };
    };

    const primaryExt = computeExtendedEnd(scenario.trendline);
    if (scenario.secondaryTrendline) {
      const secondaryExt = computeExtendedEnd(scenario.secondaryTrendline);
      ctx.save();
      ctx.fillStyle = isBrightMode ? 'rgba(2, 132, 199, 0.05)' : 'rgba(56, 189, 248, 0.045)';
      ctx.beginPath();
      ctx.moveTo(xAt(scenario.trendline.x1Index), yAt(scenario.trendline.y1));
      ctx.lineTo(xAt(primaryExt.extEndIdx), yAt(primaryExt.extY2));
      ctx.lineTo(xAt(secondaryExt.extEndIdx), yAt(secondaryExt.extY2));
      ctx.lineTo(xAt(scenario.secondaryTrendline.x1Index), yAt(scenario.secondaryTrendline.y1));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const drawSingleTrendline = (tl: typeof scenario.trendline, labelBelow: boolean) => {
      const { extEndIdx, extY2 } = computeExtendedEnd(tl);
      const lineColor = tl.role === 'sell_breakout' ? trendlineSellColor : trendlineBuyColor;

      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xAt(tl.x1Index), yAt(tl.y1));
      ctx.lineTo(xAt(extEndIdx), yAt(extY2));
      ctx.stroke();

      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(xAt(tl.x1Index), yAt(tl.y1), 3, 0, Math.PI * 2);
      ctx.arc(xAt(tl.x2Index), yAt(tl.y2), 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.textAlign = 'left';
      const labelY = labelBelow
        ? Math.min(padTop + plotHeight - 8, yAt(tl.y1) + 12)
        : Math.max(padTop + 10, yAt(tl.y1) - 10);
      ctx.fillText(tl.label, xAt(tl.x1Index) + 4, labelY);
      ctx.restore();
    };

    drawSingleTrendline(scenario.trendline, false);
    if (scenario.secondaryTrendline) {
      drawSingleTrendline(scenario.secondaryTrendline, true);
    }

    // Mode B: Active Position Entry / TP / Animated Stop Loss Lines across chart (from candle 7 onward)
    if (scenario.mode === 'MANAGE_TRADE' && scenario.activePosition) {
      const pos = scenario.activePosition;
      const startX = xAt(7);
      const currentSl = animatedSlPrice !== null ? animatedSlPrice : pos.initialSl;

      const drawGuide = (
        price: number,
        label: string,
        color: string,
        lineWidth = 1.5,
        dashed = true,
        labelBelow = false
      ) => {
        const ly = yAt(price);
        if (ly < padTop || ly > padTop + plotHeight) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (dashed) ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, ly);
        ctx.lineTo(padLeft + plotWidth, ly);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(label, padLeft + plotWidth - 8, labelBelow ? ly + 9 : ly - 8);
        ctx.restore();
      };

      drawGuide(pos.tp, `TP (+3R) · ${pos.tp.toLocaleString()}`, bullColor, 1.4, true, false);
      drawGuide(
        pos.entry,
        `ENTRY (${pos.direction}) · ${pos.entry.toLocaleString()}`,
        isBrightMode ? '#334155' : '#cbd5e1',
        1.5,
        true,
        false
      );

      const slTag = slLockedAtBe
        ? `SL LOCKED AT BREAKEVEN (0R) · ${Math.round(currentSl).toLocaleString()}`
        : userAction === 'ADD_LOTS'
        ? `SL (2x RISK!) · ${Math.round(currentSl).toLocaleString()}`
        : `STOP LOSS (-1R) · ${Math.round(currentSl).toLocaleString()}`;
      const slColor = slLockedAtBe ? '#10b981' : bearColor;
      drawGuide(currentSl, slTag, slColor, 2.2, false, slLockedAtBe);
    } else {
      // Mode A: Pre-Entry Entry / SL / TP reference lines after choice
      let activeTrade: { entry: number; sl: number; tp: number } | null = null;
      let isHalf = false;
      if (userAction === 'BUY' && scenario.buyLevel) {
        activeTrade = scenario.buyLevel;
      } else if (userAction === 'SELL' && scenario.sellLevel) {
        activeTrade = scenario.sellLevel;
      } else if (userAction === 'HALF_SIZE') {
        isHalf = true;
        const dir =
          scenario.halfDirection ||
          (scenario.correctAction === 'SELL' ? 'SELL' : 'BUY');
        activeTrade = (dir === 'SELL' ? scenario.sellLevel : scenario.buyLevel) || null;
      }

      if (activeTrade) {
        const levels = [
          {
            price: activeTrade.entry,
            label: isHalf ? 'ENTRY (0.5R)' : 'ENTRY (1R)',
            color: isBrightMode ? '#334155' : '#cbd5e1'
          },
          {
            price: activeTrade.sl,
            label: isHalf ? 'SL (-0.5R)' : 'SL (-1R)',
            color: bearColor
          },
          {
            price: activeTrade.tp,
            label: isHalf ? 'TP (+1.5R)' : 'TP (+3R)',
            color: bullColor
          }
        ];
        levels.forEach((lvl) => {
          const ly = yAt(lvl.price);
          if (ly >= padTop && ly <= padTop + plotHeight) {
            ctx.save();
            ctx.strokeStyle = lvl.color;
            ctx.lineWidth = 1.25;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(decisionBoundaryX, ly);
            ctx.lineTo(padLeft + plotWidth, ly);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = lvl.color;
            ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
            ctx.textAlign = 'right';
            ctx.fillText(lvl.label, padLeft + plotWidth - 6, ly - 7);
            ctx.restore();
          }
        });
      }
    }

    // Draw Candlesticks
    const candleWidth = Math.max(5, Math.min(18, slotWidth * 0.62));
    visibleCandles.forEach((c, idx) => {
      const cx = xAt(idx);
      const isBull = c.close >= c.open;
      const color = isBull ? bullColor : bearColor;

      const yHigh = yAt(c.high);
      const yLow = yAt(c.low);
      const yOpen = yAt(c.open);
      const yClose = yAt(c.close);

      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, yHigh);
      ctx.lineTo(cx, yLow);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      if (idx === scenario.setupCandles.length - 1) {
        ctx.strokeStyle = isBrightMode ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - candleWidth / 2 - 2, yHigh - 3, candleWidth + 4, yLow - yHigh + 6);
      }
    });

    // Bottom X-axis timestamps
    ctx.fillStyle = axisTextColor;
    ctx.font = '500 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let idx = 0; idx < totalSlots; idx += 3) {
      const candle =
        idx < scenario.setupCandles.length
          ? scenario.setupCandles[idx]
          : scenario.futureCandles[idx - scenario.setupCandles.length];
      if (candle) {
        ctx.fillText(candle.time, xAt(idx), padTop + plotHeight + 10);
      }
    }

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotWidth, plotHeight);
    ctx.restore();
  }, [scenario, revealedFutureCount, userAction, isBrightMode, animatedSlPrice, slLockedAtBe]);

  useEffect(() => {
    drawCandlestickChart();
  }, [drawCandlestickChart]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      drawCandlestickChart();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawCandlestickChart]);

  const startFutureCandlesPlayback = (action: SimulatorAction) => {
    const totalFuture = scenario.futureCandles.length;
    let step = 0;

    if (animTimerRef.current !== null) {
      window.clearInterval(animTimerRef.current);
    }

    animTimerRef.current = window.setInterval(() => {
      step += 1;
      setRevealedFutureCount(step);
      onPlayTone(500 + step * 35, 'sine', 0.025);

      if (step >= totalFuture) {
        if (animTimerRef.current !== null) {
          window.clearInterval(animTimerRef.current);
          animTimerRef.current = null;
        }
        setIsAnimating(false);
        setRoundComplete(true);

        const isCorrect = action === scenario.correctAction;
        const nextStreak = isCorrect ? streak + 1 : 0;
        const nextBestStreak = Math.max(bestStreak, nextStreak);
        const ptsEarned = isCorrect ? 100 + Math.max(0, nextStreak - 1) * 25 : -50;
        const nextScore = Math.max(0, score + ptsEarned);
        const appliedDelta = nextScore - score;

        const nextHistoryItem: RoundHistoryItem = {
          round: roundIndex + 1,
          title: scenario.title,
          mode: scenario.mode,
          userAction: action,
          correctAction: scenario.correctAction,
          isCorrect,
          pointsDelta: appliedDelta
        };
        const updatedHistory = [...history, nextHistoryItem];
        const updatedCorrectCount = updatedHistory.filter((h) => h.isCorrect).length;

        setStreak(nextStreak);
        setBestStreak(nextBestStreak);
        setScore(nextScore);
        setLastPointsDelta(appliedDelta);
        setHistory(updatedHistory);

        if (nextScore > currentTierBest) {
          setBeatHighScoreThisRun(true);
        }
        onUpdateTierStats(difficulty, nextScore, nextBestStreak, updatedCorrectCount);

        if (isCorrect) onPlaySuccess();
        else onPlayError();
      }
    }, 180);
  };

  const handleDecision = (action: SimulatorAction) => {
    if (isAnimating || roundComplete || showFinalSummary) return;

    setUserAction(action);
    setIsAnimating(true);
    setRevealedFutureCount(0);
    onPlayTone(620, 'sine', 0.05);

    // Mode B: Slide SL smoothly to Entry first when MOVE_BE is selected
    if (scenario.mode === 'MANAGE_TRADE' && action === 'MOVE_BE' && scenario.activePosition) {
      const startSl = scenario.activePosition.initialSl;
      const targetEntry = scenario.activePosition.entry;
      const durationMs = 520;
      const startTime = performance.now();

      const animateSlide = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextSl = startSl + (targetEntry - startSl) * eased;
        setAnimatedSlPrice(nextSl);

        if (progress < 1) {
          rafRef.current = window.requestAnimationFrame(animateSlide);
        } else {
          setAnimatedSlPrice(targetEntry);
          setSlLockedAtBe(true);
          onPlayTone(780, 'triangle', 0.08);
          startFutureCandlesPlayback(action);
        }
      };

      rafRef.current = window.requestAnimationFrame(animateSlide);
      return;
    }

    startFutureCandlesPlayback(action);
  };

  const handleNextRound = () => {
    onPlayTone(580, 'sine', 0.04);
    if (roundIndex + 1 >= tierScenarios.length) {
      setShowFinalSummary(true);
      return;
    }
    setRoundIndex((prev) => prev + 1);
    setUserAction(null);
    setRevealedFutureCount(0);
    setRoundComplete(false);
    setLastPointsDelta(0);
    setAnimatedSlPrice(null);
    setSlLockedAtBe(false);
  };

  const handleRestartGame = (withSound = true, nextDiff: SimulatorDifficulty = difficulty) => {
    if (!isPhase2Unlocked && nextDiff !== 'easy') {
      onPlayError();
      setTierLockedNotice(
        `${nextDiff.toUpperCase()} TIER LOCKED // PHASE 2 ACCESS REQUIRED. Settle Phase 2 to unlock Medium (15 Rounds) and Hard (20 Rounds) drills.`
      );
      return;
    }
    clearTimers();
    if (withSound) onPlayTone(660, 'triangle', 0.06);
    setTierLockedNotice(null);
    setDifficulty(nextDiff);
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setUserAction(null);
    setRevealedFutureCount(0);
    setIsAnimating(false);
    setRoundComplete(false);
    setLastPointsDelta(0);
    setHistory([]);
    setShowFinalSummary(false);
    setBeatHighScoreThisRun(false);
    setAnimatedSlPrice(null);
    setSlLockedAtBe(false);
  };

  const bannerColors =
    scenario.bannerTone === 'danger'
      ? 'bg-rose-950/35 border-rose-500/40 text-rose-300'
      : scenario.bannerTone === 'warning'
      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
      : 'bg-emerald-950/35 border-emerald-500/40 text-emerald-300';

  const rsiColors =
    scenario.rsiStatus === 'OVERBOUGHT'
      ? 'bg-rose-950/35 border-rose-500/40 text-rose-400'
      : scenario.rsiStatus === 'OVERSOLD'
      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
      : 'bg-[#0e131e] border-hairline text-emerald-400';

  const correctCount = history.filter((h) => h.isCorrect).length;
  const rankInfo = getSimulatorRank(correctCount, tierScenarios.length);

  const difficultyCards: { id: SimulatorDifficulty; label: string; rounds: number; desc: string }[] = [
    { id: 'easy', label: 'EASY', rounds: 15, desc: '2-line wedges, 1-line breakouts & no-bounce' },
    { id: 'medium', label: 'MEDIUM', rounds: 15, desc: '30m post-news, session wicks & 0.5R' },
    { id: 'hard', label: 'HARD', rounds: 20, desc: 'Multi-factor traps & breakeven management' }
  ];

  return (
    <div className="space-y-6">
      {/* TOP HEADER, DIFFICULTY SELECTOR & SCOREBOARD BAR */}
      <div className="glass-card rounded-xl p-5 border-hairline space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CandlestickChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
                TRADE OR PASS // EXECUTION SIMULATOR
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                50-Scenario USTECH100 15m Drill · Breakout-only discipline across 2-line converging wedges &amp; 1-line trendlines (no bounce trades).
              </p>
            </div>
          </div>

          {/* 4-Metric Scoreboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Round</div>
              <div className="text-sm font-mono font-bold text-white num-mono">
                {showFinalSummary
                  ? `${tierScenarios.length}/${tierScenarios.length}`
                  : `${roundIndex + 1}/${tierScenarios.length}`}
              </div>
            </div>

            <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Desk Score</div>
              <div className="text-sm font-mono font-bold text-emerald-400 num-mono">
                {score.toLocaleString()} pts
              </div>
            </div>

            <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <span>Streak</span>
                {streak >= 2 && <Flame className="w-3 h-3 text-amber-400" />}
              </div>
              <div className="text-sm font-mono font-bold text-amber-400 num-mono">
                {streak}x
              </div>
            </div>

            <div className="px-3 py-2 rounded-lg bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-cyan-400" />
                <span>Tier Best</span>
              </div>
              <div className="text-sm font-mono font-bold text-cyan-400 num-mono">
                {currentTierBest.toLocaleString()} pts
              </div>
            </div>
          </div>
        </div>

        {/* 3 Difficulty Level Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-hairline">
          {difficultyCards.map((d) => {
            const isTierLocked = !isPhase2Unlocked && d.id !== 'easy';
            const isSelected = !isTierLocked && difficulty === d.id;
            const st = tierStats[d.id];
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleRestartGame(true, d.id)}
                className={`relative overflow-hidden text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  isTierLocked
                    ? 'bg-[#07090e] border-hairline cursor-not-allowed'
                    : isSelected
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.12)] cursor-pointer'
                    : 'bg-[#070a12] border-hairline hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-2 w-full min-w-0 ${
                    isTierLocked ? 'blur-[2.5px] opacity-40 grayscale pointer-events-none select-none' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isSelected ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {d.label} ({d.rounds} ROUNDS)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{d.desc}</div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="text-[11px] font-bold text-cyan-400 num-mono">
                      {st.highScore > 0 ? `${st.highScore} pts` : '0 pts'}
                    </div>
                    <div className="text-[10px] text-slate-500 num-mono">
                      Best {st.bestCorrect}/{d.rounds} · {st.bestStreak}x
                    </div>
                  </div>
                </div>

                {isTierLocked && (
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e131e] border border-amber-500/40 shadow-lg text-[10px] font-mono font-bold tracking-wider text-amber-300">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>PHASE 2 ACCESS REQUIRED</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {tierLockedNotice && (
          <div className="p-3 rounded-lg bg-rose-950/35 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{tierLockedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setTierLockedNotice(null)}
              className="text-rose-300 hover:text-white px-1 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* FINAL RANK SUMMARY SCREEN */}
      {showFinalSummary ? (
        <div className="glass-card rounded-xl p-6 border-hairline space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-hairline">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {difficulty.toUpperCase()} Tier ({tierScenarios.length} Rounds) Complete
              </div>
              <div className={`text-2xl sm:text-3xl font-mono font-extrabold mt-1 ${rankInfo.colorClass}`}>
                {rankInfo.rank} · {rankInfo.label}
              </div>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                {rankInfo.summary}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {beatHighScoreThisRun && (
                <div className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold text-center">
                  NEW TIER HIGH SCORE
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRestartGame(true, difficulty)}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REPLAY {difficulty.toUpperCase()}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Accuracy</div>
              <div className="text-xl font-mono font-bold text-white num-mono mt-0.5">
                {correctCount}/{tierScenarios.length} ({Math.round((correctCount / tierScenarios.length) * 100)}%)
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Final Score</div>
              <div className="text-xl font-mono font-bold text-emerald-400 num-mono mt-0.5">
                {score.toLocaleString()} pts
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Best Streak</div>
              <div className="text-xl font-mono font-bold text-amber-400 num-mono mt-0.5">
                {bestStreak}x
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#070a12] border border-hairline">
              <div className="text-[10px] font-mono uppercase text-slate-400">Tier High Score</div>
              <div className="text-xl font-mono font-bold text-cyan-400 num-mono mt-0.5">
                {currentTierBest.toLocaleString()} pts
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Execution Ledger Breakdown
            </h3>
            <div className="overflow-x-auto rounded-xl border border-hairline">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#070a12] text-slate-400 border-b border-hairline">
                  <tr>
                    <th className="py-2.5 px-3">ROUND</th>
                    <th className="py-2.5 px-3">SCENARIO</th>
                    <th className="py-2.5 px-3">YOUR CALL</th>
                    <th className="py-2.5 px-3">OPTIMAL CALL</th>
                    <th className="py-2.5 px-3 text-right">POINTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {history.map((item) => (
                    <tr key={item.round} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400 num-mono">#{String(item.round).padStart(2, '0')}</td>
                      <td className="py-2.5 px-3 text-white font-sans font-medium">{item.title}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${item.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ACTION_LABELS[item.userAction]}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-bold">
                        {ACTION_LABELS[item.correctAction]}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold num-mono ${
                          item.pointsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.pointsDelta >= 0 ? `+${item.pointsDelta}` : item.pointsDelta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE ROUND WORKSPACE */
        <div className="glass-card rounded-xl p-5 border-hairline space-y-4">
          {/* Context HUD Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-hairline">
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                <span className="font-bold text-emerald-400">
                  {difficulty.toUpperCase()} · ROUND {String(roundIndex + 1).padStart(2, '0')}/{tierScenarios.length}
                </span>
                <span>·</span>
                <span>
                  {scenario.mode === 'MANAGE_TRADE'
                    ? 'ACTIVE TRADE MANAGEMENT'
                    : 'PRE-ENTRY SETUP CHECK'}
                </span>
                <span>·</span>
                <span className="text-slate-300 font-semibold">{scenario.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{scenario.setupSummary}</p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5 shrink-0">
              {/* Session / News Banner */}
              <div
                className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-2 ${bannerColors}`}
              >
                {scenario.bannerTone === 'clear' ? (
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{scenario.sessionBanner}</span>
              </div>

              {/* RSI Badge */}
              <div
                className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold num-mono flex items-center gap-2 ${rsiColors}`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>
                  RSI (14): {scenario.rsiValue.toFixed(1)} · {scenario.rsiStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Active Floating Position Banner for Mode B */}
          {scenario.mode === 'MANAGE_TRADE' && scenario.activePosition && (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>
                  OPEN {scenario.activePosition.direction} POSITION · FLOATING +{scenario.activePosition.floatingR.toFixed(1)}R
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-4 text-slate-300 num-mono">
                <span>
                  ENTRY: <strong className="text-white">{scenario.activePosition.entry.toLocaleString()}</strong>
                </span>
                <span>
                  CURRENT SL:{' '}
                  <strong className={slLockedAtBe ? 'text-emerald-400' : 'text-rose-400'}>
                    {slLockedAtBe
                      ? `${scenario.activePosition.entry.toLocaleString()} (BREAKEVEN)`
                      : scenario.activePosition.initialSl.toLocaleString()}
                  </strong>
                </span>
                <span>
                  TP (+3R): <strong className="text-emerald-400">{scenario.activePosition.tp.toLocaleString()}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Chart Legend & Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <div className="flex items-center flex-wrap gap-4">
                <span className="px-2 py-0.5 rounded bg-[#070a12] border border-hairline text-[10px] font-bold text-slate-300">
                  {scenario.secondaryTrendline ? '2-LINE WEDGE' : '1-LINE SETUP'}
                </span>
                {scenario.secondaryTrendline ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-sky-400 inline-block" />
                      <span>BUY Breakout Line</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-orange-400 inline-block" />
                      <span>SELL Breakout Line</span>
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`w-3 h-0.5 inline-block ${
                        scenario.trendline.role === 'sell_breakout' ? 'bg-orange-400' : 'bg-sky-400'
                      }`}
                    />
                    <span>
                      {scenario.trendline.role === 'sell_breakout'
                        ? 'SELL Breakout Line (No Bounces)'
                        : 'BUY Breakout Line (No Bounces)'}
                    </span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-3 h-0.5 border-t-2 border-dashed inline-block ${
                      scenario.sessionLevel.type === 'high' ? 'border-amber-400' : 'border-violet-400'
                    }`}
                  />
                  <span>{scenario.sessionLevel.label}</span>
                </span>
                {scenario.fibZone && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-400 inline-block" />
                    <span>{scenario.fibZone.label}</span>
                  </span>
                )}
              </div>
              {isAnimating && (
                <span className="text-amber-400 font-bold num-mono">
                  {scenario.mode === 'MANAGE_TRADE' && userAction === 'MOVE_BE' && !slLockedAtBe
                    ? 'SLIDING STOP LOSS TO BREAKEVEN...'
                    : `REPLAYING NEXT 15M CANDLES (${revealedFutureCount}/${scenario.futureCandles.length})`}
                </span>
              )}
            </div>

            <div
              ref={containerRef}
              className="w-full h-[340px] sm:h-[410px] rounded-xl overflow-hidden border border-hairline bg-[#070a12]"
            >
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
          </div>

          {/* Decision Controls: Mode A (Pre-Entry) vs Mode B (Manage Open Trade) */}
          {scenario.mode === 'MANAGE_TRADE' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                disabled={isAnimating || roundComplete}
                onClick={() => handleDecision('MOVE_BE')}
                className={`py-3 px-4 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  userAction === 'MOVE_BE'
                    ? 'bg-emerald-600 border-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                    : isAnimating || roundComplete
                    ? 'bg-[#070a12] border-hairline text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 cursor-pointer'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>MOVE SL TO BREAKEVEN (LOCK RISK)</span>
              </button>

              <button
                type="button"
                disabled={isAnimating || roundComplete}
                onClick={() => handleDecision('HOLD_SL')}
                className={`py-3 px-4 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  userAction === 'HOLD_SL'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : isAnimating || roundComplete
                    ? 'bg-[#070a12] border-hairline text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 cursor-pointer'
                }`}
              >
                <PauseCircle className="w-4 h-4 shrink-0" />
                <span>LET IT PLAY OUT (KEEP ORIGINAL SL)</span>
              </button>

              <button
                type="button"
                disabled={isAnimating || roundComplete}
                onClick={() => handleDecision('ADD_LOTS')}
                className={`py-3 px-4 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  userAction === 'ADD_LOTS'
                    ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                    : isAnimating || roundComplete
                    ? 'bg-[#070a12] border-hairline text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400 cursor-pointer'
                }`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>ADD MORE LOTS</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <button
                type="button"
                disabled={isAnimating || roundComplete}
                onClick={() => handleDecision('BUY')}
                className={`py-3 px-4 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  userAction === 'BUY'
                    ? 'bg-emerald-600 border-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                    : isAnimating || roundComplete
                    ? 'bg-[#070a12] border-hairline text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 cursor-pointer'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>BUY (1R)</span>
              </button>

              <button
                type="button"
                disabled={isAnimating || roundComplete}
                onClick={() => handleDecision('SELL')}
                className={`py-3 px-4 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  userAction === 'SELL'
                    ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                    : isAnimating || roundComplete
                    ? 'bg-[#070a12] border-hairline text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400 cursor-pointer'
                }`}
              >
                <TrendingDown className="w-4 h-4 shrink-0" />
                <span>SELL (1R)</span>
              </button>

              <button
                type="button"
                disabled={isAnimating || roundComplete}
                onClick={() => handleDecision('HALF_SIZE')}
                className={`py-3 px-4 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  userAction === 'HALF_SIZE'
                    ? 'bg-cyan-500 border-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                    : isAnimating || roundComplete
                    ? 'bg-[#070a12] border-hairline text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 cursor-pointer'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0" />
                <span>HALF SIZE (0.5R)</span>
              </button>

              <button
                type="button"
                disabled={isAnimating || roundComplete}
                onClick={() => handleDecision('PASS')}
                className={`py-3 px-4 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                  userAction === 'PASS'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : isAnimating || roundComplete
                    ? 'bg-[#070a12] border-hairline text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 cursor-pointer'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>PASS / NO TRADE</span>
              </button>
            </div>
          )}

          {/* Instant Result Feedback Banner */}
          {roundComplete && userAction && (
            <div
              className={`p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                userAction === scenario.correctAction
                  ? 'bg-emerald-950/35 border-emerald-500/40'
                  : 'bg-rose-950/35 border-rose-500/40'
              }`}
            >
              <div className="flex items-start gap-3">
                {userAction === scenario.correctAction ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span
                      className={`text-sm font-mono font-bold ${
                        userAction === scenario.correctAction ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {userAction === scenario.correctAction
                        ? scenario.feedback.correctTitle
                        : scenario.feedback.wrongTitle}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300 num-mono">
                      · {lastPointsDelta >= 0 ? `+${lastPointsDelta} pts` : `${lastPointsDelta} pts`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {userAction === scenario.correctAction
                      ? scenario.feedback.correctDetail
                      : scenario.feedback.wrongDetail}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 mt-1.5">
                    Your Decision: <strong className="text-white">{ACTION_LABELS[userAction]}</strong> · Optimal Call:{' '}
                    <strong className="text-emerald-400">{ACTION_LABELS[scenario.correctAction]}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextRound}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>
                  {roundIndex + 1 >= tierScenarios.length ? 'VIEW FINAL RANK' : 'NEXT ROUND'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
