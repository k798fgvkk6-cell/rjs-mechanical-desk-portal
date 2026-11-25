import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Loader2,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { runServerDeskAiChat } from '../lib/geminiClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface AskDeskAiWidgetProps {
  onPlayTone?: (freq?: number, type?: OscillatorType, duration?: number) => void;
}

const QUICK_PROMPTS = [
  'Checklist before entering a 15m breakout',
  'Option 1 vs Option 2 for 1:4 swing scaling',
  'Red news buffer rules',
  'Why no trendline bounces?'
];

export const AskDeskAiWidget: React.FC<AskDeskAiWidgetProps> = ({ onPlayTone }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isSending) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputValue('');
    setIsSending(true);
    onPlayTone?.(560, 'sine', 0.03);

    try {
      const reply = await runServerDeskAiChat(
        nextHistory.map((m) => ({ role: m.role, text: m.text }))
      );

      const modelMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        role: 'model',
        text: reply
      };
      setMessages((prev) => [...prev, modelMsg]);
      onPlayTone?.(700, 'sine', 0.04);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach RJS Desk AI right now.';
      setErrorMsg(msg);
      onPlayTone?.(320, 'sawtooth', 0.06);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleClear = () => {
    setMessages([]);
    setErrorMsg(null);
    onPlayTone?.(440, 'sine', 0.03);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {/* Slide-Up Chat Drawer */}
      {isOpen && (
        <div className="glass-card w-[calc(100vw-2rem)] sm:w-[410px] h-[520px] max-h-[78vh] rounded-2xl border border-emerald-500/35 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-hairline flex items-center justify-between gap-2 bg-[#0a0f1d]/90 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    ASK RJS DESK AI
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  USTECH100 Mechanical Playbook Mentor
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
                  title="Clear conversation"
                  aria-label="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
                title="Close RJS Desk AI"
                aria-label="Close RJS Desk AI"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl p-3.5 bg-[#070a12] border border-hairline space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    RJS Mechanical Rules Only
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ask about 15m body breakout + pullback entries on USTECH100, Forex Factory red news clearance, 1R / 0.5R risk sizing, or Option 1 vs Option 2 swing scaling.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold px-0.5">
                    Quick-Starter Prompts
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-[#0e131e] border border-hairline hover:border-emerald-500/45 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-emerald-600 text-white font-medium shadow-sm'
                          : 'bg-[#070a12] border border-hairline text-slate-200'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-3 py-2 bg-[#070a12] border border-hairline text-xs font-mono text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Checking RJS Playbook...</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/35 border border-rose-500/40 flex items-start gap-2 text-[11px] font-mono text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Quick Chips Strip when chat active */}
          {messages.length > 0 && !isSending && (
            <div className="px-3 py-1.5 border-t border-hairline bg-[#070a12] flex items-center gap-1.5 overflow-x-auto shrink-0">
              {QUICK_PROMPTS.slice(0, 3).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="px-2 py-1 rounded-md bg-[#0e131e] border border-hairline hover:border-emerald-500/40 text-[10px] font-mono text-slate-400 hover:text-white whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-hairline bg-[#0a0f1d]/90 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about RJS USTECH100 rules..."
              disabled={isSending}
              className="flex-1 bg-[#070a12] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
              aria-label="Send message to RJS Desk AI"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          onPlayTone?.(600, 'sine', 0.04);
        }}
        className="glass-card px-4 py-2.5 rounded-full border border-emerald-500/45 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.4)] hover:border-emerald-400 text-xs font-mono font-bold tracking-wider text-white flex items-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
        aria-label="Open Ask RJS Desk AI Mentor"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
        <span>ASK RJS DESK AI</span>
      </button>
    </div>
  );
};
