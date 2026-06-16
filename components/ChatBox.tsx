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
    <div className="w-full h-full p-4 bg-[#19162C] border border-[#2D284B] rounded-2xl flex flex-col gap-3.5 select-none relative shadow-[0_4px_20px_rgba(0,0,0,0.25)]">


      <h3 className="text-base font-orbitron font-extrabold tracking-widest text-slate-300 uppercase flex items-center gap-2">
        <Terminal size={16} className="text-[#8B5CF6]" />
        TACTICAL TELEMETRY
      </h3>

      {/* Terminal logs list */}
      <div className="flex-1 overflow-y-auto pr-1 bg-[#121021]/50 rounded-xl border border-[#241F3C] p-3 flex flex-col gap-2 font-mono text-[10px] leading-relaxed text-slate-300">
        {/* Render logs chronologically (newest at bottom) */}
        {logs.slice().reverse().map((log, index) => {
          let colorClass = 'text-slate-400';
          if (log.includes('bought') || log.includes('unmortgaged') || log.includes('[ACQUIRE]') || log.includes('[UPGRADE]') || log.includes('কিনে') || log.includes('ছাড়িয়ে') || log.includes('তৈরি') || log.includes('অধিগ্রহণ')) {
            colorClass = 'text-cyber-blue';
          } else if (log.includes('rolled') || log.includes('[NAV]') || log.includes('ছক্কায়')) {
            colorClass = 'text-slate-200';
          } else if (log.includes('paid rent') || log.includes('tax') || log.includes('[TRANSFER]') || log.includes('[DOWNGRADE]') || log.includes('[LIQUIDATE]') || log.includes('ভাড়া') || log.includes('কর') || log.includes('জরিমানা') || log.includes('ভেঙে') || log.includes('বিক্রি')) {
            colorClass = 'text-red-400';
          } else if (log.includes('Jail') || log.includes('Go to Jail') || log.includes('[ALERT]') || log.includes('[AUCTION]') || log.includes('জেল') || log.includes('নিলাম')) {
            colorClass = 'text-amber-400';
          } else if (log.includes('Trade complete') || log.includes('[TRADE]') || log.includes('চুক্তি') || log.includes('বদল')) {
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
          className="flex-1 px-3 py-2 text-[11px] font-mono bg-[#241F3E] border border-[#3A335E] rounded-lg text-slate-500 placeholder-slate-600 focus:outline-none focus:border-[#6F4FF0] transition-colors cursor-not-allowed uppercase"
        />
        <button
          type="submit"
          disabled
          className="p-2.5 bg-[#241F3E] text-slate-500 border border-[#3A335E] rounded-lg flex items-center justify-center cursor-not-allowed opacity-50 transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
