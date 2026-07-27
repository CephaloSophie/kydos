import { Fragment, useMemo } from 'react';
import type { ScoreSummary } from 'belote-core';

/** PRNG déterministe : une même graine -> une même déchirure / mêmes traits. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Affichage manuscrit d'un cumul : en dizaines, sur 2 chiffres, en RETIRANT les milliers
 * (matérialisés par une apostrophe et un trait dans la colonne). Ex. 950 -> "95",
 * 1040 -> "04" + 1 apostrophe (= 1040), 2040 -> "04" + 2 apostrophes.
 */
export function fmtCumul(cumul: number) {
  const thousands = Math.floor(cumul / 1000);
  const remainder = cumul - thousands * 1000;
  return { text: String(Math.round(remainder / 10)).padStart(2, '0'), apos: "'".repeat(thousands), thousands };
}

export interface ScoreViewProps {
  summary?: ScoreSummary;
  /** Messages manuscrits libres ajoutés sur la feuille. */
  messages?: string[];
  /** Graine de la feuille (déchirure + traits) — propre à chaque partie. */
  seed?: string | number;
}

interface Row { a: number; b: number; aScored: boolean; bScored: boolean; aCross: boolean; bCross: boolean }

/**
 * ScoreView — feuille de score « papier déchiré », écriture manuscrite au stylo bleu.
 *
 * Règles d'affichage (belote manuscrite) :
 *  • Cumul par manche (chaque ligne = total courant de l'équipe).
 *  • MANCHE EN COURS : toutes les donnes détaillées, ligne par ligne.
 *  • MANCHE TERMINÉE : condensée à sa dernière ligne + le décompte de manches gagnées à cet instant.
 *  • Une équipe qui ne marque RIEN sur une donne -> cellule VIDE (on ne répète pas le cumul).
 *  • Franchissement d'un millier -> un TRAIT dans la colonne + une apostrophe par millier
 *    sur toutes les lignes suivantes (1040 -> "04'", 2040 -> "04''").
 */
export function ScoreView({ summary, messages = [], seed = 'contree' }: ScoreViewProps) {
  const seedNum = typeof seed === 'number' ? seed : hash(String(seed));

  const { clip, wobble } = useMemo(() => {
    const r = rng(seedNum);
    const pts: string[] = ['0% 0%', '100% 0%'];
    for (let i = 1; i <= 6; i++) pts.push(`${(100 - r() * 6).toFixed(1)}% ${(i * 100 / 7).toFixed(1)}%`);
    pts.push('100% 100%');
    for (let i = 6; i >= 1; i--) pts.push(`${(i * 100 / 7).toFixed(1)}% ${(100 - r() * 5).toFixed(1)}%`);
    pts.push('0% 100%');
    const wob = Array.from({ length: 24 }, () => ({ rot: (r() - 0.5) * 3, mx: r() * 4, w: 78 + r() * 16 }));
    return { clip: `polygon(${pts.join(',')})`, wobble: wob };
  }, [seedNum]);

  // Construit, par manche, les lignes cumulées + drapeaux (a marqué ? franchit un millier ?).
  const blocks = (summary?.manches ?? []).map((m) => {
    let a = 0, b = 0; const rows: Row[] = [];
    for (const d of m.donnes) {
      const prevA = a, prevB = b;
      a += d.score.A; b += d.score.B;
      rows.push({
        a, b,
        aScored: d.score.A > 0, bScored: d.score.B > 0,
        aCross: Math.floor(a / 1000) > Math.floor(prevA / 1000),
        bCross: Math.floor(b / 1000) > Math.floor(prevB / 1000),
      });
    }
    return { rows, winner: m.winner ?? null };
  });

  // Décompte de manches gagnées au fil de l'eau (affiché après CHAQUE manche terminée).
  const runningWon = { A: 0, B: 0 };

  let wi = 0;
  const Sep = () => { const w = wobble[(wi++) % wobble.length]; return <div className="sv-sep" style={{ transform: `rotate(${w.rot}deg)`, width: `${w.w}%`, marginLeft: `${w.mx}px` }} />; };

  /** Une cellule manuscrite : vide si l'équipe n'a pas marqué sur cette donne. */
  const Cell = ({ cumul, scored, cross }: { cumul: number; scored: boolean; cross: boolean }) => {
    if (!scored) return <span className="sv-cell empty" />;
    const f = fmtCumul(cumul);
    return <span className={`sv-cell${cross ? ' cross' : ''}`}>{f.text}<i className="sv-apos">{f.apos}</i></span>;
  };

  return (
    <div className="sv" style={{ clipPath: clip }}>
      <div className="sv-head"><span>A</span><span>B</span></div>
      <div className="sv-rows">
        {blocks.map((bl, bi) => {
          const isCurrent = bl.winner === null;
          if (isCurrent) {
            // Manche EN COURS : toutes les donnes détaillées.
            return (
              <Fragment key={bi}>
                {bl.rows.map((r, i) => (
                  <div key={i} className="sv-row">
                    <Cell cumul={r.a} scored={r.aScored} cross={r.aCross} />
                    <Cell cumul={r.b} scored={r.bScored} cross={r.bCross} />
                  </div>
                ))}
              </Fragment>
            );
          }
          // Manche TERMINÉE : dernière ligne + décompte de manches gagnées à cet instant.
          const last = bl.rows[bl.rows.length - 1] ?? { a: 0, b: 0, aScored: true, bScored: true, aCross: false, bCross: false };
          if (bl.winner) runningWon[bl.winner] += 1;
          return (
            <Fragment key={bi}>
              <div className="sv-row">
                <Cell cumul={last.a} scored cross={last.aCross} />
                <Cell cumul={last.b} scored cross={last.bCross} />
              </div>
              <Sep />
              <div className="sv-row win"><span>{runningWon.A}</span><span>–</span><span>{runningWon.B}</span></div>
              <Sep />
            </Fragment>
          );
        })}
      </div>
      {messages.length > 0 && (
        <div className="sv-msgs">
          {messages.map((m, i) => <div key={i} className="sv-msg" style={{ transform: `rotate(${wobble[i % wobble.length].rot * 0.4}deg)` }}>{m}</div>)}
        </div>
      )}
    </div>
  );
}
