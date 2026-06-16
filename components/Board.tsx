"use client";

import { useState, useEffect, useRef } from 'react';
import { GameState, BoardTile, Player } from '../../shared/types';
import DiceManager from './dice/DiceManager';
import { TramFront, Gift, Lightbulb, Droplet, BanknoteArrowDown, ShieldAlert } from 'lucide-react';
import { toBanglaNum } from '../utils/format';

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
  onTeleportPlayer?: (targetTileIndex: number) => void;
  onDevRollDice?: (d1: number, d2: number) => void;
  onDevAddFunds?: (amount: number) => void;
  onDevForceCrash?: () => void;
  onDevSetNextCrash?: (delayMinutes: number) => void;
  onDevGivePowerCard?: () => void;
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

function HouseIcon({ size = 10, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3L2 12h3v8h14v-8h3L12 3z" />
    </svg>
  );
}

function HotelIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 19h10V4H7v15zm2-13h2v2H9V6zm4 0h2v2h-2V6zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zM3 21h18v2H3v-2z" />
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

const getGroupTextColor = (group: string | undefined): string => {
  switch (group) {
    case 'Brown': return 'text-amber-50';
    case 'Light Blue': return 'text-cyan-950';
    case 'Pink': return 'text-fuchsia-950';
    case 'Orange': return 'text-orange-950';
    case 'Red': return 'text-red-50';
    case 'Yellow': return 'text-yellow-950';
    case 'Green': return 'text-emerald-950';
    case 'Dark Blue': return 'text-blue-50';
    default: return 'text-slate-300';
  }
};

const getGroupColor = (group: string | undefined): string => {
  switch (group) {
    case 'Brown': return 'bg-amber-700 text-amber-50';
    case 'Light Blue': return 'bg-cyan-400 text-cyan-950';
    case 'Pink': return 'bg-fuchsia-400 text-fuchsia-950';
    case 'Orange': return 'bg-orange-500 text-orange-950';
    case 'Red': return 'bg-red-500 text-red-50';
    case 'Yellow': return 'bg-yellow-400 text-yellow-950';
    case 'Green': return 'bg-emerald-500 text-emerald-950';
    case 'Dark Blue': return 'bg-blue-600 text-blue-50';
    default: return 'bg-slate-700 text-slate-300';
  }
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

function PlayerToken({ player, gameState, userId, hoveredTileIndex }: { player: Player; gameState: GameState; userId: string; hoveredTileIndex: number | null }) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
        const diceSum = gameState.dice ? gameState.dice[0] + gameState.dice[1] : 0;
        const expectedPos = (displayPosition + diceSum) % 40;

        let t1: ReturnType<typeof setTimeout>;
        let t2: ReturnType<typeof setTimeout>;

        if (player.position === 10 && player.inJail && expectedPos === 30 && displayPosition !== 30) {
          // Delay for dice roll, move to 30 (Go To Jail), wait, then move to 10 (Jail)
          t1 = setTimeout(() => {
            setDisplayPosition(30);
            t2 = setTimeout(() => {
              setDisplayPosition(10);
            }, 800);
          }, 1500);
          return () => { clearTimeout(t1); clearTimeout(t2); };
        } else {
          // Normal movement
          t1 = setTimeout(() => {
            setDisplayPosition(player.position);
          }, 1500);
          return () => clearTimeout(t1);
        }
      } else {
        setDisplayPosition(player.position);
      }
    }
  }, [player.position, displayPosition, isCurrentTurn, gameState.dice, player.inJail]);

  useEffect(() => {
    const updatePosition = () => {
      const tileEl = document.getElementById(`tile-${displayPosition}`);
      const boardEl = document.getElementById('board-container');
      if (tileEl && boardEl) {
        const tileRect = tileEl.getBoundingClientRect();
        const boardRect = boardEl.getBoundingClientRect();

        // Find index on tile to stagger overlapping tokens smoothly in a circle
        let playersOnTile = Object.values(gameState.players).filter(
          (p) => p.position === displayPosition && !p.isBankrupt
        );

        if (displayPosition === 10) {
          playersOnTile = playersOnTile.filter(p => p.inJail === player.inJail);
        }

        const indexOnTile = playersOnTile.findIndex((p) => p.id === player.id);
        const totalOnTile = playersOnTile.length;

        let offsetX = 0;
        let offsetY = 0;
        const orientation = getOrientation(displayPosition);
        let multX = 0.5;
        let multY = 0.5;

        if (orientation === 'TOP') multY = 0.78;
        if (orientation === 'BOTTOM') multY = 0.22;
        if (orientation === 'LEFT') multX = 0.78;
        if (orientation === 'RIGHT') multX = 0.22;

        if (Number(displayPosition) === 10) {
          if (player.inJail) {
            multX = 0.5;  
            multY = 0.62; // Mathematically centered over the 60% height icon
          } else {
            multX = 0.8;  
            multY = 0.2;
          }
        }

        if (totalOnTile > 1) {
          const angle = (indexOnTile / totalOnTile) * Math.PI * 2;
          const radius = 10;
          offsetX = Math.cos(angle) * radius;
          offsetY = Math.sin(angle) * radius;
        }

        const top = tileRect.top - boardRect.top;
        const left = tileRect.left - boardRect.left;

        setStyle({
          transform: `translate(${left + tileRect.width * multX + offsetX}px, ${top + tileRect.height * multY + offsetY}px) translate(-50%, -50%)`,
        });
        setIsVisible(true);
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
  const isParentTileHovered = hoveredTileIndex === player.position;
  const targetOpacity = !isVisible ? 0 : isHovered ? 1 : isParentTileHovered ? 0.3 : player.inJail ? 0.9 : 1;

  return (
    <div
      style={{ ...style, opacity: targetOpacity }}
      className="absolute top-0 left-0 transition-all duration-700 ease-in-out z-50 pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          backgroundColor: player.avatar,
          boxShadow: isCurrentTurn
            ? `0 0 20px ${player.avatar}, inset 0 -2px 6px rgba(0,0,0,0.3)`
            : `0 4px 10px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)`
        }}
        className={`relative w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center border border-white/10 overflow-hidden ${isCurrentTurn ? 'ring-2 ring-white/80 animate-player-pulse scale-110 z-50' : 'shadow-lg z-40'}`}
        title={player.name}
      >
        <div className={`w-full h-full absolute inset-0 transform transition-transform duration-300 ${isFlipped ? '-scale-x-100' : ''}`}>
          {/* Eyes looking to the right */}
          <div className="absolute top-[20%] right-[15%] flex gap-[1px] md:gap-[1.5px]">
            {/* Left eye */}
            <div className="w-[2.5px] h-[3.5px] sm:w-[3.5px] sm:h-[5px] md:w-[4.5px] md:h-[6px] lg:w-[5.5px] lg:h-[7.5px] bg-white rounded-full relative">
              <div className="w-[1px] h-[1.5px] sm:w-[1.5px] sm:h-[2px] md:w-[2px] md:h-[2.5px] lg:w-[2.5px] lg:h-[3.5px] bg-black rounded-full absolute bottom-[10%] right-[10%]" />
            </div>
            {/* Right eye */}
            <div className="w-[2.5px] h-[3.5px] sm:w-[3.5px] sm:h-[5px] md:w-[4.5px] md:h-[6px] lg:w-[5.5px] lg:h-[7.5px] bg-white rounded-full relative">
              <div className="w-[1px] h-[1.5px] sm:w-[1.5px] sm:h-[2px] md:w-[2px] md:h-[2.5px] lg:w-[2.5px] lg:h-[3.5px] bg-black rounded-full absolute bottom-[10%] right-[10%]" />
            </div>
          </div>
        </div>
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
  onTeleportPlayer,
  onDevRollDice,
  onDevAddFunds,
  onDevForceCrash,
  onDevSetNextCrash,
  onDevGivePowerCard,
  onPlaceBid,
}: BoardProps) {
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [selectedDevTile, setSelectedDevTile] = useState<number | null>(null);
  const [teleportTarget, setTeleportTarget] = useState<number>(0);
  const [devD1, setDevD1] = useState<number>(1);
  const [devD2, setDevD2] = useState<number>(1);
  const [devAddFundsAmount, setDevAddFundsAmount] = useState<number>(1000);
  const [devCrashDelay, setDevCrashDelay] = useState<number>(5);
  const [countdownText, setCountdownText] = useState<string>('');
  const [isActionReady, setIsActionReady] = useState<boolean>(true);
  const isMyTurn = gameState.currentTurnPlayerId === userId;
  const activePlayer = gameState.players[gameState.currentTurnPlayerId];
  const myPlayer = gameState.players[userId];

  // Determine if current player can buy the property they're standing on
  const currentTileIndex = myPlayer?.position ?? -1;
  const currentTile = boardTiles[currentTileIndex];
  const currentTileState = gameState.properties[currentTileIndex];
  let currentTilePrice = currentTile?.price || 0;
  if (gameState.marketCrash?.active) {
    currentTilePrice = Math.floor(currentTilePrice * 0.7);
  }

  const canBuyCurrent =
    isMyTurn &&
    currentTile &&
    ['STREET', 'RAILROAD', 'UTILITY'].includes(currentTile.type) &&
    (!currentTileState || !currentTileState.ownerId) &&
    (myPlayer?.balance ?? 0) >= currentTilePrice &&
    gameState.turnStatus === 'MUST_ACT_OR_END';

  // Compute Market Crash countdown
  useEffect(() => {
    if (!devMode || !gameState.marketCrash) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (gameState.marketCrash.active && gameState.marketCrash.crashEndTime) {
        const diff = gameState.marketCrash.crashEndTime - now;
        if (diff > 0) {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setCountdownText(`Ends in: ${mins}m ${secs}s`);
        } else {
          setCountdownText('Ending soon...');
        }
      } else if (!gameState.marketCrash.active && gameState.marketCrash.nextCrashTime) {
        const diff = gameState.marketCrash.nextCrashTime - now;
        if (diff > 0) {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setCountdownText(`Next in: ${mins}m ${secs}s`);
        } else {
          setCountdownText('Starting soon...');
        }
      } else {
        setCountdownText('No crash scheduled');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [devMode, gameState.marketCrash]);

  // Auto-end turn when sent to or staying in jail
  const wasSentToJailRef = useRef(false);
  useEffect(() => {
    if (isMyTurn && myPlayer?.inJail && gameState.turnStatus === 'MUST_ACT_OR_END') {
      if (!wasSentToJailRef.current) {
        wasSentToJailRef.current = true;
        const timer = setTimeout(() => {
          onEndTurn();
        }, 2200); // Wait for the piece animation
        return () => clearTimeout(timer);
      }
    } else {
      wasSentToJailRef.current = false;
    }
  }, [isMyTurn, myPlayer?.inJail, gameState.turnStatus, gameState.dice, onEndTurn]);

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
      className="relative mx-auto flex flex-col justify-between max-w-full"
      style={{ 
        aspectRatio: '1 / 1', 
        maxHeight: 'calc(100vh - 2rem)', // 2rem accounts for the p-4 parent padding
        width: 'auto'
      }}
    >
      {/* Dev Mode Toggle Button */}
      <button
        onClick={() => setDevMode(!devMode)}
        className={`absolute -top-3 left-4 md:-top-4 md:left-6 z-40 text-[9px] md:text-[11px] font-orbitron font-extrabold px-2.5 py-1 rounded-full shadow-lg transition-all border ${devMode
          ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/50'
          : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}
      >
        ডেভ মোড: {devMode ? 'চালু' : 'বন্ধ'}
      </button>

      {/* Dev Teleport UI */}
      {devMode && isMyTurn && (
        <div className="absolute top-8 left-4 md:top-10 md:left-6 z-50 flex flex-col gap-2 p-3 bg-[#13151A]/95 backdrop-blur-xl border-2 border-indigo-500/50 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-fade-in">
          {/* Teleport Area */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase w-[45px]">টার্গেট:</span>
            <input
              type="number"
              min="0" max="39"
              value={teleportTarget}
              onChange={(e) => setTeleportTarget(parseInt(e.target.value) || 0)}
              className="w-12 bg-[#0B0E14] border border-[#2A2E3B] rounded px-1 py-1 text-xs text-white font-mono text-center outline-none focus:border-purple-500"
            />
            <button
              onClick={() => onTeleportPlayer?.(teleportTarget)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(147,51,234,0.4)] active:scale-95 flex-1"
            >
              পাঠান
            </button>
          </div>

          {/* Manual Dice Area */}
          <div className="flex items-center gap-2 border-t border-purple-500/30 pt-2">
            <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase w-[45px]">ছক্কা:</span>
            <input
              type="number" min="1" max="6"
              value={devD1} onChange={(e) => setDevD1(parseInt(e.target.value) || 1)}
              className="w-8 bg-[#0B0E14] border border-[#2A2E3B] rounded px-1 py-1 text-xs text-white font-mono text-center outline-none focus:border-purple-500"
            />
            <input
              type="number" min="1" max="6"
              value={devD2} onChange={(e) => setDevD2(parseInt(e.target.value) || 1)}
              className="w-8 bg-[#0B0E14] border border-[#2A2E3B] rounded px-1 py-1 text-xs text-white font-mono text-center outline-none focus:border-purple-500"
            />
            <button
              onClick={() => {
                setIsActionReady(false);
                onDevRollDice?.(devD1, devD2);
                setTimeout(() => setIsActionReady(true), 2200);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(147,51,234,0.4)] active:scale-95 flex-1"
            >
              মারুন
            </button>
          </div>

          {/* Give Don Card Area */}
          <div className="flex items-center gap-2 border-t border-purple-500/30 pt-2">
            <button
              onClick={() => onDevGivePowerCard?.()}
              className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(220,38,38,0.4)] active:scale-95 w-full"
            >
              Give Don Card
            </button>
          </div>

          {/* Add Funds Area */}
          <div className="flex items-center gap-2 border-t border-purple-500/30 pt-2">
            <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase w-[45px]">টাকা:</span>
            <input
              type="number"
              value={devAddFundsAmount}
              onChange={(e) => setDevAddFundsAmount(parseInt(e.target.value) || 0)}
              className="w-16 bg-[#0B0E14] border border-[#2A2E3B] rounded px-1 py-1 text-xs text-white font-mono text-center outline-none focus:border-purple-500"
            />
            <button
              onClick={() => onDevAddFunds?.(devAddFundsAmount)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(52,211,153,0.4)] active:scale-95 flex-1"
            >
              +টাকা
            </button>
          </div>

          {/* Market Crash Area */}
          <div className="flex flex-col gap-2 border-t border-purple-500/30 pt-2">
            <div className="text-[10px] text-center text-red-400 font-orbitron tracking-widest font-bold">
              {countdownText}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase flex-1">ক্র্যাশ:</span>
              <input
                type="number" min="1" max="60"
                value={devCrashDelay} onChange={(e) => setDevCrashDelay(parseInt(e.target.value) || 5)}
                className="w-10 bg-[#0B0E14] border border-[#2A2E3B] rounded px-1 py-1 text-xs text-white font-mono text-center outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-400">মিঃ</span>
              <button
                onClick={() => onDevSetNextCrash?.(devCrashDelay)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(147,51,234,0.4)] active:scale-95"
              >
                সেট
              </button>
            </div>
            <button
              onClick={() => onDevForceCrash?.()}
              className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(220,38,38,0.4)] active:scale-95 w-full"
            >
              এখনই মার্কেট ক্র্যাশ করুন
            </button>
          </div>
        </div>
      )}

      {/* 11x11 Grid Wrapper */}
      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
      <div
        id="board-container"
        className="grid w-full h-full border-4 border-[#1e2a3d] rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-900/40"
        style={{
          gridTemplateColumns: 'minmax(0, 1.8fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.8fr)',
          gridTemplateRows: 'minmax(0, 1.8fr) repeat(9, minmax(0, 1.15fr)) minmax(0, 1.8fr)'
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
          let ownerAvatar: string | undefined = undefined;
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

          // Hover Overlay Positioning (inside board, front of cell)
          let hoverPositionClass = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
          if (orientation === 'TOP') hoverPositionClass = 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2';
          else if (orientation === 'BOTTOM') hoverPositionClass = 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2';
          else if (orientation === 'LEFT') hoverPositionClass = 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2';
          else if (orientation === 'RIGHT') hoverPositionClass = 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2';

          const isHijacked = gameState.activeDonPower?.targetTileIndex === tile.index;

          return (
            <div
              id={`tile-${tile.index}`}
              key={tile.index}
              style={{ gridRow: coords.row, gridColumn: coords.col }}
              onMouseEnter={() => setHoveredTileIndex(tile.index)}
              onMouseLeave={() => setHoveredTileIndex(null)}
              onClick={() => {
                if (['STREET', 'RAILROAD', 'UTILITY'].includes(tile.type)) {
                  if (devMode && isMyTurn) {
                    setSelectedDevTile(prev => prev === tile.index ? null : tile.index);
                  } else {
                    setSelectedTileIndex(tile.index);
                    onTileClick(tile.index);
                  }
                }
              }}
              className={`relative rounded-md bg-slate-800/40 backdrop-blur-md border border-slate-700 transition-all duration-150 cursor-pointer group hover:bg-slate-700/50 hover:border-slate-500/50 overflow-visible z-10 hover:z-[60]`}
            >
              {/* Hijacked Visual Overlay */}
              {isHijacked && (
                <div className="absolute inset-0 z-30 pointer-events-none rounded-md overflow-hidden ring-2 ring-red-500 shadow-[inset_0_0_15px_rgba(220,38,38,0.5)]">
                  {/* Police Tape Corners */}
                  <div className="absolute top-0 left-0 w-8 h-1 bg-yellow-400 repeating-linear-gradient-45 transform -rotate-45 -translate-x-2 translate-y-1" />
                  <div className="absolute bottom-0 right-0 w-8 h-1 bg-yellow-400 repeating-linear-gradient-45 transform -rotate-45 translate-x-2 -translate-y-1" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <ShieldAlert size={32} className="text-red-500" />
                  </div>
                </div>
              )}

              {/* ABSOLUTE REGION TABS - INWARD FACING */}
              {tile.group && orientation !== 'CORNER' && (
                <div className={
                  orientation === 'LEFT' ? `absolute left-full top-[10%] h-[80%] w-[14px] rounded-r-md z-[25] shadow-md ${getGroupColor(tile.group)}` :
                    orientation === 'RIGHT' ? `absolute right-full top-[10%] h-[80%] w-[14px] rounded-l-md z-[25] shadow-md ${getGroupColor(tile.group)}` :
                      orientation === 'TOP' ? `absolute top-full left-[10%] w-[80%] h-[12px] rounded-b-md z-[25] shadow-md ${getGroupColor(tile.group)}` :
                        `absolute bottom-full left-[10%] w-[80%] h-[12px] rounded-t-md z-[25] shadow-md ${getGroupColor(tile.group)}`
                } />
              )}

              {(() => {
                const priceContent = !isOwned && !!tile.price ? (
                  <span className="drop-shadow-md text-green-200 text-[8px] md:text-[10px] xl:text-[12px] font-bold font-mono">
                    {gameState.marketCrash?.active ? (
                      <span className="flex flex-wrap justify-center items-center gap-[2px]">
                        <del className="text-red-400 text-[6px] md:text-[8px] block md:inline leading-none mr-0.5">৳{toBanglaNum(tile.price)}</del>
                        <span className="text-emerald-400 leading-none">৳{toBanglaNum(Math.floor(tile.price * 0.7))}</span>
                      </span>
                    ) : (
                      `৳${toBanglaNum(tile.price)}`
                    )}
                  </span>
                ) : null;

                const iconNode = (() => {
                  if (tile.type === 'RAILROAD') return <TramFront size={28} className="text-slate-300 drop-shadow-md shrink-0" />;
                  if (tile.type === 'CHEST') return <Gift size={28} className="text-amber-300 drop-shadow-md shrink-0" />;
                  if (tile.type === 'CHANCE') return <img src="/images/treasure-chest.png" alt="Chance" className="w-7 h-7 md:w-8 md:h-8 object-contain drop-shadow-md shrink-0" />;
                  if (tile.type === 'UTILITY') {
                    if (districtName.includes('বিদ্যুৎ')) return <Lightbulb size={28} className="text-yellow-400 drop-shadow-md shrink-0" />;
                    if (districtName.includes('পানি')) return <Droplet size={28} className="text-blue-400 drop-shadow-md shrink-0" />;
                  }
                  if (tile.type === 'TAX') return <BanknoteArrowDown size={28} className="text-red-400 drop-shadow-md shrink-0" />;
                  return null;
                })();

                const getHouseImage = (h: number) => {
                  if (h === 1) return '/images/house-1.png';
                  if (h === 2) return '/images/house-2.png';
                  if (h === 3) return '/images/house-3.png';
                  if (h === 4) return '/images/houes-4.png';
                  return '/images/hotel.png';
                };

                const houseNode = houses > 0 ? (
                  <div key={`house-${houses}`} className="flex items-center justify-center shrink-0 z-20 animate-pop-in">
                    {houses < 5 ? (
                      <div className="flex items-center leading-none gap-[2px]">
                        <img src={getHouseImage(houses)} alt={`House ${houses}`} className="w-4 h-4 md:w-5 md:h-5 object-contain drop-shadow-md" />
                        <span className="text-[10px] md:text-[12px] font-black text-emerald-400 drop-shadow-md leading-none">
                          {toBanglaNum(houses)}
                        </span>
                      </div>
                    ) : (
                      <img src="/images/hotel.png" alt="Hotel" className="w-5 h-5 md:w-6 md:h-6 object-contain drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                    )}
                  </div>
                ) : null;

                if (orientation === 'CORNER') {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 md:p-2 bg-[#0B0E14]/90 text-center break-keep relative">
                      <span className={`font-bold text-[9px] md:text-[13px] xl:text-[16px] uppercase leading-tight text-white z-10 ${tile.type === 'JAIL' ? 'absolute top-1 md:top-2 left-1/2 -translate-x-1/2 w-full px-1' : 'relative'}`}>{tile.name}</span>
                      {tile.index === 0 && <div className="text-emerald-400 mt-1 md:mt-1.5 font-black text-[12px] md:text-[16px] z-10 relative">GO</div>}
                      {tile.type === 'FREE_PARKING' && (
                        <>
                          <img src="/images/relaxing.png" alt="Free Parking" className="w-10 h-10 md:w-14 md:h-14 mt-1 object-contain drop-shadow-md z-10 relative" />
                          {gameState.settings?.freeParkingCashPool && (
                            <div className="text-emerald-400 mt-1 flex items-center justify-center font-black text-[10px] md:text-[12px] animate-pulse z-10 relative">
                              <MoneyBagIcon size={12} className="mr-0.5" />
                              ৳{toBanglaNum(gameState.freeParkingPool || 0)}
                            </div>
                          )}
                        </>
                      )}
                      {tile.type === 'GO_TO_JAIL' && (
                        <img src="/images/custody.png" alt="Go To Jail" className="w-10 h-10 md:w-14 md:h-14 mt-1 object-contain drop-shadow-md z-10 relative" />
                      )}
                    </div>
                  );
                }

                if (orientation === 'TOP') {
                  return (
                    <div className="flex flex-col items-center p-1 gap-1 h-full w-full min-h-0">
                      {/* Zone 1 (Outer Edge - Purchase Bar OR Money) */}
                      <div className="min-h-[16px] w-full shrink-0 flex items-center justify-center">
                        {isOwned ? (
                          <div className="h-2.5 md:h-3 w-[80%] rounded-sm shadow-md" style={{ backgroundColor: ownerAvatar, opacity: isMortgaged ? 0.3 : 1 }} />
                        ) : (
                          priceContent
                        )}
                      </div>
                      {/* Zone 2 (Text Line - Perfectly Centered) */}
                      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center text-center px-1">
                        <span className="text-white font-bold font-sans text-[7px] md:text-[9px] xl:text-[11px] break-keep whitespace-pre-line leading-tight text-center w-full">{districtName}</span>
                      </div>
                      {/* Zone 3 (Icon - Inner Edge) */}
                      <div className="h-5 w-full shrink-0 flex items-center justify-center mb-0.5 md:mb-1">
                        {iconNode}
                        {houseNode}
                      </div>
                    </div>
                  );
                }

                if (orientation === 'BOTTOM') {
                  return (
                    <div className="flex flex-col items-center p-1 gap-1 h-full w-full min-h-0">
                      {/* Zone 1 (Icon - Inner Edge) */}
                      <div className="h-5 w-full shrink-0 flex items-center justify-center mt-0.5 md:mt-1">
                        {iconNode}
                        {houseNode}
                      </div>
                      {/* Zone 2 (Text Line - Perfectly Centered) */}
                      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center text-center px-1">
                        <span className="text-white font-bold font-sans text-[7px] md:text-[9px] xl:text-[11px] break-keep whitespace-pre-line leading-tight text-center w-full">{districtName}</span>
                      </div>
                      {/* Zone 3 (Outer Edge - Purchase Bar OR Money) */}
                      <div className="min-h-[16px] w-full shrink-0 flex items-center justify-center">
                        {isOwned ? (
                          <div className="h-2.5 md:h-3 w-[80%] rounded-sm shadow-md" style={{ backgroundColor: ownerAvatar, opacity: isMortgaged ? 0.3 : 1 }} />
                        ) : (
                          priceContent
                        )}
                      </div>
                    </div>
                  );
                }

                if (orientation === 'LEFT') {
                  return (
                    <div className="flex flex-row items-center p-1 gap-1.5 h-full w-full min-w-0">
                      {/* Zone 1 (Outer Edge) */}
                      <div className="w-3 h-full shrink-0 flex items-center justify-center">
                        {isOwned && <div className="w-full h-[75%] rounded-sm shadow-md" style={{ backgroundColor: ownerAvatar, opacity: isMortgaged ? 0.3 : 1 }} />}
                      </div>
                      {/* Zone 2 (Text Line - Strict Vertical Stack) */}
                      <div className="flex-1 h-full min-w-0 flex flex-col items-center justify-center text-center px-0.5">
                        {priceContent}
                        <span className="text-white font-bold font-sans text-[7px] md:text-[9px] xl:text-[11px] break-keep whitespace-pre-line leading-tight text-center w-full mt-0.5">{districtName}</span>
                      </div>
                      {/* Zone 3 (Icon) */}
                      <div className="w-5 shrink-0 flex items-center justify-center mr-1 md:mr-1.5">
                        {iconNode}
                        {houseNode}
                      </div>
                    </div>
                  );
                }

                if (orientation === 'RIGHT') {
                  return (
                    <div className="flex flex-row items-center p-1 gap-1.5 h-full w-full min-w-0">
                      {/* Zone 1 (Icon) */}
                      <div className="w-5 shrink-0 flex items-center justify-center ml-1 md:ml-1.5">
                        {iconNode}
                        {houseNode}
                      </div>
                      {/* Zone 2 (Text Line - Strict Vertical Stack) */}
                      <div className="flex-1 h-full min-w-0 flex flex-col items-center justify-center text-center px-0.5">
                        {priceContent}
                        <span className="text-white font-bold font-sans text-[7px] md:text-[9px] xl:text-[11px] break-keep whitespace-pre-line leading-tight text-center w-full mt-0.5">{districtName}</span>
                      </div>
                      {/* Zone 3 (Outer Edge) */}
                      <div className="w-3 h-full shrink-0 flex items-center justify-center">
                        {isOwned && <div className="w-full h-[75%] rounded-sm shadow-md" style={{ backgroundColor: ownerAvatar, opacity: isMortgaged ? 0.3 : 1 }} />}
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Quick Action / Info Hover Overlay */}
              {orientation !== 'CORNER' && (
                <>
                  {/* Rent Info Overlay (Other Player's Property) */}
                  {isOwned && propState?.ownerId !== userId && (
                    <div className="absolute inset-0 z-50 pointer-events-none">
                      <div className={`absolute ${hoverPositionClass} bg-red-500/95 backdrop-blur-md border border-red-400 text-white text-[10px] md:text-[12px] font-bold px-2.5 py-1 rounded-md shadow-2xl pointer-events-none transform scale-50 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-200 origin-center whitespace-nowrap z-[100]`}>
                        {propState.isMortgaged ? 'বন্ধক রাখা' : (
                          ['STREET', 'RAILROAD'].includes(tile.type) ? (
                            gameState.marketCrash?.active ? (
                              <span className="flex gap-1 items-center">ভাড়া: <del className="text-red-300 text-[8px] md:text-[10px]">৳{toBanglaNum(currentRent)}</del> <span className="text-emerald-300">৳{toBanglaNum(Math.ceil(currentRent * 1.4))}</span></span>
                            ) : (
                              `ভাড়া: ৳${toBanglaNum(currentRent)}`
                            )
                          ) :
                            tile.type === 'UTILITY' ? 'Dice x Rent' :
                              'Owned'
                        )}
                      </div>
                    </div>
                  )}

                  {/* Floating Action Menu */}
                  {propState?.ownerId === userId && (
                    <div className={`absolute z-[100] flex flex-col gap-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto backdrop-blur-md bg-[#0B0E14]/90 p-2.5 rounded-2xl border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] w-max ${orientation === 'TOP' ? 'top-full left-1/2 -translate-x-1/2 mt-2 before:absolute before:-top-4 before:left-0 before:w-full before:h-4' :
                      orientation === 'BOTTOM' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2 before:absolute before:-bottom-4 before:left-0 before:w-full before:h-4' :
                        orientation === 'LEFT' ? 'left-full top-1/2 -translate-y-1/2 ml-2 before:absolute before:-left-4 before:top-0 before:w-4 before:h-full' :
                          'right-full top-1/2 -translate-y-1/2 mr-2 before:absolute before:-right-4 before:top-0 before:w-4 before:h-full'
                      }`}>

                      {/* ONLY SHOW HOUSE CONTROLS IF IT IS A COLORED PROPERTY */}
                      {tile.group && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onBuildHouse?.(tile.index); }} className="flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/60 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all active:scale-95">
                            Build House
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); onSellHouse?.(tile.index); }} className="flex items-center justify-center px-4 py-1.5 rounded-full bg-orange-950/60 border border-orange-500/60 text-orange-400 text-[10px] font-bold uppercase tracking-wider hover:bg-orange-500 hover:text-white hover:shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all active:scale-95">
                            Break House
                          </button>
                        </>
                      )}

                      {/* THESE ALWAYS SHOW FOR ANY OWNED PROPERTY */}
                      <button onClick={(e) => { e.stopPropagation(); onMortgageProperty?.(tile.index); }} className="flex items-center justify-center px-4 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/60 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500 hover:text-white hover:shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all active:scale-95">
                        Mortgage
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); onSellProperty?.(tile.index); }} className="flex items-center justify-center px-4 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/60 text-rose-400 text-[10px] font-bold uppercase tracking-wider hover:bg-rose-500 hover:text-white hover:shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all active:scale-95">
                        Sell
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); onAuctionProperty?.(tile.index); }} className="flex items-center justify-center px-4 py-1.5 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/60 text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider hover:bg-fuchsia-500 hover:text-white hover:shadow-[0_0_10px_rgba(217,70,239,0.5)] transition-all active:scale-95">
                        Auction
                      </button>

                    </div>
                  )}
                </>
              )}

              {/* DEV MODE: Floating Teleport Button */}
              {devMode && isMyTurn && selectedDevTile === tile.index && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTeleportPlayer?.(tile.index);
                    setSelectedDevTile(null);
                  }}
                  className="absolute inset-0 m-auto w-fit h-fit z-50 bg-cyber-purple/90 border border-cyber-purple text-white text-[10px] font-bold px-3 py-1.5 rounded-sm shadow-[0_0_10px_rgba(216,180,248,0.5)] uppercase tracking-wider hover:bg-cyber-purple transition-all"
                >
                  TELEPORT
                </button>
              )}
            </div>
          );
        })}

        {/* Center Canvas Area - OPEN DIRECT DESIGN (No extra card framing overlay borders) */}
        <div className="col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center p-4 rounded-2xl m-3 relative overflow-hidden gap-3">

          {gameState.marketCrash?.active && (
            <div className="absolute top-2 flex items-center gap-2 px-4 py-1.5 bg-red-950/80 border border-red-500/50 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] z-50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,1)]" />
              <span className="text-red-400 font-orbitron font-bold text-xs uppercase tracking-widest animate-pulse">মার্কেট ক্র্যাশ চলছে</span>
            </div>
          )}

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
                  {activePlayer?.name || 'Operator'}-এর টার্ন চলছে...
                </span>
              </div>
            ) : (
              <div className="flex gap-4 items-center justify-center w-full">
                {/* Extreme Case: Negative Balance Check */}
                {gameState.turnStatus === 'BANKRUPTCY_PENDING' && isActionReady && (
                  <div className="flex flex-col items-center gap-2 w-full px-4 animate-fade-in">
                    <span className="text-red-500 font-bold uppercase tracking-wider text-sm animate-pulse text-center text-shadow-neon-purple">
                      সতর্কতা: আপনার ব্যালেন্স নেগেটিভ
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-300 text-center leading-tight">
                      আপনাকে অবশ্যই কিছু বিক্রি বা বন্ধক রেখে টাকা জোগাড় করতে হবে, না হলে দেউলিয়া ঘোষণা করতে হবে।
                    </span>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('declare_bankruptcy'))}
                      className="bg-red-600/80 border border-red-500 hover:bg-red-500 text-white font-orbitron font-extrabold text-[9px] md:text-[11px] px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl mt-1 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all active:scale-[0.98] cursor-pointer w-full sm:w-auto"
                    >
                      দেউলিয়া ঘোষণা করুন
                    </button>
                  </div>
                )}

                {/* Roll the dice OR Conclude Turn */}
                {gameState.turnStatus === 'MUST_ROLL' && !activePlayer?.inJail && isActionReady && (
                  <button
                    onClick={() => {
                      setIsActionReady(false);
                      onRollDice();
                      setTimeout(() => setIsActionReady(true), 2200);
                    }}
                    className="bg-[#6F4FF0] hover:bg-[#5C3ED9] text-white font-orbitron font-extrabold text-[10px] md:text-[12px] px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#6F4FF0]/30 transition-all duration-200 active:scale-[0.98] cursor-pointer w-[80%] sm:w-auto"
                  >
                    <DiceIcon size={14} className="stroke-white" />
                    ছক্কা মারুন
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
                        <span className="truncate">কিনুন ৳{toBanglaNum(currentTilePrice)}</span>
                      </button>
                    )}

                    {canBuyCurrent && gameState.settings?.allowUnpurchasedAuction !== false && !(gameState.properties[currentTileIndex] as any)?.auctionFailed && (
                      <button
                        onClick={() => onAuctionProperty?.(currentTileIndex)}
                        className="flex-1 min-w-[60px] sm:flex-none sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-orange-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                      >
                        নিলাম
                      </button>
                    )}

                    {/* get free for $50 fine option */}
                    {activePlayer?.inJail && (
                      <>
                        <button
                          onClick={onPayJailFine}
                          className="flex-1 min-w-[80px] sm:flex-none sm:w-auto bg-[#7B5BF2] hover:bg-[#6849E0] text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-[#7B5BF2]/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                        >
                          <MoneyBagIcon size={12} className="stroke-white shrink-0" />
                          ৳{toBanglaNum(50)} জরিমানা দিন
                        </button>
                        {(activePlayer.getOutOfJailFreeCards || 0) > 0 && onUsePardonCard && (
                          <button
                            onClick={onUsePardonCard}
                            className="flex-1 min-w-[80px] sm:flex-none sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-yellow-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                          >
                            <span className="text-lg leading-none shrink-0">🗝️</span>
                            পার্ডন কার্ড ব্যবহার করুন
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={onEndTurn}
                      className="flex-1 min-w-[80px] sm:flex-none sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                      <CheckIcon size={12} className="stroke-white shrink-0" />
                      {gameState.dice?.[0] === gameState.dice?.[1] && gameState.doubleRollCount > 0 && gameState.dice?.[0] !== 0 ? 'আবার মারুন' : 'টার্ন শেষ'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Activity History Log — filtered to important events only */}
          <div className="w-full relative select-none h-36 pt-2 flex flex-col justify-start shrink-0 group">
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
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#212f4d] via-[#212f4d]/85 to-transparent pointer-events-none z-10" />
          </div>

        </div>

        {/* Dynamic Smooth Player Tokens Overlay */}
        {Object.values(gameState.players).map((p) => {
          if (p.isBankrupt) return null;
          return <PlayerToken key={p.id} player={p} gameState={gameState} userId={userId} hoveredTileIndex={hoveredTileIndex} />;
        })}

        {/* Jail Icon Overlay */}
        <div
          style={{
            gridRow: getGridCoords(10).row,
            gridColumn: getGridCoords(10).col,
          }}
          className="relative pointer-events-none z-[70] w-full h-full"
        >
          <img
            src="/images/Jail.png"
            alt="Jail"
            className="absolute top-[32%] left-1/2 -translate-x-1/2 w-[60%] h-[60%] object-contain drop-shadow-2xl"
          />
        </div>

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

              const isJailRestricted = gameState.settings?.jailLoss && myPlayer?.inJail;

              const canBuildHere = !isJailRestricted && ownsFullSet && !anyMortgaged && currentHouses === minHouses && currentHouses < 5 && hasEnoughMoney;
              const canSellHere = !isJailRestricted && currentHouses > 0 && currentHouses === maxHouses;
              const canMortgageHere = !isJailRestricted && !selProp?.isMortgaged && currentHouses === 0 && !groupHasHouses;

              let buildDisabledReason = "";
              if (isJailRestricted) buildDisabledReason = "Jail Loss Active";
              else if (!ownsFullSet) buildDisabledReason = "Requires Full Set";
              else if (anyMortgaged) buildDisabledReason = "Group is Mortgaged";
              else if (currentHouses > minHouses) buildDisabledReason = "Build Evenly";
              else if (currentHouses >= 5) buildDisabledReason = "Max Upgrades Built";
              else if (!hasEnoughMoney) buildDisabledReason = "Insufficient Funds";

              let sellDisabledReason = "";
              if (isJailRestricted) sellDisabledReason = "Jail Loss Active";
              else if (currentHouses === 0) sellDisabledReason = "No Houses To Break";
              else if (currentHouses < maxHouses) sellDisabledReason = "Break Evenly";

              const canSellPropertyHere = !isJailRestricted && !groupHasHouses;

              let mortgageDisabledReason = "";
              if (isJailRestricted) mortgageDisabledReason = "Jail Loss Active";
              else if (selProp?.isMortgaged) mortgageDisabledReason = "Already Mortgaged";
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
                      <h2 className="opacity-80 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs font-sans mb-1">TITLE DEED</h2>
                      <h3 className="font-extrabold text-xl md:text-2xl font-sans leading-tight px-4">{selTile.name}</h3>
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
                            {gameState.marketCrash?.active ? (
                              <div className="flex gap-2 items-center justify-center">
                                <del className="text-red-500/70 text-sm">৳{selTile.price}</del>
                                <span className="font-black text-lg md:text-xl text-emerald-500">৳{Math.floor((selTile.price || 0) * 0.7)}</span>
                              </div>
                            ) : (
                              <span className="font-black text-lg md:text-xl text-slate-900">৳{selTile.price}</span>
                            )}

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
