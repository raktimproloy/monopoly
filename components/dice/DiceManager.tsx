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
  const prevRollCounter = useRef<number>(gameState.rollCounter || 0);

  useEffect(() => {
    if (!gameState) return;

    // Detect if a roll event occurred using the new rollCounter
    const rollCounterIncreased = (gameState.rollCounter || 0) > prevRollCounter.current;

    if (rollCounterIncreased) {
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
    prevRollCounter.current = gameState.rollCounter || 0;
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
