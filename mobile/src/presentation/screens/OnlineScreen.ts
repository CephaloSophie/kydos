/* =============================================================================
 * PRESENTATION · screens/OnlineScreen.ts — JEU EN LIGNE (SPEC §3.3).
 * -----------------------------------------------------------------------------
 * Refonte complète. Trois types de partie, création guidée, lobby EN TEMPS
 * RÉEL (socket) : dès qu'un joueur prend/quitte/change un siège, l'écran se met
 * à jour immédiatement pour tout le monde — sans rechargement.
 *
 *   1. Alliance Hybride — joueur + robot  contre  joueur + robot.
 *   2. Duo d'Acier      — un joueur choisit DEUX robots (ils jouent ensemble)
 *                          contre un autre joueur et ses deux robots.
 *   3. Carré Royal      — 4 joueurs humains.
 *
 * Règles : partie privée = visible par les membres de l'équipe ; publique =
 * tout le monde. Les deux robots d'une même personne jouent TOUJOURS ensemble.
 * Le jeu tourne sur le SERVEUR (robots inclus) ; cet écran affiche et transmet.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Badge, Button, Dialog } from '../components/ui';
import { toast, confirmDialog } from '../components/feedback';
import { TableSocket, type LiveLobbyState } from '../../data/TableSocket';
import type { AppContext } from '../context';
import type { ServerTable, TableKind } from '../../data/ApiClient';

const KINDS: Record<TableKind, { label: string; tagline: string; glyph: string; robots: number }> = {
  hybride: { label: 'Alliance Hybride', tagline: 'Vous + un robot · contre un joueur + son robot', glyph: '♥', robots: 1 },
  acier:   { label: "Duo d'Acier",      tagline: "Vos DEUX robots ensemble · contre le duo d'un autre joueur", glyph: '♠', robots: 2 },
  royal:   { label: 'Carré Royal',      tagline: '4 joueurs humains', glyph: '♦', robots: 0 },
};
const SEAT_LABELS = ['A', 'B', 'C', 'D'];

export function OnlineScreen(ctx: AppContext): HTMLElement {
  const { router, api, ads } = ctx;
  const listEl = h('div', { class: 'col gap-2' }, h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement des tables…'));
  let myRobots: { id: string; name: string }[] = [];
  let myUserId: string | null = null;

  const lobbySockets = new Map<string, TableSocket>();
  const lobbyState = new Map<string, LiveLobbyState>();
  let scope: 'all' | 'team' | 'public' = 'all';
  let page = 1;
  let totalPages = 1;
  let total = 0;
  const cleanupSockets = () => { for (const s of lobbySockets.values()) s.disconnect(); lobbySockets.clear(); };

  const take = async (tableId: string, index: number, assignment: 'me' | string) => {
    try { await api.takeSeat(tableId, index, assignment); }
    catch (e) { toast((e as Error).message); }
  };

  const openSeatDialog = (t: ServerTable | LiveLobbyState, index: number) => {
    const actions: HTMLElement[] = [
      Button('👤 Moi', { size: 'sm', onClick: () => { dlg.remove(); void take(t.id, index, 'me'); } }),
      ...myRobots.map((r) => Button(`🤖 ${r.name}`, { variant: 'secondary', size: 'sm', onClick: () => { dlg.remove(); void take(t.id, index, r.id); } })),
      Button('Annuler', { variant: 'ghost', size: 'sm', onClick: () => dlg.remove() }),
    ];
    const dlg = Dialog({ icon: '♟', title: `Siège ${SEAT_LABELS[index]}`,
      body: 'Qui prend cette place ? En ligne, votre robot reprend la main si vous partez, et vous la récupérez au retour.',
      actions, onClose: () => dlg.remove() });
    root.append(dlg);
  };

  const seatChip = (t: ServerTable | LiveLobbyState, seat: { index: number; kind: string; name: string; team: 'A' | 'B'; userId: string | null; robotId: string | null; ownerId: string | null }) => {
    const mine = seat.userId === myUserId || seat.ownerId === myUserId;
    const base: Record<string, string> = {
      padding: '5px 9px', borderRadius: 'var(--r-pill)', fontSize: '10px', fontFamily: 'var(--f-mono)',
      border: '1px solid var(--c-line)', background: 'var(--c-veil-06)', color: 'var(--c-text-soft)', whiteSpace: 'nowrap',
    };
    const teamColor = seat.team === 'A' ? 'var(--c-success)' : 'var(--c-danger)';
    if (seat.kind === 'empty') {
      return h('span', { style: { ...base, cursor: 'pointer', borderStyle: 'dashed', color: 'var(--c-gold)' }, title: 'Prendre cette place',
        onClick: () => openSeatDialog(t, seat.index) }, `${SEAT_LABELS[seat.index]} · libre`);
    }
    return h('span', { style: { ...base, borderColor: mine ? 'rgba(230,196,106,.5)' : 'var(--c-line)', color: mine ? 'var(--c-gold)' : 'var(--c-text-soft)' } },
      h('span', { style: { color: teamColor, marginRight: '4px' } }, '●'),
      `${SEAT_LABELS[seat.index]} · ${seat.kind === 'robot' ? '🤖 ' : ''}${seat.name}${mine ? ' (vous)' : ''}`);
  };

  const tableCard = (t: ServerTable | LiveLobbyState) => {
    const seats = [...t.seats].sort((a, b) => a.index - b.index);
    const taken = seats.filter((s) => s.kind !== 'empty').length;
    const iAmOwner = t.owner === myUserId;
    const meta = KINDS[t.kind];
    const canCancel = iAmOwner && t.status === 'lobby' && taken < 4;

    return h('div', { class: 'card', style: { padding: '12px 14px' } },
      h('div', { class: 'between', style: { marginBottom: '8px' } },
        h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
          h('span', { style: { fontSize: '15px', color: 'var(--c-gold)' } }, meta.glyph),
          h('span', { class: 'title', style: { fontSize: '13px' } }, meta.label),
          Badge(t.status === 'lobby' ? (taken === 4 ? 'Départ imminent…' : `${taken}/4`) : t.status === 'playing' ? 'En jeu' : t.status, t.status === 'playing' || taken === 4 ? 'success' : 'gold'),
          t.visibility === 'public' ? Badge('Publique', 'success') : Badge('Équipe', 'info')),
        h('div', { class: 'row gap-2' },
          canCancel ? Button('Annuler', { variant: 'danger', size: 'sm', onClick: () => cancel(t.id) }) : null,
          t.status === 'playing' ? Button('▶ Regarder', { variant: 'secondary', size: 'sm', onClick: () => router.go(`table?online=${t.id}`) }) : null)),
      h('div', { class: 'row gap-2 wrap' }, ...seats.map((s) => seatChip(t, s))),
      h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)', marginTop: '7px' } }, meta.tagline));
  };

  const cancel = async (tableId: string) => {
    if (!(await confirmDialog({ title: 'Annuler la table', body: 'Annuler cette table en attente ?', confirmLabel: 'Annuler la table', danger: true }))) return;
    try { await api.cancelTable(tableId); } catch (e) { toast((e as Error).message); }
  };

  const paintList = (tables: (ServerTable | LiveLobbyState)[]) => {
    clear(listEl);
    if (!tables.length) { listEl.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Aucune table — créez la vôtre !')); return; }
    tables.sort((a, b) => a.id.localeCompare(b.id)).forEach((t) => listEl.append(tableCard(t)));
  };

  // Debounce des reloads en cascade : plusieurs tables peuvent finir presque
  // simultanément (event onFinished) et déclencher chacune un reload. On en
  // fait UN SEUL après une fenêtre courte.
  let reloadDebounce: ReturnType<typeof setTimeout> | null = null;
  const scheduleReload = () => {
    if (reloadDebounce) return;
    reloadDebounce = setTimeout(() => { reloadDebounce = null; reload(); }, 200);
  };

  const reload = () => {
    Promise.all([api.listTables({ scope, page }), api.listRobots(), api.me()])
      .then(([tablesRes, robotsRes, meRes]) => {
        myRobots = robotsRes.robots.map((r) => ({ id: r.id, name: r.name }));
        myUserId = meRes.user.id;
        totalPages = tablesRes.totalPages; total = tablesRes.total; page = tablesRes.page;
        cleanupSockets();
        lobbyState.clear();
        for (const t of tablesRes.tables) {
          lobbyState.set(t.id, t as unknown as LiveLobbyState);
          const sock = new TableSocket();
          sock.connect(t.id, {
            onLobby: (lobby) => { lobbyState.set(lobby.id, lobby); paintList([...lobbyState.values()]); },
            onCountdown: (info) => {
              // Table complète : tout le monde rejoint la partie AU MÊME MOMENT.
              cleanupSockets();
              router.go(`table?online=${info.tableId}`);
            },
            onFinished: () => scheduleReload(),
          });
          lobbySockets.set(t.id, sock);
        }
        paintList(tablesRes.tables);
        renderPager();
      })
      .catch((e) => { clear(listEl); listEl.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, `Hors-ligne : ${(e as Error).message}`)); });
  };

  const openCreateDialog = () => {
    let kind: TableKind = 'hybride';
    let visibility: 'public' | 'private' = 'public';
    const selectedRobots: string[] = [];
    const kindRow = h('div', { class: 'col gap-2' });
    const robotRow = h('div', { class: 'col gap-2' });
    const visRow = h('div', { class: 'row gap-2' });
    const err = h('div', { style: { color: 'var(--c-danger)', fontSize: '11px', minHeight: '14px' } });

    const renderKinds = () => {
      clear(kindRow);
      (Object.keys(KINDS) as TableKind[]).forEach((k) => {
        const m = KINDS[k]; const active = kind === k;
        kindRow.append(h('div', {
          style: { cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--r-lg)',
            background: active ? 'rgba(230,196,106,.14)' : 'var(--c-veil-04)',
            border: `1px solid ${active ? 'rgba(230,196,106,.55)' : 'var(--c-line)'}` },
          onClick: () => { kind = k; selectedRobots.length = 0; renderKinds(); renderRobots(); },
        },
          h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
            h('span', { style: { fontSize: '15px', color: active ? 'var(--c-gold)' : 'var(--c-text-soft)' } }, m.glyph),
            h('span', { class: 'title', style: { fontSize: '13px', color: active ? 'var(--c-gold)' : 'var(--c-text)' } }, m.label)),
          h('div', { class: 'mono', style: { fontSize: '9.5px', color: 'var(--c-text-mute)', marginTop: '3px' } }, m.tagline)));
      });
    };
    const renderRobots = () => {
      clear(robotRow);
      const need = KINDS[kind].robots;
      if (need === 0) { robotRow.append(h('div', { class: 'text-mute', style: { fontSize: '11px' } }, 'Aucun robot à choisir — 4 joueurs humains.')); return; }
      robotRow.append(h('div', { class: 'label', style: { fontSize: '10px' } },
        need === 2 ? 'Choisissez VOS DEUX robots (ils jouent ensemble)' : 'Choisissez votre robot partenaire'));
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' } });
      myRobots.forEach((r) => {
        const active = selectedRobots.includes(r.id);
        grid.append(h('span', {
          class: 'mono', style: { cursor: 'pointer', textAlign: 'center', padding: '7px 6px', borderRadius: 'var(--r-md)', fontSize: '11px',
            background: active ? 'rgba(126,203,152,.16)' : 'var(--c-veil-06)',
            border: `1px solid ${active ? 'rgba(126,203,152,.5)' : 'var(--c-line-strong)'}`,
            color: active ? 'var(--c-success)' : 'var(--c-text-soft)' },
          onClick: () => {
            const i = selectedRobots.indexOf(r.id);
            if (i >= 0) selectedRobots.splice(i, 1);
            else { if (selectedRobots.length >= need) selectedRobots.shift(); selectedRobots.push(r.id); }
            renderRobots();
          },
        }, `🤖 ${r.name}`));
      });
      robotRow.append(grid);
    };
    const renderVis = () => {
      clear(visRow);
      (['public', 'private'] as const).forEach((v) => {
        const active = visibility === v;
        visRow.append(h('span', {
          class: 'mono', style: { cursor: 'pointer', flex: '1', textAlign: 'center', padding: '8px', borderRadius: 'var(--r-md)', fontSize: '11px',
            background: active ? 'rgba(230,196,106,.14)' : 'var(--c-veil-06)',
            border: `1px solid ${active ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)'}`,
            color: active ? 'var(--c-gold)' : 'var(--c-text-soft)' },
          onClick: () => { visibility = v; renderVis(); },
        }, v === 'public' ? 'Publique · tous' : 'Privée · mon équipe'));
      });
    };
    renderKinds(); renderRobots(); renderVis();

    const submit = async () => {
      err.textContent = '';
      const need = KINDS[kind].robots;
      if (selectedRobots.length !== need) { err.textContent = need === 2 ? 'Sélectionnez exactement deux robots.' : 'Sélectionnez votre robot partenaire.'; return; }
      try {
        await ads.beforeCreateTable(); // interstitiel avant création (ignoré si VIP)
        await api.createTable({ kind, visibility, robotIds: selectedRobots, forTeam: visibility === 'private' });
        backdrop.remove();
        reload();
        toast(`Table « ${KINDS[kind].label} » créée`, 'success');
      } catch (e) { err.textContent = (e as Error).message; }
    };

    const backdrop: HTMLElement = h('div', { class: 'dialog-backdrop', onClick: (e: Event) => { if (e.target === backdrop) backdrop.remove(); } },
      h('div', { class: 'dialog', style: { width: '520px', maxHeight: '88vh', overflowY: 'auto', textAlign: 'left', padding: '20px' } },
        h('div', { class: 'dialog__title', style: { textAlign: 'left', fontSize: '17px', marginBottom: '4px' } }, 'Créer une table'),
        h('div', { class: 'text-mute', style: { fontSize: '11px', marginBottom: '14px' } }, 'Choisissez le type de partie.'),
        h('div', { class: 'label', style: { fontSize: '10px' } }, 'Type de partie'), kindRow,
        h('div', { style: { marginTop: '12px' } }, robotRow),
        h('div', { class: 'label', style: { fontSize: '10px', marginTop: '12px' } }, 'Visibilité'), visRow,
        err,
        h('div', { class: 'dialog__actions', style: { marginTop: '16px' } },
          Button('Annuler', { variant: 'secondary', size: 'sm', onClick: () => backdrop.remove() }),
          Button('Créer la table', { onClick: submit }))));
    root.append(backdrop);
  };

  // Onglets de portée : toutes (publiques + à moi + équipe) / équipe / publiques.
  const scopeTab = (value: 'all' | 'team' | 'public', label: string) => h('span', {
    class: 'mono', style: { cursor: 'pointer', padding: '6px 13px', borderRadius: 'var(--r-pill)', fontSize: '11px',
      background: scope === value ? 'rgba(230,196,106,.16)' : 'var(--c-veil-06)',
      border: `1px solid ${scope === value ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)'}`,
      color: scope === value ? 'var(--c-gold)' : 'var(--c-text-soft)' },
    onClick: () => { scope = value; page = 1; renderScope(); reload(); },
  }, label);
  const scopeRow = h('div', { class: 'row gap-2 wrap', style: { marginBottom: '10px' } });
  const renderScope = () => { clear(scopeRow); scopeRow.append(scopeTab('all', 'Toutes'), scopeTab('team', 'Mon équipe'), scopeTab('public', 'Publiques')); };
  renderScope();

  const pager = h('div', { class: 'row center gap-3', style: { marginTop: '10px' } });
  const renderPager = () => {
    clear(pager);
    if (totalPages <= 1) return;
    pager.append(
      Button('‹ Précédent', { variant: 'secondary', size: 'sm', disabled: page <= 1, onClick: () => { if (page > 1) { page--; reload(); } } }),
      h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, `Page ${page} / ${totalPages}  ·  ${total} table${total > 1 ? 's' : ''}`),
      Button('Suivant ›', { variant: 'secondary', size: 'sm', disabled: page >= totalPages, onClick: () => { if (page < totalPages) { page++; reload(); } } }),
    );
  };

  reload();

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '10px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'MULTIJOUEUR'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Jouer en ligne')),
      h('div', { class: 'row gap-2' },
        Button('+ Créer une table', { size: 'sm', onClick: openCreateDialog }),
        Button('↻', { variant: 'ghost', size: 'sm', onClick: reload }),
        Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => { cleanupSockets(); router.go('home'); } }))),
    h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)', marginBottom: '10px' } },
      'Une seule partie à la fois. Le jeu tourne sur le serveur : si vous partez, votre robot prend la main, et vous la récupérez au retour.'),
    scopeRow,
    listEl,
    pager) as HTMLElement & { _cleanup?: () => void };

  // Le router (main.tsx) appelle ce cleanup avant de remplacer l'écran :
  // toutes les sockets de lobby sont fermées + debounce reload annulé →
  // plus aucun event serveur ni timer ne remonte pour cet écran une fois quitté.
  root._cleanup = () => {
    cleanupSockets();
    if (reloadDebounce) { clearTimeout(reloadDebounce); reloadDebounce = null; }
  };
  return root;
}
