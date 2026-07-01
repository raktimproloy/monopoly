"use client";

import { useEffect, useRef, useState } from 'react';
import DiceCube from './DiceCube';
import {
  DICE_JUMP_PEAK_MS,
  idleTransform,
  rollTransform,
} from './diceUtils';
import './dice.css';

interface DicePairProps {
  values: [number, number];
  rollTrigger: number;
}

function clampFace(v: number): number {
  return v >= 1 && v <= 6 ? v : 1;
}

export default function DicePair({ values, rollTrigger }: DicePairProps) {
  const v1 = clampFace(values[0]);
  const v2 = clampFace(values[1]);

  const [transforms, setTransforms] = useState<[string, string]>([
    idleTransform(v1, 0),
    idleTransform(v2, 1),
  ]);
  const [jumping, setJumping] = useState<[boolean, boolean]>([false, false]);
  const rollCountRef = useRef(0);
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle pose when values change without an active roll animation.
  useEffect(() => {
    if (rollTrigger === 0) {
      setTransforms([idleTransform(v1, 0), idleTransform(v2, 1)]);
    }
  }, [v1, v2, rollTrigger]);

  useEffect(() => {
    if (rollTrigger === 0) return;

    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);

    rollCountRef.current += 1;
    const count = rollCountRef.current;

    setJumping([true, true]);
    setTransforms([
      rollTransform(v1, count, 0),
      rollTransform(v2, count, 1),
    ]);

    jumpTimerRef.current = setTimeout(() => {
      setJumping([false, false]);
      jumpTimerRef.current = null;
    }, DICE_JUMP_PEAK_MS);

    return () => {
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
    };
  }, [rollTrigger, v1, v2]);

  return (
    <div className="bd-dice">
      <div className="bd-dice__pair" aria-label="dice">
        <DiceCube index={0} value={v1} isJumping={jumping[0]} transform={transforms[0]} />
        <DiceCube index={1} value={v2} isJumping={jumping[1]} transform={transforms[1]} />
      </div>
    </div>
  );
}
