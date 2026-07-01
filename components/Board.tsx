"use client";

import { useState, useEffect, useRef } from 'react';
import { GameState, BoardTile, Player } from '@/shared/types';
import DiceManager from './dice/DiceManager';
import { TramFront, Gift, Lightbulb, Droplet, BanknoteArrowDown, ShieldAlert } from 'lucide-react';
import { toBanglaNum } from '../utils/format';
import { getCompleteSets } from '../utils/propertySets';
import { historyTheme, parseBoardHistoryLogs } from '../utils/boardHistory';
import { useBoardHistoryLogs } from '../hooks/useBoardHistoryLogs';
import { isPropertyFrozenForOwner, isPropertyHijackedByDon } from '../utils/donPower';
import { AUTO_END_TURN_AFTER_LAND_MS } from '../constants/timing';

interface BoardProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  logs: string[];
  onRollDice: () => void;
  isPredictingRoll?: boolean;
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
  onStartLottery?: () => void;
  onTeleportPlayer?: (targetTileIndex: number) => void;
  onDevRollDice?: (d1: number, d2: number) => void;
  onDevAddFunds?: (amount: number) => void;
  onDevForceCrash?: () => void;
  onDevSetNextCrash?: (delayMinutes: number) => void;
  onDevGivePowerCard?: () => void;
  onDevForcePolice?: () => void;
  onDevSetNextPolice?: (delayMinutes: number) => void;
  onDevTestPoliceNotification?: () => void;
  onDevGivePardonCard?: () => void;
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

  const initialEffectiveBalance = gameState.pendingRentOwed?.debtorId === player.id
    ? player.balance - gameState.pendingRentOwed.remainingAmount
    : player.balance;
  const [displayBalance, setDisplayBalance] = useState(initialEffectiveBalance);

  const [floaters, setFloaters] = useState<{ id: number; diff: number }[]>([]);
  const prevBalance = useRef(initialEffectiveBalance);

  const isCurrentTurn = gameState.currentTurnPlayerId === player.id;
  const isMe = player.id === userId;

  useEffect(() => {
    if (player.position !== displayPosition) {
      setDisplayPosition(player.position);
    }
  }, [player.position, displayPosition]);

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

  // Watch for balance changes to trigger floating animation (synced via useSocket roll pipeline)
  useEffect(() => {
    const effectiveBalance = gameState.pendingRentOwed?.debtorId === player.id
      ? player.balance - gameState.pendingRentOwed.remainingAmount
      : player.balance;

    if (effectiveBalance !== prevBalance.current) {
      const diff = effectiveBalance - prevBalance.current;
      prevBalance.current = effectiveBalance;

      setDisplayBalance(effectiveBalance);
      const fId = Math.random();
      setFloaters(prev => [...prev, { id: fId, diff }]);

      setTimeout(() => {
        setFloaters(prev => prev.filter(f => f.id !== fId));
      }, 1500);
    }
  }, [player.balance, gameState, player.id]);

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

function OwnerColorBar({ color, isMortgaged, vertical = false }: { color: string; isMortgaged: boolean; vertical?: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-none shadow-md overflow-hidden ${vertical ? 'w-[22px] md:w-[26px] h-full' : 'h-[18px] md:h-[22px] w-full'
        }`}
      style={{ backgroundColor: color }}
    >
      {isMortgaged && (
        <img
          src="/images/Mortgage.png"
          alt="বন্ধক"
          className={`object-contain pointer-events-none drop-shadow-sm ${vertical ? 'w-[18px] md:w-[22px] h-auto max-h-full' : 'h-[16px] md:h-[20px] w-auto max-w-full'
            }`}
          draggable={false}
        />
      )}
    </div>
  );
}

export default function Board({
  gameState,
  boardTiles,
  userId,
  logs,
  onRollDice,
  isPredictingRoll = false,
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
  onStartLottery,
  onTeleportPlayer,
  onDevRollDice,
  onDevAddFunds,
  onDevForceCrash,
  onDevSetNextCrash,
  onDevGivePowerCard,
  onDevForcePolice,
  onDevSetNextPolice,
  onDevTestPoliceNotification,
  onDevGivePardonCard,
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
  const [devPoliceDelay, setDevPoliceDelay] = useState<number>(5);
  const [countdownText, setCountdownText] = useState<string>('');
  const [policeCountdownText, setPoliceCountdownText] = useState<string>('');
  const [glowingTiles, setGlowingTiles] = useState<Record<number, string>>({});
  const prevCompleteSetsRef = useRef<Set<string>>(new Set());
  const prevGameStatusForGlowRef = useRef<string | null>(null);
  const glowTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const expectingAutoRoll = useRef(false);

  // Auto-roll dice when transitioning to MUST_ROLL after a double roll
  useEffect(() => {
    if (expectingAutoRoll.current) {
      if (gameState.turnStatus === 'MUST_ROLL' && gameState.currentTurnPlayerId === userId) {
        expectingAutoRoll.current = false;
        onRollDice();
      }
    }
  }, [gameState.turnStatus, gameState.currentTurnPlayerId, userId, onRollDice]);

  const boardHistoryLogs = useBoardHistoryLogs(logs, gameState, 0);

  // One-shot glow when a color set is newly completed
  useEffect(() => {
    if (boardTiles.length === 0) return;

    const currentSets = getCompleteSets(gameState, boardTiles);
    const status = gameState.gameStatus;

    if (status === 'ACTIVE' && prevGameStatusForGlowRef.current !== 'ACTIVE') {
      prevCompleteSetsRef.current = currentSets;
      prevGameStatusForGlowRef.current = status;
      return;
    }

    prevGameStatusForGlowRef.current = status;

    if (status !== 'ACTIVE') {
      prevCompleteSetsRef.current = new Set();
      return;
    }

    currentSets.forEach((key) => {
      if (prevCompleteSetsRef.current.has(key)) return;

      const colonIdx = key.indexOf(':');
      const ownerId = key.slice(0, colonIdx);
      const group = key.slice(colonIdx + 1);
      const color = gameState.players[ownerId]?.avatar;
      if (!color) return;

      const indices = boardTiles
        .filter((t) => t.group === group && t.type === 'STREET')
        .map((t) => t.index);

      setGlowingTiles((prev) => {
        const next = { ...prev };
        indices.forEach((idx) => { next[idx] = color; });
        return next;
      });

      indices.forEach((idx) => {
        if (glowTimeoutsRef.current[idx]) clearTimeout(glowTimeoutsRef.current[idx]);
        glowTimeoutsRef.current[idx] = setTimeout(() => {
          setGlowingTiles((prev) => {
            const next = { ...prev };
            delete next[idx];
            return next;
          });
          delete glowTimeoutsRef.current[idx];
        }, 3000);
      });
    });

    prevCompleteSetsRef.current = currentSets;
  }, [gameState, boardTiles]);

  useEffect(() => {
    return () => {
      Object.values(glowTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const isMyTurn = gameState.currentTurnPlayerId === userId;
  const canManageProperty = isMyTurn && gameState.gameStatus === 'ACTIVE';
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

  // Compute Market Crash and Police countdown
  useEffect(() => {
    if (!devMode) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (gameState.marketCrash?.active && gameState.marketCrash.crashEndTime) {
        const diff = gameState.marketCrash.crashEndTime - now;
        if (diff > 0) {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setCountdownText(`Ends in: ${mins}m ${secs}s`);
        } else {
          setCountdownText('Ending soon...');
        }
      } else if (gameState.marketCrash && !gameState.marketCrash.active && gameState.marketCrash.nextCrashTime) {
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

      if (gameState.trafficPolice) {
        if (gameState.trafficPolice.active && gameState.trafficPolice.disappearanceTime) {
          const diff = gameState.trafficPolice.disappearanceTime - now;
          if (diff > 0) {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setPoliceCountdownText(`Leaves in: ${mins}m ${secs}s`);
          } else {
            setPoliceCountdownText('Leaving soon...');
          }
        } else if (!gameState.trafficPolice.active && gameState.trafficPolice.nextAppearanceTime) {
          const diff = gameState.trafficPolice.nextAppearanceTime - now;
          if (diff > 0) {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setPoliceCountdownText(`Arrives in: ${mins}m ${secs}s`);
          } else {
            setPoliceCountdownText('Arriving soon...');
          }
        } else {
          setPoliceCountdownText('Police off duty');
        }
      } else {
        setPoliceCountdownText('Not enabled');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [devMode, gameState.marketCrash, gameState.trafficPolice]);

  // Auto-end turn when sent to or staying in jail, or landing on FREE_PARKING
  const wasAutoEndedRef = useRef(false);
  useEffect(() => {
    const isJail = myPlayer?.inJail;
    const isFreeParking = myPlayer?.position === 20; // 20 is Free Parking

    if (isMyTurn && (isJail || isFreeParking) && gameState.turnStatus === 'MUST_ACT_OR_END') {
      if (!wasAutoEndedRef.current) {
        wasAutoEndedRef.current = true;
        const timer = setTimeout(() => {
          onEndTurn();
        }, AUTO_END_TURN_AFTER_LAND_MS);
        return () => clearTimeout(timer);
      }
    } else {
      wasAutoEndedRef.current = false;
    }
  }, [isMyTurn, myPlayer?.inJail, myPlayer?.position, gameState.turnStatus, gameState.dice, onEndTurn]);

  return (
    <div
      className="relative mx-auto flex flex-col justify-between shadow-2xl rounded-sm md:rounded-md ring-2 ring-[#2D284B] shrink-0 w-full h-full"
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
              onClick={() => onDevRollDice?.(devD1, devD2)}
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
            <button
              onClick={() => onDevGivePardonCard?.()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.4)] active:scale-95 w-full"
            >
              Give Pardon Card
            </button>
            <button
              onClick={() => onDevTestPoliceNotification?.()}
              className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(51,65,85,0.4)] active:scale-95 w-full"
            >
              Test Notification
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

          {/* Traffic Police Area */}
          <div className="flex flex-col gap-2 border-t border-purple-500/30 pt-2">
            <div className="text-[10px] text-center text-blue-400 font-orbitron tracking-widest font-bold">
              {policeCountdownText}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase flex-1">পুলিশ:</span>
              <input
                type="number" min="1" max="60"
                value={devPoliceDelay} onChange={(e) => setDevPoliceDelay(parseInt(e.target.value) || 5)}
                className="w-10 bg-[#0B0E14] border border-[#2A2E3B] rounded px-1 py-1 text-xs text-white font-mono text-center outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-400">মিঃ</span>
              <button
                onClick={() => onDevSetNextPolice?.(devPoliceDelay)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(147,51,234,0.4)] active:scale-95"
              >
                সেট
              </button>
            </div>
            <button
              onClick={() => onDevForcePolice?.()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(37,99,235,0.4)] active:scale-95 w-full"
            >
              এখনই পুলিশ পাঠান
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
        @keyframes complete-set-glow-once {
          0% {
            box-shadow: inset 0 0 4px var(--set-glow-color), 0 0 4px var(--set-glow-color);
            opacity: 0;
          }
          35% {
            box-shadow: inset 0 0 16px var(--set-glow-color), 0 0 14px var(--set-glow-color), 0 0 28px var(--set-glow-color);
            opacity: 1;
          }
          70% {
            box-shadow: inset 0 0 10px var(--set-glow-color), 0 0 8px var(--set-glow-color);
            opacity: 0.6;
          }
          100% {
            box-shadow: none;
            opacity: 0;
          }
        }
        .animate-complete-set-glow-once {
          animation: complete-set-glow-once 2.8s ease-out forwards;
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

          const isHijacked = gameState.activeDonPower?.targetTileIndexes.includes(tile.index);
          const hasPolice = gameState.trafficPolice?.active && gameState.trafficPolice?.position === tile.index;
          const glowColor = glowingTiles[tile.index];

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
              className="relative rounded-md bg-slate-800/40 backdrop-blur-md border border-slate-700 transition-all duration-150 cursor-pointer group hover:bg-slate-700/50 hover:border-slate-500/50 overflow-visible z-10 hover:z-[60]"
            >
              {/* One-shot complete set glow */}
              {glowColor && (
                <div
                  className="absolute inset-0 rounded-md pointer-events-none z-[5] animate-complete-set-glow-once border-2"
                  style={{
                    ['--set-glow-color' as string]: glowColor,
                    borderColor: glowColor,
                  }}
                />
              )}
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

              {/* Traffic Police Overlay — anchored to outer board edge so side tiles don't bleed inward */}
              {hasPolice && (
                <div
                  className={`absolute inset-0 z-[35] pointer-events-none rounded-md overflow-hidden ${
                    orientation === 'LEFT'
                      ? 'flex items-center justify-start'
                      : orientation === 'RIGHT'
                        ? 'flex items-center justify-end'
                        : orientation === 'TOP'
                          ? 'flex items-start justify-center'
                          : orientation === 'BOTTOM'
                            ? 'flex items-end justify-center'
                            : 'flex items-center justify-center'
                  }`}
                >
                  <div className="relative animate-bounce drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] shrink-0 leading-none">
                    <img
                      src="/images/trafic-plice.png"
                      alt="Traffic Police"
                      className="w-7 h-7 md:w-9 md:h-9 lg:w-10 lg:h-10 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* ABSOLUTE REGION TABS - INWARD FACING */}
              {tile.group && orientation !== 'CORNER' && (
                <div className={
                  orientation === 'LEFT' ? `absolute left-full top-[25%] h-[50%] w-[15px] rounded-r-md z-[25] shadow-md ${getGroupColor(tile.group)}` :
                    orientation === 'RIGHT' ? `absolute right-full top-[25%] h-[50%] w-[15px] rounded-l-md z-[25] shadow-md ${getGroupColor(tile.group)}` :
                      orientation === 'TOP' ? `absolute top-full left-[25%] w-[50%] h-[15px] rounded-b-md z-[25] shadow-md ${getGroupColor(tile.group)}` :
                        `absolute bottom-full left-[25%] w-[50%] h-[15px] rounded-t-md z-[25] shadow-md ${getGroupColor(tile.group)}`
                } />
              )}

              {(() => {
                const priceContent = !isOwned && !!tile.price ? (
                  <span className="drop-shadow-md text-green-200 text-[6px] md:text-[8px] xl:text-[10px] font-bold font-mono">
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
                  if (tile.type === 'RAILROAD') return <TramFront className="w-3 h-3 md:w-4 md:h-4 xl:w-5 xl:h-5 text-slate-300 drop-shadow-md shrink-0" />;
                  if (tile.type === 'CHEST') return <img src="/images/treasure-chest.png" alt="গুপ্তধন" className="w-7 h-7 md:w-8 md:h-8 object-contain drop-shadow-md shrink-0" />;
                  if (tile.type === 'CHANCE') return <Gift className="w-3 h-3 md:w-4 md:h-4 xl:w-5 xl:h-5 text-amber-300 drop-shadow-md shrink-0" />;
                  if (tile.type === 'LOTTERY') return <img src="/images/ticket.png" alt="Lottery" className="w-7 h-7 md:w-8 md:h-8 object-contain drop-shadow-md shrink-0 filter brightness-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />;
                  if (tile.type === 'UTILITY') {
                    if (districtName.includes('বিদ্যুৎ')) return <Lightbulb className="w-3 h-3 md:w-4 md:h-4 xl:w-5 xl:h-5 text-yellow-400 drop-shadow-md shrink-0" />;
                    if (districtName.includes('পানি')) return <Droplet className="w-3 h-3 md:w-4 md:h-4 xl:w-5 xl:h-5 text-blue-400 drop-shadow-md shrink-0" />;
                  }
                  if (tile.type === 'TAX') return <BanknoteArrowDown className="w-3 h-3 md:w-4 md:h-4 xl:w-5 xl:h-5 text-red-400 drop-shadow-md shrink-0" />;
                  return null;
                })();

                const getHouseImage = (h: number) => {
                  if (h === 1) return '/images/House_1.Png';
                  if (h === 2) return '/images/House_2.Png';
                  if (h === 3) return '/images/House_3.Png';
                  if (h === 4) return '/images/House_4.png';
                  return '/images/hotel.Png';
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
                      <img src="/images/hotel.Png" alt="Hotel" className="w-5 h-5 md:w-6 md:h-6 object-contain drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
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
                      <div className="min-h-[22px] w-full shrink-0 flex items-center justify-center">
                        {isOwned ? (
                          <OwnerColorBar color={ownerAvatar!} isMortgaged={isMortgaged} />
                        ) : (
                          priceContent
                        )}
                      </div>
                      {/* Zone 2 (Text Line - Perfectly Centered) */}
                      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center text-center px-1">
                        <span className="text-white font-bold font-sans text-[8px] md:text-[10px] xl:text-xs break-keep whitespace-pre-line leading-tight text-center w-full">{districtName}</span>
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
                        <span className="text-white font-bold font-sans text-[8px] md:text-[10px] xl:text-xs break-keep whitespace-pre-line leading-tight text-center w-full">{districtName}</span>
                      </div>
                      {/* Zone 3 (Outer Edge - Purchase Bar OR Money) */}
                      <div className="min-h-[22px] w-full shrink-0 flex items-center justify-center">
                        {isOwned ? (
                          <OwnerColorBar color={ownerAvatar!} isMortgaged={isMortgaged} />
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
                      <div className="w-[22px] md:w-[26px] h-full shrink-0 flex items-center justify-center">
                        {isOwned && <OwnerColorBar color={ownerAvatar!} isMortgaged={isMortgaged} vertical />}
                      </div>
                      {/* Zone 2 (Text Line - Strict Vertical Stack) */}
                      <div className="flex-1 h-full min-w-0 flex flex-col items-center justify-center text-center px-0.5">
                        {priceContent}
                        <span className="text-white font-bold font-sans text-[8px] md:text-[10px] xl:text-xs break-keep whitespace-pre-line leading-tight text-center w-full mt-0.5">{districtName}</span>
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
                        <span className="text-white font-bold font-sans text-[8px] md:text-[10px] xl:text-xs break-keep whitespace-pre-line leading-tight text-center w-full mt-0.5">{districtName}</span>
                      </div>
                      {/* Zone 3 (Outer Edge) */}
                      <div className="w-[22px] md:w-[26px] h-full shrink-0 flex items-center justify-center">
                        {isOwned && <OwnerColorBar color={ownerAvatar!} isMortgaged={isMortgaged} vertical />}
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
                  {propState?.ownerId === userId && canManageProperty && !isPropertyFrozenForOwner(gameState, tile.index, userId) && (
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
        <div className="absolute inset-[15%] md:inset-[12%] lg:inset-[14%] flex flex-col items-center justify-center pointer-events-none z-0">

          {gameState.marketCrash?.active && (
            <div className="absolute top-2 flex items-center gap-2 px-4 py-1.5 bg-red-950/80 border border-red-500/50 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] z-50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,1)]" />
              <span className="text-red-400 font-orbitron font-bold text-xs uppercase tracking-widest animate-pulse">মার্কেট ক্র্যাশ চলছে</span>
            </div>
          )}

          {/* CSS 3D Dice — premium roll animation with ground shadow */}
          <div className="w-full h-36 md:h-44 flex items-center justify-center relative shrink-0">
            <DiceManager gameState={gameState} isPredictingRoll={isPredictingRoll} />
          </div>

          {/* Status & Action Buttons directly under the dice (No card frame) */}
          <div className="w-full z-10 flex flex-col items-center justify-center select-none shrink-0 pointer-events-auto">
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
                {gameState.turnStatus === 'BANKRUPTCY_PENDING' && (
                  <div className="flex flex-col items-center gap-2 w-full px-4 animate-fade-in">
                    <span className="text-red-500 font-bold uppercase tracking-wider text-sm animate-pulse text-center text-shadow-neon-purple">
                      সতর্কতা: আপনার ব্যালেন্স নেগেটিভ
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-300 text-center leading-tight">
                      আপনাকে অবশ্যই কিছু বিক্রি বা বন্ধক রেখে টাকা জোগাড় করতে হবে, অথবা সাইডবার থেকে দেউলিয়া ঘোষণা করুন।
                    </span>
                  </div>
                )}

                {/* Roll the dice OR Conclude Turn */}
                {gameState.turnStatus === 'MUST_ROLL' && (
                  <div className="flex flex-col gap-2 w-full items-center">
                    <button
                      onClick={onRollDice}
                      disabled={isPredictingRoll}
                      className={`bg-[#6F4FF0] hover:bg-[#5C3ED9] text-white font-orbitron font-extrabold text-[10px] md:text-[12px] px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#6F4FF0]/30 transition-all duration-200 active:scale-[0.98] w-[80%] sm:w-auto ${isPredictingRoll ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <DiceIcon size={14} className="stroke-white" />
                      ছক্কা মারুন
                    </button>

                    {/* Jail Options */}
                    {activePlayer?.inJail && (
                      <div className="flex gap-2 justify-center flex-wrap mt-2">
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
                      </div>
                    )}
                  </div>
                )}

                {gameState.turnStatus === 'MUST_ACT_OR_END' && (
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

                    {/* NO JAIL OPTIONS HERE ANYMORE */}

                    <button
                      onClick={() => {
                        if (gameState.dice?.[0] === gameState.dice?.[1] && gameState.doubleRollCount > 0 && gameState.dice?.[0] !== 0) {
                          expectingAutoRoll.current = true;
                        }
                        onEndTurn();
                      }}
                      className="flex-1 min-w-[80px] sm:flex-none sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-orbitron font-extrabold text-[9px] md:text-[12px] px-2 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                      <CheckIcon size={12} className="stroke-white shrink-0" />
                      {gameState.dice?.[0] === gameState.dice?.[1] && gameState.doubleRollCount > 0 && gameState.dice?.[0] !== 0 ? 'ছক্কা মারুন' : 'টার্ন শেষ'}
                    </button>
                  </div>
                )}

                {gameState.turnStatus === 'MUST_RESOLVE_LOTTERY' && (
                  <div className="flex flex-col gap-2 w-full items-center">
                    {gameState.activeLottery?.hasStarted ? (
                      <span className="text-amber-500 font-bold uppercase tracking-wider text-[10px] md:text-xs animate-pulse text-center">
                        লটারির জন্য অপেক্ষা করা হচ্ছে...
                      </span>
                    ) : (
                      <button
                        onClick={onStartLottery}
                        className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-orbitron font-extrabold text-[10px] md:text-[12px] px-6 py-2 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-200 hover:scale-105 active:scale-95 uppercase tracking-widest"
                      >
                        লটারি শুরু করুন
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Activity History Log — short lines, player dot only */}
          <div className="w-full relative select-none h-36 pt-2 flex flex-col justify-start shrink-0 pointer-events-auto">
            <div className="overflow-y-auto w-full h-full pr-1 flex flex-col gap-2 scrollbar-thin select-none max-h-[120px] pb-10">
              {(() => {
                const entries = boardHistoryLogs
                  .flatMap((log) => parseBoardHistoryLogs(log, Object.values(gameState.players)))
                  .slice(0, historyTheme.settings.maxEntries);

                if (entries.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-600 font-sans text-[10px] tracking-wide">
                      কোনো কার্যকলাপ নেই
                    </div>
                  );
                }

                return entries.map((entry, index) => (
                  <div key={index} className="flex items-center justify-center gap-2 py-0.5 w-full px-2">
                    {historyTheme.settings.showPlayerDot && entry.player && (
                      <span
                        style={{ backgroundColor: entry.player.avatar }}
                        className="w-3 h-3 rounded-full shrink-0 border border-white/15 shadow-sm"
                        title={entry.player.name}
                      />
                    )}
                    <span className="text-[11px] md:text-[12px] font-sans font-medium text-slate-300 text-center leading-snug">
                      {entry.text}
                    </span>
                  </div>
                ));
              })()}
            </div>

            {/* Fade into board center — matches corner/center tile tone */}
            <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0B0E14] from-40% via-[#0B0E14]/80 to-transparent pointer-events-none z-10" />
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
          className="absolute inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl p-4 transition-opacity duration-200"
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
              const isDonFrozen =
                selectedTileIndex !== null &&
                isPropertyFrozenForOwner(gameState, selectedTileIndex, userId);

              const canBuildHere = canManageProperty && !isJailRestricted && !isDonFrozen && ownsFullSet && !anyMortgaged && currentHouses === minHouses && currentHouses < 5 && hasEnoughMoney;
              const canSellHere = canManageProperty && !isJailRestricted && !isDonFrozen && currentHouses > 0 && currentHouses === maxHouses;
              const canMortgageHere = canManageProperty && !isJailRestricted && !isDonFrozen && !selProp?.isMortgaged && currentHouses === 0 && !groupHasHouses;

              const unmortgageCost = Math.ceil((selTile.mortgageValue || 0) * 1.1);
              const canUnmortgageHere = canManageProperty && !isJailRestricted && !isDonFrozen && !!selProp?.isMortgaged && (myPlayer?.balance || 0) >= unmortgageCost;

              let buildDisabledReason = "";
              if (!canManageProperty) buildDisabledReason = "আপনার টার্ন নয়";
              else if (isDonFrozen) buildDisabledReason = "Don Hijacked";
              else if (isJailRestricted) buildDisabledReason = "Jail Loss Active";
              else if (!ownsFullSet) buildDisabledReason = "Requires Full Set";
              else if (anyMortgaged) buildDisabledReason = "Group is Mortgaged";
              else if (currentHouses > minHouses) buildDisabledReason = "Build Evenly";
              else if (currentHouses >= 5) buildDisabledReason = "Max Upgrades Built";
              else if (!hasEnoughMoney) buildDisabledReason = "Insufficient Funds";

              let sellDisabledReason = "";
              if (!canManageProperty) sellDisabledReason = "আপনার টার্ন নয়";
              else if (isDonFrozen) sellDisabledReason = "Don Hijacked";
              else if (isJailRestricted) sellDisabledReason = "Jail Loss Active";
              else if (currentHouses === 0) sellDisabledReason = "No Houses To Break";
              else if (currentHouses < maxHouses) sellDisabledReason = "Break Evenly";

              const canSellPropertyHere = canManageProperty && !isJailRestricted && !isDonFrozen && !groupHasHouses;

              let mortgageDisabledReason = "";
              if (!canManageProperty) mortgageDisabledReason = "আপনার টার্ন নয়";
              else if (isDonFrozen) mortgageDisabledReason = "Don Hijacked";
              else if (isJailRestricted) mortgageDisabledReason = "Jail Loss Active";
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
                      <h2 className="opacity-80 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs font-sans mb-1">দলিলাপাত্র</h2>
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
                            <span className={activeRentTier === 0 ? 'font-bold' : ''}>খালি জায়গার ভাড়া</span> <span className={`font-bold ${activeRentTier === 0 ? 'text-purple-700' : 'text-slate-900'}`}>৳{toBanglaNum(selTile.rent[0])}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 1 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 1 ? 'font-bold' : ''}>১টি বাড়ি থাকলে</span> <span className={activeRentTier === 1 ? 'font-black text-purple-700' : ''}>৳{toBanglaNum(selTile.rent[1])}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 2 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 2 ? 'font-bold' : ''}>২টি বাড়ি থাকলে</span> <span className={activeRentTier === 2 ? 'font-black text-purple-700' : ''}>৳{toBanglaNum(selTile.rent[2])}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 3 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 3 ? 'font-bold' : ''}>৩টি বাড়ি থাকলে</span> <span className={activeRentTier === 3 ? 'font-black text-purple-700' : ''}>৳{toBanglaNum(selTile.rent[3])}</span>
                          </div>
                          <div className={`flex justify-between items-center transition-all ${activeRentTier === 4 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}>
                            <span className={activeRentTier === 4 ? 'font-bold' : ''}>৪টি বাড়ি থাকলে</span> <span className={activeRentTier === 4 ? 'font-black text-purple-700' : ''}>৳{toBanglaNum(selTile.rent[4])}</span>
                          </div>
                          <div className={`flex justify-between items-center mt-1 pt-2 border-t border-slate-300 transition-all ${activeRentTier === 5 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-800'}`}>
                            <span className={activeRentTier === 5 ? 'font-bold' : ''}>হোটেল থাকলে</span> <span className={`font-bold ${activeRentTier === 5 ? 'text-purple-700' : ''}`}>৳{toBanglaNum(selTile.rent[5])}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300 text-slate-700"><span>বন্ধকী মূল্য</span> <span>৳{toBanglaNum(selTile.mortgageValue || 0)}</span></div>
                        <div className="flex justify-between items-center text-slate-700"><span>বাড়ি বানানোর খরচ</span> <span>প্রতিটি ৳{toBanglaNum(selTile.houseCost || 0)}</span></div>
                      </>
                    )}

                    {selTile.type === 'RAILROAD' && selTile.rent && (
                      <>
                        <div className="flex flex-col gap-1 w-full">
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 0 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>১টি স্টেশন থাকলে</span> <span className={activeRailroadTier === 0 ? 'font-black text-purple-700' : ''}>৳২৫</span></div>
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 1 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>২টি স্টেশন থাকলে</span> <span className={activeRailroadTier === 1 ? 'font-black text-purple-700' : ''}>৳৫০</span></div>
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 2 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>৩টি স্টেশন থাকলে</span> <span className={activeRailroadTier === 2 ? 'font-black text-purple-700' : ''}>৳১০০</span></div>
                          <div className={`flex justify-between items-center transition-all ${activeRailroadTier === 3 ? 'ring-2 ring-purple-500 bg-purple-500/15 rounded px-1.5 py-0.5 -mx-1.5 shadow-sm text-slate-900' : 'text-slate-600'}`}><span>৪টি স্টেশন থাকলে</span> <span className={activeRailroadTier === 3 ? 'font-black text-purple-700' : ''}>৳২০০</span></div>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300 text-slate-700"><span>বন্ধকী মূল্য</span> <span>৳{toBanglaNum(selTile.mortgageValue || 0)}</span></div>
                      </>
                    )}

                    {selTile.type === 'UTILITY' && (
                      <>
                        <div className="text-center text-xs mb-2 leading-relaxed text-slate-700">
                          যেকোনো ১টি ইউটিলিটি থাকলে ডাইসের মোট যোগফলের ৪ গুণ ভাড়া।<br />
                          উভয় ইউটিলিটি থাকলে ডাইসের মোট যোগফলের ১০ গুণ ভাড়া।
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300 text-slate-700"><span>বন্ধকী মূল্য</span> <span>৳{toBanglaNum(selTile.mortgageValue || 0)}</span></div>
                      </>
                    )}

                    {!selTile.price && (
                      <div className="text-center text-slate-500 py-4 italic">
                        বিশেষ ঘর
                      </div>
                    )}

                    {/* Owner Status */}
                    {selTile.price && (
                      <div className="mt-4 p-3 bg-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 border border-slate-300">
                        {owner ? (
                          <>
                            <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">বর্তমান মালিক</span>
                            <div className="flex items-center gap-2">
                              <span style={{ backgroundColor: owner.avatar }} className="w-4 h-4 rounded-full border border-slate-400" />
                              <span className="font-bold text-slate-900">{owner.name}</span>
                            </div>
                            {isPropertyHijackedByDon(gameState, selectedTileIndex) && (
                              <div className="mt-2 text-center text-[11px] text-red-600 font-bold bg-red-500/10 border border-red-500/20 rounded px-2.5 py-1.5 flex flex-col items-center gap-0.5">
                                <span className="flex items-center gap-1">🕴️ ডন দ্বারা হাইজ্যাককৃত!</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ভাড়া পাবেন: {gameState.players[gameState.activeDonPower!.donPlayerId]?.name || 'ডন'}
                                </span>
                              </div>
                            )}
                            {selProp.isMortgaged && <span className="text-xs text-red-500 font-bold mt-1">বন্ধক রাখা হয়েছে</span>}
                            {!selProp.isMortgaged && selProp.houses > 0 && (
                              <span className="text-xs text-emerald-600 font-bold mt-1">
                                {selProp.houses === 5 ? 'হোটেল তৈরি আছে' : `${toBanglaNum(selProp.houses)}টি বাড়ি তৈরি আছে`}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] md:text-xs text-emerald-600 uppercase tracking-wider font-bold">কেনার জন্য উন্মুক্ত</span>
                            {gameState.marketCrash?.active ? (
                              <div className="flex gap-2 items-center justify-center">
                                <del className="text-red-500/70 text-sm">৳{toBanglaNum(selTile.price || 0)}</del>
                                <span className="font-black text-lg md:text-xl text-emerald-500">৳{toBanglaNum(Math.floor((selTile.price || 0) * 0.7))}</span>
                              </div>
                            ) : (
                              <span className="font-black text-lg md:text-xl text-slate-900">৳{toBanglaNum(selTile.price || 0)}</span>
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
                          {canMortgageHere ? `মর্টগেজ (+৳${toBanglaNum(selTile.mortgageValue)})` : `মর্টগেজ করা যাবে না: ${mortgageDisabledReason}`}
                        </button>
                      ) : (
                        <button
                          className={`w-full font-bold py-2.5 px-2 rounded-lg text-xs transition-colors flex justify-center items-center gap-1 ${canUnmortgageHere ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                          onClick={() => { if (canUnmortgageHere) { onUnmortgageProperty?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                          disabled={!canUnmortgageHere}
                        >
                          {canUnmortgageHere ? `আনমর্টগেজ (-৳${toBanglaNum(unmortgageCost)})` : 'আনমর্টগেজ করা যাবে না'}
                        </button>
                      )}

                      {/* Sell Property to Bank */}
                      <button
                        className={`w-full font-bold py-2.5 px-2 rounded-lg text-xs transition-colors flex justify-center items-center shadow-md ${canSellPropertyHere ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                        onClick={() => { if (canSellPropertyHere) { onSellProperty?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                      >
                        {canSellPropertyHere ? `সম্পদ বিক্রি (+৳${toBanglaNum(selTile.mortgageValue || Math.floor((selTile.price || 0) / 2))})` : `বিক্রি সম্ভব নয়: গ্রুপে বাড়ি আছে`}
                      </button>

                      {/* Auction Property */}
                      <button
                        className={`w-full font-bold py-2.5 px-2 rounded-lg text-xs transition-colors flex justify-center items-center shadow-md ${canSellPropertyHere ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                        onClick={() => { if (canSellPropertyHere) { onAuctionProperty?.(selectedTileIndex); setSelectedTileIndex(null); } }}
                      >
                        {canSellPropertyHere ? `নিলামে তুলুন (${selProp.isMortgaged ? '৪০%' : '৭০%'} থেকে শুরু)` : `নিলাম সম্ভব নয়: গ্রুপে বাড়ি আছে`}
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
                                <span>বাড়ি তৈরি করুন</span>
                                <span className="text-[9px] font-mono font-normal">খরচ: ৳{toBanglaNum(houseCost)}</span>
                              </>
                            ) : (
                              <>
                                <span>তৈরি করা যাবে না</span>
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
                                <span>বাড়ি ভাঙুন</span>
                                <span className="text-[9px] font-mono font-normal">লাভ: +৳{toBanglaNum(houseCost / 2)}</span>
                              </>
                            ) : (
                              <>
                                <span>ভাঙা যাবে না</span>
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
