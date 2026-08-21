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
import { personalityLabel, type RobotStrategy } from '../../domain/entities/Robot';
import { getAvatarList, avatarAccent, loadAvatarCatalog } from '../../data/AvatarCatalog';
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

  // v18 — s'assure que le catalogue d'avatars (back-office) est à jour, puis
  // rafraîchit le sélecteur (les avatars débloqués dépendent du niveau joueur).
  void loadAvatarCatalog(ctx.api).then(() => { try { renderAvatars(); renderMascot(); } catch { /* pas encore monté */ } });

  // Mode édition si le hash porte un ?id= : on pré-remplit le brouillon avec la
  // fiche du robot (lue depuis le cache de session, donc dispo hors-ligne).
  const editId = (() => {
    const q = location.hash.split('?')[1] ?? '';
    return new URLSearchParams(q).get('id');
  })();
  const editing = ctx.session.robots.find((r) => r.id === editId) ?? null;
  const isEdit = !!editing;

  // Brouillon initial : valeurs du robot édité, ou valeurs par défaut à la création.
  const draft: Draft = isEdit
    ? {
        name: editing!.name,
        avatarId: editing!.mobile?.avatarId ?? 'atne',
        strategy: editing!.mobile?.strategy ?? { aggro: 55, risk: 45, bluff: 45, memoire: 60 },
      }
    : { name: 'Atné', avatarId: 'atne', strategy: { aggro: 62, risk: 38, bluff: 45, memoire: 78 } };
  // v18 — les avatars proviennent du catalogue back-office (débloqués par niveau).
  const accent = () => avatarAccent(draft.avatarId);

  // --- Colonne aperçu -------------------------------------------------------
  const previewName = h('div', { class: 'title', style: { fontSize: '19px', color: '#fff' } }, draft.name);
  const previewPerso = Badge(personalityLabel(draft.strategy), 'gold');
  const mascotSlot = h('div', {});
  const renderMascot = () => { clear(mascotSlot); mascotSlot.append(Robot({ size: 96, accent: accent(), float: true })); };
  renderMascot();

  const avatarRow = h('div', { class: 'row gap-2', style: { justifyContent: 'center', marginTop: '12px' } });
  const renderAvatars = () => {
    clear(avatarRow);
    getAvatarList().forEach((a) => avatarRow.append(Avatar({
      accent: a.accentColor, size: 36, ring: a.key === draft.avatarId ? a.accentColor : 'var(--c-line-strong)',
      onClick: () => { draft.avatarId = a.key; renderMascot(); renderAvatars(); },
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
    // Création et édition exigent le réseau (le serveur persiste la fiche).
    if (!ctx.api.isAuthenticated()) {
      const dlg = Dialog({ icon: '✕', title: 'Connexion requise',
        body: `La ${isEdit ? 'modification' : 'création'} d\u2019un robot nécessite une connexion. Reconnectez-vous puis réessayez.`,
        actions: [Button('OK', { size: 'sm', onClick: () => dlg.remove() })], onClose: () => dlg.remove() });
      root.append(dlg);
      return;
    }
    createBtn.setAttribute('disabled', 'true');
    try {
      const robot = isEdit
        ? await robotService.update(editing!.id, draft)
        : await robotService.create(draft);
      // Le robot (nouveau ou modifié) doit apparaître partout : on rafraîchit
      // le cache de session — l'événement session:robots met à jour les écrans.
      await ctx.session.refreshRobots();
      const dlg = Dialog({
        title: isEdit ? 'Robot mis à jour !' : 'Robot créé !',
        body: h('span', {}, h('strong', { class: 'gold' }, robot.name),
          isEdit ? ' a été mis à jour.' : " rejoint votre écurie. Prêt à s'entraîner à la contrée."),
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
  const createBtn = Button(isEdit ? 'Enregistrer les modifications' : 'Créer le robot', { block: true, onClick: () => void openSuccess(createBtn) });

  const form = h('div', { class: 'col fill', style: { minWidth: '0' } },
    h('div', { class: 'eyebrow' }, isEdit ? 'MODIFIER LE ROBOT' : 'ÉDITEUR DE ROBOT'),
    h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', margin: '4px 0 16px' } }, isEdit ? 'Modifier un robot' : 'Créer un robot'),
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
