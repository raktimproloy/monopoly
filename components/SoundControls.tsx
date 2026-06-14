import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

export default function SoundControls() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    setIsMuted(soundManager.getMute());
    // Since soundManager doesn't expose a getVolume method out of the box, we use the local state which starts at 0.5
  }, []);

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundManager.setMute(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundManager.setGlobalVolume(newVolume);
    
    // Auto-unmute if sliding volume up while muted
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      soundManager.setMute(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
      <button 
        onClick={handleMuteToggle}
        className="text-slate-400 hover:text-cyber-blue transition-colors cursor-pointer outline-none"
      >
        {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <input 
        type="range" 
        min="0" 
        max="1" 
        step="0.05" 
        value={isMuted ? 0 : volume} 
        onChange={handleVolumeChange}
        className="w-16 md:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyber-blue"
      />
    </div>
  );
}
