/* =============================================================================
 * PRESENTATION · screens/TournamentEnrollScreen.ts (v14.14)
 * -----------------------------------------------------------------------------
 * Écran d'inscription à un TOURNOI. Route : `tournament-enroll?id=X`.
 *
 * Reprend EXACTEMENT la logique et le design de MatchEnrollScreen (inscription
 * à un match rapide) : le joueur choisit ses robots par rôle selon le format.
 *   • DUO_STEEL       — 2 robots COÉQUIPIERS (jouent en équipe). Pas de remplaçant.
 *   • HYBRID_ALLIANCE — 1 robot COÉQUIPIER + 1 robot REMPLAÇANT.
 *   • ROYAL_SQUARE    — 1 robot REMPLAÇANT (aucun coéquipier).
 *
 * La convention d'envoi est identique au serveur (tournament.service.join) :
 *   robotIds = [coéquipier(s)…, remplaçant?]  (le remplaçant en dernier).
 *
 * Différence avec MatchEnrollScreen : le buy-in et le format proviennent du
 * tournoi chargé (api.getTournament), pas d'un catalogue de match statique.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import type { AppContext } from '../context';
import type { ServerRobot } from '../../data/ApiClient';

/** Rôles robots par format (miroir de getMatchFormatRules côté serveur). */
interface FormatRoles { label: string; teammates: number; hasSubstitute: boolean; accent: string; helper: string }
const FORMAT_ROLES: Record<string, FormatRoles> = {
  duo_steel: {
    label: 'Duo d’acier', teammates: 2, hasSubstitute: false, accent: '#3f6ea1',
    helper: 'Choisissez les 2 robots de votre équipe. Ils joueront ensemble.',
  },
  hybrid_alliance: {
    label: 'Alliance hybride', teammates: 1, hasSubstitute: true, accent: '#c99c3f',
    helper: 'Choisissez votre coéquipier (joue avec vous) et un remplaçant (prend la main si vous vous absentez).',
  },
  royal_square: {
    label: 'Carrée royale', teammates: 0, hasSubstitute: true, accent: '#b0384a',
    helper: 'Choisissez un robot remplaçant. Il prendra la main si vous quittez la table.',
  },
};

interface TournamentLite {
  _id: string; name: string; format: string; status: string;
  capacity: number; entryFee: number; participants?: { userId: string }[];
}

export function TournamentEnrollScreen(ctx: AppContext): HTMLElement {
  const { router, api, session } = ctx;
  const id = new URLSearchParams(location.hash.split('?')[1] ?? '').get('id') ?? '';

  const root = h('div', { class: 'anim-screen', style: {
    position: 'absolute', inset: '0', padding: '20px 26px 20px 62px', overflow: 'auto',
    background: 'radial-gradient(900px 500px at 50% 30%, #101b2f, #05070f 70%)',
  } }) as HTMLElement & { _cleanup?: () => void };

  if (!id) {
    root.append(h('div', { class: 'mono', style: { color: 'var(--c-danger)' } }, 'Identifiant de tournoi manquant.'));
    return root;
  }

  root.append(h('div', { class: 'mono', style: { color: 'var(--c-text-mute)', fontSize: '12px' } }, 'Chargement du tournoi…'));

  const build = (t: TournamentLite) => {
    clear(root);
    const info = FORMAT_ROLES[t.format] ?? FORMAT_ROLES.duo_steel;

    // Sélections courantes : coéquipiers (ordonnés) + remplaçant à part.
    const teammates: (string | null)[] = new Array(info.teammates).fill(null);
    let substitute: string | null = null;

    root.append(
      h('div', { class: 'between', style: { marginBottom: '14px' } },
        h('div', {},
          h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'INSCRIPTION TOURNOI'),
          h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '4px' } }, t.name)),
        Button('← Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go(`tournament?id=${t._id}`) })),
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', marginBottom: '10px' } },
        `${info.label} · ${info.helper}`),
      h('div', { class: 'row gap-3 mono', style: { fontSize: '11px', marginBottom: '16px' } },
        h('span', { style: { color: 'var(--c-text-soft)' } }, `Buy-in ${t.entryFee} ◆`),
        h('span', { style: { color: 'var(--c-text-soft)' } }, `${(t.participants ?? []).length}/${t.capacity} inscrits`)),
    );

    const robots = session.robots;
    if (robots.length === 0) {
      root.append(
        h('div', { class: 'card', style: { padding: '18px', textAlign: 'center' } },
          h('div', { style: { fontSize: '13px', color: 'var(--c-text-mute)' } }, 'Aucun robot dans votre écurie.'),
          h('div', { style: { marginTop: '10px' } }, Button('Créer un robot', { size: 'sm', onClick: () => router.go('create') }))));
      return;
    }

    const statusEl = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', minHeight: '14px', marginTop: '12px', textAlign: 'center' } });
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' } });
    const progress = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } });

    const roleOf = (rid: string): 'teammate' | 'substitute' | null => {
      if (teammates.includes(rid)) return 'teammate';
      if (substitute === rid) return 'substitute';
      return null;
    };

    /** Cycle de rôles au clic : neutre → coéquipier → remplaçant → neutre. */
    const cycleRole = (r: ServerRobot) => {
      const role = roleOf(r.id);
      if (role === null) {
        const freeSlot = teammates.indexOf(null);
        if (freeSlot >= 0) teammates[freeSlot] = r.id;
        else if (info.hasSubstitute && !substitute) substitute = r.id;
        else { statusEl.textContent = 'Sélection complète : désélectionnez avant d’en ajouter un autre.'; return; }
      } else if (role === 'teammate') {
        const i = teammates.indexOf(r.id);
        teammates[i] = null;
        if (info.hasSubstitute && !substitute) substitute = r.id;
      } else {
        substitute = null;
      }
      statusEl.textContent = '';
      render();
    };

    const badgeFor = (r: ServerRobot) => {
      const role = roleOf(r.id);
      if (role === 'teammate') {
        const i = teammates.indexOf(r.id) + 1;
        const label = info.teammates > 1 ? `COÉQUIPIER ${i}` : 'COÉQUIPIER';
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
      const filled = teammates.filter(Boolean).length;
      const needSub = info.hasSubstitute && !substitute;
      const canSubmit = filled === info.teammates && !needSub;
      submitBtn.disabled = !canSubmit;
      (submitBtn as HTMLElement).style.opacity = canSubmit ? '1' : '.55';
      progress.textContent = `Sélection : ${filled}/${info.teammates} coéquipier(s)` + (info.hasSubstitute ? ` · ${substitute ? '1' : '0'}/1 remplaçant` : '');
    };

    const submitBtn = h('button', {
      class: 'btn',
      style: { flex: '1', background: info.accent, color: '#1a1a1a', fontWeight: '600' },
      onClick: async () => {
        if (!api.isAuthenticated()) { statusEl.textContent = '✗ Connexion requise'; return; }
        const teammateIds = teammates.filter((x): x is string => !!x);
        const robotIds = substitute ? [...teammateIds, substitute] : teammateIds;
        statusEl.textContent = 'Inscription en cours…';
        try {
          await api.joinTournament(t._id, robotIds);
          await session.refreshWallet();
          router.go(`tournament?id=${t._id}`);
        } catch (e) {
          statusEl.textContent = `✗ ${(e as Error).message}`;
        }
      },
    }, 'S’inscrire') as HTMLButtonElement;

    root.append(
      grid,
      statusEl,
      h('div', { class: 'row gap-2', style: { marginTop: '18px', alignItems: 'center' } },
        progress,
        h('div', { style: { flex: '1' } }),
        Button('Annuler', { variant: 'secondary', size: 'sm', onClick: () => router.go(`tournament?id=${t._id}`) }),
        submitBtn),
    );

    render();
  };

  void (async () => {
    try {
      const r = await api.getTournament(id);
      const t = r.tournament as TournamentLite | null;
      if (!t) { clear(root); root.append(h('div', { class: 'mono', style: { color: 'var(--c-danger)' } }, 'Tournoi introuvable.')); return; }
      if (t.status !== 'upcoming') {
        clear(root);
        root.append(
          h('div', { class: 'between', style: { marginBottom: '14px' } },
            h('div', {}, h('div', { class: 'eyebrow' }, 'INSCRIPTION'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '4px' } }, t.name)),
            Button('← Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go(`tournament?id=${t._id}`) })),
          h('div', { class: 'mono', style: { color: 'var(--c-text-mute)', fontSize: '12px' } }, 'Les inscriptions sont fermées pour ce tournoi.'));
        return;
      }
      build(t);
    } catch (e) {
      clear(root);
      root.append(h('div', { class: 'mono', style: { color: 'var(--c-danger)' } }, `✗ ${(e as Error).message}`));
    }
  })();

  root._cleanup = () => { /* rien à nettoyer */ };
  return root;
}
