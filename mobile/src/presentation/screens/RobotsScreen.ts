/* =============================================================================
 * PRESENTATION · screens/RobotsScreen.ts
 * « Mes robots » : écurie live depuis le VRAI backend (RobotService). Chaque
 * robot = carte (mascotte, personnalité, curseurs). Carte « + » → éditeur.
 * FIDÈLE au design system ; chargement asynchrone avec état vide soigné.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Avatar, Badge, Button } from '../components/ui';
import type { AppContext } from '../context';
import type { Robot } from '../../domain/entities/Robot';

export function RobotsScreen(ctx: AppContext): HTMLElement {
  const { router, robotService } = ctx;

  const robotCard = (r: Robot) => h('div', { class: 'card' },
    h('div', { class: 'row gap-3', style: { marginBottom: '12px' } },
      Avatar({ accent: r.accent, size: 40 }),
      h('div', {},
        h('div', { class: 'title', style: { fontSize: '15px' } }, r.name),
        h('div', { class: 'mono', style: { fontSize: '9px', color: r.status === 'playing' ? 'var(--c-success)' : 'var(--c-text-mute)' } },
          r.status === 'playing' ? '● en partie' : '○ repos'))),
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

  robotService.list()
    .then((robots) => { clear(grid); robots.forEach((r) => grid.append(robotCard(r))); grid.append(addCard); })
    .catch((e) => { clear(grid); grid.append(h('div', { class: 'text-mute', style: { fontSize: '12px', gridColumn: '1 / -1' } }, `Impossible de charger l'écurie : ${(e as Error).message}`), addCard); });

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'ÉCURIE'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Mes robots')),
      h('div', { class: 'row gap-2' }, Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }), Button('+ Nouveau', { size: 'sm', onClick: () => router.go('create') }))),
    grid,
    h('div', { class: 'row gap-3', style: { marginTop: '12px' } },
      Button('Lancer une partie', { block: true, onClick: () => router.go('table') }),
      Button('▶ Regarder jouer', { variant: 'ghost', block: true, onClick: () => router.go('table?watch=1') })),
  );
}
