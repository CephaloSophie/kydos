/* =============================================================================
 * PRESENTATION · screens/HomeScreen.ts (v14.8)
 * -----------------------------------------------------------------------------
 * Accueil refondu :
 *   • 3 cartes-fonctionnalités en haut, chacune avec sa propre enseigne
 *     (♥ Jouer avec mes robots, ♠ Jouer avec mes coéquipiers, ♦ Compétitions).
 *   • Les entrées « Mes robots » et « Créer un robot » descendent dans le
 *     menu du bas (avec leurs symboles ♣/♦).
 *   • Grid CSS responsive : les cartes s'empilent sur mobile étroit, les
 *     menus passent de 4 → 3 → 2 colonnes selon la largeur.
 *   • Éventail du bas remonté (bottom: 8px au lieu de -40px).
 * ========================================================================== */
import { h } from '../../core/dom';
import { TopBar } from '../components/TopBar';
import type { AppContext } from '../context';

/* ---------------------------------------------------------------------------
 * FEATURES — 3 grandes cartes en haut. Chaque carte = 1 enseigne + 1 couleur
 * distincte du design system. Toutes cliquables, gradient DS.
 * ------------------------------------------------------------------------ */
const FEATURES = [
  { route: 'table',  kicker: 'LE JEU',       title: 'Jouer avec mes robots',       desc: 'Lancer une partie locale avec votre \u00e9curie.', glyph: '\u2665', grad: 'var(--g-heart)' },
  { route: 'online', kicker: 'MULTIJOUEUR',  title: 'Jouer avec mes co\u00e9quipiers', desc: 'Rejoindre ou cr\u00e9er une table en ligne.',       glyph: '\u2660', grad: 'var(--g-spade)' },
  { route: 'compet', kicker: 'COMP\u00c9TITIONS', title: 'Comp\u00e9titions',           desc: 'Matchs rapides, tournois, cassements.',            glyph: '\u2666', grad: 'var(--g-diamond)' },
];

/* ---------------------------------------------------------------------------
 * MENUS — sections secondaires. « Mes robots » et « Créer un robot » figurent
 * ici (descendus depuis le haut). Chaque tile a son propre glyphe + couleur
 * (via un dégradé DS appliqué au glyphe) pour aider à distinguer d'un coup
 * d'œil.
 * ------------------------------------------------------------------------ */
interface MenuTile {
  route: string;
  glyph: string;
  label: string;
  desc: string;
  grad: string;   // gradient CSS (var ou linear-gradient)
  badge?: boolean;
}
const MENUS: MenuTile[] = [
  { route: 'robots',      glyph: '\u2663', label: 'Mes robots',      desc: 'G\u00e9rer & entra\u00eener votre \u00e9curie', grad: 'var(--g-club)' },
  { route: 'create',      glyph: '\u2666', label: 'Cr\u00e9er un robot', desc: 'Concevez votre IA de belote',            grad: 'var(--g-diamond)' },
  { route: 'team',        glyph: '\u2663', label: 'Mon \u00e9quipe',      desc: 'Membres, r\u00f4les, exclusions',       grad: 'var(--g-club)' },
  { route: 'invitations', glyph: '\u2709', label: 'Invitations',       desc: 'Envoyer, accepter, refuser',           grad: 'var(--g-gold)', badge: true },
  { route: 'teams',       glyph: '\u2663', label: '\u00c9quipes',       desc: 'Rejoindre une \u00e9quipe publique',    grad: 'var(--g-club)' },
  { route: 'wallet',      glyph: '\u25c6', label: 'Porte-monnaie',     desc: 'Jetons et r\u00e9compenses',            grad: 'var(--g-gold)' },
  { route: 'ranking',     glyph: '\u2605', label: 'Classements',       desc: 'Saison en cours',                       grad: 'var(--g-gold)' },
  { route: 'history',     glyph: '\u2660', label: 'Historique',        desc: 'Rejouer vos parties',                   grad: 'var(--g-spade)' },
  { route: 'about',       glyph: '\u2726', label: '\u00c0 propos',      desc: 'Cephalo Sophie',                        grad: 'var(--g-heart)' },
];

/** Routes présentes dans l'éventail de navigation permanent (bas de l'écran). */
const FAN_ROUTES = ['table', 'online', 'robots', 'create', 'wallet', 'teams', 'ranking', 'compet', 'history', 'about'];

export function HomeScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

  /* ── Grande carte-fonctionnalité (haut) ────────────────────────────────── */
  const featureCard = (f: typeof FEATURES[number]) => h('div', {
    class: 'feature-card',
    style: { '--card-grad': f.grad, minHeight: '148px' },
    onClick: () => router.go(f.route),
  },
    h('div', { class: 'feature-card__glyph' }, f.glyph),
    h('div', { class: 'feature-card__body' },
      h('div', { class: 'feature-card__kicker' }, f.kicker),
      h('div', { class: 'feature-card__title' }, f.title),
      h('div', { class: 'feature-card__desc' }, f.desc)),
  );

  /* ── Menu tile (bas) — glyphe coloré via gradient sur le texte ─────────── */
  const menuTile = (m: MenuTile) => {
    // Pastille de notification (invitations reçues), masquée si zéro.
    const notif = h('span', { class: 'mono', style: {
      display: 'none', marginLeft: 'auto', flexShrink: '0', minWidth: '18px', height: '18px', padding: '0 5px',
      borderRadius: '999px', background: 'var(--c-danger)', color: '#fff', fontSize: '10px', fontWeight: '700',
      alignItems: 'center', justifyContent: 'center', lineHeight: '18px', textAlign: 'center',
    } }, '');
    if (m.badge) {
      api.countInvitations().then(({ count }) => { if (count > 0) { notif.textContent = String(count); notif.style.display = 'inline-flex'; } }).catch(() => {});
    }
    // Glyphe coloré : le dégradé DS est appliqué au texte du glyphe via
    // background-clip. Chaque menu apparaît donc avec sa couleur d'enseigne.
    const glyphStyle: Partial<CSSStyleDeclaration> = {
      fontSize: '18px', flexShrink: '0', fontWeight: '900',
      background: m.grad,
      // Compat WebKit + standard : le fallback color (or) s'applique si le
      // navigateur ne supporte pas background-clip: text (rare aujourd'hui).
      backgroundClip: 'text', color: 'transparent',
    };
    (glyphStyle as any).webkitBackgroundClip = 'text';
    return h('div', {
      class: 'row gap-2 home-menu-tile',
      style: {
        padding: '10px 12px', borderRadius: 'var(--r-lg)', cursor: 'pointer', minWidth: '0', alignItems: 'center',
        background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', transition: 'var(--t-fast)',
      },
      onClick: () => router.go(m.route),
    },
      h('span', { style: glyphStyle }, m.glyph),
      h('div', { class: 'col', style: { gap: '1px', minWidth: '0', flex: '1' } },
        h('span', { class: 'title', style: { fontSize: '12px', whiteSpace: 'nowrap' } }, m.label),
        h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, m.desc)),
      notif);
  };

  /* ── Éventail permanent en bas ─────────────────────────────────────────── */
  const fan = h('div', {
    class: 'nav-fan home-fan',
    style: {
      width: 'min(520px, 92vw)', margin: '0 auto', position: 'absolute',
      // v14.8 : relevé (au lieu de -40px) pour être bien visible.
      bottom: '8px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto',
    },
  });
  const n = FAN_ROUTES.length;
  // Espacement adaptatif : sur mobile étroit, on réduit le décalage entre
  // cartes pour ne pas dépasser la largeur.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const spacing = vw < 420 ? 18 : vw < 620 ? 22 : 30;
  const angle = vw < 420 ? 6 : vw < 620 ? 7 : 8;
  FAN_ROUTES.forEach((route, idx) => {
    const meta = router.meta(route);
    const i = idx - (n - 1) / 2;
    const base = `translateX(-50%) rotate(${i * angle}deg) translateX(${i * spacing}px) translateY(${Math.abs(i) * 3}px)`;
    const card = h('div', { class: 'nav-fan__card', style: { '--card-grad': meta.grad, transform: base }, onClick: () => router.go(route) },
      h('span', { class: 'nav-fan__glyph' }, meta.glyph || '\u25c6'),
      h('span', { class: 'nav-fan__label' }, (meta.fanLabel || meta.title || route).toUpperCase()),
    );
    card.addEventListener('mouseenter', () => { card.style.transform = base + ' translateY(-16px)'; card.style.zIndex = '5'; });
    card.addEventListener('mouseleave', () => { card.style.transform = base; card.style.zIndex = ''; });
    fan.append(card);
  });

  /* ── Bannière COMPÉTITION en cours / récente ───────────────────────────── */
  // Poll léger toutes les 5s sur /matches/mine. Affiche :
  //   • LIVE orange + score + bouton Reprendre si status running.
  //   • FINISHED + emoji victoire/défaite pendant ~2 min après la fin.
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

  /* ── Layout responsive complet ─────────────────────────────────────────── */
  // Racine en flex column pour que TOUT s'adapte à la hauteur/largeur.
  // Padding-left 60px pour laisser la place à la barre verticale desktop
  // (dispositif fixe en dehors de HomeScreen). Sur mobile étroit, la marge
  // gauche reste — la barre latérale n'est pas visible sur mobile mais le
  // padding reste homogène.
  const root = h('div', {
    class: 'anim-screen home-root',
    style: {
      position: 'absolute', inset: '0',
      background: 'linear-gradient(160deg,#070c17,#05070f)',
      display: 'flex', flexDirection: 'column',
      // Grille intérieure : la topbar est ancrée en haut, tout le reste
      // défile si besoin (paysage étroit → petits écrans).
      overflow: 'auto',
    },
  }) as HTMLElement & { _cleanup?: () => void };
  const topbar = TopBar(ctx.session, ctx.bus) as HTMLElement & { _cleanup?: () => void };

  // Container principal — padding responsive (moins de marge sur mobile).
  const main = h('div', {
    class: 'home-main',
    style: {
      // Padding : left 60 pour barre latérale desktop, réduit à 14 sous 720px
      // via CSS. Bottom 220 pour laisser respirer au-dessus de l'éventail.
      padding: '14px clamp(14px, 3vw, 26px) 220px clamp(14px, 4vw, 60px)',
      display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vw, 20px)',
      minHeight: '0',
    },
  },
    // Grille 3 cartes — auto-fit sur mobile pour empiler naturellement.
    h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
        gap: 'clamp(10px, 1.6vw, 16px)',
      },
    }, ...FEATURES.map(featureCard)),
    competBanner,
    // Grille menus — auto-fill à minmax(180px,1fr) → 4/3/2 col selon largeur.
    h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px, 100%), 1fr))',
        gap: '8px',
      },
    }, ...MENUS.map(menuTile)),
  );

  root.append(topbar, main, fan);
  root._cleanup = () => { topbar._cleanup?.(); if (competPoller) clearInterval(competPoller); };
  return root;
}
