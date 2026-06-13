"use client";

import { useState, useEffect } from 'react';
import { GameState, BoardTile, TradeOfferPayload } from '../../shared/types';

interface TradePanelProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  pendingTrade: { tradeId: string; offer: TradeOfferPayload } | null;
  onProposeTrade: (offer: Omit<TradeOfferPayload, 'senderId'>) => void;
  onRespondToTrade: (tradeId: string, accept: boolean) => void;
  onMortgageProperty?: (index: number) => void;
  onUnmortgageProperty?: (index: number) => void;
}

// Inline SVGs for self-contained, crash-free icons
function PlusIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
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

function XIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function PencilIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  );
}

function ArrowRightLeftIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m16 3 4 4-4 4"></path>
      <path d="M20 7H4"></path>
      <path d="m8 21-4-4 4-4"></path>
      <path d="M4 17h16"></path>
    </svg>
  );
}

function SendIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

function MessageIcon({ size = 12, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function ClockIcon({ size = 10, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

// Maps name/group to flag emoji
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

// Formats time left to MM:SS
const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function TradePanel({
  gameState,
  boardTiles,
  userId,
  pendingTrade,
  onProposeTrade,
  onRespondToTrade,
  onMortgageProperty,
  onUnmortgageProperty
}: TradePanelProps) {
  const self = gameState.players[userId];

  // Active counterparties (not me, not bankrupt)
  const counterparties = Object.values(gameState.players).filter(
    (p) => p.id !== userId && !p.isBankrupt
  );

  // Modals state: 'NONE' | 'SELECT_COUNTERPARTY' | 'CREATE_TRADE' | 'VIEW_TRADE'
  const [activeModal, setActiveModal] = useState<'NONE' | 'SELECT_COUNTERPARTY' | 'CREATE_TRADE' | 'VIEW_TRADE'>('NONE');
  const [receiverId, setReceiverId] = useState<string>('');
  const [offerCash, setOfferCash] = useState<number>(0);
  const [requestCash, setRequestCash] = useState<number>(0);
  const [selectedOfferProps, setSelectedOfferProps] = useState<number[]>([]);
  const [selectedRequestProps, setSelectedRequestProps] = useState<number[]>([]);

  // Expiration timer states
  const [useTimer, setUseTimer] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(120); // default 2 mins

  // Countdown timer for active proposal
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!pendingTrade || !pendingTrade.offer.expiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const diff = pendingTrade.offer.expiresAt! - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingTrade]);

  // Automatically reset states when a modal closes or values change
  const handleOpenCreateModal = () => {
    setReceiverId(counterparties[0]?.id || '');
    setOfferCash(0);
    setRequestCash(0);
    setSelectedOfferProps([]);
    setSelectedRequestProps([]);
    setUseTimer(false);
    setTimerSeconds(120);
    setActiveModal('SELECT_COUNTERPARTY');
  };

  const handleSelectCounterparty = (id: string) => {
    setReceiverId(id);
    setOfferCash(0);
    setRequestCash(0);
    setSelectedOfferProps([]);
    setSelectedRequestProps([]);
    setUseTimer(false);
    setTimerSeconds(120);
    setActiveModal('CREATE_TRADE');
  };

  const handleOpenViewTradeModal = () => {
    if (pendingTrade) {
      setActiveModal('VIEW_TRADE');
    }
  };

  const handleSendOffer = () => {
    if (!receiverId) return;
    onProposeTrade({
      receiverId,
      offerCash,
      requestCash,
      offerPropertyIndexes: selectedOfferProps,
      requestPropertyIndexes: selectedRequestProps,
      durationSeconds: useTimer ? timerSeconds : undefined
    });
    setActiveModal('NONE');
  };

  const handleNegotiate = () => {
    if (!pendingTrade) return;
    // Swap roles: prefill proposal with reversed cash & properties
    const currentOffer = pendingTrade.offer;
    const opponentId = currentOffer.senderId;

    setReceiverId(opponentId);
    setOfferCash(currentOffer.requestCash);
    setRequestCash(currentOffer.offerCash);
    setSelectedOfferProps(currentOffer.requestPropertyIndexes);
    setSelectedRequestProps(currentOffer.offerPropertyIndexes);
    setUseTimer(false);
    setTimerSeconds(120);
    setActiveModal('CREATE_TRADE');
  };

  if (!self || self.isBankrupt) return null;

  // My properties and opponent's properties that are tradable (houses = 0)
  const myTradableProps = Object.values(gameState.properties).filter(
    (p) => p.ownerId === userId && p.houses === 0
  );

  const opponentTradableProps = Object.values(gameState.properties).filter(
    (p) => p.ownerId === receiverId && p.houses === 0
  );

  const myProperties = Object.values(gameState.properties).filter(
    (p) => p.ownerId === userId
  );

  const handleToggleOfferProp = (idx: number) => {
    setSelectedOfferProps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleToggleRequestProp = (idx: number) => {
    setSelectedRequestProps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Helper to format currency
  const getPropName = (idx: number) => boardTiles[idx]?.name || `Tile ${idx}`;
  const getPropPrice = (idx: number) => boardTiles[idx]?.price || 0;

  // Retrieve player details for current pending trade representation
  const pendingSender = pendingTrade ? gameState.players[pendingTrade.offer.senderId] : null;
  const pendingReceiver = pendingTrade ? gameState.players[pendingTrade.offer.receiverId] : null;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. TRADES LIST CARD */}
      <div className="bg-[#19162C] border border-[#2D284B] rounded-2xl p-4 flex flex-col gap-3.5 select-none shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="flex justify-between items-center">
          <span className="text-base font-orbitron font-extrabold tracking-widest text-slate-300 uppercase">
            Trades
          </span>
          <button
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C3AED] hover:to-[#4F46E5] text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold font-orbitron transition-all duration-200 active:scale-[0.96] shadow-[0_2px_10px_rgba(139,92,246,0.25)] cursor-pointer"
          >
            <PlusIcon size={12} className="stroke-white" />
            Create
          </button>
        </div>

        {/* Trade proposals */}
        <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-0.5">
          {pendingTrade ? (
            <div
              onClick={handleOpenViewTradeModal}
              className="bg-[#241F3E] border border-[#3A335E] rounded-xl p-3B flex items-center justify-between cursor-pointer hover:bg-[#2C274B] hover:border-[#4E467D] transition-all duration-200 shadow-md group p-3.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  style={{ backgroundColor: pendingSender?.avatar || '#8BA4F9' }}
                  className="w-5.5 h-5.5 rounded-full border border-white/10 flex items-center justify-center shrink-0"
                />
                <span className="text-xs font-sans font-bold text-slate-200 truncate group-hover:text-white transition-colors max-w-[75px]">
                  {pendingSender?.name || 'Operator'}
                </span>
              </div>

              <div className="flex flex-col items-center shrink-0 px-2.5">
                <span className="text-[#8B5CF6] text-sm font-mono font-bold">↔</span>
                {timeLeft > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 bg-red-950/60 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono text-red-400 font-extrabold animate-pulse">
                    <ClockIcon size={9} />
                    <span>{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-sans font-bold text-slate-200 truncate group-hover:text-white transition-colors max-w-[75px]">
                  {pendingReceiver?.name || 'Operator'}
                </span>
                <div
                  style={{ backgroundColor: pendingReceiver?.avatar || '#8BA4F9' }}
                  className="w-5.5 h-5.5 rounded-full border border-white/10 flex items-center justify-center shrink-0"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-7 bg-[#121021]/50 border border-[#241F3C] rounded-xl text-slate-500 font-mono text-xs uppercase tracking-widest leading-relaxed">
              No Active Proposals
            </div>
          )}
        </div>
      </div>

      {/* 2. MY PROPERTIES CARD */}
      <div className="bg-[#19162C] border border-[#2D284B] rounded-2xl p-4 flex-1 flex flex-col gap-3.5 select-none shadow-[0_4px_20px_rgba(0,0,0,0.25)] min-h-[220px] overflow-hidden">
        <span className="text-base font-orbitron font-extrabold tracking-widest text-slate-300 uppercase block text-center border-b border-[#241F3C] pb-2.5">
          My Properties ({myProperties.length})
        </span>
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
          {myProperties.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-mono text-xs uppercase tracking-widest leading-relaxed">
              No Property Certificates Acquired
            </div>
          ) : (
            myProperties.map((prop) => {
              const tile = boardTiles[prop.tileIndex];
              if (!tile) return null;
              
              const mortgageVal = tile.mortgageValue || Math.floor((tile.price || 0) / 2);
              const unmortgageCost = Math.ceil(mortgageVal * 1.1);

              return (
                <div
                  key={prop.tileIndex}
                  className="p-2.5 bg-[#211B35] hover:bg-[#2A2345] border border-[#2E284D]/40 rounded-xl flex justify-between items-center gap-2 transition-colors shadow-sm"
                >
                  <div className="flex gap-3 items-center flex-1 min-w-0">
                    <div className={`w-2.5 h-8 rounded-sm shrink-0 ${getGroupColor(tile.group)}`} />
                    <div className="flex-1 min-w-0 truncate pr-2">
                      <span className="text-xs font-bold text-white block uppercase truncate leading-tight mb-0.5">
                        {tile.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">
                        {(() => {
                          if (prop.isMortgaged) return 'MORTGAGED';
                          if (tile.type === 'UTILITY') return 'DICE x RENT';
                          let currentRent = tile.rent ? tile.rent[prop.houses] : 0;
                          if (tile.type === 'STREET' && prop.houses === 0 && gameState.settings?.doubleRentOnCompleteSet) {
                            const ownsFullSet = boardTiles.filter(t => t.group === tile.group).every(t => {
                              const p = gameState.properties[t.index];
                              return p && p.ownerId === prop.ownerId;
                            });
                            if (ownsFullSet) currentRent *= 2;
                          } else if (tile.type === 'RAILROAD') {
                            const count = Object.values(gameState.properties).filter(
                              p => p.ownerId === prop.ownerId && boardTiles[p.tileIndex]?.type === 'RAILROAD'
                            ).length;
                            currentRent = tile.rent ? tile.rent[count - 1] || 25 : 25;
                          }
                          return `Rent: ৳${currentRent}`;
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0 flex-none">
                    {prop.isMortgaged ? (
                      <button
                        onClick={() => {
                          if (onUnmortgageProperty) onUnmortgageProperty(prop.tileIndex);
                          else window.dispatchEvent(new CustomEvent('unmortgage_property', { detail: prop.tileIndex }));
                        }}
                        disabled={self.balance < unmortgageCost}
                        className={`px-2 py-1.5 rounded-lg font-orbitron font-extrabold text-[9px] border tracking-wider transition-all select-none ${
                          self.balance >= unmortgageCost
                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500 cursor-pointer'
                            : 'text-slate-600 border-slate-800 bg-slate-900/50 cursor-not-allowed opacity-50'
                        }`}
                        title={`Unmortgage for ৳${unmortgageCost}`}
                      >
                        UNMTG ({unmortgageCost})
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (onMortgageProperty) onMortgageProperty(prop.tileIndex);
                          else window.dispatchEvent(new CustomEvent('mortgage_property', { detail: prop.tileIndex }));
                        }}
                        disabled={prop.houses > 0}
                        className={`px-2 py-1.5 rounded-lg font-orbitron font-extrabold text-[9px] border tracking-wider transition-all select-none ${
                          prop.houses === 0
                            ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500 cursor-pointer'
                            : 'text-slate-600 border-slate-800 bg-slate-900/50 cursor-not-allowed opacity-50'
                        }`}
                        title={`Mortgage for ৳${mortgageVal}`}
                      >
                        MTG ({mortgageVal})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (prop.houses === 0) {
                          window.dispatchEvent(new CustomEvent('auction_property', { detail: prop.tileIndex }));
                        }
                      }}
                      disabled={prop.houses > 0}
                      className={`px-2 py-1.5 rounded-lg font-orbitron font-extrabold text-[9px] border tracking-wider transition-all select-none ${
                        prop.houses === 0
                          ? 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500 cursor-pointer'
                          : 'text-slate-600 border-slate-800 bg-slate-900/50 cursor-not-allowed opacity-50'
                      }`}
                      title="Auction Property"
                    >
                      AUC
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: SELECT COUNTERPARTY */}
      {activeModal === 'SELECT_COUNTERPARTY' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#131122] border border-[#2D284F] p-6 rounded-2xl flex flex-col gap-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative animate-scale-up">
            <button
              onClick={() => setActiveModal('NONE')}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-[#231F3B] hover:bg-[#2F294F] w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            >
              <XIcon size={12} />
            </button>
            <div className="text-center border-b border-[#241F3C] pb-3">
              <h2 className="text-base font-orbitron font-extrabold tracking-widest text-[#C8B6FF] uppercase">
                Create a trade
              </h2>
            </div>
            <div className="flex flex-col gap-3.5">
              <span className="text-sm font-sans font-bold text-slate-300">
                Select a player to trade with:
              </span>
              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {counterparties.length === 0 ? (
                  <div className="text-center py-7 text-slate-500 font-mono text-xs uppercase tracking-wider">
                    No active players found
                  </div>
                ) : (
                  counterparties.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectCounterparty(p.id)}
                      className="bg-[#241F3C] border border-[#2E284D] rounded-xl py-3.5 px-4 flex items-center gap-3.5 text-white font-extrabold text-sm hover:bg-[#2F294F] active:scale-[0.98] transition-all cursor-pointer w-full text-left shadow-sm hover:border-[#4C3D8B]"
                    >
                      <div
                        style={{ backgroundColor: p.avatar }}
                        className="relative w-6.5 h-6.5 rounded-full shrink-0 border border-white/10 flex items-center justify-center"
                      >
                        {/* Eyes */}
                        <div className="absolute top-1 right-0.5 flex gap-[1px]">
                          <div className="w-[4px] h-[6px] bg-white rounded-full relative">
                            <div className="w-[1.5px] h-[2px] bg-black rounded-full absolute bottom-[0.5px] right-[0.5px]" />
                          </div>
                          <div className="w-[4px] h-[6px] bg-white rounded-full relative">
                            <div className="w-[1.5px] h-[2px] bg-black rounded-full absolute bottom-[0.5px] right-[0.5px]" />
                          </div>
                        </div>
                      </div>
                      <span className="truncate flex-1 text-slate-200">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE TRADE */}
      {activeModal === 'CREATE_TRADE' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#131122] border border-[#2D284F] p-6 rounded-2xl flex flex-col gap-5 shadow-[0_10px_50px_rgba(0,0,0,0.6)] relative animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => setActiveModal('NONE')}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-[#231F3B] hover:bg-[#2F294F] w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            >
              <XIcon size={12} />
            </button>

            {/* Header */}
            <div className="text-center border-b border-[#241F3C] pb-2">
              <h2 className="text-base font-orbitron font-extrabold tracking-widest text-[#C8B6FF] uppercase">
                Create a trade
              </h2>
            </div>

            {/* Split Screen Layout - FULLY OPEN (no nested column card backgrounds/borders) */}
            <div className="grid grid-cols-[1fr_24px_1fr] gap-4 items-stretch select-none">
              {/* LEFT COLUMN: ME (SENDER) - OPEN DESIGN */}
              <div className="p-3 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-[#241F3C] pb-2.5">
                  <div
                    style={{ backgroundColor: self.avatar }}
                    className="relative w-6.5 h-6.5 rounded-full shrink-0 border border-white/10"
                  />
                  <span className="text-sm font-extrabold text-white truncate">{self.name}</span>
                </div>

                {/* Cash slider */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">
                    <span>Give Cash</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={self.balance}
                    value={offerCash}
                    onChange={(e) => setOfferCash(Number(e.target.value))}
                    className="w-full accent-[#7B5BF2] bg-[#241F3C] h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-mono mt-0.5">
                    <span>0</span>
                    <span>৳{self.balance}</span>
                  </div>
                  <div className="flex justify-center mt-2">
                    <span className="bg-[#261E4E] text-[#A78BFA] text-sm font-mono font-extrabold px-4 py-1.5 rounded-full border border-[#4C1D95]/40 shadow-inner">
                      {offerCash} ৳
                    </span>
                  </div>
                </div>

                {/* Properties to trade - OPEN DESIGN (no inner card backgrounds) */}
                <div className="flex flex-col gap-2 flex-1 min-h-[160px]">
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                    Offer properties
                  </span>
                  <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 flex flex-col gap-2 py-1">
                    {myTradableProps.length === 0 ? (
                      <span className="text-xs text-slate-500 font-mono italic p-1 block text-center">No tradable items</span>
                    ) : (
                      myTradableProps.map((p) => {
                        const tile = boardTiles[p.tileIndex];
                        const flag = getTileFlag(tile.name, tile.group);
                        const isSelected = selectedOfferProps.includes(p.tileIndex);
                        return (
                          <div
                            key={p.tileIndex}
                            onClick={() => handleToggleOfferProp(p.tileIndex)}
                            className={`p-2.5 rounded-xl flex items-center justify-between text-sm font-bold cursor-pointer border transition-all ${
                              isSelected
                                ? 'bg-[#5B37E8]/25 border-[#7B5BF2] text-white shadow-[0_0_10px_rgba(123,91,242,0.15)]'
                                : 'bg-[#1E1B2E]/55 border-[#2A2445] text-slate-300 hover:border-[#38315C]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <span>{flag}</span>
                              <span className="truncate">{tile.name}</span>
                            </div>
                            <span className="text-xs font-mono text-[#A78BFA] font-extrabold shrink-0">৳{getPropPrice(p.tileIndex)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* CENTER DIVIDER */}
              <div className="flex items-center justify-center relative">
                <div className="w-[1px] h-full bg-[#241F3C]" />
                <div className="absolute w-6 h-6 rounded-full bg-[#1C1A32] border border-[#2D284F] flex items-center justify-center shadow-lg">
                  <span className="text-[#8B5CF6] text-[10px]">↔</span>
                </div>
              </div>

              {/* RIGHT COLUMN: OPPONENT (RECEIVER) - OPEN DESIGN */}
              <div className="p-3 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-[#241F3C] pb-2.5">
                  <div
                    style={{ backgroundColor: gameState.players[receiverId]?.avatar || '#8BA4F9' }}
                    className="relative w-6.5 h-6.5 rounded-full shrink-0 border border-white/10"
                  />
                  <span className="text-sm font-extrabold text-white truncate">
                    {gameState.players[receiverId]?.name || 'Opponent'}
                  </span>
                </div>

                {/* Cash slider */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">
                    <span>Request Cash</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={gameState.players[receiverId]?.balance || 0}
                    value={requestCash}
                    onChange={(e) => setRequestCash(Number(e.target.value))}
                    className="w-full accent-[#7B5BF2] bg-[#241F3C] h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-mono mt-0.5">
                    <span>0</span>
                    <span>৳{gameState.players[receiverId]?.balance || 0}</span>
                  </div>
                  <div className="flex justify-center mt-2">
                    <span className="bg-[#261E4E] text-[#A78BFA] text-sm font-mono font-extrabold px-4 py-1.5 rounded-full border border-[#4C1D95]/40 shadow-inner">
                      {requestCash} ৳
                    </span>
                  </div>
                </div>

                {/* Properties to trade - OPEN DESIGN (no inner card backgrounds) */}
                <div className="flex flex-col gap-2 flex-1 min-h-[160px]">
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                    Wanted properties
                  </span>
                  <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 flex flex-col gap-2 py-1">
                    {opponentTradableProps.length === 0 ? (
                      <span className="text-xs text-slate-500 font-mono italic p-1 block text-center">No tradable items</span>
                    ) : (
                      opponentTradableProps.map((p) => {
                        const tile = boardTiles[p.tileIndex];
                        const flag = getTileFlag(tile.name, tile.group);
                        const isSelected = selectedRequestProps.includes(p.tileIndex);
                        return (
                          <div
                            key={p.tileIndex}
                            onClick={() => handleToggleRequestProp(p.tileIndex)}
                            className={`p-2.5 rounded-xl flex items-center justify-between text-sm font-bold cursor-pointer border transition-all ${
                              isSelected
                                ? 'bg-[#5B37E8]/25 border-[#7B5BF2] text-white shadow-[0_0_10px_rgba(123,91,242,0.15)]'
                                : 'bg-[#1E1B2E]/55 border-[#2A2445] text-slate-300 hover:border-[#38315C]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <span>{flag}</span>
                              <span className="truncate">{tile.name}</span>
                            </div>
                            <span className="text-xs font-mono text-[#A78BFA] font-extrabold shrink-0">৳{getPropPrice(p.tileIndex)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Expiration Timer (Optional) - Best user-friendly slider UI */}
            <div className="border-t border-[#241F3C] pt-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-orbitron font-extrabold tracking-wider text-slate-300 uppercase">Trade Expiration Timer</span>
                  <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Auto-closes trade proposal when countdown finishes</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTimer}
                    onChange={(e) => setUseTimer(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#241F3C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7B5BF2] peer-checked:after:bg-white"></div>
                </label>
              </div>

              {useTimer && (
                <div className="bg-[#1C1A30]/50 border border-[#2D284F]/60 rounded-2xl p-3.5 flex flex-col gap-2.5 animate-fade-in select-none">
                  <div className="flex justify-between items-center text-xs text-slate-300 font-mono">
                    <span className="uppercase tracking-wide font-bold">Expiration Delay:</span>
                    <span className="text-[#A78BFA] font-extrabold text-sm">{formatTime(timerSeconds)}</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={300}
                    step={15}
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Number(e.target.value))}
                    className="w-full accent-[#7B5BF2] bg-[#241F3C] h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>30s (QUICK)</span>
                    <span>5m (STANDARD)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between items-center border-t border-[#241F3C] pt-3.5 mt-1">
              <button className="text-slate-500 hover:text-slate-300 transition-colors p-2 bg-[#1C1A30]/80 rounded-lg cursor-pointer">
                <MessageIcon size={16} className="stroke-current" />
              </button>
              <button
                onClick={handleSendOffer}
                className="bg-gradient-to-r from-[#7B5BF2] to-[#6F4FF0] hover:from-[#6A47E8] hover:to-[#5E3CCF] text-white flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-orbitron font-extrabold text-xs tracking-widest transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-[0_4px_15px_rgba(111,79,240,0.3)]"
              >
                <SendIcon size={12} className="stroke-white" />
                Send trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW TRADE */}
      {activeModal === 'VIEW_TRADE' && pendingTrade && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#131122] border border-[#2D284F] p-6 rounded-2xl flex flex-col gap-4 shadow-[0_10px_50px_rgba(0,0,0,0.6)] relative animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => setActiveModal('NONE')}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-[#231F3B] hover:bg-[#2F294F] w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            >
              <XIcon size={12} />
            </button>

            {/* Header */}
            <div className="text-center border-b border-[#241F3C] pb-2">
              <h2 className="text-base font-orbitron font-extrabold tracking-widest text-[#C8B6FF] uppercase">
                View trade
              </h2>
            </div>

            {/* Split Screen Layout - FULLY OPEN (no nested card backgrounds/borders) */}
            <div className="grid grid-cols-[1fr_24px_1fr] gap-4 items-stretch select-none">
              {/* LEFT COLUMN: OFFER DETAILS - OPEN DESIGN */}
              <div className="p-3 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-[#241F3C] pb-2.5">
                  <div
                    style={{ backgroundColor: pendingSender?.avatar || '#8BA4F9' }}
                    className="relative w-6.5 h-6.5 rounded-full shrink-0 border border-white/10"
                  />
                  <span className="text-xs font-bold text-white truncate">{pendingSender?.name || 'Sender'}</span>
                </div>

                {/* Cash offer value */}
                <div className="flex flex-col gap-1 w-full text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Offered Cash</span>
                  <div className="flex justify-center my-1.5">
                    <span className="bg-[#2D225C] text-[#A78BFA] text-sm font-mono font-extrabold px-3.5 py-1.5 rounded-full border border-[#4C1D95]/40 shadow-inner">
                      {pendingTrade.offer.offerCash} ৳
                    </span>
                  </div>
                </div>

                {/* Properties offered - OPEN DESIGN */}
                <div className="flex flex-col gap-1.5 flex-1 min-h-[140px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Offered Properties</span>
                  <div className="flex-1 overflow-y-auto max-h-[140px] pr-1 flex flex-col gap-2 py-1">
                    {pendingTrade.offer.offerPropertyIndexes.length === 0 ? (
                      <span className="text-xs text-slate-500 font-mono italic p-2 block text-center">No properties offered</span>
                    ) : (
                      pendingTrade.offer.offerPropertyIndexes.map((idx) => {
                        const flag = getTileFlag(getPropName(idx));
                        return (
                          <div
                            key={idx}
                            className="bg-[#5B37E8]/25 border border-[#7B5BF2] text-white p-2.5 rounded-xl flex items-center justify-between text-sm font-bold shadow-[0_2px_8px_rgba(111,79,240,0.15)]"
                          >
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <span>{flag}</span>
                              <span className="truncate">{getPropName(idx)}</span>
                            </div>
                            <span className="text-xs font-mono text-[#A78BFA] font-extrabold shrink-0">৳{getPropPrice(idx)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* CENTER DIVIDER */}
              <div className="flex items-center justify-center relative">
                <div className="w-[1px] h-full bg-[#241F3C]" />
                <div className="absolute w-6 h-6 rounded-full bg-[#1C1A32] border border-[#2D284F] flex items-center justify-center">
                  <span className="text-[#8B5CF6] text-[10px]">↔</span>
                </div>
              </div>

              {/* RIGHT COLUMN: REQUEST DETAILS - OPEN DESIGN */}
              <div className="p-3 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-[#241F3C] pb-2.5">
                  <div
                    style={{ backgroundColor: pendingReceiver?.avatar || '#8BA4F9' }}
                    className="relative w-6.5 h-6.5 rounded-full shrink-0 border border-white/10"
                  />
                  <span className="text-xs font-bold text-white truncate">{pendingReceiver?.name || 'Receiver'}</span>
                </div>

                {/* Cash request value */}
                <div className="flex flex-col gap-1 w-full text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Requested Cash</span>
                  <div className="flex justify-center my-1.5">
                    <span className="bg-[#2D225C] text-[#A78BFA] text-sm font-mono font-extrabold px-3.5 py-1.5 rounded-full border border-[#4C1D95]/40 shadow-inner">
                      {pendingTrade.offer.requestCash} ৳
                    </span>
                  </div>
                </div>

                {/* Properties requested - OPEN DESIGN */}
                <div className="flex flex-col gap-1.5 flex-1 min-h-[140px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Requested Properties</span>
                  <div className="flex-1 overflow-y-auto max-h-[140px] pr-1 flex flex-col gap-2 py-1">
                    {pendingTrade.offer.requestPropertyIndexes.length === 0 ? (
                      <span className="text-xs text-slate-500 font-mono italic p-2 block text-center">No properties requested</span>
                    ) : (
                      pendingTrade.offer.requestPropertyIndexes.map((idx) => {
                        const flag = getTileFlag(getPropName(idx));
                        return (
                          <div
                            key={idx}
                            className="bg-[#5B37E8]/25 border border-[#7B5BF2] text-white p-2.5 rounded-xl flex items-center justify-between text-sm font-bold shadow-[0_2px_8px_rgba(111,79,240,0.15)]"
                          >
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <span>{flag}</span>
                              <span className="truncate">{getPropName(idx)}</span>
                            </div>
                            <span className="text-xs font-mono text-[#A78BFA] font-extrabold shrink-0">৳{getPropPrice(idx)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown notice on View trade if timer is running */}
            {timeLeft > 0 && (
              <div className="flex justify-center items-center gap-2 bg-red-950/20 border border-red-500/20 px-3.5 py-1.5 rounded-xl text-xs font-mono text-red-400 font-bold animate-pulse mt-1 select-none">
                <ClockIcon size={12} className="stroke-current" />
                <span>EXPIRES IN {formatTime(timeLeft)}</span>
              </div>
            )}

            {/* Action Buttons for viewer */}
            <div className="flex justify-center gap-3.5 border-t border-[#241F3C] pt-4 mt-1">
              {userId === pendingTrade.offer.receiverId ? (
                <>
                  <button
                    onClick={() => {
                      onRespondToTrade(pendingTrade.tradeId, true);
                      setActiveModal('NONE');
                    }}
                    className="bg-[#6F4FF0] hover:bg-[#5C3ED9] text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-md"
                  >
                    <CheckIcon size={12} className="stroke-white" />
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      onRespondToTrade(pendingTrade.tradeId, false);
                      setActiveModal('NONE');
                    }}
                    className="bg-[#4D3E97] hover:bg-[#3E3182] text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-md"
                  >
                    <XIcon size={12} className="stroke-white" />
                    Decline
                  </button>
                  <button
                    onClick={handleNegotiate}
                    className="bg-[#7B5BF2] hover:bg-[#6849E0] text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-md"
                  >
                    <PencilIcon size={12} className="stroke-white" />
                    Negotiate
                  </button>
                </>
              ) : (
                // Sender or Spectator
                <button
                  onClick={() => {
                    // Sender can cancel, spectator can just close
                    if (userId === pendingTrade.offer.senderId) {
                      onRespondToTrade(pendingTrade.tradeId, false);
                    }
                    setActiveModal('NONE');
                  }}
                  className="bg-[#4D3E97] hover:bg-[#3E3182] text-white flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-md"
                >
                  <XIcon size={12} className="stroke-white" />
                  {userId === pendingTrade.offer.senderId ? 'Cancel Proposal' : 'Close'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
