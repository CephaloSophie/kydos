/* =============================================================================
 * PRESENTATION · components/feedback.ts
 * -----------------------------------------------------------------------------
 * Retours utilisateur SANS boîte native : plus aucun `alert()` / `confirm()`.
 *   • toast()   — bandeau flottant discret (erreur, succès, info) qui disparaît.
 *   • confirm() — dialogue de confirmation du design system (fond dépoli).
 * Tout passe par le vocabulaire visuel du DS, cohérent avec le reste de l'app.
 * ========================================================================== */
import { h } from '../../core/dom';
import { Button, Dialog } from './ui';

type ToastKind = 'error' | 'success' | 'info';

const KIND_STYLE: Record<ToastKind, { bg: string; border: string; color: string; icon: string }> = {
  error:   { bg: 'rgba(232,93,112,.16)',  border: 'rgba(232,93,112,.5)',  color: '#ff9aa8', icon: '⚠' },
  success: { bg: 'rgba(126,203,152,.16)', border: 'rgba(126,203,152,.5)', color: 'var(--c-success)', icon: '✓' },
  info:    { bg: 'rgba(157,180,221,.16)', border: 'rgba(157,180,221,.5)', color: 'var(--c-info, #9db4dd)', icon: 'ℹ' },
};

/** Conteneur unique des toasts (créé à la demande, ancré en haut au centre). */
function toastHost(): HTMLElement {
  let host = document.getElementById('kydos-toasts');
  if (!host) {
    host = h('div', { id: 'kydos-toasts', style: {
      position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: '8px', zIndex: '9999',
      pointerEvents: 'none', width: 'min(440px, 92vw)',
    } });
    document.body.append(host);
  }
  return host;
}

/**
 * Affiche un bandeau flottant qui s'efface seul.
 * Remplace toute utilisation de `alert()` pour signaler un résultat.
 */
export function toast(message: string, kind: ToastKind = 'error', durationMs = 3800): void {
  const s = KIND_STYLE[kind];
  const el = h('div', { style: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 15px',
    borderRadius: 'var(--r-lg)', background: s.bg, border: `1px solid ${s.border}`,
    color: s.color, fontSize: '13px', boxShadow: 'var(--sh-float, 0 12px 30px rgba(0,0,0,.4))',
    backdropFilter: 'blur(8px)', pointerEvents: 'auto',
    transform: 'translateY(-12px)', opacity: '0', transition: 'transform .22s ease, opacity .22s ease',
  } },
    h('span', { style: { fontSize: '15px', flexShrink: '0' } }, s.icon),
    h('span', { style: { flex: '1' } }, message));
  toastHost().append(el);
  requestAnimationFrame(() => { el.style.transform = 'none'; el.style.opacity = '1'; });
  const remove = () => { el.style.opacity = '0'; el.style.transform = 'translateY(-12px)'; setTimeout(() => el.remove(), 240); };
  el.addEventListener('click', remove);
  setTimeout(remove, durationMs);
}

/**
 * Dialogue de confirmation du design system (remplace `confirm()`).
 * Résout `true` si l'utilisateur valide, `false` s'il annule ou ferme.
 */
export function confirmDialog(options: { title: string; body: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: boolean) => { if (settled) return; settled = true; dlg.remove(); resolve(value); };
    const dlg = Dialog({
      icon: options.danger ? '⚠' : '?',
      title: options.title,
      body: options.body,
      actions: [
        Button('Annuler', { variant: 'secondary', size: 'sm', onClick: () => done(false) }),
        Button(options.confirmLabel ?? 'Confirmer', { variant: options.danger ? 'danger' : 'primary', size: 'sm', onClick: () => done(true) }),
      ],
      onClose: () => done(false),
    });
    document.body.append(dlg);
  });
}
