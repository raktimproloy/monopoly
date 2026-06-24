import React from 'react';
import { GameState } from '../../shared/types';
import { Landmark, Landmark as BankIcon, Banknote, Percent, CheckCircle2 } from 'lucide-react';
import { toBanglaNum } from '../utils/format';

interface GovernmentBankProps {
  gameState: GameState;
  playerId: string;
  onOpenBankModal: () => void;
  repayLoan: (amount?: number) => void;
}

export default function GovernmentBank({ gameState, playerId, onOpenBankModal, repayLoan }: GovernmentBankProps) {
  const player = gameState.players[playerId];
  const loan = player?.loan;

  return (
    <div className="w-full">
      <div className="w-full glass-card p-4 flex flex-col gap-4 relative overflow-hidden border-emerald-500/20">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* TITLE MOVED INSIDE */}
        <h3 className="text-base font-orbitron font-extrabold tracking-widest text-white uppercase flex items-center gap-2 border-b border-emerald-900/30 pb-3">
          <Landmark size={16} className="text-emerald-400" />
          সরকারি ব্যাংক
        </h3>

        {!loan ? (
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <BankIcon size={32} className="text-slate-600" />
            <p className="text-xs text-white text-center font-medium px-2">
              মূলধনের প্রয়োজন? সরকারি ব্যাংক প্রপার্টি বিনিয়োগের জন্য নিরাপদ এবং স্বল্প সুদে লোন প্রদান করে।
            </p>
            <button
              onClick={onOpenBankModal}
              className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98] border border-emerald-400/50 flex items-center justify-center gap-2"
            >
              <Banknote size={16} />
              লোনের আবেদন
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">সক্রিয় লোন</span>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/50">বাকি: {toBanglaNum(loan.remainingTurns)} দান</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <span className="text-white text-xs">পরিশোধযোগ্য</span>
                <span className="text-emerald-400 font-bold font-mono text-lg">৳{toBanglaNum(loan.remainingAmount)} <span className="text-white/80 text-[10px] font-normal">/ ৳{toBanglaNum(loan.totalRepayment)}</span></span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500" 
                  style={{ width: `${(loan.remainingAmount / loan.totalRepayment) * 100}%` }}
                />
              </div>
            </div>
            {/* Partial Repayments */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">আংশিক পরিশোধ</span>
              <div className="grid grid-cols-4 gap-2">
                {[20, 50, 100, 200].map((val) => {
                  const isEnabled = player.balance >= val && loan.remainingAmount >= val;
                  return (
                    <button
                      key={val}
                      disabled={!isEnabled}
                      onClick={() => repayLoan(val)}
                      className={`py-1.5 px-1 rounded-lg text-[10px] md:text-xs font-extrabold font-mono transition-all text-center border ${
                        isEnabled
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-400 active:scale-[0.95] cursor-pointer'
                          : 'bg-slate-900/50 text-slate-600 border-slate-800/80 cursor-not-allowed opacity-40'
                      }`}
                    >
                      ৳{toBanglaNum(val)}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => repayLoan()}
              disabled={player.balance < loan.remainingAmount}
              className={`mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${
                player.balance >= loan.remainingAmount
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400 active:scale-[0.98] cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/50 text-slate-600 border-slate-800/80 cursor-not-allowed opacity-40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              সম্পূর্ণ পরিশোধ (৳{toBanglaNum(loan.remainingAmount)})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
