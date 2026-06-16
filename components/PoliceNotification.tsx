import React, { useEffect, useState } from 'react';
import { GameState } from '../../shared/types';
import { ShieldAlert, X } from 'lucide-react';

interface PoliceNotificationProps {
  state: GameState;
  playerId: string;
  forceShow?: boolean;
  onCloseForceShow?: () => void;
}

export default function PoliceNotification({ state, playerId, forceShow, onCloseForceShow }: PoliceNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lastHijackedProperty, setLastHijackedProperty] = useState<number | null>(null);

  const donPower = state.activeDonPower;
  const isVictim = donPower?.originalOwnerId === playerId;

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    
    if (donPower && isVictim && donPower.targetTileIndex !== lastHijackedProperty) {
      setLastHijackedProperty(donPower.targetTileIndex);
      setIsVisible(true);
    } else if (!donPower && isVisible && !forceShow) {
      setIsVisible(false);
    }
  }, [donPower, isVictim, lastHijackedProperty, isVisible, forceShow]);

  if (!isVisible || (!donPower && !forceShow)) return null;

  const displayTile = donPower?.targetTileIndex ?? 12;
  const displayRounds = donPower?.remainingRounds ?? 3;

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="pointer-events-auto bg-[#0A0E17]/95 backdrop-blur-md border border-red-500/30 rounded-xl shadow-[0_10px_40px_rgba(220,38,38,0.15)] overflow-hidden w-[400px] max-w-[90vw] relative">

        {/* Top Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-400 to-red-600" />

        <button
          onClick={() => {
            setIsVisible(false);
            onCloseForceShow?.();
          }}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-6 flex flex-col items-center text-center">
          <div className="bg-red-500/10 p-3 rounded-full mb-3">
            <ShieldAlert size={28} className="text-red-500" />
          </div>

          <h2 className="text-lg font-orbitron font-bold text-white mb-2 tracking-wide uppercase">
            Property Seized
          </h2>

          <p className="text-slate-300 text-[13px] leading-relaxed mb-5 font-mono">
            Tile <span className="text-white font-bold">#{displayTile}</span> has been seized by the Don.
            Rent is redirected for <span className="text-red-400 font-bold">{displayRounds} turns</span>.
          </p>

          <div className="px-3 py-1 bg-red-950/40 text-red-400 border border-red-500/20 rounded text-[9px] font-bold uppercase tracking-widest">
            Under Investigation
          </div>
        </div>
      </div>
    </div>
  );
}
