/* =============================================================================
 * PRESENTATION · screens/HomeScreen.ts
 * Accueil = coquille persistante : un panneau de contenu (la « page derrière »)
 * surmonté d'un éventail de cartes TOUJOURS visible qui sert de menu. Cliquer
 * une carte met à jour le panneau en place et la relève au premier plan (seule
 * la destination sélectionnée est active, même couleur panneau ↔ carte) ; le
 * bouton d'action du panneau lance réellement la destination.
 *
 * L'éventail couvre les 12 destinations atteignables depuis l'accueil (parité
 * avec l'ancienne grille de cartes + tuiles) ; l'arc est RECENTRÉ sur l'index
 * sélectionné à chaque navigation (pas de centre fixe) pour rester compact en
 * mode paysage mobile malgré le nombre de cartes.
 * ========================================================================== */
import { h } from '../../core/dom';
import { TopBar } from '../components/TopBar';
import type { AppContext } from '../context';

/** Routes atteignables depuis l'accueil, dans l'ordre de l'éventail. */
const FAN_ROUTES = ['table', 'online', 'robots', 'create', 'team', 'teams', 'invitations', 'wallet', 'ranking', 'compet', 'history', 'about'];

/** Géométrie de l'arc (recentré sur la sélection à chaque `select()`). */
const R = 220;        // rayon de l'arc (pilote l'écartement horizontal)
const STEP = 10;      // degrés par cran d'index autour de la sélection
const VISIBLE = 3;    // cartes pleinement visibles de chaque côté de la sélection
const CLAMP = 6;      // au-delà, la position est figée (déjà invisible/hors-tout)
const MAX_SAG = 20;   // plafond de descente verticale (évite que les cartes lointaines sortent de l'écran)

export function HomeScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;
  const n = FAN_ROUTES.length;
  let selected = 0;

  /* --- Panneau de contenu : affiche la destination sélectionnée dans l'éventail --- */
  const title = h('div', { class: 'feature-card__title', style: { fontSize: '24px', margin: '0 0 8px' } });
  const desc  = h('div', { class: 'feature-card__desc', style: { fontSize: '12px', lineHeight: '1.5' } });
  const cta   = h('button', {
    class: 'btn btn--primary', style: { marginTop: '14px', alignSelf: 'flex-start', height: '38px', padding: '0 26px', fontSize: '13px', fontWeight: '700' },
    onClick: (e: Event) => { e.stopPropagation(); router.go(FAN_ROUTES[selected]); },
  });
  const textCol = h('div', {
    style: { position: 'relative', zIndex: '1', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '0' },
  }, title, desc, cta);

  // Espace réservé à droite du panneau pour une image à venir.
  const imgSlot = h('div', {
    style: {
      flex: '0 0 170px', borderRadius: 'var(--r-md)', border: '1.5px dashed rgba(255,255,255,.35)',
      background: 'rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '0',
    },
  },
    h('div', { style: { fontSize: '30px', color: 'rgba(255,255,255,.4)' } }, '▦'),
    h('div', { style: { fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '.1em', color: 'rgba(255,255,255,.55)', textAlign: 'center', lineHeight: '1.4' } }, 'IMAGE', h('br'), 'À VENIR'),
  );

  const pageInner = h('div', {
    style: { display: 'flex', gap: '16px', alignItems: 'stretch', height: '100%', willChange: 'transform, opacity' },
  }, textCol, imgSlot);

  const panel = h('div', {
    class: 'feature-card feature-card--static', style: {
      position: 'absolute', top: '78px', left: '128px', right: '78px', height: '150px',
      '--card-grad': 'var(--g-heart)', padding: '22px 26px', borderRadius: 'var(--r-lg)',
      cursor: 'pointer', overflow: 'hidden',
    },
    onClick: () => router.go(FAN_ROUTES[selected]),
  }, pageInner);

  // Aperçus latéraux : lisérés des destinations voisines, cliquables pour paginer.
  const peekL = h('div', {
    class: 'feature-card feature-card--static', style: {
      position: 'absolute', top: '86px', left: '60px', width: '58px', height: '134px',
      borderRadius: 'var(--r-lg)', overflow: 'hidden', cursor: 'pointer', opacity: '.55', transform: 'scale(.94)',
    }, onClick: () => page(-1),
  }, h('div', { style: { position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.85)', fontSize: '16px' } }, '‹'));
  const peekR = h('div', {
    class: 'feature-card feature-card--static', style: {
      position: 'absolute', top: '86px', right: '10px', width: '58px', height: '134px',
      borderRadius: 'var(--r-lg)', overflow: 'hidden', cursor: 'pointer', opacity: '.55', transform: 'scale(.94)',
    }, onClick: () => page(1),
  }, h('div', { style: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.85)', fontSize: '16px' } }, '›'));

  /* --- Éventail permanent : les 12 destinations, ancré bas et entièrement visible --- */
  const fan = h('div', { class: 'nav-fan', style: { width: '100%', position: 'absolute', bottom: '24px', left: '0' } });
  const cards: HTMLElement[] = [];

  FAN_ROUTES.forEach((route, idx) => {
    const meta = router.meta(route);
    const card = h('div', {
      class: 'nav-fan__card', style: { '--card-grad': meta.grad || 'var(--g-slate)' },
      onClick: () => select(idx),
    },
      h('span', { class: 'nav-fan__glyph' }, meta.glyph || '◆'),
      h('span', { class: 'nav-fan__label' }, (meta.fanLabel || meta.title || route).toUpperCase()),
    );
    if (route === 'invitations') {
      // Pastille « invitations en attente » — un seul appel réseau au montage, aucun polling.
      const badge = h('span', { class: 'nav-fan__badge' }, '');
      card.append(badge);
      api.countInvitations().then(({ count }) => {
        if (count > 0) { badge.textContent = String(count); badge.style.display = 'flex'; }
      }).catch(() => {});
    }
    cards.push(card);
    fan.append(card);
  });

  /** Position + visibilité de chaque carte, relative à l'index sélectionné (arc recentré). */
  function layoutFan() {
    cards.forEach((card, idx) => {
      const i = idx - selected;
      const active = idx === selected;
      const ci = Math.max(-CLAMP, Math.min(CLAMP, i));
      const ang = ci * STEP;
      const rad = ang * Math.PI / 180;
      const x = R * Math.sin(rad);
      const y = Math.min(R * (1 - Math.cos(rad)), MAX_SAG);
      const absI = Math.abs(i);
      const scale = (1 - Math.min(absI, CLAMP) * 0.05) * (active ? 1.04 : 1);
      card.style.transform = `translateX(-50%) translateX(${x}px) translateY(${y}px) rotate(${ang}deg) scale(${scale})`;
      card.style.opacity = String(absI <= VISIBLE ? 1 - absI * 0.12 : Math.max(0, 0.55 - (absI - VISIBLE) * 0.28));
      card.style.pointerEvents = absI > 5 ? 'none' : 'auto';
      card.style.zIndex = String(50 - Math.min(absI, 49));
      card.classList.toggle('nav-fan__card--active', active);
    });
  }

  /** Applique la sélection : met à jour le panneau (même couleur que la carte active) + l'éventail. */
  function select(idx: number, dir = 0) {
    idx = Math.max(0, Math.min(n - 1, idx));
    selected = idx;
    const route = FAN_ROUTES[idx];
    const meta = router.meta(route);
    panel.style.setProperty('--card-grad', meta.grad || 'var(--g-slate)');
    title.textContent = meta.title || route;
    desc.textContent = meta.desc || '';
    cta.textContent = meta.cta || 'Ouvrir';

    // Petite transition de « page » horizontale sur le contenu du panneau.
    if (dir) {
      pageInner.style.transition = 'none';
      pageInner.style.transform = `translateX(${dir * 30}px)`;
      pageInner.style.opacity = '0';
      requestAnimationFrame(() => {
        pageInner.style.transition = 'transform .28s var(--e-out), opacity .28s var(--e-out)';
        pageInner.style.transform = 'translateX(0)';
        pageInner.style.opacity = '1';
      });
    }

    // Aperçus latéraux : reprennent le dégradé de la destination voisine, masqués aux extrémités.
    const prev = FAN_ROUTES[idx - 1], next = FAN_ROUTES[idx + 1];
    peekL.style.visibility = prev ? 'visible' : 'hidden';
    peekR.style.visibility = next ? 'visible' : 'hidden';
    if (prev) peekL.style.setProperty('--card-grad', router.meta(prev).grad || 'var(--g-slate)');
    if (next) peekR.style.setProperty('--card-grad', router.meta(next).grad || 'var(--g-slate)');

    layoutFan();
  }

  /** Avance/recule d'une destination (pager). */
  function page(delta: number) {
    const next = selected + delta;
    if (next < 0 || next > n - 1) return;
    select(next, delta);
  }

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg,#070c17,#05070f)' } }) as HTMLElement & { _cleanup?: () => void };
  const topbar = TopBar(ctx.session, ctx.bus) as HTMLElement & { _cleanup?: () => void };
  root.append(topbar, panel, peekL, peekR, fan);

  // --- Pager : molette horizontale/verticale + swipe tactile ---
  let wheelLock = false;
  root.addEventListener('wheel', (e) => {
    const we = e as WheelEvent;
    const d = Math.abs(we.deltaX) > Math.abs(we.deltaY) ? we.deltaX : we.deltaY;
    if (Math.abs(d) < 8) return;
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    page(d > 0 ? 1 : -1);
    setTimeout(() => { wheelLock = false; }, 380);
  }, { passive: false });

  let tx = 0;
  root.addEventListener('touchstart', (e) => { tx = (e as TouchEvent).touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    const dx = (e as TouchEvent).changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) page(dx < 0 ? 1 : -1);
  }, { passive: true });

  select(0);          // état initial : première destination sélectionnée
  // Le router (main.tsx) appellera ce cleanup avant de remplacer l'écran :
  // on propage celui du TopBar → les listeners globaux ne fuient pas.
  root._cleanup = () => { topbar._cleanup?.(); };
  return root;
}
