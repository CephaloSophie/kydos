/* =============================================================================
 * PRESENTATION · screens/MatchEnrollScreen.ts
 * -----------------------------------------------------------------------------
 * Écran d'inscription à un match rapide. Route : `enroll?format=X`.
 *
 * Selon le format :
 *   • DUO_STEEL       — choisir 2 robots (le duo qui joue en équipe).
 *   • HYBRID_ALLIANCE — choisir 1 robot COÉQUIPIER (joue avec le joueur en
 *                       équipe) + 1 robot REMPLAÇANT (prend la main si le
 *                       joueur quitte ou dépasse le temps).
 *   • ROYAL_SQUARE    — choisir 1 robot REMPLAÇANT (aucun robot ne joue avec,
 *                       il ne sert qu'à la substitution).
 *
 * En sortie : appel à api.enqueueMatch(format, robotIds) avec un tableau
 * ordonné : [coéquipier(s)..., remplaçant?]. Le serveur interprète selon le
 * format (voir matchmaking.service.ts).
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import type { AppContext } from '../context';
import type { ServerRobot } from '../../data/ApiClient';

interface FormatInfo {
  id: 'duo_steel' | 'hybrid_alliance' | 'royal_square';
  label: string;
  buyIn: number;
  prize: number;
  accent: string;
  /** Combien de robots co-équipiers (jouent effectivement en équipe avec le joueur). */
  teammates: number;
  /** Un remplaçant est-il attendu ? */
  hasSubstitute: boolean;
  /** Aide contextuelle. */
  helper: string;
}
const FORMATS: Record<string, FormatInfo> = {
  duo_steel: {
    id: 'duo_steel', label: 'Duo d\u2019acier', buyIn: 200, prize: 150, accent: '#3f6ea1',
    teammates: 2, hasSubstitute: false,
    helper: 'Choisissez les 2 robots de votre \u00e9quipe. Ils joueront ensemble.',
  },
  hybrid_alliance: {
    id: 'hybrid_alliance', label: 'Alliance hybride', buyIn: 150, prize: 225, accent: '#c99c3f',
    teammates: 1, hasSubstitute: true,
    helper: 'Choisissez votre co\u00e9quipier (joue avec vous) et un rempla\u00e7ant (prend la main si vous vous absentez).',
  },
  royal_square: {
    id: 'royal_square', label: 'Carr\u00e9e royale', buyIn: 100, prize: 150, accent: '#b0384a',
    teammates: 0, hasSubstitute: true,
    helper: 'Choisissez un robot rempla\u00e7ant. Il prendra la main si vous quittez la table.',
  },
};

export function MatchEnrollScreen(ctx: AppContext): HTMLElement {
  const { router, api, session } = ctx;
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const format = (params.get('format') ?? 'duo_steel');
  const variantId = params.get('variant') ?? undefined;   // v16 — variante précise
  const base = FORMATS[format] ?? FORMATS.duo_steel;
  // v16 — l'économie/le titre viennent de la variante (query), sinon du catalogue.
  const qBuyIn = Number(params.get('buyIn'));
  const qPrize = Number(params.get('prize'));
  const qLabel = params.get('label');
  const info = {
    ...base,
    buyIn: Number.isFinite(qBuyIn) && qBuyIn >= 0 ? qBuyIn : base.buyIn,
    prize: Number.isFinite(qPrize) && qPrize >= 0 ? qPrize : base.prize,
    label: qLabel ? decodeURIComponent(qLabel) : base.label,
  };

  // Sélections courantes : tableau des ids co-équipiers (dans l'ordre), + le
  // remplaçant à part. On concatène à l'enqueue.
  const teammates: (string | null)[] = new Array(info.teammates).fill(null);
  let substitute: string | null = null;

  const root = h('div', { class: 'anim-screen', style: {
    position: 'absolute', inset: '0', padding: '20px 26px 20px 62px', overflow: 'auto',
    background: 'radial-gradient(900px 500px at 50% 30%, #101b2f, #05070f 70%)',
  } }) as HTMLElement & { _cleanup?: () => void };

  // ── En-tête ────────────────────────────────────────────────────────────
  root.append(
    h('div', { class: 'between', style: { marginBottom: '14px' } },
      h('div', {},
        h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'INSCRIPTION'),
        h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '4px' } }, info.label)),
      Button('\u2190 Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go('compet') })),
    h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', marginBottom: '16px' } },
      info.helper),
    h('div', { class: 'row gap-3 mono', style: { fontSize: '11px', marginBottom: '16px' } },
      h('span', { style: { color: 'var(--c-text-soft)' } }, `Buy-in ${info.buyIn} \u25c6`),
      h('span', { style: { color: 'var(--c-gold)' } }, `Gain ${info.prize} \u25c6`)),
  );

  const robots = session.robots;

  if (robots.length === 0) {
    root.append(
      h('div', { class: 'card', style: { padding: '18px', textAlign: 'center' } },
        h('div', { style: { fontSize: '13px', color: 'var(--c-text-mute)' } }, 'Aucun robot dans votre \u00e9curie.'),
        h('div', { style: { marginTop: '10px' } }, Button('Cr\u00e9er un robot', { size: 'sm', onClick: () => router.go('create') }))));
    return root;
  }

  // ── Grille de robots sélectionnables ───────────────────────────────────
  const statusEl = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', minHeight: '14px', marginTop: '12px', textAlign: 'center' } });
  const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' } });

  /** Rôle actuellement affecté à un robot dans la sélection. */
  const roleOf = (id: string): 'teammate' | 'substitute' | null => {
    if (teammates.includes(id)) return 'teammate';
    if (substitute === id) return 'substitute';
    return null;
  };

  /** Cycle de rôles au clic : neutre → co-équipier → remplaçant → neutre. */
  const cycleRole = (r: ServerRobot) => {
    const role = roleOf(r.id);
    if (role === null) {
      // Neutre → co-équipier si slot libre, sinon remplaçant si libre.
      const freeSlot = teammates.indexOf(null);
      if (freeSlot >= 0) teammates[freeSlot] = r.id;
      else if (info.hasSubstitute && !substitute) substitute = r.id;
      else { statusEl.textContent = 'S\u00e9lection compl\u00e8te : d\u00e9s\u00e9lectionnez avant d\u2019en ajouter un autre.'; return; }
    } else if (role === 'teammate') {
      // Co-équipier → remplaçant si dispo, sinon neutre.
      const i = teammates.indexOf(r.id);
      teammates[i] = null;
      if (info.hasSubstitute && !substitute) substitute = r.id;
    } else {
      // Remplaçant → neutre.
      substitute = null;
    }
    statusEl.textContent = '';
    render();
  };

  const badgeFor = (r: ServerRobot) => {
    const role = roleOf(r.id);
    if (role === 'teammate') {
      const i = teammates.indexOf(r.id) + 1;
      const label = info.teammates > 1 ? `CO\u00c9QUIPIER ${i}` : 'CO\u00c9QUIPIER';
      return h('span', { class: 'mono', style: {
        fontSize: '9px', padding: '2px 8px', borderRadius: 'var(--r-pill)',
        background: 'rgba(126,203,152,.2)', color: 'var(--c-success)', border: '1px solid rgba(126,203,152,.4)',
      } }, label);
    }
    if (role === 'substitute') return h('span', { class: 'mono', style: {
      fontSize: '9px', padding: '2px 8px', borderRadius: 'var(--r-pill)',
      background: 'rgba(230,196,106,.2)', color: 'var(--c-gold)', border: '1px solid rgba(230,196,106,.4)',
    } }, 'REMPLAÇANT');
    return null;
  };

  const render = () => {
    clear(grid);
    for (const r of robots) {
      const role = roleOf(r.id);
      const selected = role !== null;
      const card = h('button', {
        onClick: () => cycleRole(r),
        style: {
          padding: '12px', borderRadius: 'var(--r-md)', textAlign: 'left', cursor: 'pointer',
          background: selected ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)',
          border: selected ? `2px solid ${role === 'teammate' ? '#7ecb98' : '#e6c46a'}` : '1px solid rgba(255,255,255,.08)',
          transition: 'transform .15s ease, border-color .15s ease',
        },
      },
        h('div', { class: 'between', style: { marginBottom: '6px' } },
          h('div', { class: 'title', style: { fontSize: '13px', color: 'var(--c-text)' } }, r.name),
          badgeFor(r) ?? h('span', {}, '')),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)' } },
          `agr ${r.personality?.aggressiveness ?? 5} · vitesse ${r.personality?.velocity ?? 5}`),
      );
      grid.append(card);
    }
    // Progression sélection
    const filled = teammates.filter(Boolean).length;
    const needSub = info.hasSubstitute && !substitute;
    const canSubmit = filled === info.teammates && !needSub;
    submitBtn.disabled = !canSubmit;
    (submitBtn as HTMLElement).style.opacity = canSubmit ? '1' : '.55';
    progress.textContent = `S\u00e9lection : ${filled}/${info.teammates} co\u00e9quipier(s)` + (info.hasSubstitute ? ` \u00b7 ${substitute ? '1' : '0'}/1 rempla\u00e7ant` : '');
  };

  const submitBtn = h('button', {
    class: 'btn',
    style: { flex: '1', background: info.accent, color: '#1a1a1a', fontWeight: '600' },
    onClick: async () => {
      const teammateIds = teammates.filter((id): id is string => !!id);
      // Convention d'envoi : co-équipiers en tête, remplaçant en fin.
      const robotIds = substitute ? [...teammateIds, substitute] : teammateIds;
      statusEl.textContent = 'Inscription en cours…';
      try {
        await api.enqueueMatch(info.id, robotIds, variantId);
        await session.refreshWallet();
        router.go(`matchmaking?format=${info.id}`);
      } catch (e) {
        statusEl.textContent = `\u2717 ${(e as Error).message}`;
      }
    },
  }, 'S\u2019inscrire') as HTMLButtonElement;

  const progress = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } });

  root.append(
    grid,
    statusEl,
    h('div', { class: 'row gap-2', style: { marginTop: '18px', alignItems: 'center' } },
      progress,
      h('div', { style: { flex: '1' } }),
      Button('Annuler', { variant: 'secondary', size: 'sm', onClick: () => router.go('compet') }),
      submitBtn),
  );

  render();
  return root;
}
