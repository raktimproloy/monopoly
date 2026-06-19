import { useEffect, useRef } from 'react';
import { GameState, BoardTile } from '../../shared/types';
import { soundManager } from '../utils/soundManager';
import { getCompleteSets } from '../utils/propertySets';

export function useGameSounds(
  gameState: GameState | null,
  logs: string[],
  userId: string,
  pendingTrades: { tradeId: string }[] = [],
  boardTiles: BoardTile[] = []
) {
  const prevGameStatus = useRef<string | null>(null);
  const prevTurnPlayerId = useRef<string | null>(null);
  const prevLogsLength = useRef<number>(0);
  const prevPlayersCount = useRef<number>(0);
  const prevPendingTradesCount = useRef<number>(0);
  const prevCompleteSets = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!gameState || boardTiles.length === 0) return;

    const currentSets = getCompleteSets(gameState, boardTiles);

    // Detect Game Start — snapshot sets without playing sounds
    if (gameState.gameStatus === 'ACTIVE' && prevGameStatus.current !== 'ACTIVE') {
      prevCompleteSets.current = currentSets;
    } else if (gameState.gameStatus === 'ACTIVE') {
      currentSets.forEach((key) => {
        if (!prevCompleteSets.current.has(key)) {
          soundManager.playEventSound('COMPLETE_SET');
        }
      });
      prevCompleteSets.current = currentSets;
    } else {
      prevCompleteSets.current = new Set();
    }

    // Detect Game Start
    if (gameState.gameStatus === 'ACTIVE' && prevGameStatus.current !== 'ACTIVE') {
      soundManager.playEventSound('GAME_START');
    }
    prevGameStatus.current = gameState.gameStatus;

    // Detect Your Turn
    if (gameState.currentTurnPlayerId === userId && prevTurnPlayerId.current !== userId) {
      soundManager.playEventSound('YOUR_TURN');
    }
    prevTurnPlayerId.current = gameState.currentTurnPlayerId;

    // Detect Player Join
    const currentPlayersCount = Object.keys(gameState.players).length;
    if (currentPlayersCount > prevPlayersCount.current && prevPlayersCount.current > 0) {
      soundManager.playEventSound('PLAYER_JOIN');
    }
    prevPlayersCount.current = currentPlayersCount;

    // Detect Trade Open
    if (pendingTrades.length > prevPendingTradesCount.current) {
      soundManager.playEventSound('TRADE_OPEN');
    }
    prevPendingTradesCount.current = pendingTrades.length;

  }, [gameState, userId, pendingTrades, boardTiles]);

  useEffect(() => {
    // Detect new events from logs
    if (logs.length > prevLogsLength.current) {
      const newLogsCount = logs.length - prevLogsLength.current;
      const newLogs = logs.slice(0, newLogsCount);

      newLogs.forEach(log => {
        if (!log) return;
        
        const lowerLog = log.toLowerCase();
        
        if (lowerLog.includes('কিনেছেন') || lowerLog.includes('অধিগ্রহণ')) {
          soundManager.playEventSound('BUY_PROPERTY');
        } else if (lowerLog.includes('বানিয়েছেন')) {
          if (lowerLog.includes('hotel')) {
            soundManager.playEventSound('BUILD_HOTEL');
          } else {
            soundManager.playEventSound('BUILD_HOUSE');
          }
        } else if (lowerLog.includes('ভাগ্য পরীক্ষা') || lowerLog.includes('গুপ্তধন')) {
          soundManager.playEventSound('RECEIVE_CARD');
        } else if (lowerLog.includes('চুক্তি সম্পন্ন')) {
          soundManager.playEventSound('TRADE_ACCEPT');
        } else if (lowerLog.includes('প্রস্তাব বাতিল')) {
          soundManager.playEventSound('TRADE_DECLINED');
        } else if (lowerLog.includes('রোল:')) {
          soundManager.playEventSound('DICE_ROLL');
        } else if (lowerLog.includes('বিড:')) {
          soundManager.playEventSound('MONEY_TRANSACTION');
        }
      });
    }

    prevLogsLength.current = logs.length;
  }, [logs]);

  return { soundManager };
}
