/* =============================================================================
 * PRESENTATION · components/TopBar.ts — Barre supérieure.
 * -----------------------------------------------------------------------------
 * Sobre en appels réseau : lit UNE seule fois le solde, le VIP et la session
 * active au montage. Le clic sur l'avatar ouvre le menu à partir de valeurs
 * DÉJÀ EN CACHE — aucun appel API n'est déclenché pour afficher le menu.
 *
 * Cleanup propre : les listeners globaux sont retirés quand le TopBar est
 * démonté (via `_cleanup` posé sur l'élément retourné). Le router appelle ce
 * cleanup avant de remplacer l'écran → aucune fuite, aucun appel dupliqué.
 * ========================================================================== */
import { h } from '../../core/dom';
import { Robot } from './ui';
import { readWallet, spendTokens } from '../../services/wallet';
import { api } from '../../data/ApiClient';
import { openProfileMenu } from './ProfileMenu';
import { openPlayerProfile } from './PlayerProfile';
import { VipService } from '../../services/ads';

/** Niveau dérivé du solde (démo) — 1 niveau par tranche de 500 ◆ débloquée. */
const levelOf = (balance: number) => Math.max(1, Math.floor(balance / 500) + 1);

export function TopBar(_mount: HTMLElement): HTMLElement {
  const coin = h('div', { class: 'coin', style: { cursor: 'pointer' }, title: 'Ouvrir mon porte-monnaie' }, '◆ 0');
  const level = h('span', { style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, 'Niv. 1');
  const robotAvatar = Robot({ size: 26, accent: 'var(--c-success)' });
  const vipCrown = h('span', { class: 'vip-crown', style: { display: 'none' }, title: 'Statut VIP actif' }, '⭐');
  const avatarWrap = h('div', { style: { position: 'relative', display: 'inline-flex' } }, robotAvatar, vipCrown);
  const profileCluster = h('div', {
    class: 'row gap-2', style: { padding: '4px 5px 4px 11px', background: 'rgba(16,21,31,.8)', border: '1px solid var(--c-line)', borderRadius: 'var(--r-pill)', cursor: 'pointer' },
    title: 'Mon profil',
  }, level, avatarWrap);

  const liveChip = h('div', {
    class: 'live-chip', title: 'Partie en cours — cliquer pour reprendre',
    style: { display: 'none', cursor: 'pointer' },
    onClick: () => { const id = liveChip.dataset.tableId; if (id) location.hash = `#/table?online=${id}`; },
  },
    h('span', { class: 'live-chip__dot' }),
    h('span', { class: 'live-chip__label' }, 'LIVE'));

  // ── État local du TopBar (source pour l'affichage — pas de re-fetch au clic) ─
  const vipService = new VipService(api, (amount, kind) => spendTokens(amount, kind));
  let vipCache: { isVip: boolean; expiresAt: string | null } = { isVip: false, expiresAt: null };
  let meCache: { id: string; username: string } | null = null;

  const applyWallet = (balance: number, canClaim: boolean) => {
    coin.textContent = `◆ ${balance.toLocaleString('fr-FR')}`;
    coin.style.opacity = canClaim ? '1' : '.82';
    level.textContent = `Niv. ${levelOf(balance)}`;
  };
  const applyVip = () => { vipCrown.style.display = vipCache.isVip ? 'inline-flex' : 'none'; };

  const refreshWallet = async () => {
    try { const s = await readWallet(); applyWallet(s.balance, s.canClaim); } catch { /* offline */ }
  };
  const refreshVip = async () => {
    try {
      const s = await vipService.status();
      vipCache = { isVip: s.isVip, expiresAt: s.expiresAt };
      applyVip();
    } catch { /* offline */ }
  };
  const refreshMe = async () => {
    try {
      const me = await api.me();
      const u = me.user as unknown as { id?: string; _id?: string; username?: string; activeSession?: string };
      const id = u.id ?? u._id;
      if (id && u.username) meCache = { id, username: u.username };
      if (u.activeSession) { liveChip.dataset.tableId = u.activeSession; liveChip.style.display = 'inline-flex'; }
      else { liveChip.style.display = 'none'; }
    } catch { /* offline */ }
  };

  // Montage : UN appel de chaque, en parallèle. C'est tout.
  void refreshWallet();
  void refreshVip();
  void refreshMe();

  // Le porte-monnaie et le VIP peuvent changer depuis d'AUTRES écrans (achat,
  // pub récompensée, code promo). Ces écrans émettent un événement dédié —
  // le TopBar écoute et rafraîchit UNIQUEMENT quand un vrai changement s'est
  // produit, jamais pour un simple changement d'écran.
  const onWalletChanged = () => { void refreshWallet(); };
  const onVipChanged = () => { void refreshVip(); };
  window.addEventListener('kb:wallet-changed', onWalletChanged);
  window.addEventListener('kb:vip-changed', onVipChanged);

  // ── Interactions ────────────────────────────────────────────────────────────
  coin.addEventListener('click', () => { location.hash = '#/wallet'; });

  // Le clic sur l'avatar/niveau OUVRE le menu à partir du cache — AUCUN call API.
  profileCluster.addEventListener('click', () => {
    openProfileMenu(profileCluster, [
      { icon: 'person', label: vipCache.isVip ? 'Mon profil ⭐' : 'Mon profil', onClick: () => {
        const open = () => {
          if (!meCache) return;
          document.body.append(openPlayerProfile(api, meCache.id, meCache.username, vipCache));
        };
        // meCache est déjà rempli au montage. Si le fetch n'est pas encore
        // terminé (< 200ms d'ouverture), on tolère un unique refresh — sinon
        // rien du tout.
        if (meCache) open();
        else void refreshMe().then(open);
      } },
      { icon: 'wallet', label: 'Mon porte-monnaie', onClick: () => { location.hash = '#/wallet'; } },
      { icon: 'logout', label: 'Déconnexion', danger: true, onClick: () => { api.setToken(null); location.hash = '#/login'; location.reload(); } },
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

  // Cleanup posé sur l'élément retourné — le router l'appellera avant de
  // détruire l'écran (voir `main.tsx` → `outgoing._cleanup?.()`).
  bar._cleanup = () => {
    window.removeEventListener('kb:wallet-changed', onWalletChanged);
    window.removeEventListener('kb:vip-changed', onVipChanged);
  };

  return bar;
}

/** Utilitaires à appeler depuis les écrans qui MODIFIENT le porte-monnaie/VIP. */
export function notifyWalletChanged(): void { window.dispatchEvent(new Event('kb:wallet-changed')); }
export function notifyVipChanged(): void { window.dispatchEvent(new Event('kb:vip-changed')); }
