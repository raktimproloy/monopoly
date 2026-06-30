"use client";

import { useEffect, useRef, useState } from 'react';
import { GameState } from '@/shared/types';
import Dice3D from './Dice3D';

interface DiceManagerProps {
  gameState: GameState;
  /** True while waiting for authoritative roll result after local emit. */
  isPredictingRoll?: boolean;
}

export default function DiceManager({ gameState, isPredictingRoll = false }: DiceManagerProps) {
  const [rollTrigger, setRollTrigger] = useState(0);
  const [displayValues, setDisplayValues] = useState<[number, number]>(
    gameState.dice && gameState.dice[0] > 0 ? gameState.dice : [1, 1]
  );

  const prevDice = useRef<[number, number]>(gameState.dice || [0, 0]);
  const prevRollCounter = useRef<number>(gameState.rollCounter || 0);
  const prevPredicting = useRef(false);

  useEffect(() => {
    if (!gameState) return;

    const rollCounterIncreased = (gameState.rollCounter || 0) > prevRollCounter.current;
    const predictionStarted = isPredictingRoll && !prevPredicting.current;

    if (rollCounterIncreased) {
      setDisplayValues(gameState.dice);
      setRollTrigger((prev) => prev + 1);
    } else if (predictionStarted) {
      // Optimistic: start dice physics immediately before server delta arrives
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

    prevRollCounter.current = gameState.rollCounter || 0;
    prevDice.current = gameState.dice || [0, 0];
    prevPredicting.current = isPredictingRoll;
  }, [gameState, isPredictingRoll]);

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
