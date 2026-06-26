import { GameState } from '@/shared/types';

export function isPropertyHijackedByDon(gameState: GameState, tileIndex: number): boolean {
  const donPower = gameState.activeDonPower;
  if (!donPower || !donPower.targetTileIndexes.includes(tileIndex)) return false;
  const donPlayer = gameState.players[donPower.donPlayerId];
  return !!(donPlayer && !donPlayer.inJail);
}

export function isPropertyFrozenForOwner(
  gameState: GameState,
  tileIndex: number,
  ownerId: string
): boolean {
  const donPower = gameState.activeDonPower;
  if (!donPower || !donPower.targetTileIndexes.includes(tileIndex)) return false;
  if (donPower.originalOwnerId !== ownerId) return false;
  return isPropertyHijackedByDon(gameState, tileIndex);
}
