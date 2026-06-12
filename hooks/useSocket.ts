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
  const [roomDetails, setRoomDetails] = useState<{
    exists: boolean;
    gameStatus: string;
    players: { id: string; name: string; avatar: string }[];
  } | null>(null);

  const refetchRoomDetails = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('get_room_details', { roomId }, (response: any) => {
        if (response && !response.error) {
          setRoomDetails(response);
        }
      });
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !userId) return;

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
      
      // Fetch room details on connect
      socket.emit('get_room_details', { roomId }, (response: any) => {
        if (response && !response.error) {
          setRoomDetails(response);
        }
      });

      // Join game session only if playerName is provided
      if (playerName && avatar) {
        socket.emit('join_room', { roomId, name: playerName, avatar });
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
      setGameState(data.state);
      setBoardTiles(data.board);
      setLogs([`Joined room ${roomId} as ${playerName || 'Guest'}`]);
    });

    // Handle state mutations
    socket.on('state_updated', (data: { state: GameState; log: string }) => {
      setGameState(data.state);
      setLogs((prev) => [data.log, ...prev]);

      // Refresh room details if we receive updates, to keep taken avatars synced
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
    });

    // Handle trade negotiations
    socket.on('trade_proposed', (data: { tradeId: string; offer: TradeOfferPayload }) => {
      setPendingTrade(data);
    });

    socket.on('trade_declined', (data: { tradeId: string; log: string }) => {
      setLogs((prev) => [data.log, ...prev]);
    });

    socket.on('trade_resolved', (data: { tradeId: string }) => {
      setPendingTrade((prev) => (prev && prev.tradeId === data.tradeId ? null : prev));
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
      setPendingTrade(null);
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

  return {
    isConnected,
    gameState,
    boardTiles,
    logs,
    pendingTrade,
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
    auctionProperty
  };
}
