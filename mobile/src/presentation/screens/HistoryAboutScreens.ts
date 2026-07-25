/* =============================================================================
 * PRESENTATION · screens/HistoryAboutScreens.ts
 * Historique des parties (depuis /games, rejeu en direct) et À propos
 * (Cephalo Sophie, équipe, clients, liens). FIDÈLES au design system.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button, Badge } from '../components/ui';
import type { AppContext } from '../context';
import type { ServerGame } from '../../data/ApiClient';

export function HistoryScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

  // Filtres : portée (mes parties / publiques) + type de partie (SPEC §3.3).
  let scope: 'mine' | 'public' = 'mine';
  let kindFilter: 'all' | 'hybride' | 'acier' | 'royal' = 'all';
  let allGames: ServerGame[] = [];

  const KIND_LABEL: Record<string, string> = { hybride: 'Alliance Hybride', acier: "Duo d'Acier", royal: 'Carré Royal', local: 'Entraînement' };

  const rowEl = (g: ServerGame) => h('div', {
    class: 'row gap-3', style: { padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', cursor: 'pointer' },
    onClick: () => router.go(`replay?id=${g.id}`),
  },
    h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', width: '84px' } }, new Date(g.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })),
    h('span', { class: 'title fill', style: { fontSize: '13px' } }, g.mode === 'local' ? 'Partie locale' : KIND_LABEL[g.kind ?? 'local'] ?? 'Partie en ligne'),
    h('span', { class: 'mono', style: { fontSize: '11px', color: g.winner === 'A' ? 'var(--c-success)' : 'var(--c-danger)' } }, g.winner ? `Équipe ${g.winner}` : '—'),
    h('span', { class: 'mono gold', style: { fontSize: '10px' } }, '▶ Rejouer'),
  );

  const list = h('div', { class: 'col gap-2' }, h('div', { class: 'text-mute', style: { fontSize: '12px' } }, "Chargement de l'historique…"));

  const applyFilters = () => {
    clear(list);
    const filtered = kindFilter === 'all' ? allGames : allGames.filter((g) => (g.kind ?? 'local') === kindFilter);
    if (!filtered.length) { list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Aucune partie pour ces filtres.')); return; }
    filtered.forEach((g) => list.append(rowEl(g)));
  };

  const load = () => {
    clear(list); list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement…'));
    api.listGames(scope)
      .then(({ games }) => { allGames = games; applyFilters(); })
      .catch((e) => { clear(list); list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, `Impossible de charger : ${(e as Error).message}`)); });
  };

  // Onglets de portée.
  const scopeTab = (value: 'mine' | 'public', label: string) => h('span', {
    class: 'mono', style: { cursor: 'pointer', padding: '6px 13px', borderRadius: 'var(--r-pill)', fontSize: '11px',
      background: scope === value ? 'rgba(230,196,106,.16)' : 'var(--c-veil-06)',
      border: `1px solid ${scope === value ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)'}`,
      color: scope === value ? 'var(--c-gold)' : 'var(--c-text-soft)' },
    onClick: () => { scope = value; renderTabs(); load(); },
  }, label);
  const scopeRow = h('div', { class: 'row gap-2' });
  const renderScope = () => { clear(scopeRow); scopeRow.append(scopeTab('mine', 'Mes parties'), scopeTab('public', 'Publiques')); };

  // Filtres de type.
  const kindTab = (value: typeof kindFilter, label: string) => h('span', {
    class: 'mono', style: { cursor: 'pointer', padding: '5px 11px', borderRadius: 'var(--r-pill)', fontSize: '10px',
      background: kindFilter === value ? 'rgba(126,203,152,.16)' : 'var(--c-veil-06)',
      border: `1px solid ${kindFilter === value ? 'rgba(126,203,152,.5)' : 'var(--c-line-strong)'}`,
      color: kindFilter === value ? 'var(--c-success)' : 'var(--c-text-soft)' },
    onClick: () => { kindFilter = value; renderKinds(); applyFilters(); },
  }, label);
  const kindRow = h('div', { class: 'row gap-2 wrap' });
  const renderKinds = () => { clear(kindRow); kindRow.append(
    kindTab('all', 'Toutes'), kindTab('hybride', 'Alliance Hybride'), kindTab('acier', "Duo d'Acier"), kindTab('royal', 'Carré Royal')); };

  const renderTabs = () => { renderScope(); };
  renderScope(); renderKinds();
  load();

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '10px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'ARCHIVES'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Historique des parties')),
      Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') })),
    h('div', { class: 'row gap-3 wrap', style: { marginBottom: '8px' } }, scopeRow),
    h('div', { style: { marginBottom: '12px' } }, kindRow),
    list,
  );
}

const TEAM = [
  { name: 'Ameur Hamdouni', role: 'CEO & Founder & Architect', mail: 'ameur.hamdouni@cephalosophie.com' },
  { name: 'Abdelhamid Sghaier', role: 'Co-fondateur & CTO · expert mobile', mail: 'abdelhamid.sghaier@cephalosophie.com' },
];
const CLIENTS = ['IFPEN', 'La Poste', 'LeadsHook', 'Docaposte', 'Softia', 'JCDecaux', 'Unibet', 'Allianz'];

export function AboutScreen(ctx: AppContext): HTMLElement {
  const { router } = ctx;
  const link = (href: string, label: string) => h('a', { href, target: '_blank', rel: 'noreferrer', class: 'gold', style: { fontWeight: '600' } }, label);

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'CEPHALO SOPHIE'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'À propos')),
      Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') })),
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
  );
}
