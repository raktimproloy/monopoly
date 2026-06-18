import React from 'react';
import { GameState } from '../../shared/types';
import { Landmark, Landmark as BankIcon, Banknote, Percent, CheckCircle2 } from 'lucide-react';

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
          GOVT. BANK
        </h3>

        {!loan ? (
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <BankIcon size={32} className="text-slate-600" />
            <p className="text-xs text-white text-center font-medium px-2">
              Need capital? The Government Bank offers secure, low-interest loans for property investment.
            </p>
            <button
              onClick={onOpenBankModal}
              className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98] border border-emerald-400/50 flex items-center justify-center gap-2"
            >
              <Banknote size={16} />
              Request Loan
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Active Loan</span>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/50">{loan.remainingTurns} Turns Left</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <span className="text-white text-xs">Remaining</span>
                <span className="text-emerald-400 font-bold font-mono text-lg">৳{loan.remainingAmount} <span className="text-white/80 text-[10px] font-normal">/ ৳{loan.totalRepayment}</span></span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500" 
                  style={{ width: `${(loan.remainingAmount / loan.totalRepayment) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => repayLoan()}
              className="mt-2 w-full flex items-center justify-center gap-2 glass-item text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              REPAY FULL LOAN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
