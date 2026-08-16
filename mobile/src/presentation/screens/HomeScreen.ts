/* =============================================================================
 * PRESENTATION · screens/HomeScreen.ts (v14.11)
 * -----------------------------------------------------------------------------
 * Accueil, priorité mobile, no-scroll global :
 *
 *  1. Bannière COMPÉTITION en cours affichée EN HAUT (au-dessus des cartes).
 *     Dot coloré selon le type de table (hybride/acier/royal). Bouton
 *     « ▶ Rejoindre » (au lieu de « Reprendre »).
 *  2. 4 cartes-fonctionnalités au lieu de 3 (ajout « À propos de kydos »),
 *     hauteur augmentée pour plus de respiration.
 *  3. Menu bas : tiles plus hautes (72 px au lieu de 56 px).
 *  4. FOOTER MASQUÉ (nav-fan bandeau retiré).
 * ========================================================================== */
import { h } from '../../core/dom';
import { TopBar } from '../components/TopBar';
import { Carousel } from '../components/Carousel';
import type { AppContext } from '../context';

const FEATURES = [
  { route: 'table',  kicker: 'LE JEU',       title: 'Jouer avec mes robots',       desc: 'Partie locale avec votre \u00e9curie.', glyph: '\u2665', grad: 'var(--g-heart)' },
  { route: 'online', kicker: 'MULTIJOUEUR',  title: 'Jouer avec mes co\u00e9quipiers', desc: 'Table en ligne, en \u00e9quipe.',       glyph: '\u2660', grad: 'var(--g-spade)' },
  { route: 'compet', kicker: 'COMP\u00c9TITIONS', title: 'Comp\u00e9titions',           desc: 'Matchs, tournois, classements.',          glyph: '\u2666', grad: 'var(--g-diamond)' },
  { route: 'about',  kicker: 'ABOUT',        title: '\u00c0 propos de kydos',       desc: 'L\u2019esprit du projet, Cephalo Sophie.', glyph: '\u2663', grad: 'var(--g-club)' },
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
];

/** Couleur du dot LIVE selon le type de table du match compétition. */
const KIND_COLOR: Record<string, string> = {
  hybride: '#c99c3f',  // Alliance hybride → or
  acier: '#3f6ea1',    // Duo d'acier → bleu
  royal: '#b0384a',    // Carrée royale → rouge
};
function formatToKind(format: string): string {
  if (format === 'hybrid_alliance') return 'hybride';
  if (format === 'duo_steel') return 'acier';
  if (format === 'royal_square') return 'royal';
  return 'hybride';
}

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

  /* ── Bannière COMPÉTITION (EN HAUT, dot couleur du type) ─────────── */
  const competBanner = h('div', { class: 'home-compet-banner', style: { display: 'none' } });
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
    const kind = formatToKind(format);
    const kindColor = KIND_COLOR[kind] || '#e89644';
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

    // Dot LIVE couleur du TYPE, ou emoji résultat si terminé.
    const dot = showLive ? h('span', { style: {
      width: '10px', height: '10px', borderRadius: '50%', background: kindColor,
      boxShadow: `0 0 12px ${kindColor}, 0 0 4px ${kindColor}`,
      animation: 'pulse 1.4s ease-in-out infinite',
      flexShrink: '0',
    } }) : h('span', { style: { fontSize: '16px' } }, won ? '\ud83c\udfc6' : nul ? '\ud83e\udd1d' : '\ud83e\udd42');

    const statusLabel = showLive
      ? (status === 'running' ? 'EN COURS' : 'D\u00c9MARRAGE')
      : (won ? 'VICTOIRE' : nul ? 'MATCH NUL' : 'D\u00c9FAITE');
    const statusColor = showLive
      ? kindColor
      : (won ? 'var(--c-success)' : nul ? 'var(--c-text-mute)' : 'var(--c-danger)');
    const score = h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-soft)' } },
      `NOUS ${m.scoreTeamA ?? 0}  \u00b7  EUX ${m.scoreTeamB ?? 0}`);
    // Bouton REJOINDRE (au lieu de Reprendre).
    const button = showLive
      ? h('button', { class: 'btn btn--sm', style: {
          background: kindColor, color: '#1a0f00', fontWeight: '600', flexShrink: '0',
          boxShadow: `0 3px 12px ${kindColor}66`,
        },
          onClick: async () => {
            if (isHeadless) { router.go(`matchmaking?format=${format}`); return; }
            try {
              const { tableId } = await api.provisionMatchLiveTable(m._id);
              router.go(`table?online=${tableId}`);
            } catch { router.go(`matchmaking?format=${format}`); }
          },
        }, isHeadless ? 'Voir' : '\u25b6 Rejoindre')
      : m.game
        ? h('button', { class: 'btn btn--sm btn--ghost', style: { flexShrink: '0' }, onClick: () => router.go(`replay?id=${m.game}`) }, '\u25b6 Rejouer')
        : h('span', {}, '');

    competBanner.append(h('div', {
      class: 'row gap-3',
      style: {
        padding: '10px 14px', borderRadius: 'var(--r-md)', alignItems: 'center',
        background: showLive
          ? `linear-gradient(90deg, ${kindColor}22 0%, ${kindColor}0a 100%)`
          : 'rgba(255,255,255,.03)',
        border: `1px solid ${showLive ? `${kindColor}55` : 'rgba(255,255,255,.08)'}`,
      },
    },
      dot,
      h('div', { style: { flex: '1', minWidth: '0' } },
        h('div', { class: 'row gap-2', style: { alignItems: 'center', flexWrap: 'wrap' } },
          h('span', { class: 'mono', style: { fontSize: '9px', letterSpacing: '.08em', color: statusColor, fontWeight: '700' } }, `COMP\u00c9TITION \u00b7 ${statusLabel}`),
          h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)' } }, labelFormat)),
        h('div', { class: 'row gap-3', style: { marginTop: '4px', alignItems: 'center' } }, score)),
      button,
    ));
  };
  const pollCompet = async () => {
    try { const { match } = await api.getMyMatch(); renderCompetBanner(match); }
    catch { /* transient */ }
  };
  competPoller = setInterval(() => void pollCompet(), 5000);
  void pollCompet();

  /* ── Layout : NO-SCROLL, sans footer bandeau ───────────────────── */
  const root = h('div', {
    class: 'anim-screen home-root',
    style: {
      position: 'absolute', inset: '0',
      background: 'linear-gradient(160deg,#070c17,#05070f)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    },
  }) as HTMLElement & { _cleanup?: () => void };

  const topbar = TopBar(ctx.session, ctx.bus) as HTMLElement & { _cleanup?: () => void };

  const main = h('div', {
    class: 'home-main',
    style: {
      flex: '1', minHeight: '0',
      padding: '10px clamp(10px, 3vw, 26px) 14px clamp(10px, 4vw, 60px)',
      display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.6vw, 16px)',
      overflow: 'hidden',
    },
  });

  // 1) Bannière EN HAUT (visible seulement si match en cours/récent).
  // 2) Carrousel des features (4 cartes maintenant).
  const featuresCar = Carousel(FEATURES.map(featureCard), { itemGap: 12, className: 'home-features-car' });
  // 3) Carrousel du menu tiles.
  const menusCar = Carousel(MENUS.map(menuTile), { itemGap: 8, className: 'home-menus-car' });

  main.append(competBanner, featuresCar, menusCar);
  root.append(topbar, main);
  root._cleanup = () => {
    topbar._cleanup?.();
    if (competPoller) clearInterval(competPoller);
    (featuresCar as any)._cleanup?.();
    (menusCar as any)._cleanup?.();
  };
  return root;
}
