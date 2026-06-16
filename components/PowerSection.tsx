import React, { useState } from 'react';
import { GameState } from '../../../shared/types';
import UseDonModal from './UseDonModal';
import { Zap, ShieldAlert, Key } from 'lucide-react';

interface PowerSectionProps {
  state: GameState;
  playerId: string;
  onUsePowerCard?: (cardType: string, actionPayload: any) => void;
  onUsePardonCard?: () => void;
}

export default function PowerSection({ state, playerId, onUsePowerCard, onUsePardonCard }: PowerSectionProps) {
  const player = state.players[playerId];
  const [isDonModalOpen, setIsDonModalOpen] = useState(false);

  if (!player) return null;

  const pardonCards = player.getOutOfJailFreeCards || 0;
  const powerCards = player.powerCards || [];
  
  if (pardonCards === 0 && powerCards.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-[#0f172a]/90 border border-indigo-500/30 rounded-lg p-3 backdrop-blur-md">
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

  const handleUseDon = (targetTileIndex: number) => {
    onUsePowerCard?.('BECOME_A_DON', { targetTileIndex });
    setIsDonModalOpen(false);
  };

  const handleUsePardon = () => {
    if (player.inJail) {
      onUsePardonCard?.();
    }
  };

  return (
    <>
      <div className="w-full mt-3">
        <div className="bg-[#0f172a]/90 border border-indigo-500/30 rounded-lg p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3 border-b border-indigo-500/20 pb-2">
            <Zap className="text-yellow-400" size={16} />
            <h3 className="text-sm font-bold text-indigo-100 tracking-wider">POWER CARDS</h3>
          </div>
          
          <div className="flex flex-col gap-2">
            {pardonCards > 0 && (
              <div className="bg-[#1e293b]/80 border border-slate-600 rounded p-2 flex justify-between items-center group hover:bg-[#334155]/80 transition-colors">
                <div className="flex items-center gap-2">
                  <Key className="text-emerald-400" size={16} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Pardon Card x{pardonCards}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Get out of jail free</div>
                  </div>
                </div>
                {player.inJail && (
                  <button 
                    onClick={handleUsePardon}
                    className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/50 rounded px-2 py-1 text-[10px] font-bold transition-all"
                  >
                    USE
                  </button>
                )}
              </div>
            )}

            {powerCards.includes('BECOME_A_DON') && (
              <div className="bg-red-950/40 border border-red-500/30 rounded p-2 flex justify-between items-center group hover:bg-red-900/40 transition-colors shadow-[inset_0_0_10px_rgba(220,38,38,0.1)]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-red-500" size={16} />
                  <div>
                    <div className="text-xs font-bold text-red-200">Become A Don</div>
                    <div className="text-[10px] text-red-400/80 leading-tight">Hijack a property</div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDonModalOpen(true)}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 rounded px-2 py-1 text-[10px] font-bold transition-all"
                >
                  USE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDonModalOpen && (
        <UseDonModal 
          state={state} 
          playerId={playerId} 
          onClose={() => setIsDonModalOpen(false)} 
          onConfirm={handleUseDon} 
        />
      )}
    </>
  );
}
