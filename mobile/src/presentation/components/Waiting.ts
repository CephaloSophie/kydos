/* =============================================================================
 * PRESENTATION · components/Waiting.ts — Écran d'attente réutilisable.
 * -----------------------------------------------------------------------------
 * Reproduit le visuel de l'écran d'initialisation (#boot dans index.html) :
 * le wordmark Kýdos et les 4 robots qui dansent. Utilisable PARTOUT dans
 * l'application comme état de chargement par défaut :
 *   • pendant le bootstrap initial (remplacé par le #boot HTML au tout début) ;
 *   • pendant un rechargement de données ;
 *   • comme fallback d'un écran qui attend une ressource.
 *
 * Les styles (.bot, @keyframes botBounce…) sont définis dans index.html et
 * donc disponibles globalement — ce composant réutilise les MÊMES classes pour
 * une cohérence visuelle parfaite avec l'écran de lancement.
 * ========================================================================== */
import { h } from '../../core/dom';

const ACCENTS = ['#e6c46a', '#7ecb98', '#6b78ea', '#e85d70'];

/** Un robot dansant (structure identique au #boot de index.html). */
function bot(accent: string, index: number): HTMLElement {
  const b = h('div', { class: 'bot', style: { '--bot-accent': accent, animationDelay: `${index * 0.18}s` } as unknown as Partial<CSSStyleDeclaration> },
    h('div', { class: 'bot__head' },
      h('div', { class: 'bot__eyes' }, h('i', {}), h('i', {}))),
    h('div', { class: 'bot__body' }));
  return b;
}

export interface WaitingOptions {
  /** Texte affiché sous les robots (défaut « waiting »). */
  label?: string;
  /** Rend l'écran en plein overlay (position fixed, au-dessus de tout). */
  overlay?: boolean;
}

/**
 * Construit l'écran d'attente. Par défaut, il remplit son conteneur (position
 * absolute inset 0). Avec `overlay: true`, il se superpose en fixed à toute
 * l'application (z-index élevé).
 */
export function Waiting(options: WaitingOptions = {}): HTMLElement {
  const { label = 'waiting', overlay = false } = options;

  const robots = h('div', { class: 'robots' }, ...ACCENTS.map((a, i) => bot(a, i)));
  const waiting = h('div', { class: 'waiting' },
    label,
    h('span', { class: 'dots' }, h('i', {}), h('i', {}), h('i', {})));

  return h('div', {
    class: 'waiting-screen',
    style: {
      position: overlay ? 'fixed' : 'absolute',
      inset: '0',
      zIndex: overlay ? '9000' : 'auto',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '28px',
      textAlign: 'center', padding: '24px',
      background: 'radial-gradient(1200px 700px at 50% 30%, #0b1120, #05070f 70%)',
    },
  },
    h('div', { class: 'wordmark', style: { fontFamily: 'var(--f-title)', fontWeight: '800', fontSize: '30px' } },
      h('b', { style: { color: 'var(--c-gold)' } }, 'Kýdos'), ' Belote'),
    robots,
    waiting);
}

/**
 * Affiche l'écran d'attente en overlay plein écran, retourne une fonction pour
 * le retirer. Pratique pour envelopper une opération asynchrone :
 *   const hide = showWaitingOverlay('Chargement…');
 *   try { await work(); } finally { hide(); }
 */
export function showWaitingOverlay(label?: string): () => void {
  const el = Waiting({ label, overlay: true });
  el.style.transition = 'opacity .35s ease';
  document.body.append(el);
  return () => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 360);
  };
}
