import { h, mount } from '../core/dom';
import { api } from '../core/api';

export function LoginView(root: HTMLElement): void {
  const errorBox = h('div', { class: 'login-error', style: { display: 'none' } });
  const usernameInput = h('input', { class: 'input', type: 'text', placeholder: 'ameur ou hamido', autofocus: true }) as HTMLInputElement;
  const passwordInput = h('input', { class: 'input', type: 'password', placeholder: '••••••••' }) as HTMLInputElement;
  const submitBtn = h('button', { class: 'btn primary', style: { width: '100%' } }, 'Se connecter') as HTMLButtonElement;

  const submit = async () => {
    const u = usernameInput.value.trim();
    const p = passwordInput.value;
    if (!u || !p) { showError('renseigne les deux champs'); return; }
    submitBtn.disabled = true; submitBtn.textContent = '…';
    try {
      await api.login(u, p);
      location.hash = '#/board';
      location.reload();
    } catch (e) {
      showError((e as Error).message ?? 'connexion échouée');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
    }
  };
  const showError = (m: string) => { errorBox.textContent = m; errorBox.style.display = 'block'; };

  submitBtn.addEventListener('click', submit);
  passwordInput.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') submit(); });

  const page = h('div', { class: 'login-page' },
    h('div', { class: 'login-card' },
      h('h1', {}, 'Bord'),
      h('div', { class: 'subtitle' }, 'Backoffice des tâches — Kýdos Belote'),
      errorBox,
      h('div', { class: 'field' },
        h('div', { class: 'label' }, 'Identifiant'),
        usernameInput,
      ),
      h('div', { class: 'field' },
        h('div', { class: 'label' }, 'Mot de passe'),
        passwordInput,
      ),
      submitBtn,
    ),
  );
  mount(root, page);
}
