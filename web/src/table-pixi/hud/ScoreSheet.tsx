import type { EngineView, ScoreSummary } from 'belote-core';
import { buildSheetLines, type CumulPoint } from './scoreSheetModel';

/**
 * TornScore — the always-visible score sheet, written like a REAL notebook page:
 * two columns of cumulative totals in tens ("02", "96"; 500 reads "50"), an
 * underscore-free cell when a team didn't score, a slanted bar each time a team
 * crosses a thousand (two bars for 2000…), and the manches total at the bottom.
 */
export function TornScore({ history, manchesA, manchesB, onClick }: {
  history: CumulPoint[]; manchesA: number; manchesB: number; onClick?: () => void;
}) {
  const lines = buildSheetLines(history).slice(-12); // the last page of the sheet
  return (
    <div className="ky-score ky-score--notebook" onClick={onClick} title="Feuille de score">
      <div className="ky-score__grid">
        <div className="ky-score__head"><span>A</span><span>B</span></div>
        {lines.length === 0 && <div className="ky-score__line"><span className="ky-score__cell" /><span className="ky-score__cell" /></div>}
        {lines.map((l, i) => (
          <div key={i} className="ky-score__line">
            <span className="ky-score__cell">
              {Array.from({ length: l.a.bars }).map((_, k) => <i key={k} className="ky-score__bar" />)}
              {l.a.text ?? ''}
            </span>
            <span className="ky-score__cell">
              {Array.from({ length: l.b.bars }).map((_, k) => <i key={k} className="ky-score__bar" />)}
              {l.b.text ?? ''}
            </span>
          </div>
        ))}
        <div className="ky-score__total"><span>{manchesA}</span><span>{manchesB}</span></div>
      </div>
    </div>
  );
}

export interface ScoreSheetProps { view: EngineView; summary?: ScoreSummary; onClose(): void }

/** ScoreSheet — the detailed modal (manches, totals, manches won). */
export function ScoreSheet({ view, summary, onClose }: ScoreSheetProps) {
  return (
    <div className="px-scrim" onClick={onClose}>
      <div className="px-scoresheet" onClick={(e) => e.stopPropagation()}>
        <div className="px-scoresheet__head">
          <h3>Feuille de score</h3>
          <button className="px-scoresheet__close" onClick={onClose}>✕</button>
        </div>
        <table>
          <thead><tr><th>Manche</th><th>Nous</th><th>Eux</th></tr></thead>
          <tbody>
            {(summary?.manches ?? []).map((m, i) => (
              <tr key={i}><td>{i + 1}</td>
                <td>{(m as any).pointsA ?? (m as any).A ?? '—'}</td>
                <td>{(m as any).pointsB ?? (m as any).B ?? '—'}</td></tr>
            ))}
            {(!summary || summary.manches.length === 0) && <tr><td colSpan={3} className="px-empty">Aucune manche terminée.</td></tr>}
          </tbody>
          <tfoot><tr><td>Total</td><td>{view.cumulative.A}</td><td>{view.cumulative.B}</td></tr></tfoot>
        </table>
        <div className="px-scoresheet__manches">Manches gagnées — Nous {view.manchesWon.A} · Eux {view.manchesWon.B}</div>
      </div>
    </div>
  );
}
