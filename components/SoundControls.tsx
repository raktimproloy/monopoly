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
    <>
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sound</label>
          <button onClick={handleMuteToggle} className="text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer outline-none">
            {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        </div>
        <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
      </div>
      <div className="flex flex-col gap-1.5 w-full mt-1">
        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Music</label>
        <input type="range" min="0" max="1" step="0.05" value={bgmVolume} onChange={handleBgmVolumeChange} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
        <audio ref={bgmRef} src="/sounds/Background Music.mp3" loop />
      </div>
    </>
  );
}
