import { create, Delta } from 'jsondiffpatch';
import { GameState } from '@/shared/types';

const objectHash = (item: object, index?: number): string | undefined => {
  const obj = item as Record<string, unknown>;
  const id = obj.id ?? obj.roomId;
  if (typeof id === 'string') return id;
  return index !== undefined ? String(index) : undefined;
};

const patcher = create({
  objectHash,
  arrays: { detectMove: true, includeValueOnMove: false },
});

/** Wire format emitted by the server (`state_delta` event). */
export interface StateDeltaPayload {
  full: boolean;
  version: number;
  seq: number;
  log: string;
  delta?: Delta;
  state?: GameState;
  lastRoll?: [number, number];
  origin?: string;
}

export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function applyStateDelta(base: GameState, delta: Delta | undefined): GameState {
  if (!delta) return cloneState(base);
  return patcher.patch(cloneState(base), delta) as GameState;
}

/**
 * Merge authoritative server data into local state.
 * Returns null when the patch cannot be applied (client should request full sync).
 */
export function mergeServerPayload(
  current: GameState | null,
  payload: StateDeltaPayload
): GameState | null {
  if (payload.full && payload.state) {
    return cloneState(payload.state);
  }
  if (!current || !payload.delta) return payload.state ? cloneState(payload.state) : null;
  try {
    return applyStateDelta(current, payload.delta);
  } catch {
    return payload.state ? cloneState(payload.state) : null;
  }
}
