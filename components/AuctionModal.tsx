"use client";

import React, { useEffect, useState, useRef } from 'react';
import { GameState, BoardTile, Player } from '../../shared/types';
import { Gavel } from 'lucide-react';

interface AuctionModalProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  onPlaceBid: (amount: number) => void;
}

export default function AuctionModal({ gameState, boardTiles, userId, onPlaceBid }: AuctionModalProps) {
  const auction = gameState.activeAuction;
  
  const [timeLeft, setTimeLeft] = useState(0);
  const animationRef = useRef<number>();
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auction) return;

    const updateTimer = () => {
      const remaining = Math.max(0, auction.endTime - Date.now());
      
      // Update text using state (we could throttle this if needed, but it's okay for now)
      setTimeLeft(remaining);
      
      // Update DOM directly for smooth 60fps animation without React re-rendering
      if (progressRef.current) {
        progressRef.current.style.width = `${Math.max(0, (remaining / 6000) * 100)}%`;
      }

      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(updateTimer);
      }
    };

    animationRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [auction?.endTime]);

  if (!auction) return null;

  const tile = boardTiles[auction.propertyIndex];
  if (!tile) return null;

  const highestBidder = auction.highestBidderId ? gameState.players[auction.highestBidderId] : null;
  const progressColor = highestBidder?.avatar || '#4ADE80';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4">
      <div className="w-full max-w-3xl bg-[#13151A] rounded-2xl border border-[#2A2E3B] p-6 shadow-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col items-center justify-center border-b border-white/5 pb-4">
          <span className="text-slate-400 font-orbitron text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
            Auction
          </span>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            {tile.type === 'RAILROAD' && '🚂'}
            {tile.type === 'UTILITY' && '💡'}
            {tile.type === 'STREET' && '🏠'}
            {tile.name}
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left Column: Bidding Info */}
          <div className="flex-1 flex flex-col gap-6 w-full">
            
            {/* Current Bid info */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-slate-400 font-medium">Current bid</span>
              <div className="flex items-center gap-4">
                {highestBidder ? (
                  <div
                    className="w-16 h-16 rounded-full border-[3px] border-[#2A2E3B] shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: highestBidder.avatar }}
                  >
                    <div className="w-8 h-8 rounded bg-black/20" /> {/* Avatar eyes placeholder */}
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full border-[3px] border-[#2A2E3B] bg-slate-800 flex items-center justify-center shadow-lg text-2xl">
                    ?
                  </div>
                )}
                <span className="text-5xl font-black text-white">
                  ৳{auction.currentBid}
                </span>
              </div>
            </div>

            {/* Timer Progress */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span></span>
                <span className="flex items-center gap-1">Sold in {Math.ceil(timeLeft / 1000)}s <Gavel size={12} className="opacity-70" /></span>
              </div>
              <div className="w-full h-3 bg-[#1E212A] rounded-full overflow-hidden">
                <div 
                  ref={progressRef}
                  className="h-full transition-none ease-linear"
                  style={{ 
                    width: '100%',
                    backgroundColor: progressColor,
                    boxShadow: `0 0 10px ${progressColor}`
                  }}
                />
              </div>
            </div>

            {/* Bidding Actions */}
            <div className="flex flex-col gap-2 mt-4">
              <span className="text-sm text-slate-400 font-medium">I'm bidding...</span>
              <div className="grid grid-cols-3 gap-3">
                {[2, 10, 50].map((amount) => {
                  const myBalance = gameState.players[userId]?.balance || 0;
                  const canAfford = myBalance >= auction.currentBid + amount;
                  const isMyProperty = auction.sellerId === userId || auction.initiatorId === userId;
                  
                  return (
                    <button
                      key={amount}
                      disabled={!canAfford || isMyProperty || timeLeft <= 0}
                      onClick={() => onPlaceBid(amount)}
                      className="bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl py-3 flex flex-col items-center justify-center transition-all shadow-lg active:scale-95"
                    >
                      <span className="text-lg font-bold">৳{auction.currentBid + amount}</span>
                      <span className="text-xs font-medium opacity-80">+৳{amount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bid History */}
            <div className="flex flex-col gap-2 mt-4 h-32 overflow-y-auto pr-2 custom-scrollbar mask-image-bottom">
              {[...(auction.bids || [])].reverse().map((bid, idx) => {
                const bidder = gameState.players[bid.playerId];
                const isLatest = idx === 0;
                return (
                  <div key={idx} className={`flex items-center justify-between text-sm ${isLatest ? 'opacity-100 font-bold' : 'opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: bidder?.avatar || '#555' }} />
                      <span className="text-white">{bidder?.name || 'Unknown'}</span>
                    </div>
                    <span className="text-slate-300">bids ৳{bid.amount}</span>
                  </div>
                );
              })}
              {(!auction.bids || auction.bids.length === 0) && (
                <div className="text-sm text-slate-500 italic text-center mt-4">
                  No bids yet. Be the first!
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Property Card UI */}
          <div className="w-full md:w-64 shrink-0 bg-[#1A1D27] rounded-xl border border-white/10 p-5 flex flex-col items-center text-center">
            
            <div className="mb-4 text-4xl">
              {tile.type === 'RAILROAD' ? '🚂' : tile.type === 'UTILITY' ? '💡' : '🏠'}
            </div>
            <h3 className="text-xl font-bold text-white mb-6 uppercase">{tile.name}</h3>
            
            <div className="w-full flex flex-col gap-3 text-sm text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-500">when</span>
                <span className="text-slate-500">get</span>
              </div>
              
              {tile.type === 'STREET' && tile.rent && (
                <>
                  <div className="flex justify-between"><span>Rent</span><span className="font-mono">৳{tile.rent[0]}</span></div>
                  <div className="flex justify-between"><span>1 House</span><span className="font-mono">৳{tile.rent[1]}</span></div>
                  <div className="flex justify-between"><span>2 Houses</span><span className="font-mono">৳{tile.rent[2]}</span></div>
                  <div className="flex justify-between"><span>3 Houses</span><span className="font-mono">৳{tile.rent[3]}</span></div>
                  <div className="flex justify-between"><span>4 Houses</span><span className="font-mono">৳{tile.rent[4]}</span></div>
                  <div className="flex justify-between text-amber-400 mt-1 border-t border-white/5 pt-2"><span>Hotel</span><span className="font-mono">৳{tile.rent[5]}</span></div>
                  
                  <div className="mt-4 flex flex-col gap-1 text-xs text-slate-500">
                    <div className="flex justify-between"><span>House Cost</span><span className="font-mono">৳{tile.houseCost}</span></div>
                    <div className="flex justify-between"><span>Mortgage Value</span><span className="font-mono">৳{tile.mortgageValue}</span></div>
                  </div>
                </>
              )}

              {tile.type === 'RAILROAD' && (
                <>
                  <div className="flex justify-between"><span>1 Railroad owned</span><span className="font-mono">৳25</span></div>
                  <div className="flex justify-between"><span>2 Railroads owned</span><span className="font-mono">৳50</span></div>
                  <div className="flex justify-between"><span>3 Railroads owned</span><span className="font-mono">৳100</span></div>
                  <div className="flex justify-between border-b border-white/5 pb-2"><span>4 Railroads owned</span><span className="font-mono">৳200</span></div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Mortgage Value</span><span className="font-mono">৳{tile.mortgageValue}</span></div>
                </>
              )}

              {tile.type === 'UTILITY' && (
                <>
                  <div className="text-left text-xs mb-2 leading-relaxed">
                    If one Utility is owned, rent is 4x amount shown on dice.
                  </div>
                  <div className="text-left text-xs border-b border-white/5 pb-2 leading-relaxed">
                    If both Utilities are owned, rent is 10x amount shown on dice.
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Mortgage Value</span><span className="font-mono">৳{tile.mortgageValue}</span></div>
                </>
              )}

            </div>

            <div className="mt-8 flex flex-col items-center text-slate-400">
              <span className="text-xs">Base Price</span>
              <span className="text-2xl font-bold text-white">৳{tile.price}</span>
            </div>
            
          </div>

        </div>

      </div>
    </div>
  );
}
