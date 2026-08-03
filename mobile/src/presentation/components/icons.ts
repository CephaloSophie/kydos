/* =============================================================================
 * PRESENTATION · icons.ts — Icônes SVG épurées (menu de table, actions).
 * -----------------------------------------------------------------------------
 * Icônes en trait (stroke: currentColor) : nettes, cohérentes, colorables via
 * la couleur du texte du bouton. Rendues via un élément SVG (pas d'emoji).
 * ========================================================================== */
import { h } from '../../core/dom';

const NS = 'http://www.w3.org/2000/svg';

/** Construit un <svg> à partir d'un contenu de paths (viewBox 24×24). */
function svg(paths: string, size = 22): SVGElement {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.9');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.innerHTML = paths;
  return el;
}

/** Table d'icônes (nom → contenu SVG). */
export const ICONS: Record<string, string> = {
  // Sortie : flèche qui sort d'une porte (plus élégant que l'emoji porte).
  exit: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 12H3"/><path d="M6 9l-3 3 3 3"/>',
  // Spectateurs : œil.
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  // Son : haut-parleur + ondes.
  sound: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  // Réactions : bulle sourire.
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0"/><circle cx="9" cy="10" r="0.6" fill="currentColor"/><circle cx="15" cy="10" r="0.6" fill="currentColor"/>',
  // Pause.
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
  // Lecture.
  play: '<path d="M7 5l12 7-12 7V5Z"/>',
  // Vitesse : double chevron.
  fast: '<path d="M4 6l7 6-7 6"/><path d="M13 6l7 6-7 6"/>',
  // Couronne (VIP).
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z"/>',
  // Profil : buste.
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
  // Déconnexion : flèche qui sort.
  logout: '<path d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  // Paramètres : engrenage simplifié.
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  // Porte-monnaie : bourse/carte.
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor"/>',
};

/** Élément SVG prêt à insérer. */
export function icon(name: keyof typeof ICONS | string, size = 22): SVGElement {
  return svg(ICONS[name] ?? '', size);
}

/** Remplace le contenu d'un bouton par une icône SVG (utilitaire de bascule). */
export function setIcon(button: HTMLElement, name: string, size = 22): void {
  button.replaceChildren(icon(name, size));
}
