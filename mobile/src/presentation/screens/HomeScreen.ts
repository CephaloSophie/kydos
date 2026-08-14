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
  { route: 'invitations', glyph: '✉', label: 'Invitations', desc: 'Envoyer, accepter, refuser', badge: true },
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

  const menuTile = (m: typeof MENUS[number]) => {
    // Pastille de notification (invitations reçues), masquée si zéro.
    const notif = h('span', { class: 'mono', style: {
      display: 'none', marginLeft: 'auto', flexShrink: '0', minWidth: '18px', height: '18px', padding: '0 5px',
      borderRadius: '999px', background: 'var(--c-danger)', color: '#fff', fontSize: '10px', fontWeight: '700',
      alignItems: 'center', justifyContent: 'center', lineHeight: '18px', textAlign: 'center',
    } }, '');
    if ((m as { badge?: boolean }).badge) {
      api.countInvitations().then(({ count }) => { if (count > 0) { notif.textContent = String(count); notif.style.display = 'inline-flex'; } }).catch(() => {});
    }
    return h('div', {
      class: 'row gap-2', style: {
        padding: '8px 11px', borderRadius: 'var(--r-lg)', cursor: 'pointer', minWidth: '0', alignItems: 'center',
        background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', transition: 'var(--t-fast)',
      },
      onClick: () => router.go(m.route),
    },
      h('span', { style: { fontSize: '15px', color: 'var(--c-gold)', flexShrink: '0' } }, m.glyph),
      h('div', { class: 'col', style: { gap: '1px', minWidth: '0' } },
        h('span', { class: 'title', style: { fontSize: '12px', whiteSpace: 'nowrap' } }, m.label),
        h('span', { class: 'mono', style: { fontSize: '8.5px', color: 'var(--c-text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, m.desc)),
      notif);
  };

  const menuRow = h('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' },
  }, ...MENUS.map(menuTile));

  // ── Bannière COMPÉTITION en cours / récente (v14.5) ───────────────────
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
    // Détection victoire (côté humain) : sauf DUO_STEEL où c'est le propriétaire d'équipe.
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
    // Couleur : orange pour compétition (distinct du rouge des tables libres).
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
            // DUO_STEEL : pas de table à rejoindre — retour à l'écran matchmaking.
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

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg,#070c17,#05070f)' } }) as HTMLElement & { _cleanup?: () => void };
  const topbar = TopBar(ctx.session, ctx.bus) as HTMLElement & { _cleanup?: () => void };
  root.append(
    topbar,
    h('div', { class: 'row gap-3', style: { position: 'absolute', top: '64px', left: '60px', right: '26px' } }, ...FEATURES.map(featureCard)),
    h('div', { style: { position: 'absolute', top: '224px', left: '60px', right: '26px' } }, competBanner),
    h('div', { style: { position: 'absolute', top: '278px', left: '60px', right: '26px' } }, menuRow),
    fan,
  );
  // Le router (main.tsx) appellera ce cleanup avant de remplacer l'écran :
  // on propage celui du TopBar → les listeners globaux ne fuient pas.
  root._cleanup = () => { topbar._cleanup?.(); if (competPoller) clearInterval(competPoller); };
  return root;
}
