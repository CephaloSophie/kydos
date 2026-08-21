import { useEffect, useRef, useState } from 'react';
import { SUIT_SYMBOL, type Bid, type EngineView, type ScoreSummary, type Seat } from 'belote-core';
import { BidPanel } from './BidPanel';
import { ContreControls } from './ContreControls';
import { AnnouncesList } from './AnnouncesList';
import { LastTrickPanel } from './LastTrickPanel';
import { ScoreSheet, TornScore } from './ScoreSheet';
import type { CumulPoint } from './scoreSheetModel';
import { TableMessagePopup } from './TableMessagePopup';
import { MenuButton } from './MenuButton';

const teamOf = (s: number) => (s % 2 === 0 ? 'A' : 'B') as 'A' | 'B';

function bidMessage(b: Bid, name: string): string {
  if (b.action === 'pass') return `${name} passe`;
  if (b.action === 'contree') return `${name} coinche !`;
  if (b.action === 'surcontree') return `${name} surcoinche !`;
  const reflexion = b.reflexion ? ' 💭' : '';
  const suit = b.saidSuit && b.suit ? ' ' + SUIT_SYMBOL[b.suit] : '';
  if (b.action === 'capot') return `${name} annonce capot${suit}${reflexion}`;
  return `${name} annonce ${b.value ?? ''}${suit}${reflexion}`.trim();
}

export interface TableHudProps {
  view: EngineView;
  names: string[];
  mySeat: Seat | null;
  summary?: ScoreSummary;
  onBid?: (bid: Omit<Bid, 'seat'>) => void;
  onLeave?: () => void;
  onFullscreen(): void;
  onBeloteToggle?: (on: boolean) => void;
  onEmote?: (emoji: string) => void;
  notifyMs?: number;
  annonceDelayMs?: number;
  onShowDemandeInPlay(show: boolean): void;
  onShowReflexion(show: boolean): void;
  showMenu?: boolean;
  showScoreSheet?: boolean;
}

/**
 * TableHud — HTML overlay (design-system layout):
 * top-right toolbar on the rail (torn score + ☰ menu), toast top-center of felt,
 * last trick top-left, recap bottom-left, bid dialog centered, coincher bottom-right,
 * end-of-manche/game popup in a scrim. Same behavior contract as the DOM table.
 */
export function TableHud(props: TableHudProps) {
  const { view, names, mySeat, summary, onBid, notifyMs = 5000, annonceDelayMs = 2000 } = props;
  const [showScore, setShowScore] = useState(false);
  // Cumulative totals history of the CURRENT manche (one point per scoring donne).
  const cumulHistory = useRef<CumulPoint[]>([]);
  const lastManche = useRef(view.mancheIndex);
  if (view.mancheIndex !== lastManche.current) { cumulHistory.current = []; lastManche.current = view.mancheIndex; }
  {
    const h = cumulHistory.current;
    const last = h[h.length - 1] ?? { A: 0, B: 0 };
    if ((view.cumulative.A !== last.A || view.cumulative.B !== last.B) && (view.cumulative.A > 0 || view.cumulative.B > 0)) {
      h.push({ A: view.cumulative.A, B: view.cumulative.B });
    }
  }
  const [toast, setToast] = useState<string | null>(null);
  const [reflexionOn, setReflexionOn] = useState(false);
  const [emotesOpen, setEmotesOpen] = useState(false);

  // Toast after each new bid.
  const prevBids = useRef(0);
  useEffect(() => {
    if (view.bids.length > prevBids.current) {
      const b = view.bids[view.bids.length - 1];
      setToast(bidMessage(b, names[b.seat] ?? `Siège ${b.seat + 1}`));
      const id = setTimeout(() => setToast(null), notifyMs);
      prevBids.current = view.bids.length;
      return () => clearTimeout(id);
    }
    prevBids.current = view.bids.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.bids.length]);

  // Reflexion marker (💭) is shown for 2 s after a reflected bid, then hidden.
  useEffect(() => {
    const last = view.bids[view.bids.length - 1];
    if (last?.reflexion) {
      setReflexionOn(true);
      props.onShowReflexion(true);
      const id = setTimeout(() => { setReflexionOn(false); props.onShowReflexion(false); }, 2000);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.bids.length]);

  // End-of-manche popup with 5s countdown.
  const [manchePop, setManchePop] = useState<{ winner: 'A' | 'B'; t: number } | null>(null);
  const prevWon = useRef({ A: view.manchesWon.A, B: view.manchesWon.B });
  useEffect(() => {
    const justA = view.manchesWon.A > prevWon.current.A;
    const justB = view.manchesWon.B > prevWon.current.B;
    if (justA || justB) setManchePop({ winner: justA ? 'A' : 'B', t: 5 });
    prevWon.current = { A: view.manchesWon.A, B: view.manchesWon.B };
  }, [view.manchesWon.A, view.manchesWon.B]);
  useEffect(() => {
    if (!manchePop) return;
    if (manchePop.t <= 0) { setManchePop(null); return; }
    const id = setTimeout(() => setManchePop((p) => (p ? { ...p, t: p.t - 1 } : null)), 1000);
    return () => clearTimeout(id);
  }, [manchePop]);

  // Delayed retained demande during play.
  useEffect(() => {
    if (view.phase !== 'playing') { props.onShowDemandeInPlay(false); return; }
    const id = setTimeout(() => props.onShowDemandeInPlay(true), annonceDelayMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.phase, view.mancheIndex]);

  const canBid = !!onBid && mySeat != null && view.phase === 'bidding' && view.turn === mySeat && !view.awaitingCollect;
  const myTeam = mySeat != null ? teamOf(mySeat) : null;
  const us = myTeam === 'B' ? view.cumulative.B : view.cumulative.A;
  const them = myTeam === 'B' ? view.cumulative.A : view.cumulative.B;

  return (
    <div className="px-hud">
      {/* Top-right chrome on the rail: torn score + menu */}
      <div className="px-toolbar">
        {props.showScoreSheet !== false && <TornScore history={cumulHistory.current} manchesA={view.manchesWon.A} manchesB={view.manchesWon.B} viewerTeam={myTeam ?? 'A'} onClick={() => setShowScore(true)} />}
        {props.showMenu !== false && (
          <MenuButton onScore={() => setShowScore(true)} onFullscreen={props.onFullscreen} onLeave={props.onLeave} />
        )}
      </div>

      <LastTrickPanel lastTrick={view.lastTrick} mySeat={mySeat} />

      {/* Bottom-left stack: toast on top of the announcements recap */}
      <div className="px-bl-stack">
        {toast && <div className="ky-toast">{toast}</div>}
        <AnnouncesList view={view} names={names} mySeat={mySeat} showReflexion={reflexionOn} />
      </div>

      {canBid && onBid && mySeat != null && (
        <div className="px-bid-slot"><BidPanel view={view} mySeat={mySeat} onBid={onBid} /></div>
      )}
      {onBid && mySeat != null && <ContreControls view={view} mySeat={mySeat} onBid={onBid} />}

      {/* Bottom-right actions: belote toggle + smiley bar (same spot as Coincher) */}
      {mySeat != null && (
        <div className="px-actions-slot">
          {view.belote && view.belote.seat === mySeat && view.belote.playedCount === 0 && view.trump && props.onBeloteToggle && (
            <button
              className={`ky-belote ${view.belote.announcing ? 'is-on' : ''}`}
              title={view.belote.announcing ? 'Belote annoncée (cliquez pour ne pas annoncer)' : 'Belote NON annoncée (les 20 points ne compteront pas)'}
              onClick={() => props.onBeloteToggle!(!view.belote!.announcing)}>
              ♛ Belote {view.belote.announcing ? '✓' : '✗'}
            </button>
          )}
        </div>
      )}

      {/* Réactions : widget minimisé en BAS-GAUCHE du tapis. Un bouton ouvre la
          liste unique de smileys ; l'émote est diffusée à tous. */}
      {/*props.onEmote && (
        <div className={`ky-emote-dock ${emotesOpen ? 'is-open' : ''}`}>
          {emotesOpen && (
            <div className="ky-emote-dock__list">
              {['👍', '😂', '😮', '😎', '😅', '👏', '🤔', '🔥'].map((e2) => (
                <button key={e2} className="ky-emote-dock__btn"
                  disabled={view.phase === 'bidding' || view.phase === 'surcontre'}
                  onClick={() => { props.onEmote!(e2); setEmotesOpen(false); }}>{e2}</button>
              ))}
            </div>
          )}
          <button className="ky-emote-dock__toggle" title="Réactions"
            onClick={() => setEmotesOpen((o) => !o)}>{emotesOpen ? '✕' : '🙂'}</button>
        </div>
      )*/}

      {manchePop && view.phase !== 'partie_end' && (
        <TableMessagePopup
          outcome={myTeam == null || myTeam === manchePop.winner ? 'win' : 'lose'}
          title={myTeam == null ? `Manche pour l'équipe ${manchePop.winner}` : myTeam === manchePop.winner ? 'Manche gagnée !' : 'Manche perdue'}
          us={us} them={them}
          countdown={manchePop.t}
          footer="Prochaine manche…"
        />
      )}
      {view.phase === 'partie_end' && summary?.winner && (
        <TableMessagePopup
          outcome={myTeam == null || myTeam === summary.winner ? 'win' : 'lose'}
          title={myTeam == null ? `Victoire de l'équipe ${summary.winner}` : myTeam === summary.winner ? 'Partie gagnée !' : 'Partie perdue'}
          us={us} them={them}
        />
      )}

      {showScore && <ScoreSheet view={view} summary={summary} viewerTeam={myTeam ?? 'A'} onClose={() => setShowScore(false)} />}
    </div>
  );
}
