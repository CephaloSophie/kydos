/* =============================================================================
 * PRESENTATION · screens/HomeScreen.ts (v14.9)
 * -----------------------------------------------------------------------------
 * Refonte accueil, PRIORITÉ MOBILE :
 *
 *  1. Les 3 CARTES DU HAUT restent toujours sur UNE seule ligne (grid fixe
 *     3 colonnes), même sur mobile. Chaque carte a SA propre couleur —
 *     cœur/vert, pique/bleu, carreau/violet — appliquée via
 *     `setProperty('--card-grad', …)` car `Object.assign(style, {…})` ignore
 *     silencieusement les CSS custom properties (bug v14.8).
 *
 *  2. Les BOUTONS DU BAS (Mes robots, Créer un robot, Mon équipe,
 *     Invitations, Équipes, Porte-monnaie, Classements, Historique, À propos)
 *     sont redessinés comme de petites CARTES À JOUER : glyphe d'enseigne
 *     coloré en haut à gauche, titre + description en bas, texte tronqué
 *     proprement (ellipsis). Chaque carte a sa propre enseigne.
 *
 *  3. Le FOOTER (éventail nav-fan) : chaque carte prend la couleur de sa
 *     route, corrigée du même bug custom-prop.
 * ========================================================================== */
import { h } from '../../core/dom';
import { TopBar } from '../components/TopBar';
import type { AppContext } from '../context';

const FEATURES = [
  { route: 'table',  kicker: 'LE JEU',       title: 'Jouer avec mes robots',       desc: 'Partie locale avec votre \u00e9curie.', glyph: '\u2665', grad: 'var(--g-heart)' },
  { route: 'online', kicker: 'MULTIJOUEUR',  title: 'Jouer avec mes co\u00e9quipiers', desc: 'Table en ligne, en \u00e9quipe.',       glyph: '\u2660', grad: 'var(--g-spade)' },
  { route: 'compet', kicker: 'COMP\u00c9TITIONS', title: 'Comp\u00e9titions',           desc: 'Matchs, tournois, classements.',          glyph: '\u2666', grad: 'var(--g-diamond)' },
];

interface MenuTile {
  route: string;
  glyph: string;
  label: string;
  desc: string;
  grad: string;
  color: string;
  badge?: boolean;
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

const FAN_ROUTES = ['table', 'online', 'robots', 'create', 'wallet', 'teams', 'ranking', 'compet', 'history', 'about'];

export function HomeScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

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
    // FIX v14.9 : Object.assign(style, {…}) ignore les CSS custom props ;
    // setProperty les applique correctement.
    el.style.setProperty('--card-grad', f.grad);
    return el;
  };

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

  const fan = h('div', {
    class: 'nav-fan home-fan',
    style: {
      width: 'min(520px, 96vw)', margin: '0 auto', position: 'absolute',
      bottom: '8px', left: '50%', transform: 'translateX(-50%)',
    },
  });
  const n = FAN_ROUTES.length;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const spacing = vw < 420 ? 16 : vw < 620 ? 22 : 30;
  const angle = vw < 420 ? 6 : vw < 620 ? 7 : 8;
  FAN_ROUTES.forEach((route, idx) => {
    const meta = router.meta(route);
    const i = idx - (n - 1) / 2;
    const base = `translateX(-50%) rotate(${i * angle}deg) translateX(${i * spacing}px) translateY(${Math.abs(i) * 3}px)`;
    const card = h('div', { class: 'nav-fan__card', style: { transform: base }, onClick: () => router.go(route) },
      h('span', { class: 'nav-fan__glyph' }, meta.glyph || '\u25c6'),
      h('span', { class: 'nav-fan__label' }, (meta.fanLabel || meta.title || route).toUpperCase()),
    ) as HTMLElement;
    // Fix v14.9 : setProperty pour la custom prop --card-grad.
    if (meta.grad) card.style.setProperty('--card-grad', meta.grad);
    card.addEventListener('mouseenter', () => { card.style.transform = base + ' translateY(-16px)'; card.style.zIndex = '5'; });
    card.addEventListener('mouseleave', () => { card.style.transform = base; card.style.zIndex = ''; });
    fan.append(card);
  });

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
        padding: '10px 14px', borderRadius: 'var(--r-md)', alignItems: 'center',
        background: showLive ? 'rgba(232,150,68,.10)' : 'rgba(255,255,255,.03)',
        border: `1px solid ${showLive ? 'rgba(232,150,68,.35)' : 'rgba(255,255,255,.08)'}`,
      },
    },
      dot,
      h('div', { style: { flex: '1', minWidth: 0 } },
        h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
          h('span', { class: 'mono', style: { fontSize: '9px', letterSpacing: '.08em', color: accent } }, `COMP\u00c9TITION \u00b7 ${statusLabel}`),
          h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)' } }, labelFormat)),
        h('div', { class: 'row gap-3', style: { marginTop: '4px', alignItems: 'center' } }, score)),
      button,
    ));
  };
  const pollCompet = async () => {
    try {
      const { match } = await api.getMyMatch();
      renderCompetBanner(match);
    } catch { /* transient */ }
  };
  competPoller = setInterval(() => void pollCompet(), 5000);
  void pollCompet();

  const root = h('div', {
    class: 'anim-screen home-root',
    style: {
      position: 'absolute', inset: '0',
      background: 'linear-gradient(160deg,#070c17,#05070f)',
      display: 'flex', flexDirection: 'column',
      overflow: 'auto',
    },
  }) as HTMLElement & { _cleanup?: () => void };
  const topbar = TopBar(ctx.session, ctx.bus) as HTMLElement & { _cleanup?: () => void };

  const main = h('div', {
    class: 'home-main',
    style: {
      padding: '12px clamp(10px, 3vw, 26px) 220px clamp(10px, 4vw, 60px)',
      display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 20px)',
      minHeight: '0',
    },
  },
    h('div', {
      class: 'home-feature-row',
      style: {
        display: 'grid',
        // FIXE 3 colonnes : jamais de wrap sur mobile.
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 'clamp(6px, 1.4vw, 14px)',
      },
    }, ...FEATURES.map(featureCard)),
    competBanner,
    h('div', {
      class: 'home-menu-grid',
      style: {
        display: 'grid',
        gap: 'clamp(6px, 1.2vw, 10px)',
      },
    }, ...MENUS.map(menuTile)),
  );

  root.append(topbar, main, fan);
  root._cleanup = () => { topbar._cleanup?.(); if (competPoller) clearInterval(competPoller); };
  return root;
}
