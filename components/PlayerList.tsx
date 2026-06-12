"use client";

import { GameState, BoardTile } from '../../shared/types';
// No icon imports needed since we use native emojis and custom SVGs

interface PlayerListProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
}

export default function PlayerList({ gameState, boardTiles, userId }: PlayerListProps) {


  const getGroupColor = (group: string | undefined): string => {
    switch (group) {
      case 'Brown': return 'bg-[#B1EA40]';
      case 'Light Blue': return 'bg-[#3FCEEB]';
      case 'Pink': return 'bg-[#3FEB92]';
      case 'Orange': return 'bg-[#EBA03F]';
      case 'Red': return 'bg-[#FF9696]';
      case 'Yellow': return 'bg-[#96FFFD]';
      case 'Green': return 'bg-[#C396FF]';
      case 'Dark Blue': return 'bg-[#FF96C9]';
      default: return 'bg-slate-700';
    }
  };

  return (
    <div className="w-full p-2.5 glass-panel flex flex-col gap-2 select-none relative h-auto">

      
      <h3 className="text-[10px] font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
        <UsersListIcon size={11} className="text-cyber-purple" />
        OPERATOR NODES
      </h3>

      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
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
              className={`relative flex items-center justify-between p-1.5 rounded-lg transition-all duration-200 overflow-hidden ${
                isCurrentTurn
                  ? 'bg-slate-900/60 border border-white/5 pl-2.5' 
                  : 'bg-transparent border border-transparent pl-2'
              } ${player.isBankrupt ? 'opacity-30' : ''}`}
            >
              {/* Highlight Vertical Bar on left for active player */}
              {isCurrentTurn && (
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#fbbf24] rounded-r shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
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
                        YOU
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
                        JAIL
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
              <div className="text-right shrink-0 ml-2">
                <span className={`text-[13px] font-sans font-bold tracking-wide ${player.balance < 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  ${player.balance}
                </span>
                {player.isBankrupt && (
                  <div className="text-[7px] font-mono text-red-500 font-bold uppercase tracking-wider mt-px">
                    BANKRUPT
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
