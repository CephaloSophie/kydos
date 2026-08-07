/* =============================================================================
 * PRESENTATION · screens/RankingScreen.ts + CompetScreen.ts
 * Classements (saison, robots) et Compétitions (vitrine) — FIDÈLES au design
 * system. Le classement est alimenté par l'écurie réelle quand elle existe,
 * complété par un podium de démonstration ; les tournois restent une vitrine.
 * ========================================================================== */
import { h } from '../../core/dom';
import { Button, BackButton } from '../components/ui';
import type { AppContext } from '../context';

interface RankRow { rank: number; name: string; accent: string; winRate: number; elo: number; me?: boolean }

const DEMO_RANKING: RankRow[] = [
  { rank: 1, name: 'Zéno·9', accent: '#e6c46a', winRate: 72, elo: 1842 },
  { rank: 2, name: 'Kant·IA', accent: '#9db4dd', winRate: 69, elo: 1790 },
  { rank: 3, name: 'Héra·X', accent: '#e08795', winRate: 66, elo: 1744 },
];

export function RankingScreen(ctx: AppContext): HTMLElement {
  const { router, robotService } = ctx;

  const rowEl = (r: RankRow) => h('div', {
    class: 'row gap-3', style: {
      padding: r.rank === 1 ? '10px 14px' : '9px 14px', borderRadius: 'var(--r-lg)',
      background: r.rank === 1 ? 'linear-gradient(90deg,rgba(230,196,106,.14),rgba(230,196,106,.04))' : r.me ? 'rgba(126,203,152,.08)' : 'var(--c-veil-04)',
      border: r.rank === 1 ? '1px solid rgba(230,196,106,.35)' : r.me ? '1px solid rgba(126,203,152,.3)' : '1px solid var(--c-line)',
    },
  },
    h('span', { class: 'title', style: { fontSize: r.rank === 1 ? '18px' : '16px', width: '22px', color: r.rank === 1 ? 'var(--c-gold)' : r.me ? 'var(--c-success)' : 'var(--c-text-soft)' } }, String(r.rank)),
    h('div', { class: 'avatar', style: { '--avatar-ring': r.accent, width: '30px', height: '27px' } },
      h('span', { class: 'avatar__dot', style: { background: r.accent } }), h('span', { class: 'avatar__dot', style: { background: r.accent } })),
    h('span', { class: 'title fill', style: { fontSize: '14px', fontWeight: '700' } }, r.name, r.me ? h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-success)', fontWeight: '400' } }, ' · vous') : null),
    h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, r.winRate + '% V'),
    h('span', { class: 'mono', style: { fontSize: '13px', color: r.rank === 1 ? 'var(--c-gold)' : r.me ? 'var(--c-success)' : 'var(--c-text-soft)' } }, String(r.elo)),
  );

  const tab = (label: string, active: boolean) => h('span', { class: 'mono', style: {
    fontSize: '11px', padding: '6px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
    background: active ? 'var(--g-btn)' : 'var(--c-veil-06)', color: active ? 'var(--c-ink)' : 'var(--c-text-soft)', border: active ? 'none' : '1px solid var(--c-line-strong)',
  } }, label);

  const list = h('div', { class: 'col gap-2' }, ...DEMO_RANKING.map(rowEl));

  // Ajoute la meilleure entrée « vous » depuis l'écurie réelle si disponible.
  robotService.list().then((robots) => {
    if (!robots.length) return;
    const mine = robots[0];
    list.append(rowEl({ rank: 14, name: mine.name, accent: mine.accent, winRate: mine.winRate || 61, elo: mine.elo, me: true }));
  }).catch(() => {});

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '52px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    BackButton('← Accueil', () => router.go('home')),
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'SAISON 1 · ROBOTS'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Classements')),
      h('div', { class: 'row gap-2' }, tab('Robots', true), tab('Joueurs', false))),
    list,
  );
}

export function CompetScreen(ctx: AppContext): HTMLElement {
  const { router } = ctx;

  const featuredCard = h('div', { class: 'feature-card', style: { padding: '16px', borderRadius: 'var(--r-xl)', '--card-grad': 'var(--g-gold)' } },
    h('div', { class: 'feature-card__glyph', style: { fontSize: '80px', right: '8px', top: '0' } }, '★'),
    h('div', { style: { position: 'relative' } },
      h('span', { class: 'mono', style: { fontSize: '9px', padding: '3px 9px', borderRadius: 'var(--r-pill)', background: 'rgba(0,0,0,.25)', color: '#fff' } }, '● LIVE · 512 robots'),
      h('div', { class: 'title', style: { fontSize: '22px', color: '#fff', margin: '12px 0 4px' } }, 'Grand Prix des IA'),
      h('div', { style: { fontSize: '12px', color: 'rgba(255,255,255,.85)', marginBottom: '16px' } }, 'Tournoi robots-vs-robots · élimination directe'),
      h('button', { class: 'btn btn--sm', style: { color: '#8f6f1f', background: '#fff' } }, 'Inscrire un robot')),
  );

  const miniCard = (tag: string, accent: string, title: string, desc: string) => h('div', { class: 'card fill' },
    h('span', { class: 'mono', style: { fontSize: '9px', color: accent } }, tag),
    h('div', { class: 'title', style: { fontSize: '15px', margin: '5px 0 3px' } }, title),
    h('div', { style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, desc));

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '52px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    BackButton('← Accueil', () => router.go('home')),
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'ÉVÉNEMENTS & TOURNOIS'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Compétitions'))),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' } },
      featuredCard,
      h('div', { class: 'col gap-2' },
        miniCard('DANS 2H', '#e85d70', 'Coupe Contrée', 'Humains + robots · 64 équipes'),
        miniCard('OUVERT', '#7ecb98', 'Ligue hebdo', 'Créez ou rejoignez une équipe'))),
    h('div', { class: 'between', style: { marginTop: '12px', padding: '11px 16px', borderRadius: 'var(--r-lg)', background: 'rgba(126,203,152,.08)', border: '1px solid rgba(126,203,152,.3)' } },
      h('div', { class: 'row gap-3' },
        h('span', { style: { fontSize: '18px' } }, '✦'),
        h('div', {}, h('div', { class: 'title', style: { fontSize: '13px' } }, 'Inviter des amis'), h('div', { style: { fontSize: '10px', color: 'var(--c-text-mute)' } }, '+250 ◆ par ami rejoignant votre équipe'))),
      Button('Partager', { variant: 'ghost', size: 'sm', onClick: () => (navigator as Navigator & { share?: (d: unknown) => Promise<void> }).share?.({ title: 'Kýdos Belote', url: 'https://kydosbelote.com' }) })),
    h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-faint)', marginTop: '10px' } }, 'Vitrine de démonstration — les inscriptions ouvriront avec la saison 1.'),
  );
}
