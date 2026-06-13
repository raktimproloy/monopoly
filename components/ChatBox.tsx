"use client";

import { useState, useRef, useEffect } from 'react';
import { Terminal, Send } from 'lucide-react';

interface ChatBoxProps {
  logs: string[];
}

export default function ChatBox({ logs }: ChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to latest logs
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    // Chat functionality can be wired up via sockets
    setInputText('');
  };

  return (
    <div className="w-full p-4 glass-panel flex flex-col gap-4 select-none relative h-full">


      <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2">
        <Terminal size={14} className="text-cyber-blue" />
        TACTICAL TELEMETRY
      </h3>

      {/* Terminal logs list */}
      <div className="flex-1 overflow-y-auto pr-1 bg-slate-950/50 rounded-lg border border-slate-900 p-3 flex flex-col gap-2 font-mono text-[10px] leading-relaxed text-slate-300">
        {/* Render logs chronologically (newest at bottom) */}
        {logs.slice().reverse().map((log, index) => {
          let colorClass = 'text-slate-400';
          if (log.includes('bought') || log.includes('unmortgaged') || log.includes('[ACQUIRE]') || log.includes('[UPGRADE]')) {
            colorClass = 'text-cyber-blue';
          } else if (log.includes('rolled') || log.includes('[NAV]')) {
            colorClass = 'text-slate-200';
          } else if (log.includes('paid rent') || log.includes('tax') || log.includes('[TRANSFER]') || log.includes('[DOWNGRADE]') || log.includes('[LIQUIDATE]')) {
            colorClass = 'text-red-400';
          } else if (log.includes('Jail') || log.includes('Go to Jail') || log.includes('[ALERT]') || log.includes('[AUCTION]')) {
            colorClass = 'text-amber-400';
          } else if (log.includes('Trade complete') || log.includes('[TRADE]')) {
            colorClass = 'text-emerald-400';
          } else if (log.includes('[SYS]')) {
            colorClass = 'text-slate-500';
          }

          return (
            <div key={index} className="flex gap-1.5 items-start">
              <span className="text-cyber-blue select-none font-bold">&gt;</span>
              <span className={colorClass}>{log}</span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input deck */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          maxLength={100}
          disabled
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="SECURE CHANNEL OFFLINE"
          className="flex-1 px-3 py-2 text-[11px] font-mono glass-input text-slate-500 placeholder-slate-600 cursor-not-allowed uppercase"
        />
        <button
          type="submit"
          disabled
          className="p-2 glass-panel-light text-slate-600 border border-slate-800/40 rounded-lg flex items-center justify-center cursor-not-allowed opacity-50"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
