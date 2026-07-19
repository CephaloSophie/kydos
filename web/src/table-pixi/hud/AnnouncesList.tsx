import { SUIT_SYMBOL, type Bid, type EngineView, type Seat, type Suit } from 'belote-core';

const isRed = (s: Suit) => s === 'coeur' || s === 'carreau';

export interface AnnouncesListProps { view: EngineView; names: string[]; mySeat: Seat | null; showReflexion?: boolean }

/**
 * AnnouncesList — design-system AnnouncementsRecap: pill rows, left border
 * yellow (us) / red (them), name + value + who. Shown until the first card.
 */
export function AnnouncesList({ view, names, mySeat, showReflexion = true }: AnnouncesListProps) {
  if (!(view.bids.length > 0 && view.currentTrick.length === 0 && !view.lastTrick)) return null;
  const viewerTeam = mySeat != null ? mySeat % 2 : 0;
  const isUs = (s: Seat) => s % 2 === viewerTeam;
  const atout = view.trump ? SUIT_SYMBOL[view.trump] : null;
  const label = (b: Bid) => {
    if (b.action === 'pass') return 'passe';
    if (b.action === 'contree') return 'coinche !';
    if (b.action === 'surcontree') return 'surcoinche !';
    const suit = b.saidSuit && b.suit ? ` ${SUIT_SYMBOL[b.suit]}` : '';
    return `${b.action === 'capot' ? 'capot' : b.value ?? ''}${suit}${showReflexion && b.reflexion ? ' 💭' : ''}`;
  };
  return (
    <div className="ky-recap">
        {view.bidderSeat != null && view.currentBidValue != null && (
          <div className="ky-recap__head">{atout} {isUs(view.bidderSeat) ? 'Nous' : 'Adversaire'} prend {view.currentBidValue}</div>
        )}
        {view.bids.slice(-4).map((b, i) => (
          <div key={i} className={`ky-recap__row ky-recap__row--${isUs(b.seat) ? 'us' : 'them'}`}>
            <span className="ky-recap__name">{names[b.seat]}</span>
            <span className="ky-recap__value">{label(b)}</span>
            <span className="ky-recap__who">{isUs(b.seat) ? 'nous' : 'adversaire'}</span>
          </div>
        ))}
    </div>
  );
}
