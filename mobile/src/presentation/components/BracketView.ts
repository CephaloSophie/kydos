/* =============================================================================
 * PRESENTATION · components/BracketView.ts (v16)
 * -----------------------------------------------------------------------------
 * Arbre de tournoi RESPONSIVE (téléphone) affiché EN LIGNE : une colonne par
 * round, défilement horizontal natif sur petit écran. Chaque match montre ses
 * 2 slots (Carrée royale : 2 coéquipiers par slot), le score, le vainqueur en
 * surbrillance, et une action contextuelle :
 *   • match EN COURS (tableId) → « 👁 Regarder » (spectateur temps réel)
 *   • match TERMINÉ (gameId)   → « ▶ Revoir » (replay)
 *   • sinon                    → « à venir »
 * ========================================================================== */
import { h } from '../../core/dom';

interface Slot { userId: string | null; displayName: string; userId2?: string | null; displayName2?: string }
interface BMatch {
  matchIndex: number; matchId: string | null; gameId: string | null; tableId?: string | null;
  slotA: Slot; slotB: Slot; winner: 'A' | 'B' | null; scoreA: number | null; scoreB: number | null;
}
interface BRound { roundIndex: number; label: string; matches: BMatch[] }
export interface BracketData {
  color?: string;
  bracket: { rounds: BRound[] };
}

interface Handlers { onSpectate?: (tableId: string) => void; onReplay?: (gameId: string) => void }

const slotName = (s: Slot): string =>
  !s.userId ? '—' : (s.displayName2 ? `${s.displayName || '?'} & ${s.displayName2}` : (s.displayName || '?'));

export function BracketView(data: BracketData, handlers: Handlers = {}): HTMLElement {
  const color = data.color || '#e6c46a';
  const rounds = data.bracket?.rounds ?? [];

  const matchCard = (m: BMatch): HTMLElement => {
    const done = !!m.winner;
    const live = !m.winner && (!!m.tableId || m.scoreA != null || m.scoreB != null);

    const slotRow = (s: Slot, side: 'A' | 'B') => {
      const isWinner = m.winner === side;
      const isLoser = m.winner != null && !isWinner;
      const score = side === 'A' ? m.scoreA : m.scoreB;
      return h('div', { class: 'row between', style: {
        alignItems: 'center', padding: '5px 8px',
        background: isWinner ? `${color}22` : 'transparent',
        borderLeft: isWinner ? `3px solid ${color}` : '3px solid transparent',
        opacity: !s.userId ? '0.4' : isLoser ? '0.55' : '1',
      } },
        h('span', { style: {
          fontSize: '11px', fontWeight: isWinner ? '700' : '500',
          color: isWinner ? '#fff' : 'var(--c-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1', minWidth: '0',
        } }, slotName(s)),
        h('span', { class: 'mono', style: { fontSize: '11px', fontWeight: '700', marginLeft: '6px', color: isWinner ? color : 'var(--c-text-mute)' } },
          score != null ? String(score) : ''),
      );
    };

    const action = m.gameId
      ? h('button', { class: 'btn btn--sm btn--ghost', style: { width: '100%', marginTop: '4px', fontSize: '10px' }, onClick: () => handlers.onReplay?.(m.gameId!) }, '▶ Revoir')
      : (m.tableId
          ? h('button', { class: 'btn btn--sm', style: { width: '100%', marginTop: '4px', fontSize: '10px', background: color, color: '#1a0f00', fontWeight: '700' }, onClick: () => handlers.onSpectate?.(m.tableId!) }, '👁 Regarder')
          : h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)', textAlign: 'center', marginTop: '4px' } }, m.slotA.userId && m.slotB.userId ? 'à démarrer' : 'à venir'));

    return h('div', { style: {
      borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '10px',
      background: 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)), #0d1626',
      border: `1px solid ${done ? `${color}55` : live ? '#e8964455' : 'rgba(255,255,255,.10)'}`,
      boxShadow: live ? `0 0 10px ${color}22` : 'none',
      padding: '4px',
    } },
      slotRow(m.slotA, 'A'),
      h('div', { style: { height: '1px', background: 'rgba(255,255,255,.06)' } }),
      slotRow(m.slotB, 'B'),
      action,
    );
  };

  return h('div', { style: { display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0', WebkitOverflowScrolling: 'touch' } as any },
    ...rounds.map((round) =>
      h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: '160px', maxWidth: '200px', flex: '0 0 auto' } },
        h('div', { class: 'mono', style: { fontSize: '10px', letterSpacing: '.08em', color, fontWeight: '700', textAlign: 'center', marginBottom: '6px' } },
          (round.label || `Round ${round.roundIndex}`).toUpperCase()),
        ...round.matches.map(matchCard),
      )),
  );
}
