import React, { useState } from 'react';
import { GameState } from '../../../shared/types';
import { X, ShieldAlert } from 'lucide-react';

interface UseDonModalProps {
  state: GameState;
  playerId: string;
  onClose: () => void;
  onConfirm: (targetTileIndex: number) => void;
}

export default function UseDonModal({ state, playerId, onClose, onConfirm }: UseDonModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTile, setSelectedTile] = useState<string>('');

  const otherPlayers = Object.values(state.players).filter(p => p.id !== playerId && !p.isBankrupt);
  
  // Get properties for the selected player
  const targetProperties = Object.values(state.properties).filter(p => p.ownerId === selectedPlayer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTile) {
      onConfirm(parseInt(selectedTile, 10));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0B0E14] border border-red-500/40 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.3)] w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950/80 to-[#0B0E14] p-4 flex justify-between items-center border-b border-red-500/20">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={24} />
            <h2 className="text-lg font-black text-red-100 tracking-wider">BECOME A DON</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            Select another player's property to hijack. You will collect all rent for this property for the next 3 rounds. The owner cannot upgrade or sell it during this time.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Target Player</label>
              <select 
                className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                value={selectedPlayer}
                onChange={(e) => {
                  setSelectedPlayer(e.target.value);
                  setSelectedTile('');
                }}
                required
              >
                <option value="" disabled>Select a player...</option>
                {otherPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Target Property</label>
              <select 
                className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                value={selectedTile}
                onChange={(e) => setSelectedTile(e.target.value)}
                required
                disabled={!selectedPlayer || targetProperties.length === 0}
              >
                <option value="" disabled>
                  {!selectedPlayer ? 'Select a player first' : targetProperties.length === 0 ? 'Player has no properties' : 'Select a property...'}
                </option>
                {targetProperties.map(p => (
                  <option key={p.tileIndex} value={p.tileIndex}>
                    {/* Assuming frontend has tile names mapped, or we just show index. Actually, we don't have boardTiles here directly without passing them. Let's just use Tile # */}
                    Tile #{p.tileIndex} (Houses: {p.houses})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!selectedTile}
                className="px-6 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                HIJACK PROPERTY
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
