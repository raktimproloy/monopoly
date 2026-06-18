"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { Trophy, RotateCw } from 'lucide-react';
import { GameState } from '../../shared/types';

interface GameOverOverlayProps {
  gameState: GameState;
  onRestartGame: () => void;
}

export default function GameOverOverlay({ gameState, onRestartGame }: GameOverOverlayProps) {
  const winner = gameState.winnerId ? gameState.players[gameState.winnerId] : null;

  const modalContent = (
    <div className="glass-overlay z-[90]">
      <div className="glass-modal max-w-lg w-full p-6 md:p-8 flex flex-col items-center gap-6 animate-in zoom-in-95 fade-in duration-300 border-yellow-500/40 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl" />
          <Trophy size={56} className="text-yellow-400 relative z-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-orbitron font-extrabold text-yellow-400 tracking-wider uppercase">
            গেম শেষ!
          </h2>
          {winner ? (
            <div className="flex flex-col items-center gap-2 mt-4">
              <span
                style={{ backgroundColor: winner.avatar }}
                className="w-10 h-10 rounded-full border-2 border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
              />
              <p className="text-xl md:text-2xl font-orbitron font-bold text-white">
                {winner.name}
              </p>
              <p className="text-sm text-yellow-400/80 font-sans">জয়ী হয়েছেন!</p>
            </div>
          ) : (
            <p className="text-slate-400 font-sans">কোনো বিজয়ী নেই।</p>
          )}
        </div>

        <button
          onClick={onRestartGame}
          className="w-full py-3.5 bg-[#6F4FF0] hover:bg-[#5C3ED9] text-white font-orbitron font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#6F4FF0]/30 transition-all active:scale-[0.98] cursor-pointer"
        >
          <RotateCw size={16} />
          নতুন গেম শুরু করুন
        </button>

        <p className="text-[10px] text-slate-500 font-mono text-center">
          একই সেটিংসে আবার খেলা শুরু হবে — সবাই দেখতে পাবে
        </p>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
