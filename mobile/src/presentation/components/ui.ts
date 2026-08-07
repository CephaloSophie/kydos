/* =============================================================================
 * PRESENTATION · components/ui.ts — Fabriques de composants UI réutilisables.
 * Port TypeScript FIDÈLE du design system (js/presentation/components/ui.js).
 * Fonctions pures renvoyant des éléments DOM à partir des classes du DS
 * (components.css). Aucune logique métier ici : uniquement l'assemblage visuel.
 * ========================================================================== */

import { h, type DomChild } from '../../core/dom';

/** Mascotte robot. size en px, accent = couleur des yeux/antenne. */
export function Robot({ size = 44, accent = 'var(--c-gold)', float = false }: { size?: number; accent?: string; float?: boolean } = {}) {
  return h('div', { class: ['robot', float && 'robot--float'], style: { '--robot-size': size + 'px', '--robot-accent': accent } },
    h('span', { class: 'robot__antenna' }),
    h('span', { class: 'robot__bulb' }),
    h('div', { class: 'robot__head' }, h('span', { class: 'robot__eye' }), h('span', { class: 'robot__eye' })),
  );
}

/** Avatar encadré (mascotte + anneau d'état). */
export function Avatar({ accent, size = 44, ring, onClick }: { accent: string; size?: number; ring?: string; onClick?: () => void }) {
  return h('div', { class: 'avatar', onClick, style: { '--avatar-ring': ring || accent, width: size + 'px', height: size * 0.9 + 'px' } },
    h('span', { class: 'avatar__dot', style: { background: accent } }),
    h('span', { class: 'avatar__dot', style: { background: accent } }),
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
/** Bouton. variant: primary|secondary|ghost|danger. */
export function Button(label: DomChild, { variant = 'primary', size, block, onClick, disabled }: { variant?: ButtonVariant; size?: 'sm'; block?: boolean; onClick?: (e: Event) => void; disabled?: boolean } = {}) {
  return h('button', { class: ['btn', `btn--${variant}`, size === 'sm' && 'btn--sm', block && 'btn--block'], onClick, disabled }, label);
}

/** Bouton retour, ancré en haut à gauche de l'écran avec un léger espace du bord. */
export function BackButton(label: DomChild, onClick: () => void) {
  return h('button', {
    class: ['btn', 'btn--secondary', 'btn--sm'],
    style: { position: 'absolute', top: '10px', left: '14px', zIndex: '500' },
    onClick,
  }, label);
}

export type BadgeVariant = 'gold' | 'success' | 'danger' | 'info' | 'level' | 'neutral';
/** Badge. variant: gold|success|danger|info|level|neutral. */
export function Badge(text: DomChild, variant: BadgeVariant = 'neutral') {
  return h('span', { class: ['badge', variant !== 'neutral' && `badge--${variant}`] }, text);
}

/** Champ étiqueté avec input natif. */
export function Field(label: string, attrs: Record<string, unknown> = {}) {
  return h('div', { class: 'field' }, h('div', { class: 'label' }, label), h('input', { class: 'input', ...attrs }));
}

/** Slider de stratégie. fill = dégradé CSS ; onInput(value). */
export function Slider({ label, value, fill, onInput }: { label: string; value: number; fill: string; onInput?: (v: number) => void }) {
  const fillEl = h('div', { class: 'slider__fill', style: { width: value + '%' } });
  const valEl = h('span', { class: 'slider__val' }, String(value));
  return h('div', { class: 'slider', style: { '--slider-fill': fill } },
    h('div', { class: 'slider__head' }, h('span', {}, label), valEl),
    h('div', { class: 'slider__track' },
      fillEl,
      h('input', {
        class: 'slider__input', type: 'range', min: 0, max: 100, value,
        onInput: (e: Event) => { const v = +(e.target as HTMLInputElement).value; fillEl.style.width = v + '%'; valEl.textContent = String(v); onInput?.(v); },
      }),
    ),
  );
}

/** Fenêtre de dialogue modale montée dans un backdrop. onClose au clic hors carte. */
export function Dialog({ icon = '✓', title, body, actions = [], onClose }: { icon?: string; title: string; body: DomChild; actions?: HTMLElement[]; onClose?: () => void }): HTMLElement {
  const backdrop: HTMLElement = h('div', { class: 'dialog-backdrop', onClick: (e: Event) => { if (e.target === backdrop) onClose?.(); } },
    h('div', { class: 'dialog' },
      h('div', { class: 'dialog__icon' }, icon),
      h('div', { class: 'dialog__title' }, title),
      h('div', { class: 'dialog__body' }, body),
      h('div', { class: 'dialog__actions' }, ...actions),
    ),
  );
  return backdrop;
}

/** En-tête d'écran (eyebrow + titre + slot d'actions à droite). */
export function ScreenHead(eyebrow: string, title: string, right?: HTMLElement | null) {
  return h('div', { class: 'between', style: { marginBottom: 'var(--s-3)' } },
    h('div', {}, h('div', { class: 'eyebrow' }, eyebrow), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, title)),
    right || null,
  );
}
