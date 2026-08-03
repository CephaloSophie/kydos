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
import { formatPromoCode, digitsOnly, isCompleteCode } from '../../services/promoCode';
import { VIP_PLANS, type VipPlan } from '../../services/ads';
import { toast } from '../components/feedback';
import type { AppContext } from '../context';

const KIND_LABELS: Record<ServerWalletTransaction['kind'], string> = {
  daily: 'Récompense quotidienne',
  game_stake: 'Mise de partie',
  game_win: 'Gain de partie',
  refund: 'Remboursement',
  promo: 'Code promo',
};

const KIND_COLORS: Record<ServerWalletTransaction['kind'], string> = {
  daily: 'var(--c-gold)',
  game_stake: 'var(--c-danger)',
  game_win: 'var(--c-success)',
  refund: 'var(--c-text-soft)',
  promo: 'var(--c-success)',
};

export function WalletScreen(ctx: AppContext): HTMLElement {
  const { router, ads, vip } = ctx;

  const balanceEl = h('div', { class: 'title', style: { fontSize: '48px', color: 'var(--c-gold)', margin: '4px 0' } }, '◆ …');
  const dailyStateEl = h('div', { class: 'text-mute', style: { fontSize: '12px', marginTop: '4px' } }, 'Chargement…');
  const claimBtn = Button('Débloquer +500 ◆', { onClick: onClaim });
  const rewardBtn = Button('🎬 Regarder une pub (+100 ◆)', { variant: 'secondary', onClick: onWatchReward });
  // Champ code promo : affichage formaté (tiret tous les 4 chiffres), valeur
  // envoyée = chiffres seuls. Le formatage est purement présentationnel.
  const promoInput = h('input', {
    type: 'text', inputmode: 'numeric', placeholder: '1234-5678-9012', maxlength: '14',
    class: 'input', style: { fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textAlign: 'center' },
  }) as HTMLInputElement;
  promoInput.addEventListener('input', () => {
    const caretEnd = promoInput.selectionStart === promoInput.value.length;
    promoInput.value = formatPromoCode(promoInput.value);
    if (caretEnd) promoInput.setSelectionRange(promoInput.value.length, promoInput.value.length);
    (promoBtn as HTMLButtonElement).disabled = !isCompleteCode(promoInput.value);
  });
  const promoBtn = Button('Valider le code', { onClick: onRedeemPromo });
  (promoBtn as HTMLButtonElement).disabled = true;
  const vipStateEl = h('div', { class: 'text-mute', style: { fontSize: '12px', marginBottom: '8px' } }, 'Chargement…');
  const vipPlansEl = h('div', { class: 'col gap-2' });
  const historyEl = h('div', { class: 'col gap-2', style: { marginTop: '12px' } }, h('div', { class: 'text-mute', style: { fontSize: '11px' } }, '…'));

  async function refresh() {
    const w = await readWallet();
    balanceEl.textContent = `◆ ${w.balance.toLocaleString('fr-FR')}`;
    dailyStateEl.textContent = w.canClaim
      ? 'Votre récompense quotidienne de 500 ◆ est disponible.'
      : 'Récompense déjà réclamée aujourd\'hui — revenez demain.';
    (claimBtn as HTMLButtonElement).disabled = !w.canClaim;
    await refreshVip();
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

  async function refreshVip() {
    const s = await vip.status();
    vipStateEl.textContent = s.isVip && s.expiresAt
      ? `\u2b50 Statut VIP actif jusqu'au ${new Date(s.expiresAt).toLocaleDateString('fr-FR')} \u2014 aucune publicit\u00e9.`
      : 'Vous n\u2019\u00eates pas VIP. Passez VIP pour supprimer toutes les publicit\u00e9s.';
    clear(vipPlansEl);
    for (const plan of VIP_PLANS) {
      vipPlansEl.append(h('div', { class: 'between', style: { padding: '8px 12px', borderRadius: 'var(--r-lg)', background: 'var(--c-veil-04)', border: '1px solid var(--c-line)' } },
        h('div', {}, h('span', { style: { fontSize: '13px', fontWeight: '700' } }, plan.label),
          h('span', { class: 'text-mute', style: { fontSize: '11px', marginLeft: '8px' } }, `${plan.costTokens.toLocaleString('fr-FR')} \u25c6`)),
        Button('Choisir', { size: 'sm', onClick: () => onBuyVip(plan) })));
    }
  }

  async function onRedeemPromo() {
    const code = digitsOnly(promoInput.value);
    if (!isCompleteCode(code)) { toast('Code incomplet (12 chiffres).', 'error'); return; }
    if (!api.isAuthenticated()) { toast('Connectez-vous pour utiliser un code.', 'error'); return; }
    (promoBtn as HTMLButtonElement).disabled = true;
    try {
      const r = await api.redeemPromo(code);
      promoInput.value = '';
      await refresh();
      toast(`+${r.tokens.toLocaleString('fr-FR')} \u25c6 cr\u00e9dit\u00e9s !`, 'success');
    } catch (e) {
      toast((e as Error).message || 'Code refus\u00e9.', 'error');
      (promoBtn as HTMLButtonElement).disabled = false;
    }
  }

  async function onWatchReward() {
    const r = await ads.watchRewarded();
    await refresh();
    if (r.rewarded) { toast(`+${r.amount} \u25c6 cr\u00e9dit\u00e9s !`, 'success'); return; }
    // Message adapté à la raison du refus (aide au diagnostic).
    const reason = r.reason ?? 'error';
    const msg = reason === 'not-native' ? 'Les pubs ne s\u2019affichent que sur device natif.'
      : reason === 'plugin-missing' ? 'Plugin AdMob non install\u00e9 sur ce device.'
      : reason === 'unavailable' ? 'Pub indisponible \u2014 r\u00e9essayez dans quelques secondes.'
      : reason === 'cancelled' ? 'Pub interrompue \u2014 regardez-la enti\u00e8rement pour la r\u00e9compense.'
      : 'Impossible de charger la pub \u2014 v\u00e9rifiez votre connexion.';
    toast(msg, 'error');
  }

  async function onBuyVip(plan: VipPlan) {
    const w = await readWallet();
    if (w.balance < plan.costTokens) { toast(`Solde insuffisant (${plan.costTokens.toLocaleString('fr-FR')} \u25c6 requis).`, 'error'); return; }
    const dlg = Dialog({
      icon: '\u2b50', title: `Passer VIP \u2014 ${plan.label}`,
      body: `Confirmer l'achat pour ${plan.costTokens.toLocaleString('fr-FR')} \u25c6 ? Aucune publicit\u00e9 pendant ${plan.label}.`,
      actions: [
        Button('Annuler', { variant: 'secondary', size: 'sm', onClick: () => dlg.remove() }),
        Button('Confirmer', { size: 'sm', onClick: async () => {
          dlg.remove();
          await vip.purchase(plan.id);
          await refresh();
          toast(`\u2b50 Vous \u00eates VIP pour ${plan.label} !`, 'success');
        } }),
      ],
      onClose: () => dlg.remove(),
    });
    root.append(dlg);
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
        h('div', { class: 'col gap-2', style: { marginTop: '12px' } }, claimBtn, rewardBtn)),
      h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'BARÈME'),
        h('div', { class: 'col gap-2', style: { marginTop: '6px', fontSize: '12px', color: 'var(--c-text-soft)' } },
          h('div', {}, Badge('Quotidien', 'gold'), ' 500 ◆ par jour à débloquer.'),
          h('div', {}, Badge('4H', 'neutral'), ' Mise 100 ◆ · gain 150 ◆ par gagnant.'),
          h('div', {}, Badge('2H+2R', 'neutral'), ' Mise 150 ◆ · gain 225 ◆ pour l\'humain gagnant.'),
          h('div', {}, Badge('4R', 'neutral'), ' Mise 50 ◆ / robot · gain 150 ◆ par robot gagnant.'),
          h('div', { class: 'text-mute', style: { fontSize: '10px', marginTop: '6px' } }, 'Le mode entraînement (local) est gratuit.')))),
    h('div', { class: 'card', style: { marginTop: '12px', border: '1px solid rgba(126,203,152,.3)' } },
      h('div', { class: 'eyebrow', style: { marginBottom: '6px', color: 'var(--c-success)' } }, '🎟 RECHARGER AVEC UN CODE'),
      h('div', { class: 'text-mute', style: { fontSize: '11px', marginBottom: '8px' } }, 'Saisissez un code de 12 chiffres pour créditer des jetons.'),
      h('div', { class: 'col gap-2' }, promoInput, promoBtn)),
    h('div', { class: 'card', style: { marginTop: '12px', border: '1px solid rgba(230,196,106,.35)' } },
      h('div', { class: 'eyebrow', style: { marginBottom: '6px', color: 'var(--c-gold)' } }, '⭐ STATUT VIP — SANS PUBLICITÉ'),
      vipStateEl,
      vipPlansEl),
    h('div', { class: 'card', style: { marginTop: '12px' } },
      h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, 'HISTORIQUE'),
      historyEl),
  );
  return root;
}
