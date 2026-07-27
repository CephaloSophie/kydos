import { SUIT_SYMBOL, type EngineView, type ScoreSummary } from 'belote-core';
import { identity, teamKey, type Identity } from '../lib/identity';

type Team = 'A' | 'B';

export function TeamBadge({ id, size = 28 }: { id: Identity; size?: number }) {
  const cell = size / 5;
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" style={{ borderRadius: 6, background: 'rgba(255,255,255,.04)', flex: 'none' }}>
      {id.cells.map((row, r) =>
        row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} fill={id.color} /> : null)),
      )}
    </svg>
  );
}

/** Identité des deux équipes à partir des noms (sièges 0/2 = A, 1/3 = B). */
export function teamIdentities(names: string[]): Record<Team, Identity> {
  return {
    A: identity(teamKey(names[0] ?? 'A0', names[2] ?? 'A2')),
    B: identity(teamKey(names[1] ?? 'B1', names[3] ?? 'B3')),
  };
}

export function ScoreBoard({ view, names }: { view: EngineView; names: string[] }) {
  const ids = teamIdentities(names);
  const bidder = view.board.bidderTeam;
  const members: Record<Team, string[]> = { A: [names[0], names[2]], B: [names[1], names[3]] };

  const Panel = ({ team }: { team: Team }) => {
    const isBidder = bidder === team;
    const isOpp = bidder && bidder !== team;
    return (
      <div className="team-panel" style={{ borderColor: ids[team].color, boxShadow: isBidder ? `0 0 0 1px ${ids[team].color}` : undefined }}>
        <div className="tp-head">
          <TeamBadge id={ids[team]} />
          <div>
            <div className="tp-title" style={{ color: ids[team].color }}>Équipe {team}</div>
            <div className="muted tp-members">{members[team].join(' & ')}</div>
          </div>
          {isBidder && <span className="role role-bidder" style={{ borderColor: ids[team].color, color: ids[team].color }}>★ Demandeur</span>}
          {isOpp && <span className="role role-opp">Adverse</span>}
        </div>
        <div className="tp-stats">
          <div><span className="muted">Manches</span><b>{view.manchesWon[team]}</b></div>
          <div><span className="muted">Manche (live)</span><b>{view.cumulative[team] + view.board.donneRaw[team]}</b><span className="muted"> / {view.target}</span></div>
          <div><span className="muted">Donne (brut)</span><b>{view.board.donneRaw[team]}</b></div>
          <div><span className="muted">Plis</span><b>{view.board.tricks[team]}</b></div>
        </div>
      </div>
    );
  };

  return (
    <div className="board">
      <Panel team="A" />
      <div className="board-center">
        <div className="pill">Manche {view.mancheIndex}{view.isLabel ? ` · ${view.labelKind} label` : ''}</div>
        {view.trump && <div>Atout <b>{SUIT_SYMBOL[view.trump]}</b></div>}
        {view.currentBidValue ? <div>Contrat <b>{view.currentBidValue}</b>{view.contre !== 'none' ? ` (${view.contre})` : ''}</div> : <div className="muted">enchères…</div>}
        <div className="muted">{phaseLabel(view.phase)}</div>
      </div>
      <Panel team="B" />
    </div>
  );
}

export function Recap({ summary, names }: { summary: ScoreSummary; names: string[] }) {
  const ids = teamIdentities(names);
  const w = summary.winner;
  return (
    <div className="card recap">
      <div className="recap-head">
        <h2 style={{ margin: 0 }}>Résultat de la partie</h2>
        {w && (
          <div className="recap-winner" style={{ color: ids[w].color }}>
            <TeamBadge id={ids[w]} size={34} /> Équipe {w} gagne · {summary.manchesWon.A}–{summary.manchesWon.B}
          </div>
        )}
      </div>

      {summary.manches.map((m) => (
        <div key={m.index} className="recap-manche">
          <div className="recap-manche-head">
            <b>Manche {m.index}</b>
            <span className="muted"> · objectif {m.target}{m.isLabel ? ` · ${m.labelKind} label` : ''}</span>
            {m.winner && <span className="pill" style={{ borderColor: ids[m.winner].color, color: ids[m.winner].color }}>Gagnée par {m.winner}</span>}
            <span className="muted" style={{ marginLeft: 'auto' }}>cumul {m.cumulative.A} – {m.cumulative.B}</span>
          </div>
          <table className="recap-table">
            <thead>
              <tr><th>Donne</th><th>Donneur</th><th>Demandeur</th><th>Contrat</th><th>A</th><th>B</th></tr>
            </thead>
            <tbody>
              {m.donnes.map((d) => (
                <tr key={d.index}>
                  <td>{d.index}</td>
                  <td>{names[d.dealer]}</td>
                  <td>
                    {d.bidderSeat != null
                      ? <span style={{ color: d.bidderTeam ? ids[d.bidderTeam].color : undefined }}>{names[d.bidderSeat]} ({d.bidderTeam})</span>
                      : '—'}
                  </td>
                  <td>{d.contract ?? '—'}{d.trump ? ' ' + SUIT_SYMBOL[d.trump] : ''}{d.contre !== 'none' ? ` ${d.contre}` : ''}</td>
                  <td style={{ color: ids.A.color }}>{d.score.A}</td>
                  <td style={{ color: ids.B.color }}>{d.score.B}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function phaseLabel(p: EngineView['phase']) {
  return { bidding: 'Enchères', surcontre: 'Surcoinche', playing: 'Jeu', donne_end: 'Fin de donne', manche_end: 'Fin de manche', partie_end: 'Terminé' }[p];
}
