/* =============================================================================
 * PRESENTATION · components/ProfileMenu.ts — Menu profil (feuille déroulante).
 * -----------------------------------------------------------------------------
 * S'ouvre au clic sur le bloc niveau/avatar de la barre supérieure. Conçu pour
 * l'usage mobile : cible tactile large, ancré en haut à droite, fond assombri,
 * fermeture au clic extérieur. AJOUTER une entrée = une ligne dans `items`.
 * ========================================================================== */
import { h } from '../../core/dom';
import { icon } from './icons';

export interface ProfileMenuItem {
  /** Nom d'icône SVG (voir icons.ts). */
  icon: string;
  label: string;
  onClick: () => void;
  /** Style « danger » (rouge) — ex. déconnexion. */
  danger?: boolean;
}

/**
 * Ouvre le menu profil ancré sous un élément déclencheur.
 * @param anchor  l'élément cliqué (pour positionner la feuille en dessous)
 * @param items   entrées du menu (extensible)
 */
export function openProfileMenu(anchor: HTMLElement, items: ProfileMenuItem[]): void {
  // Voile plein écran (ferme au clic extérieur).
  const veil = h('div', { style: {
    position: 'fixed', inset: '0', zIndex: '200', background: 'rgba(4,7,13,.35)',
  } });

  const sheet = h('div', { class: 'profile-menu', style: { position: 'fixed', zIndex: '201' } },
    ...items.map((it) => h('button', {
      class: 'profile-menu__item' + (it.danger ? ' is-danger' : ''),
      onClick: () => { close(); it.onClick(); },
    }, icon(it.icon, 20), h('span', {}, it.label))));

  const close = () => { veil.remove(); sheet.remove(); };
  veil.addEventListener('click', close);

  document.body.append(veil, sheet);

  // Positionnement : sous l'ancre, aligné à droite, en restant dans l'écran.
  const r = anchor.getBoundingClientRect();
  sheet.style.top = `${Math.round(r.bottom + 8)}px`;
  const width = sheet.offsetWidth || 200;
  const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
  sheet.style.left = `${Math.round(left)}px`;
}
