"use client";

import { useEffect, useRef, useState } from 'react';
import { GameState } from '@/shared/types';
import DicePair from './DicePair';

interface DiceManagerProps {
  gameState: GameState;
  /** True while waiting for authoritative roll result after local emit. */
  isPredictingRoll?: boolean;
}

function isDisplayableDice(dice: [number, number] | undefined): dice is [number, number] {
  if (!dice) return false;
  return dice[0] >= 1 && dice[0] <= 6 && dice[1] >= 1 && dice[1] <= 6;
}

export default function DiceManager({ gameState, isPredictingRoll = false }: DiceManagerProps) {
  const [rollTrigger, setRollTrigger] = useState(0);
  const [displayValues, setDisplayValues] = useState<[number, number]>(() =>
    isDisplayableDice(gameState.dice) ? gameState.dice : [1, 1]
  );

  const prevDice = useRef<[number, number]>(gameState.dice || [0, 0]);
  const prevRollCounter = useRef<number>(gameState.rollCounter || 0);
  const prevPredicting = useRef(false);

  useEffect(() => {
    if (!gameState) return;

    const rollCounterIncreased = (gameState.rollCounter || 0) > prevRollCounter.current;
    const predictionStarted = isPredictingRoll && !prevPredicting.current;

    if (rollCounterIncreased) {
      if (isDisplayableDice(gameState.dice)) {
        setDisplayValues(gameState.dice);
      }
      setRollTrigger((prev) => prev + 1);
    } else if (predictionStarted) {
      setRollTrigger((prev) => prev + 1);
    } else {
      const diceChanged = gameState.dice && (
        gameState.dice[0] !== prevDice.current[0] ||
        gameState.dice[1] !== prevDice.current[1]
      );
      // Keep last rolled faces visible when server clears dice ([0,0]) on end turn.
      if (diceChanged && isDisplayableDice(gameState.dice)) {
        setDisplayValues(gameState.dice);
      }
    }

    prevRollCounter.current = gameState.rollCounter || 0;
    prevDice.current = gameState.dice || [0, 0];
    prevPredicting.current = isPredictingRoll;
  }, [gameState, isPredictingRoll]);

  return (
    <div className="w-full mx-auto flex flex-col items-center justify-center bg-transparent">
      <DicePair values={displayValues} rollTrigger={rollTrigger} />
    </div>
  );
}
