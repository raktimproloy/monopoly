"use client";

import { GameState, BoardTile, Player } from '../../shared/types';
import { Shield, Dice5, CheckCircle } from 'lucide-react';
import DiceManager from './dice/DiceManager';

interface BoardProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  onRollDice: () => void;
  onEndTurn: () => void;
  onTileClick: (index: number) => void;
}

// Map Monopoly tile index to 11x11 grid row/column coordinates (Clockwise from Top-Left)
function getGridCoords(index: number): { row: number; col: number } {
  if (index >= 0 && index <= 10) {
    return { row: 1, col: index + 1 };
  } else if (index > 10 && index <= 20) {
    return { row: index - 9, col: 11 };
  } else if (index > 20 && index <= 30) {
    return { row: 11, col: 31 - index };
  } else {
    return { row: 41 - index, col: 1 };
  }
}

type TileOrientation = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT' | 'CORNER';
function getOrientation(index: number): TileOrientation {
  if (index === 0 || index === 10 || index === 20 || index === 30) return 'CORNER';
  if (index > 0 && index < 10) return 'TOP';
  if (index > 10 && index < 20) return 'RIGHT';
  if (index > 20 && index < 30) return 'BOTTOM';
  return 'LEFT';
}

export default function Board({
  gameState,
  boardTiles,
  userId,
  onRollDice,
  onEndTurn,
  onTileClick
}: BoardProps) {
  const isMyTurn = gameState.currentTurnPlayerId === userId;
  const activePlayer = gameState.players[gameState.currentTurnPlayerId];

  // Group players by their current tile position
  const playersOnTile = (tileIndex: number): Player[] => {
    return Object.values(gameState.players).filter((p) => p.position === tileIndex && !p.isBankrupt);
  };

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
    <div className="relative aspect-square w-full max-w-[calc(100vh-32px)] max-h-full mx-auto bg-[#0B0E14] p-2 border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col justify-between">
      {/* 11x11 Grid Wrapper */}
      <div className="grid grid-cols-11 grid-rows-11 gap-1 w-full h-full">
        {boardTiles.map((tile) => {
          const coords = getGridCoords(tile.index);
          const orientation = getOrientation(tile.index);
          const propState = gameState.properties[tile.index];
          const standingPlayers = playersOnTile(tile.index);

          // Get owner details
          let ownerInitials = '';
          let isMortgaged = false;
          let houses = 0;
          if (propState) {
            isMortgaged = propState.isMortgaged;
            houses = propState.houses;
            if (propState.ownerId) {
              const owner = gameState.players[propState.ownerId];
              if (owner) {
                ownerInitials = owner.name.substring(0, 2).toUpperCase();
              }
            }
          }

          // Directional layout classes
          const flexDirClass = 
            orientation === 'BOTTOM' ? 'flex-col-reverse' : 'flex-col';
          
          const rotationClass = 
            orientation === 'RIGHT' ? 'rotate-90' :
            orientation === 'LEFT' ? '-rotate-90' : '';

          // Color Indicator (Flag) positioning overlapping inner edge
          const colorIndicatorClass = {
            TOP: 'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[80%] h-[6px] md:h-[8px] rounded-full z-10 shadow-lg',
            BOTTOM: 'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[6px] md:h-[8px] rounded-full z-10 shadow-lg',
            RIGHT: 'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-[80%] w-[6px] md:w-[8px] rounded-full z-10 shadow-lg',
            LEFT: 'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-[80%] w-[6px] md:w-[8px] rounded-full z-10 shadow-lg',
            CORNER: 'hidden',
          }[orientation];

          return (
            <div
              key={tile.index}
              style={{ gridRow: coords.row, gridColumn: coords.col }}
              onClick={() => onTileClick(tile.index)}
              className={`relative rounded-lg bg-slate-800/40 backdrop-blur-md border border-white/10 transition-all duration-150 cursor-pointer group hover:bg-slate-700/50 hover:border-slate-500/50 shadow-inner overflow-visible ${
                orientation === 'CORNER' ? 'bg-slate-900/60 p-2 flex flex-col justify-center items-center' : ''
              }`}
            >
              {/* Glassmorphism Inner Layout Wrapper */}
              <div className={`w-full h-full flex items-center justify-between p-1 ${flexDirClass} ${rotationClass}`}>
                
                {/* 1. Price (Outer Edge) */}
                {orientation !== 'CORNER' && (
                  <div className="text-[6px] md:text-[8px] xl:text-[10px] font-mono font-bold text-slate-400 h-[10px] flex items-center shrink-0">
                    {tile.price ? `$${tile.price}` : ''}
                  </div>
                )}

                {/* 2. Name & Center Content */}
                <div className={`text-[6px] md:text-[7px] xl:text-[9px] font-bold leading-tight text-slate-200 font-sans break-words text-center flex-1 flex flex-col items-center justify-center min-h-0 px-0.5 ${orientation === 'CORNER' ? 'text-[8px] md:text-[12px] text-slate-100 uppercase' : ''}`}>
                  {tile.name}
                  {orientation === 'CORNER' && tile.index === 0 && <div className="text-emerald-400 mt-1">GO</div>}
                </div>

                {/* 3. Icons / Ownership (Inner Edge Area) */}
                {orientation !== 'CORNER' && (
                  <div className="flex flex-col items-center gap-[1px] h-[10px] shrink-0 justify-end">
                    {/* Houses */}
                    {houses > 0 && (
                      <div className="flex gap-[1px]">
                        {Array.from({ length: Math.min(houses, 4) }).map((_, i) => (
                          <span key={i} className="w-[3px] h-[3px] rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                        ))}
                        {houses === 5 && (
                          <span className="w-[4px] h-[4px] rounded bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.6)]" />
                        )}
                      </div>
                    )}
                    
                    {/* Ownership Badge */}
                    {ownerInitials && (
                      <div className={`px-[2px] text-[4px] md:text-[6px] font-mono rounded font-bold border ${
                        isMortgaged ? 'bg-red-950 text-red-400 border-red-800' : 'bg-slate-800 text-slate-300 border-slate-600'
                      }`}>
                        {isMortgaged ? 'M' : ownerInitials}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Overlapping Color Indicator (Flag replacement) */}
              {tile.group && orientation !== 'CORNER' && (
                <div className={`${colorIndicatorClass} ${getGroupColor(tile.group)}`} />
              )}

              {/* Standing Player Tokens Overlay */}
              {standingPlayers.length > 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center gap-[2px] flex-wrap pointer-events-none bg-slate-950/40 rounded-lg backdrop-blur-[2px]">
                  {standingPlayers.map((p) => {
                    const isMe = p.id === userId;
                    return (
                      <div
                        key={p.id}
                        className={`w-3.5 h-3.5 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[7px] md:text-[10px] font-orbitron font-extrabold text-slate-950 border-2 shadow-lg ${
                          isMe ? 'bg-[#8BA4F9] border-white shadow-[0_0_10px_rgba(139,164,249,0.8)]' : 'bg-[#D8B4F8] border-white shadow-[0_0_10px_rgba(216,180,248,0.8)]'
                        }`}
                        title={p.name}
                      >
                        {p.name.substring(0, 1).toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Center Canvas Area (occupies rows 2 to 10, columns 2 to 10) */}
        <div className="col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-between p-4 bg-slate-950/20 backdrop-blur-sm rounded-2xl border border-white/5 m-3 relative shadow-inner overflow-hidden">
          
          {/* Subtle Turn Overlay at Top */}
          <div className="text-center mt-2 z-10 select-none">
            <span className="text-[9px] font-orbitron tracking-widest text-slate-500 uppercase block font-bold">
              OPERATING CHANNEL
            </span>
            <span className={`text-[11px] font-orbitron font-extrabold tracking-widest ${isMyTurn ? 'text-[#8BA4F9] animate-pulse' : 'text-[#D8B4F8]'}`}>
              {activePlayer?.name.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          {/* 3D Physics Dice Display */}
          <div className="w-full flex-1 min-h-0 flex items-center justify-center relative">
            <DiceManager gameState={gameState} />
          </div>

          {/* Tactical Deck Controller (Action Buttons shown ONLY when active) */}
          <div className="w-full max-w-[240px] mb-2 z-10 flex flex-col gap-2">
            {isMyTurn && gameState.turnStatus === 'MUST_ROLL' && (
              <button
                onClick={onRollDice}
                className="w-full py-2 px-4 glass-panel-light text-[#8BA4F9] border border-[#8BA4F9]/30 font-orbitron font-extrabold text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#8BA4F9]/15 hover:border-[#8BA4F9] active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(139,164,249,0.15)] uppercase"
              >
                <Dice5 size={12} />
                ROLL TRANSIT
              </button>
            )}

            {isMyTurn && gameState.turnStatus === 'MUST_ACT_OR_END' && (
              <button
                onClick={onEndTurn}
                className="w-full py-2 px-4 glass-panel-light text-emerald-400 border border-emerald-500/20 font-orbitron font-extrabold text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500/10 hover:border-emerald-500 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.1)] uppercase"
              >
                <CheckCircle size={12} />
                CONCLUDE TURN
              </button>
            )}
            
            {isMyTurn && activePlayer.balance < 0 && (
              <div className="w-full py-2 px-3 text-center text-[9px] font-mono bg-red-950/45 border border-red-500/20 text-red-400 rounded-lg uppercase tracking-wider">
                DEBT WARNING: RESOLVE BALANCE
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
