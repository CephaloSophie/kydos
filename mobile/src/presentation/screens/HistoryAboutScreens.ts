/* =============================================================================
 * PRESENTATION · screens/HistoryAboutScreens.ts
 * Historique des parties (depuis /games, rejeu en direct) et À propos
 * (Cephalo Sophie, équipe, clients, liens). FIDÈLES au design system.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button, Badge, BackButton } from '../components/ui';
import { APP_VERSION } from '../../version';
import type { AppContext } from '../context';
import type { ServerGame } from '../../data/ApiClient';

export function HistoryScreen(ctx: AppContext): HTMLElement {
  const { router, api, ads } = ctx;

  // Portée : mes parties (créées ou où je joue) / mes robots / mon équipe / publiques.
  type Scope = 'mine' | 'myrobots' | 'team' | 'public';
  let scope: Scope = 'mine';
  let kindFilter: 'all' | 'hybride' | 'acier' | 'royal' | 'local' = 'all';
  let page = 1;
  let totalPages = 1;
  let total = 0;

  const KIND_LABEL: Record<string, string> = { hybride: 'Alliance Hybride', acier: "Duo d'Acier", royal: 'Carré Royal', local: 'Entraînement' };

  // Noms des joueurs d'une partie, séparés NOUS (A) / EUX (B).
  const sideNames = (g: ServerGame, team: 'A' | 'B') =>
    (g.participants ?? []).filter((p) => p.team === team).map((p) => p.name || (p.type === 'robot' ? '🤖' : '?')).join(' + ') || '—';

  const rowEl = (g: ServerGame) => {
    const fs = g.finalScore ?? { A: 0, B: 0 };
    const winA = g.winner === 'A';
    const winB = g.winner === 'B';
    return h('div', {
      class: 'col gap-2', style: { padding: '11px 14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)' },
    },
      h('div', { class: 'between' },
        h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
          h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)' } }, new Date(g.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })),
          Badge(g.mode === 'local' ? 'Entraînement' : KIND_LABEL[g.kind ?? 'local'] ?? 'En ligne', g.kind === 'royal' ? 'info' : g.kind === 'acier' ? 'level' : 'gold'),
          g.visibility === 'public' ? Badge('Publique', 'success') : null),
        h('span', { class: 'mono', style: { fontSize: '11px', color: winA ? 'var(--c-success)' : winB ? 'var(--c-danger)' : 'var(--c-text-mute)' } },
          g.winner ? `${g.winner === 'A' ? 'NOUS' : 'EUX'} gagne` : 'Nulle')),
      // Ligne de score NOUS / EUX avec les joueurs.
      h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
        h('div', { class: 'col fill', style: { minWidth: '0' } },
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-success)', fontWeight: winA ? '700' : '400' } }, `NOUS  ${fs.A}`),
          h('span', { style: { fontSize: '10px', color: 'var(--c-text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, sideNames(g, 'A'))),
        h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-faint)' } }, 'vs'),
        h('div', { class: 'col fill', style: { minWidth: '0', textAlign: 'right' } },
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-danger)', fontWeight: winB ? '700' : '400' } }, `${fs.B}  EUX`),
          h('span', { style: { fontSize: '10px', color: 'var(--c-text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, sideNames(g, 'B')))),
      // Actions : voir les stats détaillées / rejouer.
      h('div', { class: 'row gap-2', style: { marginTop: '2px' } },
        Button('📊 Statistiques', { variant: 'secondary', size: 'sm', onClick: () => router.go(`gamestats?id=${g.id}`) }),
        Button('▶ Rejouer', { variant: 'ghost', size: 'sm', onClick: async () => { await ads.beforeLaunchSaved(); router.go(`replay?id=${g.id}`); } })),
    );
  };

  const list = h('div', { class: 'col gap-2' }, h('div', { class: 'text-mute', style: { fontSize: '12px' } }, "Chargement de l'historique…"));

  // Barre de pagination (15 par page).
  const pager = h('div', { class: 'row center gap-3', style: { marginTop: '10px' } });
  const renderPager = () => {
    clear(pager);
    if (totalPages <= 1) return;
    pager.append(
      Button('‹ Précédent', { variant: 'secondary', size: 'sm', disabled: page <= 1, onClick: () => { if (page > 1) { page--; load(); } } }),
      h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, `Page ${page} / ${totalPages}  ·  ${total} partie${total > 1 ? 's' : ''}`),
      Button('Suivant ›', { variant: 'secondary', size: 'sm', disabled: page >= totalPages, onClick: () => { if (page < totalPages) { page++; load(); } } }),
    );
  };

  const load = () => {
    clear(list); list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement…'));
    api.listGames(scope, { page, kind: kindFilter })
      .then((res) => {
        totalPages = res.totalPages; total = res.total; page = res.page;
        clear(list);
        if (!res.games.length) { list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Aucune partie pour ces filtres.')); renderPager(); return; }
        res.games.forEach((g) => list.append(rowEl(g)));
        renderPager();
      })
      .catch((e) => { clear(list); list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, `Impossible de charger : ${(e as Error).message}`)); });
  };

  // Onglets de portée.
  const scopeTab = (value: Scope, label: string) => h('span', {
    class: 'mono', style: { cursor: 'pointer', padding: '6px 13px', borderRadius: 'var(--r-pill)', fontSize: '11px',
      background: scope === value ? 'rgba(230,196,106,.16)' : 'var(--c-veil-06)',
      border: `1px solid ${scope === value ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)'}`,
      color: scope === value ? 'var(--c-gold)' : 'var(--c-text-soft)' },
    onClick: () => { scope = value; page = 1; renderScope(); load(); },
  }, label);
  const scopeRow = h('div', { class: 'row gap-2 wrap' });
  const renderScope = () => { clear(scopeRow); scopeRow.append(
    scopeTab('mine', 'Mes parties'), scopeTab('myrobots', 'Mes robots'), scopeTab('team', 'Mon équipe'), scopeTab('public', 'Publiques')); };

  // Filtres de type.
  const kindTab = (value: typeof kindFilter, label: string) => h('span', {
    class: 'mono', style: { cursor: 'pointer', padding: '5px 11px', borderRadius: 'var(--r-pill)', fontSize: '10px',
      background: kindFilter === value ? 'rgba(126,203,152,.16)' : 'var(--c-veil-06)',
      border: `1px solid ${kindFilter === value ? 'rgba(126,203,152,.5)' : 'var(--c-line-strong)'}`,
      color: kindFilter === value ? 'var(--c-success)' : 'var(--c-text-soft)' },
    onClick: () => { kindFilter = value; page = 1; renderKinds(); load(); },
  }, label);
  const kindRow = h('div', { class: 'row gap-2 wrap' });
  const renderKinds = () => { clear(kindRow); kindRow.append(
    kindTab('all', 'Toutes'), kindTab('hybride', 'Alliance Hybride'), kindTab('acier', "Duo d'Acier"), kindTab('royal', 'Carré Royal'), kindTab('local', 'Entraînement')); };

  renderScope(); renderKinds();
  load();

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '52px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    BackButton('← Accueil', () => router.go('home')),
    h('div', { class: 'between', style: { marginBottom: '10px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'ARCHIVES'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Historique des parties'))),
    h('div', { class: 'row gap-3 wrap', style: { marginBottom: '8px' } }, scopeRow),
    h('div', { style: { marginBottom: '12px' } }, kindRow),
    list,
    pager,
  );
}

const TEAM = [
  { name: 'Ameur Hamdouni', role: 'CEO & Founder & Architect', mail: 'ameur.hamdouni@cephalosophie.com' },
  { name: 'Abdelhamid Sghaier', role: 'Co-fondateur & CTO · expert mobile', mail: 'abdelhamid.sghaier@cephalosophie.com' },
];
const CLIENTS = ['IFPEN', 'La Poste', 'LeadsHook', 'Docaposte', 'Softia', 'JCDecaux', 'Allianz', 'Genybet'];

export function AboutScreen(ctx: AppContext): HTMLElement {
  const { router } = ctx;
  const link = (href: string, label: string) => h('a', { href, target: '_blank', rel: 'noreferrer', class: 'gold', style: { fontWeight: '600' } }, label);

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '52px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    BackButton('← Accueil', () => router.go('home')),
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'CEPHALO SOPHIE'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'À propos'))),
    h('div', { class: 'card', style: { marginBottom: '12px' } },
      h('p', { style: { fontSize: '13px', lineHeight: '1.6', color: 'var(--c-text-soft)', margin: '0' } },
        h('strong', { class: 'gold' }, 'Kýdos Belote'), ' est édité par ', link('https://cephalosophie.com', 'Cephalo Sophie'),
        ', créateur de ', link('https://kantoaplo.com', 'KANTO APLO'), ' — la plateforme no-code « Rends-le Simple ». Site officiel du jeu : ',
        link('https://kydosbelote.com', 'kydosbelote.com'), '.')),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' } },
      ...TEAM.map((t) => h('div', { class: 'card' },
        h('div', { class: 'title', style: { fontSize: '14px' } }, t.name),
        h('div', { class: 'text-mute', style: { fontSize: '11px', margin: '4px 0 6px' } }, t.role),
        h('a', { href: `mailto:${t.mail}`, class: 'mono gold', style: { fontSize: '10px' } }, t.mail)))),
    h('div', { class: 'card' },
      h('div', { class: 'eyebrow', style: { marginBottom: '8px' } }, 'ILS NOUS FONT CONFIANCE'),
      h('div', { class: 'row gap-2 wrap' }, ...CLIENTS.map((c) => Badge(c))),
      h('div', { class: 'mono', style: { fontSize: '10px', marginTop: '10px', color: 'var(--c-text-mute)' } }, 'Contact : ', h('a', { href: 'mailto:contact@cephalosophie.com', class: 'gold' }, 'contact@cephalosophie.com'))),
    // Version de l'app (source de vérité : mobile/src/version.ts).
    h('div', { class: 'card', style: { marginTop: '12px', textAlign: 'center' } },
      h('div', { class: 'eyebrow' }, 'VERSION'),
      h('div', { class: 'title', style: { fontSize: '18px', margin: '4px 0', color: 'var(--c-gold)' } }, `Kýdos Belote v${APP_VERSION}`),
      h('div', { class: 'text-mute', style: { fontSize: '10px' } }, 'Développé avec Claude — © Cephalo Sophie')),
  );
}
