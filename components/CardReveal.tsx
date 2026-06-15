"use client";

import { useState, useEffect } from 'react';
import { GameState } from '../../shared/types';
import { soundManager } from '../utils/soundManager';
import { toBanglaNum } from '../utils/format';

interface CardRevealProps {
  gameState: GameState;
  userId: string;
  onResolve: () => void;
  onSellPardon?: () => void;
}

export default function CardReveal({ gameState, userId, onResolve, onSellPardon }: CardRevealProps) {
  const [flipped, setFlipped] = useState(false);
  const [canResolve, setCanResolve] = useState(false);
  const [visible, setVisible] = useState(false);

  const card = gameState.drawnCard;
  const isMyTurn = gameState.currentTurnPlayerId === userId;
  const activePlayerName = gameState.players[gameState.currentTurnPlayerId]?.name;

  useEffect(() => {
    // Reset state when a new card is drawn
    if (card && isMyTurn) {
      setFlipped(false);
      setCanResolve(false);
      setVisible(false);

      // Wait 2.2 seconds for dice roll and player movement animations
      const showTimer = setTimeout(() => {
        setVisible(true);
        // Automatically flip the card after 1 second for dramatic effect
        setTimeout(() => {
          setFlipped(true);
          soundManager.playEventSound('CARD_FLIP');
        }, 1000);
        // Allow resolving 1.5 seconds after flip so they have time to read
        setTimeout(() => setCanResolve(true), 2500);
      }, 2200);
      
      return () => {
        clearTimeout(showTimer);
      };
    }
  }, [card, isMyTurn]);

  if (!card || !isMyTurn || !visible) return null;

  const isChance = card.type === 'CHANCE';
  const isPardon = card.action === 'GET_OUT_OF_JAIL_FREE';

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="flex flex-col items-center">
        
        {/* Card Container for 3D flip */}
        <div className="relative w-64 h-96 md:w-80 md:h-[450px] transition-transform duration-500 hover:scale-105" style={{ perspective: '1000px' }}>
          <div 
            className="w-full h-full transition-transform duration-700" 
            style={{ 
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            
            {/* Card Back */}
            <div 
              className="absolute inset-0 flex items-center justify-center rounded-2xl border-4 shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center p-6">
                <div className={`text-6xl md:text-8xl mb-4 ${isChance ? 'text-orange-500' : 'text-blue-500'}`}>
                  {isChance ? '?' : '🗝️'}
                </div>
                <div className="font-orbitron font-black text-2xl tracking-widest text-slate-300 uppercase">
                  {isChance ? 'সুযোগ' : 'তহবিল'}
                </div>
              </div>
            </div>

            {/* Card Front */}
            <div 
              className={`absolute inset-0 flex flex-col rounded-2xl border-4 shadow-2xl overflow-hidden ${isChance ? 'bg-orange-100 border-orange-500' : 'bg-blue-100 border-blue-500'}`}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              
              <div className={`p-4 text-center font-orbitron font-black text-white uppercase tracking-widest shadow-md ${isChance ? 'bg-orange-500' : 'bg-blue-500'}`}>
                {isChance ? 'সুযোগ' : 'তহবিল'}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="font-sans font-bold text-xl md:text-2xl text-slate-800 leading-snug">
                  {card.text}
                </div>

                {card.isSecret && (
                  <div className="mt-4 text-xs font-mono font-bold text-red-500 border border-red-500 px-3 py-1 rounded-full animate-pulse">
                    গোপন কার্ড
                  </div>
                )}
              </div>

              {/* Decorative bottom pattern */}
              <div className={`h-6 w-full opacity-20 ${isChance ? 'bg-[url(/images/pattern-chance.png)]' : 'bg-[url(/images/pattern-chest.png)]'}`} />
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className={`mt-8 flex gap-4 transition-opacity duration-500 ${flipped ? 'opacity-100' : 'opacity-0'}`}>
          {isPardon ? (
            <>
              <button
                onClick={onResolve}
                disabled={!canResolve}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-orbitron font-black px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
              >
                রেখে দিন
              </button>
              {onSellPardon && (
                <button
                  onClick={() => {
                    // Optimistically resolve card to clear state, then sell
                    onResolve();
                    setTimeout(onSellPardon, 100);
                  }}
                  disabled={!canResolve}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-orbitron font-black px-6 py-3 rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  বিক্রি করুন ৳{toBanglaNum(50)}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onResolve}
              disabled={!canResolve}
              className="bg-[#6F4FF0] hover:bg-[#5C3ED9] disabled:opacity-50 disabled:cursor-not-allowed text-white font-orbitron font-black px-12 py-3 rounded-xl shadow-lg shadow-[#6F4FF0]/30 transition-all active:scale-95 text-lg tracking-wider"
            >
              ঠিক আছে
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
