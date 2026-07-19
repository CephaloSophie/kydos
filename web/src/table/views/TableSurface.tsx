import { type Bid, type Card, type EngineView, type ScoreSummary, type Seat } from 'belote-core';
import { GameTable, type TableVisualConfig } from './GameTable';

export interface TableSurfaceProps {
  view: EngineView;
  names: string[];
  hands: (Card[] | null)[];
  mySeat: Seat | null;
  legal?: Card[];
  onBid?: (bid: Omit<Bid, 'seat'>) => void;
  onPlay?: (card: Card) => void;
  manches?: number;
  summary?: ScoreSummary;
  config?: TableVisualConfig;
}

/** Adaptateur léger autour de GameTable : l'enchère (UI centrale) et le contre
 *  sont désormais rendus DANS la table elle-même. */
export function TableSurface({ view, names, hands, mySeat, legal, onBid, onPlay, summary, config }: TableSurfaceProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <GameTable
        view={view} names={names} hands={hands} mySeat={mySeat} legal={legal}
        onBid={onBid} onPlay={onPlay} summary={summary} config={config}
      />
    </div>
  );
}
