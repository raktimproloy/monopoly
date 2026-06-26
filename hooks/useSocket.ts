import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, BoardTile, TradeOfferPayload, GameSettings } from '@/shared/types';
import { createTelemetryEntry, TelemetryEntry } from '../utils/telemetryLog';

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
  // Tracks whether a roll animation sequence is currently in progress
  const isSequencingRef = useRef<boolean>(false);
  // Queued non-roll state update to apply after the sequence finishes
  const pendingStateUpdateRef = useRef<{ state: GameState; log: string } | null>(null);
  const [pendingTrades, setPendingTrades] = useState<{ tradeId: string; offer: TradeOfferPayload }[]>([]);
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

  useEffect(() => {
    if (!roomId || !userId) return;

    // Dynamically resolve the server URL based on the window location
    let dynamicServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:6001';
    let serverPort = '6001';
    try {
      const url = new URL(dynamicServerUrl);
      if (url.port) {
        serverPort = url.port;
      }
    } catch (e) {
      // Ignore URL parsing error
    }

    if (typeof window !== 'undefined' && window.location) {
      const { hostname, protocol } = window.location;
      if (hostname && hostname.includes('devtunnels.ms')) {
        // Devtunnels format: https://<tunnel>-3000.asse.devtunnels.ms
        // Replace port -3000 with backend port for backend socket server
        const secureHost = hostname.replace('-3000', `-${serverPort}`);
        dynamicServerUrl = `https://${secureHost}`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        dynamicServerUrl = `http://${hostname}:${serverPort}`;
      } else {
        // Respect custom API domains (like bdpoly-api.aftonix.com) if configured
        const hasCustomServerUrl = process.env.NEXT_PUBLIC_SERVER_URL &&
          !process.env.NEXT_PUBLIC_SERVER_URL.includes('localhost') &&
          !process.env.NEXT_PUBLIC_SERVER_URL.includes('127.0.0.1');

        if (!hasCustomServerUrl && hostname) {
          const isSecure = protocol === 'https:';
          dynamicServerUrl = `${isSecure ? 'https' : 'http'}://${hostname}:${serverPort}`;
        }
      }
    }

    // Connect directly to the dynamic URL
    const socket = io(dynamicServerUrl, {
      auth: { userId },
      query: { userId },
      transports: ['websocket']
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

    // Handle state mutations with Visual Sequencer
    socket.on('state_updated', (data: { state: GameState; log: string }) => {
      const oldState = gameStateRef.current;
      const newState = data.state;

      const rollCounterIncreased = (newState.rollCounter || 0) > (oldState?.rollCounter || 0);

      if (rollCounterIncreased && oldState) {
        // Mark that a roll sequence is in progress — queues any incoming non-roll events
        isSequencingRef.current = true;
        pendingStateUpdateRef.current = null;

        // Phase 1: Update dice & rollCounter ONLY (triggers 3D dice animation)
        // Keep player positions at their OLD values so token doesn't jump yet
        const phase1State = JSON.parse(JSON.stringify(oldState)) as GameState;
        phase1State.dice = newState.dice;
        phase1State.rollCounter = newState.rollCounter;
        phase1State.turnStatus = 'MUST_ROLL'; // hold turn UI while dice spin

        gameStateRef.current = phase1State;
        setGameState(phase1State);

        // Capture newState in closure so Phase 2/3 always use the correct server state,
        // regardless of any intervening non-roll events that may overwrite gameStateRef.
        const capturedNewState = newState;
        const capturedLog = data.log;

        // Phase 2: After dice animation finishes (~1300ms), move the player token
        setTimeout(() => {
          // Build phase2 from the captured server state but keep old balance/turnStatus
          // so only the position visually changes here.
          const phase2State = JSON.parse(JSON.stringify(phase1State)) as GameState;

          // Copy the new positions from the server state
          Object.values(capturedNewState.players).forEach(p => {
            if (phase2State.players[p.id]) {
              phase2State.players[p.id].position = p.position;
              // Also carry over inJail so jail animation triggers correctly
              phase2State.players[p.id].inJail = p.inJail;
            }
          });

          gameStateRef.current = phase2State;
          setGameState(phase2State);

          // Phase 3: After token finishes moving (~800ms), apply full server state
          setTimeout(() => {
            gameStateRef.current = capturedNewState;
            setGameState(capturedNewState);
            pushTelemetry(capturedLog, capturedNewState);

            if (capturedNewState) {
              const playersList = Object.values(capturedNewState.players).map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar
              }));
              setRoomDetails({
                exists: true,
                gameStatus: capturedNewState.gameStatus,
                players: playersList
              });
            }

            // Sequencing complete — apply any queued non-roll update
            isSequencingRef.current = false;
            const pending = pendingStateUpdateRef.current;
            if (pending) {
              pendingStateUpdateRef.current = null;
              gameStateRef.current = pending.state;
              setGameState(pending.state);
              pushTelemetry(pending.log, pending.state);

              const playersList = Object.values(pending.state.players).map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar
              }));
              setRoomDetails({
                exists: true,
                gameStatus: pending.state.gameStatus,
                players: playersList
              });
            }
          }, 800);

        }, 1300);

      } else {
        // Non-roll update: if a roll sequence is currently animating, queue this
        // update to be applied after the animation finishes.
        if (isSequencingRef.current) {
          pendingStateUpdateRef.current = { state: data.state, log: data.log };
          return;
        }

        // Standard immediate update
        gameStateRef.current = data.state;
        setGameState(data.state);
        pushTelemetry(data.log, data.state);

        if (data.state) {
          const playersList = Object.values(data.state.players).map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar
          }));
          setRoomDetails({
            exists: true,
            gameStatus: data.state.gameStatus,
            players: playersList
          });
        }
      }
    });

    // Handle trade negotiations
    socket.on('trade_proposed', (data: { tradeId: string; offer: TradeOfferPayload }) => {
      setPendingTrades((prev) => {
        // Prevent duplicate offers
        if (prev.some(t => t.tradeId === data.tradeId)) return prev;
        return [...prev, data];
      });
    });

    // Handle being kicked from lobby
    socket.on('kicked_from_lobby', () => {
      alert("You have been kicked from the lobby by the host.");
      window.location.href = '/';
    });

    socket.on('trade_declined', (data: { tradeId: string; log: string }) => {
      pushTelemetry(data.log, gameStateRef.current);
    });

    socket.on('trade_resolved', (data: { tradeId: string }) => {
      setPendingTrades((prev) => prev.filter(t => t.tradeId !== data.tradeId));
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

    return () => {
      socket.disconnect();
    };
  }, [roomId, playerName, userId, currentAvatar]);

  // Actions
  const updateAppearance = useCallback((newAvatar: string) => {
    setCurrentAvatar(newAvatar);
    if (socketRef.current && playerName) {
      socketRef.current.emit('join_room', { roomId, name: playerName, avatar: newAvatar });
    }
  }, [roomId, playerName]);

  const rollDice = useCallback(() => {
    console.log('[Socket Emit] roll_dice', { playerId: userId });
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

  const proposeTrade = useCallback((offer: Omit<TradeOfferPayload, 'senderId'>) => {
    console.log('[Socket Emit] propose_trade', { ...offer, senderId: userId });
    if (socketRef.current) {
      socketRef.current.emit('propose_trade', {
        ...offer,
        senderId: userId
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
      setPendingTrades([]);
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
