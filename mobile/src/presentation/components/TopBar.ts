/* =============================================================================
 * PRESENTATION · components/TopBar.ts — Barre supérieure.
 * -----------------------------------------------------------------------------
 * Lit TOUT depuis le SessionCache (synchrone, aucun appel réseau). Le solde, le
 * niveau, le VIP et l'identité viennent du cache déjà chargé au bootstrap.
 *
 * Rafraîchissement : le TopBar s'abonne aux événements `session:wallet`,
 * `session:vip` et `session:profile` émis par le SessionCache quand une donnée
 * change réellement (achat, récompense…). Il ne POLL jamais, ne refetch jamais
 * au montage ni au clic. Le menu profil s'ouvre entièrement depuis le cache.
 *
 * Cleanup : les abonnements bus sont retirés au démontage via `_cleanup`.
 * ========================================================================== */
import { h } from '../../core/dom';
import { Robot } from './ui';
import { openProfileMenu } from './ProfileMenu';
import { openPlayerProfile } from './PlayerProfile';
import { api } from '../../data/ApiClient';
import type { SessionCache } from '../../data/SessionCache';
import type { EventBus } from '../../core/EventBus';

/** Niveau dérivé du solde (démo) — 1 niveau par tranche de 500 ◆ débloquée. */
const levelOf = (balance: number) => Math.max(1, Math.floor(balance / 500) + 1);

export function TopBar(session: SessionCache, bus: EventBus): HTMLElement {
  const coin = h('div', { class: 'coin', style: { cursor: 'pointer' }, title: 'Ouvrir mon porte-monnaie' }, '◆ 0');
  const level = h('span', { style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, 'Niv. 1');
  const robotAvatar = Robot({ size: 26, accent: 'var(--c-success)' });
  const vipCrown = h('span', { class: 'vip-crown', style: { display: 'none' }, title: 'Statut VIP actif' }, '⭐');
  const avatarWrap = h('div', { style: { position: 'relative', display: 'inline-flex' } }, robotAvatar, vipCrown);
  const profileCluster = h('div', {
    class: 'row gap-2', style: { padding: '4px 5px 4px 11px', background: 'rgba(16,21,31,.8)', border: '1px solid var(--c-line)', borderRadius: 'var(--r-pill)', cursor: 'pointer' },
    title: 'Mon profil',
  }, level, avatarWrap);

  // Pastille LIVE — reprise d'une partie en ligne en cours. Cliquable pour
  // rejoindre. Alimentée par session.profile.activeSession (aucun appel réseau).
  const liveChip = h('div', {
    class: 'live-chip', title: 'Partie en cours — cliquer pour reprendre',
    style: { display: 'none', cursor: 'pointer' },
    onClick: () => { const id = liveChip.dataset.tableId; if (id) location.hash = `#/table?online=${id}`; },
  },
    h('span', { class: 'live-chip__dot' }),
    h('span', { class: 'live-chip__label' }, 'LIVE'));

  const paintLive = () => {
    const active = session.profile?.activeSession;
    if (active) { liveChip.dataset.tableId = active; liveChip.style.display = 'inline-flex'; }
    else liveChip.style.display = 'none';
  };

  // ── Rendu depuis le cache (synchrone) ─────────────────────────────────────
  const paintWallet = () => {
    const w = session.wallet;
    const balance = w?.balance ?? 0;
    coin.textContent = `◆ ${balance.toLocaleString('fr-FR')}`;
    coin.style.opacity = w?.canClaimToday ? '1' : '.82';
    level.textContent = `Niv. ${levelOf(balance)}`;
  };
  const paintVip = () => { vipCrown.style.display = session.isVip ? 'inline-flex' : 'none'; };

  // Premier rendu immédiat depuis le cache (déjà hydraté au bootstrap).
  paintWallet();
  paintVip();
  paintLive();

  // ── Abonnements aux changements de session (aucun polling) ────────────────
  const offWallet = bus.on('session:wallet', () => paintWallet());
  const offVip = bus.on('session:vip', () => paintVip());
  const offProfile = bus.on('session:profile', () => paintLive());

  // ── Interactions ──────────────────────────────────────────────────────────
  coin.addEventListener('click', () => { location.hash = '#/wallet'; });

  // Menu profil ouvert ENTIÈREMENT depuis le cache — aucun appel réseau.
  profileCluster.addEventListener('click', () => {
    const vipCache = session.vip;
    openProfileMenu(profileCluster, [
      { icon: 'person', label: session.isVip ? 'Mon profil ⭐' : 'Mon profil', onClick: () => {
        const p = session.profile;
        if (p) document.body.append(openPlayerProfile(api, p.id, p.username, { isVip: session.isVip, expiresAt: vipCache.expiresAt }));
      } },
      { icon: 'wallet', label: 'Mon porte-monnaie', onClick: () => { location.hash = '#/wallet'; } },
      { icon: 'logout', label: 'Déconnexion', danger: true, onClick: () => { session.clear(); api.setToken(null); location.hash = '#/login'; location.reload(); } },
    ]);
  });

  const bar = h('div', { class: 'topbar' },
    h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
      h('div', { class: 'brand' },
        h('span', { class: 'brand__name', style: { fontSize: '20px' } }, 'Kýdos'),
        h('span', { class: 'brand__sub' }, 'BELOTE')),
      liveChip),
    h('div', { class: 'row gap-2' },
      coin,
      profileCluster),
  ) as HTMLElement & { _cleanup?: () => void };

  bar._cleanup = () => { offWallet(); offVip(); offProfile(); };
  return bar;
}
