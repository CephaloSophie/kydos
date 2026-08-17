/* =============================================================================
 * PRESENTATION · screens/TournamentBracketScreen.ts (v14.13)
 * -----------------------------------------------------------------------------
 * Vue « coupe du monde » d'un bracket de tournoi.
 *
 * Layout :
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  ROUND 1 (8es)   ROUND 2 (Quart)   ROUND 3 (Demi)   ROUND 4 (Fin) │
 *   │  ┌──────┐ ────┐                                                    │
 *   │  │ M1   │    ├─┐                                                   │
 *   │  └──────┘ ───┘ │                                                   │
 *   │  ┌──────┐      ├───┐                                               │
 *   │  │ M2   │      │   │                                               │
 *   │  └──────┘      │   │                                               │
 *   │  ┌──────┐ ────┐│   │                                               │
 *   │  ...            (etc.)                                             │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Chaque nœud match :
 *   • Slot A + Slot B avec displayName, seed, score
 *   • Gagnant en surbrillance couleur tournoi
 *   • État visuel : gris (pas joué), or (en cours), gagnant highlight
 *   • Cliquable si gameId présent → route vers replay
 *
 * Les connecteurs sont dessinés en SVG absolu au-dessus des matchs pour
 * lier chaque match à son parent au round suivant (courbes bézier douces).
 *
 * Responsive : sur mobile, scroll horizontal natif (la vue peut être large).
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import type { AppContext } from '../context';

// Dimensions du layout — ajustées pour lisibilité mobile.
const MATCH_W = 180;
const MATCH_H = 68;
const V_GAP = 20;    // gap vertical entre matchs d'un round
const H_GAP = 60;    // gap horizontal entre colonnes de rounds
const PAD = 16;      // padding intérieur

interface BracketData {
  tournamentId: string;
  name: string;
  format: string;
  capacity: number;
  status: string;
  color: string;
  icon: string;
  bracket: {
    rounds: Array<{
      roundIndex: number;
      label: string;
      matches: Array<{
        matchIndex: number;
        matchId: string | null;
        gameId: string | null;
        slotA: { userId: string | null; seedIndex: number | null; displayName: string; userId2?: string | null; displayName2?: string };
        slotB: { userId: string | null; seedIndex: number | null; displayName: string; userId2?: string | null; displayName2?: string };
        winner: 'A' | 'B' | null;
        scoreA: number | null;
        scoreB: number | null;
        startedAt: string | null;
        finishedAt: string | null;
      }>;
    }>;
    lastCompletedRound: number;
    builtAt: string | null;
  };
  participants: Array<{ userId: string | { _id: string; username?: string }; finalPosition?: number | null; prizeAwarded?: number }>;
  winners: string[];
}

/**
 * Calcule la position Y d'un match dans son round. Round 1 : matchs
 * empilés régulièrement. Rounds suivants : centrés entre les 2 matchs
 * enfants du round précédent (structure « pyramide inversée »).
 *
 * Formule : au round r (1-based), le match d'index i occupe la position
 *   y = pad + ((2^(r-1)) * (i + 0.5)) * (matchH + vGap) - matchH/2
 * Ce qui centre visuellement chaque match par rapport aux 2 nœuds qui
 * l'alimentent au round précédent.
 */
function matchY(roundIndex: number, matchIndex: number): number {
  const spacing = Math.pow(2, roundIndex - 1);
  return PAD + spacing * (matchIndex + 0.5) * (MATCH_H + V_GAP) - MATCH_H / 2;
}

/** Position X d'un round (0-based externally, 1-based internally). */
function roundX(roundIndex: number): number {
  return PAD + (roundIndex - 1) * (MATCH_W + H_GAP);
}

export function TournamentBracketScreen(ctx: AppContext): HTMLElement {
  const { api, router } = ctx;
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const tournamentId = params.get('id') || '';

  const root = h('div', {
    class: 'anim-screen',
    style: {
      position: 'absolute', inset: '0',
      background: 'radial-gradient(1000px 600px at 50% 20%, #0e1729, #05070f 70%)',
      overflow: 'auto',
      padding: '18px clamp(14px, 3vw, 26px) 20px clamp(14px, 4vw, 60px)',
    },
  }) as HTMLElement & { _cleanup?: () => void };

  const header = h('div', { class: 'between', style: { marginBottom: '16px' } },
    h('div', {},
      h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'BRACKET'),
      h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '4px' } }, 'Coupe du monde')),
    Button('\u2190 Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go(`tournament?id=${tournamentId}`) }));

  const status = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', marginBottom: '12px' } }, 'Chargement du bracket…');
  const canvas = h('div', { style: { position: 'relative', width: 'max-content', minWidth: '100%' } });

  root.append(header, status, canvas);

  const load = async () => {
    try {
      const data = await api.getTournamentBracket(tournamentId) as BracketData;
      renderBracket(data);
    } catch (e) {
      status.textContent = `\u2717 ${(e as Error).message}`;
    }
  };

  const renderBracket = (data: BracketData) => {
    const cardColor = data.color || '#e6c46a';
    const totalRounds = data.bracket.rounds.length;
    // Nombre de matchs au round 1 = plus grand nombre → détermine la hauteur totale.
    const maxMatches = data.bracket.rounds[0]?.matches.length ?? 1;
    const svgHeight = PAD * 2 + maxMatches * (MATCH_H + V_GAP);
    const svgWidth = PAD * 2 + totalRounds * (MATCH_W + H_GAP);

    status.innerHTML = '';
    status.append(
      h('span', { style: { color: cardColor, fontWeight: '700', marginRight: '8px' } }, data.icon || '\u2666'),
      h('span', { class: 'title', style: { fontSize: '14px', color: 'var(--c-text)' } }, data.name),
      h('span', { class: 'mono', style: { marginLeft: '10px', fontSize: '10px' } }, `\u00b7 ${data.format} \u00b7 ${data.capacity} participants`),
    );

    clear(canvas);
    canvas.style.width = `${svgWidth}px`;
    canvas.style.height = `${svgHeight}px`;

    // 1) SVG des connecteurs (dessous des cartes).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(svgWidth));
    svg.setAttribute('height', String(svgHeight));
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';

    for (let r = 1; r < totalRounds; r++) {
      const round = data.bracket.rounds[r - 1];
      const nextRound = data.bracket.rounds[r];
      for (const m of round.matches) {
        const nextIdx = Math.floor(m.matchIndex / 2);
        // Point de sortie du match courant (bord droit, milieu vertical).
        const x1 = roundX(r) + MATCH_W;
        const y1 = matchY(r, m.matchIndex) + MATCH_H / 2;
        // Point d'entrée du match parent (bord gauche).
        const x2 = roundX(r + 1);
        const y2 = matchY(r + 1, nextIdx) + MATCH_H / 2;
        // Courbe bézier douce.
        const midX = (x1 + x2) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        path.setAttribute('fill', 'none');
        // Trait plus vif si le match est joué (le gagnant a été propagé).
        const traced = !!m.winner;
        path.setAttribute('stroke', traced ? cardColor : 'rgba(255,255,255,.10)');
        path.setAttribute('stroke-width', traced ? '2' : '1.5');
        path.setAttribute('opacity', traced ? '0.85' : '0.5');
        svg.appendChild(path);
      }
    }
    canvas.appendChild(svg);

    // 2) Cartes matchs par-dessus.
    for (const round of data.bracket.rounds) {
      // Label de round (au-dessus du 1er match).
      const label = h('div', { class: 'mono', style: {
        position: 'absolute',
        left: `${roundX(round.roundIndex)}px`,
        top: `${PAD - 12}px`,
        width: `${MATCH_W}px`,
        textAlign: 'center',
        fontSize: '10px',
        letterSpacing: '.10em',
        color: cardColor,
        fontWeight: '700',
      } }, round.label.toUpperCase());
      canvas.appendChild(label);

      for (const m of round.matches) {
        canvas.appendChild(renderMatchCard(m, round.roundIndex, cardColor));
      }
    }
  };

  const renderMatchCard = (m: BracketData['bracket']['rounds'][0]['matches'][0], roundIndex: number, cardColor: string): HTMLElement => {
    const x = roundX(roundIndex);
    const y = matchY(roundIndex, m.matchIndex);
    const done = !!m.winner;
    const live = !!m.startedAt && !m.winner;
    const clickable = !!m.gameId;
    const winnerA = m.winner === 'A';
    const winnerB = m.winner === 'B';

    const slot = (slot: typeof m.slotA, isWinner: boolean, isLoser: boolean, score: number | null) => {
      const empty = !slot.userId;
      // v14.14 — Carrée royale : un slot = une équipe de 2 (displayName & displayName2).
      const label = empty
        ? '—'
        : slot.displayName2
          ? `${slot.displayName || '?'} & ${slot.displayName2}`
          : slot.displayName || `Seed ${slot.seedIndex ?? '?'}`;
      return h('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 10px', height: `${MATCH_H / 2}px`,
          background: isWinner ? `${cardColor}22` : 'transparent',
          borderLeft: isWinner ? `3px solid ${cardColor}` : '3px solid transparent',
          opacity: empty ? 0.35 : isLoser ? 0.55 : 1,
        },
      },
        h('span', { style: {
          fontSize: '11px', fontWeight: isWinner ? '700' : '500',
          color: isWinner ? '#fff' : 'var(--c-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1',
        } }, label),
        h('span', { class: 'mono', style: {
          fontSize: '11px', fontWeight: '700', flexShrink: '0', marginLeft: '6px',
          color: isWinner ? cardColor : 'var(--c-text-mute)',
        } }, score != null ? String(score) : ''),
      );
    };

    const card = h('div', {
      style: {
        position: 'absolute',
        left: `${x}px`, top: `${y}px`,
        width: `${MATCH_W}px`, height: `${MATCH_H}px`,
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)), #0d1626',
        border: `1px solid ${done ? `${cardColor}55` : live ? '#e8964455' : 'rgba(255,255,255,.10)'}`,
        boxShadow: live ? `0 0 12px ${cardColor}33` : 'none',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform .15s ease, box-shadow .15s ease',
      },
      onClick: clickable ? () => router.go(`replay?id=${m.gameId}`) : undefined,
      onmouseover: clickable ? (e: MouseEvent) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 16px -4px ${cardColor}55`;
      } : undefined,
      onmouseout: clickable ? (e: MouseEvent) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = live ? `0 0 12px ${cardColor}33` : 'none';
      } : undefined,
    },
      slot(m.slotA, winnerA, winnerB, m.scoreA),
      h('div', { style: { height: '1px', background: 'rgba(255,255,255,.06)' } }),
      slot(m.slotB, winnerB, winnerA, m.scoreB),
    );
    return card;
  };

  void load();
  return root;
}
