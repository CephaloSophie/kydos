/* =============================================================================
 * PRESENTATION · components/GameSetupDialog.ts
 * -----------------------------------------------------------------------------
 * Popup de configuration d'une partie CONTRE ROBOTS. Même style que le
 * dialogue « Robot créé ! » (design system : fond dépoli, carte surélevée à
 * lueur dorée), élargie pour héberger les réglages :
 *   - emplacement de chaque siège (Moi / Robot auto / n'importe quel robot) ;
 *   - visibilité des cartes (personne / seulement mes robots / tout le monde) ;
 *   - nombre de manches jusqu'à victoire.
 *
 * La logique de résolution (mon siège, cartes visibles pour chaque siège) est
 * dans `services/gameSetup.ts` — pure, testée, indépendante de ce composant.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button, Robot } from './ui';
import type { Robot as RobotDomain } from '../../domain/entities/Robot';
import { DEFAULT_SETUP, MANCHES_OPTIONS, type GameSetup, type SeatChoice, type Visibility } from '../../services/gameSetup';

export interface GameSetupDialogOptions {
  robots: RobotDomain[];
  initial?: Partial<GameSetup>;
  onConfirm(setup: GameSetup): void;
  onCancel?(): void;
}

const VISIBILITY_OPTS: { id: Visibility; label: string; desc: string }[] = [
  { id: 'none',   label: 'Personne',       desc: 'Seul chaque joueur voit ses cartes.' },
  { id: 'robots', label: 'Mes robots',     desc: 'Vous voyez les cartes de vos robots (pas des adversaires).' },
  { id: 'all',    label: 'Tout le monde',  desc: 'Cartes de tous les sièges visibles — utile en démo.' },
];

/**
 * Ouvre le dialogue. Retourne l'élément racine (à append à la racine de
 * l'écran) — se referme lui-même sur Confirmer / Annuler.
 */
export function GameSetupDialog(opts: GameSetupDialogOptions): HTMLElement {
  const setup: GameSetup = { ...DEFAULT_SETUP, ...(opts.initial ?? {}) };

  // ── Section 1 · sièges ────────────────────────────────────────────────
  // Choix TACTILE (pastilles) plutôt qu'une liste déroulante : sur mobile un
  // <select> ouvre un sélecteur natif hors design system, illisible et lent.
  // Ici chaque siège montre ses options côte à côte, l'option active est
  // mise en avant — un seul geste, tout reste visible.
  const OPTION_ROWS = () => [
    { id: 'auto' as SeatChoice, label: '🤖 Auto', accent: 'var(--c-text-soft)' },
    { id: 'me' as SeatChoice, label: '👤 Moi', accent: 'var(--c-success)' },
    ...opts.robots.map((r) => ({ id: r.id as SeatChoice, label: r.name, accent: r.accent })),
  ];

  const seatsGrid = h('div', { class: 'col gap-2', style: { marginTop: '8px' } });
  const renderSeats = () => {
    clear(seatsGrid);
    (['A', 'B', 'C', 'D'] as const).forEach((label, i) => {
      const team = i % 2 === 0 ? 'NOUS' : 'EUX';
      const options = h('div', { class: 'row gap-2 wrap fill' });
      OPTION_ROWS().forEach((opt) => {
        const active = setup.seats[i] === opt.id;
        // « Moi » déjà placé ailleurs : on le montre grisé sur les autres sièges.
        const meElsewhere = opt.id === 'me' && !active && setup.seats.some((sc) => sc === 'me');
        options.append(h('span', {
          class: 'mono', title: meElsewhere ? 'Vous êtes déjà assis à un autre siège' : undefined,
          style: {
            cursor: 'pointer', padding: '6px 11px', borderRadius: 'var(--r-pill)', fontSize: '11px',
            whiteSpace: 'nowrap', transition: 'var(--t-fast)',
            background: active ? 'rgba(230,196,106,.18)' : 'var(--c-veil-06)',
            border: `1px solid ${active ? 'rgba(230,196,106,.55)' : 'var(--c-line-strong)'}`,
            color: active ? 'var(--c-gold)' : meElsewhere ? 'var(--c-text-faint)' : 'var(--c-text-soft)',
            opacity: meElsewhere ? '.55' : '1',
          },
          onClick: () => {
            // Un seul « Moi » : se déplacer libère automatiquement l'ancien siège.
            if (opt.id === 'me') for (let s2 = 0; s2 < 4; s2++) if (setup.seats[s2] === 'me') setup.seats[s2] = 'auto';
            setup.seats[i] = opt.id;
            renderSeats();
          },
        }, opt.label));
      });

      seatsGrid.append(h('div', {
        class: 'row gap-3', style: {
          padding: '7px 10px', borderRadius: 'var(--r-lg)',
          background: 'var(--c-veil-04)', border: '1px solid var(--c-line)',
        },
      },
        h('div', { class: 'col', style: { gap: '1px', width: '54px', flexShrink: '0' } },
          h('span', { class: 'title', style: { fontSize: '13px' } }, `Siège ${label}`),
          h('span', { class: 'mono', style: { fontSize: '8px', color: i % 2 === 0 ? 'var(--c-success)' : 'var(--c-danger)' } }, team)),
        options,
      ));
    });
  };
  renderSeats();

  // ── Section 2 · visibilité (radio pills) ──────────────────────────────
  const visibilityRow = h('div', { class: 'row gap-2 wrap', style: { marginTop: '8px' } });
  const renderVisibility = () => {
    clear(visibilityRow);
    VISIBILITY_OPTS.forEach((opt) => {
      const active = setup.visibility === opt.id;
      const pill = h('div', {
        class: 'badge', style: {
          cursor: 'pointer', padding: '8px 14px', fontSize: '11px', flex: '1', minWidth: '110px',
          background: active ? 'rgba(230,196,106,.16)' : 'var(--c-veil-06)',
          borderColor: active ? 'rgba(230,196,106,.5)' : 'var(--c-line-strong)',
          color: active ? 'var(--c-gold)' : 'var(--c-text-soft)',
        },
        onClick: () => { setup.visibility = opt.id; renderVisibility(); },
      },
        h('div', { class: 'col', style: { gap: '2px', alignItems: 'flex-start' } },
          h('span', { style: { fontWeight: '700' } }, opt.label),
          h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)', textAlign: 'left' } }, opt.desc),
        ),
      );
      visibilityRow.append(pill);
    });
  };
  renderVisibility();

  // ── Section 3 · manches ───────────────────────────────────────────────
  const mancheRow = h('div', { class: 'row gap-2', style: { marginTop: '8px' } });
  const renderManches = () => {
    clear(mancheRow);
    MANCHES_OPTIONS.forEach((n) => {
      const active = setup.manches === n;
      mancheRow.append(h('div', {
        class: 'badge', style: {
          cursor: 'pointer', padding: '8px 16px', fontSize: '12px', fontWeight: '700', minWidth: '46px', justifyContent: 'center',
          background: active ? 'var(--g-btn)' : 'var(--c-veil-06)',
          borderColor: active ? 'transparent' : 'var(--c-line-strong)',
          color: active ? 'var(--c-ink)' : 'var(--c-text-soft)',
        },
        onClick: () => { setup.manches = n; renderManches(); },
      }, `${n}`));
    });
  };
  renderManches();

  // ── Dialog wrapper (même style que le dialog Robot créé) ──────────────
  const backdrop: HTMLElement = h('div', { class: 'dialog-backdrop', onClick: (e: Event) => {
    if (e.target === backdrop) { backdrop.remove(); opts.onCancel?.(); }
  } },
    h('div', { class: 'dialog', style: { width: '580px', maxHeight: '86vh', overflowY: 'auto', textAlign: 'left', padding: '20px' } },
      h('div', { class: 'row gap-3', style: { marginBottom: '14px', textAlign: 'left', alignItems: 'center' } },
        h('div', { class: 'dialog__icon', style: { margin: '0', width: '44px', height: '44px', fontSize: '20px' } }, Robot({ size: 26, accent: 'var(--c-success)' })),
        h('div', { class: 'col', style: { gap: '2px' } },
          h('div', { class: 'dialog__title', style: { marginBottom: '0', fontSize: '17px' } }, 'Configurer la partie'),
          h('div', { class: 'text-mute', style: { fontSize: '11px' } }, 'Choisissez qui joue, la visibilité et la durée.'),
        ),
      ),
      // Section 1
      h('div', { class: 'label', style: { fontSize: '10px' } }, 'Emplacement des joueurs'),
      seatsGrid,
      h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)', marginTop: '5px' } },
        'Coéquipiers : sièges A + C (« NOUS ») · sièges B + D (« EUX »).'),
      // Section 2
      h('div', { class: 'label', style: { fontSize: '10px', marginTop: '14px' } }, 'Cartes visibles'),
      visibilityRow,
      // Section 3
      h('div', { class: 'label', style: { fontSize: '10px', marginTop: '14px' } }, 'Nombre de manches'),
      mancheRow,
      // Actions (même agencement que Robot créé)
      h('div', { class: 'dialog__actions', style: { marginTop: '20px' } },
        Button('Annuler', { variant: 'secondary', size: 'sm', onClick: () => { backdrop.remove(); opts.onCancel?.(); } }),
        Button('Lancer la partie', {
          onClick: () => { backdrop.remove(); opts.onConfirm(setup); },
        }),
      ),
    ),
  );
  return backdrop;
}
