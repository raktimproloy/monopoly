"use client";

import { useState } from 'react';
import { GameState, BoardTile, TradeOfferPayload } from '../../shared/types';
import { RefreshCw, ArrowRightLeft, Check, X } from 'lucide-react';

interface TradePanelProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  pendingTrade: { tradeId: string; offer: TradeOfferPayload } | null;
  onProposeTrade: (offer: Omit<TradeOfferPayload, 'senderId'>) => void;
  onRespondToTrade: (tradeId: string, accept: boolean) => void;
}

export default function TradePanel({
  gameState,
  boardTiles,
  userId,
  pendingTrade,
  onProposeTrade,
  onRespondToTrade
}: TradePanelProps) {
  const self = gameState.players[userId];

  // Active counterparties (active players that are not me)
  const counterparties = Object.values(gameState.players).filter(
    (p) => p.id !== userId && !p.isBankrupt
  );

  const [receiverId, setReceiverId] = useState(counterparties[0]?.id || '');
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [selectedOfferProps, setSelectedOfferProps] = useState<number[]>([]);
  const [selectedRequestProps, setSelectedRequestProps] = useState<number[]>([]);

  if (!self || self.isBankrupt) return null;

  // Properties owned by me (unmortgaged, houses=0 for trade)
  const myTradableProps = Object.values(gameState.properties).filter(
    (p) => p.ownerId === userId && p.houses === 0
  );

  // Properties owned by chosen counterparty
  const counterpartyTradableProps = Object.values(gameState.properties).filter(
    (p) => p.ownerId === receiverId && p.houses === 0
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

  const handleSendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId) return;

    onProposeTrade({
      receiverId,
      offerCash: Number(offerCash),
      requestCash: Number(requestCash),
      offerPropertyIndexes: selectedOfferProps,
      requestPropertyIndexes: selectedRequestProps
    });

    // Reset forms
    setOfferCash(0);
    setRequestCash(0);
    setSelectedOfferProps([]);
    setSelectedRequestProps([]);
  };

  const getPropName = (idx: number) => boardTiles[idx]?.name || `Tile ${idx}`;

  return (
    <div className="w-full p-4 glass-panel flex flex-col gap-4 select-none relative h-full">


      <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2">
        <ArrowRightLeft size={14} className="text-cyber-purple" />
        EXCHANGE MODEM
      </h3>

      <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1">
        {/* Incoming Trade Alert Panel */}
        {pendingTrade && (
          <div className="p-3 bg-cyber-purple/10 border border-cyber-purple/30 rounded-lg shadow-[0_0_15px_rgba(188,19,254,0.1)] animate-pulse-slow">
            <span className="text-[8px] font-orbitron tracking-widest text-cyber-purple uppercase block mb-1">
              INCOMING TRADE TRANSACTION
            </span>
            <div className="text-[10px] font-mono text-slate-300 leading-normal mb-3">
              <span className="text-cyber-purple font-bold">
                {gameState.players[pendingTrade.offer.senderId]?.name || 'Operator'}
              </span>{' '}
              proposes trade:
              <div className="mt-1 pt-1 border-t border-slate-900 flex flex-col gap-0.5 text-slate-400">
                <div>THEY GIVE: ${pendingTrade.offer.offerCash} & properties [{pendingTrade.offer.offerPropertyIndexes.map(getPropName).join(', ') || 'NONE'}]</div>
                <div>THEY WANT: ${pendingTrade.offer.requestCash} & properties [{pendingTrade.offer.requestPropertyIndexes.map(getPropName).join(', ') || 'NONE'}]</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onRespondToTrade(pendingTrade.tradeId, true)}
                className="flex-1 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-orbitron font-extrabold text-[8px] tracking-wider hover:bg-emerald-500/20 hover:border-emerald-500 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check size={10} /> ACCEPT
              </button>
              <button
                onClick={() => onRespondToTrade(pendingTrade.tradeId, false)}
                className="flex-1 py-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-orbitron font-extrabold text-[8px] tracking-wider hover:bg-red-500/20 hover:border-red-500 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <X size={10} /> REJECT
              </button>
            </div>
          </div>
        )}

        {/* Propose new trade offer */}
        {counterparties.length === 0 ? (
          <div className="text-center p-6 bg-slate-950/20 border border-slate-900/40 rounded-lg text-slate-600 font-mono text-[9px] uppercase tracking-wider">
            Waiting for other players to join channel
          </div>
        ) : (
          <form onSubmit={handleSendOffer} className="space-y-4 flex-1 flex flex-col">
            {/* Target Select */}
            <div>
              <label className="block text-[8px] font-orbitron text-slate-500 uppercase tracking-widest mb-1.5">
                COUNTERPARTY NODE
              </label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950/50 border border-slate-900 rounded text-[10px] font-mono text-slate-300 outline-none"
              >
                {counterparties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Cash offer inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-orbitron text-slate-500 uppercase tracking-widest mb-1">
                  OFFER CASH ($)
                </label>
                <input
                  type="number"
                  min={0}
                  max={self.balance}
                  value={offerCash}
                  onChange={(e) => setOfferCash(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2 py-1 bg-slate-950/50 border border-slate-900 rounded text-[10px] font-mono text-slate-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-[8px] font-orbitron text-slate-500 uppercase tracking-widest mb-1">
                  REQUEST CASH ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={requestCash}
                  onChange={(e) => setRequestCash(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2 py-1 bg-slate-950/50 border border-slate-900 rounded text-[10px] font-mono text-slate-300 outline-none"
                />
              </div>
            </div>

            {/* Property selection lists */}
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-[100px]">
              {/* My items list */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-orbitron text-slate-500 uppercase tracking-widest block mb-0.5">
                  OFFER PROPERTIES
                </span>
                <div className="flex-1 overflow-y-auto bg-slate-950/30 border border-slate-900 rounded p-1.5 flex flex-col gap-1">
                  {myTradableProps.length === 0 ? (
                    <span className="text-[8px] text-slate-600 font-mono italic p-1">No items</span>
                  ) : (
                    myTradableProps.map((p) => (
                      <div
                        key={p.tileIndex}
                        onClick={() => handleToggleOfferProp(p.tileIndex)}
                        className={`p-1 text-[8px] font-mono rounded cursor-pointer truncate ${
                          selectedOfferProps.includes(p.tileIndex)
                            ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30'
                            : 'bg-slate-900/40 text-slate-400 border border-transparent hover:border-slate-800'
                        }`}
                      >
                        {getPropName(p.tileIndex)}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Counterparty items list */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-orbitron text-slate-500 uppercase tracking-widest block mb-0.5">
                  WANTED PROPERTIES
                </span>
                <div className="flex-1 overflow-y-auto bg-slate-950/30 border border-slate-900 rounded p-1.5 flex flex-col gap-1">
                  {counterpartyTradableProps.length === 0 ? (
                    <span className="text-[8px] text-slate-600 font-mono italic p-1">No items</span>
                  ) : (
                    counterpartyTradableProps.map((p) => (
                      <div
                        key={p.tileIndex}
                        onClick={() => handleToggleRequestProp(p.tileIndex)}
                        className={`p-1 text-[8px] font-mono rounded cursor-pointer truncate ${
                          selectedRequestProps.includes(p.tileIndex)
                            ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30'
                            : 'bg-slate-900/40 text-slate-400 border border-transparent hover:border-slate-800'
                        }`}
                      >
                        {getPropName(p.tileIndex)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!receiverId}
              className={`w-full py-2.5 rounded font-orbitron font-bold text-[10px] tracking-widest border transition-all ${
                receiverId
                  ? 'text-cyber-purple border-cyber-purple/30 bg-cyber-purple/5 hover:bg-cyber-purple/15 hover:border-cyber-purple active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(188,19,254,0.05)]'
                  : 'text-slate-600 border-slate-900 bg-slate-950/40 cursor-not-allowed opacity-50'
              }`}
            >
              TRANSMIT OFFER
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
