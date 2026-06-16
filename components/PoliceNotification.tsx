import React, { useEffect, useState } from 'react';
import { GameState } from '../../shared/types';
import { Siren, Clock, CalendarDays, X } from 'lucide-react';

interface PoliceNotificationProps {
  state: GameState;
  playerId: string;
}

export default function PoliceNotification({ state, playerId }: PoliceNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lastHijackedProperty, setLastHijackedProperty] = useState<number | null>(null);

  const donPower = state.activeDonPower;

  // We only want to show this to the victim (the original owner)
  const isVictim = donPower?.originalOwnerId === playerId;

  useEffect(() => {
    if (donPower && isVictim && donPower.targetTileIndex !== lastHijackedProperty) {
      // New hijack detected
      setLastHijackedProperty(donPower.targetTileIndex);
      setIsVisible(true);
    } else if (!donPower && isVisible) {
      setIsVisible(false);
    }
  }, [donPower, isVictim, lastHijackedProperty, isVisible]);

  if (!isVisible || !donPower) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Note: we can't easily get the actual property name without the board tiles array,
  // so we'll just say "Your Property". Or pass board in props if needed, but this is fine.
  
  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 fade-in duration-500">
      <div className="bg-[#111827] border-2 border-red-600 rounded-lg shadow-[0_0_40px_rgba(220,38,38,0.4)] overflow-hidden w-[600px] max-w-[90vw] flex flex-col relative">
        {/* Police Tape Header */}
        <div className="h-4 w-full bg-yellow-400 repeating-linear-gradient-45 flex items-center overflow-hidden">
           <div className="flex w-full animate-[slide_10s_linear_infinite] whitespace-nowrap">
             <span className="text-[10px] font-black text-black px-4">POLICE LINE DO NOT CROSS</span>
             <span className="text-[10px] font-black text-black px-4">POLICE LINE DO NOT CROSS</span>
             <span className="text-[10px] font-black text-black px-4">POLICE LINE DO NOT CROSS</span>
             <span className="text-[10px] font-black text-black px-4">POLICE LINE DO NOT CROSS</span>
           </div>
        </div>

        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-6 right-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full p-1 transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="flex items-stretch">
          {/* Left Icon Area */}
          <div className="w-24 bg-red-950/50 flex flex-col items-center justify-center border-r border-red-900/30 p-4">
            <div className="bg-red-600/20 p-3 rounded-full animate-pulse">
              <Siren className="text-red-500" size={32} />
            </div>
            <div className="mt-2 text-[10px] font-bold text-red-400 tracking-widest">NOTICE</div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-5">
            <h2 className="text-xl font-black text-white mb-1 tracking-wide uppercase">Property Hijacked!</h2>
            
            <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-4 bg-slate-800/50 py-1.5 px-3 rounded inline-flex">
              <div className="flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-500"/> {dateStr}</div>
              <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
              <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-500"/> {timeStr}</div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-red-400">Attention:</strong> Your property at <strong className="text-white">Tile #{donPower.targetTileIndex}</strong> has been illegally seized by the Don. All rent collection will be redirected to the Don for the next <strong className="text-white">{donPower.remainingRounds} turns</strong>.
            </p>
            
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
              <p className="text-xs text-slate-500 italic">
                The Monopoly Police Department is working to recover it.
              </p>
              <div className="px-2 py-1 bg-red-950 text-red-500 text-[10px] font-bold uppercase rounded border border-red-900/50">
                ACTIVE INVESTIGATION
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for repeating linear gradient and slide */}
      <style dangerouslySetInnerHTML={{__html: `
        .repeating-linear-gradient-45 {
          background-image: repeating-linear-gradient(45deg, #facc15, #facc15 10px, #000 10px, #000 20px);
        }
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
