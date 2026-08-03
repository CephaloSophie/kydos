/* =============================================================================
 * PRESENTATION · components/TopBar.ts — Barre supérieure (marque + monnaie + niveau).
 * -----------------------------------------------------------------------------
 * Fidèle au design system (.topbar / .brand / .coin) et FONCTIONNELLE :
 * la pastille ◆ DÉBLOQUE les 500 jetons quotidiens au clic (crédit immédiat).
 * SERVEUR-PREMIER via `services/wallet.ts` (fallback local hors-ligne).
 * ========================================================================== */
import { h } from '../../core/dom';
import { Robot } from './ui';
import { readWallet } from '../../services/wallet';
import { api } from '../../data/ApiClient';
import { openProfileMenu } from './ProfileMenu';
import { openPlayerProfile } from './PlayerProfile';
import { VipService } from '../../services/ads';
import { spendTokens } from '../../services/wallet';

/** Niveau dérivé du solde (démo) — 1 niveau par tranche de 500 ◆ débloquée. */
const levelOf = (balance: number) => Math.max(1, Math.floor(balance / 500) + 1);

export function TopBar(mount: HTMLElement): HTMLElement {
  const coin = h('div', { class: 'coin', style: { cursor: 'pointer' }, title: 'Ouvrir mon porte-monnaie' }, '◆ 0');
  const level = h('span', { style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, 'Niv. 1');

  const paint = async () => {
    const state = await readWallet();
    coin.textContent = `◆ ${state.balance.toLocaleString('fr-FR')}`;
    // Léger rappel visuel si la récompense quotidienne est disponible.
    coin.style.opacity = state.canClaim ? '1' : '.82';
    level.textContent = `Niv. ${levelOf(state.balance)}`;
  };
  void paint();

  // Cliquer sur les jetons → page « Mon porte-monnaie » (déblocage quotidien,
  // code promo, VIP, pub récompensée y sont regroupés).
  coin.addEventListener('click', () => { location.hash = '#/wallet'; });

  // Indicateur « partie en cours » : pastille LIVE animée (style enregistrement)
  // à côté du logo. Masquée s'il n'y a pas de partie active. Cliquer reprend.
  const liveChip = h('div', {
    class: 'live-chip', title: 'Partie en cours — cliquer pour reprendre',
    style: { display: 'none', cursor: 'pointer' },
    onClick: () => { const id = liveChip.dataset.tableId; if (id) location.hash = `#/table?online=${id}`; },
  },
    h('span', { class: 'live-chip__dot' }),
    h('span', { class: 'live-chip__label' }, 'LIVE'));
  (async () => {
    try {
      const me = await api.me();
      const active = (me.user as unknown as { activeSession?: string }).activeSession;
      if (active) { liveChip.dataset.tableId = active; liveChip.style.display = 'inline-flex'; }
    } catch { /* hors-ligne : pas d'indicateur */ }
  })();

  // Le TopBar n'a pas accès au ctx : on instancie un VipService local (lit le
  // même stockage que l'instance principale). Suffisant pour connaître le VIP.
  const vipLocal = new VipService(api, (amount, kind) => spendTokens(amount, kind));

  // Bloc niveau + avatar : ouvre le menu profil (profil, déconnexion…).
  // L'avatar est enveloppé pour pouvoir afficher un badge couronne VIP par-dessus.
  const robotAvatar = Robot({ size: 26, accent: 'var(--c-success)' });
  const vipCrown = h('span', { class: 'vip-crown', style: { display: 'none' }, title: 'Statut VIP actif' }, '⭐');
  const avatarWrap = h('div', { style: { position: 'relative', display: 'inline-flex' } }, robotAvatar, vipCrown);

  const profileCluster = h('div', {
    class: 'row gap-2', style: { padding: '4px 5px 4px 11px', background: 'rgba(16,21,31,.8)', border: '1px solid var(--c-line)', borderRadius: 'var(--r-pill)', cursor: 'pointer' },
    title: 'Mon profil',
  },
    level,
    avatarWrap);

  // Refresh du badge VIP + du solde.
  const paintVip = async () => {
    const s = await vipLocal.status();
    vipCrown.style.display = s.isVip ? 'inline-flex' : 'none';
  };
  void paintVip();

  profileCluster.addEventListener('click', async () => {
    const vipStatus = await vipLocal.status();
    openProfileMenu(profileCluster, [
      { icon: 'person', label: vipStatus.isVip ? 'Mon profil ⭐' : 'Mon profil', onClick: async () => {
        try {
          const me = await api.me();
          const u = me.user as unknown as { id?: string; _id?: string; username?: string };
          const id = u.id ?? u._id;
          if (id) document.body.append(openPlayerProfile(api, id, u.username, { isVip: vipStatus.isVip, expiresAt: vipStatus.expiresAt }));
        } catch { /* hors-ligne */ }
      } },
      { icon: 'wallet', label: 'Mon porte-monnaie', onClick: () => { location.hash = '#/wallet'; } },
      { icon: 'logout', label: 'Déconnexion', danger: true, onClick: () => { api.setToken(null); location.hash = '#/login'; location.reload(); } },
    ]);
  });

  // Rafraîchit le badge VIP après un focus (revenu du wallet, achat éventuel).
  window.addEventListener('focus', () => { void paintVip(); void paint(); });

  return h('div', { class: 'topbar' },
    h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
      h('div', { class: 'brand' },
        h('span', { class: 'brand__name', style: { fontSize: '20px' } }, 'Kýdos'),
        h('span', { class: 'brand__sub' }, 'BELOTE')),
      liveChip),
    h('div', { class: 'row gap-2' },
      coin,
      profileCluster),
  );
}
