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
import { h, clear } from '../../core/dom';
import { openProfileMenu } from './ProfileMenu';
import { openPlayerProfile } from './PlayerProfile';
import { RobotMascot } from './RobotMascot';
import { api } from '../../data/ApiClient';
import { playerFace } from '../../data/PlayerAvatarCatalog';
import type { SessionCache, SessionProfile } from '../../data/SessionCache';
import type { EventBus } from '../../core/EventBus';

/** Initiales du joueur : prénom + nom si présents, sinon 2 lettres du pseudo. */
function initialsOf(p: SessionProfile | null): string {
  const fn = (p?.firstName ?? '').trim();
  const ln = (p?.lastName ?? '').trim();
  if (fn || ln) return ((fn[0] ?? '') + (ln[0] ?? '')).toUpperCase() || '?';
  return (p?.username ?? '?').trim().slice(0, 2).toUpperCase() || '?';
}

export function TopBar(session: SessionCache, bus: EventBus): HTMLElement {
  const coin = h('div', { class: 'coin', style: { cursor: 'pointer' }, title: 'Ouvrir mon porte-monnaie' }, '◆ 0');
  // Identité : initiales + niveau réel (modèle Kýdos), à la place de l'ancien « Niv. n ».
  const initials = h('span', { class: 'player-initials', style: { fontSize: '12px', fontWeight: '700', color: 'var(--c-text)' } }, '—');
  const level = h('span', { style: { fontSize: '10px', color: 'var(--c-text-soft)' } }, 'Niv 1');
  const identity = h('div', { class: 'col', style: { alignItems: 'flex-end', lineHeight: '1.1' } }, initials, level);
  // Logo joueur (mascotte paramétrique) dans un cadre — doré si VIP.
  const logoSlot = h('div', { class: 'player-logo', style: { display: 'inline-flex', lineHeight: '0' } });
  const avatarWrap = h('div', { class: 'player-logo-frame', style: { position: 'relative', display: 'inline-flex', borderRadius: '50%', padding: '2px' } }, logoSlot);
  const renderLogo = () => { clear(logoSlot); logoSlot.append(RobotMascot(playerFace(session.profile?.avatarId), 26)); };
  renderLogo();
  const profileCluster = h('div', {
    class: 'row gap-2', style: { padding: '4px 5px 4px 11px', background: 'rgba(16,21,31,.8)', border: '1px solid var(--c-line)', borderRadius: 'var(--r-pill)', cursor: 'pointer', alignItems: 'center' },
    title: 'Mon profil',
  }, identity, avatarWrap);

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
  };
  const paintIdentity = () => {
    const p = session.profile;
    initials.textContent = initialsOf(p);
    level.textContent = `Niv ${p?.level ?? 1}`;
    renderLogo();
  };
  // VIP : cadre DORÉ autour du logo (avantage visible durant la période VIP).
  const paintVip = () => {
    const vip = session.isVip;
    avatarWrap.classList.toggle('vip-frame', vip);
    avatarWrap.style.boxShadow = vip ? '0 0 0 2px #f0c46a, 0 0 10px rgba(240,196,106,.55)' : 'none';
    avatarWrap.style.background = vip ? 'radial-gradient(circle at 50% 30%, rgba(240,196,106,.35), transparent 70%)' : 'transparent';
    avatarWrap.title = vip ? 'Membre VIP ⭐' : '';
  };

  // Premier rendu immédiat depuis le cache (déjà hydraté au bootstrap).
  paintWallet();
  paintIdentity();
  paintVip();
  paintLive();

  // ── Abonnements aux changements de session (aucun polling) ────────────────
  const offWallet = bus.on('session:wallet', () => paintWallet());
  const offVip = bus.on('session:vip', () => paintVip());
  const offProfile = bus.on('session:profile', () => { paintIdentity(); paintLive(); });

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
      { icon: 'settings', label: 'Réglages du profil', onClick: () => { location.hash = '#/profile-settings'; } },
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
