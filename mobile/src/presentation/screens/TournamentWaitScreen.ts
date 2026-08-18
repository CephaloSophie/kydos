/* =============================================================================
 * PRESENTATION · screens/TournamentWaitScreen.ts (v16)
 * -----------------------------------------------------------------------------
 * Écran « salle d'attente » du joueur dans un tournoi LIVE. Point d'entrée
 * unique depuis l'accueil / la pastille LIVE ; il DISPATCHE selon le statut
 * renvoyé par GET /tournaments/mine :
 *   • playing  → rejoint la table de MON match (ou attend un Duo headless).
 *   • waiting  → mon adversaire se qualifie : affiche l'autre match EN DIRECT
 *                (score live), un bouton spectateur, et la liste à finir.
 *   • pending  → mon match va démarrer (les 2 qualifiés sont connus).
 *   • champion → j'ai gagné la finale.
 *   • eliminated/none → retour.
 * Rafraîchissement auto (4 s) ; saut automatique dès que mon match démarre.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import type { AppContext } from '../context';
import type { TournamentActive } from '../../data/ApiClient';

export function TournamentWaitScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

  const root = h('div', { class: 'anim-screen', style: {
    position: 'absolute', inset: '0', padding: '20px 26px 20px 62px', overflow: 'auto',
    background: 'radial-gradient(900px 500px at 50% 25%, #101b2f, #05070f 70%)',
  } }) as HTMLElement & { _cleanup?: () => void };

  let poller: ReturnType<typeof setInterval> | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;
  const clearTicker = () => { if (ticker) { clearInterval(ticker); ticker = null; } };
  const stop = () => { if (poller) { clearInterval(poller); poller = null; } clearTicker(); };

  const spectate = (tableId: string) => router.go(`table?online=${tableId}&watch=1`);

  /** Élément de compte à rebours (mm:ss) mis à jour chaque seconde. */
  const countdownEl = (startsAtIso: string): HTMLElement => {
    const el = h('div', { class: 'mono', style: { fontSize: '40px', fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: '.04em' } }, '—');
    const paint = () => {
      const left = Math.max(0, Math.ceil((new Date(startsAtIso).getTime() - Date.now()) / 1000));
      el.textContent = left > 0 ? String(left) : 'GO';
    };
    paint();
    clearTicker();
    ticker = setInterval(paint, 1000);
    return el;
  };

  const render = (a: TournamentActive | null) => {
    clear(root);
    clearTicker();   // un seul décompte actif à la fois (re-render toutes les 4 s)
    const back = Button('← Compétitions', { variant: 'secondary', size: 'sm', onClick: () => router.go('compet') });

    if (!a || a.state === 'none' || a.state === 'eliminated') {
      stop();
      root.append(
        h('div', { class: 'between', style: { marginBottom: '14px' } },
          h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)' } }, a?.state === 'eliminated' ? 'Éliminé' : 'Aucun match en attente'), back),
        h('div', { class: 'card', style: { padding: '18px', textAlign: 'center' } },
          h('div', { style: { color: 'var(--c-text-mute)', fontSize: '13px' } },
            a?.state === 'eliminated' ? 'Vous avez été éliminé de ce tournoi.' : 'Vous n’avez pas de match de tournoi en cours.'),
          a ? h('div', { style: { marginTop: '12px' } }, Button('Voir le tournoi', { size: 'sm', onClick: () => router.go(`tournament?id=${a.tournamentId}`) })) : h('span', {}, '')));
      return;
    }

    // Mon match est prêt → je rejoins (table live) ou j'attends un Duo headless.
    if (a.state === 'playing') {
      // Mon match a une table → je la rejoins (comme joueur, pas spectateur).
      if (a.myTableId) { stop(); router.go(`table?online=${a.myTableId}`); return; }
      root.append(
        header(a, back),
        h('div', { class: 'card', style: { padding: '20px', textAlign: 'center' } },
          h('div', { class: 'live-chip__dot', style: { margin: '0 auto 10px' } }),
          h('div', { class: 'title', style: { fontSize: '15px' } }, 'Votre match est en cours…'),
          h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', marginTop: '6px' } }, 'Résultat dans un instant.')));
      return;
    }

    if (a.state === 'champion') {
      stop();
      root.append(
        header(a, back),
        h('div', { class: 'feature-card', style: { padding: '24px', borderRadius: 'var(--r-lg)', '--card-grad': 'var(--g-gold)', color: '#fff', textAlign: 'center' } as any },
          h('div', { style: { fontSize: '46px' } }, '🏆'),
          h('div', { class: 'title', style: { fontSize: '20px', margin: '6px 0' } }, 'Champion !'),
          h('div', { style: { marginTop: '12px' } }, Button('Voir le bracket', { size: 'sm', onClick: () => router.go(`tournament-bracket?id=${a.tournamentId}`) }))));
      return;
    }

    // waiting / pending
    const items = a.awaiting.length ? a.awaiting : [];
    root.append(
      header(a, back),
      h('div', { class: 'feature-card', style: { padding: '18px', borderRadius: 'var(--r-lg)', '--card-grad': 'var(--g-gold)', color: '#fff' } as any },
        h('div', { class: 'mono', style: { fontSize: '10px', opacity: '.85', letterSpacing: '.08em' } },
          a.roundLabel ? `PROCHAIN MATCH · ${a.roundLabel.toUpperCase()}` : 'PROCHAIN MATCH'),
        h('div', { class: 'title', style: { fontSize: '18px', margin: '6px 0 2px' } },
          a.state === 'pending' ? 'Votre match démarre dans…' : 'En attente de votre adversaire'),
        // v16 — compte à rebours avant le démarrage (état 'pending').
        a.state === 'pending' && a.startsAt ? countdownEl(a.startsAt) : h('span', {}, ''),
        h('div', { style: { fontSize: '12px', opacity: '.9', marginTop: a.state === 'pending' ? '8px' : '0' } },
          a.state === 'pending'
            ? 'Les deux qualifiés sont connus. Préparez-vous, la table s’ouvre à la fin du décompte.'
            : 'Votre adversaire est en train de se qualifier. Vous serez amené automatiquement à votre match dès qu’il sera prêt.')),
    );

    if (items.length) {
      root.append(h('div', { class: 'eyebrow', style: { margin: '18px 0 8px', color: 'var(--c-text-mute)' } }, 'À TERMINER AVANT VOTRE MATCH'));
      for (const m of items) {
        const live = m.winner == null && (m.scoreA != null || m.scoreB != null);
        root.append(
          h('div', { class: 'card', style: { marginBottom: '10px' } },
            h('div', { class: 'between', style: { alignItems: 'center' } },
              h('div', { class: 'col', style: { gap: '2px' } },
                h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
                  m.winner == null ? h('span', { class: 'live-chip__dot' }) : h('span', {}, ''),
                  h('span', { class: 'mono', style: { fontSize: '10px', color: m.winner == null ? 'var(--c-success)' : 'var(--c-text-mute)' } },
                    m.winner == null ? 'EN DIRECT' : 'TERMINÉ')),
                h('div', { style: { fontSize: '13px', marginTop: '4px' } }, `${m.slotAName}  vs  ${m.slotBName}`)),
              h('div', { class: 'mono', style: { fontSize: '18px', color: 'var(--c-gold)', fontWeight: '700' } },
                `${m.scoreA ?? 0} — ${m.scoreB ?? 0}`)),
            m.tableId
              ? h('div', { style: { marginTop: '10px' } },
                  h('button', { class: 'btn btn--sm btn--ghost', onClick: () => spectate(m.tableId!) }, '👁 Regarder en spectateur'))
              : h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', marginTop: '8px' } }, 'Table pas encore ouverte.'),
          ),
        );
        void live;
      }
    }
  };

  const header = (a: TournamentActive, back: HTMLElement) =>
    h('div', { class: 'between', style: { marginBottom: '14px' } },
      h('div', {},
        h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, `${a.icon || '♦'} ${a.name}`),
        h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Salle d’attente')),
      back);

  const load = async () => {
    try {
      const { active } = await api.getMyTournament();
      render(active);
    } catch (e) {
      clear(root);
      root.append(h('div', { class: 'mono', style: { color: 'var(--c-danger)' } }, `✗ ${(e as Error).message}`));
    }
  };

  void load();
  poller = setInterval(() => void load(), 4000);
  root._cleanup = () => stop();
  return root;
}
