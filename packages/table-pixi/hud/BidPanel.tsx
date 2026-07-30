import { useEffect, useState } from 'react';
import { SUIT_SYMBOL, type Bid, type EngineView, type Seat, type Suit } from 'belote-core';
import { CAPOT, defaultStep, partnerSaidSuit, stepDown, stepUp, suivreBid, type BidStep } from './bidMath';

const SUIT_LIST: Suit[] = ['pique', 'coeur', 'carreau', 'trefle'];
const RED = new Set<Suit>(['coeur', 'carreau']);

export interface BidPanelProps {
  view: EngineView;
  mySeat: Seat;
  onBid(bid: Omit<Bid, 'seat'>): void;
}

/**
 * BidPanel — fixed-size bidding dialog:
 * - suit row: ♠ ♥ ♦ ♣ + partner-suit icon (active only if the partner said a suit)
 *   + 💭 reflexion icon (icons only, no labels);
 * - value stepper [−] value [+] starting at last announce + 10, capot after 180;
 * - three actions: Passe / Suivre (min raise with my side's suit, no reflexion) /
 *   Demande (submits exactly what is selected).
 * The hint line and the panel size NEVER change, so nothing jumps around.
 */
export function BidPanel({ view, mySeat, onBid }: BidPanelProps) {
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);
  const [repeatPartner, setRepeatPartner] = useState(false);
  const [reflexion, setReflexion] = useState(false);
  const [step, setStep] = useState<BidStep>(() => defaultStep(view));

  // Re-anchor the stepper whenever the auction moves (someone announced).
  useEffect(() => { setStep(defaultStep(view)); }, [view.currentBidValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const partnerSuit = partnerSaidSuit(view, mySeat);
  const suitResolved = selectedSuit != null || repeatPartner;
  const suivre = suivreBid(view, mySeat);
  const reset = () => { setSelectedSuit(null); setRepeatPartner(false); setReflexion(false); };

  const submitDemande = () => {
    if (!suitResolved) return;
    const base = selectedSuit != null
      ? { suit: selectedSuit, saidSuit: true as const }
      : { repeatPartnerSuit: true as const };
    if (step === CAPOT) onBid({ action: 'capot', ...base, reflexion });
    else onBid({ action: 'bid', value: step, ...base, reflexion });
    reset();
  };

  return (
    <div className="ky-bid ky-bid--fixed">
      {/* Suits + partner-suit icon + reflexion icon — icons only, fixed positions */}
      <div className="ky-bid__suits ky-bid__suits--6">
        {SUIT_LIST.map((s) => (
          <button key={s} title={s}
            className={`ky-bid__suit ${RED.has(s) ? 'is-red' : 'is-black'} ${selectedSuit === s ? 'is-on' : ''}`}
            onClick={() => { setSelectedSuit(s); setRepeatPartner(false); }}>
            {SUIT_SYMBOL[s]}
          </button>
        ))}
        <button
          className={`ky-bid__suit ky-bid__suit--partner ${partnerSuit && RED.has(partnerSuit) ? 'is-red' : 'is-black'} ${repeatPartner ? 'is-on' : ''}`}
          title={partnerSuit ? 'Répéter la couleur du coéquipier' : 'Votre coéquipier n\'a pas annoncé de couleur'}
          disabled={!partnerSuit}
          onClick={() => { setRepeatPartner((v) => { const nv = !v; if (nv) setSelectedSuit(null); return nv; }); }}>
          {partnerSuit ? <>↩{SUIT_SYMBOL[partnerSuit]}</> : '↩'}
        </button>
        <button
          className={`ky-bid__suit ky-bid__suit--reflexion ${reflexion ? 'is-on' : ''}`}
          title="Réflexion"
          onClick={() => setReflexion((v) => !v)}>
          💭
        </button>
      </div>


      {/* Valeur + actions sur une ligne compacte */}
      <div className="ky-bid__controls">
        <div className="ky-bid__stepper">
          <button className="ky-bid__stepbtn" onClick={() => setStep(stepDown(view, step))} aria-label="Baisser">−</button>
          <div className={`ky-bid__stepval ${step === CAPOT ? 'is-capot' : ''}`}>
            {step === CAPOT ? '👑' : step}
          </div>
          <button className="ky-bid__stepbtn" onClick={() => setStep(stepUp(view, step))} aria-label="Monter">+</button>
        </div>
        <button className="ky-bid__pass" onClick={() => { onBid({ action: 'pass' }); reset(); }}>Passe</button>
        <button className="ky-bid__suivre" disabled={!suivre}
          title="Surenchérir de 10 avec la couleur de votre camp, sans réflexion"
          onClick={() => { if (suivre) { onBid(suivre); reset(); } }}>Suivre</button>
        <button className="ky-bid__demande" disabled={!suitResolved} onClick={submitDemande}>Demande</button>
      </div>
    </div>
  );
}
