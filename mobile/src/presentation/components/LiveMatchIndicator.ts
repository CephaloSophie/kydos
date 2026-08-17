/* =============================================================================
 * PRESENTATION · components/LiveMatchIndicator.ts (v14.14)
 * -----------------------------------------------------------------------------
 * Pastille « LIVE » flottante, en haut à gauche et au premier plan, affichée
 * sur TOUTES les pages dès que le joueur a un match de compétition/tournoi en
 * cours (statut running ou pairing) — quel que soit le format (Duo, Alliance
 * hybride, Carrée royale). Un tap rejoint la partie instantanément.
 *
 * Montée UNE SEULE FOIS au démarrage (hors du viewport routeur), elle survit
 * aux changements d'écran. Masquée sur les écrans de jeu (table/online) et de
 * connexion pour ne pas gêner. Poll léger toutes les 5 s.
 * ========================================================================== */
import { h } from '../../core/dom';
import type { AppContext } from '../context';

const HIDDEN_SCREENS = new Set(['table', 'online', 'login']);

export function mountLiveMatchIndicator(ctx: AppContext): void {
  const { api, router, store } = ctx;

  const dot = h('span', { style: {
    width: '9px', height: '9px', borderRadius: '50%', background: '#e89644',
    boxShadow: '0 0 10px #e89644, 0 0 4px #e89644', animation: 'pulse 1.4s ease-in-out infinite', flexShrink: '0',
  } });
  const label = h('span', { class: 'mono', style: { fontSize: '10px', fontWeight: '700', letterSpacing: '.06em', color: '#fff' } }, 'LIVE');

  const chip = h('button', {
    style: {
      display: 'none', alignItems: 'center', gap: '7px',
      position: 'fixed', top: '10px', left: '10px', zIndex: '9999',
      padding: '7px 12px', borderRadius: '999px', border: '1px solid rgba(232,150,68,.55)',
      background: 'linear-gradient(90deg, rgba(232,150,68,.9), rgba(176,56,74,.9))',
      boxShadow: '0 4px 16px rgba(0,0,0,.4)', cursor: 'pointer', color: '#fff',
    },
  }, dot, label) as HTMLButtonElement;

  let current: any = null;

  const rejoin = async () => {
    const m = current;
    if (!m) return;
    const format = m.format as string;
    if (format === 'duo_steel') { router.go(`matchmaking?format=${format}`); return; }
    try {
      const { tableId } = await api.provisionMatchLiveTable(m._id);
      router.go(`table?online=${tableId}`);
    } catch { router.go(`matchmaking?format=${format}`); }
  };
  chip.addEventListener('click', () => void rejoin());

  const refresh = async () => {
    // Masquée sur les écrans de jeu / login.
    const screen = (store as any)?.state?.screen as string | undefined;
    if (screen && HIDDEN_SCREENS.has(screen)) { chip.style.display = 'none'; return; }
    if (!api.isAuthenticated()) { chip.style.display = 'none'; current = null; return; }
    try {
      const { match } = await api.getMyMatch();
      const m = match as any | null;
      const live = m && (m.status === 'running' || m.status === 'pairing');
      current = live ? m : null;
      chip.style.display = live ? 'inline-flex' : 'none';
    } catch { /* transitoire : on garde l'état courant */ }
  };

  document.body.appendChild(chip);
  void refresh();
  setInterval(() => void refresh(), 5000);
}
