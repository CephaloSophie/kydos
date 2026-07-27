import { useState } from 'react';
import type { EngineView, LogEntry as CoreLog, Suit } from 'belote-core';
import { SUIT_SYMBOL } from 'belote-core';
import { LogConsole } from '../../ds/devtools/LogConsole';
import { AnnounceStream } from '../../ds/bidding/AnnounceStream';
import { toDsSuit } from '../../ds/map';

type Tab = 'console' | 'annonces' | 'etat';

const fmtTs = (t: number) => {
  try { return new Date(t).toLocaleTimeString('fr-FR'); } catch { return ''; }
};

/** Mappe les logs du moteur vers le format attendu par le LogConsole du kit. */
function toKitLogs(logs: CoreLog[]) {
  return logs.map((e) => ({ level: e.level, ts: fmtTs(e.t), msg: e.robotId ? `${e.robotId} · ${e.msg}` : e.msg }));
}

/** Construit le flux d'annonces (kit) depuis les enchères de la donne. */
function toAnnounce(view: EngineView, names: string[]) {
  return view.bids.map((b) => ({
    player: names[b.seat],
    team: (b.seat % 2 === 0 ? 'a' : 'b') as 'a' | 'b',
    kind: (b.action === 'pass' ? 'pass' : b.action === 'contree' ? 'contre' : b.action === 'surcontree' ? 'surcontre' : 'bid') as
      'pass' | 'bid' | 'contre' | 'surcontre',
    value: b.value,
    suit: b.suit ? toDsSuit(b.suit) : undefined,
  }));
}

const PHASE_FR: Record<string, string> = {
  bidding: 'Enchères', surcontre: 'Surcoinche', playing: 'Jeu', donne_end: 'Fin de donne', manche_end: 'Fin de manche', partie_end: 'Partie terminée',
};

/**
 * DevDock — panneau « inspecteur » façon Chrome : onglets (Console, Annonces,
 * État), repliable (chevron) et masquable. La console et le flux sont les
 * composants du design system ; l'onglet État inspecte le moteur en direct.
 */
export function DevDock({ view, names, logs }: { view: EngineView; names: string[]; logs: CoreLog[] }) {
  const [tab, setTab] = useState<Tab>('console');
  const [open, setOpen] = useState(true);

  const kitLogs = toKitLogs(logs);
  const stream = toAnnounce(view, names);

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="r"><span className="k">{k}</span><span className="v">{v}</span></div>
  );

  return (
    <div className={`devdock ${open ? '' : 'closed'}`}>
      <div className="devdock__bar">
        <button className={`devdock__tab ${tab === 'console' ? 'active' : ''}`} onClick={() => { setTab('console'); setOpen(true); }}>
          Console <span className="count">{kitLogs.length}</span>
        </button>
        <button className={`devdock__tab ${tab === 'annonces' ? 'active' : ''}`} onClick={() => { setTab('annonces'); setOpen(true); }}>
          Annonces <span className="count">{stream.length}</span>
        </button>
        <button className={`devdock__tab ${tab === 'etat' ? 'active' : ''}`} onClick={() => { setTab('etat'); setOpen(true); }}>
          État
        </button>
        <span className="devdock__spacer" />
        <button className="devdock__icon" title={open ? 'Masquer le panneau' : 'Ouvrir le panneau'} onClick={() => setOpen((o) => !o)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform var(--dur-fast)' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="devdock__body">
        {tab === 'console' && <LogConsole entries={kitLogs} defaultHidden={['trace']} collapsible={false} title="Console moteur" />}
        {tab === 'annonces' && <AnnounceStream entries={stream} title="Flux des annonces" />}
        {tab === 'etat' && (
          <div className="devstate">
            <Row k="Phase" v={PHASE_FR[view.phase] ?? view.phase} />
            <Row k="Tour" v={view.turn != null ? names[view.turn] : '—'} />
            <Row k="Atout" v={view.trump ? SUIT_SYMBOL[view.trump as Suit] : '—'} />
            <Row k="Contrat" v={view.currentBidValue ?? '—'} />
            <Row k="Preneur" v={view.bidderSeat != null ? names[view.bidderSeat] : '—'} />
            <Row k="Contre" v={view.contre === 'none' ? '—' : view.contre === 'surcontree' ? 'Surcontré' : 'Contré'} />
            <Row k="Manche" v={view.mancheIndex + 1} />
            <Row k="Score A" v={view.cumulative.A.toLocaleString('fr-FR')} />
            <Row k="Score B" v={view.cumulative.B.toLocaleString('fr-FR')} />
            <Row k="Objectif" v={view.target.toLocaleString('fr-FR')} />
            <Row k="Sens" v={view.clockwise ? '↻ horaire' : '↺ antihoraire'} />
          </div>
        )}
      </div>
    </div>
  );
}
