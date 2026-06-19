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
import KickVoteModal from '../../../components/KickVoteModal';
import GameOverOverlay from '../../../components/GameOverOverlay';
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
    telemetryEntries,
    pendingTrades,
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
    repayLoan,
    castKickVote,
    restartGame,
    kickPlayerFromLobby
  } = useSocket(roomId, playerName, userId, avatar);

  // Initialize sound manager to listen to game events
  useGameSounds(gameState, logs, userId, pendingTrades, boardTiles);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devShowPoliceNotification, setDevShowPoliceNotification] = useState(false);
  const audioContextInitialized = useRef(false);
  const [guestName, setGuestName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'NONE' | 'BANK' | 'KICK'>('NONE');
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'board' | 'bank' | 'logs' | 'players' | 'properties'>('board');
  const [mobileLobbyTab, setMobileLobbyTab] = useState<'nodes' | 'rules' | 'logs'>('rules');

  const AVATAR_COLORS = [
    { hex: '#ffffff', name: 'Titanium White' },
    { hex: '#94a3b8', name: 'Steel Gray' },
    { hex: '#d946ef', name: 'Neon Fuchsia' },
    { hex: '#14b8a6', name: 'Cyber Teal' },
    { hex: '#8b5cf6', name: 'Violet Pulse' },
    { hex: '#f43f5e', name: 'Crimson Rose' },
    { hex: '#6366f1', name: 'Indigo Spark' },
    { hex: '#10b981', name: 'Emerald Glow' }
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

  // Change this function to look exactly like this:
  const handleSubmit = () => {
    if (!guestName.trim()) {
      setModalError('Please enter a player callsign.');
      return;
    }

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

    // Swapped .replace to .push to ensure Next.js safely transitions the route
    router.push(
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

          {/* We replaced <form> with a <div> so Chrome cannot refresh the page */}
          <div className="space-y-6">
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
              type="button" // <-- Changed from "submit" to "button"
              onClick={handleSubmit} // <-- Added onClick event
              className="w-full py-4 mt-2 glass-panel-light text-cyber-blue border border-cyber-blue/30 font-orbitron font-bold tracking-widest text-sm hover:bg-cyber-blue/15 hover:border-cyber-blue active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-neon-blue/10 flex items-center justify-center gap-2"
            >
              INITIALIZE SESSION
            </button>
          </div>
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
        </header>

        {/* Main Content Layout */}
        <div className="flex-1 w-full p-4 md:p-6 flex flex-col min-h-0 z-10 relative">
          <div className="flex flex-col lg:flex-row w-full gap-4 lg:gap-6 h-full">

            {/* =========================================
                MOBILE TAB NAVIGATION (Hidden on Desktop)
                ========================================= */}
            <div className="lg:hidden w-full flex gap-2 shrink-0 bg-[#0B0E14]/80 p-1.5 rounded-xl border border-indigo-500/20 backdrop-blur-md">
              <button
                onClick={() => setMobileLobbyTab('nodes')}
                className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${mobileLobbyTab === 'nodes' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'text-indigo-300 hover:bg-indigo-900/40'}`}
              >
                NODES
              </button>
              <button
                onClick={() => setMobileLobbyTab('rules')}
                className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${mobileLobbyTab === 'rules' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'text-indigo-300 hover:bg-indigo-900/40'}`}
              >
                RULES
              </button>
              <button
                onClick={() => setMobileLobbyTab('logs')}
                className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${mobileLobbyTab === 'logs' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'text-indigo-300 hover:bg-indigo-900/40'}`}
              >
                LOGS
              </button>
            </div>

            {/* =========================================
                COLUMN 1: CONNECTED NODES
                ========================================= */}
            <div className={`w-full lg:w-[320px] h-full flex-col ${mobileLobbyTab === 'nodes' ? 'flex' : 'hidden lg:flex'}`}>
              {/* ---> INSERT EXISTING CONNECTED NODES COMPONENT/HTML HERE <--- */}
              <section className="w-full shrink-0 flex flex-col gap-4 h-full glass-panel p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                    <Users size={14} className="text-cyber-purple" />
                    Player Names ({players.length})
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
                        ) : isHost ? (
                          <button
                            onClick={() => {
                              kickPlayerFromLobby(p.id);
                            }}
                            className="text-[8px] font-mono text-red-400 bg-red-950/70 border border-red-500/30 hover:bg-red-900/70 hover:text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider cursor-pointer transition-all"
                          >
                            KICK
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

                {/* Room ID Copy Section */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-2 shrink-0">
                  <span className="text-[10px] font-orbitron text-slate-400 uppercase tracking-widest font-bold">
                    ROOM ID
                  </span>
                  <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 rounded-lg p-2 font-mono text-xs text-white justify-between">
                    <span className="select-all tracking-wider">{roomId.toUpperCase()}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        alert("Room ID copied to clipboard!");
                      }}
                      className="px-2 py-1 bg-cyber-blue/10 border border-cyber-blue/20 hover:bg-cyber-blue/20 hover:border-cyber-blue/40 text-cyber-blue hover:text-white rounded text-[8px] font-bold tracking-widest uppercase transition-all cursor-pointer"
                    >
                      COPY
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* =========================================
                COLUMN 2: TACTICAL RULES
                ========================================= */}
            <div className={`w-full flex-1 h-full flex-col overflow-y-auto ${mobileLobbyTab === 'rules' ? 'flex' : 'hidden lg:flex'}`}>
              {/* ---> INSERT EXISTING TACTICAL RULES COMPONENT/HTML HERE <--- */}
              <section className="w-full flex-1 glass-panel p-6 flex flex-col justify-between relative">
                <div>
                  <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-white uppercase flex items-center gap-2 mb-6">
                    <Settings size={14} className="text-cyber-blue" />
                    Games Rules Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Starting Cash */}
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex flex-col gap-2">
                      <label className="text-[10px] font-orbitron text-white tracking-wider uppercase font-bold">
                        প্রারম্ভিক টাকা (STARTING CASH)
                      </label>
                      <select
                        value={settings.startingCash}
                        disabled={!isHost}
                        onChange={(e) => handleSettingChange('startingCash', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white outline-none focus:border-cyber-blue ${isHost ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                      >
                        <option value={500}>৳৫০০</option>
                        <option value={1000}>৳১,০০০</option>
                        <option value={1500}>৳১,৫০০</option>
                        <option value={2000}>৳২,০০০</option>
                      </select>
                      <span className="text-[8px] font-mono text-white uppercase tracking-wide leading-normal">
                        গেমের শুরুতে প্রতিটি খেলোয়াড় কত টাকা পাবে।
                      </span>
                    </div>

                    {/* Free Parking Switch */}
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-orbitron text-white tracking-wider uppercase font-bold">
                          ফ্রি পার্কিং ক্যাশ পুল
                        </label>
                        <span className="text-[8px] font-mono text-white uppercase tracking-wide leading-relaxed">
                          আয়কর এবং জরিমানা ফ্রি পার্কিং ঘরে জমা হবে এবং যে ঐ ঘরে ল্যান্ড করবে সে পাবে।
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSettingChange('freeParkingCashPool', !settings.freeParkingCashPool)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.freeParkingCashPool ? 'bg-cyber-blue shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'
                          } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.freeParkingCashPool ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Allow Unpurchased Auction */}
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-orbitron text-white tracking-wider uppercase font-bold">
                          নিলামে বিক্রি (AUCTION)
                        </label>
                        <span className="text-[8px] font-mono text-white uppercase tracking-wide leading-relaxed">
                          কোনো খেলোয়াড় ল্যান্ড করা প্রোপার্টি কিনতে না চাইলে তা সরাসরি নিলামে উঠবে।
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSettingChange('allowUnpurchasedAuction', !settings.allowUnpurchasedAuction)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.allowUnpurchasedAuction ? 'bg-cyber-blue shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'
                          } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.allowUnpurchasedAuction ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Allow Mortgage */}
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-orbitron text-white tracking-wider uppercase font-bold">
                          মর্টগেজ সুবিধা (MORTGAGE)
                        </label>
                        <span className="text-[8px] font-mono text-white uppercase tracking-wide leading-relaxed">
                          প্রোপার্টি বন্ধক রেখে ব্যাংক থেকে ঋণ নেওয়ার সুযোগ।
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSettingChange('allowMortgage', !settings.allowMortgage)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.allowMortgage ? 'bg-cyber-blue shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'
                          } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.allowMortgage ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Jail Loss Switch */}
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-orbitron text-white tracking-wider uppercase font-bold">
                          জেলে থাকলে ইনকাম বন্ধ
                        </label>
                        <span className="text-[8px] font-mono text-white uppercase tracking-wide leading-relaxed">
                          জেলে থাকাকালীন সময়ে নিজের মালিকানাধীন প্রোপার্টির ভাড়া আদায় করা যাবে না।
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSettingChange('jailLoss', !settings.jailLoss)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.jailLoss ? 'bg-cyber-blue shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'
                          } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.jailLoss ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Traffic Police Switch */}
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-orbitron text-white tracking-wider uppercase font-bold">
                          ট্রাফিক পুলিশ (TRAFFIC POLICE)
                        </label>
                        <span className="text-[8px] font-mono text-white uppercase tracking-wide leading-relaxed">
                          চালু থাকলে, নির্দিষ্ট সময় পর পর ট্রাফিক পুলিশ এসে জরিমানা বা জেলে পাঠাতে পারে।
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSettingChange('enableTrafficPolice', !settings.enableTrafficPolice)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.enableTrafficPolice ? 'bg-cyber-blue shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'
                          } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.enableTrafficPolice ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
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
                      <span className="text-[8px] font-mono text-white/80 uppercase tracking-widest animate-pulse mt-1">
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
            </div>

            {/* =========================================
                COLUMN 3: TACTICAL TELEMETRY
                ========================================= */}
            <div className={`w-full lg:w-[380px] h-full flex-col ${mobileLobbyTab === 'logs' ? 'flex' : 'hidden lg:flex'}`}>
              {/* ---> INSERT EXISTING TACTICAL TELEMETRY COMPONENT/HTML HERE <--- */}
              <section className="w-full shrink-0 h-full min-w-0">
                <ChatBox entries={telemetryEntries} userId={userId} />
              </section>
            </div>

            {/* =========================================
                GLOBAL MOBILE ACTION BAR (Hidden on Desktop)
                ========================================= */}
            <div className="lg:hidden w-full shrink-0 pt-2 z-50">
              {isHost ? (
                <>
                  <button
                    onClick={startGame}
                    disabled={players.length < 2}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl border border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play size={18} />
                    <span>খেলা শুরু করুন</span>
                  </button>
                  <div className="text-center text-[10px] text-indigo-300 mt-2">
                    {players.length < 2 ? 'কমপক্ষে ২ জন খেলোয়াড় লাগবে' : 'হোস্টের জন্য অপেক্ষা করা হচ্ছে'}
                  </div>
                </>
              ) : (
                <>
                  <button
                    disabled
                    className="w-full bg-slate-800 text-slate-500 font-bold py-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={18} />
                    <span>খেলা শুরু করুন</span>
                  </button>
                  <div className="text-center text-[10px] text-slate-500 mt-2">হোস্ট খেলা শুরু করবে...</div>
                </>
              )}
            </div>
          </div>
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
    <div className="w-screen h-screen bg-[#0B0E14] overflow-hidden flex flex-col lg:flex-row relative">

      {/* =========================================
          PIECE 1: MOBILE TOP NAV (Hidden on Desktop)
          ========================================= */}
      <div className="lg:hidden w-full h-[60px] shrink-0 bg-[#0B0E14] border-b border-indigo-500/20 flex items-center justify-between px-4 z-40 relative shadow-lg">
        <div className="flex gap-2 w-full">
          <button
            onClick={() => setMobileTab(t => t === 'bank' ? 'board' : 'bank')}
            className={`flex-1 py-2 text-xs font-bold rounded border transition-all ${mobileTab === 'bank' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'}`}
          >
            BANK & POWER
          </button>
          <button
            onClick={() => setMobileTab(t => t === 'logs' ? 'board' : 'logs')}
            className={`flex-1 py-2 text-xs font-bold rounded border transition-all ${mobileTab === 'logs' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'}`}
          >
            LOGS
          </button>
        </div>
      </div>

      {/* =========================================
          LEFT COLUMN (Desktop Sidebar OR Mobile Overlay)
          ========================================= */}
      <div className={`w-full lg:w-[350px] h-[calc(100vh-120px)] lg:h-full overflow-y-auto flex-col gap-4 p-4 z-30 bg-[#0B0E14] lg:bg-transparent lg:relative absolute left-0 ${mobileTab === 'bank' || mobileTab === 'logs' ? 'flex' : 'hidden lg:flex'}`}>

        {/* Render Bank/Power ONLY if active on mobile, OR always on desktop */}
        <div className={`flex-col gap-4 ${mobileTab === 'bank' || mobileTab === 'board' ? 'flex' : 'hidden lg:flex'}`}>
          {/* ---> INSERT EXISTING GovtBank COMPONENT HERE <--- */}
          <GovernmentBank
            gameState={gameState}
            playerId={userId}
            onOpenBankModal={() => setActiveModal('BANK')}
            repayLoan={repayLoan}
          />
          {/* ---> INSERT EXISTING PowerSection COMPONENT HERE <--- */}
          <PowerSection
            state={gameState}
            boardTiles={boardTiles}
            playerId={userId}
            onUsePowerCard={usePowerCard}
            onUsePardonCard={usePardonCard}
          />
        </div>

        {/* Render Logs ONLY if active on mobile, OR always on desktop */}
        <div className={`flex-col gap-4 flex-1 min-h-0 ${mobileTab === 'logs' || mobileTab === 'board' ? 'flex' : 'hidden lg:flex'}`}>
          {/* ---> INSERT EXISTING ChatBox / Telemetry COMPONENT HERE <--- */}
          <ChatBox entries={telemetryEntries} userId={userId} />
        </div>

      </div>

      {/* =========================================
          PIECE 2: MIDDLE AREA (The Board)
          ========================================= */}
      <div className="flex-1 min-h-0 h-[calc(100vh-120px)] lg:h-screen flex flex-col relative z-10 w-full overflow-hidden bg-[#0B0E14]">

        {/* BOARD WRAPPER */}
        <div className="w-full h-full flex items-center justify-center p-2 lg:p-4 overflow-auto custom-scrollbar">
          <main className="relative flex flex-col items-center justify-center text-slate-200 aspect-square h-full w-auto flex-shrink-0">
              {/* Alert Banner for Validation Errors */}
              {errorMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
                  <div className="p-3 bg-red-950/85 border border-red-500/30 backdrop-blur-md text-red-200 text-xs font-mono rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.2)] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertOctagon size={14} className="text-red-400 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                    <button onClick={clearError} className="text-[9px] font-orbitron font-bold text-red-400 hover:text-red-300 ml-2 animate-pulse">বাতিল</button>
                  </div>
                </div>
              )}
              {/* Card Reveal Overlay */}
              {gameState?.turnStatus === 'MUST_RESOLVE_CARD' && (<CardReveal gameState={gameState} userId={userId} onResolve={resolveCard} onSellPardon={sellPardonCard} />)}
              {/* Auction Modal Overlay */}
              {gameState?.activeAuction && (<AuctionModal gameState={gameState} boardTiles={boardTiles} userId={userId} onPlaceBid={placeBid} />)}
              {/* Police Notification Overlay */}
              {(gameState?.activeDonPower || devShowPoliceNotification) && (<PoliceNotification state={gameState!} playerId={userId} forceShow={devShowPoliceNotification} onCloseForceShow={() => setDevShowPoliceNotification(false)} />)}
              {/* Bank Modal Overlay */}
              {activeModal === 'BANK' && (<BankModal onClose={() => setActiveModal('NONE')} onTakeLoan={takeLoan} />)}
              {/* Kick Vote Modal */}
              {activeModal === 'KICK' && gameState && (<KickVoteModal gameState={gameState} userId={userId} onClose={() => setActiveModal('NONE')} onCastVote={castKickVote} />)}
              {/* Game Over Overlay — visible to all players */}
              {gameState?.gameStatus === 'FINISHED' && (<GameOverOverlay gameState={gameState} onRestartGame={restartGame} />)}

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
          </main>
        </div>

      </div>

      {/* =========================================
          RIGHT COLUMN (Desktop Sidebar OR Mobile Overlay)
          ========================================= */}
      <div className={`w-full lg:w-[350px] h-[calc(100vh-120px)] lg:h-full flex-col gap-4 p-4 z-30 bg-[#0B0E14] lg:bg-transparent lg:relative absolute left-0 ${mobileTab === 'players' || mobileTab === 'properties' ? 'flex' : 'hidden lg:flex'}`}>

        {/* These controls are always visible at the top of the right sidebar */}
        <div className="glass-card p-3 flex items-center justify-between gap-3 bg-slate-950/40 border border-slate-900 backdrop-blur-md shrink-0">
          <div className="flex-1">
            <SoundControls />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveModal('KICK')}
              className="px-2.5 py-1.5 bg-red-950/80 border border-red-500/30 hover:bg-red-900/80 text-red-200 text-[10px] font-orbitron font-bold tracking-widest rounded transition-all active:scale-[0.98] cursor-pointer"
            >
              ভোটকিক
            </button>
            <button
              onClick={declareBankruptcy}
              className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-white text-[10px] font-orbitron font-bold tracking-widest rounded transition-all active:scale-[0.98] cursor-pointer"
            >
              দেউলিয়া
            </button>
          </div>
        </div>

        {/* Scrollable content area for players and trade */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 custom-scrollbar pr-1">
          <PlayerList gameState={gameState} boardTiles={boardTiles} userId={userId} />
          <TradePanel gameState={gameState} boardTiles={boardTiles} userId={userId} pendingTrades={pendingTrades} onProposeTrade={proposeTrade} onRespondToTrade={respondToTrade} />
        </div>
      </div>

      {/* =========================================
          PIECE 3: MOBILE BOTTOM NAV (Hidden on Desktop)
          ========================================= */}
      <div className="lg:hidden w-full h-[60px] shrink-0 bg-[#0B0E14] border-t border-indigo-500/20 flex items-center justify-between px-4 z-40 relative shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.5)]">
        <div className="flex gap-2 w-full">
          <button
            onClick={() => setMobileTab(t => t === 'players' ? 'board' : 'players')}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded border transition-all ${mobileTab === 'players' || mobileTab === 'properties' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-[#0B0E14] text-indigo-300 border-indigo-500/50'}`}
          >
            PLAYERS & ASSETS
          </button>
          <button
            onClick={() => setMobileTab('board')}
            className={`flex-1 py-2 text-xs font-black rounded border transition-all shadow-[0_0_10px_rgba(79,70,229,0.2)] ${mobileTab === 'board' ? 'bg-indigo-500 text-white border-indigo-300 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-indigo-900/60 text-indigo-100 border-indigo-400'}`}
          >
            BOARD
          </button>
        </div>
      </div>

    </div>
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
