/* =============================================================================
 * PRESENTATION · screens/LoginScreen.ts
 * Écran de connexion présenté comme une CARTE DE BELOTE (as de cœur),
 * apparition en flip 3D + lueur — FIDÈLE au design system. Bilingue.
 * Branché sur le VRAI backend : connexion ET création de compte (/auth/*).
 * ========================================================================== */
import { h } from '../../core/dom';
import { Robot, Button } from '../components/ui';
import { showWaitingOverlay } from '../components/Waiting';
import { runBootstrap } from '../../data/bootstrap';
import { soundService } from '../../services/sound/SoundService';
import type { AppContext } from '../context';

export function LoginScreen(ctx: AppContext): HTMLElement {
  const { router, api, t } = ctx;
  let mode: 'login' | 'register' = 'login';

  const userInput = h('input', {
    class: 'input', value: '', placeholder: 'Cephalojoueur', autocomplete: 'username',
    style: { background: '#fff', color: '#3a3f4a', border: '1px solid rgba(0,0,0,.14)', height: '34px', marginBottom: '12px' },
  }) as HTMLInputElement;
  const passInput = h('input', {
    class: 'input', type: 'password', value: '', placeholder: '••••••••', autocomplete: 'current-password',
    style: { background: '#fff', color: '#3a3f4a', border: '1px solid rgba(0,0,0,.14)', height: '34px', marginBottom: '18px' },
  }) as HTMLInputElement;
  const errEl = h('div', { style: { color: '#c34a5c', fontSize: '11px', minHeight: '15px', textAlign: 'center', marginTop: '8px', fontFamily: 'var(--f-mono)' } });

  const titleEl = h('div', { class: 'title', style: { fontSize: '16px', textAlign: 'center', marginBottom: '16px', color: '#2a2f3a' } }, 'Se connecter');
  const submit = async () => {
    errEl.textContent = '';
    if (!userInput.value || !passInput.value) { errEl.textContent = 'Pseudo et mot de passe requis.'; return; }
    submitBtn.setAttribute('disabled', 'true');
    try {
      const res = mode === 'login' ? await api.login(userInput.value, passInput.value) : await api.register(userInput.value, passInput.value);
      api.setToken(res.token);
      // Charger la session (profil/wallet/VIP/robots) + sons AVANT d'entrer,
      // derrière la page waiting — l'accueil s'affiche alors déjà peuplé.
      const hide = showWaitingOverlay('chargement de votre partie');
      try { await runBootstrap({ api, session: ctx.session, sound: soundService }); }
      finally { hide(); }
      router.go('home');
    } catch (e) {
      errEl.textContent = (e as Error).message;
      submitBtn.removeAttribute('disabled');
    }
  };
  const submitBtn = Button(t('login.cta'), { block: true, onClick: submit });

  const toggle = h('span', { style: { color: '#b8912f', fontWeight: '600', cursor: 'pointer' }, onClick: () => {
    mode = mode === 'login' ? 'register' : 'login';
    titleEl.textContent = mode === 'login' ? 'Se connecter' : 'Créer un compte';
    submitBtn.textContent = mode === 'login' ? t('login.cta') : t('login.signup');
    toggle.textContent = mode === 'login' ? t('login.signup') : 'Se connecter';
  } }, t('login.signup'));

  // Enter valide le formulaire.
  [userInput, passInput].forEach((el) => el.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') void submit(); }));

  const card = h('div', { class: 'play-card', style: { width: '300px', height: '360px', animation: 'cardFlipIn var(--t-flip) var(--e-out) both' } },
    h('div', { class: 'play-card__corner play-card__corner--tl' }, h('div', {}, 'A'), h('div', {}, '♥')),
    h('div', { class: 'play-card__corner play-card__corner--br' }, h('div', {}, 'A'), h('div', {}, '♥')),
    h('div', { style: { padding: '38px 26px 22px' } },
      titleEl,
      h('div', { class: 'label', style: { color: '#8a8470', marginBottom: '5px' } }, 'Pseudo'), userInput,
      h('div', { class: 'label', style: { color: '#8a8470', marginBottom: '5px' } }, 'Mot de passe'), passInput,
      submitBtn,
      h('div', { style: { textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#8a8470' } }, t('login.have') + ' ', toggle),
      errEl,
    ),
  );

  return h('div', {
    class: 'anim-screen', style: {
      position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', gap: '40px', padding: '0 46px 0 60px',
      background: 'radial-gradient(700px 460px at 70% 40%, rgba(43,120,78,.28), transparent 62%), linear-gradient(160deg,#070c17,#05070f)',
    },
  },
    h('div', { class: 'fill' },
      h('div', { class: 'brand', style: { marginBottom: '18px' } },
        h('span', { class: 'brand__name', style: { fontSize: '30px' } }, 'Kýdos'),
        h('span', { class: 'brand__sub' }, 'BELOTE')),
      h('h2', { class: 'title', style: { fontSize: '34px', lineHeight: '1.05', marginBottom: '14px' } }, t('login.welcome')),
      h('p', { class: 'text-mute', style: { maxWidth: '280px', lineHeight: '1.55', marginBottom: '22px', fontSize: '14px' } }, t('login.sub')),
      h('div', { class: 'row gap-3', style: { padding: '10px 14px', background: 'rgba(16,21,31,.7)', border: '1px solid var(--c-line)', borderRadius: 'var(--r-md)', width: 'fit-content' } },
        Robot({ size: 30, accent: 'var(--c-success)' }),
        h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, 'Atné vous attend au siège A.')),
    ),
    card,
  );
}
