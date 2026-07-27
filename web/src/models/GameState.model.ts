import type { Card } from 'belote-core';

export interface GameState {
  view: any;
  summary: any;
  myHand?: Card[];
  legal?: Card[];
  mySeat?: number | null;
  hands?: Card[][];
  watcher?: boolean;
}
