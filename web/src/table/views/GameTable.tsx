import { useEffect, useRef, useState } from 'react';
import { SUIT_SYMBOL, type Bid, type Card, type EngineView, type ScoreSummary, type Seat, type Suit } from 'belote-core';
import { BidActionIcon } from '../../ds/table/BidActionIcon';
import { ContreeIcon } from '../../ds/table/ContreeIcon';
import { TableMessage } from '../../ds/feedback/TableMessage';
import { ScoreView } from './ScoreView';
import { PlayerHand } from '../parts/PlayerHand';
import { TrickArea, LastTrickPanel } from '../parts/TrickArea';
import { FeltBackdrop, TableToast, PlayerSeat } from '../parts/TableChrome';
import { seatDir, type Dir } from '../../ds/map';

const RED_SUITS = new Set<Suit>(['coeur', 'carreau']);

/** Configuration de la table — permet d'en décliner d'autres selon le mode/événement. */
export interface TableVisualConfig {
  showScoreSheet?: boolean;
  atoutCorners?: boolean;
  feltCss?: string;   // override du fond (dégradé) du tapis
  railColor?: string; // override de la bordure
  radius?: number;
  /** Thème visuel du tapis (clin d'œil KANTO APLO). */
  feltTheme?: 'classic' | 'cosmos' | 'olympus';
  /** Opacité du grand atout central (très transparent par défaut pour ne pas masquer les cartes). */
  atoutGlyphOpacity?: number;
  /** Durée d'affichage d'une notification d'annonce (ms). */
  notifyMs?: number;
  /** Délai avant d'afficher la demande retenue pendant le jeu (ms, défaut 2000). */
  annonceDelayMs?: number;
  /** Graine de la feuille de score (déchirure propre à la partie). */
  sheetSeed?: string | number;
  /** Messages manuscrits à afficher sur la feuille. */
  sheetMessages?: string[];
}

/** Presets de tapis — déclinables par mode/événement/compétition. */
const FELT_THEMES: Record<string, { felt: string; rail: string }> = {
  classic: { felt: 'radial-gradient(circle at 50% 42%, var(--felt-bright), var(--felt) 55%, var(--felt-edge))', rail: 'var(--felt-rail)' },
  cosmos: { felt: 'radial-gradient(circle at 50% 35%, #1d2a52, #0c1430 58%, #060a18)', rail: '#0a1330' },
  olympus: { felt: 'radial-gradient(circle at 50% 38%, #2c2e3b, #1d2030 58%, #14151e)', rail: 'var(--accent-strong)' },
};

export interface GameTableProps {
  view: EngineView;
  names: string[];
  hands: (Card[] | null)[];
  mySeat: Seat | null;
  legal?: Card[];
  onPlay?: (card: Card) => void;
  onBid?: (bid: Omit<Bid, 'seat'>) => void;
  summary?: ScoreSummary;
  config?: TableVisualConfig;
}

const teamOf = (s: number) => (s % 2 === 0 ? 'A' : 'B') as 'A' | 'B';
const suitGlyph = (s: Suit | null) => (s ? { sym: SUIT_SYMBOL[s], red: s === 'coeur' || s === 'carreau' } : null);
const lastSeat = (bids: Bid[], action: Bid['action']): Seat | null => {
  for (let i = bids.length - 1; i >= 0; i--) if (bids[i].action === action) return bids[i].seat;
  return null;
};

function bidMessage(b: Bid, name: string): string {
  if (b.action === 'pass') return `${name} passe`;
  if (b.action === 'contree') return `${name} contre !`;
  if (b.action === 'surcontree') return `${name} surcontre !`;
  const reflexion = b.reflexion ? ' 💭' : '';
  // La couleur n'est affichée que si elle a été explicitement nommée (saidSuit).
  const suit = b.saidSuit && b.suit ? ' ' + SUIT_SYMBOL[b.suit] : '';
  if (b.action === 'capot') return `${name} annonce capot${suit}${reflexion}`;
  return `${name} annonce ${b.value ?? ''}${suit}${reflexion}`.trim();
}

/** Feuille de score manuscrite : déléguée au composant autonome ScoreView. */

export function GameTable({ view, names, hands, mySeat, legal, onPlay, onBid, summary, config = {} }: GameTableProps) {
  const { showScoreSheet = true, atoutCorners = true, notifyMs = 5000 } = config;
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);
  const [bidReflexion, setBidReflexion] = useState(false);
  const [repeatPartnerSuit, setRepeatPartnerSuit] = useState(false);
  const sheetSeed = config.sheetSeed ?? names.join('|');
  const south = (mySeat ?? 0) as Seat;
  const revealAll = mySeat == null;
  const legalSet = new Set((legal ?? []).map((c) => `${c.rank}${c.suit}`));
  const myTurn = view.turn === mySeat && !view.awaitingCollect;

  const winnerSeat = view.awaitingCollect ? view.pendingWinnerSeat : null;
  const contreSeat = lastSeat(view.bids, 'contree');
  const surcontreSeat = lastSeat(view.bids, 'surcontree');
  const atout = suitGlyph(view.trump);

  // notification dans la table (dernière annonce)
  const [toast, setToast] = useState<string | null>(null);
  const prevBids = useRef(0);
  useEffect(() => {
    if (view.bids.length > prevBids.current) {
      const b = view.bids[view.bids.length - 1];
      setToast(bidMessage(b, names[b.seat])); // remplace immédiatement la précédente
      const id = setTimeout(() => setToast(null), notifyMs);
      prevBids.current = view.bids.length;
      return () => clearTimeout(id);
    }
    prevBids.current = view.bids.length;
  }, [view.bids.length]);

  // popup fin de manche + chrono
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


  // Apparition de la demande pendant le jeu : 2 s par défaut après le début de la donne.
  const announceDelayMs = config.annonceDelayMs ?? 2000;
  const [showDemandeInPlay, setShowDemandeInPlay] = useState(false);
  useEffect(() => {
    if (view.phase !== 'playing') { setShowDemandeInPlay(false); return; }
    const id = setTimeout(() => setShowDemandeInPlay(true), announceDelayMs);
    return () => clearTimeout(id);
  }, [view.phase, view.mancheIndex, announceDelayMs]);

  /** Dernière demande (bid/capot) déposée par un siège. */
  const lastBidOf = (seat: Seat): Bid | null => {
    for (let i = view.bids.length - 1; i >= 0; i--) {
      const b = view.bids[i];
      if (b.seat === seat && (b.action === 'bid' || b.action === 'capot')) return b;
    }
    return null;
  };
  /** Niveau de contre PROPRE à un joueur (jamais à l'équipe). */
  const contreOf = (seat: Seat): 'none' | 'contree' | 'surcontree' =>
    seat === surcontreSeat ? 'surcontree' : seat === contreSeat ? 'contree' : 'none';

  const theme = FELT_THEMES[config.feltTheme ?? 'classic'] ?? FELT_THEMES.classic;
  const felted: React.CSSProperties = {
    ['--gt-felt' as any]: config.feltCss ?? theme.felt,
    ['--gt-rail' as any]: config.railColor ?? theme.rail,
    ...(config.radius ? { ['--gt-radius' as any]: `${config.radius}px` } : {}),
  };

  const winnerDir = winnerSeat != null ? seatDir(winnerSeat, south) : null;

  return (
    <div className="gt-wrap">
      <div className="gt-felt" style={felted}>
        {/* atout : décor du tapis (composant autonome) */}
        <FeltBackdrop atout={atout} corners={atoutCorners} glyphOpacity={config.atoutGlyphOpacity ?? 0.06} />

        {/* dernier pli (mini) — composant autonome */}
        <LastTrickPanel lastTrick={view.lastTrick} />

        {/* feuille de score manuscrite (composant autonome) */}
        {showScoreSheet && <ScoreView summary={summary} seed={sheetSeed} messages={config.sheetMessages} />}

        {/* sièges : JetonAnnonce + LogoEspaceInfo + AnnonceAnnonce (composants autonomes) */}
        {[0, 1, 2, 3].map((i) => {
          const seat = i as Seat;
          const dir = seatDir(seat, south);
          const team = teamOf(seat) === 'A' ? 'a' : 'b';
          const isMeneur = seat === view.turn && !view.awaitingCollect;
          const logoName = teamOf(seat) === 'A' ? `${names[0]} & ${names[2]}` : `${names[1]} & ${names[3]}`;

          // Demande affichée : pendant l'enchère = dernière demande du siège ;
          // pendant le jeu = contrat retenu du preneur (avec l'enseigne de l'ATOUT), après 2 s.
          const lb = lastBidOf(seat);
          let demande: { value: number | null; capot: boolean; suitSymbol: string | null; isRed: boolean; reflexion: boolean } | null = null;
          if (view.phase === 'bidding' && lb) {
            const g = lb.suit ? suitGlyph(lb.suit) : null;
            demande = {
              value: lb.action === 'capot' ? null : (lb.value ?? null),
              capot: lb.action === 'capot',
              suitSymbol: lb.saidSuit && g ? g.sym : null, // couleur affichée seulement si nommée
              isRed: !!g?.red,
              reflexion: !!lb.reflexion,
            };
          } else if (view.phase === 'playing' && seat === view.bidderSeat && showDemandeInPlay) {
            demande = {
              value: lb?.action === 'capot' ? null : (view.currentBidValue ?? null),
              capot: lb?.action === 'capot',
              suitSymbol: atout?.sym ?? null,   // contrat retenu : enseigne de l'atout, vraie couleur
              isRed: !!atout?.red,
              reflexion: !!lb?.reflexion,
            };
          }
          const contre = contreOf(seat);

          return (
            <PlayerSeat key={seat} dir={dir} team={team} name={names[seat]} logoName={logoName}
              isDonneur={seat === view.dealer} isEntame={seat === view.firstBidderSeat} isMeneur={isMeneur}
              demande={demande} contre={contre} size={30} />
          );
        })}

        {/* mains : les 4 joueurs sur le tapis (composant autonome PlayerHand) */}
        {/* sud = main interactive (ou révélée si observateur) */}
        {hands[south] && (
          <PlayerHand dir="south" cards={hands[south]} trump={view.trump} playableSet={legalSet} interactive={myTurn} onPlay={onPlay} />
        )}
        {/* les 3 autres joueurs : face cachée, ou révélée si observateur */}
        {[1, 2, 3].map((rel) => {
          const seat = ((south + rel) % 4) as Seat;
          const dir = seatDir(seat, south) as Exclude<Dir, 'south'>;
          const cards = hands[seat];
          if (!(cards?.length)) return null;
          return <PlayerHand key={seat} dir={dir} cards={revealAll ? cards : null} count={cards.length} trump={view.trump} faceDown={!revealAll} />;
        })}

        {/* pli central (+ animation de ramassage vers le gagnant) — composant autonome */}
        <TrickArea plays={view.currentTrick} south={south} winnerSeat={view.awaitingCollect ? winnerSeat : null} collectDir={winnerDir} />

        <TableToast message={toast} />

        {/* 4 dernières annonces (bas gauche) — jusqu'à la première carte jouée */}
        {view.bids.length > 0 && view.currentTrick.length === 0 && !view.lastTrick && (() => {
          const viewerTeam = mySeat != null ? (mySeat % 2 === 0 ? 'A' : 'B') : null;
          const teamLabel = (s: Seat) => { const t = s % 2 === 0 ? 'A' : 'B'; return viewerTeam ? (t === viewerTeam ? 'nous' : 'adversaire') : `équipe ${t}`; };
          const usThem = (s: Seat) => (viewerTeam ? ((s % 2 === 0 ? 'A' : 'B') === viewerTeam ? 'us' : 'them') : '');
          const shortBid = (b: Bid) => {
            if (b.action === 'pass') return <>passe</>;
            if (b.action === 'contree') return <>contre</>;
            if (b.action === 'surcontree') return <>surcontre</>;
            const g = b.saidSuit && b.suit ? suitGlyph(b.suit) : null;
            return (
              <>
                {b.value ?? ''}
                {g && <span className={g.red ? 'gt-suit-red' : 'gt-suit-black'}> {g.sym}</span>}
                {b.reflexion ? ' 💭' : ''}
              </>
            );
          };
          return (
            <div className="gt-announces">
              {view.bidderSeat != null && view.currentBidValue != null && (
                <div className="head">
                  <span className={`at ${atout?.red ? 'gt-suit-red' : 'gt-suit-black'}`}>{atout?.sym}</span>
                  <span>{teamLabel(view.bidderSeat)} prend {view.currentBidValue}</span>
                </div>
              )}
              {view.bids.slice(-4).map((b, i) => (
                <div key={i} className={`gt-ann ${usThem(b.seat)}`}>
                  <span className="who">{names[b.seat]}</span>
                  <span>{shortBid(b)}</span>
                  <span className="tag">{teamLabel(b.seat)}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Interface d'annonce centrale (mon tour d'enchérir) */}
        {onBid && mySeat != null && view.phase === 'bidding' && view.turn === mySeat && !view.awaitingCollect && (() => {
          const min = view.currentBidValue ? view.currentBidValue + 10 : 90;
          const SUIT_LIST: Suit[] = ['pique', 'coeur', 'carreau', 'trefle'];
          // Couleur du coéquipier (siège +2) déjà annoncée — condition pour pouvoir « répéter ».
          const partnerSeat = ((mySeat + 2) % 4) as Seat;
          let partnerSuit: Suit | null = null;
          for (let i = view.bids.length - 1; i >= 0; i--) { const b = view.bids[i]; if (b.seat === partnerSeat && b.suit) { partnerSuit = b.suit; break; } }
          // Une couleur doit être choisie (explicite) OU répétée — sinon on ne peut pas confirmer (règle A).
          const suitResolved = selectedSuit != null || repeatPartnerSuit;
          const pickSuit = (s: Suit) => { setSelectedSuit(s); setRepeatPartnerSuit(false); };
          const toggleRepeat = () => { setRepeatPartnerSuit((v) => { const nv = !v; if (nv) setSelectedSuit(null); return nv; }); };
          const confirmBid = (value: number) => {
            if (!suitResolved || value < min) return;
            onBid(selectedSuit != null
              ? { action: 'bid', value, suit: selectedSuit, saidSuit: true, reflexion: bidReflexion }
              : { action: 'bid', value, repeatPartnerSuit: true, reflexion: bidReflexion });
            setSelectedSuit(null); setRepeatPartnerSuit(false); setBidReflexion(false);
          };
          const confirmCapot = () => {
            if (!suitResolved) return;
            onBid(selectedSuit != null
              ? { action: 'capot', suit: selectedSuit, saidSuit: true, reflexion: bidReflexion }
              : { action: 'capot', repeatPartnerSuit: true, reflexion: bidReflexion });
            setSelectedSuit(null); setRepeatPartnerSuit(false); setBidReflexion(false);
          };
          return (
            <div className="gt-announce">
              <h4>À vous d'annoncer</h4>
              <div className="gt-suits">
                {SUIT_LIST.map((s) => (
                  <button key={s} className={`gt-suit ${RED_SUITS.has(s) ? 'red' : 'black'} ${selectedSuit === s ? 'sel' : ''}`} onClick={() => pickSuit(s)}>{SUIT_SYMBOL[s]}</button>
                ))}
              </div>
              <div className="gt-signals">
                {partnerSuit && (
                  <button className={`gt-toggle ${repeatPartnerSuit ? 'on' : ''}`} onClick={toggleRepeat}
                    title="Reprendre la couleur du coéquipier sans la nommer (signal d'équipe)">
                    ↩ Répéter {SUIT_SYMBOL[partnerSuit]}
                  </button>
                )}
                <button className={`gt-toggle ${bidReflexion ? 'on' : ''}`} onClick={() => setBidReflexion((v) => !v)}
                  title="Marquer cette annonce comme réfléchie (signal d'équipe)">💭 Réflexion</button>
              </div>
              {!suitResolved && <div className="gt-hint">Choisissez une couleur ou « Répéter » pour annoncer.</div>}
              <div className="gt-bids">
                {[90, 100, 110, 120, 130, 140, 150, 160, 170, 180].map((v) => (
                  <button key={v} className="gt-bidchip" disabled={v < min || !suitResolved} onClick={() => confirmBid(v)}>{v}</button>
                ))}
              </div>
              <div className="gt-foot">
                <button className="gt-bidchip capot" disabled={!suitResolved} onClick={confirmCapot}>
                  <BidActionIcon action="capot" size={22} /> Capot
                </button>
                <button className="gt-bidchip pass" onClick={() => onBid({ action: 'pass' })}>
                  <BidActionIcon action="passe" size={22} /> Passe
                </button>
              </div>
            </div>
          );
        })()}

        {/* CONTRER : icône instantanée en bas du tapis à droite du joueur, pendant l'enchère.
            Disparaît dès qu'on passe/monte ou qu'un adversaire a contré (géré par le moteur). */}
        {onBid && mySeat != null && view.phase === 'bidding' && view.contreSeats.includes(mySeat) && (
          <div className="gt-contree-zone">
            <ContreeIcon action="contree" onClick={() => onBid({ action: 'contree' })} />
          </div>
        )}

        {/* SURCONTRER : popup dédiée pour le camp preneur (Passer / Surcontrer). Reste tant que
            CE joueur n'a pas tranché ; un surcontre clôt pour les deux (géré par le moteur). */}
        {onBid && mySeat != null && view.phase === 'surcontre' && view.surcontreSeats.includes(mySeat) && (
          <div className="gt-surcontre">
            <h4>Votre adversaire a contré</h4>
            <div className="gt-surcontre-actions">
              <button className="gt-bidchip pass" onClick={() => onBid({ action: 'pass' })}>
                <BidActionIcon action="passe" size={22} /> Passer
              </button>
              <button className="gt-bidchip surcontree" onClick={() => onBid({ action: 'surcontree' })}>
                <BidActionIcon action="surcontree" size={22} /> Surcoincher
              </button>
            </div>
          </div>
        )}



        {/* Message inter-manche — popup unique réutilisable */}
        {manchePop && view.phase !== 'partie_end' && (() => {
          const myTeam = mySeat != null ? teamOf(mySeat) : null;
          const emotion = myTeam == null ? 'victoire' : myTeam === manchePop.winner ? 'victoire' : 'defaite';
          const title = myTeam == null
            ? `Manche pour l'équipe ${manchePop.winner}`
            : myTeam === manchePop.winner ? 'Manche gagnée !' : 'Manche perdue';
          return (
            <TableMessage
              emotion={emotion}
              title={title}
              subtitle="Bravo à l'équipe gagnante — la revanche arrive."
              countdown={manchePop.t}
              footer="Prochaine manche…"
            />
          );
        })()}

        {/* Fin de partie — MÊME popup */}
        {view.phase === 'partie_end' && summary?.winner && (() => {
          const myTeam = mySeat != null ? teamOf(mySeat) : null;
          const emotion = myTeam == null ? 'victoire' : myTeam === summary.winner ? 'victoire' : 'defaite';
          const title = myTeam == null
            ? `Victoire de l'équipe ${summary.winner}`
            : myTeam === summary.winner ? 'Partie gagnée ! 🏆' : 'Partie perdue';
          return (
            <TableMessage
              emotion={emotion}
              title={title}
              subtitle={myTeam === summary.winner ? 'Beau jeu — savourez la victoire.' : "Belle partie — la prochaine est pour vous."}
            />
          );
        })()}
      </div>
    </div>
  );
}
