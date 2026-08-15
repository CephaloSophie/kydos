/* =============================================================================
 * PRESENTATION · screens/HomeScreen.ts (v14.10)
 * -----------------------------------------------------------------------------
 * Accueil, priorité mobile, PAS DE SCROLL VERTICAL :
 *
 *  • Racine `overflow: hidden` — la page ne défile jamais.
 *  • 3 zones indépendantes empilées, chacune peut être un carrousel
 *    horizontal (flèches ← →, drag souris, swipe tactile) :
 *       1. HAUT   — cartes-fonctionnalités (3 aujourd'hui, N demain)
 *       2. MENU   — tiles secondaires (Mes robots, Créer, Équipes…)
 *       3. FOOTER — cartes de navigation, exposées à 20% en bas de l'écran,
 *                    remontent à 30% au survol/toucher.
 *
 *  • Cartes footer : glyphe d'enseigne EN HAUT À GAUCHE, titre EN HAUT
 *    À DROITE. Pas d'éventail circulaire — cartes rectangulaires alignées.
 *
 *  • CSS custom props (--card-grad, --tile-color) posées via setProperty
 *    car Object.assign(style, {…}) ignore les CSS variables.
 * ========================================================================== */
import { h } from '../../core/dom';
import { TopBar } from '../components/TopBar';
import { Carousel } from '../components/Carousel';
import type { AppContext } from '../context';

const FEATURES = [
  { route: 'table',  kicker: 'LE JEU',       title: 'Jouer avec mes robots',       desc: 'Partie locale avec votre \u00e9curie.', glyph: '\u2665', grad: 'var(--g-heart)' },
  { route: 'online', kicker: 'MULTIJOUEUR',  title: 'Jouer avec mes co\u00e9quipiers', desc: 'Table en ligne, en \u00e9quipe.',       glyph: '\u2660', grad: 'var(--g-spade)' },
  { route: 'compet', kicker: 'COMP\u00c9TITIONS', title: 'Comp\u00e9titions',           desc: 'Matchs, tournois, classements.',          glyph: '\u2666', grad: 'var(--g-diamond)' },
];

interface MenuTile {
  route: string; glyph: string; label: string; desc: string;
  grad: string; color: string; badge?: boolean;
}
const MENUS: MenuTile[] = [
  { route: 'robots',      glyph: '\u2663', label: 'Mes robots',      desc: 'G\u00e9rer votre \u00e9curie',      grad: 'var(--g-club)',    color: '#e85d70' },
  { route: 'create',      glyph: '\u2666', label: 'Cr\u00e9er un robot', desc: 'Concevez votre IA',               grad: 'var(--g-diamond)', color: '#a685d1' },
  { route: 'team',        glyph: '\u2663', label: 'Mon \u00e9quipe',      desc: 'Membres et r\u00f4les',          grad: 'var(--g-club)',    color: '#e85d70' },
  { route: 'invitations', glyph: '\u2709', label: 'Invitations',       desc: 'Accepter, refuser',              grad: 'var(--g-gold)',    color: '#e6c46a', badge: true },
  { route: 'teams',       glyph: '\u2663', label: '\u00c9quipes',       desc: '\u00c9quipes publiques',          grad: 'var(--g-club)',    color: '#e85d70' },
  { route: 'wallet',      glyph: '\u25c6', label: 'Porte-monnaie',     desc: 'Jetons et r\u00e9compenses',      grad: 'var(--g-gold)',    color: '#e6c46a' },
  { route: 'ranking',     glyph: '\u2605', label: 'Classements',       desc: 'Saison en cours',                grad: 'var(--g-gold)',    color: '#e6c46a' },
  { route: 'history',     glyph: '\u2660', label: 'Historique',        desc: 'Rejouer vos parties',            grad: 'var(--g-spade)',   color: '#7ea8e0' },
  { route: 'about',       glyph: '\u2726', label: '\u00c0 propos',      desc: 'Cephalo Sophie',                 grad: 'var(--g-heart)',   color: '#7ecb98' },
];

interface FooterCard {
  route: string; glyph: string; label: string; color: string;
}
const FOOTER_CARDS: FooterCard[] = [
  { route: 'table',       glyph: '\u2665', label: 'LE JEU',      color: '#7ecb98' },
  { route: 'online',      glyph: '\u2660', label: 'EN LIGNE',    color: '#7ea8e0' },
  { route: 'robots',      glyph: '\u2663', label: 'ROBOTS',      color: '#e85d70' },
  { route: 'create',      glyph: '\u2666', label: '\u00c9DITEUR', color: '#a685d1' },
  { route: 'wallet',      glyph: '\u25c6', label: 'JETONS',      color: '#e6c46a' },
  { route: 'teams',       glyph: '\u2663', label: '\u00c9QUIPES', color: '#e85d70' },
  { route: 'ranking',     glyph: '\u2605', label: 'CLASSEMENTS', color: '#e6c46a' },
  { route: 'compet',      glyph: '\u2666', label: 'COMP\u00c9TITIONS', color: '#a685d1' },
  { route: 'history',     glyph: '\u2660', label: 'HISTORIQUE',  color: '#7ea8e0' },
  { route: 'about',       glyph: '\u2726', label: 'INFOS',       color: '#7ecb98' },
];

export function HomeScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

  /* ── Grande carte-fonctionnalité (haut) ────────────────────────────── */
  const featureCard = (f: typeof FEATURES[number]) => {
    const el = h('div', {
      class: 'feature-card home-feature',
      onClick: () => router.go(f.route),
    },
      h('div', { class: 'feature-card__glyph' }, f.glyph),
      h('div', { class: 'feature-card__body' },
        h('div', { class: 'feature-card__kicker' }, f.kicker),
        h('div', { class: 'feature-card__title' }, f.title),
        h('div', { class: 'feature-card__desc' }, f.desc)),
    ) as HTMLElement;
    el.style.setProperty('--card-grad', f.grad);
    return el;
  };

  /* ── Menu tile (bas milieu) ─────────────────────────────────────── */
  const menuTile = (m: MenuTile) => {
    const notif = h('span', { class: 'mono', style: {
      display: 'none', position: 'absolute', top: '6px', right: '6px',
      minWidth: '18px', height: '18px', padding: '0 5px',
      borderRadius: '999px', background: 'var(--c-danger)', color: '#fff', fontSize: '10px', fontWeight: '700',
      alignItems: 'center', justifyContent: 'center', lineHeight: '18px', textAlign: 'center',
    } }, '');
    if (m.badge) {
      api.countInvitations().then(({ count }) => { if (count > 0) { notif.textContent = String(count); notif.style.display = 'inline-flex'; } }).catch(() => {});
    }
    const tile = h('div', {
      class: 'home-menu-tile',
      onClick: () => router.go(m.route),
    },
      h('span', { class: 'home-menu-tile__glyph' }, m.glyph),
      h('div', { class: 'home-menu-tile__body' },
        h('span', { class: 'home-menu-tile__title' }, m.label),
        h('span', { class: 'home-menu-tile__desc' }, m.desc)),
      notif,
    ) as HTMLElement;
    tile.style.setProperty('--tile-color', m.color);
    tile.style.setProperty('--tile-grad', m.grad);
    return tile;
  };

  /* ── Footer card (bandeau qui monte au hover) ───────────────────── */
  const footerCard = (f: FooterCard) => {
    const el = h('div', {
      class: 'home-footer-card',
      onClick: () => router.go(f.route),
    },
      // Glyphe en haut À GAUCHE
      h('span', { class: 'home-footer-card__glyph' }, f.glyph),
      // Titre en haut À DROITE
      h('span', { class: 'home-footer-card__label' }, f.label),
    ) as HTMLElement;
    el.style.setProperty('--card-color', f.color);
    return el;
  };

  /* ── Bannière COMPÉTITION en cours / récente (compacte) ─────────── */
  const competBanner = h('div', { style: { display: 'none' } });
  let competPoller: ReturnType<typeof setInterval> | null = null;
  const renderCompetBanner = (m: any | null) => {
    if (!m) { competBanner.style.display = 'none'; competBanner.innerHTML = ''; return; }
    const status = m.status as string;
    const format = m.format as string;
    const finishedAt = m.finishedAt ? new Date(m.finishedAt).getTime() : 0;
    const showFinished = status === 'finished' && (Date.now() - finishedAt) < 120_000;
    const showLive = status === 'running' || status === 'pairing';
    if (!showFinished && !showLive) { competBanner.style.display = 'none'; competBanner.innerHTML = ''; return; }
    const isHeadless = format === 'duo_steel';
    const meId = ctx.session.profile?.id;
    const myTeam = m.participants?.find((p: any) => {
      const u = p.userId; const uid = typeof u === 'object' && u ? u._id : u;
      return uid === meId;
    })?.team;
    const won = myTeam && m.winnerTeam && myTeam === m.winnerTeam;
    const nul = m.winnerTeam == null;
    const labelFormat = format === 'duo_steel' ? 'Duo d\u2019acier' : format === 'hybrid_alliance' ? 'Alliance hybride' : 'Carr\u00e9e royale';
    competBanner.style.display = 'block';
    competBanner.innerHTML = '';
    const accent = showLive ? '#e89644' : (won ? 'var(--c-success)' : nul ? 'var(--c-text-mute)' : 'var(--c-danger)');
    const dot = showLive ? h('span', { style: {
      width: '8px', height: '8px', borderRadius: '50%', background: accent,
      boxShadow: `0 0 10px ${accent}`, animation: 'pulse 1.4s ease-in-out infinite',
    } }) : h('span', { style: { fontSize: '14px' } }, won ? '\ud83c\udfc6' : nul ? '\ud83e\udd1d' : '\ud83e\udd42');
    const statusLabel = showLive
      ? (status === 'running' ? 'EN COURS' : 'D\u00c9MARRAGE')
      : (won ? 'VICTOIRE' : nul ? 'MATCH NUL' : 'D\u00c9FAITE');
    const score = h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-soft)' } },
      `NOUS ${m.scoreTeamA ?? 0}  \u00b7  EUX ${m.scoreTeamB ?? 0}`);
    const button = showLive
      ? h('button', { class: 'btn btn--sm', style: { background: accent, color: '#1a0f00', fontWeight: '600' },
          onClick: async () => {
            if (isHeadless) { router.go(`matchmaking?format=${format}`); return; }
            try {
              const { tableId } = await api.provisionMatchLiveTable(m._id);
              router.go(`table?online=${tableId}`);
            } catch { router.go(`matchmaking?format=${format}`); }
          },
        }, isHeadless ? 'Voir' : 'Reprendre')
      : m.game
        ? h('button', { class: 'btn btn--sm btn--ghost', onClick: () => router.go(`replay?id=${m.game}`) }, '\u25b6 Rejouer')
        : h('span', {}, '');
    competBanner.append(h('div', {
      class: 'row gap-3',
      style: {
        padding: '8px 12px', borderRadius: 'var(--r-md)', alignItems: 'center',
        background: showLive ? 'rgba(232,150,68,.10)' : 'rgba(255,255,255,.03)',
        border: `1px solid ${showLive ? 'rgba(232,150,68,.35)' : 'rgba(255,255,255,.08)'}`,
      },
    },
      dot,
      h('div', { style: { flex: '1', minWidth: 0 } },
        h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
          h('span', { class: 'mono', style: { fontSize: '9px', letterSpacing: '.08em', color: accent } }, `COMP\u00c9TITION \u00b7 ${statusLabel}`),
          h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)' } }, labelFormat)),
        h('div', { class: 'row gap-3', style: { marginTop: '3px', alignItems: 'center' } }, score)),
      button,
    ));
  };
  const pollCompet = async () => {
    try { const { match } = await api.getMyMatch(); renderCompetBanner(match); }
    catch { /* transient */ }
  };
  competPoller = setInterval(() => void pollCompet(), 5000);
  void pollCompet();

  /* ── Layout : NO-SCROLL, 3 zones empilées + footer bandeau ─────── */
  const root = h('div', {
    class: 'anim-screen home-root',
    style: {
      position: 'absolute', inset: '0',
      background: 'linear-gradient(160deg,#070c17,#05070f)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',   // NO-SCROLL GLOBAL
    },
  }) as HTMLElement & { _cleanup?: () => void };

  const topbar = TopBar(ctx.session, ctx.bus) as HTMLElement & { _cleanup?: () => void };

  // Zone principale : padding gauche pour barre latérale desktop, padding
  // bas pour laisser la place au footer bandeau qui expose 20% en bas.
  const main = h('div', {
    class: 'home-main',
    style: {
      flex: '1', minHeight: '0',
      padding: '10px clamp(10px, 3vw, 26px) 0 clamp(10px, 4vw, 60px)',
      display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.4vw, 14px)',
    },
  });

  // 1) Carrousel des features (haut).
  const featuresCar = Carousel(FEATURES.map(featureCard), { itemGap: 12, className: 'home-features-car' });
  // 2) Bannière compétition (visible uniquement si match en cours/récent).
  // 3) Carrousel du menu tiles (milieu bas).
  const menusCar = Carousel(MENUS.map(menuTile), { itemGap: 8, className: 'home-menus-car' });

  main.append(featuresCar, competBanner, menusCar);

  // 4) Footer : bandeau qui expose 20% (default) → 30% (hover/touch).
  //    Contient un carrousel horizontal des routes principales.
  const footer = h('div', {
    class: 'home-footer',
    onmouseenter: () => footer.classList.add('home-footer--expanded'),
    onmouseleave: () => footer.classList.remove('home-footer--expanded'),
    ontouchstart: () => footer.classList.add('home-footer--expanded'),
  }) as HTMLElement;
  // Sur touch, on maintient l'état "expanded" pendant 3s après touchend.
  let footerTimer: ReturnType<typeof setTimeout> | null = null;
  footer.addEventListener('touchend', () => {
    if (footerTimer) clearTimeout(footerTimer);
    footerTimer = setTimeout(() => footer.classList.remove('home-footer--expanded'), 3000);
  });

  const footerCar = Carousel(FOOTER_CARDS.map(footerCard), { itemGap: 10, chromeInset: 16, className: 'home-footer-car' });
  footer.append(footerCar);

  root.append(topbar, main, footer);
  root._cleanup = () => {
    topbar._cleanup?.();
    if (competPoller) clearInterval(competPoller);
    if (footerTimer) clearTimeout(footerTimer);
    (featuresCar as any)._cleanup?.();
    (menusCar as any)._cleanup?.();
    (footerCar as any)._cleanup?.();
  };
  return root;
}
