import { GameState, BoardTile } from '../../shared/types';

export type CompleteSetKey = string; // `${ownerId}:${group}`

/** Returns all color groups fully owned by one player (none mortgaged — can build). */
export function getCompleteSets(gameState: GameState, boardTiles: BoardTile[]): Set<CompleteSetKey> {
  const sets = new Set<CompleteSetKey>();
  const groupTiles = new Map<string, BoardTile[]>();

  boardTiles.forEach((t) => {
    if (t.type === 'STREET' && t.group) {
      const list = groupTiles.get(t.group) || [];
      list.push(t);
      groupTiles.set(t.group, list);
    }
  });

  for (const [group, tiles] of groupTiles) {
    const props = tiles.map((t) => gameState.properties[t.index]);
    const ownerId = props[0]?.ownerId;
    if (!ownerId) continue;

    const allOwned = props.every((p) => p && p.ownerId === ownerId);
    const noneMortgaged = props.every((p) => p && !p.isMortgaged);
    if (allOwned && noneMortgaged && props.length === tiles.length) {
      sets.add(`${ownerId}:${group}`);
    }
  }

  return sets;
}

/** Glow info for a tile that belongs to a completed color set. */
export function getTileCompleteSetGlow(
  tile: BoardTile,
  gameState: GameState,
  boardTiles: BoardTile[]
): { ownerId: string; color: string } | null {
  if (tile.type !== 'STREET' || !tile.group) return null;

  const groupTiles = boardTiles.filter((t) => t.group === tile.group && t.type === 'STREET');
  const props = groupTiles.map((t) => gameState.properties[t.index]);
  const ownerId = props[0]?.ownerId;
  if (!ownerId) return null;

  const allOwned = props.every((p) => p && p.ownerId === ownerId);
  const noneMortgaged = props.every((p) => p && !p.isMortgaged);
  if (!allOwned || !noneMortgaged) return null;

  const owner = gameState.players[ownerId];
  if (!owner) return null;

  return { ownerId, color: owner.avatar };
}
