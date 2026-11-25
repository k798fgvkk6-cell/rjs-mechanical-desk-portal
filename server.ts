import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

const TRADE_REVIEW_SYSTEM_INSTRUCTION = `You are Ryan Jade's mechanical USTECH100 (NAS100) Risk Manager and Execution Auditor.
Analyze the student's filtered trade logbook strictly against the RJS Mechanical Desk Playbook:
1. Instrument & Session: USTECH100 only, focused on the 9:30 PM PHT / NY Cash Open session.
2. Entry Rule: Only confirmed 15-minute candle body breakouts followed by a clean pullback (NEVER trendline bounces, inside-wedge chop, or impulsive chasing).
3. News Discipline: Strict avoidance of high-impact USD Forex Factory red-folder news windows (wait 30m before/after release) and low-volume USD Bank Holidays.
4. Risk Mandate: Base risk is strictly 1R = ₱1,000 (or 0.5R reduced half-size for tight/hesitant pullbacks). Watch for oversized losses (< -₱1,000 / inconsistent lot sizing), low R:R (< 1:1.5), revenge-trading clusters on the same date, or excessive loss streaks.
5. Phase 1 vs Phase 2 Focus: Phase 1 targets ₱10,000 net profit with 1:3 RRR fundamentals; Phase 2 targets ₱20,000 net profit plus completing 2 swing wins of 1:4 / 1:5 (≥ ₱4,000 profit).
6. Swing Scaling: Valid 1:4 / 1:5 setups use Option 1 (Same SL, Higher TP) or Option 2 (Tight SL, Different Lot Size & Same TP).

Be direct, institutional, constructive, and grounded strictly in the provided trade metrics and rows. Do not invent trades or numbers not present in the logbook.`;

const DESK_CHAT_SYSTEM_INSTRUCTION = `You are "RJS Desk AI", the official mechanical trading mentor for Ryan Jade's USTECH100 (NAS100) Student Portal.

STRICT PLAYBOOK LOCK (NON-NEGOTIABLE):
- Instrument: USTECH100 (NAS100) during NY Cash Open (9:30 PM PHT).
- Entry Rule: Entries require a confirmed 15-minute candle body close breaking the trendline/level PLUS a clean pullback candle (and neutral RSI, not overbought 75+ or oversold 24-). NEVER trade trendline bounces, wick-only fake breakouts, or price trapped inside a converging wedge.
- News Filter: Strictly avoid USD Forex Factory High-Impact (Red Folder) news windows — do not enter 30 minutes before red news, during release, or until 30 minutes after release so post-news structure settles. Avoid USD Bank Holidays due to low-volume chop. If already in a winning trade approaching Red News or extreme RSI, move Stop Loss to Breakeven (BE) to lock risk.
- Risk Management: Fixed 1R standard risk (₱1,000 base mandate) or 0.5R half-size when a pullback is tight/hesitant. Never add lots to a loser or widen Stop Loss.
- Phase Targets: Phase 1 targets ₱10,000 profit goal with mechanical 1:3 consistency; Phase 2 targets ₱20,000 profit goal and two 1:4 / 1:5 swing wins (≥ ₱4,000 profit).
- Swing Conversion Rules ("Aiming a 1:4, 1:5"):
  * Option 1: Same SL, Higher TP (keep intraday SL distance and extend target to 1:4 / 1:5).
  * Option 2: Tight SL, Different Lot Size & Same TP (tighten structural SL, adjust lot size to keep fixed 1R risk, and hold target).

STRICT REFUSAL POLICY:
If the user asks about outside strategies or concepts not in the RJS Mechanical Desk Playbook — such as ICT/SMC (order blocks, fair value gaps / FVGs, liquidity sweeps, Judas swings), Wyckoff, Elliott Wave, random indicators (MACD, Bollinger Bands, Ichimoku, Moving Average crossovers), martingale/grid bots, or trading random forex/crypto pairs — politely refuse that outside framework in 1–2 sentences and immediately redirect them back to the RJS mechanical rules (15m body breakout + pullback on USTECH100, Forex Factory news clearance, and 1R / 0.5R risk discipline).

Keep responses crisp, practical, structured with short bullets when helpful, and free of hype.`;

function getServerGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatServerGeminiError(err: unknown): { status: number; message: string } {
  const e = err as { status?: number; message?: string };
  const msg = String(e?.message || 'Gemini service failed. Please try again.');

  if (msg === 'MISSING_GEMINI_API_KEY') {
    return {
      status: 503,
      message: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (
    e?.status === 400 ||
    e?.status === 401 ||
    e?.status === 403 ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('PERMISSION_DENIED')
  ) {
    return {
      status: 502,
      message: 'The server Gemini API key was rejected or lacks permission. Please check GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (e?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini rate limit reached temporarily. Please wait a moment and try again.',
    };
  }
  return {
    status: 500,
    message: msg,
  };
}

interface RawTradeRow {
  tradeDate?: unknown;
  executionTime?: unknown;
  position?: unknown;
  entryPrice?: unknown;
  lotSize?: unknown;
  stopLoss?: unknown;
  takeProfit?: unknown;
  result?: unknown;
  rrr?: unknown;
  pnl?: unknown;
  note?: unknown;
  phase?: unknown;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/ai/trade-review', async (req, res) => {
    try {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
        periodLabel?: unknown;
        startingBalance?: unknown;
        trades?: unknown;
      };

      const periodLabel = String(body.periodLabel || 'Current Period').trim().slice(0, 80) || 'Current Period';
      const parsedStartBal = Number(body.startingBalance);
      const startingBalance = Number.isFinite(parsedStartBal) && parsedStartBal > 0 ? parsedStartBal : 10000;
      const rawTrades = Array.isArray(body.trades) ? (body.trades as RawTradeRow[]) : [];

      if (rawTrades.length === 0) {
        return res.status(400).json({
          error: 'Log at least one trade in the selected period before running an AI Desk Review.',
        });
      }

      const ai = getServerGenAI();

      let netPnL = 0;
      let wins = 0;
      let losses = 0;
      let be = 0;
      let maxWinStreak = 0;
      let maxLossStreak = 0;
      let curWinStreak = 0;
      let curLossStreak = 0;
      let oversizedLosses = 0;
      const tradesByDate = new Map<string, number>();

      const compactRows = rawTrades.slice(-150).map((t, idx) => {
        const pnl = Number(t.pnl) || 0;
        const date = String(t.tradeDate || '').slice(0, 10);
        return {
          idx: idx + 1,
          phase: Number(t.phase) === 2 ? 2 : 1,
          date,
          time: String(t.executionTime || '').slice(0, 20),
          pos: t.position === 'SELL' ? 'SELL' : 'BUY',
          lot: Number(t.lotSize) || 1.0,
          entry: String(t.entryPrice || '-').slice(0, 20),
          sl: String(t.stopLoss || '-').slice(0, 20),
          tp: String(t.takeProfit || '-').slice(0, 20),
          result: String(t.result || '').slice(0, 32),
          rrr: String(t.rrr || '').slice(0, 24),
          pnl,
          note: String(t.note || '').trim().slice(0, 140),
        };
      });

      rawTrades.forEach((t) => {
        const pnl = Number(t.pnl) || 0;
        netPnL += pnl;
        const d = String(t.tradeDate || '').slice(0, 10);
        if (d) tradesByDate.set(d, (tradesByDate.get(d) || 0) + 1);
        if (pnl > 0) {
          wins += 1;
          curWinStreak += 1;
          curLossStreak = 0;
          if (curWinStreak > maxWinStreak) maxWinStreak = curWinStreak;
        } else if (pnl < 0) {
          losses += 1;
          curLossStreak += 1;
          curWinStreak = 0;
          if (curLossStreak > maxLossStreak) maxLossStreak = curLossStreak;
          if (pnl < -1050) oversizedLosses += 1;
        } else {
          be += 1;
          curWinStreak = 0;
          curLossStreak = 0;
        }
      });

      const maxTradesSingleDay = Array.from(tradesByDate.values()).reduce((m, c) => Math.max(m, c), 0);
      const winRate = ((wins / rawTrades.length) * 100).toFixed(1);
      const totalR = (netPnL / 1000).toFixed(2);

      const prompt = `Audit this student's USTECH100 trading logbook for "${periodLabel}".
Summary Metrics:
- Starting Balance: ₱${startingBalance.toLocaleString()}
- Total Filtered Trades: ${rawTrades.length} (${wins} Wins, ${losses} Losses, ${be} Breakeven)
- Win Rate: ${winRate}%
- Net P&L: ${netPnL >= 0 ? '+' : '-'}₱${Math.abs(netPnL).toLocaleString()} (${totalR}R at 1R = ₱1,000)
- Max Consecutive Wins: ${maxWinStreak}, Max Consecutive Losses: ${maxLossStreak}
- Max Trades in a Single Day: ${maxTradesSingleDay}
- Oversized Losses (< -₱1,050): ${oversizedLosses}

Trade Rows (up to most recent 150 in period):
${JSON.stringify(compactRows)}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: TRADE_REVIEW_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              disciplineScore: {
                type: Type.INTEGER,
                description: 'Overall rule adherence and execution discipline score from 0 to 100.',
              },
              scoreLabel: {
                type: Type.STRING,
                description: 'Short 2-3 word uppercase verdict such as TIGHT EXECUTION, DRIFT WARNING, or TILT RISK.',
              },
              topStrength: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence breakdown of what is working best in their execution.',
              },
              primaryLeak: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence leak or tilt warning identifying recurring execution or risk issues.',
              },
              actionPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 specific, actionable rules for their next trading week.',
              },
              summaryNote: {
                type: Type.STRING,
                description: 'Brief 1-sentence executive coaching takeaway referencing their period stats.',
              },
            },
            required: ['disciplineScore', 'scoreLabel', 'topStrength', 'primaryLeak', 'actionPlan', 'summaryNote'],
          },
        },
      });

      const rawText = (response.text || '{}').trim();
      const parsed = JSON.parse(rawText) as {
        disciplineScore?: number;
        scoreLabel?: string;
        topStrength?: string;
        primaryLeak?: string;
        actionPlan?: string[];
        summaryNote?: string;
      };

      return res.json({
        review: {
          disciplineScore: Math.min(100, Math.max(0, Math.round(Number(parsed.disciplineScore) || 0))),
          scoreLabel: String(parsed.scoreLabel || 'DESK AUDIT').trim(),
          topStrength: String(parsed.topStrength || '').trim(),
          primaryLeak: String(parsed.primaryLeak || '').trim(),
          actionPlan: Array.isArray(parsed.actionPlan)
            ? parsed.actionPlan.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 3)
            : [],
          summaryNote: String(parsed.summaryNote || '').trim(),
          periodLabel,
          tradeCount: rawTrades.length,
        },
      });
    } catch (err: unknown) {
      const formatted = formatServerGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ai/desk-chat', async (req, res) => {
    try {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
        messages?: unknown;
      };

      const rawMessages = Array.isArray(body.messages) ? body.messages : [];
      const sanitized = rawMessages
        .slice(-20)
        .map((m) => {
          const item = (m && typeof m === 'object' ? m : {}) as { role?: unknown; text?: unknown };
          return {
            role: item.role === 'model' ? ('model' as const) : ('user' as const),
            text: String(item.text || '').trim().slice(0, 2000),
          };
        })
        .filter((m) => m.text.length > 0);

      if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== 'user') {
        return res.status(400).json({ error: 'Please enter a question for RJS Desk AI.' });
      }

      const ai = getServerGenAI();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: sanitized.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
        config: {
          systemInstruction: DESK_CHAT_SYSTEM_INSTRUCTION,
        },
      });

      const reply = (response.text || '').trim();
      if (!reply) {
        return res.status(502).json({
          error: 'RJS Desk AI returned an empty response. Please try asking again.',
        });
      }

      return res.json({ reply });
    } catch (err: unknown) {
      const formatted = formatServerGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/portal.html', (_req, res) => {
      const distPortal = path.join(distDir, 'portal.html');
      const rootPortal = path.resolve(__dirname, 'portal.html');
      res.sendFile(fs.existsSync(distPortal) ? distPortal : rootPortal);
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RJS Mechanical Trading Desk server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
