/* =============================================================================
 * PRESENTATION · screens/CreateRobotScreen.ts
 * Éditeur de robot fonctionnel : avatar-mascotte, nom, 4 curseurs de stratégie,
 * aperçu live. À la création → RobotService.create() (POST /robots réel) puis
 * dialogue de succès. FIDÈLE au design system.
 *
 * IMPORTANT (comportement moteur) : les curseurs sont mappés sur la personnalité
 * MOTEUR (1–10) sans en changer la sémantique ; `bluff` reste présentationnel.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { AVATAR_PRESETS, personalityLabel, type RobotStrategy } from '../../domain/entities/Robot';
import { Robot, Avatar, Button, Badge, Slider, Dialog } from '../components/ui';
import type { AppContext } from '../context';

interface Draft { name: string; avatarId: string; strategy: RobotStrategy }

const SLIDER_DEFS: { key: keyof RobotStrategy; label: string; fill: string }[] = [
  { key: 'aggro', label: 'Agressivité', fill: 'linear-gradient(90deg,#b8912f,#e6c46a)' },
  { key: 'risk', label: 'Prise de risque', fill: 'linear-gradient(90deg,#a5414f,#e85d70)' },
  { key: 'bluff', label: 'Bluff', fill: 'linear-gradient(90deg,#4a3577,#6d51a0)' },
  { key: 'memoire', label: 'Mémoire des cartes', fill: 'linear-gradient(90deg,#1c6a40,#2f8f57)' },
];

export function CreateRobotScreen(ctx: AppContext): HTMLElement {
  const { router, robotService } = ctx;

  const draft: Draft = { name: 'Atné', avatarId: 'atne', strategy: { aggro: 62, risk: 38, bluff: 45, memoire: 78 } };
  const accent = () => (AVATAR_PRESETS.find((a) => a.id === draft.avatarId) || AVATAR_PRESETS[0]).accent;

  // --- Colonne aperçu -------------------------------------------------------
  const previewName = h('div', { class: 'title', style: { fontSize: '19px', color: '#fff' } }, draft.name);
  const previewPerso = Badge(personalityLabel(draft.strategy), 'gold');
  const mascotSlot = h('div', {});
  const renderMascot = () => { clear(mascotSlot); mascotSlot.append(Robot({ size: 96, accent: accent(), float: true })); };
  renderMascot();

  const avatarRow = h('div', { class: 'row gap-2', style: { justifyContent: 'center', marginTop: '12px' } });
  const renderAvatars = () => {
    clear(avatarRow);
    AVATAR_PRESETS.forEach((a) => avatarRow.append(Avatar({
      accent: a.accent, size: 36, ring: a.id === draft.avatarId ? a.accent : 'var(--c-line-strong)',
      onClick: () => { draft.avatarId = a.id; renderMascot(); renderAvatars(); },
    })));
  };
  renderAvatars();

  const preview = h('div', { class: 'col', style: { width: '240px' } },
    Button('← Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }),
    h('div', { class: 'col center', style: { flex: '1', marginTop: '12px', borderRadius: 'var(--r-xl)', padding: '16px', position: 'relative', background: 'radial-gradient(300px 200px at 50% 20%, rgba(109,81,160,.3), transparent 60%), linear-gradient(180deg,#141a28,#0d1220)', border: '1px solid var(--c-line)' } },
      h('div', { class: 'eyebrow', style: { position: 'absolute', top: '12px', left: '14px' } }, 'APERÇU'),
      mascotSlot,
      h('div', { style: { height: '14px' } }),
      previewName,
      h('div', { class: 'row gap-2', style: { marginTop: '9px' } }, previewPerso, Badge('ELO 1000', 'success'))),
    avatarRow,
  );

  // --- Colonne formulaire ---------------------------------------------------
  const refreshPerso = () => { previewPerso.textContent = personalityLabel(draft.strategy); };
  const nameInput = h('input', {
    class: 'input', value: draft.name, style: { border: '1px solid rgba(230,196,106,.35)', boxShadow: '0 0 0 3px rgba(230,196,106,.08)' },
    onInput: (e: Event) => { draft.name = (e.target as HTMLInputElement).value; previewName.textContent = draft.name || 'Robot'; },
  });

  const openSuccess = async (createBtn: HTMLElement) => {
    createBtn.setAttribute('disabled', 'true');
    try {
      const robot = await robotService.create(draft);
      const dlg = Dialog({
        title: 'Robot créé !',
        body: h('span', {}, h('strong', { class: 'gold' }, robot.name), " rejoint votre écurie. Prêt à s'entraîner à la contrée."),
        onClose: () => dlg.remove(),
        actions: [
          Button('Fermer', { variant: 'secondary', size: 'sm', onClick: () => { dlg.remove(); router.go('robots'); } }),
          Button('Jouer', { size: 'sm', onClick: () => { dlg.remove(); router.go('table'); } }),
        ],
      });
      root.append(dlg);
    } catch (e) {
      createBtn.removeAttribute('disabled');
      const dlg = Dialog({ icon: '✕', title: 'Erreur', body: (e as Error).message, actions: [Button('OK', { size: 'sm', onClick: () => dlg.remove() })], onClose: () => dlg.remove() });
      root.append(dlg);
    }
  };
  const createBtn = Button('Créer le robot', { block: true, onClick: () => void openSuccess(createBtn) });

  const form = h('div', { class: 'col fill', style: { minWidth: '0' } },
    h('div', { class: 'eyebrow' }, 'ÉDITEUR DE ROBOT'),
    h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', margin: '4px 0 16px' } }, 'Créer un robot'),
    h('div', { class: 'label', style: { marginBottom: '6px' } }, 'Nom du robot'),
    nameInput,
    h('div', { style: { height: '16px' } }),
    h('div', { class: 'label', style: { marginBottom: '9px' } }, 'Stratégie'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 20px', marginBottom: '16px' } },
      ...SLIDER_DEFS.map((def) => Slider({ label: def.label, value: draft.strategy[def.key], fill: def.fill, onInput: (v) => { draft.strategy[def.key] = v; refreshPerso(); } }))),
    h('div', { class: 'row gap-3', style: { marginTop: 'auto' } },
      createBtn,
      Button('Aperçu partie', { variant: 'secondary', onClick: () => router.go('table') })),
  );

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', display: 'flex', gap: '22px', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)' } }, preview, form);
  return root;
}
