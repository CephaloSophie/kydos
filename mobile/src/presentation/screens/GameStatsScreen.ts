/* =============================================================================
 * PRESENTATION · screens/GameStatsScreen.ts
 * -----------------------------------------------------------------------------
 * Tableau de bord DÉTAILLÉ d'une partie sauvegardée (distinct du rejeu) : le
 * résultat, les joueurs des deux camps, le score final et manche par manche, et
 * les statistiques calculées côté serveur (plis, contrées et surcontrées et
 * leur réussite, capots réalisés, capots annoncés, belotes).
 *
 * FIDÈLE au design system. Aucun WebSocket : simple lecture du document Game.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button, Badge } from '../components/ui';
import type { AppContext } from '../context';
import type { ServerGame } from '../../data/ApiClient';
import { openPlayerProfile } from '../components/PlayerProfile';

const KIND_LABEL: Record<string, string> = { hybride: 'Alliance Hybride', acier: "Duo d'Acier", royal: 'Carré Royal', local: 'Entraînement' };

/** Petite tuile de statistique (valeur + libellé). */
function statTile(value: string, label: string, accent = 'var(--c-text)') {
  return h('div', { class: 'col', style: {
    padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-06)',
    border: '1px solid var(--c-line)', minWidth: '0', gap: '2px',
  } },
    h('span', { class: 'mono', style: { fontSize: '22px', fontWeight: '700', color: accent, lineHeight: '1.1' } }, value),
    h('span', { style: { fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--c-text-mute)' } }, label));
}

/** Barre comparative NOUS (A) / EUX (B) pour une métrique. */
function compareBar(label: string, a: number, b: number) {
  const total = a + b || 1;
  const pctA = Math.round((a / total) * 100);
  return h('div', { class: 'col gap-1' },
    h('div', { class: 'between' },
      h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-success)' } }, `${a}`),
      h('span', { style: { fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--c-text-mute)' } }, label),
      h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-danger)' } }, `${b}`)),
    h('div', { style: { height: '7px', borderRadius: '4px', overflow: 'hidden', display: 'flex', background: 'var(--c-danger)' } },
      h('div', { style: { width: `${pctA}%`, background: 'var(--c-success)' } })));
}

export function GameStatsScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;
  const id = new URLSearchParams(location.hash.split('?')[1] ?? '').get('id');

  const body = h('div', { class: 'col gap-3' }, h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement des statistiques…'));

  const sideParticipants = (g: ServerGame, team: 'A' | 'B') =>
    (g.participants ?? []).filter((p) => p.team === team);

  // Rend un nom : cliquable (→ profil) pour un humain identifié, statique sinon.
  const nameEl = (p: { name: string; type: 'human' | 'robot'; userId: string | null }) => {
    const label = p.name || (p.type === 'robot' ? '🤖 Robot' : '?');
    if (p.type === 'human' && p.userId) {
      return h('span', {
        style: { fontSize: '13px', color: 'var(--c-gold)', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' },
        onClick: () => openPlayerProfile(api, p.userId!, p.name),
      }, label);
    }
    return h('span', { style: { fontSize: '13px', color: 'var(--c-text)' } }, label);
  };

  const render = (g: ServerGame) => {
    clear(body);
    const st = g.stats;
    const fs = g.finalScore ?? { A: 0, B: 0 };
    const mw = g.manchesWon ?? { A: 0, B: 0 };
    const winA = g.winner === 'A';
    const winB = g.winner === 'B';

    // Bandeau résultat.
    body.append(h('div', { class: 'col gap-2', style: { padding: '16px', borderRadius: 'var(--r-xl)', background: 'var(--c-veil-06)', border: '1px solid var(--c-line-strong)' } },
      h('div', { class: 'between' },
        h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
          Badge(g.mode === 'local' ? 'Entraînement' : KIND_LABEL[g.kind ?? 'local'] ?? 'En ligne', g.kind === 'royal' ? 'info' : g.kind === 'acier' ? 'level' : 'gold'),
          g.visibility === 'public' ? Badge('Publique', 'success') : null),
        h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, new Date(g.createdAt).toLocaleString('fr-FR'))),
      // Score géant.
      h('div', { class: 'row center gap-3', style: { padding: '8px 0' } },
        h('div', { class: 'col center', style: { flex: '1' } },
          h('span', { style: { fontSize: '11px', letterSpacing: '.1em', color: 'var(--c-success)' } }, 'NOUS'),
          h('span', { class: 'mono', style: { fontSize: '40px', fontWeight: '800', color: winA ? 'var(--c-success)' : 'var(--c-text)', lineHeight: '1' } }, `${fs.A}`),
          h('span', { style: { fontSize: '10px', color: 'var(--c-text-mute)' } }, `${mw.A} manche${mw.A > 1 ? 's' : ''}`)),
        h('span', { class: 'mono', style: { fontSize: '20px', color: 'var(--c-text-faint)' } }, '–'),
        h('div', { class: 'col center', style: { flex: '1' } },
          h('span', { style: { fontSize: '11px', letterSpacing: '.1em', color: 'var(--c-danger)' } }, 'EUX'),
          h('span', { class: 'mono', style: { fontSize: '40px', fontWeight: '800', color: winB ? 'var(--c-danger)' : 'var(--c-text)', lineHeight: '1' } }, `${fs.B}`),
          h('span', { style: { fontSize: '10px', color: 'var(--c-text-mute)' } }, `${mw.B} manche${mw.B > 1 ? 's' : ''}`))),
      h('div', { class: 'center', style: { fontSize: '13px', fontWeight: '600', color: winA ? 'var(--c-success)' : winB ? 'var(--c-danger)' : 'var(--c-text-mute)' } },
        g.winner ? `Victoire ${g.winner === 'A' ? 'de NOUS' : "d'EUX"}` : 'Partie nulle')));

    // Compositions.
    const partA = sideParticipants(g, 'A'); const partB = sideParticipants(g, 'B');
    body.append(h('div', { class: 'row gap-3' },
      h('div', { class: 'col fill gap-1', style: { padding: '12px', borderRadius: 'var(--r-lg)', background: 'rgba(126,203,152,.08)', border: '1px solid rgba(126,203,152,.3)' } },
        h('span', { style: { fontSize: '10px', letterSpacing: '.1em', color: 'var(--c-success)' } }, 'ÉQUIPE NOUS (A + C)'),
        ...partA.map(nameEl)),
      h('div', { class: 'col fill gap-1', style: { padding: '12px', borderRadius: 'var(--r-lg)', background: 'rgba(232,93,112,.08)', border: '1px solid rgba(232,93,112,.3)' } },
        h('span', { style: { fontSize: '10px', letterSpacing: '.1em', color: 'var(--c-danger)' } }, 'ÉQUIPE EUX (B + D)'),
        ...partB.map(nameEl))));

    if (!st) {
      body.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Statistiques détaillées indisponibles pour cette partie.'));
    } else {
      // Tuiles de synthèse.
      body.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' } },
        statTile(`${st.totalDonnes}`, 'Donnes jouées'),
        statTile(`${st.contres}`, 'Contres posés', 'var(--c-gold)'),
        statTile(`${st.contresReussies}`, 'Contres réussis', 'var(--c-success)'),
        statTile(`${st.surcontres}`, 'Surcontres', 'var(--c-danger)'),
        statTile(`${st.capotsTotal}`, 'Capots réalisés', 'var(--c-gold)'),
        statTile(`${st.capotsAnnoncesTotal}`, 'Capots annoncés', 'var(--c-info)')));

      // Barres comparatives NOUS / EUX.
      body.append(h('div', { class: 'col gap-3', style: { padding: '14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)' } },
        h('span', { style: { fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--c-text-mute)' } }, 'Comparatif NOUS / EUX'),
        compareBar('Plis remportés', st.totalTricksA, st.totalTricksB),
        compareBar('Capots réalisés', st.capotsA, st.capotsB),
        compareBar('Capots annoncés', st.capotsAnnoncesA, st.capotsAnnoncesB),
        compareBar('Belotes', st.belotesA, st.belotesB)));
    }

    // Manches détaillées.
    if (g.manches && g.manches.length) {
      body.append(h('div', { class: 'col gap-2', style: { padding: '14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)' } },
        h('span', { style: { fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--c-text-mute)' } }, 'Manches'),
        ...(g.manches as any[]).map((m) => h('div', { class: 'between', style: { padding: '6px 0', borderBottom: '1px solid var(--c-line)' } },
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, `Manche ${m.number}${m.target ? ` · objectif ${m.target}` : ''}`),
          h('span', { class: 'mono', style: { fontSize: '12px' } },
            h('span', { style: { color: 'var(--c-success)' } }, `${m.scoreTeamA}`),
            h('span', { style: { color: 'var(--c-text-faint)' } }, ' – '),
            h('span', { style: { color: 'var(--c-danger)' } }, `${m.scoreTeamB}`),
            m.winner ? h('span', { style: { marginLeft: '8px', color: m.winner === 'A' ? 'var(--c-success)' : 'var(--c-danger)' } }, `▸ ${m.winner === 'A' ? 'NOUS' : 'EUX'}`) : null)))));
    }

    // Rejouer.
    body.append(h('div', { class: 'row center', style: { marginTop: '4px' } },
      Button('▶ Rejouer cette partie', { onClick: () => router.go(`replay?id=${g.id}`) })));
  };

  if (!id) {
    clear(body); body.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Partie introuvable.'));
  } else {
    api.getGame(id)
      .then(({ game }) => render(game))
      .catch((e) => { clear(body); body.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, `Impossible de charger : ${(e as Error).message}`)); });
  }

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'STATISTIQUES'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Détail de la partie')),
      Button('← Historique', { variant: 'secondary', size: 'sm', onClick: () => router.go('history') })),
    body,
  );
}
