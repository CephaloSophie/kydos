/* =============================================================================
 * PRESENTATION · screens/ProfileSettingsScreen.ts — Réglages du profil.
 * -----------------------------------------------------------------------------
 * v19 — Le joueur enrichit son profil : prénom, nom, e-mail, et LOGO (choisi
 * parmi les logos suggérés du back-office, même rendu que les mascottes robots).
 * Aperçu live du logo avec CADRE DORÉ si le joueur est VIP. Enregistrement via
 * l'API (PATCH /users/me), puis mise à jour du cache de session.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button, Badge, Dialog } from '../components/ui';
import { toast } from '../components/feedback';
import { RobotMascot } from '../components/RobotMascot';
import { getPlayerLogoList, playerFace, loadPlayerAvatarCatalog } from '../../data/PlayerAvatarCatalog';
import type { AppContext } from '../context';

export function ProfileSettingsScreen(ctx: AppContext): HTMLElement {
  const { router, api, session } = ctx;
  const p = session.profile;

  const draft = {
    firstName: p?.firstName ?? '',
    lastName: p?.lastName ?? '',
    email: p?.email ?? '',
    avatarId: p?.avatarId ?? (getPlayerLogoList()[0]?.key ?? null),
  };

  // S'assure que le catalogue est frais, puis rafraîchit le sélecteur.
  void loadPlayerAvatarCatalog(api).then(() => { try { renderPicker(); renderPreview(); } catch { /* pas monté */ } });

  // ── Aperçu du logo (cadre doré si VIP) ────────────────────────────────────
  const logoSlot = h('div', { style: { display: 'inline-flex', lineHeight: '0' } });
  const frame = h('div', {
    style: {
      display: 'inline-flex', borderRadius: '50%', padding: '6px',
      boxShadow: session.isVip ? '0 0 0 3px #f0c46a, 0 0 18px rgba(240,196,106,.5)' : '0 0 0 1px var(--c-line)',
      background: session.isVip ? 'radial-gradient(circle at 50% 30%, rgba(240,196,106,.3), transparent 70%)' : 'transparent',
    },
  }, logoSlot);
  const renderPreview = () => { clear(logoSlot); logoSlot.append(RobotMascot(playerFace(draft.avatarId), 96)); };
  renderPreview();

  // ── Sélecteur de logos ────────────────────────────────────────────────────
  const picker = h('div', { class: 'row gap-2 wrap', style: { justifyContent: 'center', marginTop: '12px' } });
  const renderPicker = () => {
    clear(picker);
    getPlayerLogoList().forEach((a) => {
      const selected = a.key === draft.avatarId;
      const chip = h('button', {
        class: 'avatar avatar-pick', title: a.name,
        style: {
          padding: '4px', borderRadius: '14px', cursor: 'pointer', lineHeight: '0',
          background: selected ? 'rgba(255,255,255,.06)' : 'transparent',
          border: selected ? `2px solid ${a.accentColor}` : '2px solid var(--c-line)',
        },
        onClick: () => { draft.avatarId = a.key; renderPreview(); renderPicker(); },
      }, RobotMascot({ accentColor: a.accentColor, bodyColor: a.bodyColor, outlineColor: a.outlineColor }, 34));
      picker.append(chip);
    });
  };
  renderPicker();

  // ── Champs d'identité ─────────────────────────────────────────────────────
  const field = (label: string, value: string, onInput: (v: string) => void, type = 'text') => {
    const input = h('input', { class: 'input', value, type, onInput: (e: Event) => onInput((e.target as HTMLInputElement).value) });
    return h('div', { class: 'col', style: { gap: '6px', marginBottom: '12px' } },
      h('div', { class: 'label' }, label), input);
  };

  const saveBtn = Button('Enregistrer', { block: true, onClick: () => void save(saveBtn) });

  const save = async (btn: HTMLElement) => {
    if (!api.isAuthenticated()) {
      const dlg = Dialog({ icon: '✕', title: 'Connexion requise', body: 'Reconnectez-vous pour modifier votre profil.', actions: [Button('OK', { size: 'sm', onClick: () => dlg.remove() })], onClose: () => dlg.remove() });
      root.append(dlg); return;
    }
    btn.setAttribute('disabled', 'true');
    try {
      const { user } = await api.updateProfile({
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email: draft.email.trim(),
        avatarId: draft.avatarId,
      });
      const u = user as { firstName?: string; lastName?: string; email?: string | null; avatarId?: string | null };
      session.applyProfile({ firstName: u.firstName ?? '', lastName: u.lastName ?? '', email: u.email ?? null, avatarId: u.avatarId ?? null });
      toast('Profil mis à jour', 'success');
      router.go('home');
    } catch (e) {
      btn.removeAttribute('disabled');
      const dlg = Dialog({ icon: '✕', title: 'Erreur', body: (e as Error).message, actions: [Button('OK', { size: 'sm', onClick: () => dlg.remove() })], onClose: () => dlg.remove() });
      root.append(dlg);
    }
  };

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', overflowY: 'auto', padding: '14px 24px 24px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)' } },
    Button('← Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }),
    h('div', { class: 'col center', style: { marginTop: '10px' } },
      frame,
      h('div', { class: 'row gap-2', style: { marginTop: '10px' } },
        Badge(`Niv ${session.profile?.level ?? 1}`, 'level'),
        session.isVip ? Badge('VIP ⭐', 'gold') : Badge('Standard')),
      picker),
    h('div', { style: { maxWidth: '480px', margin: '20px auto 0' } },
      h('div', { class: 'eyebrow', style: { marginBottom: '8px' } }, 'MON PROFIL'),
      field('Prénom', draft.firstName, (v) => { draft.firstName = v; }),
      field('Nom', draft.lastName, (v) => { draft.lastName = v; }),
      field('Adresse e-mail', draft.email, (v) => { draft.email = v; }, 'email'),
      h('div', { style: { height: '6px' } }),
      saveBtn),
  );
  return root;
}
