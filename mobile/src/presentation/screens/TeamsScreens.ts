/* =============================================================================
 * PRESENTATION · screens/TeamsScreens.ts
 * -----------------------------------------------------------------------------
 * Deux écrans :
 *   1) TeamsScreen  — liste des équipes publiques + accès à mon équipe.
 *   2) MyTeamScreen — détail de mon équipe (nom, visibilité, membres, actions).
 *
 * Les actions sur les membres (kick, changer de rôle) et sur l'équipe
 * (renommer, changer visibilité) sont MASQUÉES à l'UI selon le rôle courant
 * (miroir des permissions serveur — `domain/entities/Team.ts`). Le serveur
 * reste seul juge en cas de tentative directe.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Avatar, Badge, Button, Dialog } from '../components/ui';
import {
  TEAM_MAX_MEMBERS, TEAM_ROLES, ROLE_ACCENTS, ROLE_LABELS,
  canAct, canAssign, canChangeVisibility, canInvite, canRenameTeam,
  type TeamRole,
} from '../../domain/entities/Team';
import { toast, confirmDialog } from '../components/feedback';
import type { AppContext } from '../context';
import type { ServerTeamDetail, ServerTeamSummary } from '../../data/ApiClient';

/* ────────────────────────────────────────────────────────────────────────── */

export function TeamsScreen(ctx: AppContext): HTMLElement {
  const { router, teamService } = ctx;

  const list = h('div', { class: 'col gap-2' }, h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement des équipes…'));

  const join = async (t: ServerTeamSummary) => {
    try { await teamService.join(t.id); toast(`Vous avez rejoint « ${t.name} »`, 'success'); location.hash = `#/team?id=${t.id}`; }
    catch (e) { toast((e as Error).message); }
  };

  const rowEl = (t: ServerTeamSummary) => h('div', {
    class: 'row gap-3', style: { padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', alignItems: 'center' },
  },
    h('span', { class: 'title fill', style: { fontSize: '14px', cursor: 'pointer' }, onClick: () => (location.hash = `#/team?id=${t.id}`) }, t.name),
    Badge(t.visibility === 'public' ? 'Public' : 'Privée', t.visibility === 'public' ? 'success' : 'neutral'),
    h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, `${t.members}/${TEAM_MAX_MEMBERS}`),
    h('span', { class: 'mono gold', style: { fontSize: '11px' } }, `${t.points} pts`),
    // Rejoindre : proposé pour les équipes publiques (le serveur refuse si déjà membre / privée).
    t.visibility === 'public' ? Button('Rejoindre', { size: 'sm', onClick: () => join(t) }) : Button('Voir', { variant: 'secondary', size: 'sm', onClick: () => (location.hash = `#/team?id=${t.id}`) }),
  );

  teamService.list()
    .then((teams) => {
      clear(list);
      if (!teams.length) list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Aucune équipe pour le moment.'));
      else teams.forEach((t) => list.append(rowEl(t)));
    })
    .catch((e) => { clear(list); list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, `Impossible de charger : ${(e as Error).message}`)); });

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'COMMUNAUTÉ'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Équipes')),
      h('div', { class: 'row gap-2' },
        Button('Mon équipe', { size: 'sm', onClick: () => router.go('team') }),
        Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }))),
    list,
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/** Dialogue de création d'une équipe (rare — un utilisateur ne peut en posséder qu'une). */
function CreateTeamDialog(ctx: AppContext, onDone: () => void): HTMLElement {
  const { teamService } = ctx;
  const nameInput = h('input', { class: 'input', placeholder: 'Nom de mon équipe' }) as HTMLInputElement;
  let visibility: 'public' | 'private' = 'private';
  const visRow = h('div', { class: 'row gap-2', style: { marginTop: '8px' } });
  const renderVis = () => {
    clear(visRow);
    (['private', 'public'] as const).forEach((v) => {
      const active = visibility === v;
      visRow.append(h('div', {
        class: 'badge', style: {
          cursor: 'pointer', padding: '8px 14px', fontSize: '11px', flex: '1',
          background: active ? 'rgba(230,196,106,.16)' : 'var(--c-veil-06)',
          borderColor: active ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)',
          color: active ? 'var(--c-gold)' : 'var(--c-text-soft)',
        },
        onClick: () => { visibility = v; renderVis(); },
      }, v === 'private' ? 'Privée · sur invitation' : 'Publique · ouverte à tous'));
    });
  };
  renderVis();

  const err = h('div', { style: { color: 'var(--c-danger)', fontSize: '11px', minHeight: '14px' } });
  const submit = async () => {
    err.textContent = '';
    try {
      await teamService.create(nameInput.value.trim(), visibility);
      backdrop.remove();
      onDone();
    } catch (e) { err.textContent = (e as Error).message; }
  };

  const backdrop: HTMLElement = h('div', { class: 'dialog-backdrop', onClick: (e: Event) => { if (e.target === backdrop) backdrop.remove(); } },
    h('div', { class: 'dialog', style: { width: '440px', textAlign: 'left', padding: '20px' } },
      h('div', { class: 'dialog__title', style: { textAlign: 'left', marginBottom: '4px', fontSize: '17px' } }, 'Créer mon équipe'),
      h('div', { class: 'text-mute', style: { fontSize: '11px', marginBottom: '14px' } }, 'Vous serez le propriétaire (une seule équipe possédée par joueur).'),
      h('div', { class: 'label', style: { fontSize: '10px' } }, 'Nom'), nameInput,
      h('div', { class: 'label', style: { fontSize: '10px', marginTop: '10px' } }, 'Visibilité'), visRow,
      err,
      h('div', { class: 'dialog__actions', style: { marginTop: '18px' } },
        Button('Annuler', { variant: 'secondary', size: 'sm', onClick: () => backdrop.remove() }),
        Button('Créer', { onClick: submit }))));
  return backdrop;
}

export function MyTeamScreen(ctx: AppContext): HTMLElement {
  const { router, teamService } = ctx;
  const container = h('div', {}, h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement…'));

  const memberRow = (detail: ServerTeamDetail, m: ServerTeamDetail['members'][number]) => {
    const myRole = detail.myRole;
    const canManage = myRole && canAct(myRole, m.role);
    const roleSelect = canManage ? h('select', {
      class: 'input', style: { height: '28px', fontSize: '11px', width: '120px' },
      onChange: async (e: Event) => {
        const newRole = (e.target as HTMLSelectElement).value as TeamRole;
        try {
          await teamService.changeRole(detail.team!.id, m.id, newRole);
          reload();
        } catch (err) { toast((err as Error).message); reload(); }
      },
    },
      ...TEAM_ROLES.filter((r) => r === m.role || (myRole && canAssign(myRole, r))).map((r) => {
        const opt = h('option', { value: r }, ROLE_LABELS[r]) as HTMLOptionElement;
        if (r === m.role) opt.selected = true;
        return opt;
      })) : Badge(ROLE_LABELS[m.role], m.role === 'owner' ? 'gold' : 'neutral');

    return h('div', { class: 'row gap-3', style: { padding: '9px 12px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)' } },
      Avatar({ accent: ROLE_ACCENTS[m.role], size: 28 }),
      h('div', { class: 'col fill', style: { gap: '2px' } },
        h('span', { class: 'title', style: { fontSize: '13px' } }, m.username, m.role === 'owner' ? h('span', { class: 'gold', style: { fontSize: '10px', marginLeft: '4px' } }, ' · propriétaire') : null),
        h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)' } }, `Niv. ${m.level} · ${m.rewardPoints} pts`)),
      roleSelect,
      canManage ? Button('Exclure', {
        variant: 'danger', size: 'sm',
        onClick: async () => {
          if (!(await confirmDialog({ title: 'Exclure un membre', body: `Exclure ${m.username} de l'équipe ?`, confirmLabel: 'Exclure', danger: true }))) return;
          try { await teamService.kick(detail.team!.id, m.id); reload(); }
          catch (err) { toast((err as Error).message); }
        },
      }) : null,
    );
  };

  const render = (detail: ServerTeamDetail) => {
    clear(container);
    if (!detail.team) {
      // Pas encore d'équipe.
      container.append(
        h('div', { class: 'card center col', style: { padding: '24px', gap: '12px', textAlign: 'center' } },
          h('div', { class: 'title', style: { fontSize: '17px' } }, 'Aucune équipe'),
          h('div', { class: 'text-mute', style: { fontSize: '12px', maxWidth: '360px' } }, "Créez votre équipe (une seule par joueur) ou rejoignez-en une depuis la liste publique."),
          h('div', { class: 'row gap-2' },
            Button('Créer mon équipe', { onClick: () => container.append(CreateTeamDialog(ctx, reload)) }),
            Button('Voir les équipes', { variant: 'secondary', onClick: () => router.go('teams') }))));
      return;
    }

    const t = detail.team;
    const myRole = detail.myRole;
    const renameBtn = myRole && canRenameTeam(myRole) ? Button('Renommer', {
      variant: 'secondary', size: 'sm',
      onClick: async () => {
        const name = prompt('Nouveau nom de l\'équipe ?', t.name);
        if (!name?.trim()) return;
        try { await teamService.rename(t.id, name.trim()); reload(); }
        catch (err) { toast((err as Error).message); }
      },
    }) : null;

    const visibilityBtn = myRole && canChangeVisibility(myRole) ? Button(t.visibility === 'public' ? 'Rendre privée' : 'Rendre publique', {
      variant: 'ghost', size: 'sm',
      onClick: async () => {
        try { await teamService.setVisibility(t.id, t.visibility === 'public' ? 'private' : 'public'); reload(); }
        catch (err) { toast((err as Error).message); }
      },
    }) : null;

    const inviteBtn = myRole && canInvite(myRole) ? Button('✉ Inviter', {
      size: 'sm',
      onClick: () => router.go('invitations'),
    }) : null;

    const leaveBtn = myRole && myRole !== 'owner' ? Button('Quitter', {
      variant: 'danger', size: 'sm',
      onClick: async () => {
        if (!(await confirmDialog({ title: 'Quitter l\'équipe', body: 'Quitter cette équipe ?', confirmLabel: 'Quitter', danger: true }))) return;
        try { await teamService.leave(t.id); reload(); }
        catch (err) { toast((err as Error).message); }
      },
    }) : null;

    container.append(
      h('div', { class: 'card', style: { marginBottom: '12px' } },
        h('div', { class: 'between', style: { marginBottom: '8px' } },
          h('div', {}, h('div', { class: 'eyebrow' }, 'ÉQUIPE'), h('h2', { class: 'title', style: { fontSize: '20px', marginTop: '2px' } }, t.name)),
          h('div', { class: 'row gap-2' }, inviteBtn, renameBtn, visibilityBtn, leaveBtn)),
        h('div', { class: 'row gap-3', style: { color: 'var(--c-text-mute)', fontSize: '11px' } },
          Badge(t.visibility === 'public' ? 'Publique' : 'Privée', t.visibility === 'public' ? 'success' : 'neutral'),
          h('span', {}, `${detail.members.length}/${TEAM_MAX_MEMBERS} membres`),
          h('span', { class: 'gold' }, `${t.points} pts`),
          myRole ? Badge(`Vous : ${ROLE_LABELS[myRole]}`, myRole === 'owner' ? 'gold' : 'neutral') : null,
          myRole && canInvite(myRole) ? h('span', { class: 'text-mute', style: { fontSize: '10px' } }, '· vous pouvez inviter') : null)),
      h('div', { class: 'col gap-2' }, ...detail.members.map((m) => memberRow(detail, m))));
  };

  const reload = () => { teamService.mine().then(render).catch((e) => { clear(container); container.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, `Impossible de charger : ${(e as Error).message}`)); }); };
  reload();

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'COMMUNAUTÉ'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Mon équipe')),
      h('div', { class: 'row gap-2' },
        Button('Équipes publiques', { variant: 'secondary', size: 'sm', onClick: () => router.go('teams') }),
        Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }))),
    container,
  );
}
