"use client";

import { useState, useRef, useEffect } from 'react';
import { GameState, BoardTile } from '../../shared/types';
import { toBanglaNum } from '../utils/format';
import { soundManager } from '../utils/soundManager';
// No icon imports needed since we use native emojis and custom SVGs

interface PlayerListProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
}

export default function PlayerList({ gameState, boardTiles, userId }: PlayerListProps) {

  // Animation tracking states
  const [floaters, setFloaters] = useState<Record<string, { id: number; diff: number }[]>>({});
  const [displayBalances, setDisplayBalances] = useState<Record<string, number>>({});
  
  const prevBalances = useRef<Record<string, number>>({});
  const prevGameState = useRef<GameState>(gameState);
  const initialized = useRef(false);
  const lastMoneySoundTime = useRef<number>(0);

  const getGroupColor = (group: string | undefined): string => {
    switch (group) {
      case 'Brown': return 'bg-[#64748b]'; // Group 11 (Steel/Slate)
      case 'Light Blue': return 'bg-[#06b6d4]'; // Group 6 (Cyan)
      case 'Pink': return 'bg-[#d946ef]'; // Group 10 (Pink)
      case 'Orange': return 'bg-[#f97316]'; // Group 2 (Orange)
      case 'Red': return 'bg-[#ef4444]'; // Group 1 (Red)
      case 'Yellow': return 'bg-[#eab308]'; // Group 3 (Yellow)
      case 'Green': return 'bg-[#22c55e]'; // Group 5 (Green)
      case 'Dark Blue': return 'bg-[#3b82f6]'; // Group 7 (Blue)
      default: return 'bg-slate-700';
    }
  };

  // Watch for balance changes to dispatch isolated floaters per player in the list
  useEffect(() => {
    if (!gameState || !gameState.players) return;

    if (!initialized.current) {
      const initialBalances: Record<string, number> = {};
      Object.values(gameState.players).forEach(p => {
        initialBalances[p.id] = p.balance;
        prevBalances.current[p.id] = p.balance;
      });
      setDisplayBalances(initialBalances);
      initialized.current = true;
      return;
    }

    const prevState = prevGameState.current;
    prevGameState.current = gameState;

    // Calculate sync delay if the active player moved
    const currentActiveId = gameState.currentTurnPlayerId;
    const prevActivePos = prevState.players[currentActiveId]?.position;
    const newActivePos = gameState.players[currentActiveId]?.position;
    const activeMoved = prevActivePos !== undefined && prevActivePos !== newActivePos;
    
    const delay = activeMoved ? 2200 : 0;
    const changes: { id: string, diff: number, newBalance: number }[] = [];

    Object.values(gameState.players).forEach(p => {
      const prev = prevBalances.current[p.id];
      if (prev !== undefined && prev !== p.balance) {
        changes.push({ id: p.id, diff: p.balance - prev, newBalance: p.balance });
      }
      prevBalances.current[p.id] = p.balance;
    });

    // --- LOCATION & STATUS AUDIO TRACKER ---
    Object.values(gameState.players).forEach(player => {
      const prevPlayer = prevState.players[player.id];
      if (!prevPlayer) return;

      // TRIGGER 1: Player gets sent to Jail (inJail changes from false -> true)
      if (!prevPlayer.inJail && player.inJail) {
        try {
          soundManager.playEventSound('PRISON_SOUND');
        } catch (err) {
          console.warn("Prison sound failed:", err);
        }
      }

      // TRIGGER 2: Player lands on "Obosor" (Position changes, and new tile is Obosor)
      if (prevPlayer.position !== player.position) {
        const landedTile = boardTiles[player.position];
        // Match the tile by name (e.g., 'অবসর') or type if applicable
        if (landedTile?.name?.includes('অবসর') || landedTile?.type === 'FREE_PARKING') {
          try {
            soundManager.playEventSound('PRISON_SOUND');
          } catch (err) {
            console.warn("Prison sound failed:", err);
          }
        }
      }
    });

    if (changes.length > 0) {
      setTimeout(() => {
        // --- THROTTLED SOUND PLAYBACK ---
        // Prevents double-playing when multiple balances change (e.g. paying rent)
        const now = Date.now();
        if (now - lastMoneySoundTime.current > 500) {
          try {
            soundManager.playEventSound('MONEY_TRANSACTION');
            lastMoneySoundTime.current = now;
          } catch (err) {
            console.warn("Money sound failed to play:", err);
          }
        }

        setDisplayBalances(curr => {
          const next = { ...curr };
          changes.forEach(c => { next[c.id] = c.newBalance; });
          return next;
        });

        setFloaters(currFloaters => {
          const newFloaters = { ...currFloaters };
          changes.forEach(c => {
            if (!newFloaters[c.id]) newFloaters[c.id] = [];
            const fId = Math.random();
            newFloaters[c.id] = [...newFloaters[c.id], { id: fId, diff: c.diff }];
            
            setTimeout(() => {
              setFloaters(latest => ({
                ...latest, [c.id]: latest[c.id]?.filter(f => f.id !== fId) || []
              }));
            }, 1500);
          });
          return newFloaters;
        });
      }, delay);
    }
  }, [gameState.players]);

  return (
    <div className="w-full p-4 bg-[#19162C] border border-[#2D284B] rounded-2xl flex flex-col gap-3.5 select-none relative h-auto shadow-[0_4px_20px_rgba(0,0,0,0.25)]">

      
      <h3 className="text-base font-orbitron font-extrabold tracking-widest text-slate-300 uppercase flex items-center gap-2">
        <UsersListIcon size={16} className="text-[#8B5CF6]" />
        খেলোয়াড় তালিকা
      </h3>

      <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
        {gameState.playerOrder.map((playerId) => {
          const player = gameState.players[playerId];
          if (!player) return null;



          const isCurrentTurn = gameState.currentTurnPlayerId === playerId;
          const isMe = playerId === userId;
          const isCpu = playerId.startsWith('cpu') || playerId === 'cpu_player';
          const isHost = gameState.playerOrder[0] === playerId;

          return (
            <div
              key={playerId}
              className={`relative flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 ${
                isCurrentTurn
                  ? 'bg-[#241F3E] border border-[#4E467D] shadow-md pl-3.5' 
                  : 'bg-[#121021]/50 border border-[#241F3C] pl-3'
              } ${player.isBankrupt ? 'opacity-40 grayscale' : ''}`}
            >
              {/* Highlight Vertical Bar on left for active player */}
              {isCurrentTurn && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 rounded-l shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
              )}

              {/* Left block: Avatar + Name + badges */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Cute Avatar Circle with Eyes */}
                <div
                  style={{ backgroundColor: player.avatar, boxShadow: `0 2px 8px ${player.avatar}25` }}
                  className="relative w-7 h-7 rounded-full shrink-0 border border-white/10 flex items-center justify-center overflow-hidden"
                >
                  {/* Eyes looking to the right */}
                  <div className="absolute top-1.5 right-1 flex gap-[1px]">
                    {/* Left eye */}
                    <div className="w-[5px] h-[7px] bg-white rounded-full relative flex items-center justify-center">
                      <div className="w-[2px] h-[3px] bg-black rounded-full absolute bottom-[0.5px] right-[0.8px]" />
                    </div>
                    {/* Right eye */}
                    <div className="w-[5px] h-[7px] bg-white rounded-full relative flex items-center justify-center">
                      <div className="w-[2px] h-[3px] bg-black rounded-full absolute bottom-[0.5px] right-[0.8px]" />
                    </div>
                  </div>
                </div>

                {/* Name and labels */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[12.5px] font-sans font-bold tracking-wide truncate ${isCurrentTurn ? 'text-white' : 'text-slate-300'} ${isMe ? 'underline decoration-cyber-blue decoration-2' : ''}`}>
                      {player.name}
                    </span>

                    {/* Me Badge */}
                    {isMe && (
                      <span className="text-[7px] font-mono text-cyber-blue bg-cyber-blue/10 border border-cyber-blue/20 px-1 py-px rounded font-bold uppercase">
                        আপনি
                      </span>
                    )}

                    {/* Host Icon */}
                    {isHost && (
                      <span title="Host Player" className="text-[11px] leading-none">👑</span>
                    )}

                    {/* Bot Icon */}
                    {isCpu && (
                      <span title="AI Bot" className="text-[11px] leading-none">🤖</span>
                    )}

                    {/* Detained/Jail Icon */}
                    {player.inJail && !player.isBankrupt && (
                      <span title="Detained in Jail" className="text-[8px] bg-amber-950/70 border border-amber-800/30 text-amber-400 px-1 py-px rounded font-mono font-bold uppercase tracking-wider">
                        জেলে
                      </span>
                    )}
                  </div>

                  {/* Clean Property color indicators directly below name to save space */}
                  {Object.values(gameState.properties).filter(p => p.ownerId === playerId).length > 0 && (
                    <div className="flex gap-[2px] mt-1 flex-wrap">
                      {Object.values(gameState.properties)
                        .filter(p => p.ownerId === playerId)
                        .map((p) => {
                          const tile = boardTiles[p.tileIndex];
                          return (
                            <div
                              key={p.tileIndex}
                              title={tile?.name}
                              className={`w-2.2 h-2.2 rounded-full border border-white/5 ${getGroupColor(tile?.group)} ${p.isMortgaged ? 'opacity-30' : ''}`}
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right block: Balance */}
              <div className="text-right shrink-0 ml-2 relative">
                <span className={`text-[13px] font-sans font-bold tracking-wide ${(displayBalances[player.id] ?? player.balance) < 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  ৳{toBanglaNum(displayBalances[player.id] ?? player.balance)}
                </span>
                
                {/* Floating Money Animations */}
                <div className="absolute bottom-full right-0 flex flex-col items-end pointer-events-none z-50 mb-1">
                  {floaters[player.id]?.map(f => (
                    <span key={f.id} className={`text-[10px] font-black animate-float-up whitespace-nowrap ${f.diff > 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]'}`}>
                      {f.diff > 0 ? '+' : ''}৳{toBanglaNum(Math.abs(f.diff))}
                    </span>
                  ))}
                </div>

                {player.isBankrupt && (
                  <div className="text-[7px] font-mono text-red-500 font-bold uppercase tracking-wider mt-px">
                    দেউলিয়া
                  </div>
                )}

                {player.loan && !player.isBankrupt && (
                  <div className="text-[9px] font-mono text-amber-400 font-bold tracking-wider mt-px flex items-center justify-end gap-1">
                    <span title="Remaining Loan">🏦</span>
                    -৳{toBanglaNum(player.loan.remainingAmount)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Inline fallback icon for local builds
function UsersListIcon({ size = 16, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
