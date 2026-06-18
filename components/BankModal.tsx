"use client";

import React, { useState } from 'react';
import { Landmark, X, Banknote, Percent, ShieldCheck } from 'lucide-react';

interface BankModalProps {
  onClose: () => void;
  onTakeLoan: (amount: number) => void;
}

export default function BankModal({ onClose, onTakeLoan }: BankModalProps) {
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);

  const loanOptions = [
    { amount: 100, interest: 10, total: 110, turns: 5, deduction: 22 },
    { amount: 200, interest: 15, total: 230, turns: 5, deduction: 46 },
    { amount: 400, interest: 20, total: 480, turns: 5, deduction: 96 },
    { amount: 800, interest: 25, total: 1000, turns: 5, deduction: 200 },
  ];

  return (
    <div className="glass-overlay">
      <div className="glass-modal max-w-2xl border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col">
        
        {/* Header */}
        <div className="bg-emerald-950/30 border-b border-emerald-900/50 p-4 md:p-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-emerald-900/40 rounded-xl border border-emerald-500/30">
              <Landmark className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-orbitron font-bold text-slate-100 tracking-wide">GOVERNMENT LOAN</h2>
              <p className="text-xs text-emerald-500/80 font-mono tracking-wider uppercase">Secure Capital Funding</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10">
            <X size={20} className="text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 flex flex-col gap-6">
          <p className="text-sm text-slate-400 text-center max-w-lg mx-auto">
            Select a financial package. Loans are automatically deducted from your balance over 5 turns. You may only carry one active loan at a time.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {loanOptions.map((opt) => (
              <div 
                key={opt.amount}
                onClick={() => setSelectedLoan(opt.amount)}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 text-center overflow-hidden
                  ${selectedLoan === opt.amount 
                    ? 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-105' 
                    : 'border-white/5 glass-item hover:border-emerald-700/50'
                  }
                `}
              >
                {selectedLoan === opt.amount && (
                  <div className="absolute top-2 right-2 text-emerald-400">
                    <ShieldCheck size={16} />
                  </div>
                )}
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Package</div>
                <div className="text-2xl md:text-3xl font-orbitron font-black text-white">৳{opt.amount}</div>
                
                <div className="w-full h-px bg-slate-700/50 my-1" />
                
                <div className="flex flex-col gap-1 w-full text-left">
                  <div className="flex justify-between text-[10px] md:text-xs text-slate-400">
                    <span>Interest:</span>
                    <span className="text-rose-400 font-mono">{opt.interest}%</span>
                  </div>
                  <div className="flex justify-between text-[10px] md:text-xs text-slate-400">
                    <span>Repay:</span>
                    <span className="text-amber-400 font-mono">৳{opt.total}</span>
                  </div>
                  <div className="flex justify-between text-[10px] md:text-xs text-slate-400">
                    <span>Deduction:</span>
                    <span className="text-white font-mono">৳{opt.deduction}/turn</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 bg-black/40 border-t border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            CANCEL
          </button>
          <button 
            disabled={!selectedLoan}
            onClick={() => {
              if (selectedLoan) {
                onTakeLoan(selectedLoan);
                onClose();
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-md"
          >
            <Banknote size={16} />
            CONFIRM LOAN
          </button>
        </div>
      </div>
    </div>
  );
}