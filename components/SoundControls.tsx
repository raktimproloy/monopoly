import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

export default function SoundControls() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [bgmVolume, setBgmVolume] = useState(0.1);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMuted(soundManager.getMute());
    
    const savedVol = localStorage.getItem('monopoly_volume');
    if (savedVol !== null) {
      const v = parseFloat(savedVol);
      setVolume(v);
      soundManager.setGlobalVolume(v);
    } else {
      soundManager.setGlobalVolume(0.7);
    }

    const savedBgm = localStorage.getItem('monopoly_bgm_volume');
    const initialBgm = savedBgm !== null ? parseFloat(savedBgm) : 0.2;
    setBgmVolume(initialBgm);

    if (bgmRef.current) {
      bgmRef.current.volume = initialBgm;
    }

    const tryPlayBgm = () => {
      if (bgmRef.current && bgmRef.current.paused) {
        bgmRef.current.play().catch(() => {
          // Ignore autoplay restrictions error
        });
      }
      document.removeEventListener('click', tryPlayBgm);
    };

    document.addEventListener('click', tryPlayBgm);
    return () => document.removeEventListener('click', tryPlayBgm);
  }, []);

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundManager.setMute(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundManager.setGlobalVolume(newVolume);
    localStorage.setItem('monopoly_volume', newVolume.toString());
    
    // Auto-unmute if sliding volume up while muted
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      soundManager.setMute(false);
    }
  };

  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setBgmVolume(newVolume);
    localStorage.setItem('monopoly_bgm_volume', newVolume.toString());
    if (bgmRef.current) {
      bgmRef.current.volume = newVolume;
      if (bgmRef.current.paused && newVolume > 0) {
        bgmRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 w-full">
        <button 
          onClick={handleMuteToggle}
          className="text-slate-400 hover:text-cyber-blue transition-colors cursor-pointer outline-none w-4 flex items-center justify-center shrink-0"
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
          className="flex-1 w-16 md:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyber-blue"
        />
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 w-full">
        <span className="text-[12px] w-4 flex items-center justify-center select-none leading-none opacity-80 cursor-help shrink-0" title="Background Music">🎵</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={bgmVolume} 
          onChange={handleBgmVolumeChange}
          className="flex-1 w-16 md:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyber-blue"
        />
        <audio ref={bgmRef} src="/sounds/Background Music.mp3" loop />
      </div>
    </div>
  );
}
