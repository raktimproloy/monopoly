"use client";

import { GameState, BoardTile } from '@/shared/types';

interface PropertyManagerProps {
  gameState: GameState;
  boardTiles: BoardTile[];
  userId: string;
  onMortgageProperty: (index: number) => void;
  onUnmortgageProperty: (index: number) => void;
}

export default function PropertyManager(props: PropertyManagerProps) {
  // Functionality migrated to TradePanel to avoid duplication. 
  // Component retained as empty shell to prevent breaking layout imports.
  return null; 
}
