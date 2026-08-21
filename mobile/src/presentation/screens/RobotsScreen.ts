/* =============================================================================
 * PRESENTATION · screens/RobotsScreen.ts
 * « Mes robots » : écurie live depuis le VRAI backend (RobotService). Chaque
 * robot = carte (mascotte, personnalité, curseurs). Carte « + » → éditeur.
 * FIDÈLE au design system ; chargement asynchrone avec état vide soigné.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Badge, Button, Dialog } from '../components/ui';
import { RobotMascot } from '../components/RobotMascot';
import { toast } from '../components/feedback';
import type { AppContext } from '../context';
import type { Robot } from '../../domain/entities/Robot';
import { toDomain } from '../../data/RobotRepository';
import { avatarFace } from '../../data/AvatarCatalog';

export function RobotsScreen(ctx: AppContext): HTMLElement {
  const { router, robotService, api, ads } = ctx;

  const robotCard = (r: Robot) => h('div', { class: 'card' },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', { class: 'row gap-3' },
        RobotMascot(avatarFace(r.avatarId), 44),
        h('div', {},
          h('div', { class: 'title', style: { fontSize: '15px' } }, r.name),
          h('div', { class: 'mono', style: { fontSize: '9px', color: r.status === 'playing' ? 'var(--c-success)' : 'var(--c-text-mute)' } },
            r.status === 'playing' ? '● en partie' : '○ repos'))),
      Button('Modifier', { variant: 'ghost', size: 'sm', onClick: () => router.go(`create?id=${r.id}`) })),
    h('div', { class: 'row gap-2 wrap', style: { marginBottom: '12px' } },
      Badge(r.personality, r.personality === 'Offensif' ? 'gold' : 'level'),
      Badge('ELO ' + r.elo)),
    h('div', { class: 'between mono', style: { fontSize: '10px', color: 'var(--c-text-mute)' } },
      h('span', {}, `agr ${r.strategy.aggro} · mém ${r.strategy.memoire}`),
      h('span', { style: { color: 'var(--c-success)' } }, `risque ${r.strategy.risk}`)),
  );

  const addCard = h('div', {
    class: 'col center', style: { borderRadius: 'var(--r-lg)', cursor: 'pointer', gap: '8px', minHeight: '130px', background: 'var(--c-veil-04)', border: '1.5px dashed var(--c-line-strong)', color: 'var(--c-text-mute)' },
    onClick: () => router.go('create'),
  },
    h('div', { class: 'center', style: { width: '38px', height: '38px', borderRadius: '50%', fontSize: '20px', color: 'var(--c-gold)', background: 'rgba(230,196,106,.1)', border: '1px solid rgba(230,196,106,.3)' } }, '+'),
    h('span', { style: { fontSize: '12px' } }, 'Créer un robot'));

  const grid = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } },
    h('div', { class: 'text-mute', style: { fontSize: '12px', gridColumn: '1 / -1', padding: '10px 0' } }, 'Chargement de votre écurie…'));

  // Source : le cache de session (chargé au bootstrap, persisté, dispo
  // hors-ligne). Affichage INSTANTANÉ depuis le cache, puis rafraîchissement
  // silencieux en arrière-plan si le réseau est là. Le dialogue « match entre
  // robots » réutilise la même liste — aucun refetch superflu.
  const paintGrid = (robots: Robot[]) => {
    clear(grid);
    if (robots.length === 0) {
      grid.append(h('div', { class: 'text-mute', style: { fontSize: '12px', gridColumn: '1 / -1' } }, 'Aucun robot pour l\u2019instant. Cr\u00e9ez-en un pour commencer !'));
    } else {
      robots.forEach((r) => grid.append(robotCard(r)));
    }
    grid.append(addCard);
  };

  const currentRobots = (): Robot[] => ctx.session.robots.map(toDomain);

  // 1) Affichage immédiat depuis le cache (peut être vide au tout premier lancement).
  if (ctx.session.robots.length > 0) paintGrid(currentRobots());

  // 2) Rafraîchissement en arrière-plan (met à jour le cache → réaffiche).
  ctx.session.refreshRobots()
    .then(() => paintGrid(currentRobots()))
    .catch(() => { if (ctx.session.robots.length === 0) paintGrid([]); });

  const getRobots = async (): Promise<Robot[]> => currentRobots();

  /**
   * Fait s'affronter 4 robots CÔTÉ SERVEUR (aucune socket) : la partie est
   * simulée d'un trait puis archivée dans l'historique, où l'on peut voir le
   * résultat et la rejouer. On choisit 4 fiches parmi l'écurie.
   */
  const openRobotMatchDialog = async () => {
    let robots: Robot[] = [];
    try { robots = await getRobots(); } catch (e) { toast((e as Error).message); return; }
    if (robots.length < 4) { toast('Il faut au moins 4 robots dans votre écurie pour un match entre robots.', 'info'); return; }

    const chosen: string[] = robots.slice(0, 4).map((r) => r.id);
    const rowFor = (seatIndex: number) => {
      const select = h('select', {
        class: 'mono', style: { flex: '1', padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'var(--c-veil-06)', border: '1px solid var(--c-line-strong)', color: 'var(--c-text)' },
        onChange: (e: Event) => { chosen[seatIndex] = (e.target as HTMLSelectElement).value; },
      }, ...robots.map((r) => h('option', { value: r.id, selected: r.id === chosen[seatIndex] }, `${r.name} · ELO ${r.elo}`))) as HTMLSelectElement;
      const team = seatIndex % 2 === 0 ? 'NOUS' : 'EUX';
      return h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
        h('span', { class: 'mono', style: { fontSize: '10px', width: '58px', color: seatIndex % 2 === 0 ? 'var(--c-success)' : 'var(--c-danger)' } }, `${team} · ${['A','B','C','D'][seatIndex]}`),
        select);
    };

    let running = false;
    const launchBtn = Button('Lancer le match', { onClick: async () => {
      if (running) return;
      running = true;
      launchBtn.textContent = 'Simulation en cours…';
      (launchBtn as HTMLButtonElement).disabled = true;
      try {
        const res = await api.simulateRobotGame(chosen, { visibility: 'private', manches: 2 });
        toast(`Match terminé — ${res.winner === 'A' ? 'NOUS' : res.winner === 'B' ? 'EUX' : 'nul'} (${res.scoreA} – ${res.scoreB})`, 'success');
        backdrop.remove();
        router.go(`gamestats?id=${res.gameId}`);
      } catch (e) {
        toast((e as Error).message);
        running = false; launchBtn.textContent = 'Lancer le match'; (launchBtn as HTMLButtonElement).disabled = false;
      }
    } });

    const backdrop = Dialog({
      icon: '🤖', title: 'Match entre robots',
      body: h('div', { class: 'col gap-2' },
        h('p', { class: 'text-mute', style: { fontSize: '12px', margin: '0 0 4px' } }, 'Quatre robots s\'affrontent sur le serveur. La partie est jouée instantanément et archivée dans l\'historique.'),
        rowFor(0), rowFor(1), rowFor(2), rowFor(3)),
      actions: [Button('Annuler', { variant: 'secondary', onClick: () => backdrop.remove() }), launchBtn],
      onClose: () => backdrop.remove(),
    });
    document.querySelector('.anim-screen')?.append(backdrop);
  };

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'ÉCURIE'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Mes robots')),
      h('div', { class: 'row gap-2' }, Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }), Button('+ Nouveau', { size: 'sm', onClick: () => router.go('create') }))),
    grid,
    h('div', { class: 'row gap-3', style: { marginTop: '12px' } },
      Button('Lancer une partie', { block: true, onClick: async () => { await ads.beforeTraining(); router.go('table'); } }),
      Button('▶ Match entre robots', { variant: 'ghost', block: true, onClick: openRobotMatchDialog })),
  );
}
