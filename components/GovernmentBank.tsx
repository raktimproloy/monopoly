import React from 'react';
import { GameState } from '../../shared/types';
import { Landmark, Landmark as BankIcon, Banknote, Percent, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface GovernmentBankProps {
  gameState: GameState;
  playerId: string;
  takeLoan: (amount: number) => void;
  repayLoan: (amount?: number) => void;
}

export default function GovernmentBank({ gameState, playerId, takeLoan, repayLoan }: GovernmentBankProps) {
  const bankBalance = gameState.governmentBank?.balance || 0;
  const player = gameState.players[playerId];
  const loan = player?.loan;

  const loanOptions = [
    { amount: 100, interest: 10 },
    { amount: 200, interest: 15 },
    { amount: 400, interest: 20 },
    { amount: 800, interest: 25 },
  ];

  return (
    <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700/50 flex flex-col gap-4 shadow-xl">
      {/* Header & Balance */}
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
          <Landmark className="w-5 h-5" />
          <h2>Govt. Bank</h2>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <Banknote className="w-4 h-4 text-emerald-500" />
          <span className="font-mono text-emerald-300 font-bold">
            ৳{bankBalance.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Loan Section */}
      <div className="flex flex-col gap-3">
        {!loan ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
              <BankIcon className="w-4 h-4" /> Bank Loan Options
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-1">
              Take a loan for 5 turns. Amount is deducted automatically at the start of your turn.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {loanOptions.map((opt) => (
                <button
                  key={opt.amount}
                  onClick={() => takeLoan(opt.amount)}
                  className="group relative flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    ৳{opt.amount}
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-medium flex items-center gap-0.5 mt-0.5">
                    <Percent className="w-3 h-3" /> {opt.interest}% Interest
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div 
            className="flex flex-col gap-3 bg-slate-900/60 rounded-xl p-3 border border-amber-500/20 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Active Loan
              </h3>
              <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded-md text-amber-300 border border-amber-500/30">
                {loan.remainingTurns} turns left
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500 mb-0.5">Principal</span>
                <span className="text-slate-200 font-mono">৳{loan.principal} <span className="text-[10px] text-slate-400 ml-1">({loan.interestRate}%)</span></span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-slate-500 mb-0.5">Deduction</span>
                <span className="text-rose-400 font-mono font-medium">- ৳{loan.deductionPerTurn} / turn</span>
              </div>
              <div className="flex flex-col col-span-2">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-slate-500">Remaining</span>
                  <span className="text-amber-400 font-bold font-mono">৳{loan.remainingAmount} <span className="text-slate-500 text-[10px] font-normal">/ ৳{loan.totalRepayment}</span></span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500" 
                    style={{ width: `${(loan.remainingAmount / loan.totalRepayment) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => repayLoan()}
              className="mt-1 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Repay Full Amount (৳{loan.remainingAmount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
