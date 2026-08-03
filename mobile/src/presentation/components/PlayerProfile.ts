/* =============================================================================
 * PRESENTATION · components/PlayerProfile.ts
 * -----------------------------------------------------------------------------
 * Popup de PROFIL d'un joueur, ouvert en cliquant sur son nom (dans une partie,
 * l'historique, etc.). Trois onglets :
 *   • Infos  — niveau, rang, jetons, équipe.
 *   • Robots — les fiches robots du joueur (nom + ELO).
 *   • Stats  — parties jouées / gagnées / perdues, nombre de robots.
 *
 * Fidèle au design system. Chargement paresseux du profil à l'ouverture.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Avatar, Badge, Robot } from './ui';
import type { ApiClient, ServerUserProfile } from '../../data/ApiClient';

/**
 * Ouvre la popup de profil pour `userId`. `username` sert de titre le temps du
 * chargement. `vipInfo` (optionnel) affiche un badge VIP + date d'expiration
 * quand on ouvre le profil de l'utilisateur courant (Mon profil).
 * Retourne l'élément backdrop (déjà ajouté au DOM par l'appelant).
 */
export function openPlayerProfile(api: ApiClient, userId: string, username?: string, vipInfo?: { isVip: boolean; expiresAt: string | null }): HTMLElement {
  type Tab = 'infos' | 'robots' | 'stats';
  let tab: Tab = 'infos';
  let profile: ServerUserProfile | null = null;

  const bodyEl = h('div', { class: 'col gap-2', style: { minHeight: '160px' } },
    h('div', { class: 'text-mute', style: { fontSize: '12px' } }, 'Chargement du profil…'));

  const tabsRow = h('div', { class: 'row gap-2', style: { marginBottom: '4px' } });
  const tabBtn = (value: Tab, label: string) => h('span', {
    class: 'mono', style: {
      cursor: 'pointer', padding: '6px 13px', borderRadius: 'var(--r-pill)', fontSize: '11px',
      background: tab === value ? 'rgba(230,196,106,.16)' : 'var(--c-veil-06)',
      border: `1px solid ${tab === value ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)'}`,
      color: tab === value ? 'var(--c-gold)' : 'var(--c-text-soft)',
    },
    onClick: () => { tab = value; renderTabs(); renderBody(); },
  }, label);
  const renderTabs = () => { clear(tabsRow); tabsRow.append(tabBtn('infos', 'Infos'), tabBtn('robots', 'Robots'), tabBtn('stats', 'Stats')); };

  const statTile = (value: string, label: string, accent = 'var(--c-text)') => h('div', {
    class: 'col', style: { padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-06)', border: '1px solid var(--c-line)', gap: '2px', minWidth: '0' },
  },
    h('span', { class: 'mono', style: { fontSize: '22px', fontWeight: '700', color: accent, lineHeight: '1.1' } }, value),
    h('span', { style: { fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--c-text-mute)' } }, label));

  const renderBody = () => {
    if (!profile) return;
    clear(bodyEl);
    if (tab === 'infos') {
      // Bandeau VIP (uniquement pour le profil courant si le vip est actif).
      if (vipInfo?.isVip && vipInfo.expiresAt) {
        bodyEl.append(h('div', { style: {
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', marginBottom: '8px',
          borderRadius: 'var(--r-lg)', border: '1px solid rgba(230,196,106,.5)',
          background: 'linear-gradient(90deg, rgba(230,196,106,.16), rgba(230,196,106,.06))',
        } },
          h('span', { style: { fontSize: '22px' } }, '⭐'),
          h('div', { class: 'col' },
            h('span', { style: { fontSize: '13px', fontWeight: '700', color: 'var(--c-gold)' } }, 'Statut VIP actif'),
            h('span', { class: 'text-mute', style: { fontSize: '11px' } },
              `Sans publicité jusqu'au ${new Date(vipInfo.expiresAt).toLocaleDateString('fr-FR')}`))));
      }
      bodyEl.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' } },
        statTile(`Niv. ${profile.level}`, 'Niveau', 'var(--c-gold)'),
        statTile(profile.rank, 'Rang', 'var(--c-info)'),
        statTile(`${profile.rewardPoints}`, 'Jetons', 'var(--c-gold)')));
      bodyEl.append(h('div', { class: 'row gap-2', style: { marginTop: '6px', alignItems: 'center' } },
        h('span', { style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, 'Équipe :'),
        profile.team ? Badge(profile.team.name, profile.team.visibility === 'public' ? 'success' : 'neutral') : h('span', { class: 'text-mute', style: { fontSize: '12px' } }, 'Aucune')));
    } else if (tab === 'robots') {
      if (!profile.robots.length) { bodyEl.append(h('div', { class: 'text-mute', style: { fontSize: '12px', padding: '10px 0' } }, 'Aucun robot.')); return; }
      profile.robots.forEach((r) => bodyEl.append(h('div', {
        class: 'row gap-3', style: { padding: '10px 12px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)', alignItems: 'center' },
      },
        Robot({ size: 30 }),
        h('span', { class: 'title fill', style: { fontSize: '13px' } }, r.name),
        Badge(`ELO ${r.elo}`, 'level'))));
    } else {
      const played = profile.gamesPlayed;
      const rate = played > 0 ? Math.round((profile.wins / Math.max(1, profile.wins + profile.losses)) * 100) : 0;
      bodyEl.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' } },
        statTile(`${played}`, 'Parties jouées'),
        statTile(`${profile.wins}`, 'Gagnées', 'var(--c-success)'),
        statTile(`${profile.losses}`, 'Perdues', 'var(--c-danger)'),
        statTile(`${rate}%`, 'Taux de victoire', 'var(--c-gold)'),
        statTile(`${profile.robotCount}`, 'Robots', 'var(--c-info)')));
    }
  };

  const modal = h('div', {
    class: 'col gap-3', style: {
      background: 'linear-gradient(180deg,#101627,#0a0e1a)', border: '1px solid var(--c-line-strong)',
      borderRadius: 'var(--r-2xl)', maxWidth: '460px', width: '100%', padding: '20px 22px',
      boxShadow: '0 30px 80px -20px #000', maxHeight: '82vh', overflow: 'auto',
    },
  },
    h('div', { class: 'between', style: { alignItems: 'center' } },
      h('div', { class: 'row gap-3', style: { alignItems: 'center' } },
        Avatar({ accent: 'var(--c-gold)', size: 42 }),
        h('div', {},
          h('div', { class: 'title', style: { fontSize: '18px' } }, username ?? 'Joueur'),
          h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)' } }, 'Profil du joueur'))),
      h('span', { style: { cursor: 'pointer', fontSize: '18px', color: 'var(--c-text-mute)', padding: '4px 8px' }, onClick: () => backdrop.remove() }, '✕')),
    tabsRow,
    bodyEl);

  const backdrop = h('div', {
    class: 'center', style: { position: 'fixed', inset: '0', zIndex: '60', background: 'rgba(3,6,12,.72)', backdropFilter: 'blur(5px)', padding: '24px' },
    onClick: (e: Event) => { if (e.target === backdrop) backdrop.remove(); },
  }, modal);

  renderTabs();
  document.body.append(backdrop);

  api.getUserProfile(userId)
    .then(({ profile: p }) => {
      profile = p;
      // Mettre à jour le titre avec le vrai pseudo si besoin.
      (modal.querySelector('.title') as HTMLElement).textContent = p.username;
      renderBody();
    })
    .catch((e) => { clear(bodyEl); bodyEl.append(h('div', { class: 'text-mute', style: { fontSize: '12px' } }, `Impossible de charger : ${(e as Error).message}`)); });

  return backdrop;
}
