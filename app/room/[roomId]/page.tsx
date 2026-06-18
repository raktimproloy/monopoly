"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import { useGameSounds } from '../../../hooks/useGameSounds';
import Board from '../../../components/Board';
import PlayerList from '../../../components/PlayerList';
import ChatBox from '../../../components/ChatBox';
import PropertyManager from '../../../components/PropertyManager';
import TradePanel from '../../../components/TradePanel';
import CardReveal from '../../../components/CardReveal';
import AuctionModal from '../../../components/AuctionModal';
import SoundControls from '../../../components/SoundControls';
import PowerSection from '../../../components/PowerSection';
import PoliceNotification from '../../../components/PoliceNotification';
import GovernmentBank from '../../../components/GovernmentBank';
import BankModal from '../../../components/BankModal';
import { Wifi, WifiOff, AlertOctagon, RotateCw, Settings, Users, Sparkles, Play, UserX, Flag } from 'lucide-react';
import { Suspense } from 'react';

function GameRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;

  // Retrieve or generate unique client user ID session
  const [userId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const qUid = searchParams.get('uid');
      if (qUid) return qUid;
      let storedUid = localStorage.getItem('monopoly_user_id');
      if (!storedUid) {
        storedUid = `usr_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('monopoly_user_id', storedUid);
      }
      return storedUid;
    }
    return 'usr_guest';
  });

  const playerName = searchParams.get('name');
  const avatar = searchParams.get('avatar');
  const isGuest = !playerName || !avatar;

  const {
    isConnected,
    gameState,
    boardTiles,
    logs,
    pendingTrade,
    errorMessage,
    clearError,
    roomDetails,
    refetchRoomDetails,
    rollDice,
    buyProperty,
    mortgageProperty,
    unmortgageProperty,
    proposeTrade,
    respondToTrade,
    endTurn,
    updateSettings,
    startGame,
    declareBankruptcy,
    payJailFine,
    buildHouse,
    sellHouse,
    sellProperty,
    auctionProperty,
    teleportPlayer,
    devRollDice,
    addBot,
    updateAppearance,
    resolveCard,
    sellPardonCard,
    usePardonCard,
    placeBid,
    devAddFunds,
    devForceCrash,
    devSetNextCrash,
    devForcePolice,
    devSetNextPolice,
    devGivePowerCard,
    devGivePardonCard,
    usePowerCard,
    takeLoan,
    repayLoan
  } = useSocket(roomId, playerName, userId, avatar);

  // Initialize sound manager to listen to game events
  useGameSounds(gameState, logs, userId, pendingTrade);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devShowPoliceNotification, setDevShowPoliceNotification] = useState(false);
  const audioContextInitialized = useRef(false);
  const [guestName, setGuestName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'NONE' | 'BANK'>('NONE');
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  const AVATAR_COLORS = [
    { hex: '#ffffff', name: 'Titanium White' },
    { hex: '#8b5cf6', name: 'Violet Pulse' },
    { hex: '#14b8a6', name: 'Cyber Teal' },
    { hex: '#a3e635', name: 'Radioactive Lime' },
    { hex: '#d946ef', name: 'Fuchsia Flash' },
    { hex: '#94a3b8', name: 'Steel Gray' },
    { hex: '#e0b0ff', name: 'Neon Mauve' },
    { hex: '#00fa9a', name: 'Spring Mint' }
  ];

  // Auto-select first available avatar signature
  useEffect(() => {
    if (isGuest && roomDetails?.players) {
      const takenColors = roomDetails.players.map(p => p.avatar.toLowerCase());
      const available = AVATAR_COLORS.find(col => !takenColors.includes(col.hex.toLowerCase()));
      if (available) {
        setSelectedAvatar(available.hex);
      }
    }
  }, [isGuest, roomDetails]);

  // Synchronize server socket errors with local modal errors if we're a guest
  useEffect(() => {
    if (isGuest && errorMessage) {
      setModalError(errorMessage);
      clearError();
    }
  }, [isGuest, errorMessage, clearError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setModalError('Please enter a player callsign.');
      return;
    }
    // Quick local verification for initial selection (server handles ultimate collisions now)
    let finalAvatar = selectedAvatar || AVATAR_COLORS[0].hex;
    if (roomDetails?.players) {
      const takenColors = roomDetails.players.map(p => p.avatar.toLowerCase());
      if (takenColors.includes(finalAvatar.toLowerCase())) {
        const available = AVATAR_COLORS.find(col => !takenColors.includes(col.hex.toLowerCase()));
        if (available) {
          finalAvatar = available.hex;
        }
      }
    }

    // Update query parameters in URL to trigger join flow
    router.replace(
      `/room/${roomId}?name=${encodeURIComponent(guestName.trim())}&uid=${userId}&avatar=${encodeURIComponent(finalAvatar)}`
    );
  };

  // --- SCREEN 0: GUEST REGISTER MODAL ---
  if (isGuest) {
    const takenColors = roomDetails?.players?.map(p => p.avatar.toLowerCase()) || [];

    return (
      <div className="min-h-screen w-full bg-[#151525] flex flex-col items-center justify-center font-sans cyber-grid z-50 relative">
        <div className="absolute top-[20%] left-[15%] w-72 h-72 rounded-full bg-[#8BA4F9]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[15%] w-72 h-72 rounded-full bg-[#D8B4F8]/5 blur-[120px] pointer-events-none" />

        <div className="relative w-full max-w-md p-8 glass-panel mx-4 border border-cyber-blue/30 shadow-[0_0_30px_rgba(139,164,249,0.05)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
          <div className="absolute bottom-0 right-0 w-24 h-[2px] bg-cyber-purple" />

          <div className="text-center mb-6">
            <h2 className="text-2xl font-orbitron font-extrabold tracking-widest text-white text-shadow-neon-blue uppercase">
              SECTOR GATEWAY
            </h2>
            <p className="text-[10px] text-slate-400 mt-2 font-mono tracking-widest uppercase">
              REGISTER OPERATOR FOR SECTOR: {roomId.toUpperCase()}
            </p>
          </div>

          {modalError && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-500/30 text-red-200 text-xs font-mono rounded-lg flex items-center gap-2">
              <span>{modalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-orbitron text-slate-400 uppercase tracking-widest mb-2">
                Operator Callsign (Name)
              </label>
              <input
                type="text"
                required
                maxLength={15}
                placeholder="ENTER PLAYER CALLSIGN"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setModalError(null);
                }}
                className="w-full px-4 py-3 glass-input text-white placeholder-slate-600 text-sm font-mono tracking-wide"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-2 glass-panel-light text-cyber-blue border border-cyber-blue/30 font-orbitron font-bold tracking-widest text-sm hover:bg-cyber-blue/15 hover:border-cyber-blue active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-neon-blue/10 flex items-center justify-center gap-2"
            >
              INITIALIZE SESSION
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading indicator while connecting
  if (!gameState || boardTiles.length === 0) {
    return (
      <div className="min-h-screen w-full bg-[#151525] flex flex-col items-center justify-center font-sans cyber-grid animate-pulse-slow">
        <div className="glass-panel p-8 max-w-sm w-full text-center relative border border-cyber-blue/30 shadow-[0_0_20px_rgba(139,164,249,0.05)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
          {errorMessage ? (
            <AlertOctagon className="w-10 h-10 text-red-500 mx-auto mb-4" />
          ) : (
            <RotateCw className="w-10 h-10 text-cyber-blue animate-spin mx-auto mb-4" />
          )}
          <h2 className="text-sm font-orbitron font-extrabold tracking-widest text-white uppercase">
            {errorMessage ? "কানেকশন বাতিল" : "নেটওয়ার্ক কানেক্ট হচ্ছে"}
          </h2>
          {errorMessage && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="p-3 bg-red-950/80 border border-red-500/30 text-red-200 text-xs font-mono rounded text-left">
                {errorMessage}
              </div>
              <button
                onClick={() => {
                  clearError();
                  router.replace(`/room/${roomId}`);
                }}
                className="w-full py-3 glass-panel-light text-cyber-blue border border-cyber-blue/30 font-orbitron font-bold tracking-widest text-xs hover:bg-cyber-blue/15 hover:border-cyber-blue active:scale-[0.98] transition-all cursor-pointer"
              >
                লবিতে ফিরে যান
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- SCREEN 1: WAITING ROOM LOBBY (gameStatus === 'LOBBY') ---
  if (gameState.gameStatus === 'LOBBY') {
    const players = Object.values(gameState.players);
    const settings = gameState.settings;
    const isHost = gameState.playerOrder[0] === userId;

    const handleSettingChange = (key: string, value: string | number | boolean) => {
      const updatedSettings = {
        ...settings,
        [key]: value
      };
      updateSettings(updatedSettings);
    };

    return (
      <main className="relative w-screen h-screen bg-[#151525] overflow-hidden flex flex-col cyber-grid text-slate-200">
        {/* Glow spots */}
        <div className="absolute top-[20%] left-[20%] w-96 h-96 rounded-full bg-cyber-blue/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 rounded-full bg-cyber-purple/5 blur-[150px] pointer-events-none" />

        {/* Header */}
        <header className="w-full h-12 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md px-6 flex justify-between items-center z-20 select-none">
          <div className="flex items-center gap-4">
            <h1 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase">
              STRATEGY INTERFACE
            </h1>
            <div className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono text-slate-400">
              LOBBY SECTOR: {roomId.toUpperCase()}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono">
            {isConnected ? (
              <>
                <Wifi size={10} className="text-emerald-400" />
                <span className="text-emerald-400 uppercase">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff size={10} className="text-red-400" />
                <span className="text-red-400 uppercase">OFFLINE</span>
              </>
            )}
          </div>
          <div className="ml-4 hidden md:block">
            <SoundControls />
          </div>
        </header>

        {/* Main Content Layout */}
        <div className="flex-1 w-full p-6 flex gap-6 overflow-hidden min-h-0 z-10 relative">

          {/* LEFT: Connected Players Slots */}
          <section className="w-80 shrink-0 flex flex-col gap-4 h-full glass-panel p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                <Users size={14} className="text-cyber-purple" />
                CONNECTED NODES ({players.length})
              </h3>
              {isHost && (
                <button
                  onClick={addBot}
                  className="px-2 py-1 bg-[#19162A]/80 border border-cyber-purple/50 text-cyber-purple hover:text-white hover:bg-cyber-purple/30 rounded text-[9px] font-orbitron font-bold tracking-wider transition-all"
                >
                  + ADD BOT
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
              {players.map((p) => {
                const isMe = p.id === userId;
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-950/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: p.avatar, boxShadow: `0 0 10px ${p.avatar}` }}
                        className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                      />
                      <span className="text-xs font-semibold text-white">
                        {p.name} {isMe && <span className="text-[8px] text-cyber-blue font-mono">(YOU)</span>}
                      </span>
                    </div>
                    {isMe ? (
                      <button
                        onClick={() => setShowAppearanceModal(true)}
                        className="text-[8px] font-mono text-cyber-blue bg-cyber-blue/10 border border-cyber-blue/20 hover:bg-cyber-blue/20 hover:border-cyber-blue/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider cursor-pointer transition-all"
                      >
                        APPEARANCE
                      </button>
                    ) : (
                      <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        READY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* CENTER: Custom Settings Configuration Modem */}
          <section className="flex-1 glass-panel p-6 flex flex-col justify-between relative">

            <div>
              <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-6">
                <Settings size={14} className="text-cyber-blue" />
                TACTICAL RULES CONFIGURATION
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Starting cash selection */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex flex-col gap-2">
                  <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                    শুরুর টাকা
                  </label>
                  <select
                    value={settings.startingCash}
                    onChange={(e) => handleSettingChange('startingCash', Number(e.target.value))}
                    disabled={!isHost}
                    className={`w-full mt-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-200 outline-none ${isHost ? 'cursor-pointer focus:border-cyber-blue' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    <option value={1000}>৳১,০০০ (দ্রুত খেলা)</option>
                    <option value={1500}>৳১,৫০০ (সাধারণ মনোপলি)</option>
                    <option value={2000}>৳২,০০০ (বড় খেলা)</option>
                    <option value={2500}>৳২,৫০০ (ঝুঁকিপূর্ণ খেলা)</option>
                  </select>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-normal">
                    সব খেলোয়াড়ের জন্য শুরুর টাকা।
                  </span>
                </div>

                {/* Double Rent Switch */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                      একই রঙের জায়গায় ডাবল ভাড়া
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      খেলোয়াড় যদি একই রঙের সব জায়গা কিনে নেয়, তবে সেগুলোতে দ্বিগুণ ভাড়া পাবে।
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.doubleRentOnCompleteSet}
                    disabled={!isHost}
                    onChange={(e) => handleSettingChange('doubleRentOnCompleteSet', e.target.checked)}
                    className={`w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 mt-1 ${isHost ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>

                {/* Free Parking Switch */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                      ফ্রি পার্কিং মানি পুল
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      সকল জরিমানা এক জায়গায় জমা হবে এবং যে ফ্রি পার্কিংয়ে যাবে সে সব টাকা পাবে।
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.freeParkingCashPool}
                    disabled={!isHost}
                    onChange={(e) => handleSettingChange('freeParkingCashPool', e.target.checked)}
                    className={`w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 mt-1 ${isHost ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>

                {/* Unpurchased Property Auction Switch */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                      জায়গা নিলাম
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      যদি কেউ জায়গা না কিনে, তবে সেটি নিলামে উঠবে।
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowUnpurchasedAuction}
                    disabled={!isHost}
                    onChange={(e) => handleSettingChange('allowUnpurchasedAuction', e.target.checked)}
                    className={`w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 mt-1 ${isHost ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>

                {/* Property Mortgage Switch */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                      জায়গা বন্ধক
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      জরুরি টাকার প্রয়োজনে খেলোয়াড়রা জায়গা বন্ধক রাখতে পারবে।
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowMortgage}
                    disabled={!isHost}
                    onChange={(e) => handleSettingChange('allowMortgage', e.target.checked)}
                    className={`w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 mt-1 ${isHost ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>

                {/* Jail Loss Switch */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                      জেলে সব বন্ধ
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      চালু থাকলে, জেলে থাকা খেলোয়াড়রা ভাড়া, ট্রেড, নিলাম বা বাড়ি বানানো কিছুই করতে পারবে না।
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!settings.jailLoss}
                    disabled={!isHost}
                    onChange={(e) => handleSettingChange('jailLoss', e.target.checked)}
                    className={`w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 mt-1 ${isHost ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>

                {/* Traffic Police Switch */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                      ট্রাফিক পুলিশ
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      চালু থাকলে, নির্দিষ্ট সময় পর পর ট্রাফিক পুলিশ এসে জরিমানা বা জেলে পাঠাতে পারে।
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!settings.enableTrafficPolice}
                    disabled={!isHost}
                    onChange={(e) => handleSettingChange('enableTrafficPolice', e.target.checked)}
                    className={`w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 mt-1 ${isHost ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>
              </div>
            </div>

            {/* Start MATCH buttons */}
            <div className="flex flex-col items-center justify-center gap-3 mt-8">
              {isHost ? (
                <>
                  <button
                    onClick={startGame}
                    className="w-full max-w-[280px] py-4 glass-panel-light text-cyber-blue border border-cyber-blue/30 font-orbitron font-bold tracking-widest text-sm hover:bg-cyber-blue/15 hover:border-cyber-blue active:scale-[0.98] transition-all cursor-pointer shadow-neon-blue/10 flex items-center justify-center gap-2"
                  >
                    <Play size={14} className="fill-cyber-blue" />
                    খেলা শুরু করুন
                  </button>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest animate-pulse mt-1">
                    {players.length < 2 ? 'কমপক্ষে ২ জন খেলোয়াড় লাগবে' : 'হোস্টের জন্য অপেক্ষা করা হচ্ছে'}
                  </span>
                </>
              ) : (
                <div className="w-full max-w-[280px] py-4 glass-panel-light text-slate-500 border border-slate-800/50 font-orbitron font-bold tracking-widest text-sm flex items-center justify-center gap-2 bg-slate-900/20 select-none">
                  হোস্ট খেলা শুরু করবে...
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Tactical Telemetry Logs */}
          <section className="w-80 shrink-0 h-full min-w-0">
            <ChatBox logs={logs} />
          </section>
        </div>

        {/* Appearance Modal */}
        {showAppearanceModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm p-6 glass-panel border border-cyber-blue/30 shadow-[0_0_30px_rgba(139,164,249,0.1)] bg-[#151525]/95">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
              <button
                onClick={() => setShowAppearanceModal(false)}
                className="absolute top-3 right-3 text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>

              <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-white uppercase text-center mb-6">
                রঙ পরিবর্তন করুন
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {AVATAR_COLORS.map((col) => {
                  const takenColors = gameState.players ? Object.values(gameState.players).map((p: any) => p.avatar.toLowerCase()) : [];
                  const isTaken = takenColors.includes(col.hex.toLowerCase()) && col.hex.toLowerCase() !== gameState.players[userId]?.avatar?.toLowerCase();
                  const isSelected = gameState.players[userId]?.avatar === col.hex;

                  return (
                    <button
                      key={col.hex}
                      disabled={isTaken}
                      onClick={() => {
                        if (!isTaken && !isSelected) {
                          updateAppearance(col.hex);
                          setShowAppearanceModal(false);
                        }
                      }}
                      style={{
                        borderColor: isSelected
                          ? col.hex
                          : isTaken
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(255, 255, 255, 0.08)'
                      }}
                      className={`py-3 rounded-lg border-2 bg-slate-950/40 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${isTaken
                        ? 'opacity-40 cursor-not-allowed border-red-950'
                        : isSelected
                          ? 'cursor-default'
                          : 'cursor-pointer hover:border-slate-700 active:scale-[0.95]'
                        }`}
                    >
                      <div
                        style={{ backgroundColor: col.hex }}
                        className="w-5 h-5 rounded-full border border-white/20"
                      />
                      <span
                        style={{
                          color: isSelected
                            ? col.hex
                            : isTaken
                              ? '#ef4444'
                              : 'rgb(100, 116, 139)'
                        }}
                        className="text-[7px] font-orbitron font-extrabold tracking-wider leading-none mt-1"
                      >
                        {isTaken ? 'TAKEN' : isSelected ? 'CURRENT' : col.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // --- SCREEN 2: ACTIVE STRATEGY GAMEPLAY (gameStatus === 'ACTIVE') ---
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-[#151525] overflow-hidden cyber-grid text-slate-200">
      <div className="absolute top-[10%] left-[25%] w-96 h-96 rounded-full bg-cyber-blue/5 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[25%] w-96 h-96 rounded-full bg-cyber-purple/5 blur-[160px] pointer-events-none" />



      {/* Alert Banner for Validation Errors */}
      {errorMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
          <div className="p-3 bg-red-950/85 border border-red-500/30 backdrop-blur-md text-red-200 text-xs font-mono rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.2)] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertOctagon size={14} className="text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearError}
                className="text-[9px] font-orbitron font-bold text-red-400 hover:text-red-300 ml-2 animate-pulse"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Reveal Overlay */}
      {gameState?.turnStatus === 'MUST_RESOLVE_CARD' && (
        <CardReveal
          gameState={gameState}
          userId={userId}
          onResolve={resolveCard}
          onSellPardon={sellPardonCard}
        />
      )}

      {/* Auction Modal Overlay */}
      {gameState?.activeAuction && (
        <AuctionModal
          gameState={gameState}
          boardTiles={boardTiles}
          userId={userId}
          onPlaceBid={placeBid}
        />
      )}

      {/* Police Notification Overlay */}
      {(gameState?.activeDonPower || devShowPoliceNotification) && (
        <PoliceNotification 
          state={gameState!} 
          playerId={userId} 
          forceShow={devShowPoliceNotification}
          onCloseForceShow={() => setDevShowPoliceNotification(false)}
        />
      )}

      {/* Bank Modal Overlay */}
      {activeModal === 'BANK' && (
        <BankModal
          onClose={() => setActiveModal('NONE')}
          onTakeLoan={takeLoan}
        />
      )}

      {/* Main UI Layout (Board-priority 3-column system) */}
      <div className="flex-1 w-full px-4 overflow-x-hidden overflow-y-auto xl:overflow-hidden flex flex-col xl:flex-row items-center justify-between gap-4 min-h-0 relative z-10">

        {/* COLUMN 2: CENTER BOARD AREA (Primary strategy canvas — highest priority) */}
        {/* CRITICAL: xl:flex-1 AND min-w-0 prevent Flexbox squeeze lock so the board can shrink when sidebar expands on desktop. shrink-0 on mobile prevents height collapse. */}
        <section className="order-1 xl:order-2 flex-1 h-full flex items-center justify-center min-w-0 z-10 relative w-full">
          <Board
            gameState={gameState}
            boardTiles={boardTiles}
            userId={userId}
            logs={logs}
            onRollDice={rollDice}
            onEndTurn={endTurn}
            onPayJailFine={payJailFine}
            onUsePardonCard={usePardonCard}
            onBuyProperty={buyProperty}
            onTileClick={(idx) => {
              // Can hook custom tile inspect actions here
            }}
            onMortgageProperty={mortgageProperty}
            onUnmortgageProperty={unmortgageProperty}
            onBuildHouse={buildHouse}
            onSellHouse={sellHouse}
            onSellProperty={sellProperty}
            onAuctionProperty={auctionProperty}
            onTeleportPlayer={teleportPlayer}
            onDevRollDice={devRollDice}
            onDevAddFunds={devAddFunds}
            onDevForceCrash={devForceCrash}
            onDevSetNextCrash={devSetNextCrash}
            onDevForcePolice={devForcePolice}
            onDevSetNextPolice={devSetNextPolice}
            onDevGivePowerCard={devGivePowerCard}
            onDevGivePardonCard={devGivePardonCard}
            onDevTestPoliceNotification={() => setDevShowPoliceNotification(true)}
          />
        </section>

        {/* 1. LEFT COLUMN */}
        <div className="w-[380px] xl:w-[420px] shrink-0 flex flex-col justify-start gap-4 z-40 overflow-hidden h-screen pt-4 pb-4 pl-4 self-start">
          
          {/* TOP: Govt Bank (Cannot shrink) */}
          <div className="shrink-0 w-full">
            <GovernmentBank 
              gameState={gameState} 
              playerId={userId} 
              onOpenBankModal={() => setActiveModal('BANK')} 
              repayLoan={repayLoan} 
            />
          </div>
          
          {/* MIDDLE: Power Cards (Cannot shrink) */}
          <div className="shrink-0 w-full min-w-0 max-w-full">
            <PowerSection 
              state={gameState} 
              boardTiles={boardTiles} 
              playerId={userId} 
              onUsePowerCard={usePowerCard} 
              onUsePardonCard={usePardonCard} 
            />
          </div>

          {/* BOTTOM: Telemetry (flex-1 forces it to stretch and fill all remaining space below the cards) */}
          <div className="flex-1 min-h-0 w-full">
            <ChatBox logs={logs} />
          </div>

        </div>

        {/* 3. RIGHT AREA WRAPPER */}
        <div className="order-3 xl:order-3 flex flex-row items-start gap-3 h-screen pt-4 pb-4 pr-4 self-start z-40">

          {/* MAIN PANELS COLUMN (Strict Uniform Width) */}
          <div className="w-[320px] xl:w-[360px] flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-2 pb-10">

            {/* SOUND CONTROLS & TOP ACTION BUTTONS ROW */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <SoundControls />
              </div>
              
              <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  // Future Votekick placeholder
                }}
                className="bg-[#19162A]/60 border border-[#2D284B] hover:bg-[#241F3C] text-slate-400 hover:text-slate-300 font-sans text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <UserX size={12} className="stroke-current" />
                কিক করুন
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to declare bankruptcy? You will surrender all assets and exit the game.")) {
                    declareBankruptcy();
                  }
                }}
                disabled={gameState.gameStatus !== 'ACTIVE' || gameState.currentTurnPlayerId !== userId || gameState.players[userId]?.isBankrupt}
                className={`font-sans text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] shadow-md ${(gameState.gameStatus === 'ACTIVE' && gameState.currentTurnPlayerId === userId && !gameState.players[userId]?.isBankrupt)
                  ? 'bg-[#E55C5C] hover:bg-[#D44B4B] text-white shadow-[#E55C5C]/15 cursor-pointer'
                  : 'bg-[#252136] text-slate-600 border border-[#2D284B] cursor-not-allowed opacity-50 shadow-none'
                  }`}
              >
                <Flag size={12} className="fill-current stroke-current" />
                দেউলিয়া
              </button>
            </div>
            </div>

            {/* KHELOAR TALIKA (Player List) */}
            <div className="w-full">
              <PlayerList
                gameState={gameState}
                boardTiles={boardTiles}
                userId={userId}
              />
            </div>

            {/* TRADE SECTION */}
            <div className="w-full">
              <TradePanel
                gameState={gameState}
                boardTiles={boardTiles}
                userId={userId}
                pendingTrade={pendingTrade}
                onProposeTrade={proposeTrade}
                onRespondToTrade={respondToTrade}
              />
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

export default function GameRoom() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-[#151525] flex flex-col items-center justify-center font-sans cyber-grid animate-pulse-slow">
        <div className="glass-panel p-8 max-w-sm w-full text-center relative border border-cyber-blue/30 shadow-[0_0_20px_rgba(139,164,249,0.05)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
          <RotateCw className="w-10 h-10 text-cyber-blue animate-spin mx-auto mb-4" />
          <h2 className="text-sm font-orbitron font-extrabold tracking-widest text-white uppercase">
            নেটওয়ার্ক কানেক্ট হচ্ছে
          </h2>
        </div>
      </div>
    }>
      <GameRoomContent />
    </Suspense>
  );
}
