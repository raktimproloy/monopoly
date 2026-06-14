import { useEffect, useRef } from 'react';
import { GameState } from '../../shared/types';
import { soundManager } from '../utils/soundManager';

export function useGameSounds(
  gameState: GameState | null,
  logs: string[],
  userId: string
) {
  const prevGameStatus = useRef<string | null>(null);
  const prevLogsLength = useRef<number>(0);

  useEffect(() => {
    if (!gameState) return;

    // Detect Game Start
    if (gameState.gameStatus === 'ACTIVE' && prevGameStatus.current !== 'ACTIVE') {
      soundManager.playEventSound('GAME_START');
    }
    prevGameStatus.current = gameState.gameStatus;

  }, [gameState]);

  useEffect(() => {
    // Detect new events from logs
    if (logs.length > prevLogsLength.current) {
      // Get the newly added logs (since logs are unshifted, new logs are at the beginning)
      const newLogsCount = logs.length - prevLogsLength.current;
      const newLogs = logs.slice(0, newLogsCount);

      newLogs.forEach(log => {
        if (!log) return;
        
        const lowerLog = log.toLowerCase();
        
        if (lowerLog.includes('bought') || lowerLog.includes('purchased') || lowerLog.includes('won auction') || lowerLog.includes('কিনে') || lowerLog.includes('অধিগ্রহণ')) {
          soundManager.playEventSound('BUY_PROPERTY');
        } else if (lowerLog.includes('built a house') || lowerLog.includes('built a hotel') || lowerLog.includes('তৈরি')) {
          soundManager.playEventSound('BUILD_HOUSE');
        } else if (lowerLog.includes('drew a chance') || lowerLog.includes('drew a community chest') || lowerLog.includes('drew a card') || lowerLog.includes('ভাগ্য পরীক্ষা') || lowerLog.includes('গুপ্তধন')) {
          soundManager.playEventSound('RECEIVE_CARD');
        } else if (lowerLog.includes('rolled')) {
          // Dice sound is already handled procedurally in DiceModel.tsx but we'll integrate the MP3 there.
          // However, if we wanted to play it from logs, we could do it here. 
          // We will let DiceModel handle it for exact synchronization with the animation.
        }
      });
    }

    prevLogsLength.current = logs.length;
  }, [logs]);

  // Export the manager in case components want to manually trigger sounds or mute
  return { soundManager };
}
