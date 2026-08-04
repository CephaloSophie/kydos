import { h } from '../core/dom';
import { getTheme, setTheme, type ThemeId } from '../core/theme';

const OPTIONS: Array<{ id: ThemeId; label: string; short: string }> = [
  { id: 'ubuntu-dark',  label: 'Ubuntu sombre',  short: 'Ubuntu●' },
  { id: 'ubuntu-light', label: 'Ubuntu clair',   short: 'Ubuntu○' },
  { id: 'mac-dark',     label: 'Mac sombre',     short: 'Mac●' },
  { id: 'mac-light',    label: 'Mac clair',      short: 'Mac○' },
];

export function ThemePicker(): HTMLElement {
  const current = getTheme();
  const buttons = OPTIONS.map((opt) =>
    h('button', {
      class: opt.id === current ? 'active' : '',
      title: opt.label,
      onClick: () => {
        setTheme(opt.id);
        // rafraîchir l'état visuel de tous les boutons
        for (const b of Array.from(el.querySelectorAll('button'))) b.classList.remove('active');
        (event?.currentTarget as HTMLButtonElement)?.classList.add('active');
      },
    }, opt.short),
  );
  const el = h('div', { class: 'theme-picker' }, ...buttons);
  return el;
}
