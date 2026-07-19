import { SUIT_SYMBOL, type Card, type Seat, type Suit, type TrickView } from 'belote-core';
import { PlayingCard } from '../../ds/table/PlayingCard';
import { toDsSuit, seatDir, type Dir } from '../../ds/map';

const isRed = (s: Suit) => s === 'coeur' || s === 'carreau';

export interface TrickAreaProps {
  /** Cartes du pli en cours (siège + carte). */
  plays: { seat: Seat; card: Card }[];
  /** Siège de référence (sud) pour orienter les cartes. */
  south: Seat;
  /** Siège gagnant en attente de ramassage (lueur), sinon null. */
  winnerSeat?: Seat | null;
  /** Direction du gagnant pour l'animation de ramassage, sinon null. */
  collectDir?: Dir | null;
}

/**
 * TrickArea — VUE autonome du pli central : place chaque carte selon l'orientation du
 * joueur et déclenche l'animation de ramassage vers le gagnant. Pilotée uniquement par props.
 */
export function TrickArea({ plays, south, winnerSeat = null, collectDir = null }: TrickAreaProps) {
  return (
    <div className={`gt-trick ${collectDir ? `collect-${collectDir}` : ''}`}>
      {plays.map((t) => {
        const dir = seatDir(t.seat, south);
        const win = winnerSeat === t.seat;
        return (
          <div key={`${t.card.rank}${t.card.suit}`} className={`gt-slot dir-${dir}`}>
            <PlayingCard rank={t.card.rank} suit={toDsSuit(t.card.suit)} size="md" winning={win} />
          </div>
        );
      })}
    </div>
  );
}

export interface LastTrickPanelProps {
  /** Dernier pli ramassé (ou null/undefined pour masquer le panneau). */
  lastTrick?: TrickView | null;
}

/**
 * LastTrickPanel — VUE autonome du mini-récapitulatif « Dernier pli ».
 * Surligne la carte gagnante. Aucune dépendance à l'état de la table.
 */
export function LastTrickPanel({ lastTrick }: LastTrickPanelProps) {
  if (!lastTrick) return null;
  return (
    <div className="gt-last">
      <div className="gt-last-title">Dernier pli</div>
      <div className="gt-last-row">
        {lastTrick.plays.map((p, i) => (
          <span key={i} className={`gt-mini ${isRed(p.card.suit) ? 'red' : ''} ${lastTrick.winnerSeat === p.seat ? 'win' : ''}`}>
            {p.card.rank}{SUIT_SYMBOL[p.card.suit]}
          </span>
        ))}
      </div>
    </div>
  );
}
