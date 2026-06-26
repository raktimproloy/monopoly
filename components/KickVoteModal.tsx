"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { X, UserX, Check } from 'lucide-react';
import { GameState } from '@/shared/types';

interface KickVoteModalProps {
  gameState: GameState;
  userId: string;
  onClose: () => void;
  onCastVote: (targetPlayerId: string | null) => void;
}

export default function KickVoteModal({ gameState, userId, onClose, onCastVote }: KickVoteModalProps) {
  const activePlayers = Object.values(gameState.players).filter((p) => !p.isBankrupt);
  const requiredVotes = Math.ceil(activePlayers.length / 2);
  const kickVotes = gameState.kickVotes || {};
  const myVote = kickVotes[userId] || null;

  const voteCounts: Record<string, number> = {};
  for (const [voterId, targetId] of Object.entries(kickVotes)) {
    const voter = gameState.players[voterId];
    const target = gameState.players[targetId];
    if (!voter || voter.isBankrupt || !target || target.isBankrupt) continue;
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  const kickablePlayers = activePlayers.filter((p) => p.id !== userId);

  const handleVote = (targetId: string) => {
    if (myVote === targetId) {
      onCastVote(null);
    } else {
      onCastVote(targetId);
    }
  };

  const modalContent = (
    <div className="glass-overlay z-[100]">
      <div className="glass-modal max-w-md w-full p-5 md:p-6 flex flex-col gap-4 animate-in zoom-in-95 fade-in duration-200 border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.15)]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserX size={20} className="text-red-400" />
            <h2 className="text-lg font-orbitron font-bold text-slate-100">কিক ভোট</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} className="text-slate-400 hover:text-white" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          একজন খেলোয়াড়কে কিক করতে মোট সক্রিয় খেলোয়াড়ের <span className="text-red-400 font-bold">৫০%</span> ভোট প্রয়োজন
          ({requiredVotes}/{activePlayers.length})। ভোট পরিবর্তন করতে আবার ক্লিক করুন।
        </p>

        <div className="flex flex-col gap-2">
          {kickablePlayers.map((player) => {
            const count = voteCounts[player.id] || 0;
            const isMyVote = myVote === player.id;
            const thresholdMet = count >= requiredVotes;

            return (
              <button
                key={player.id}
                onClick={() => handleVote(player.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.98] ${
                  isMyVote
                    ? 'bg-red-950/50 border-red-500/50 text-red-200'
                    : 'bg-[#19162A]/60 border-[#2D284B] hover:border-red-500/30 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    style={{ backgroundColor: player.avatar }}
                    className="w-4 h-4 rounded-full shrink-0 border border-white/10"
                  />
                  <span className="font-sans font-semibold text-sm">{player.name}</span>
                  {isMyVote && <Check size={14} className="text-red-400" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${thresholdMet ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                    {count}/{requiredVotes} ভোট
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {myVote && (
          <button
            onClick={() => onCastVote(null)}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors font-sans"
          >
            আমার ভোট প্রত্যাহার করুন
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
