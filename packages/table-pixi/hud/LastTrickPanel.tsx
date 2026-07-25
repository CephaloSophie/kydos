import { SUIT_SYMBOL, type Seat, type Suit, type TrickView } from 'belote-core';

const isRed = (s: Suit) => s === 'coeur' || s === 'carreau';

/**
 * LastTrickPanel — design-system LastTrick: mini cards; the WINNING card gets the
 * gold winner style, and MY OWN card gets a distinct blue shadow (is-mine).
 */
export function LastTrickPanel({ lastTrick, mySeat }: { lastTrick?: TrickView | null; mySeat?: Seat | null }) {
  if (!lastTrick) return null;
  // Signature du pli : change à chaque nouveau pli → React remonte le nœud et
  // rejoue l'animation de montée (ky-lasttrick-rise).
  const sig = lastTrick.plays.map((p) => `${p.seat}${p.card.rank}${p.card.suit}`).join('');
  return (
    <div className="px-last-slot" key={sig}>
      <div className="ky-lasttrick">
        <span className="ky-lasttrick__label">Dernier pli</span>
        <div className="ky-lasttrick__row">
          {lastTrick.plays.map((p, i) => (
            <div key={i} className={`ky-lasttrick__cell ${lastTrick.winnerSeat === p.seat ? 'is-winner' : ''} ${mySeat != null && p.seat === mySeat ? 'is-mine' : ''}`}>
              <div className={`ky-minicard ${isRed(p.card.suit) ? 'is-red' : 'is-black'}`}>
                <span>{p.card.rank}</span>
                <span className="s">{SUIT_SYMBOL[p.card.suit]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
