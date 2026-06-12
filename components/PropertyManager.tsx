"use client";

import { GameState, BoardTile } from '../../shared/types';
import { DollarSign, Landmark, HelpCircle, Activity } from 'lucide-react';

interface PropertyManagerProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  onBuyProperty: (index: number) => void;
  onMortgageProperty: (index: number) => void;
  onUnmortgageProperty: (index: number) => void;
}

export default function PropertyManager({
  gameState,
  boardTiles,
  userId,
  onBuyProperty,
  onMortgageProperty,
  onUnmortgageProperty
}: PropertyManagerProps) {
  const player = gameState.players[userId];
  if (!player || player.isBankrupt) return null;

  const currentTileIndex = player.position;
  const currentTile = boardTiles[currentTileIndex];
  const currentTileState = gameState.properties[currentTileIndex];

  // Check if player stands on a property they can purchase right now
  const canPurchaseCurrent =
    currentTile &&
    ['STREET', 'RAILROAD', 'UTILITY'].includes(currentTile.type) &&
    (!currentTileState || !currentTileState.ownerId) &&
    gameState.currentTurnPlayerId === userId &&
    player.balance >= (currentTile.price || 0);

  // Get all properties owned by this player
  const myProperties = Object.values(gameState.properties).filter(
    (p) => p.ownerId === userId
  );

  const getGroupColor = (group: string | undefined): string => {
    switch (group) {
      case 'Brown': return 'bg-amber-800';
      case 'Light Blue': return 'bg-sky-400';
      case 'Pink': return 'bg-fuchsia-400';
      case 'Orange': return 'bg-orange-500';
      case 'Red': return 'bg-red-500';
      case 'Yellow': return 'bg-yellow-400';
      case 'Green': return 'bg-emerald-500';
      case 'Dark Blue': return 'bg-blue-700';
      default: return 'bg-slate-700';
    }
  };

  return (
    <div className="w-full p-4 glass-panel flex flex-col gap-4 select-none relative h-full">


      <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2">
        <Landmark size={14} className="text-cyber-blue" />
        ASSET DECK
      </h3>

      <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1">
        {/* Landed Purchase Prompt */}
        {canPurchaseCurrent && (
          <div className="p-3 bg-cyber-blue/5 border border-cyber-blue/30 rounded-lg shadow-[0_0_15px_rgba(0,245,255,0.05)] animate-pulse-slow">
            <span className="text-[8px] font-orbitron tracking-widest text-cyber-blue uppercase block mb-1">
              PROPOSED ACQUISITION
            </span>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="text-xs font-orbitron font-bold text-white uppercase">
                  {currentTile.name}
                </h4>
                <span className="text-[9px] font-mono text-slate-400 block">
                  Price: ${currentTile.price} | Mortgage: ${currentTile.mortgageValue || Math.floor((currentTile.price || 0) / 2)}
                </span>
              </div>
              <div className="text-xs font-orbitron font-bold text-cyber-blue">
                ${currentTile.price}
              </div>
            </div>
            <button
              onClick={() => onBuyProperty(currentTileIndex)}
              className="w-full py-2.5 glass-panel-light text-cyber-blue border border-cyber-blue/30 font-orbitron font-bold text-[10px] tracking-widest hover:bg-cyber-blue/15 hover:border-cyber-blue active:scale-[0.98] transition-all cursor-pointer shadow-neon-blue/10"
            >
              ACQUIRE DEED
            </button>
          </div>
        )}

        {/* Portfolio management list */}
        <div className="flex-1">
          <span className="text-[9px] font-orbitron tracking-widest text-slate-500 uppercase block mb-2">
            YOUR PORTFOLIO ACQUISITIONS ({myProperties.length})
          </span>

          {myProperties.length === 0 ? (
            <div className="text-center p-6 bg-slate-950/20 border border-slate-900/40 rounded-lg text-slate-600 font-mono text-[9px] uppercase tracking-wider">
              No property certificates acquired yet
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {myProperties.map((prop) => {
                const tile = boardTiles[prop.tileIndex];
                if (!tile) return null;

                const mortgageVal = tile.mortgageValue || Math.floor((tile.price || 0) / 2);
                const unmortgageCost = Math.ceil(mortgageVal * 1.1);

                return (
                  <div
                    key={prop.tileIndex}
                    className="p-2.5 bg-slate-950/30 border border-slate-900/50 rounded-lg flex justify-between items-center gap-2"
                  >
                    <div className="flex gap-2 items-center flex-1 min-w-0">
                      <div className={`w-2 h-7 rounded-sm shrink-0 ${getGroupColor(tile.group)}`} />
                      <div className="truncate">
                        <span className="text-[10px] font-bold text-white block uppercase truncate leading-tight">
                          {tile.name}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 block">
                          {prop.isMortgaged ? 'MORTGAGED' : `Rent: $${tile.rent ? tile.rent[prop.houses] : '0'}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {prop.isMortgaged ? (
                        <button
                          onClick={() => onUnmortgageProperty(prop.tileIndex)}
                          disabled={player.balance < unmortgageCost}
                          className={`px-2 py-1.5 rounded font-orbitron font-extrabold text-[8px] border tracking-wider transition-all select-none ${
                            player.balance >= unmortgageCost
                              ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500 cursor-pointer'
                              : 'text-slate-600 border-slate-900 bg-slate-950/40 cursor-not-allowed opacity-50'
                          }`}
                          title={`Unmortgage for $${unmortgageCost}`}
                        >
                          UNMTG (${unmortgageCost})
                        </button>
                      ) : (
                        <button
                          onClick={() => onMortgageProperty(prop.tileIndex)}
                          disabled={prop.houses > 0}
                          className={`px-2 py-1.5 rounded font-orbitron font-extrabold text-[8px] border tracking-wider transition-all select-none ${
                            prop.houses === 0
                              ? 'text-red-400 border-red-500/25 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500 cursor-pointer'
                              : 'text-slate-600 border-slate-900 bg-slate-950/40 cursor-not-allowed opacity-50'
                          }`}
                          title={`Mortgage for $${mortgageVal}`}
                        >
                          MTG (${mortgageVal})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
