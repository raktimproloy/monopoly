"use client";

import { useRef, useEffect } from 'react';
import { Terminal, Send } from 'lucide-react';
import { TelemetryEntry, getTelemetryLineColor } from '../utils/telemetryLog';
import { toBanglaNum } from '../utils/format';

interface ChatBoxProps {
  entries: TelemetryEntry[];
  userId?: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function ChatBox({ entries, userId }: ChatBoxProps) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="w-full h-full p-4 glass-card flex flex-col gap-3.5 select-none relative">
      <h3 className="text-base font-orbitron font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
        <Terminal size={16} className="text-[#8B5CF6]" />
        TACTICAL TELEMETRY
      </h3>

      <div className="flex-1 overflow-y-auto pr-1 glass-item rounded-xl p-3 flex flex-col gap-3 font-mono text-[10px] leading-relaxed text-slate-300">
        {entries.length === 0 && (
          <div className="text-slate-600 italic text-center py-6">কোনো টেলিমেট্রি নেই</div>
        )}

        {entries.slice().reverse().map((entry) => (
          <div
            key={entry.id}
            className="border-b border-slate-800/80 pb-2.5 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-2 mb-1 text-[8px] text-slate-600 uppercase tracking-wider">
              <span>{formatTime(entry.timestamp)}</span>
              {entry.dice && entry.dice[0] > 0 && (
                <span className="text-slate-500">🎲 {entry.dice[0]}+{entry.dice[1]}</span>
              )}
              {entry.turnStatus && (
                <span className="text-slate-600 truncate">{entry.turnStatus}</span>
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              {(entry.lines.length > 0 ? entry.lines : [entry.text]).map((line, lineIdx) => (
                <div key={lineIdx} className="flex gap-1.5 items-start">
                  <span className="text-cyber-blue select-none font-bold shrink-0">&gt;</span>
                  <span className={`break-words whitespace-pre-wrap ${getTelemetryLineColor(line)}`}>
                    {line}
                  </span>
                </div>
              ))}
            </div>

            {entry.balances.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-slate-800/60">
                <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">
                  ব্যালেন্স
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {entry.balances.map((p) => (
                    <span
                      key={p.id}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
                        p.id === userId
                          ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                          : 'text-slate-400'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.avatar }}
                      />
                      <span className="truncate max-w-[72px]">{p.name}</span>
                      <span className="text-slate-300 font-semibold">৳{toBanglaNum(p.balance)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
        <input
          type="text"
          disabled
          placeholder="SECURE CHANNEL OFFLINE"
          className="flex-1 px-3 py-2 text-[11px] font-mono glass-input text-white placeholder-white/50 focus:outline-none cursor-not-allowed uppercase"
        />
        <button
          type="button"
          disabled
          className="p-2.5 glass-item text-slate-500 rounded-lg flex items-center justify-center cursor-not-allowed opacity-50"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
