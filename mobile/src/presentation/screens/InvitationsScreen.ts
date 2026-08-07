/* =============================================================================
 * PRESENTATION · screens/InvitationsScreen.ts
 * -----------------------------------------------------------------------------
 * Gestion complète des invitations d'équipe (SPEC §3.6) :
 *   • Onglet REÇUES  — accepter / refuser une invitation.
 *   • Onglet ENVOYÉES — voir et ANNULER les invitations que j'ai émises
 *                       (visible seulement si je possède une équipe).
 *   • Formulaire d'invitation — recherche d'un joueur par pseudo puis envoi.
 *
 * Fidèle au design system. Aucune boîte native : uniquement toasts + dialogues.
 * Réactif : réagit à l'évènement `invitations:changed` et rafraîchit.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Avatar, Badge, Button, Field, BackButton } from '../components/ui';
import { toast, confirmDialog } from '../components/feedback';
import type { AppContext } from '../context';
import type { ServerInvitationReceived, ServerInvitationSent, ServerTeamDetail } from '../../data/ApiClient';

export function InvitationsScreen(ctx: AppContext): HTMLElement {
  const { router, teamService, bus } = ctx;

  type Tab = 'received' | 'sent';
  let tab: Tab = 'received';
  let myTeam: ServerTeamDetail | null = null;
  let iOwnTeam = false;

  const list = h('div', { class: 'col gap-2' }, h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement…'));
  const tabsRow = h('div', { class: 'row gap-2', style: { marginBottom: '12px' } });
  const inviteBox = h('div', {});
  // Ref partagée pour annuler le debounce de recherche d'invitation au démontage.
  const inviteDebounceRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };

  // ---- Onglets ----
  const tabBtn = (value: Tab, label: string) => h('span', {
    class: 'mono', style: {
      cursor: 'pointer', padding: '7px 15px', borderRadius: 'var(--r-pill)', fontSize: '12px',
      background: tab === value ? 'rgba(230,196,106,.16)' : 'var(--c-veil-06)',
      border: `1px solid ${tab === value ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)'}`,
      color: tab === value ? 'var(--c-gold)' : 'var(--c-text-soft)',
    },
    onClick: () => { tab = value; renderTabs(); refresh(); },
  }, label);
  const renderTabs = () => {
    clear(tabsRow);
    tabsRow.append(tabBtn('received', 'Reçues'));
    if (iOwnTeam) tabsRow.append(tabBtn('sent', 'Envoyées'));
  };

  // ---- Ligne d'invitation reçue ----
  const receivedRow = (inv: ServerInvitationReceived) => h('div', {
    class: 'row gap-3', style: { padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', alignItems: 'center' },
  },
    Avatar({ accent: 'var(--c-info)', size: 36 }),
    h('div', { class: 'fill', style: { minWidth: '0' } },
      h('div', { class: 'title', style: { fontSize: '14px' } }, inv.team.name),
      h('div', { style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, `Invité par ${inv.from.username}`),
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-faint)' } }, new Date(inv.createdAt).toLocaleDateString('fr-FR'))),
    h('div', { class: 'row gap-2' },
      Button('Accepter', { size: 'sm', onClick: () => accept(inv) }),
      Button('Refuser', { variant: 'ghost', size: 'sm', onClick: () => decline(inv) })));

  // ---- Ligne d'invitation envoyée ----
  const sentRow = (inv: ServerInvitationSent) => h('div', {
    class: 'row gap-3', style: { padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', alignItems: 'center' },
  },
    Avatar({ accent: 'var(--c-gold)', size: 36 }),
    h('div', { class: 'fill', style: { minWidth: '0' } },
      h('div', { class: 'title', style: { fontSize: '14px' } }, inv.to.username),
      h('div', { style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, 'Invitation en attente')),
    Badge('En attente', 'gold'),
    Button('Annuler', { variant: 'danger', size: 'sm', onClick: () => cancel(inv) }));

  // ---- Actions ----
  const accept = async (inv: ServerInvitationReceived) => {
    if (!(await confirmDialog({ title: `Rejoindre « ${inv.team.name} »`, body: 'Accepter cette invitation et rejoindre l\'équipe ?', confirmLabel: 'Accepter' }))) return;
    try { await teamService.acceptInvitation(inv.id); toast(`Bienvenue dans « ${inv.team.name} » !`, 'success'); router.go('team'); }
    catch (e) { toast((e as Error).message); }
  };
  const decline = async (inv: ServerInvitationReceived) => {
    try { await teamService.declineInvitation(inv.id); toast('Invitation refusée', 'info'); refresh(); }
    catch (e) { toast((e as Error).message); }
  };
  const cancel = async (inv: ServerInvitationSent) => {
    if (!(await confirmDialog({ title: 'Annuler l\'invitation', body: `Annuler l'invitation envoyée à ${inv.to.username} ?`, confirmLabel: 'Annuler l\'invitation', danger: true }))) return;
    try { await teamService.cancelInvitation(inv.id); toast('Invitation annulée', 'info'); refresh(); }
    catch (e) { toast((e as Error).message); }
  };

  // ---- Formulaire d'invitation (recherche + envoi) ----
  const buildInviteBox = () => {
    clear(inviteBox);
    if (!iOwnTeam || !myTeam?.team) return;
    const teamId = myTeam.team.id;

    const results = h('div', { class: 'col gap-1', style: { marginTop: '6px' } });

    const field = Field('Inviter un joueur (pseudo)', {
      placeholder: 'Tape un pseudo…',
      oninput: (e: Event) => {
        const q = (e.target as HTMLInputElement).value.trim();
        if (inviteDebounceRef.current) clearTimeout(inviteDebounceRef.current);
        if (q.length < 1) { clear(results); return; }
        inviteDebounceRef.current = setTimeout(async () => {
          try {
            const users = await teamService.searchUsers(q);
            clear(results);
            if (!users.length) { results.append(h('div', { class: 'text-mute', style: { fontSize: '11px', padding: '4px 2px' } }, 'Aucun joueur trouvé.')); return; }
            users.forEach((u) => results.append(h('div', {
              class: 'between', style: { padding: '8px 12px', borderRadius: 'var(--r-md)', background: 'var(--c-veil-06)', border: '1px solid var(--c-line)' },
            },
              h('span', { style: { fontSize: '13px' } }, u.username),
              Button('Inviter', { size: 'sm', onClick: () => sendInvite(teamId, u.username, results) }))));
          } catch (e) { clear(results); results.append(h('div', { class: 'text-mute', style: { fontSize: '11px' } }, (e as Error).message)); }
        }, 250);
      },
    });

    inviteBox.append(h('div', { class: 'col gap-2', style: { padding: '14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', marginBottom: '14px' } },
      h('div', { style: { fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--c-text-mute)' } }, `Inviter dans « ${myTeam.team.name} »`),
      field, results));
  };

  const sendInvite = async (teamId: string, username: string, results: HTMLElement) => {
    try {
      await teamService.invite(teamId, username);
      toast(`Invitation envoyée à ${username}`, 'success');
      clear(results);
      if (tab === 'sent') refresh();
    } catch (e) { toast((e as Error).message); }
  };

  // ---- Rafraîchissement ----
  const refresh = () => {
    clear(list); list.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement…'));
    if (tab === 'received') {
      teamService.receivedInvitations()
        .then((invs) => {
          clear(list);
          if (!invs.length) { list.append(emptyState('Aucune invitation reçue.')); return; }
          invs.forEach((inv) => list.append(receivedRow(inv)));
        })
        .catch((e) => { clear(list); list.append(emptyState(`Impossible de charger : ${(e as Error).message}`)); });
    } else {
      if (!myTeam?.team) { clear(list); list.append(emptyState('Vous ne possédez pas d\'équipe.')); return; }
      teamService.sentInvitations(myTeam.team.id)
        .then((invs) => {
          clear(list);
          if (!invs.length) { list.append(emptyState('Aucune invitation en attente.')); return; }
          invs.forEach((inv) => list.append(sentRow(inv)));
        })
        .catch((e) => { clear(list); list.append(emptyState(`Impossible de charger : ${(e as Error).message}`)); });
    }
  };

  const emptyState = (msg: string) => h('div', { class: 'col center gap-2', style: { padding: '30px 16px', textAlign: 'center' } },
    h('div', { style: { fontSize: '26px', opacity: '.5' } }, '✉'),
    h('div', { class: 'text-mute', style: { fontSize: '12px' } }, msg));

  // Chargement initial : déterminer si je possède une équipe (pour l'onglet Envoyées + le formulaire).
  teamService.mine()
    .then((detail) => {
      myTeam = detail;
      iOwnTeam = detail.myRole === 'owner' && !!detail.team;
      renderTabs(); buildInviteBox(); refresh();
    })
    .catch(() => { renderTabs(); refresh(); });

  // Réactivité : toute modification d'invitation rafraîchit l'écran.
  const off = bus.on('invitations:changed', () => refresh());
  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '52px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    BackButton('← Accueil', () => router.go('home')),
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'ÉQUIPE'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Invitations'))),
    tabsRow,
    inviteBox,
    list);
  // Nettoyage de l'abonnement bus quand l'écran est retiré du DOM,
  // et annulation du debounce timer de recherche s'il est en cours.
  (root as HTMLElement & { _cleanup?: () => void })._cleanup = () => {
    off();
    if (inviteDebounceRef.current) { clearTimeout(inviteDebounceRef.current); inviteDebounceRef.current = null; }
  };
  return root;
}
