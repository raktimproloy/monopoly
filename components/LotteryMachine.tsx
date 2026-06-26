import React, { useEffect, useState, useRef } from 'react';
import { GameState } from '@/shared/types';

interface LotteryMachineProps {
  gameState: GameState;
  userId: string;
  onRevealDigit: () => void;
  onStartLottery?: () => void;
}

export default function LotteryMachine({ gameState, userId, onRevealDigit, onStartLottery }: LotteryMachineProps & { onStartLottery?: () => void }) {
  const lottery = gameState.activeLottery;
  const isTurnPlayer = gameState.currentTurnPlayerId === userId;
  
  // Timer for auto-reveal (only if started)
  useEffect(() => {
    if (!lottery || !lottery.hasStarted || lottery.isComplete || !isTurnPlayer) return;

    // Wait 1.5 seconds before revealing the next digit
    const timer = setTimeout(() => {
      onRevealDigit();
    }, 1500);

    return () => clearTimeout(timer);
  }, [lottery, isTurnPlayer, onRevealDigit]);

  if (!lottery) {
    return (
      <div className="glass-card flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800/30 shadow-none relative overflow-hidden mb-4 rounded-xl shrink-0 opacity-60">
        <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/30 border-b border-slate-800/50">
          <img src="/images/ticket.png" alt="লটারি" className="w-6 h-6 object-contain opacity-40 grayscale" />
          <h3 className="text-sm font-orbitron font-extrabold tracking-widest text-slate-500 uppercase">
            লটারি
          </h3>
          <div className="font-orbitron font-bold text-slate-600 text-sm">
            ৳০০০
          </div>
        </div>
        <div className="p-4 w-full flex flex-col items-center gap-4">
          <div className="text-xs font-mono text-slate-500">লটারি নিষ্ক্রিয়</div>
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map((idx) => (
              <div key={`empty-${idx}`} className="w-10 h-10 md:w-12 md:h-12 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-center shadow-inner">
                <span className="text-xl md:text-2xl font-black text-slate-700 font-orbitron tracking-tighter">?</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col items-center justify-center bg-slate-950/60 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] relative overflow-hidden mb-4 rounded-xl shrink-0">
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0"></div>
      
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-amber-950/30 border-b border-amber-900/50">
        <img src="/images/ticket.png" alt="লটারি" className="w-7 h-7 object-contain drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
        <h3 className="text-sm font-orbitron font-extrabold tracking-widest text-amber-400 uppercase">
          লটারি
        </h3>
        <div className="font-orbitron font-bold text-amber-300 text-sm">
          ৳{lottery.prizeAmount || 0}
        </div>
      </div>

      <div className="p-4 w-full flex flex-col items-center gap-4">
        {/* Player Name */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <img src="/images/ticket.png" alt="টিকেট" className="w-5 h-5 object-contain opacity-80" />
          <span><span className="text-amber-200 font-bold">{lottery.playerName}</span> এর টিকেট:</span>
        </div>

        {/* Target Ticket (Player's Ticket) */}
        <div className="flex justify-center gap-2">
          {lottery.playerTicket.split('').map((char, idx) => (
            <div key={`target-${idx}`} className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 border-2 border-slate-700 rounded-lg flex items-center justify-center shadow-inner">
              <span className="text-xl md:text-2xl font-black text-white font-orbitron tracking-tighter">
                {char}
              </span>
            </div>
          ))}
        </div>

        {/* Slot Machine Display (Winning Code) */}
        <div className="flex justify-center gap-2 mt-2 p-3 bg-black/50 border border-amber-900/40 rounded-xl w-full shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] relative">
          
          {/* If lottery hasn't started, show overlay with Start button for the turn player */}
          {!lottery.hasStarted && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl">
              {isTurnPlayer ? (
                <button 
                  onClick={onStartLottery}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black px-6 py-2 rounded-full font-orbitron font-extrabold tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all hover:scale-105 active:scale-95"
                >
                  START
                </button>
              ) : (
                <span className="text-amber-400/80 font-orbitron text-xs animate-pulse tracking-widest">
                  অপেক্ষা করুন...
                </span>
              )}
            </div>
          )}

          {lottery.winningCode.split('').map((winChar, idx) => {
            const isRevealed = idx < lottery.revealedCount;
            const isSpinning = lottery.hasStarted && idx === lottery.revealedCount && !lottery.isComplete;
            const isMatch = isRevealed && winChar === lottery.playerTicket[idx];
            
            return (
              <div 
                key={`slot-${idx}`} 
                className={`w-10 h-12 md:w-12 md:h-14 rounded flex items-center justify-center relative overflow-hidden transition-all duration-300
                  ${isRevealed 
                    ? isMatch 
                      ? 'bg-green-950/80 border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                      : 'bg-red-950/80 border-2 border-red-500/50 opacity-50'
                    : 'bg-slate-800 border border-slate-700'
                  }
                `}
              >
                {/* Glossy overlay */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t" />
                
                {isRevealed ? (
                  <span className={`text-2xl md:text-3xl font-black font-orbitron ${isMatch ? 'text-green-400' : 'text-red-400'}`}>
                    {winChar}
                  </span>
                ) : isSpinning ? (
                  <SpinningChar />
                ) : (
                  <span className="text-2xl font-black text-slate-600 font-orbitron">?</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Status / Result Message */}
        <div className="h-8 mt-2 flex items-center justify-center">
          {!lottery.hasStarted ? (
            <span className="text-xs font-orbitron text-slate-400 tracking-widest">
              লটারি শুরু করার জন্য প্রস্তুত
            </span>
          ) : !lottery.isComplete ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
              <span className="text-xs font-orbitron text-amber-200 tracking-widest animate-pulse">
                লটারি মিলানো হচ্ছে...
              </span>
            </div>
          ) : lottery.isWinner ? (
            <span className="text-sm md:text-base font-orbitron font-extrabold text-green-400 tracking-widest shadow-green-500/50 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-bounce">
              🎉 ৳{lottery.prizeAmount} WIN! 🎉
            </span>
          ) : (
            <span className="text-xs font-orbitron text-slate-400 tracking-widest">
              কোড মিলেনি।
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component for the spinning animation effect
function SpinningChar() {
  const [char, setChar] = useState('A');
  
  useEffect(() => {
    const chars = ['A', 'E', 'I', 'O', 'U', '0', '1', '2', '3', '4', '5', '6', '7'];
    const interval = setInterval(() => {
      setChar(chars[Math.floor(Math.random() * chars.length)]);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-2xl md:text-3xl font-black text-amber-400/70 font-orbitron filter blur-[1px]">
      {char}
    </div>
  );
}
