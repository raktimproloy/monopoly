"use client";

import { useEffect, useRef, useState } from 'react';
import { GameState } from '../../../shared/types';
import Dice3D from './Dice3D';

interface DiceManagerProps {
  gameState: GameState;
}

export default function DiceManager({ gameState }: DiceManagerProps) {
  const [rollTrigger, setRollTrigger] = useState(0);
  const [displayValues, setDisplayValues] = useState<[number, number]>(
    gameState.dice && gameState.dice[0] > 0 ? gameState.dice : [1, 1]
  );

  const prevDice = useRef<[number, number]>(gameState.dice || [0, 0]);
  const prevPlayer = useRef<string>(gameState.currentTurnPlayerId || '');
  const prevDoubleCount = useRef<number>(gameState.doubleRollCount || 0);
  const prevTurnStatus = useRef<string>(gameState.turnStatus || 'MUST_ROLL');

  useEffect(() => {
    if (!gameState) return;

    const wasMustRoll = prevTurnStatus.current === 'MUST_ROLL';
    const isMustActOrEnd = gameState.turnStatus === 'MUST_ACT_OR_END';
    const doubleRollIncreased = gameState.doubleRollCount > prevDoubleCount.current;
    const isSamePlayer = gameState.currentTurnPlayerId === prevPlayer.current;

    // Detect if a roll event occurred
    const rolled = isSamePlayer && (
      (wasMustRoll && isMustActOrEnd) ||
      (wasMustRoll && doubleRollIncreased)
    );

    if (rolled) {
      // Use the actual rolled values from the game state
      setDisplayValues(gameState.dice);
      // Increment trigger to start 3D physics roll animation
      setRollTrigger((prev) => prev + 1);
    } else {
      // If we aren't starting a new roll, but the dice values changed (e.g. game initialized or hard reset)
      const diceChanged = gameState.dice && (
        gameState.dice[0] !== prevDice.current[0] || 
        gameState.dice[1] !== prevDice.current[1]
      );
      if (diceChanged) {
        setDisplayValues(gameState.dice);
      }
    }

    // Sync refs
    prevTurnStatus.current = gameState.turnStatus;
    prevDoubleCount.current = gameState.doubleRollCount;
    prevPlayer.current = gameState.currentTurnPlayerId;
    prevDice.current = gameState.dice || [0, 0];
  }, [gameState]);

  return (
    <div className="w-full mx-auto flex flex-col items-center justify-center bg-transparent">
      <Dice3D
        values={displayValues}
        rollTrigger={rollTrigger}
        borderColor="#ffffff" 
        dotColor="#111111"    
      />
    </div>
  );
}
