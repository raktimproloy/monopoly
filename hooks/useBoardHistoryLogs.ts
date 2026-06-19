import { useEffect, useRef, useState } from 'react';
import { GameState } from '../../shared/types';

const ROLL_MOVEMENT_LOG = /রোল:|➡️/;

function isMovementLog(log: string): boolean {
  return ROLL_MOVEMENT_LOG.test(log);
}

function activePlayerMoved(gameState: GameState, prevPositions: Record<string, number>): boolean {
  const activeId = gameState.currentTurnPlayerId;
  if (!activeId) return false;
  const prev = prevPositions[activeId];
  const next = gameState.players[activeId]?.position;
  return prev !== undefined && next !== undefined && prev !== next;
}

/** Delays movement-related history until dice + token animation finish. */
export function useBoardHistoryLogs(logs: string[], gameState: GameState, delayMs: number): string[] {
  const [displayLogs, setDisplayLogs] = useState(logs);
  const prevLogsRef = useRef(logs);
  const prevPositionsRef = useRef<Record<string, number>>({});
  const latestLogsRef = useRef(logs);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  latestLogsRef.current = logs;

  useEffect(() => {
    const prevLogs = prevLogsRef.current;
    prevLogsRef.current = logs;

    const positions: Record<string, number> = {};
    Object.values(gameState.players).forEach((p) => {
      positions[p.id] = p.position;
    });

    if (logs.length < prevLogs.length) {
      clearTimeout(delayTimerRef.current);
      setDisplayLogs(logs);
      prevPositionsRef.current = positions;
      return;
    }

    if (logs.length === prevLogs.length && logs.every((l, i) => l === prevLogs[i])) {
      prevPositionsRef.current = positions;
      return;
    }

    const addedCount = logs.length - prevLogs.length;
    const newEntries = addedCount > 0 ? logs.slice(0, addedCount) : [];
    const moved = activePlayerMoved(gameState, prevPositionsRef.current);
    const shouldDelay = moved && newEntries.some(isMovementLog);

    prevPositionsRef.current = positions;

    if (shouldDelay) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = setTimeout(() => {
        setDisplayLogs(latestLogsRef.current);
      }, delayMs);
      return;
    }

    clearTimeout(delayTimerRef.current);
    setDisplayLogs(logs);

    return () => clearTimeout(delayTimerRef.current);
  }, [logs, gameState, delayMs]);

  return displayLogs;
}
