import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, BoardTile, TradeOfferPayload, GameSettings } from '@/shared/types';
import { createTelemetryEntry, TelemetryEntry } from '../utils/telemetryLog';
import { mergeServerPayload, StateDeltaPayload } from '../utils/stateDelta';
import { resolveServerUrl } from '../utils/serverUrl';
import {
  DICE_RESULT_MS,
  JAIL_TRANSFER_MS,
  rollBalanceRevealMs,
  rollHistoryRevealMs,
  rollLandCompleteMs,
} from '../constants/timing';

const GO_TO_JAIL_TILE = 30;
const JAIL_TILE = 10;

function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function freezeRollVisualFields(visual: GameState, oldState: GameState): void {
  Object.values(oldState.players).forEach((p) => {
    if (visual.players[p.id]) {
      visual.players[p.id].position = p.position;
      visual.players[p.id].inJail = p.inJail;
      visual.players[p.id].balance = p.balance;
    }
  });
  visual.turnStatus = oldState.turnStatus;
  visual.drawnCard = oldState.drawnCard;
  visual.pendingRentOwed = oldState.pendingRentOwed;
  visual.activeLottery = oldState.activeLottery;
}

function preserveBalancesFromOld(target: GameState, oldState: GameState): void {
  Object.values(oldState.players).forEach((p) => {
    if (target.players[p.id]) {
      target.players[p.id].balance = p.balance;
    }
  });
  target.pendingRentOwed = oldState.pendingRentOwed;
}

function isJailViaGoToJailTile(oldState: GameState, newState: GameState, log: string): boolean {
  const activeId = newState.currentTurnPlayerId;
  const activeNew = newState.players[activeId];
  const activeOld = oldState.players[activeId];
  if (!activeNew?.inJail || activeNew.position !== JAIL_TILE || !activeOld) return false;
  if (log.includes('পরপর ৩ বার')) return false;
  const [d1, d2] = newState.dice || [0, 0];
  return (activeOld.position + d1 + d2) % 40 === GO_TO_JAIL_TILE;
}

export function useSocket(
  roomId: string | null,
  playerName: string | null,
  userId: string,
  avatar: string | null
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [boardTiles, setBoardTiles] = useState<BoardTile[]>([]);
  const [telemetryEntries, setTelemetryEntries] = useState<TelemetryEntry[]>([]);
  const gameStateRef = useRef<GameState | null>(null);
  const positionAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jailTransferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const balanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerPings, setPlayerPings] = useState<Record<string, number>>({});
  const [isPredictingRoll, setIsPredictingRoll] = useState(false);
  const stateVersionRef = useRef(0);
  const pendingRollRef = useRef<{ issuedAt: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<{
    exists: boolean;
    gameStatus: string;
    players: { id: string; name: string; avatar: string }[];
  } | null>(null);

  // Allow dynamic avatar updates
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatar);

  const refetchRoomDetails = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('get_room_details', { roomId }, (response: any) => {
        if (response && !response.error) {
          setRoomDetails(response);
        }
      });
    }
  }, [roomId]);

  const pushTelemetry = useCallback((log: string, state: GameState | null) => {
    if (!log?.trim()) return;
    setTelemetryEntries((prev) => [createTelemetryEntry(log, state), ...prev]);
  }, []);

  const logs = useMemo(() => telemetryEntries.map((e) => e.text), [telemetryEntries]);

  const pendingTrades = useMemo(
    () =>
      (gameState?.pendingTrades || []).map((t) => ({
        tradeId: t.tradeId,
        offer: t.offer,
      })),
    [gameState?.pendingTrades]
  );

  useEffect(() => {
    if (!roomId || !userId) return;

    const dynamicServerUrl = resolveServerUrl();

    const socket = io(dynamicServerUrl, {
      auth: { userId },
      query: { userId },
      // WebSocket first for low latency; polling only as a fallback when WS is blocked.
      transports: ['websocket', 'polling'],
      upgrade: true,
      // Faster failure detection so a dead socket reconnects quickly.
      timeout: 8000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      randomizationFactor: 0.5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setErrorMessage(null);

      // Fetch room details on connect
      socket.emit('get_room_details', { roomId }, (response: any) => {
        if (response && !response.error) {
          setRoomDetails(response);
        }
      });

      // Join game session only if playerName is provided
      if (playerName && currentAvatar) {
        socket.emit('join_room', { roomId, name: playerName, avatar: currentAvatar });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setErrorMessage(`Connection error: ${err.message}`);
    });

    // Handle initial room setup
    socket.on('room_initialized', (data: { state: GameState; board: BoardTile[] }) => {
      gameStateRef.current = data.state;
      setGameState(data.state);
      setBoardTiles(data.board);
      setTelemetryEntries([
        createTelemetryEntry(`Joined room ${roomId} as ${playerName || 'Guest'}`, data.state),
      ]);
    });

    const syncRoomDetails = (state: GameState) => {
      const playersList = Object.values(state.players).map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar
      }));
      setRoomDetails({
        exists: true,
        gameStatus: state.gameStatus,
        players: playersList
      });
    };

    const applyStateUpdate = (
      state: GameState,
      log: string,
      version?: number,
      options?: { skipTelemetry?: boolean }
    ) => {
      if (version !== undefined) stateVersionRef.current = version;
      gameStateRef.current = state;
      setGameState(state);
      if (!options?.skipTelemetry) {
        pushTelemetry(log, state);
      }
      syncRoomDetails(state);
      setIsPredictingRoll(false);
      pendingRollRef.current = null;
    };

    const clearRollTimers = () => {
      if (positionAnimTimerRef.current) clearTimeout(positionAnimTimerRef.current);
      if (jailTransferTimerRef.current) clearTimeout(jailTransferTimerRef.current);
      if (landTimerRef.current) clearTimeout(landTimerRef.current);
      if (balanceTimerRef.current) clearTimeout(balanceTimerRef.current);
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
      positionAnimTimerRef.current = null;
      jailTransferTimerRef.current = null;
      landTimerRef.current = null;
      balanceTimerRef.current = null;
      historyTimerRef.current = null;
    };

    /** Roll pipeline: dice → token move → balance → history. */
    const handleAuthoritativeState = (newState: GameState, log: string, version?: number) => {
      const oldState = gameStateRef.current;
      const rollCounterIncreased = (newState.rollCounter || 0) > (oldState?.rollCounter || 0);

      if (rollCounterIncreased && oldState) {
        clearRollTimers();

        const capturedNewState = newState;
        const jailViaGoToJail = isJailViaGoToJailTile(oldState, newState, log);
        const activeId = newState.currentTurnPlayerId;

        const visualState = cloneGameState(newState);
        freezeRollVisualFields(visualState, oldState);
        applyStateUpdate(visualState, '', version, { skipTelemetry: true });

        const landMs = rollLandCompleteMs(jailViaGoToJail);
        const balanceMs = rollBalanceRevealMs(jailViaGoToJail);
        const historyMs = rollHistoryRevealMs(jailViaGoToJail);

        positionAnimTimerRef.current = setTimeout(() => {
          positionAnimTimerRef.current = null;

          if (jailViaGoToJail && activeId) {
            const atGoToJail = cloneGameState(capturedNewState);
            atGoToJail.players[activeId].position = GO_TO_JAIL_TILE;
            atGoToJail.players[activeId].inJail = false;
            preserveBalancesFromOld(atGoToJail, oldState);
            atGoToJail.turnStatus = oldState.turnStatus;
            atGoToJail.drawnCard = oldState.drawnCard;
            atGoToJail.activeLottery = oldState.activeLottery;
            gameStateRef.current = atGoToJail;
            setGameState(atGoToJail);

            jailTransferTimerRef.current = setTimeout(() => {
              jailTransferTimerRef.current = null;
              const atJail = cloneGameState(capturedNewState);
              preserveBalancesFromOld(atJail, oldState);
              atJail.turnStatus = oldState.turnStatus;
              atJail.drawnCard = oldState.drawnCard;
              atJail.activeLottery = oldState.activeLottery;
              gameStateRef.current = atJail;
              setGameState(atJail);
            }, JAIL_TRANSFER_MS);
          } else {
            const withPositions = cloneGameState(capturedNewState);
            preserveBalancesFromOld(withPositions, oldState);
            withPositions.turnStatus = oldState.turnStatus;
            withPositions.drawnCard = oldState.drawnCard;
            withPositions.activeLottery = oldState.activeLottery;
            gameStateRef.current = withPositions;
            setGameState(withPositions);
          }
        }, DICE_RESULT_MS);

        landTimerRef.current = setTimeout(() => {
          landTimerRef.current = null;
          const withLand = cloneGameState(capturedNewState);
          preserveBalancesFromOld(withLand, oldState);
          gameStateRef.current = withLand;
          setGameState(withLand);
        }, landMs);

        balanceTimerRef.current = setTimeout(() => {
          balanceTimerRef.current = null;
          gameStateRef.current = capturedNewState;
          setGameState(capturedNewState);
        }, balanceMs);

        historyTimerRef.current = setTimeout(() => {
          historyTimerRef.current = null;
          pushTelemetry(log, capturedNewState);
        }, historyMs);
      } else {
        clearRollTimers();
        applyStateUpdate(newState, log, version);
      }
    };

    // Primary path: compact jsondiffpatch delta from server
    socket.on('state_delta', (payload: StateDeltaPayload) => {
      const merged = mergeServerPayload(gameStateRef.current, payload);
      if (!merged) return;
      handleAuthoritativeState(merged, payload.log, payload.version);
    });

    // Legacy / full-sync fallback (reconnect, large mutations)
    socket.on('state_updated', (data: { state: GameState; log: string; version?: number }) => {
      handleAuthoritativeState(data.state, data.log, data.version);
    });

    socket.on('player_pings_updated', (pings: Record<string, number>) => {
      setPlayerPings(pings);
    });

    // Trade list syncs via gameState.pendingTrades in authoritative state updates

    // Handle being kicked from lobby
    socket.on('kicked_from_lobby', () => {
      alert("You have been kicked from the lobby by the host.");
      window.location.href = '/';
    });

    socket.on('trade_declined', (data: { tradeId: string; log: string }) => {
      pushTelemetry(data.log, gameStateRef.current);
    });

    // Handle server resets
    socket.on('server_reset', () => {
      alert("The database has been cleared and game servers have been shut down.");
      window.location.href = '/';
    });

    // Handle validation errors
    socket.on('error_message', (msg: string) => {
      setErrorMessage(msg);
      // Automatically clear alert after 4 seconds
      setTimeout(() => {
        setErrorMessage((prev) => (prev === msg ? null : prev));
      }, 4000);
    });

    const measurePing = () => {
      if (!socket.connected || !roomId) return;
      const start = Date.now();
      socket.emit('ping_check', start, () => {
        const rtt = Date.now() - start;
        setPlayerPings((prev) => ({ ...prev, [userId]: rtt }));
        socket.emit('report_ping', { roomId, playerId: userId, ping: rtt });
      });
    };

    measurePing();
    const pingInterval = setInterval(measurePing, 5000);

    return () => {
      clearInterval(pingInterval);
      clearRollTimers();
      socket.disconnect();
    };
  }, [roomId, playerName, userId, currentAvatar, pushTelemetry]);

  // Actions
  const updateAppearance = useCallback((newAvatar: string) => {
    setCurrentAvatar(newAvatar);
    if (socketRef.current && playerName) {
      socketRef.current.emit('join_room', { roomId, name: playerName, avatar: newAvatar });
    }
  }, [roomId, playerName]);

  const rollDice = useCallback(() => {
    const current = gameStateRef.current;
    if (!current || current.currentTurnPlayerId !== userId) return;

    // Optimistic UI: lock roll button + start dice animation immediately (reconciled on state_delta)
    setIsPredictingRoll(true);
    pendingRollRef.current = { issuedAt: Date.now() };
    setTimeout(() => {
      if (pendingRollRef.current) {
        setIsPredictingRoll(false);
        pendingRollRef.current = null;
      }
    }, 8000);

    if (socketRef.current) {
      socketRef.current.emit('roll_dice', { playerId: userId });
    }
  }, [userId]);

  const buyProperty = useCallback((tileIndex: number) => {
    console.log('[Socket Emit] buy_property', { playerId: userId, tileIndex });
    if (socketRef.current) {
      socketRef.current.emit('buy_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const mortgageProperty = useCallback((tileIndex: number) => {
    console.log('[Socket Emit] mortgage_property', { playerId: userId, tileIndex });
    if (socketRef.current) {
      socketRef.current.emit('mortgage_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const unmortgageProperty = useCallback((tileIndex: number) => {
    console.log('[Socket Emit] unmortgage_property', { playerId: userId, tileIndex });
    if (socketRef.current) {
      socketRef.current.emit('unmortgage_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const proposeTrade = useCallback((offer: Omit<TradeOfferPayload, 'senderId'> & { replacesTradeId?: string }) => {
    console.log('[Socket Emit] propose_trade', { ...offer, senderId: userId });
    if (socketRef.current) {
      socketRef.current.emit('propose_trade', {
        ...offer,
        senderId: userId
      });
    }
  }, [userId]);

  const cancelTrade = useCallback((tradeId: string) => {
    console.log('[Socket Emit] cancel_trade', { playerId: userId, tradeId });
    if (socketRef.current) {
      socketRef.current.emit('cancel_trade', {
        playerId: userId,
        tradeId
      });
    }
  }, [userId]);

  const respondToTrade = useCallback((tradeId: string, accept: boolean) => {
    console.log('[Socket Emit] respond_to_trade', { playerId: userId, tradeId, accept });
    if (socketRef.current) {
      socketRef.current.emit('respond_to_trade', {
        playerId: userId,
        tradeId,
        accept
      });
    }
  }, [userId]);

  const placeBid = useCallback((amountToAdd: number) => {
    console.log('[Socket Emit] place_bid', { playerId: userId, amountToAdd });
    if (socketRef.current) {
      socketRef.current.emit('place_bid', { playerId: userId, amountToAdd });
    }
  }, [userId]);

  const endTurn = useCallback(() => {
    console.log('[Socket Emit] end_turn', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('end_turn', { playerId: userId });
    }
  }, [userId]);

  const updateSettings = useCallback((settings: GameSettings) => {
    console.log('[Socket Emit] update_settings', { settings, playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('update_settings', { settings, playerId: userId });
    }
  }, [userId]);

  const startGame = useCallback(() => {
    console.log('[Socket Emit] start_game', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('start_game', { playerId: userId });
    }
  }, [userId]);

  const declareBankruptcy = useCallback(() => {
    console.log('[Socket Emit] declare_bankruptcy', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('declare_bankruptcy', { playerId: userId });
    }
  }, [userId]);

  const teleportPlayer = useCallback((targetTileIndex: number) => {
    console.log('[Socket Emit] dev_teleport', { playerId: userId, targetIndex: targetTileIndex });
    if (socketRef.current) {
      socketRef.current.emit('dev_teleport', { playerId: userId, targetIndex: targetTileIndex });
    }
  }, [userId]);

  const devRollDice = useCallback((d1: number, d2: number) => {
    console.log('[Socket Emit] dev_roll_dice', { playerId: userId, d1, d2 });
    if (socketRef.current) {
      socketRef.current.emit('dev_roll_dice', { playerId: userId, d1, d2 });
    }
  }, [userId]);

  const devAddFunds = useCallback((amount: number) => {
    console.log('[Socket Emit] dev_add_funds', { playerId: userId, amount });
    if (socketRef.current) {
      socketRef.current.emit('dev_add_funds', { playerId: userId, amount });
    }
  }, [userId]);

  const devForceCrash = useCallback(() => {
    console.log('[Socket Emit] dev_force_crash', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('dev_force_crash', { playerId: userId });
    }
  }, [userId]);

  const devSetNextCrash = useCallback((delayMinutes: number) => {
    console.log('[Socket Emit] dev_set_next_crash', { playerId: userId, delayMinutes });
    if (socketRef.current) {
      socketRef.current.emit('dev_set_next_crash', { playerId: userId, delayMinutes });
    }
  }, [userId]);

  const devForcePolice = useCallback(() => {
    console.log('[Socket Emit] dev_force_police', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('dev_force_police', { playerId: userId });
    }
  }, [userId]);

  const devSetNextPolice = useCallback((delayMinutes: number) => {
    console.log('[Socket Emit] dev_set_next_police', { playerId: userId, delayMinutes });
    if (socketRef.current) {
      socketRef.current.emit('dev_set_next_police', { playerId: userId, delayMinutes });
    }
  }, [userId]);

  const devGivePowerCard = useCallback(() => {
    console.log('[Socket Emit] dev_give_power_card', { playerId: userId, cardType: 'BECOME_A_DON' });
    if (socketRef.current) {
      socketRef.current.emit('dev_give_power_card', { playerId: userId, cardType: 'BECOME_A_DON' });
    }
  }, [userId]);

  const devGivePardonCard = useCallback(() => {
    console.log('[Socket Emit] dev_give_power_card', { playerId: userId, cardType: 'GET_OUT_OF_JAIL_FREE' });
    if (socketRef.current) {
      socketRef.current.emit('dev_give_power_card', { playerId: userId, cardType: 'GET_OUT_OF_JAIL_FREE' });
    }
  }, [userId]);

  const usePowerCard = useCallback((cardType: string, actionPayload: any) => {
    console.log('[Socket Emit] use_power_card', { playerId: userId, cardType, actionPayload });
    if (socketRef.current) {
      socketRef.current.emit('use_power_card', { playerId: userId, cardType, actionPayload });
    }
  }, [userId]);

  const addBot = useCallback(() => {
    console.log('[Socket Emit] add_bot');
    if (socketRef.current) {
      socketRef.current.emit('add_bot');
    }
  }, []);

  const payJailFine = useCallback(() => {
    console.log('[Socket Emit] pay_jail_fine', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('pay_jail_fine', { playerId: userId });
    }
  }, [userId]);

  const buildHouse = useCallback((tileIndex: number) => {
    console.log('[Socket Emit] build_house', { playerId: userId, tileIndex });
    if (socketRef.current) {
      socketRef.current.emit('build_house', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const sellHouse = useCallback((tileIndex: number) => {
    console.log('[Socket Emit] sell_house', { playerId: userId, tileIndex });
    if (socketRef.current) {
      socketRef.current.emit('sell_house', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const sellProperty = useCallback((tileIndex: number) => {
    console.log('[Socket Emit] sell_property', { playerId: userId, tileIndex });
    if (socketRef.current) {
      socketRef.current.emit('sell_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const auctionProperty = useCallback((tileIndex: number) => {
    console.log('[Socket Emit] auction_property', { playerId: userId, tileIndex });
    if (socketRef.current) {
      socketRef.current.emit('auction_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const resolveCard = useCallback(() => {
    console.log('[Socket Emit] resolve_card', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('resolve_card', { playerId: userId });
    }
  }, [userId]);

  const revealLotteryDigit = useCallback(() => {
    console.log('[Socket Emit] lottery_reveal', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('lottery_reveal', { playerId: userId });
    }
  }, [userId]);

  const startLottery = useCallback(() => {
    console.log('[Socket Emit] lottery_start', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('lottery_start', { playerId: userId });
    }
  }, [userId]);

  const sellPardonCard = useCallback(() => {
    console.log('[Socket Emit] sell_pardon_card', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('sell_pardon_card', { playerId: userId });
    }
  }, [userId]);

  const usePardonCard = useCallback(() => {
    console.log('[Socket Emit] use_pardon_card', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('use_pardon_card', { playerId: userId });
    }
  }, [userId]);

  const takeLoan = useCallback((amount: number) => {
    console.log('[Socket Emit] take_loan', { playerId: userId, amount });
    if (socketRef.current) {
      socketRef.current.emit('take_loan', { playerId: userId, amount });
    }
  }, [userId]);

  const repayLoan = useCallback((amount?: number) => {
    console.log('[Socket Emit] repay_loan', { playerId: userId, amount });
    if (socketRef.current) {
      socketRef.current.emit('repay_loan', { playerId: userId, amount });
    }
  }, [userId]);

  const castKickVote = useCallback((targetPlayerId: string | null) => {
    console.log('[Socket Emit] cast_kick_vote', { playerId: userId, targetPlayerId });
    if (socketRef.current) {
      socketRef.current.emit('cast_kick_vote', { playerId: userId, targetPlayerId });
    }
  }, [userId]);

  const restartGame = useCallback(() => {
    console.log('[Socket Emit] restart_game', { playerId: userId });
    if (socketRef.current) {
      socketRef.current.emit('restart_game', { playerId: userId });
    }
  }, [userId]);

  const kickPlayerFromLobby = useCallback((targetId: string) => {
    console.log('[Socket Emit] kick_player_from_lobby', { playerId: userId, targetId });
    if (socketRef.current) {
      socketRef.current.emit('kick_player_from_lobby', { playerId: userId, targetId });
    }
  }, [userId]);

  useEffect(() => {
    const handleCustomBid = (e: any) => {
      if (socketRef.current) {
        socketRef.current.emit('place_bid', { playerId: userId, amountToAdd: e.detail });
      }
    };
    const handleCustomAuction = (e: any) => auctionProperty(e.detail);
    const handleCustomBankrupt = () => declareBankruptcy();
    const handleCustomMortgage = (e: any) => mortgageProperty(e.detail);
    const handleCustomUnmortgage = (e: any) => unmortgageProperty(e.detail);
    const handleCustomSellPardon = () => sellPardonCard();

    window.addEventListener('place_bid', handleCustomBid);
    window.addEventListener('auction_property', handleCustomAuction);
    window.addEventListener('declare_bankruptcy', handleCustomBankrupt);
    window.addEventListener('mortgage_property', handleCustomMortgage);
    window.addEventListener('unmortgage_property', handleCustomUnmortgage);
    window.addEventListener('sell_pardon_card', handleCustomSellPardon);

    return () => {
      window.removeEventListener('place_bid', handleCustomBid);
      window.removeEventListener('auction_property', handleCustomAuction);
      window.removeEventListener('declare_bankruptcy', handleCustomBankrupt);
      window.removeEventListener('mortgage_property', handleCustomMortgage);
      window.removeEventListener('unmortgage_property', handleCustomUnmortgage);
      window.removeEventListener('sell_pardon_card', handleCustomSellPardon);
    };
  }, [userId, auctionProperty, declareBankruptcy, mortgageProperty, unmortgageProperty, sellPardonCard]);

  return {
    isConnected,
    gameState,
    boardTiles,
    logs,
    playerPings,
    isPredictingRoll,
    telemetryEntries,
    pendingTrades,
    errorMessage,
    clearError: () => setErrorMessage(null),
    roomDetails,
    refetchRoomDetails,
    rollDice,
    buyProperty,
    mortgageProperty,
    unmortgageProperty,
    proposeTrade,
    cancelTrade,
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
    devAddFunds,
    devForceCrash,
    devSetNextCrash,
    devForcePolice,
    devSetNextPolice,
    placeBid,
    addBot,
    updateAppearance,
    resolveCard,
    revealLotteryDigit,
    startLottery,
    sellPardonCard,
    usePardonCard,
    devGivePowerCard,
    devGivePardonCard,
    usePowerCard,
    takeLoan,
    repayLoan,
    castKickVote,
    restartGame,
    kickPlayerFromLobby
  };
}
