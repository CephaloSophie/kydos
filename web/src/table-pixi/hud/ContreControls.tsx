import type { Bid, EngineView, Seat } from 'belote-core';

export interface ContreControlsProps {
  view: EngineView;
  mySeat: Seat;
  onBid(bid: Omit<Bid, 'seat'>): void;
}

/**
 * ContreControls — design-system:
 * ✕ COINCHER — red pill bottom-right during bidding;
 * surcoinche popup (Passer / ✕✕ Surcoincher) in a scrim while phase = surcontre.
 */
export function ContreControls({ view, mySeat, onBid }: ContreControlsProps) {
  const canContre = view.phase === 'bidding' && view.contreSeats.includes(mySeat);
  const canSurcontre = view.phase === 'surcontre' && view.surcontreSeats.includes(mySeat);
  return (
    <>
      {canContre && (
        <div className="px-contre-slot">
          <button className="ky-contrer__btn" onClick={() => onBid({ action: 'contree' })}>
            <span className="ky-contrer__ico">✕</span> Coincher
          </button>
        </div>
      )}
      {canSurcontre && (
        <div className="px-scrim">
          <div className="ky-contrer__popup">
            <h4 className="ky-contrer__title">L'adversaire a coinché</h4>
            <div className="ky-contrer__row">
              <button className="ky-contrer__pass" onClick={() => onBid({ action: 'pass' })}>Passer</button>
              <button className="ky-contrer__go" onClick={() => onBid({ action: 'surcontree' })}>✕✕ Surcoincher</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
