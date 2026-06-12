"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Users, Sparkles } from 'lucide-react';

const AVATAR_COLORS = [
  { hex: '#8BA4F9', name: 'SOFT BLUE' },
  { hex: '#D8B4F8', name: 'SOFT PURPLE' },
  { hex: '#F98BA4', name: 'SOFT PINK' },
  { hex: '#A4F98B', name: 'SOFT GREEN' }
];

export default function Lobby() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_COLORS[0].hex);
  
  // Auto-fill a random sector code Room ID by default
  const [roomId, setRoomId] = useState(() => `sector-${Math.floor(100 + Math.random() * 900)}`);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomId.trim()) return;

    // Create a unique player session token / User ID
    let userId = localStorage.getItem('monopoly_user_id');
    if (!userId) {
      userId = `usr_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('monopoly_user_id', userId);
    }

    router.push(
      `/room/${roomId.toLowerCase()}?name=${encodeURIComponent(name)}&uid=${userId}&avatar=${encodeURIComponent(selectedAvatar)}`
    );
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0B0E14] overflow-hidden cyber-grid">
      {/* Decorative solid glow spots with high blur */}
      <div className="absolute top-[20%] left-[15%] w-72 h-72 rounded-full bg-[#8BA4F9]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-72 h-72 rounded-full bg-[#D8B4F8]/5 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md p-8 glass-panel z-10 mx-4">
        {/* Neon accent bars */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
        <div className="absolute bottom-0 right-0 w-24 h-[2px] bg-cyber-purple" />

        <div className="text-center mb-8">
          <h1 className="text-3xl font-orbitron font-extrabold tracking-widest text-white text-shadow-neon-blue uppercase">
            Monopoly
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-mono tracking-widest uppercase">
            Server-Authoritative Strategy Node
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          {/* Callsign Input */}
          <div>
            <label className="block text-[10px] font-orbitron text-slate-400 uppercase tracking-widest mb-2">
              Operator Callsign
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Terminal size={16} />
              </span>
              <input
                type="text"
                required
                maxLength={15}
                placeholder="ENTER PLAYER CALLSIGN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-input text-white placeholder-slate-600 text-sm font-mono tracking-wide"
              />
            </div>
          </div>

          {/* Room ID Input */}
          <div>
            <label className="block text-[10px] font-orbitron text-slate-400 uppercase tracking-widest mb-2">
              Match Sector (Room ID)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Users size={16} />
              </span>
              <input
                type="text"
                required
                placeholder="ENTER ROOM ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-input text-white placeholder-slate-600 text-sm font-mono tracking-wide uppercase"
              />
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-[10px] font-orbitron text-slate-400 uppercase tracking-widest mb-3">
              TACTICAL APP SIGNATURE (AVATAR COLOR)
            </label>
            <div className="flex justify-between items-center gap-3">
              {AVATAR_COLORS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setSelectedAvatar(col.hex)}
                  style={{ borderColor: selectedAvatar === col.hex ? col.hex : 'rgba(255,255,255,0.08)' }}
                  className="flex-1 py-3 rounded-lg border-2 bg-slate-950/40 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.95] cursor-pointer"
                >
                  <div
                    style={{ backgroundColor: col.hex }}
                    className="w-5 h-5 rounded-full border border-white/20"
                  />
                  <span
                    style={{ color: selectedAvatar === col.hex ? col.hex : 'rgb(100, 116, 139)' }}
                    className="text-[7px] font-orbitron font-extrabold tracking-wider leading-none"
                  >
                    {col.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-2 glass-panel-light text-cyber-blue border border-cyber-blue/30 font-orbitron font-bold tracking-widest text-sm hover:bg-cyber-blue/15 hover:border-cyber-blue active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-neon-blue/10 flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            INITIALIZE SESSION
          </button>
        </form>
      </div>
    </div>
  );
}
