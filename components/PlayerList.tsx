"use client";

import { useState, useRef, useEffect } from 'react';
import { GameState, BoardTile } from '@/shared/types';
import { toBanglaNum } from '../utils/format';
import { soundManager } from '../utils/soundManager';

interface PlayerListProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  playerPings?: Record<string, number>;
}

function pingColor(ms: number): string {
  if (ms < 80) return 'text-emerald-400';
  if (ms < 150) return 'text-yellow-400';
  return 'text-red-400';
}

function PlayerAvatar({ color }: { color: string }) {
  return (
    <div
      style={{ backgroundColor: color }}
      className="relative w-8 h-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
    >
      <div className="absolute top-[22%] left-1/2 -translate-x-1/2 flex gap-[3px]">
        <div className="w-[6px] h-[8px] bg-white rounded-full relative">
          <div className="w-[2.5px] h-[3px] bg-black rounded-full absolute bottom-[1px] left-1/2 -translate-x-1/2" />
        </div>
        <div className="w-[6px] h-[8px] bg-white rounded-full relative">
          <div className="w-[2.5px] h-[3px] bg-black rounded-full absolute bottom-[1px] left-1/2 -translate-x-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function PlayerList({ gameState, boardTiles, userId, playerPings = {} }: PlayerListProps) {
  const [floaters, setFloaters] = useState<Record<string, { id: number; diff: number }[]>>({});
  const [displayBalances, setDisplayBalances] = useState<Record<string, number>>({});

  const prevBalances = useRef<Record<string, number>>({});
  const prevGameState = useRef<GameState>(gameState);
  const initialized = useRef(false);
  const lastMoneySoundTime = useRef<number>(0);

  const getGroupColor = (group: string | undefined): string => {
    switch (group) {
      case 'Brown': return 'bg-[#64748b]';
      case 'Light Blue': return 'bg-[#06b6d4]';
      case 'Pink': return 'bg-[#d946ef]';
      case 'Orange': return 'bg-[#f97316]';
      case 'Red': return 'bg-[#ef4444]';
      case 'Yellow': return 'bg-[#eab308]';
      case 'Green': return 'bg-[#22c55e]';
      case 'Dark Blue': return 'bg-[#3b82f6]';
      default: return 'bg-slate-600';
    }
  };

  useEffect(() => {
    if (!gameState || !gameState.players) return;

    if (!initialized.current) {
      const initialBalances: Record<string, number> = {};
      Object.values(gameState.players).forEach(p => {
        const effectiveBalance = gameState.pendingRentOwed?.debtorId === p.id
          ? p.balance - gameState.pendingRentOwed.remainingAmount
          : p.balance;
        initialBalances[p.id] = effectiveBalance;
        prevBalances.current[p.id] = effectiveBalance;
      });
      setDisplayBalances(initialBalances);
      initialized.current = true;
      return;
    }

    const prevState = prevGameState.current;
    prevGameState.current = gameState;

    // Balances follow useSocket roll pipeline: move first, then balance (delay 0 here).
    const delay = 0;
    const changes: { id: string; diff: number; newBalance: number }[] = [];

    Object.values(gameState.players).forEach(p => {
      const effectiveBalance = gameState.pendingRentOwed?.debtorId === p.id
        ? p.balance - gameState.pendingRentOwed.remainingAmount
        : p.balance;
      const prev = prevBalances.current[p.id];
      if (prev !== undefined && prev !== effectiveBalance) {
        changes.push({ id: p.id, diff: effectiveBalance - prev, newBalance: effectiveBalance });
      }
      prevBalances.current[p.id] = effectiveBalance;
    });

    const eventsToPlay: string[] = [];
    Object.values(gameState.players).forEach(player => {
      const prevPlayer = prevState.players[player.id];
      if (!prevPlayer) return;

      if (!prevPlayer.inJail && player.inJail) {
        eventsToPlay.push('PRISON_SOUND');
      }

      if (prevPlayer.position !== player.position) {
        const landedTile = boardTiles[player.position];
        if (landedTile?.name?.includes('অবসর') || landedTile?.type === 'FREE_PARKING') {
          eventsToPlay.push('PRISON_SOUND');
        }
      }
    });

    if (eventsToPlay.length > 0) {
      setTimeout(() => {
        eventsToPlay.forEach(event => {
          try {
            soundManager.playEventSound(event as any);
          } catch (err) {
            console.warn('Prison sound failed:', err);
          }
        });
      }, delay);
    }

    if (changes.length > 0) {
      setTimeout(() => {
        const now = Date.now();
        if (now - lastMoneySoundTime.current > 500) {
          try {
            soundManager.playEventSound('MONEY_TRANSACTION');
            lastMoneySoundTime.current = now;
          } catch (err) {
            console.warn('Money sound failed to play:', err);
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
                ...latest,
                [c.id]: latest[c.id]?.filter(f => f.id !== fId) || [],
              }));
            }, 1500);
          });
          return newFloaters;
        });
      }, delay);
    }
  }, [gameState, boardTiles]);

  return (
    <div className="w-full rounded-2xl bg-[#1c1634]/95 border border-[#3a2f58]/50 p-2.5 flex flex-col gap-1 select-none">
      {gameState.playerOrder.map((playerId) => {
        const player = gameState.players[playerId];
        if (!player) return null;

        const isCurrentTurn = gameState.currentTurnPlayerId === playerId;
        const isMe = playerId === userId;
        const isCpu = playerId.startsWith('cpu') || playerId === 'cpu_player';
        const isHost = gameState.playerOrder[0] === playerId;
        const ownedProperties = Object.values(gameState.properties).filter(p => p.ownerId === playerId);
        const balance = displayBalances[player.id] ?? player.balance;

        return (
          <div
            key={playerId}
            className={`relative flex items-center justify-between gap-2 transition-all duration-200 ${
              isCurrentTurn
                ? 'bg-[#2a2248]/90 rounded-xl py-2.5 pl-3 pr-3'
                : 'py-2 px-1'
            } ${player.isBankrupt ? 'opacity-40 grayscale' : ''}`}
          >
            {isCurrentTurn && (
              <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-yellow-400 rounded-full" />
            )}

            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <PlayerAvatar color={player.avatar} />

              <div className="flex flex-col min-w-0 gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`text-[13px] font-semibold truncate ${
                      isMe ? 'text-cyan-300' : 'text-white'
                    }`}
                  >
                    {player.name}
                  </span>

                  {isHost && (
                    <span title="হোস্ট" className="text-[12px] leading-none shrink-0">👑</span>
                  )}
                  {isCpu && (
                    <span title="বট" className="text-[11px] leading-none shrink-0">🤖</span>
                  )}
                  {isMe && (
                    <span className="text-[8px] font-bold text-cyan-400/80 uppercase tracking-wide shrink-0">
                      আপনি
                    </span>
                  )}
                  {player.inJail && !player.isBankrupt && (
                    <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wide shrink-0">
                      জেলে
                    </span>
                  )}
                  {player.isBankrupt && (
                    <span className="text-[8px] font-bold text-red-400 uppercase tracking-wide shrink-0">
                      দেউলিয়া
                    </span>
                  )}
                </div>

                {ownedProperties.length > 0 && (
                  <div className="flex gap-[3px] flex-wrap">
                    {ownedProperties.map((p) => {
                      const tile = boardTiles[p.tileIndex];
                      return (
                        <div
                          key={p.tileIndex}
                          title={tile?.name}
                          className={`w-2 h-2 rounded-full ${getGroupColor(tile?.group)} ${p.isMortgaged ? 'opacity-30' : ''}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 relative pl-1">
              {playerPings[playerId] !== undefined && (
                <div className={`text-[8px] font-mono font-bold mb-0.5 ${pingColor(playerPings[playerId])}`}>
                  {playerPings[playerId]}ms
                </div>
              )}
              <span
                className={`text-[13px] font-bold tabular-nums ${
                  balance < 0 ? 'text-red-400 animate-pulse' : 'text-white'
                }`}
              >
                ৳{toBanglaNum(balance)}
              </span>

              <div className="absolute bottom-full right-0 flex flex-col items-end pointer-events-none z-50 mb-0.5">
                {floaters[player.id]?.map(f => (
                  <span
                    key={f.id}
                    className={`text-[10px] font-black animate-float-up whitespace-nowrap ${
                      f.diff > 0
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {f.diff > 0 ? '+' : ''}৳{toBanglaNum(Math.abs(f.diff))}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
