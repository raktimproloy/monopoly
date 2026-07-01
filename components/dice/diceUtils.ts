import { DICE_RESULT_MS } from '@/constants/timing';

/** Target rotations so each face (1–6) faces the camera. Ported from dice-design/our-site. */
export const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 180, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 0 },
};

const BASE_Z_TILT: Record<0 | 1, number> = {
  0: -76,
  1: -256,
};

/** Resting pose for a given value (no spin). */
export function idleTransform(value: number, index: 0 | 1): string {
  const rot = FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1];
  const z = BASE_Z_TILT[index];
  return `rotateZ(${z}deg) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
}

/** Roll animation target with cumulative spins (matches our-site physics). */
export function rollTransform(value: number, rollCount: number, index: 0 | 1): string {
  const rot = FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1];
  const spinsX = 3;
  const spinsY = 3;
  const randZ = Math.floor(Math.random() * 180) - 90;
  const baseZ = BASE_Z_TILT[index];

  const x =
    index === 0
      ? rot.x + 360 * spinsX * rollCount
      : rot.x - 360 * spinsX * rollCount;
  const y = rot.y + 360 * spinsY * rollCount;

  return `rotateZ(${baseZ + randZ}deg) rotateX(${x}deg) rotateY(${y}deg)`;
}

export const DICE_ROLL_MS = DICE_RESULT_MS;
export const DICE_JUMP_PEAK_MS = 300;
