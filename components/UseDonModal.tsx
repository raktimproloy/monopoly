import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameState, BoardTile } from '../../shared/types';
import { X, ShieldAlert, ChevronRight, Home, Building2, Crosshair } from 'lucide-react';
import { toBanglaNum } from '../utils/format';

interface UseDonModalProps {
  state: GameState;
  boardTiles: BoardTile[];
  playerId: string;
  onClose: () => void;
  onConfirm: (targetTileIndexes: number[]) => void;
}

const getGroupColor = (group: string | undefined): string => {
  switch (group) {
    case 'Brown': return 'bg-amber-700';
    case 'Light Blue': return 'bg-cyan-400';
    case 'Pink': return 'bg-fuchsia-400';
    case 'Orange': return 'bg-orange-500';
    case 'Red': return 'bg-red-500';
    case 'Yellow': return 'bg-yellow-400';
    case 'Green': return 'bg-emerald-500';
    case 'Dark Blue': return 'bg-blue-600';
    default: return 'bg-slate-700';
  }
};

export default function UseDonModal({ state, boardTiles, playerId, onClose, onConfirm }: UseDonModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);

  const otherPlayers = Object.values(state.players).filter(p => p.id !== playerId && !p.isBankrupt);
  
  const targetProperties = Object.values(state.properties).filter(p => p.ownerId === selectedPlayer);

  const handleConfirm = () => {
    if (selectedTiles.length > 0) {
      onConfirm(selectedTiles);
    }
  };

  const toggleTile = (index: number) => {
    setSelectedTiles(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, index];
    });
  };

  const calculateRent = (p: any, tile: BoardTile) => {
    if (p.isMortgaged) return 0;
    if (tile.type === 'UTILITY') return 'DICE x RENT'; // Special case
    
    let currentRent = tile.rent ? tile.rent[p.houses] : 0;
    if (tile.type === 'STREET' && p.houses === 0 && state.settings?.doubleRentOnCompleteSet) {
      const ownsFullSet = boardTiles.filter(t => t.group === tile.group).every(t => {
        const prop = state.properties[t.index];
        return prop && prop.ownerId === p.ownerId;
      });
      if (ownsFullSet) currentRent *= 2;
    } else if (tile.type === 'RAILROAD') {
      const count = Object.values(state.properties).filter(
        prop => prop.ownerId === p.ownerId && boardTiles[prop.tileIndex]?.type === 'RAILROAD'
      ).length;
      currentRent = tile.rent ? tile.rent[count - 1] || 25 : 25;
    }
    return currentRent;
  };

  const modalContent = (
    <div className="glass-overlay z-[99999]">
      <div className="glass-modal max-w-[360px] md:max-w-3xl w-full p-5 md:p-6 flex flex-col gap-5 animate-in zoom-in-95 fade-in duration-200 border-red-500/40 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-[#231F3B] hover:bg-[#2F294F] w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#241F3C] pb-3">
          <div className="bg-[#241F3C] p-2 rounded-lg">
            <Crosshair className="text-[#A78BFA]" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-orbitron font-extrabold tracking-widest text-[#C8B6FF] uppercase">
              Become a Don
            </h2>
            <p className="text-xs text-slate-400 font-mono">Select a player and hijack up to 3 properties for 1 round.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 items-stretch">
          
          {/* Left Column: Player Selection */}
          <div className="flex flex-col gap-3 h-[200px] md:h-[400px] overflow-hidden">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Target Player</span>
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
              {otherPlayers.length === 0 ? (
                <div className="text-center py-7 text-slate-500 font-mono text-xs uppercase tracking-wider">
                  No active players
                </div>
              ) : (
                otherPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlayer(p.id);
                      setSelectedTiles([]);
                    }}
                    className={`rounded-xl py-3 px-3 flex items-center gap-3 text-white font-extrabold text-sm transition-all cursor-pointer w-full text-left shadow-sm border ${
                      selectedPlayer === p.id 
                      ? 'bg-[#5B37E8]/25 border-[#7B5BF2]' 
                      : 'bg-[#241F3C] border-[#2E284D] hover:bg-[#2F294F] hover:border-[#4C3D8B]'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: p.avatar }}
                      className="relative w-8 h-8 rounded-full shrink-0 border border-white/10"
                    />
                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="truncate text-slate-200">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">Balance: ৳{toBanglaNum(p.balance)}</span>
                    </div>
                    {selectedPlayer === p.id && <ChevronRight size={16} className="text-[#A78BFA] shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Properties Selection */}
          <div className="flex flex-col gap-3 h-[280px] md:h-[400px] overflow-hidden md:border-l md:border-[#241F3C] md:pl-6">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex justify-between">
              <span>{selectedPlayer ? "Select up to 3 Properties" : "Awaiting Player Selection"}</span>
              {selectedTiles.length > 0 && <span className="text-[#A78BFA]">{selectedTiles.length}/3 Selected</span>}
            </span>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2">
              {!selectedPlayer ? (
                <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs uppercase tracking-widest text-center border-2 border-dashed border-[#241F3C] rounded-xl p-6">
                  Select a player from the left<br/>to view their properties
                </div>
              ) : targetProperties.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs uppercase tracking-widest text-center border-2 border-dashed border-[#241F3C] rounded-xl p-6">
                  This player has no properties
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {targetProperties.map(p => {
                    const tile = boardTiles[p.tileIndex];
                    if (!tile) return null;
                    const isSelected = selectedTiles.includes(p.tileIndex);
                    const selectionIndex = selectedTiles.indexOf(p.tileIndex);
                    const rent = calculateRent(p, tile);
                    const isMortgaged = p.isMortgaged;

                    return (
                      <div
                        key={p.tileIndex}
                        onClick={() => toggleTile(p.tileIndex)}
                        className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#5B37E8]/20 border-[#7B5BF2] scale-[1.02] z-10'
                            : 'bg-[#1E1B2E] border-[#2E284D] hover:border-[#4C3D8B] hover:bg-[#251f38]'
                        }`}
                      >
                        {/* Top Color Strip */}
                        <div className={`h-2 w-full ${getGroupColor(tile.group)}`} />
                        
                        <div className="p-3 flex flex-col gap-2">
                          <h3 className="text-xs font-bold text-white truncate uppercase tracking-wider" title={tile.name}>
                            {tile.name}
                          </h3>
                          
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1 text-slate-400">
                              {p.houses === 5 ? (
                                <Building2 size={12} className="text-red-400" />
                              ) : p.houses > 0 ? (
                                Array.from({length: p.houses}).map((_, i) => <Home key={i} size={12} className="text-emerald-400" />)
                              ) : (
                                <span className="text-[9px] font-mono">NO HOUSES</span>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <span className="block text-[8px] text-slate-500 font-mono uppercase tracking-widest leading-tight">Rent</span>
                              <span className={`text-[11px] font-bold font-mono ${isMortgaged ? 'text-red-400' : 'text-emerald-400'}`}>
                                {isMortgaged ? 'MORTGAGED' : typeof rent === 'number' ? `৳${toBanglaNum(rent)}` : rent}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-[#7B5BF2] rounded-full border border-[#131122] flex items-center justify-center text-[9px] font-bold text-white font-mono">
                            {selectionIndex + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#241F3C] pt-4 flex justify-end gap-3 mt-1">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-[#241F3C] transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedTiles.length === 0}
            className="bg-gradient-to-r from-[#7B5BF2] to-[#6F4FF0] hover:from-[#6A47E8] hover:to-[#5E3CCF] text-white px-6 py-2.5 rounded-xl font-orbitron font-extrabold text-xs tracking-widest transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md flex items-center gap-2"
          >
            <Crosshair size={14} />
            HIJACK SELECTED
          </button>
        </div>

      </div>
    </div>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(modalContent, document.body);
}
