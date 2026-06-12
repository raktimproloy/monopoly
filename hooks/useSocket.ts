import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, BoardTile, TradeOfferPayload, GameSettings } from '../../shared/types';

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
  const [logs, setLogs] = useState<string[]>([]);
  const [pendingTrade, setPendingTrade] = useState<{ tradeId: string; offer: TradeOfferPayload } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !playerName) return;

    // Connect to Socket.io server with auth credentials
    const socket = io(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001', {
      auth: { userId },
      query: { userId },
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setErrorMessage(null);
      // Join game session with avatar color!
      socket.emit('join_room', { roomId, name: playerName, avatar });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setErrorMessage(`Connection error: ${err.message}`);
    });

    // Handle initial room setup
    socket.on('room_initialized', (data: { state: GameState; board: BoardTile[] }) => {
      setGameState(data.state);
      setBoardTiles(data.board);
      setLogs([`Joined room ${roomId} as ${playerName}`]);
    });

    // Handle state mutations
    socket.on('state_updated', (data: { state: GameState; log: string }) => {
      setGameState(data.state);
      setLogs((prev) => [data.log, ...prev]);
    });

    // Handle trade negotiations
    socket.on('trade_proposed', (data: { tradeId: string; offer: TradeOfferPayload }) => {
      setPendingTrade(data);
    });

    socket.on('trade_declined', (data: { tradeId: string; log: string }) => {
      setLogs((prev) => [data.log, ...prev]);
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
  }, [roomId, playerName, userId, avatar]);

  // Actions
  const rollDice = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('roll_dice', { playerId: userId });
    }
  }, [userId]);

  const buyProperty = useCallback((tileIndex: number) => {
    if (socketRef.current) {
      socketRef.current.emit('buy_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const mortgageProperty = useCallback((tileIndex: number) => {
    if (socketRef.current) {
      socketRef.current.emit('mortgage_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const unmortgageProperty = useCallback((tileIndex: number) => {
    if (socketRef.current) {
      socketRef.current.emit('unmortgage_property', { playerId: userId, tileIndex });
    }
  }, [userId]);

  const proposeTrade = useCallback((offer: Omit<TradeOfferPayload, 'senderId'>) => {
    if (socketRef.current) {
      socketRef.current.emit('propose_trade', {
        ...offer,
        senderId: userId
      });
    }
  }, [userId]);

  const respondToTrade = useCallback((tradeId: string, accept: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit('respond_to_trade', {
        playerId: userId,
        tradeId,
        accept
      });
      setPendingTrade(null);
    }
  }, [userId]);

  const endTurn = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('end_turn', { playerId: userId });
    }
  }, [userId]);

  const updateSettings = useCallback((settings: GameSettings) => {
    if (socketRef.current) {
      socketRef.current.emit('update_settings', { settings, playerId: userId });
    }
  }, [userId]);

  const startGame = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('start_game', { playerId: userId });
    }
  }, [userId]);

  return {
    isConnected,
    gameState,
    boardTiles,
    logs,
    pendingTrade,
    errorMessage,
    clearError: () => setErrorMessage(null),
    rollDice,
    buyProperty,
    mortgageProperty,
    unmortgageProperty,
    proposeTrade,
    respondToTrade,
    endTurn,
    updateSettings,
    startGame
  };
}
