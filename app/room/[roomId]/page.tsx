"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import { useGameSounds } from '../../../hooks/useGameSounds';
import Board from '../../../components/Board';
import PlayerList from '../../../components/PlayerList';
import ChatBox from '../../../components/ChatBox';
import PropertyManager from '../../../components/PropertyManager';
import TradePanel from '../../../components/TradePanel';
import CardReveal from '../../../components/CardReveal';
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
    addBot,
    updateAppearance,
    resolveCard,
    sellPardonCard,
    usePardonCard
  } = useSocket(roomId, playerName, userId, avatar);

  // Initialize sound manager to listen to game events
  useGameSounds(gameState, logs, userId);

  const [guestName, setGuestName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  const AVATAR_COLORS = [
    { hex: '#8BA4F9', name: 'SOFT BLUE' },
    { hex: '#D8B4F8', name: 'SOFT PURPLE' },
    { hex: '#F98BA4', name: 'SOFT PINK' },
    { hex: '#A4F98B', name: 'SOFT GREEN' }
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
      <div className="min-h-screen w-full bg-[#0B0E14] flex flex-col items-center justify-center font-sans cyber-grid z-50 relative">
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
      <div className="min-h-screen w-full bg-[#0B0E14] flex flex-col items-center justify-center font-sans cyber-grid animate-pulse-slow">
        <div className="glass-panel p-8 max-w-sm w-full text-center relative border border-cyber-blue/30 shadow-[0_0_20px_rgba(139,164,249,0.05)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
          {errorMessage ? (
            <AlertOctagon className="w-10 h-10 text-red-500 mx-auto mb-4" />
          ) : (
            <RotateCw className="w-10 h-10 text-cyber-blue animate-spin mx-auto mb-4" />
          )}
          <h2 className="text-sm font-orbitron font-extrabold tracking-widest text-white uppercase">
            {errorMessage ? "CONNECTION REFUSED" : "CALIBRATING NETWORK"}
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
                RETURN TO GATEWAY
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
      <main className="relative w-screen h-screen bg-[#0B0E14] overflow-hidden flex flex-col cyber-grid text-slate-200">
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
                    OPERATOR STARTING CASH
                  </label>
                  <select
                    value={settings.startingCash}
                    onChange={(e) => handleSettingChange('startingCash', Number(e.target.value))}
                    disabled={!isHost}
                    className={`w-full mt-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-200 outline-none ${isHost ? 'cursor-pointer focus:border-cyber-blue' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    <option value={1000}>$1,000 (QUICK MATCH)</option>
                    <option value={1500}>$1,500 (STANDARD MONOPOLY)</option>
                    <option value={2000}>$2,000 (RICH MODE)</option>
                    <option value={2500}>$2,500 (HIGH STAKES)</option>
                  </select>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-normal">
                    Starting cash allocation for all joined player accounts.
                  </span>
                </div>

                {/* Double Rent Switch */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-orbitron text-slate-400 tracking-wider uppercase font-bold">
                      DOUBLE RENT ON COMPLETE SET
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      Doubles unimproved street rent when player owns the entire color group set.
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
                      FREE PARKING CASH POOL
                    </label>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide leading-relaxed">
                      Accumulates tax fines in a central pool, awarded to players landing on Free Parking.
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
                    COMPILES MATRIX & START
                  </button>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest animate-pulse mt-1">
                    {players.length < 2 ? 'Lobby needs minimum 2 players (CPU fallback active)' : 'Awaiting host activation'}
                  </span>
                </>
              ) : (
                <div className="w-full max-w-[280px] py-4 glass-panel-light text-slate-500 border border-slate-800/50 font-orbitron font-bold tracking-widest text-sm flex items-center justify-center gap-2 bg-slate-900/20 select-none">
                  AWAITING HOST TO START...
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
            <div className="relative w-full max-w-sm p-6 glass-panel border border-cyber-blue/30 shadow-[0_0_30px_rgba(139,164,249,0.1)] bg-[#0B0E14]/95">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
              <button 
                onClick={() => setShowAppearanceModal(false)}
                className="absolute top-3 right-3 text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              
              <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-white uppercase text-center mb-6">
                UPDATE APPEARANCE
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
                      className={`py-3 rounded-lg border-2 bg-slate-950/40 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${
                        isTaken 
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
    <main className="relative w-screen h-screen bg-[#0B0E14] overflow-hidden flex flex-col cyber-grid text-slate-200">
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
                DISMISS
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

      {/* Main UI Layout (Board-priority 3-column system) */}
      <div className="flex-1 w-full p-2 md:p-3 overflow-x-hidden overflow-y-auto xl:overflow-hidden flex flex-col xl:flex-row gap-3 min-h-0 relative z-10">

        {/* COLUMN 2: CENTER BOARD AREA (Primary strategy canvas — highest priority) */}
        {/* CRITICAL: xl:flex-1 AND min-w-0 prevent Flexbox squeeze lock so the board can shrink when sidebar expands on desktop. shrink-0 on mobile prevents height collapse. */}
        <section className="order-1 xl:order-2 shrink-0 xl:shrink xl:flex-1 w-full xl:w-auto block xl:flex xl:items-center xl:justify-center min-w-0 h-auto xl:h-full pt-2 xl:pt-0">
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
          />
        </section>

        {/* COLUMN 1: LEFT OVERLAYS HUD (Securities & Telemetry) */}
        <section className="order-2 xl:order-1 w-full xl:w-72 shrink-0 flex flex-col gap-3 h-[60vh] xl:h-full xl:min-w-[220px] overflow-hidden bg-slate-900/40 xl:bg-transparent rounded-xl xl:rounded-none p-3 xl:p-0 border border-slate-800 xl:border-none">
          <div className="flex-1 min-h-0 overflow-hidden">
            <PropertyManager
              gameState={gameState}
              boardTiles={boardTiles}
              userId={userId}
              onMortgageProperty={mortgageProperty}
              onUnmortgageProperty={unmortgageProperty}
            />
          </div>
          <div className="h-56 shrink-0">
            <ChatBox logs={logs} />
          </div>
        </section>

        {/* COLUMN 3: RIGHT OVERLAYS HUD (Players & Trades) */}
        <div className="order-3 xl:order-3 w-full xl:w-[380px] shrink-0 h-[60vh] xl:h-full flex flex-col gap-3">
          <div className="flex flex-col gap-3 h-full w-full select-none overflow-hidden bg-slate-900/40 xl:bg-[#0B0E14] xl:border-l border-slate-800 rounded-xl xl:rounded-none p-3 xl:p-0 xl:pl-3">
            {/* Top Actions: Votekick and Bankrupt */}
            <div className="flex justify-between items-center shrink-0">
            <button
              onClick={() => {
                // Future Votekick placeholder
              }}
              className="bg-[#19162A]/60 border border-[#2D284B] hover:bg-[#241F3C] text-slate-400 hover:text-slate-300 font-sans text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <UserX size={12} className="stroke-current" />
              Votekick
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to declare bankruptcy? You will surrender all assets and exit the game.")) {
                  declareBankruptcy();
                }
              }}
              disabled={gameState.gameStatus !== 'ACTIVE' || gameState.currentTurnPlayerId !== userId || gameState.players[userId]?.isBankrupt}
              className={`font-sans text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 active:scale-[0.98] shadow-md ${
                (gameState.gameStatus === 'ACTIVE' && gameState.currentTurnPlayerId === userId && !gameState.players[userId]?.isBankrupt)
                  ? 'bg-[#E55C5C] hover:bg-[#D44B4B] text-white shadow-[#E55C5C]/15 cursor-pointer'
                  : 'bg-[#252136] text-slate-600 border border-[#2D284B] cursor-not-allowed opacity-50 shadow-none'
              }`}
            >
              <Flag size={12} className="fill-current stroke-current" />
              Bankrupt
            </button>
          </div>

          <div className="shrink-0 h-auto">
            <PlayerList
              gameState={gameState}
              boardTiles={boardTiles}
              userId={userId}
            />
          </div>
          <div className="flex-1 min-h-0">
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
      <div className="min-h-screen w-full bg-[#0B0E14] flex flex-col items-center justify-center font-sans cyber-grid animate-pulse-slow">
        <div className="glass-panel p-8 max-w-sm w-full text-center relative border border-cyber-blue/30 shadow-[0_0_20px_rgba(139,164,249,0.05)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
          <RotateCw className="w-10 h-10 text-cyber-blue animate-spin mx-auto mb-4" />
          <h2 className="text-sm font-orbitron font-extrabold tracking-widest text-white uppercase">
            CALIBRATING NETWORK
          </h2>
        </div>
      </div>
    }>
      <GameRoomContent />
    </Suspense>
  );
}
