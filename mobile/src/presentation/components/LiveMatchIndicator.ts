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

  // current = { kind: 'match', match } | { kind: 'tournament', active }
  let current: any = null;

  const rejoin = async () => {
    if (!current) return;
    // v16 — engagement TOURNOI (match en cours ou attente) → salle d'attente
    // qui dispatche (rejoindre la table / regarder l'autre match).
    if (current.kind === 'tournament') { router.go('tournament-wait'); return; }
    const m = current.match;
    const format = m.format as string;
    if (format === 'duo_steel') { router.go(`matchmaking?format=${format}`); return; }
    try {
      const { tableId } = await api.provisionMatchLiveTable(m._id);
      router.go(`table?online=${tableId}`);
    } catch { router.go(`matchmaking?format=${format}`); }
  };

  /* ── Popup (v16) : timer + « Rejoindre » / « Fermer » ──────────────────── */
  let popupTicker: ReturnType<typeof setInterval> | null = null;
  const overlay = h('div', { style: {
    display: 'none', position: 'fixed', inset: '0', zIndex: '10000',
    background: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center', padding: '24px',
  } });
  const closePopup = () => {
    overlay.style.display = 'none'; overlay.innerHTML = '';
    if (popupTicker) { clearInterval(popupTicker); popupTicker = null; }
  };
  // « Fermer » ne fait QUE masquer le message (n'annule aucune partie).
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });

  const openPopup = () => {
    overlay.innerHTML = '';
    if (popupTicker) { clearInterval(popupTicker); popupTicker = null; }
    const isTournament = current?.kind === 'tournament';
    const a = isTournament ? current.active : null;
    const title = isTournament ? `Tournoi${a?.roundLabel ? ' · ' + a.roundLabel : ''}` : 'Match rapide en cours';
    const subtitle = isTournament
      ? (a?.state === 'waiting' ? 'Votre adversaire se qualifie…' : a?.state === 'pending' ? 'Votre match démarre bientôt.' : 'Votre match est en cours.')
      : 'Rejoignez votre table de match.';

    const timer = h('div', { class: 'mono', style: { fontSize: '38px', fontWeight: '800', color: 'var(--c-gold)', textAlign: 'center', margin: '6px 0' } });
    const showTimer = isTournament && a?.state === 'pending' && a?.startsAt;
    if (showTimer) {
      const paint = () => {
        const left = Math.max(0, Math.ceil((new Date(a.startsAt).getTime() - Date.now()) / 1000));
        timer.textContent = left > 0 ? String(left) : 'GO';
      };
      paint(); popupTicker = setInterval(paint, 1000);
    }

    const card = h('div', { style: {
      width: '100%', maxWidth: '320px', background: '#0d1626', borderRadius: 'var(--r-lg)',
      border: '1px solid rgba(230,196,106,.35)', padding: '20px', boxShadow: '0 12px 40px rgba(0,0,0,.5)',
    } },
      h('div', { class: 'row gap-2', style: { alignItems: 'center', justifyContent: 'center' } },
        h('span', { class: 'live-chip__dot' }),
        h('div', { class: 'title', style: { fontSize: '16px', color: '#fff' } }, title)),
      showTimer ? timer : h('div', { style: { height: '8px' } }),
      h('div', { style: { fontSize: '12px', color: 'var(--c-text-mute)', textAlign: 'center', marginBottom: '16px' } }, subtitle),
      h('div', { class: 'row gap-2' },
        h('button', { class: 'btn', style: { flex: '1', background: 'var(--c-gold)', color: '#1a0f00', fontWeight: '700' },
          onClick: () => { closePopup(); void rejoin(); } }, '▶ Rejoindre'),
        h('button', { class: 'btn btn--ghost', style: { flex: '1' }, onClick: () => closePopup() }, 'Fermer')),
    );
    overlay.append(card);
    overlay.style.display = 'flex';
  };
  chip.addEventListener('click', () => openPopup());

  const refresh = async () => {
    // Masquée sur les écrans de jeu / login.
    const screen = (store as any)?.state?.screen as string | undefined;
    if (screen && HIDDEN_SCREENS.has(screen)) { chip.style.display = 'none'; return; }
    if (!api.isAuthenticated()) { chip.style.display = 'none'; current = null; return; }
    try {
      // Priorité au match rapide en cours ; sinon engagement tournoi.
      const { match } = await api.getMyMatch();
      const m = match as any | null;
      if (m && (m.status === 'running' || m.status === 'pairing')) {
        current = { kind: 'match', match: m };
        chip.style.display = 'inline-flex';
        return;
      }
      const { active } = await api.getMyTournament();
      if (active && (active.state === 'playing' || active.state === 'waiting' || active.state === 'pending')) {
        current = { kind: 'tournament', active };
        chip.style.display = 'inline-flex';
        return;
      }
      current = null;
      chip.style.display = 'none';
    } catch { /* transitoire : on garde l'état courant */ }
  };

  document.body.appendChild(chip);
  document.body.appendChild(overlay);
  void refresh();
  setInterval(() => void refresh(), 5000);
}
