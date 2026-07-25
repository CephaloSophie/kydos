/* =============================================================================
 * PRESENTATION · components/TopBar.ts — Barre supérieure (marque + monnaie + niveau).
 * -----------------------------------------------------------------------------
 * Fidèle au design system (.topbar / .brand / .coin) et FONCTIONNELLE :
 * la pastille ◆ DÉBLOQUE les 500 jetons quotidiens au clic (crédit immédiat).
 * SERVEUR-PREMIER via `services/wallet.ts` (fallback local hors-ligne).
 * ========================================================================== */
import { h } from '../../core/dom';
import { Robot, Dialog, Button } from './ui';
import { readWallet, claimDaily } from '../../services/wallet';

/** Niveau dérivé du solde (démo) — 1 niveau par tranche de 500 ◆ débloquée. */
const levelOf = (balance: number) => Math.max(1, Math.floor(balance / 500) + 1);

export function TopBar(mount: HTMLElement): HTMLElement {
  const coin = h('div', { class: 'coin', style: { cursor: 'pointer' }, title: 'Débloquer les 500 jetons du jour' }, '◆ 0');
  const level = h('span', { style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, 'Niv. 1');

  const paint = async () => {
    const state = await readWallet();
    coin.textContent = `◆ ${state.balance.toLocaleString('fr-FR')}`;
    coin.style.opacity = state.canClaim ? '1' : '.72';
    level.textContent = `Niv. ${levelOf(state.balance)}`;
  };
  void paint();

  coin.addEventListener('click', async () => {
    const res = await claimDaily();
    await paint();
    if (res.claimed) {
      const dlg = Dialog({
        icon: '◆', title: '+500 jetons !',
        body: 'Votre récompense quotidienne est créditée. Revenez demain pour la prochaine.',
        actions: [Button('Parfait', { size: 'sm', onClick: () => dlg.remove() })],
        onClose: () => dlg.remove(),
      });
      mount.append(dlg);
    }
  });

  return h('div', { class: 'topbar' },
    h('div', { class: 'brand' },
      h('span', { class: 'brand__name', style: { fontSize: '20px' } }, 'Kýdos'),
      h('span', { class: 'brand__sub' }, 'BELOTE')),
    h('div', { class: 'row gap-2' },
      coin,
      h('div', { class: 'row gap-2', style: { padding: '4px 5px 4px 11px', background: 'rgba(16,21,31,.8)', border: '1px solid var(--c-line)', borderRadius: 'var(--r-pill)' } },
        level,
        Robot({ size: 26, accent: 'var(--c-success)' }))),
  );
}
