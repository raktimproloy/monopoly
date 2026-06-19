import React, { useState } from 'react';
import { GameState } from '../../shared/types';
import UseDonModal from './UseDonModal';
import { Zap, ShieldAlert, Key } from 'lucide-react';

interface PowerSectionProps {
  state: GameState;
  boardTiles: any[];
  playerId: string;
  onUsePowerCard?: (cardType: string, actionPayload: any) => void;
  onUsePardonCard?: () => void;
}

export default function PowerSection({ state, boardTiles, playerId, onUsePowerCard, onUsePardonCard }: PowerSectionProps) {
  const player = state.players[playerId];
  const [isDonModalOpen, setIsDonModalOpen] = useState(false);

  if (!player) return null;

  const pardonCards = player.getOutOfJailFreeCards || 0;
  const powerCards = player.powerCards || [];
  
  if (pardonCards === 0 && powerCards.length === 0) {
    return (
      <div className="w-full">
        <div className="glass-card border border-indigo-500/30 rounded-lg p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3 border-b border-indigo-500/20 pb-2">
            <Zap className="text-yellow-400" size={16} />
            <h3 className="text-sm font-bold text-indigo-100 tracking-wider">POWER CARDS</h3>
          </div>
          <div className="text-xs text-slate-400 font-mono text-center py-2">
            No active power cards
          </div>
        </div>
      </div>
    );
  }

  const handleUseDon = (targetTileIndexes: number[]) => {
    onUsePowerCard?.('BECOME_A_DON', { targetTileIndexes });
    setIsDonModalOpen(false);
  };

  const handleUsePardon = () => {
    if (player.inJail) {
      onUsePardonCard?.();
    }
  };

  return (
    <div className="w-full">
      <div className="glass-card p-3 xl:p-4 flex flex-col gap-3 relative overflow-hidden border-indigo-500/20 w-full">
        
        {/* Decorative background glow */}
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* SECTION TITLE: Locked down with flex-1 min-w-0 to guarantee truncation */}
        <h3 className="text-sm font-orbitron font-extrabold tracking-widest text-white uppercase flex items-center gap-2 border-b border-indigo-500/20 pb-2 w-full min-w-0">
          <Zap className="text-yellow-400 shrink-0" size={16} />
          <span className="truncate flex-1 min-w-0">MY POWER CARDS ({pardonCards + powerCards.length})</span>
        </h3>

        <div className="flex flex-col gap-2 relative z-10 w-full">
          
          {/* PARDON CARD (Grid Architecture) */}
          {pardonCards > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded p-2 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-center group hover:bg-indigo-900/40 transition-colors w-full">
              <div className="shrink-0 flex items-center justify-center p-1">
                <Key className="text-indigo-400" size={16} />
              </div>
              <div className="flex flex-col min-w-0 pr-1">
                <div className="text-xs font-bold text-white truncate">
                  Get Out of Jail <span className="text-white text-[10px] ml-1">x{pardonCards}</span>
                </div>
                <div className="text-[10px] text-white/80 truncate">Use or sell</div>
              </div>
              <div className="shrink-0">
                {player.inJail ? (
                  <button 
                    onClick={() => handleUsePardon()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 rounded px-2 py-1 text-[10px] font-bold transition-all whitespace-nowrap"
                  >
                    USE
                  </button>
                ) : (
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('sell_pardon_card'))}
                    className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-500/50 rounded px-2 py-1 text-[10px] font-bold transition-all whitespace-nowrap"
                  >
                    SELL (৳50)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BECOME A DON CARD (Grid Architecture) */}
          {powerCards.includes('BECOME_A_DON') && (
            <div className="bg-red-950/40 border border-red-500/30 rounded p-2 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-center group hover:bg-red-900/40 transition-colors shadow-[inset_0_0_10px_rgba(220,38,38,0.1)] w-full">
              <div className="shrink-0 flex items-center justify-center p-1">
                <ShieldAlert className="text-red-500" size={16} />
              </div>
              <div className="flex flex-col min-w-0 pr-1">
                <div className="text-xs font-bold text-white truncate">Become A Don</div>
                <div className="text-[10px] text-white/80 truncate">Hijack a property</div>
              </div>
              <div className="shrink-0">
                <button 
                  onClick={() => setIsDonModalOpen(true)}
                  className="bg-red-600 hover:bg-red-500 text-white border border-red-400 rounded px-2 py-1 text-[10px] font-bold transition-all whitespace-nowrap"
                >
                  USE
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {isDonModalOpen && (
        <UseDonModal 
          state={state} 
          boardTiles={boardTiles}
          playerId={playerId} 
          onClose={() => setIsDonModalOpen(false)} 
          onConfirm={handleUseDon}
        />
      )}
    </div>
  );
}
