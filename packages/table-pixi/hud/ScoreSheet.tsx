import type { EngineView, ScoreSummary } from 'belote-core';
import { buildSheetLines, type CumulPoint, type SheetLine } from './scoreSheetModel';

/**
 * TornScore — the always-visible score sheet, written like a REAL notebook page:
 * two columns of cumulative totals in tens ("02", "96"; 500 reads "50"), an
 * underscore-free cell when a team didn't score, a slanted bar each time a team
 * crosses a thousand (two bars for 2000…), and the manches total at the bottom.
 */
export function TornScore({ history, manchesA, manchesB, viewerTeam = 'A', onClick }: {
  history: CumulPoint[]; manchesA: number; manchesB: number; viewerTeam?: 'A' | 'B'; onClick?: () => void;
}) {
  const lines = buildSheetLines(history).slice(-12); // the last page of the sheet
  // « Nous » = équipe du spectateur (verte), « Eux » = adversaire (rouge). On
  // ORDONNE les colonnes pour que Nous soit toujours à gauche, quel que soit le
  // camp A/B du spectateur.
  const usIsA = viewerTeam === 'A';
  const usCell = (l: SheetLine) => (usIsA ? l.a : l.b);
  const themCell = (l: SheetLine) => (usIsA ? l.b : l.a);
  const usManches = usIsA ? manchesA : manchesB;
  const themManches = usIsA ? manchesB : manchesA;
  return (
    <div className="ky-score ky-score--notebook" onClick={onClick} title="Feuille de score">
      <div className="ky-score__grid">
        <div className="ky-score__head"><span className="ky-score__us">Nous</span><span className="ky-score__them">Eux</span></div>
        {lines.length === 0 && <div className="ky-score__line"><span className="ky-score__cell" /><span className="ky-score__cell" /></div>}
        {lines.map((l, i) => (
          <div key={i} className="ky-score__line">
            <span className="ky-score__cell ky-score__cell--us">
              {Array.from({ length: usCell(l).bars }).map((_, k) => <i key={k} className="ky-score__bar" />)}
              {usCell(l).text ?? ''}
            </span>
            <span className="ky-score__cell ky-score__cell--them">
              {Array.from({ length: themCell(l).bars }).map((_, k) => <i key={k} className="ky-score__bar" />)}
              {themCell(l).text ?? ''}
            </span>
          </div>
        ))}
        <div className="ky-score__total"><span className="ky-score__us">{usManches}</span><span className="ky-score__them">{themManches}</span></div>
      </div>
    </div>
  );
}

export interface ScoreSheetProps { view: EngineView; summary?: ScoreSummary; viewerTeam?: 'A' | 'B'; onClose(): void }

/** ScoreSheet — the detailed modal (manches, totals, manches won). */
export function ScoreSheet({ view, summary, viewerTeam = 'A', onClose }: ScoreSheetProps) {
  // Colonnes relatives au spectateur : « Nous » = son camp, « Eux » = l'autre.
  const usIsA = viewerTeam === 'A';
  const mancheUs = (m: any) => (usIsA ? (m.pointsA ?? m.A) : (m.pointsB ?? m.B)) ?? '—';
  const mancheThem = (m: any) => (usIsA ? (m.pointsB ?? m.B) : (m.pointsA ?? m.A)) ?? '—';
  const totalUs = usIsA ? view.cumulative.A : view.cumulative.B;
  const totalThem = usIsA ? view.cumulative.B : view.cumulative.A;
  const manchesUs = usIsA ? view.manchesWon.A : view.manchesWon.B;
  const manchesThem = usIsA ? view.manchesWon.B : view.manchesWon.A;
  return (
    <div className="px-scrim" onClick={onClose}>
      <div className="px-scoresheet" onClick={(e) => e.stopPropagation()}>
        <div className="px-scoresheet__head">
          <h3>Feuille de score</h3>
          <button className="px-scoresheet__close" onClick={onClose}>✕</button>
        </div>
        <table>
          <thead><tr><th>Manche</th><th className="px-score-us">Nous</th><th className="px-score-them">Eux</th></tr></thead>
          <tbody>
            {(summary?.manches ?? []).map((m, i) => (
              <tr key={i}><td>{i + 1}</td>
                <td className="px-score-us">{mancheUs(m as any)}</td>
                <td className="px-score-them">{mancheThem(m as any)}</td></tr>
            ))}
            {(!summary || summary.manches.length === 0) && <tr><td colSpan={3} className="px-empty">Aucune manche terminée.</td></tr>}
          </tbody>
          <tfoot><tr><td>Total</td><td className="px-score-us">{totalUs}</td><td className="px-score-them">{totalThem}</td></tr></tfoot>
        </table>
        <div className="px-scoresheet__manches">Manches gagnées — <span className="px-score-us">Nous {manchesUs}</span> · <span className="px-score-them">Eux {manchesThem}</span></div>
      </div>
    </div>
  );
}
