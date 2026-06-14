"use client";

import { useState, useEffect, useRef } from 'react';
import { GameState, BoardTile, Player } from '../../shared/types';
import DiceManager from './dice/DiceManager';

interface BoardProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  logs: string[];
  onRollDice: () => void;
  onEndTurn: () => void;
  onPayJailFine: () => void;
  onUsePardonCard?: () => void;
  onBuyProperty: (tileIndex: number) => void;
  onTileClick: (index: number) => void;
  onMortgageProperty?: (tileIndex: number) => void;
  onUnmortgageProperty?: (tileIndex: number) => void;
  onBuildHouse?: (tileIndex: number) => void;
  onSellHouse?: (tileIndex: number) => void;
  onSellProperty?: (tileIndex: number) => void;
  onAuctionProperty?: (tileIndex: number) => void;
  onPlaceBid?: (amountToAdd: number) => void;
}

// Inline SVGs for self-contained, crash-free icons
function DiceIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <circle cx="15.5" cy="15.5" r="1.5"></circle>
      <circle cx="15.5" cy="8.5" r="1.5"></circle>
      <circle cx="8.5" cy="15.5" r="1.5"></circle>
      <circle cx="12" cy="12" r="1.5"></circle>
    </svg>
  );
}

function MoneyBagIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}

function CheckIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

// Maps Monopoly tile index to 11x11 grid row/column coordinates (Clockwise from Top-Left)
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

// Maps group to flag emoji
const getTileFlag = (name: string, group?: string) => {
  const n = name.toLowerCase();
  if (n.includes('venice') || n.includes('milan') || n.includes('rome') || n.includes('italy')) return '🇮🇹';
  if (n.includes('berlin') || n.includes('frankfurt') || n.includes('munich') || n.includes('germany') || n.includes('munchen')) return '🇩🇪';
  if (n.includes('london') || n.includes('manchester') || n.includes('liverpool') || n.includes('uk')) return '🇬🇧';
  if (n.includes('new york') || n.includes('san francisco') || n.includes('usa') || n.includes('jfk')) return '🇺🇸';
  if (n.includes('paris') || n.includes('nice') || n.includes('marseille') || n.includes('france')) return '🇫🇷';
  if (n.includes('tokyo') || n.includes('osaka') || n.includes('kyoto') || n.includes('japan')) return '🇯🇵';
  if (n.includes('madrid') || n.includes('barcelona') || n.includes('spain')) return '🇪🇸';
  if (n.includes('rio') || n.includes('sao paulo') || n.includes('brazil')) return '🇧🇷';

  if (group) {
    switch (group) {
      case 'Brown': return '🇧🇷';
      case 'Light Blue': return '🇫🇷';
      case 'Pink': return '🇮🇹';
      case 'Orange': return '🇩🇪';
      case 'Red': return '🇬🇧';
      case 'Yellow': return '🇪🇸';
      case 'Green': return '🇯🇵';
      case 'Dark Blue': return '🇺🇸';
    }
  }
  return '🏳️';
};

function CartIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );
}

function XIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function CopyIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

function PlayerToken({ player, gameState, userId }: { player: Player; gameState: GameState; userId: string }) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [displayPosition, setDisplayPosition] = useState(player.position);
  const [displayBalance, setDisplayBalance] = useState(player.balance);

  const [floaters, setFloaters] = useState<{ id: number; diff: number }[]>([]);
  const prevBalance = useRef(player.balance);
  const prevGameState = useRef<GameState>(gameState);

  const isCurrentTurn = gameState.currentTurnPlayerId === player.id;
  const isMe = player.id === userId;

  useEffect(() => {
    if (player.position !== displayPosition) {
      if (isCurrentTurn) {
        // Delay moving until the dice roll animation finishes (1.5s)
        const t = setTimeout(() => {
          setDisplayPosition(player.position);
        }, 1500);
        return () => clearTimeout(t);
      } else {
        setDisplayPosition(player.position);
      }
    }
  }, [player.position, displayPosition, isCurrentTurn]);

  useEffect(() => {
    const updatePosition = () => {
      const tileEl = document.getElementById(`tile-${displayPosition}`);
      const boardEl = document.getElementById('board-container');
      if (tileEl && boardEl) {
        const tileRect = tileEl.getBoundingClientRect();
        const boardRect = boardEl.getBoundingClientRect();

        // Find index on tile to stagger overlapping tokens smoothly in a circle
        const playersOnTile = Object.values(gameState.players).filter(
          (p) => p.position === displayPosition && !p.isBankrupt
        );
        const indexOnTile = playersOnTile.findIndex((p) => p.id === player.id);
        const totalOnTile = playersOnTile.length;

        let offsetX = 0;
        let offsetY = 0;
        if (totalOnTile > 1) {
          const angle = (indexOnTile / totalOnTile) * Math.PI * 2;
          const radius = 16; // Increased radius to accommodate larger tokens
          offsetX = Math.cos(angle) * radius;
          offsetY = Math.sin(angle) * radius;
        }

        const top = tileRect.top - boardRect.top;
        const left = tileRect.left - boardRect.left;

        setStyle({
          transform: `translate(${left + tileRect.width / 2 + offsetX}px, ${top + tileRect.height / 2 + offsetY}px) translate(-50%, -50%)`,
          opacity: 1,
        });
      }
    };

    const t = setTimeout(updatePosition, 50);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updatePosition);
    };
  }, [displayPosition, gameState.players, player.id]);

  // Watch for balance changes to trigger floating animation
  useEffect(() => {
    const prevState = prevGameState.current;
    prevGameState.current = gameState;

    if (player.balance !== prevBalance.current) {
      const diff = player.balance - prevBalance.current;
      prevBalance.current = player.balance;

      // Determine if a movement occurred during this state update
      const currentActiveId = gameState.currentTurnPlayerId;
      const prevActivePos = prevState.players[currentActiveId]?.position;
      const newActivePos = gameState.players[currentActiveId]?.position;
      const activeMoved = prevActivePos !== undefined && prevActivePos !== newActivePos;

      const delay = activeMoved ? 2200 : 0; // Wait for dice (1.5s) + move (0.7s)

      setTimeout(() => {
        setDisplayBalance(player.balance);
        const fId = Math.random();
        setFloaters(prev => [...prev, { id: fId, diff }]);

        setTimeout(() => {
          setFloaters(prev => prev.filter(f => f.id !== fId));
        }, 1500);
      }, delay);
    }
  }, [player.balance, gameState]);

  const isFlipped = displayPosition > 10 && displayPosition < 30;

  return (
    <div style={{ ...style }} className="absolute top-0 left-0 transition-all duration-700 ease-in-out z-40 pointer-events-none">
      <div
        style={{
          backgroundColor: player.avatar,
          boxShadow: isCurrentTurn
            ? `0 0 20px ${player.avatar}, inset 0 -2px 6px rgba(0,0,0,0.3)`
            : `0 4px 10px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)`
        }}
        className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center overflow-hidden ${isCurrentTurn ? 'ring-2 ring-white/80 animate-player-pulse scale-110 z-50' : 'shadow-lg z-40'}`}
        title={player.name}
      >
        <img
          src="/images/rail-token.png"
          alt={`${player.name} Token`}
          className={`w-full h-full object-contain p-1 drop-shadow-sm transform transition-transform duration-300 ${isFlipped ? '-scale-x-100' : ''}`}
        />
      </div>

      {/* Balance Floaters originating from the Token */}
      {floaters.map(f => (
        <div key={f.id} className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1 text-[10px] md:text-sm font-black whitespace-nowrap animate-float-up z-50 ${f.diff > 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]'}`}>
          {f.diff > 0 ? '+' : ''}৳{Math.abs(f.diff)}
        </div>
      ))}
    </div>
  );
}

function AuctionUI({ auction, tile, highestBidder, onBid, myPlayer }: any) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((auction.endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [auction.endTime]);

  return (
    <div className="flex flex-col items-center text-center w-full max-w-[280px] md:max-w-sm pointer-events-auto">
      <div className="text-lg md:text-xl font-sans font-bold text-white mb-1 uppercase tracking-widest">{tile?.name}</div>
      <div className="text-xs md:text-sm text-slate-300 mb-4 font-mono">Starting Price: ৳{auction.currentBid}</div>

      <div className="text-4xl md:text-5xl font-mono font-black text-white mb-3 tracking-widest shadow-neon-blue rounded-lg px-4 py-2 bg-slate-900/50 border border-cyber-blue/30">
        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
      </div>

      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 w-full mb-4 shadow-2xl">
        <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest mb-1 font-orbitron">Current Bid</div>
        <div className="text-3xl md:text-4xl font-black text-emerald-400 mb-3 drop-shadow-md">৳{auction.currentBid}</div>
        <div className="text-xs md:text-sm font-bold text-slate-200 flex justify-center items-center gap-2">
          {highestBidder ? (
            <>
              <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: highestBidder.avatar }} />
              {highestBidder.name}
            </>
          ) : (
            <span className="text-slate-500 italic font-mono">No bids yet</span>
          )}
        </div>
      </div>

      <div className="flex gap-3 md:gap-4 w-full justify-center">
        <button
          onClick={() => onBid(10)}
          disabled={myPlayer?.balance < auction.currentBid + 10 || auction.sellerId === myPlayer?.id}
          className="bg-[#6F4FF0] hover:bg-[#5C3ED9] text-white font-orbitron font-extrabold text-sm md:text-base py-3 px-2 rounded-xl flex-1 shadow-lg shadow-[#6F4FF0]/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +৳10
        </button>
        <button
          onClick={() => onBid(100)}
          disabled={myPlayer?.balance < auction.currentBid + 100 || auction.sellerId === myPlayer?.id}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-orbitron font-extrabold text-sm md:text-base py-3 px-2 rounded-xl flex-1 shadow-lg shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +৳100
        </button>
      </div>
    </div>
  );
}

export default function Board({
  gameState,
  boardTiles,
  userId,
  logs,
  onRollDice,
  onEndTurn,
  onPayJailFine,
  onUsePardonCard,
  onBuyProperty,
  onTileClick,
  onMortgageProperty,
  onUnmortgageProperty,
  onBuildHouse,
  onSellHouse,
  onSellProperty,
  onAuctionProperty,
  onPlaceBid,
}: BoardProps) {
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [isActionReady, setIsActionReady] = useState<boolean>(true);
  const isMyTurn = gameState.currentTurnPlayerId === userId;
  const activePlayer = gameState.players[gameState.currentTurnPlayerId];
  const myPlayer = gameState.players[userId];

  // Determine if current player can buy the property they're standing on
  const currentTileIndex = myPlayer?.position ?? -1;
  const currentTile = boardTiles[currentTileIndex];
  const currentTileState = gameState.properties[currentTileIndex];
  const canBuyCurrent =
    isMyTurn &&
    currentTile &&
    ['STREET', 'RAILROAD', 'UTILITY'].includes(currentTile.type) &&
    (!currentTileState || !currentTileState.ownerId) &&
    (myPlayer?.balance ?? 0) >= (currentTile.price || 0) &&
    gameState.turnStatus === 'MUST_ACT_OR_END';

  const getGroupColor = (group: string | undefined): string => {
    switch (group) {
      case 'Brown': return 'bg-[#B1EA40]'; // Rongpur
      case 'Light Blue': return 'bg-[#3FCEEB]'; // Borishal
      case 'Pink': return 'bg-[#3FEB92]'; // Khulna
      case 'Orange': return 'bg-[#EBA03F]'; // Rajshahi
      case 'Red': return 'bg-[#FF9696]'; // Sylhet
      case 'Yellow': return 'bg-[#96FFFD]'; // Chottogram
      case 'Green': return 'bg-[#C396FF]'; // Moymonsingho
      case 'Dark Blue': return 'bg-[#FF96C9]'; // Dhaka
      default: return 'bg-slate-700';
    }
  };

  const getGroupTextColor = (group: string | undefined): string => {
    return 'text-black';
  };

  // Helper to parse log rows dynamically and render avatars + city flags
  const renderLogWithAvatars = (logText: string) => {
    const players = Object.values(gameState.players);
    const sortedPlayers = [...players].sort((a, b) => b.name.length - a.name.length);

    let parts = [{ isPlayer: false, isTile: false, text: logText, player: null as any, tile: null as any }];

    // Split by player names
    for (const player of sortedPlayers) {
      const newParts: typeof parts = [];
      for (const part of parts) {
        if (part.isPlayer || part.isTile) {
          newParts.push(part);
          continue;
        }

        const segments = part.text.split(player.name);
        for (let i = 0; i < segments.length; i++) {
          if (segments[i] !== '') {
            newParts.push({ isPlayer: false, isTile: false, text: segments[i], player: null, tile: null });
          }
          if (i < segments.length - 1) {
            newParts.push({ isPlayer: true, isTile: false, text: player.name, player, tile: null });
          }
        }
      }
      parts = newParts;
    }

    // Split by board tile names
    const sortedTiles = [...boardTiles].filter(t => t.price).sort((a, b) => b.name.length - a.name.length);
    for (const tile of sortedTiles) {
      const newParts: typeof parts = [];
      for (const part of parts) {
        if (part.isPlayer || part.isTile) {
          newParts.push(part);
          continue;
        }

        const segments = part.text.split(tile.name);
        for (let i = 0; i < segments.length; i++) {
          if (segments[i] !== '') {
            newParts.push({ isPlayer: false, isTile: false, text: segments[i], player: null, tile: null });
          }
          if (i < segments.length - 1) {
            newParts.push({ isPlayer: false, isTile: true, text: tile.name, player: null, tile });
          }
        }
      }
      parts = newParts;
    }
    return (
      <span className="flex items-center justify-center flex-wrap gap-1 text-[11.5px] font-sans font-semibold text-slate-300 select-none">
        {parts.map((part, idx) => {
          if (part.isPlayer) {
            return (
              <span key={idx} className="inline-flex items-center gap-1 text-white font-bold whitespace-nowrap">
                <span
                  style={{ backgroundColor: part.player.avatar }}
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/10"
                />
                <span>{part.player.name}</span>
              </span>
            );
          }
          if (part.isTile) {
            const flag = getTileFlag(part.tile.name, part.tile.group);
            return (
              <span key={idx} className="inline-flex items-center gap-0.5 text-white font-bold whitespace-nowrap">
                <span>{flag}</span>
                <span className="underline decoration-dotted decoration-slate-600">{part.tile.name}</span>
              </span>
            );
          }
          return <span key={idx} className="text-slate-400">{part.text}</span>;
        })}
      </span>
    );
  };

  return (
    <div
      className="relative mx-auto bg-[#0B0E14] p-1.5 md:p-2 border border-slate-800/80 rounded-xl md:rounded-3xl shadow-2xl flex flex-col justify-between w-full xl:w-auto h-auto xl:h-full max-w-full max-h-[calc(100vh-24px)]"
      style={{ aspectRatio: '1 / 1' }}
    >
      {/* Dev Mode Toggle Button */}
      <button
        onClick={() => setDevMode(!devMode)}
        className={`absolute -top-3 left-4 md:-top-4 md:left-6 z-40 text-[9px] md:text-[11px] font-orbitron font-extrabold px-2.5 py-1 rounded-full shadow-lg transition-all border ${devMode
          ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/50'
          : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}
      >
        DEV: {devMode ? 'ON' : 'OFF'}
      </button>

      {/* 11x11 Grid Wrapper */}
      <div
        id="board-container"
        className="grid gap-1 w-full h-full"
        style={{
          gridTemplateColumns: 'minmax(0, 1.6fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.6fr)',
          gridTemplateRows: 'minmax(0, 1.6fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.6fr)'
        }}
      >
        {boardTiles.map((tile) => {
          const coords = getGridCoords(tile.index);
          const orientation = getOrientation(tile.index);
          const propState = gameState.properties[tile.index];

          const nameParts = tile.name.split(' (');
          const districtName = nameParts[0];
          const divisionName = nameParts.length === 2 ? nameParts[1].replace(')', '') : null;

          // Get owner details
          let ownerAvatar: string | null = null;
          let isMortgaged = false;
          let houses = 0;
          let currentRent = 0;
          const isOwned = propState?.ownerId ? true : false;
          if (propState) {
            isMortgaged = propState.isMortgaged;
            houses = propState.houses;
            if (propState.ownerId) {
              const owner = gameState.players[propState.ownerId];
              if (owner) {
                ownerAvatar = owner.avatar;
              }

              if (!isMortgaged && tile.rent) {
                if (tile.type === 'STREET') {
                  currentRent = tile.rent[houses] || 0;
                  if (houses === 0 && gameState.settings?.doubleRentOnCompleteSet) {
                    const ownsFullSet = boardTiles.filter(t => t.group === tile.group).every(t => {
                      const p = gameState.properties[t.index];
                      return p && p.ownerId === propState.ownerId;
                    });
                    if (ownsFullSet) currentRent *= 2;
                  }
                } else if (tile.type === 'RAILROAD') {
                  const count = Object.values(gameState.properties).filter(
                    p => p.ownerId === propState.ownerId && boardTiles[p.tileIndex]?.type === 'RAILROAD'
                  ).length;
                  currentRent = tile.rent[count - 1] || 25;
                }
              }
            }
          }

          // Universal layout positioning
          // Region Color Indicator
          let colorIndicatorClass = 'hidden';
          if (orientation === 'TOP') {
            colorIndicatorClass = 'absolute -bottom-[8px] md:-bottom-[12px] left-1/2 -translate-x-1/2 w-[85%] h-[8px] md:h-[12px] rounded-b-md z-10 shadow-lg';
          } else if (orientation === 'BOTTOM') {
            colorIndicatorClass = 'absolute -top-[8px] md:-top-[12px] left-1/2 -translate-x-1/2 w-[85%] h-[8px] md:h-[12px] rounded-t-md z-10 shadow-lg';
          } else if (orientation === 'LEFT') {
            colorIndicatorClass = 'absolute -right-[8px] md:-right-[12px] top-1/2 -translate-y-1/2 h-[85%] w-[8px] md:w-[12px] rounded-r-md z-10 shadow-lg';
          } else if (orientation === 'RIGHT') {
            colorIndicatorClass = 'absolute -left-[8px] md:-left-[12px] top-1/2 -translate-y-1/2 h-[85%] w-[8px] md:w-[12px] rounded-l-md z-10 shadow-lg';
          }

          // Purchased Player Color border
          let ownerIndicatorClass = 'hidden';
          if (orientation === 'TOP') {
            ownerIndicatorClass = 'absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-[3px] md:h-[5px] rounded-b-sm z-10';
          } else if (orientation === 'BOTTOM') {
            ownerIndicatorClass = 'absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-[3px] md:h-[5px] rounded-t-sm z-10';
          } else if (orientation === 'LEFT') {
            ownerIndicatorClass = 'absolute left-0 top-1/2 -translate-y-1/2 h-[85%] w-[3px] md:w-[5px] rounded-r-sm z-10';
          } else if (orientation === 'RIGHT') {
            ownerIndicatorClass = 'absolute right-0 top-1/2 -translate-y-1/2 h-[85%] w-[3px] md:w-[5px] rounded-l-sm z-10';
          }

          // Hover Overlay Positioning (inside board, front of cell)
          let hoverPositionClass = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
          if (orientation === 'TOP') hoverPositionClass = 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2';
          else if (orientation === 'BOTTOM') hoverPositionClass = 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2';
          else if (orientation === 'LEFT') hoverPositionClass = 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2';
          else if (orientation === 'RIGHT') hoverPositionClass = 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2';

          return (
            <div
              id={`tile-${tile.index}`}
              key={tile.index}
              style={{ gridRow: coords.row, gridColumn: coords.col }}
              onClick={() => {
                setSelectedTileIndex(tile.index);
                onTileClick(tile.index);
              }}
              className={`relative rounded-lg bg-slate-800/40 backdrop-blur-md border border-white/10 transition-all duration-150 cursor-pointer group hover:bg-slate-700/50 hover:border-slate-500/50 shadow-inner overflow-visible z-10 hover:z-[60] ${orientation === 'CORNER' ? 'bg-slate-900/60 p-2 flex flex-col justify-center items-center' : ''
                }`}
            >
              {/* Glassmorphism Inner Layout Wrapper */}
              <div className={`w-full h-full flex ${orientation === 'BOTTOM' ? 'flex-col-reverse' : 'flex-col'} items-center justify-between py-1.5 md:py-2 ${['LEFT', 'RIGHT'].includes(orientation) ? 'px-[10px] md:px-[16px]' : 'px-0.5'}`}>

                {/* 1. Price (Outer Edge) — hidden when owned */}
                {orientation !== 'CORNER' && (
                  <div className="text-[7.5px] md:text-[10px] xl:text-[12px] font-mono font-bold text-white flex items-start justify-center shrink-0 h-[13px] md:h-[18px] w-full z-20 leading-none mt-0.5">
                    {!isOwned && tile.price && (
                      <span className="drop-shadow-md text-slate-200 flex items-center justify-center">
                        ৳{tile.price}
                      </span>
                    )}
                  </div>
                )}

                {/* 2. Name & Center Content */}
                <div className={`font-bold leading-none text-white font-sans break-words text-center flex-1 flex flex-col items-center justify-center min-h-0 px-0.5 w-full ${orientation === 'CORNER' ? 'text-[10px] md:text-[14px] xl:text-[16px] uppercase' : 'text-[8px] md:text-[10px] xl:text-[12px]'}`}>
                  {(() => {
                    if (orientation === 'CORNER') {
                      return (
                        <>
                          {tile.name}
                          {tile.index === 0 && <div className="text-emerald-400 mt-1 md:mt-1.5 font-black text-[12px] md:text-[16px]">GO</div>}
                        </>
                      );
                    }
                    return <span className="font-extrabold text-white tracking-wide">{districtName}</span>;
                  })()}
                </div>

                {/* 3. Houses indicator (Inner Edge Area) */}
                {orientation !== 'CORNER' && (
                  <div className="flex items-center gap-[2px] shrink-0 justify-center h-[10px] w-full pb-1 z-20">
                    {houses > 0 && Array.from({ length: Math.min(houses, 4) }).map((_, i) => (
                      <span key={i} className="w-[3px] h-[3px] rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                    ))}
                    {houses === 5 && (
                      <span className="w-[4px] h-[4px] rounded bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.6)]" />
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Overlapping Color Indicator (group color — outer edge) */}
              {tile.group && orientation !== 'CORNER' && (
                <div className={`${colorIndicatorClass} ${getGroupColor(tile.group)} flex items-center justify-center overflow-hidden`}>
                  {divisionName && (
                    <span
                      className={`${getGroupTextColor(tile.group)} font-bold whitespace-nowrap leading-none ${orientation === 'LEFT' ? '-rotate-90 text-[5.5px] md:text-[8px]' :
                        orientation === 'RIGHT' ? 'rotate-90 text-[5.5px] md:text-[8px]' :
                          'text-[5.5px] md:text-[8px]'
                        }`}
                    >
                      {divisionName}
                    </span>
                  )}
                </div>
              )}

              {/* Owner Avatar Color Bar (inner edge — shows who owns this property) */}
              {ownerAvatar && orientation !== 'CORNER' && (
                <div
                  className={`${ownerIndicatorClass}`}
                  style={{
                    backgroundColor: ownerAvatar,
                    boxShadow: `0 0 6px ${ownerAvatar}`,
                    opacity: isMortgaged ? 0.3 : 1
                  }}
                />
              )}

              {/* Quick Action / Info Hover Overlay */}
              {orientation !== 'CORNER' && (
                <div className="absolute inset-0 z-50 pointer-events-none">
                  {isOwned && propState.ownerId === userId ? (
                    <div className={`absolute ${hoverPositionClass} flex flex-wrap justify-center items-center gap-1.5 md:gap-2 pointer-events-auto transform scale-50 opacity-0 group-hover:scale-125 group-hover:opacity-100 transition-all duration-200 origin-center z-[100] ${tile.type === 'STREET' ? 'w-[60px] md:w-[80px]' : 'w-auto flex-nowrap'}`}>
                      <button title={propState?.isMortgaged ? 'Unmortgage' : 'Mortgage'} onClick={(e) => { e.stopPropagation(); if (!propState?.isMortgaged) onMortgageProperty?.(tile.index); else onUnmortgageProperty?.(tile.index); }} className="w-6 h-6 md:w-8 md:h-8 rounded-full text-[6px] md:text-[8px] font-bold bg-red-500 hover:bg-red-400 text-white shadow-2xl border border-white/30 flex items-center justify-center transition-colors">
                        {propState?.isMortgaged ? 'UNMTG' : 'MTG'}
                      </button>
                      <button title="Sell Property" onClick={(e) => { e.stopPropagation(); onSellProperty?.(tile.index); }} className="w-6 h-6 md:w-8 md:h-8 rounded-full text-[6px] md:text-[8px] font-bold bg-amber-500 hover:bg-amber-400 text-white shadow-2xl border border-white/30 flex items-center justify-center transition-colors">
                        SELL
                      </button>
                      <button title="Auction Property" onClick={(e) => { e.stopPropagation(); onAuctionProperty?.(tile.index); }} className="w-6 h-6 md:w-8 md:h-8 rounded-full text-[6px] md:text-[8px] font-bold bg-purple-500 hover:bg-purple-400 text-white shadow-2xl border border-white/30 flex items-center justify-center transition-colors">
                        AUC
                      </button>
                      {tile.type === 'STREET' && (
                        <>
                          <button title="Build House" onClick={(e) => { e.stopPropagation(); onBuildHouse?.(tile.index); }} className="w-6 h-6 md:w-8 md:h-8 rounded-full text-[6px] md:text-[8px] font-bold bg-blue-500 hover:bg-blue-400 text-white shadow-2xl border border-white/30 flex items-center justify-center transition-colors">
                            +H
                          </button>
                          <button title="Break House" onClick={(e) => { e.stopPropagation(); onSellHouse?.(tile.index); }} className="w-6 h-6 md:w-8 md:h-8 rounded-full text-[6px] md:text-[8px] font-bold bg-orange-500 hover:bg-orange-400 text-white shadow-2xl border border-white/30 flex items-center justify-center transition-colors">
                            -H
                          </button>
                        </>
                      )}
                    </div>
                  ) : isOwned && propState.ownerId !== userId ? (
                    <div className={`absolute ${hoverPositionClass} bg-red-500/95 backdrop-blur-md border border-red-400 text-white text-[10px] md:text-[12px] font-bold px-2.5 py-1 rounded-md shadow-2xl pointer-events-none transform scale-50 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-200 origin-center whitespace-nowrap z-[100]`}>
                      {propState.isMortgaged ? 'Mortgaged' : (
                        ['STREET', 'RAILROAD'].includes(tile.type) ? `Rent: ৳${currentRent}` :
                          tile.type === 'UTILITY' ? 'Dice x Rent' :
                            'Owned'
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        {/* Center Canvas Area - OPEN DIRECT DESIGN (No extra card framing overlay borders) */}
        <div className="col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center p-4 rounded-2xl m-3 relative overflow-hidden gap-3">

          {/* 3D Physics Dice Display - Centered wrapper with standard height constraint */}
          <div className="w-full h-40 md:h-48 flex items-center justify-center relative shrink-0 transform-gpu perspective-1000">
            <DiceManager gameState={gameState} />
          </div>

          {/* Status & Action Buttons directly under the dice (No card frame) */}
          <div className="w-full z-10 flex flex-col items-center justify-center select-none shrink-0">
            {!isMyTurn ? (
              <div className="text-center flex items-center justify-center gap-2 py-1.5 w-full">
                <span
                  style={{ backgroundColor: activePlayer?.avatar || '#8BA4F9' }}
                  className="w-4 h-4 rounded-full shrink-0 border border-white/10 shadow-sm"
                />
                <span className="text-sm font-sans font-bold text-slate-300">
                  {activePlayer?.name || 'Operator'} is playing...
                </span>
              </div>
            ) : (
              <div className="flex gap-4 items-center justify-center w-full">
                {/* Extreme Case: Negative Balance Check */}
                {gameState.turnStatus === 'BANKRUPTCY_PENDING' && isActionReady && (
                  <div className="flex flex-col items-center gap-2 w-full px-4 animate-fade-in">
                    <span className="text-red-500 font-bold uppercase tracking-wider text-sm animate-pulse text-center text-shadow-neon-purple">
                      DEBT WARNING: NEGATIVE BALANCE
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-300 text-center leading-tight">
                      You must raise funds to clear your debt (sell, mortgage, trade) or declare bankruptcy.
                    </span>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('declare_bankruptcy'))}
                      className="bg-red-600/80 border border-red-500 hover:bg-red-500 text-white font-orbitron font-extrabold text-[9px] md:text-[11px] px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl mt-1 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all active:scale-[0.98] cursor-pointer w-full sm:w-auto"
                    >
                      Declare Bankruptcy
                    </button>
                  </div>
                )}

                {/* Roll the dice OR Conclude Turn */}
                {gameState.turnStatus === 'MUST_ROLL' && isActionReady && (
                  <button
                    onClick={() => {
                      setIsActionReady(false);
                      onRollDice();
                      setTimeout(() => setIsActionReady(true), 2200);
                    }}
                    className="bg-[#6F4FF0] hover:bg-[#5C3ED9] text-white font-orbitron font-extrabold text-[10px] md:text-[12px] px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#6F4FF0]/30 transition-all duration-200 active:scale-[0.98] cursor-pointer w-[80%] sm:w-auto"
                  >
                    <DiceIcon size={14} className="stroke-white" />
                    Roll the dice
                  </button>
                )}

                {gameState.turnStatus === 'MUST_ACT_OR_END' && isActionReady && (
                  <div className="flex gap-2 w-full px-2 sm:px-0 justify-center flex-wrap">
                    {canBuyCurrent && (
                      <button
                        onClick={() => onBuyProperty(currentTileIndex)}
                        className="flex-1 min-w-[80px] sm:flex-none sm:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-cyan-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer animate-pulse-slow"
                      >
                        <CartIcon size={12} className="stroke-white shrink-0" />
                        <span className="truncate">Buy ৳{currentTile?.price}</span>
                      </button>
                    )}

                    {canBuyCurrent && (
                      <button
                        onClick={() => onAuctionProperty?.(currentTileIndex)}
                        className="flex-1 min-w-[60px] sm:flex-none sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-orange-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                      >
                        Auction
                      </button>
                    )}

                    <button
                      onClick={onEndTurn}
                      className="flex-1 min-w-[80px] sm:flex-none sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                      <CheckIcon size={12} className="stroke-white shrink-0" />
                      {gameState.dice?.[0] === gameState.dice?.[1] && gameState.doubleRollCount > 0 && gameState.dice?.[0] !== 0 ? 'Roll Again' : 'End Turn'}
                    </button>
                  </div>
                )}

                {/* get free for $50 fine option */}
                {activePlayer?.inJail && gameState.turnStatus === 'MUST_ROLL' && isActionReady && (
                  <div className="flex gap-2 w-[80%] sm:w-auto mt-2 flex-wrap justify-center">
                    <button
                      onClick={onPayJailFine}
                      className="bg-[#7B5BF2] hover:bg-[#6849E0] flex-1 min-w-[120px] text-white font-orbitron font-extrabold text-[10px] md:text-[12px] px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#7B5BF2]/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                      <MoneyBagIcon size={14} className="stroke-white" />
                      Pay ৳50 Fine
                    </button>
                    {(activePlayer.getOutOfJailFreeCards || 0) > 0 && onUsePardonCard && (
                      <button
                        onClick={onUsePardonCard}
                        className="bg-yellow-500 hover:bg-yellow-600 flex-1 min-w-[120px] text-white font-orbitron font-extrabold text-[10px] md:text-[12px] px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                      >
                        <span className="text-lg">🗝️</span>
                        Use Pardon
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Activity History Log — filtered to important events only */}
          <div className="w-full relative select-none h-36 pt-2 flex flex-col justify-start shrink-0 group">
            <button
              onClick={() => {
                const importantLogs = logs.filter(log => {
                  const l = log.toLowerCase();
                  if (l.includes('bought') || l.includes('কিনে') || l.includes('অধিগ্রহণ')) return true;
                  if (l.includes('paid rent') || l.includes('ভাড়া')) return true;
                  if (l.includes('paid ৳') || l.includes('জরিমানা') || l.includes('কর')) return true;
                  if (l.includes('tax')) return true;
                  if (l.includes('collecting ৳200') || l.includes('বোনাস')) return true;
                  if (l.includes('passing go')) return true;
                  if (l.includes('jail') || l.includes('জেল')) return true;
                  if (l.includes('bankrupt') || l.includes('দেউলিয়া')) return true;
                  if (l.includes('trade') || l.includes('চুক্তি')) return true;
                  if (l.includes('swapped')) return true;
                  if (l.includes('mortgage') || l.includes('বন্ধক')) return true;
                  if (l.includes('game over')) return true;
                  if (l.includes('winner')) return true;
                  if (l.includes('built') || l.includes('তৈরি')) return true;
                  if (l.includes('broke') || l.includes('ভেঙে')) return true;
                  if (l.includes('liquidated') || l.includes('বিক্রি')) return true;
                  if (l.includes('auction') || l.includes('নিলাম')) return true;
                  if (l.includes('ভাগ্য পরীক্ষা') || l.includes('গুপ্তধন')) return true;
                  return false;
                });
                navigator.clipboard.writeText(importantLogs.join('\n'));
              }}
              className="absolute top-1 right-2 z-30 p-1.5 md:p-2 bg-slate-800/80 text-slate-400 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10 shadow-lg"
              title="Copy Logs"
            >
              <CopyIcon size={14} />
            </button>
            <div className="overflow-y-auto w-full h-full pr-1 flex flex-col gap-2.5 scrollbar-thin select-none max-h-[120px] pb-10 text-[12px] md:text-[13px]">
              {(() => {
                // Whitelist: only show truly important game events
                const importantLogs = logs.filter(log => {
                  const l = log.toLowerCase();
                  if (l.includes('bought') || l.includes('কিনে') || l.includes('অধিগ্রহণ')) return true;
                  if (l.includes('paid rent') || l.includes('ভাড়া')) return true;
                  if (l.includes('paid ৳') || l.includes('জরিমানা') || l.includes('কর')) return true;
                  if (l.includes('tax')) return true;
                  if (l.includes('collecting ৳200') || l.includes('বোনাস')) return true;
                  if (l.includes('passing go')) return true;
                  if (l.includes('jail') || l.includes('জেল')) return true;
                  if (l.includes('bankrupt') || l.includes('দেউলিয়া')) return true;
                  if (l.includes('trade') || l.includes('চুক্তি')) return true;
                  if (l.includes('swapped')) return true;
                  if (l.includes('mortgage') || l.includes('বন্ধক')) return true;
                  if (l.includes('game over')) return true;
                  if (l.includes('winner')) return true;
                  if (l.includes('built') || l.includes('তৈরি')) return true;
                  if (l.includes('broke') || l.includes('ভেঙে')) return true;
                  if (l.includes('liquidated') || l.includes('বিক্রি')) return true;
                  if (l.includes('auction') || l.includes('নিলাম')) return true;
                  if (l.includes('ভাগ্য পরীক্ষা') || l.includes('গুপ্তধন')) return true;

                  // Tactical Tags
                  if (l.includes('[acquire]')) return true;
                  if (l.includes('[transfer]')) return true;
                  if (l.includes('[trade]')) return true;
                  if (l.includes('[upgrade]')) return true;
                  if (l.includes('[downgrade]')) return true;
                  if (l.includes('[liquidate]')) return true;
                  if (l.includes('[auction]')) return true;
                  return false;
                });

                if (importantLogs.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-600 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                      No activities recorded
                    </div>
                  );
                }

                return importantLogs.map((log, index) => (
                  <div key={index} className="flex items-center justify-center gap-1 py-px w-full">
                    {renderLogWithAvatars(log)}
                  </div>
                ));
              })()}
            </div>

            {/* Opacity Fading overlay at the bottom fading into black/main grid bg */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/85 to-transparent pointer-events-none z-10" />
          </div>

        </div>

        {/* Dynamic Smooth Player Tokens Overlay */}
        {Object.values(gameState.players).map((p) => {
          if (p.isBankrupt) return null;
          return <PlayerToken key={p.id} player={p} gameState={gameState} userId={userId} />;
        })}

        {/* Active Auction Overlay */}
        {(gameState as any).activeAuction && (() => {
          const auction = (gameState as any).activeAuction;
          const tile = boardTiles[auction.propertyIndex];
          const highestBidder = auction.highestBidderId ? gameState.players[auction.highestBidderId] : null;

          const handleBid = (amount: number) => {
            if (onPlaceBid) onPlaceBid(amount);
            else window.dispatchEvent(new CustomEvent('place_bid', { detail: amount }));
          };

          const getGroupHexColor = (group: string | undefined): string => {
            switch (group) {
              case 'Brown': return '#B1EA40';
              case 'Light Blue': return '#3FCEEB';
              case 'Pink': return '#3FEB92';
              case 'Orange': return '#EBA03F';
              case 'Red': return '#FF9696';
              case 'Yellow': return '#96FFFD';
              case 'Green': return '#C396FF';
              case 'Dark Blue': return '#FF96C9';
              default: return '#fbbf24'; // amber-400 fallback
            }
          };

          const tileColor = getGroupHexColor(tile?.group);

          return (
            <div
              className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-2xl border"
              style={{ borderColor: `${tileColor}4D`, boxShadow: `0 0 40px ${tileColor}33` }}
            >
              <h2
                className="text-2xl md:text-3xl font-orbitron font-extrabold mb-4 animate-pulse uppercase"
                style={{ color: tileColor, textShadow: `0 0 15px ${tileColor}80` }}
              >
                Auction Active!
              </h2>
              <AuctionUI auction={auction} tile={tile} highestBidder={highestBidder} onBid={handleBid} myPlayer={myPlayer} />
            </div>
          );
        })()}
      </div>

      {/* Tile Detail Modal Overlay */}
      {selectedTileIndex !== null && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl p-4 transition-opacity duration-200"
          onClick={() => setSelectedTileIndex(null)}
        >
          <div
            className="bg-slate-100 rounded-xl w-full max-w-[280px] md:max-w-[320px] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-300 text-slate-900 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 z-20 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
              onClick={() => setSelectedTileIndex(null)}
            >
              <XIcon size={14} />
            </button>

            {(() => {
              const selTile = boardTiles[selectedTileIndex];
              const selProp = gameState.properties[selectedTileIndex];
              const isMyProp = selProp?.ownerId === userId;
              const owner = selProp?.ownerId ? gameState.players[selProp.ownerId] : null;

              if (!selTile) return null;

              // Advanced Monopoly Logic Checks for the Modal UI
              let ownsFullSet = false;
              let anyMortgaged = false;
              let groupHasHouses = false;
              let minHouses = 0;
              let maxHouses = 0;

              if (selTile.type === 'STREET' && selTile.group && isMyProp) {
                const groupTiles = boardTiles.filter(t => t.group === selTile.group);
                const groupProps = groupTiles.map(t => gameState.properties[t.index]);

                ownsFullSet = groupProps.every(p => p && p.ownerId === userId);
                anyMortgaged = groupProps.some(p => p && p.isMortgaged);
                groupHasHouses = groupProps.some(p => p && p.houses > 0);
                minHouses = Math.min(...groupProps.map(p => p ? (p.houses || 0) : 0));
                maxHouses = Math.max(...groupProps.map(p => p ? (p.houses || 0) : 0));
              }

              const houseCost = selTile.houseCost || 0;
              const currentHouses = selProp?.houses || 0;
              const hasEnoughMoney = (myPlayer?.balance || 0) >= houseCost;

              const canBuildHere = ownsFullSet && !anyMortgaged && currentHouses === minHouses && currentHouses < 5 && hasEnoughMoney;
              const canSellHere = currentHouses > 0 && currentHouses === maxHouses;
              const canMortgageHere = !selProp?.isMortgaged && currentHouses === 0 && !groupHasHouses;

              let buildDisabledReason = "";
              if (!ownsFullSet) buildDisabledReason = "Requires Full Set";
              else if (anyMortgaged) buildDisabledReason = "Group is Mortgaged";
              else if (currentHouses > minHouses) buildDisabledReason = "Build Evenly";
              else if (currentHouses >= 5) buildDisabledReason = "Max Upgrades Built";
              else if (!hasEnoughMoney) buildDisabledReason = "Insufficient Funds";

              let sellDisabledReason = "";
              if (currentHouses === 0) sellDisabledReason = "No Houses To Break";
              else if (currentHouses < maxHouses) sellDisabledReason = "Break Evenly";

              const canSellPropertyHere = !groupHasHouses;

              let mortgageDisabledReason = "";
              if (selProp?.isMortgaged) mortgageDisabledReason = "Already Mortgaged";
              else if (currentHouses > 0) mortgageDisabledReason = "Has Houses";
              else if (groupHasHouses) mortgageDisabledReason = "Group Has Houses";

              const isOwnedByAnyone = !!selProp?.ownerId;
              const activeRentTier = (isOwnedByAnyone && !selProp.isMortgaged) ? selProp.houses : -1;

              let ownerRailroads = 0;
              if (isOwnedByAnyone && selTile.type === 'RAILROAD') {
                ownerRailroads = Object.values(gameState.properties).filter(
                  (p) => p.ownerId === selProp.ownerId && boardTiles[p.tileIndex]?.type === 'RAILROAD'
                ).length;
              }
              const activeRailroadTier = (!selProp?.isMortgaged && ownerRailroads > 0) ? ownerRailroads - 1 : -1;

              return (
                <>
                  {/* HEADER */}
                  {selTile.type === 'STREET' && selTile.group ? (
                    <div className={`${getGroupColor(selTile.group)} w-full pt-6 pb-4 text-center border-b-2 border-slate-800`}>
                      <h2 className={`${getGroupTextColor(selTile.group)} opacity-80 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs font-sans mb-1`}>TITLE DEED</h2>
                      <h3 className={`${getGroupTextColor(selTile.group)} font-extrabold text-xl md:text-2xl font-sans leading-tight px-4`}>{selTile.name}</h3>
                    </div>
                  ) : (
                    <div className="bg-slate-800 w-full pt-6 pb-4 text-center border-b-2 border-slate-900">
                      <h3 className="text-white font-extrabold text-xl md:text-2xl font-sans leading-tight px-4">{selTile.name}</h3>
                    </div>
                  )}

                  {/* BODY */}
                  <div className="p-5 flex flex-col gap-2 text-xs md:text-sm font-semibold font-sans">
                    {selTile.type === 'STREET' && selTile.rent && (
                      <>
                        <div className="flex flex-col gap-1 w-full">
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 0 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-700'}`}>
                            <span className={activeRentTier === 0 ? 'font-bold' : ''}>RENT</span> <span className={`font-bold ${activeRentTier === 0 ? 'text-purple-700' : 'text-slate-900'}`}>৳{selTile.rent[0]}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 1 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 1 ? 'font-bold' : ''}>With 1 House</span> <span className={activeRentTier === 1 ? 'font-black text-purple-700' : ''}>৳{selTile.rent[1]}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 2 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 2 ? 'font-bold' : ''}>With 2 Houses</span> <span className={activeRentTier === 2 ? 'font-black text-purple-700' : ''}>৳{selTile.rent[2]}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 3 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 3 ? 'font-bold' : ''}>With 3 Houses</span> <span className={activeRentTier === 3 ? 'font-black text-purple-700' : ''}>৳{selTile.rent[3]}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 4 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 4 ? 'font-bold' : ''}>With 4 Houses</span> <span className={activeRentTier === 4 ? 'font-black text-purple-700' : ''}>৳{selTile.rent[4]}</span>
                          </div>
                          <div className={`flex justify-between items-center mt-1 pt-2 border-t border-slate-300 transition-all ${activeRentTier === 5 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-800'}`}>
                            <span className={activeRentTier === 5 ? 'font-bold' : ''}>With HOTEL</span> <span className={`font-bold ${activeRentTier === 5 ? 'text-purple-700' : ''}`}>৳{selTile.rent[5]}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300 text-slate-700"><span>Mortgage Value</span> <span>৳{selTile.mortgageValue}</span></div>
                        <div className="flex justify-between items-center text-slate-700"><span>Houses cost</span> <span>৳{selTile.houseCost} each</span></div>
                      </>
                    )}

                    {selTile.type === 'RAILROAD' && selTile.rent && (
                      <>
                        <div className="flex flex-col gap-1 w-full">
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 0 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>Rent</span> <span className={activeRailroadTier === 0 ? 'font-black text-purple-700' : ''}>৳25</span></div>
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 1 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>If 2 R.R.'s are owned</span> <span className={activeRailroadTier === 1 ? 'font-black text-purple-700' : ''}>৳50</span></div>
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 2 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>If 3 R.R.'s are owned</span> <span className={activeRailroadTier === 2 ? 'font-black text-purple-700' : ''}>৳100</span></div>
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 3 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>If 4 R.R.'s are owned</span> <span className={activeRailroadTier === 3 ? 'font-black text-purple-700' : ''}>৳200</span></div>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300 text-slate-700"><span>Mortgage Value</span> <span>৳{selTile.mortgageValue}</span></div>
                      </>
                    )}

                    {selTile.type === 'UTILITY' && (
                      <>
                        <div className="text-center text-xs mb-2 leading-relaxed text-slate-700">
                          If one "Utility" is owned, rent is 4 times amount shown on dice.<br />
                          If both "Utilities" are owned, rent is 10 times amount shown on dice.
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300 text-slate-700"><span>Mortgage Value</span> <span>৳{selTile.mortgageValue}</span></div>
                      </>
                    )}

                    {!selTile.price && (
                      <div className="text-center text-slate-500 py-4 italic">
                        Special Action Tile
                      </div>
                    )}

                    {/* Owner Status */}
                    {selTile.price && (
                      <div className="mt-4 p-3 bg-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 border border-slate-300">
                        {owner ? (
                          <>
                            <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">Owned By</span>
                            <div className="flex items-center gap-2">
                              <span style={{ backgroundColor: owner.avatar }} className="w-4 h-4 rounded-full border border-slate-400" />
                              <span className="font-bold text-slate-900">{owner.name}</span>
                            </div>
                            {selProp.isMortgaged && <span className="text-xs text-red-500 font-bold mt-1">MORTGAGED</span>}
                            {!selProp.isMortgaged && selProp.houses > 0 && (
                              <span className="text-xs text-emerald-600 font-bold mt-1">
                                {selProp.houses === 5 ? 'HOTEL BUILT' : `${selProp.houses} HOUSES BUILT`}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] md:text-xs text-emerald-600 uppercase tracking-wider font-bold">Available For Purchase</span>
                            <span className="font-black text-lg md:text-xl text-slate-900">৳{selTile.price}</span>

                            {devMode && (
                              <button
                                className="mt-2 w-full font-bold py-2.5 px-2 rounded-lg text-xs transition-colors flex justify-center items-center shadow-md bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]"
                                onClick={() => {
                                  onBuyProperty(selectedTileIndex);
                                  setSelectedTileIndex(null);
                                }}
                              >
                                Force Buy (Dev Mode)
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ACTIONS FOOTER */}
                  {isMyProp && (
                    <div className="bg-slate-200 p-3 flex flex-col gap-2 border-t border-slate-300">

                      {/* Mortgage / Unmortgage */}
                      {!selProp.isMortgaged ? (
                        <button
                          className={`w-full font-bold py-2.5 px-2 rounded-lg text-xs transition-colors flex justify-center items-center gap-1 ${canMortgageHere ? 'bg-red-500 hover:bg-red-600 text-white shadow-md active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                          onClick={() => { if (canMortgageHere) { onMortgageProperty?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                        >
                          {canMortgageHere ? `Mortgage (+৳${selTile.mortgageValue})` : `Cannot Mortgage: ${mortgageDisabledReason}`}
                        </button>
                      ) : (
                        <button
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-2 rounded-lg text-xs transition-colors shadow-md active:scale-[0.98]"
                          onClick={() => { onUnmortgageProperty?.(selectedTileIndex); setSelectedTileIndex(null); }}
                        >
                          Unmortgage (-৳${Math.ceil((selTile.mortgageValue || 0) * 1.1)})
                        </button>
                      )}

                      {/* Sell Property to Bank */}
                      <button
                        className={`w-full font-bold py-2.5 px-2 rounded-lg text-xs transition-colors flex justify-center items-center shadow-md ${canSellPropertyHere ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                        onClick={() => { if (canSellPropertyHere) { onSellProperty?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                      >
                        {canSellPropertyHere ? `Sell Property (+৳${selTile.mortgageValue || Math.floor((selTile.price || 0) / 2)})` : `Cannot Sell: Group Has Houses`}
                      </button>

                      {/* Auction Property */}
                      <button
                        className={`w-full font-bold py-2.5 px-2 rounded-lg text-xs transition-colors flex justify-center items-center shadow-md ${canSellPropertyHere ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                        onClick={() => { if (canSellPropertyHere) { onAuctionProperty?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                      >
                        {canSellPropertyHere ? `Auction Property (Starts at ${selProp.isMortgaged ? '40%' : '70%'})` : `Cannot Auction: Group Has Houses`}
                      </button>

                      {/* Build / Break Houses */}
                      {selTile.type === 'STREET' && !selProp.isMortgaged && (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            className={`font-bold py-2 px-1 rounded-lg text-[10px] sm:text-xs transition-colors flex flex-col items-center justify-center leading-tight ${canBuildHere ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                            onClick={() => { if (canBuildHere) { onBuildHouse?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                          >
                            {canBuildHere ? (
                              <>
                                <span>Build House</span>
                                <span className="text-[9px] font-mono font-normal">Cost: ৳{houseCost}</span>
                              </>
                            ) : (
                              <>
                                <span>Cannot Build</span>
                                <span className="text-[8px] font-mono font-normal">{buildDisabledReason}</span>
                              </>
                            )}
                          </button>

                          <button
                            className={`font-bold py-2 px-1 rounded-lg text-[10px] sm:text-xs transition-colors flex flex-col items-center justify-center leading-tight ${canSellHere ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                            onClick={() => { if (canSellHere) { onSellHouse?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                          >
                            {canSellHere ? (
                              <>
                                <span>Break House</span>
                                <span className="text-[9px] font-mono font-normal">Gain: +৳${houseCost / 2}</span>
                              </>
                            ) : (
                              <>
                                <span>Cannot Break</span>
                                <span className="text-[8px] font-mono font-normal">{sellDisabledReason}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
