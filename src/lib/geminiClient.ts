export interface TradeReviewInputRow {
  tradeDate?: string;
  executionTime?: string;
  position?: string;
  entryPrice?: string;
  lotSize?: number;
  stopLoss?: string;
  takeProfit?: string;
  result?: string;
  rrr?: string;
  pnl?: number;
  note?: string;
  phase?: 1 | 2;
}

export interface ServerAiTradeReviewResult {
  disciplineScore: number;
  scoreLabel: string;
  topStrength: string;
  primaryLeak: string;
  actionPlan: string[];
  summaryNote: string;
  periodLabel: string;
  tradeCount: number;
}

export interface DeskChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function runServerAiTradeReview(params: {
  periodLabel: string;
  startingBalance: number;
  trades: TradeReviewInputRow[];
}): Promise<ServerAiTradeReviewResult> {
  const response = await fetch('/api/ai/trade-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('AI Desk Performance Review server endpoint is unavailable.');
  }

  const payload = (await response.json()) as {
    review?: ServerAiTradeReviewResult;
    error?: string;
  };

  if (!response.ok || !payload.review) {
    throw new Error(payload.error || 'Failed to generate AI Desk Performance Review.');
  }

  return payload.review;
}

export async function runServerDeskAiChat(messages: DeskChatMessage[]): Promise<string> {
  const response = await fetch('/api/ai/desk-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Ask RJS Desk AI server endpoint is unavailable.');
  }

  const payload = (await response.json()) as {
    reply?: string;
    error?: string;
  };

  if (!response.ok || !payload.reply) {
    throw new Error(payload.error || 'Unable to reach RJS Desk AI right now.');
  }

  return payload.reply;
}
