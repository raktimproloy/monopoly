"use client";

import { useSearchParams, useParams } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import Board from '../../../components/Board';
import PlayerList from '../../../components/PlayerList';
import ChatBox from '../../../components/ChatBox';
import PropertyManager from '../../../components/PropertyManager';
import TradePanel from '../../../components/TradePanel';
import { Wifi, WifiOff, AlertOctagon, RotateCw, Settings, Users, Sparkles, Play, UserX, Flag } from 'lucide-react';
import { Suspense } from 'react';

function GameRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomId = params.roomId as string;
  const playerName = searchParams.get('name') || 'Guest';
  const userId = searchParams.get('uid') || 'usr_guest';
  const avatar = searchParams.get('avatar') || '#8BA4F9';

  const {
    isConnected,
    gameState,
    boardTiles,
    logs,
    pendingTrade,
    errorMessage,
    clearError,
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
    payJailFine
  } = useSocket(roomId, playerName, userId, avatar);

  // Loading indicator while connecting
  if (!gameState || boardTiles.length === 0) {
    return (
      <div className="min-h-screen w-full bg-[#0B0E14] flex flex-col items-center justify-center font-sans cyber-grid animate-pulse-slow">
        <div className="glass-panel p-8 max-w-sm w-full text-center relative border border-cyber-blue/30 shadow-[0_0_20px_rgba(139,164,249,0.05)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue" />
          <RotateCw className="w-10 h-10 text-cyber-blue animate-spin mx-auto mb-4" />
          <h2 className="text-sm font-orbitron font-extrabold tracking-widest text-white uppercase">
            CALIBRATING NETWORK
          </h2>
        </div>
      </div>
    );
  }

  // --- SCREEN 1: WAITING ROOM LOBBY (gameStatus === 'LOBBY') ---
  if (gameState.gameStatus === 'LOBBY') {
    const players = Object.values(gameState.players);
    const settings = gameState.settings;

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
            <h3 className="text-xs font-orbitron font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-2">
              <Users size={14} className="text-cyber-purple" />
              CONNECTED NODES ({players.length})
            </h3>

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
                    <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      READY
                    </span>
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
                    className="w-full mt-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-200 outline-none cursor-pointer focus:border-cyber-blue"
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
                    onChange={(e) => handleSettingChange('doubleRentOnCompleteSet', e.target.checked)}
                    className="w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 cursor-pointer mt-1"
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
                    onChange={(e) => handleSettingChange('freeParkingCashPool', e.target.checked)}
                    className="w-4 h-4 text-cyber-blue bg-slate-900 border-slate-800 rounded outline-none focus:ring-0 focus:ring-offset-0 cursor-pointer mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Start MATCH buttons */}
            <div className="flex flex-col items-center justify-center gap-3 mt-8">
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
            </div>
          </section>

          {/* RIGHT: Tactical Telemetry Logs */}
          <section className="w-80 shrink-0 h-full min-w-0">
            <ChatBox logs={logs} />
          </section>
        </div>
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

      {/* Main UI Layout (Full screen 3-column system) */}
      <div className="flex-1 w-full p-4 overflow-hidden flex gap-4 min-h-0 relative z-10">

        {/* COLUMN 1: LEFT OVERLAYS HUD (Securities & Telemetry) */}
        <section className="w-96 shrink-0 flex flex-col gap-4 h-full min-w-0">
          <div className="flex-1 min-h-0">
            <PropertyManager
              gameState={gameState}
              boardTiles={boardTiles}
              userId={userId}
              onBuyProperty={buyProperty}
              onMortgageProperty={mortgageProperty}
              onUnmortgageProperty={unmortgageProperty}
            />
          </div>
          <div className="h-64 shrink-0">
            <ChatBox logs={logs} />
          </div>
        </section>

        {/* COLUMN 2: CENTER BOARD AREA (Primary strategy canvas) */}
        <section className="flex-1 flex items-center justify-center min-w-0 h-full p-2">
          <Board
            gameState={gameState}
            boardTiles={boardTiles}
            userId={userId}
            logs={logs}
            onRollDice={rollDice}
            onEndTurn={endTurn}
            onPayJailFine={payJailFine}
            onTileClick={(idx) => {
              // Can hook custom tile inspect actions here
            }}
          />
        </section>

        {/* COLUMN 3: RIGHT OVERLAYS HUD (Players & Trades) */}
        <section className="w-96 shrink-0 flex flex-col gap-3 h-full min-w-0 select-none">
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
        </section>
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
