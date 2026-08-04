import { h } from '../core/dom';
import { api, type BordUser } from '../core/api';
import { ThemePicker } from './ThemePicker';

export function TopBar(user: BordUser | null): HTMLElement {
  const initials = user?.displayName?.slice(0, 1).toUpperCase() ?? '?';
  return h('div', { class: 'topbar' },
    h('div', { class: 'brand' },
      h('span', { class: 'dot' }),
      'Bord',
      h('span', { class: 'text-mute text-sm', style: { marginLeft: '6px' } }, '· Kýdos'),
    ),
    h('div', { class: 'spacer' }),
    ThemePicker(),
    user ? h('div', { class: 'user' },
      h('div', { class: 'avatar' }, initials),
      h('div', { class: 'col' },
        h('span', {}, user.displayName),
        h('span', { class: 'text-mute text-sm' }, user.role),
      ),
      h('button', { class: 'btn ghost sm', onClick: () => { api.logout(); location.hash = '#/login'; location.reload(); } }, 'Déconnexion'),
    ) : null,
  );
}
