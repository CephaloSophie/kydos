/* =============================================================================
 * PRESENTATION · screens/HomeScreen.ts
 * Accueil : grandes cartes-fonctionnalités + éventail permanent des écrans
 * (menu de navigation), FIDÈLE au design system. Barre supérieure avec
 * déblocage des jetons quotidiens.
 * ========================================================================== */
import { h } from '../../core/dom';
import { TopBar } from '../components/TopBar';
import type { AppContext } from '../context';

/** Cartes-fonctionnalités mises en avant sur l'accueil (enseignes du DS). */
const FEATURES = [
  { route: 'table', kicker: 'LE JEU', title: 'Jouer', desc: 'Lancer une partie avec vos robots.', glyph: '♥', grad: 'var(--g-heart)' },
  { route: 'robots', kicker: 'ROBOTS', title: 'Mes robots', desc: 'Gérer & entraîner votre écurie.', glyph: '♠', grad: 'var(--g-spade)' },
  { route: 'create', kicker: 'ÉDITEUR', title: 'Créer un robot', desc: 'Concevez votre IA de belote.', glyph: '♦', grad: 'var(--g-diamond)' },
];

/**
 * Menus secondaires de l'accueil (KB-100) — toutes les sections du produit
 * atteignables en un geste : gestion d'équipe, invitations, jeu en ligne,
 * compétitions, jetons, archives et classements.
 */
const MENUS = [
  { route: 'online',  glyph: '♠', label: 'Jouer en ligne', desc: 'Rejoindre ou créer une table' },
  { route: 'team',    glyph: '♣', label: 'Mon équipe',     desc: 'Membres, rôles, exclusions' },
  { route: 'teams',   glyph: '♣', label: 'Équipes',        desc: 'Rejoindre une équipe publique' },
  { route: 'compet',  glyph: '★', label: 'Compétitions',   desc: 'Tournois entre robots' },
  { route: 'wallet',  glyph: '◆', label: 'Porte-monnaie',  desc: 'Jetons et récompenses' },
  { route: 'ranking', glyph: '◆', label: 'Classements',    desc: 'Saison en cours' },
  { route: 'history', glyph: '◆', label: 'Historique',     desc: 'Rejouer vos parties' },
  { route: 'about',   glyph: '✦', label: 'À propos',       desc: 'Cephalo Sophie' },
];

/** Routes présentes dans l'éventail de navigation permanent. */
const FAN_ROUTES = ['table', 'online', 'robots', 'create', 'wallet', 'teams', 'ranking', 'compet', 'history', 'about'];

export function HomeScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

  /**
   * Bannière « Partie en cours… » (SPEC §3.8) : appelée dès que l'API
   * renvoie une `activeSession` sur l'utilisateur courant. Cliquer permet
   * de retourner à la partie. Un utilisateur ne peut PAS créer une autre
   * partie tant qu'il en a une.
   */
  const banner = h('div', { style: { display: 'none' } });
  (async () => {
    try {
      const me = await api.me();
      const active = (me.user as unknown as { activeSession?: string }).activeSession;
      if (!active) return;
      banner.style.display = 'flex';
      banner.style.alignItems = 'center';
      banner.style.gap = '10px';
      banner.style.padding = '10px 14px';
      banner.style.margin = '4px 0 10px';
      banner.style.borderRadius = 'var(--r-lg)';
      banner.style.background = 'rgba(126,203,152,.12)';
      banner.style.border = '1px solid rgba(126,203,152,.4)';
      banner.style.color = 'var(--c-success)';
      banner.style.cursor = 'pointer';
      banner.append(
        h('span', { style: { fontSize: '18px' } }, '●'),
        h('span', { class: 'title fill', style: { fontSize: '13px', color: 'var(--c-success)' } }, 'Partie en cours…'),
        h('span', { class: 'mono', style: { fontSize: '11px' } }, 'Reprendre la partie →'),
      );
      // `active` est l'id de la table (le verrou stocke l'id de table) : on
      // reprend DIRECTEMENT en mode en ligne, sans dialogue de configuration.
      banner.addEventListener('click', () => (location.hash = `#/table?online=${active}`));
    } catch { /* offline: pas de bannière */ }
  })();

  const featureCard = (f: typeof FEATURES[number]) => h('div', {
    class: 'feature-card fill', style: { height: '150px', '--card-grad': f.grad }, onClick: () => router.go(f.route),
  },
    h('div', { class: 'feature-card__glyph' }, f.glyph),
    h('div', { class: 'feature-card__body' },
      h('div', { class: 'feature-card__kicker' }, f.kicker),
      h('div', { class: 'feature-card__title' }, f.title),
      h('div', { class: 'feature-card__desc' }, f.desc)),
  );

  // Éventail = toutes les routes connues, éventaillées, ancrées en bas.
  const fan = h('div', { class: 'nav-fan', style: { width: '520px', margin: '0 auto', position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)' } });
  const n = FAN_ROUTES.length;
  FAN_ROUTES.forEach((route, idx) => {
    const meta = router.meta(route);
    const i = idx - (n - 1) / 2;
    const base = `translateX(-50%) rotate(${i * 8}deg) translateX(${i * 30}px) translateY(${Math.abs(i) * 3}px)`;
    const card = h('div', { class: 'nav-fan__card', style: { '--card-grad': meta.grad, transform: base }, onClick: () => router.go(route) },
      h('span', { class: 'nav-fan__glyph' }, meta.glyph || '◆'),
      h('span', { class: 'nav-fan__label' }, (meta.fanLabel || meta.title || route).toUpperCase()),
    );
    card.addEventListener('mouseenter', () => { card.style.transform = base + ' translateY(-16px)'; card.style.zIndex = '5'; });
    card.addEventListener('mouseleave', () => { card.style.transform = base; card.style.zIndex = ''; });
    fan.append(card);
  });

  const menuTile = (m: typeof MENUS[number]) => h('div', {
    class: 'row gap-2', style: {
      padding: '8px 11px', borderRadius: 'var(--r-lg)', cursor: 'pointer', minWidth: '0',
      background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', transition: 'var(--t-fast)',
    },
    onClick: () => router.go(m.route),
  },
    h('span', { style: { fontSize: '15px', color: 'var(--c-gold)', flexShrink: '0' } }, m.glyph),
    h('div', { class: 'col', style: { gap: '1px', minWidth: '0' } },
      h('span', { class: 'title', style: { fontSize: '12px', whiteSpace: 'nowrap' } }, m.label),
      h('span', { class: 'mono', style: { fontSize: '8.5px', color: 'var(--c-text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, m.desc)),
  );

  const menuRow = h('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' },
  }, ...MENUS.map(menuTile));

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg,#070c17,#05070f)' } });
  root.append(
    TopBar(root),
    h('div', { style: { position: 'absolute', top: '54px', left: '60px', right: '26px' } }, banner),
    h('div', { class: 'row gap-3', style: { position: 'absolute', top: '92px', left: '60px', right: '26px' } }, ...FEATURES.map(featureCard)),
    h('div', { style: { position: 'absolute', top: '250px', left: '60px', right: '26px' } }, menuRow),
    fan,
  );
  return root;
}
