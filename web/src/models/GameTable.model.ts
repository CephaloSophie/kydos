export interface TableSeat {
  index: number;
  kind: 'empty' | 'human' | 'robot';
  name: string;
  team: 'A' | 'B';
  userId: string | null;
  robotId: string | null;
  ownerId: string | null;
}

export interface GameTableConfig {
  manches: number;
  trickDelayMs: number;
  speed: number;
  gameType: string;
  maxPlayers: number;
  allowSpectators: boolean;
  feltTheme: 'classic' | 'cosmos' | 'olympus';
  turnTimeoutMs: number;
  surcoincheWindowMs: number;
  notifyMs: number;
  atoutGlyphOpacity: number;
}

/** Une table de jeu persistée, telle que renvoyée par l'API. */
export interface GameTable {
  id: string;
  status: string;
  ownerType: string;
  owner: string;
  visibility: string;
  config: GameTableConfig;
  startsAt: string | null;
  seats: TableSeat[];
}
