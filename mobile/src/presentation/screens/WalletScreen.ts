/* =============================================================================
 * PRESENTATION · screens/WalletScreen.ts
 * -----------------------------------------------------------------------------
 * Porte-monnaie de l'utilisateur : solde, réclamation quotidienne, journal des
 * transactions récentes (crédits/débits) — issus du VRAI serveur. Fallback
 * hors-ligne géré par `services/wallet.ts` (transparent pour l'utilisateur).
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button, Badge, Dialog } from '../components/ui';
import { api, type ServerWalletTransaction } from '../../data/ApiClient';
import { claimDaily, readWallet } from '../../services/wallet';
import type { AppContext } from '../context';

const KIND_LABELS: Record<ServerWalletTransaction['kind'], string> = {
  daily: 'Récompense quotidienne',
  game_stake: 'Mise de partie',
  game_win: 'Gain de partie',
  refund: 'Remboursement',
};

const KIND_COLORS: Record<ServerWalletTransaction['kind'], string> = {
  daily: 'var(--c-gold)',
  game_stake: 'var(--c-danger)',
  game_win: 'var(--c-success)',
  refund: 'var(--c-text-soft)',
};

export function WalletScreen(ctx: AppContext): HTMLElement {
  const { router } = ctx;

  const balanceEl = h('div', { class: 'title', style: { fontSize: '48px', color: 'var(--c-gold)', margin: '4px 0' } }, '◆ …');
  const dailyStateEl = h('div', { class: 'text-mute', style: { fontSize: '12px', marginTop: '4px' } }, 'Chargement…');
  const claimBtn = Button('Débloquer +500 ◆', { onClick: onClaim });
  const historyEl = h('div', { class: 'col gap-2', style: { marginTop: '12px' } }, h('div', { class: 'text-mute', style: { fontSize: '11px' } }, '…'));

  async function refresh() {
    const w = await readWallet();
    balanceEl.textContent = `◆ ${w.balance.toLocaleString('fr-FR')}`;
    dailyStateEl.textContent = w.canClaim
      ? 'Votre récompense quotidienne de 500 ◆ est disponible.'
      : 'Récompense déjà réclamée aujourd\'hui — revenez demain.';
    (claimBtn as HTMLButtonElement).disabled = !w.canClaim;
    // Journal des transactions (si serveur disponible).
    if (api.isAuthenticated()) {
      try {
        const full = await api.wallet();
        renderHistory(full.transactions);
      } catch { renderHistory([]); }
    } else {
      renderHistory([]);
    }
  }

  function renderHistory(txs: ServerWalletTransaction[]) {
    clear(historyEl);
    if (!txs.length) { historyEl.append(h('div', { class: 'text-mute', style: { fontSize: '11px' } }, 'Aucune transaction enregistrée.')); return; }
    for (const tx of [...txs].reverse().slice(0, 15)) {
      const at = new Date(tx.at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      const amountStr = tx.amount > 0 ? `+${tx.amount}` : String(tx.amount);
      historyEl.append(h('div', {
        class: 'row gap-3', style: { padding: '8px 12px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)' },
      },
        h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', width: '92px' } }, at),
        h('span', { class: 'fill', style: { fontSize: '12px' } }, KIND_LABELS[tx.kind]),
        h('span', { class: 'mono', style: { fontSize: '12px', color: KIND_COLORS[tx.kind] } }, amountStr, ' ◆'),
        h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)' } }, `→ ${tx.balance}`),
      ));
    }
  }

  async function onClaim() {
    const res = await claimDaily();
    await refresh();
    if (res.claimed) {
      const dlg = Dialog({
        icon: '◆', title: '+500 jetons !',
        body: 'Votre récompense quotidienne est créditée. Revenez demain pour la prochaine.',
        actions: [Button('Parfait', { size: 'sm', onClick: () => dlg.remove() })],
        onClose: () => dlg.remove(),
      });
      root.append(dlg);
    }
  }

  void refresh();

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'ÉCONOMIE'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Mon porte-monnaie')),
      Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') })),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
      h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'SOLDE'),
        balanceEl,
        dailyStateEl,
        h('div', { style: { marginTop: '12px' } }, claimBtn)),
      h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'BARÈME'),
        h('div', { class: 'col gap-2', style: { marginTop: '6px', fontSize: '12px', color: 'var(--c-text-soft)' } },
          h('div', {}, Badge('Quotidien', 'gold'), ' 500 ◆ par jour à débloquer.'),
          h('div', {}, Badge('4H', 'neutral'), ' Mise 100 ◆ · gain 150 ◆ par gagnant.'),
          h('div', {}, Badge('2H+2R', 'neutral'), ' Mise 150 ◆ · gain 225 ◆ pour l\'humain gagnant.'),
          h('div', {}, Badge('4R', 'neutral'), ' Mise 50 ◆ / robot · gain 150 ◆ par robot gagnant.'),
          h('div', { class: 'text-mute', style: { fontSize: '10px', marginTop: '6px' } }, 'Le mode entraînement (local) est gratuit.')))),
    h('div', { class: 'card', style: { marginTop: '12px' } },
      h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, 'HISTORIQUE'),
      historyEl),
  );
  return root;
}
