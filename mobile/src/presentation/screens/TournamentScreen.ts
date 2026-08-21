/* =============================================================================
 * PRESENTATION · screens/TournamentScreen.ts — Vue détaillée d'un tournoi.
 * -----------------------------------------------------------------------------
 * Rend une vue adaptée au statut :
 *   • UPCOMING  — compte à rebours, inscription/désinscription, participants,
 *                 économie affichée (buy-in, gains par tour).
 *   • LIVE      — bracket visuel, matchs terminés + en cours (cliquables).
 *   • FINISHED  — écran résumé « coupe du monde » avec podium et gains.
 *   • DRAFT     — non affiché aux joueurs (le serveur refuse déjà l'accès).
 *
 * Le tournoi est chargé une fois au montage (pas de polling). Un bouton
 * Rafraîchir permet de recharger manuellement. Cleanup complet au démontage.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import { BracketView, type BracketData } from '../components/BracketView';
import type { AppContext } from '../context';

/** Enum client des statuts (miroir de TournamentStatus serveur). */
export enum TournamentStatusClient {
  DRAFT = 'draft',
  UPCOMING = 'upcoming',
  LIVE = 'live',
  FINISHED = 'finished',
}

interface RoundPrize { round: number; prize: number }
interface PositionPrize { position: number; prize: number }
interface Participant { userId: string; robotIds?: string[]; seedIndex?: number | null; eliminatedAtRound?: number | null; finalPosition?: number | null; prizeAwarded?: number }
interface TournamentDetail {
  _id: string; name: string; format: string; status: TournamentStatusClient;
  capacity: number; entryFee: number; minLevel: number;
  rounds: RoundPrize[]; prizesByPosition?: PositionPrize[]; startAt: string; startedAt?: string | null; finishedAt?: string | null;
  participants: Participant[]; bracket?: string[][]; winners?: string[];
}

const FORMAT_LABEL: Record<string, string> = {
  duo_steel: 'Duo d\u2019acier',
  hybrid_alliance: 'Alliance hybride',
  royal_square: 'Carr\u00e9e royale',
};

/** Formatte une durée relative (dans 2h · commence dans 12 min · il y a 3h). */
function relativeTime(target: Date): string {
  const diff = target.getTime() - Date.now();
  const past = diff < 0;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60_000);
  const hour = Math.round(abs / 3_600_000);
  const day = Math.round(abs / 86_400_000);
  const label = min < 60 ? `${min} min` : hour < 24 ? `${hour} h` : `${day} j`;
  return past ? `il y a ${label}` : `dans ${label}`;
}

export function TournamentScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;
  const id = new URLSearchParams(location.hash.split('?')[1] ?? '').get('id');

  const content = h('div', { class: 'col gap-3', style: { padding: '14px 24px 14px 60px', position: 'absolute', inset: '0', overflow: 'auto', background: 'linear-gradient(160deg,#0a0f1c,#060a13)' } },
    h('div', { class: 'between' },
      h('div', {}, h('div', { class: 'eyebrow' }, 'TOURNOI'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Chargement…')),
      Button('← Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go('compet') })));

  const root = content as HTMLElement & { _cleanup?: () => void };

  if (!id) {
    (root as HTMLElement).append(h('div', { class: 'mono', style: { color: 'var(--c-danger)' } }, 'Identifiant manquant.'));
    return root;
  }

  const posLabel = (pos: number): string => pos === 1 ? '1er' : `${pos}e`;
  const spectate = (tableId: string) => router.go(`table?online=${tableId}&watch=1`);
  const replay = (gameId: string) => router.go(`replay?id=${gameId}`);

  /**
   * v16 — Section bracket EN LIGNE (responsive) affichée directement dans la
   * fenêtre du tournoi (plus de bouton « Voir l'arbre »), avec une icône
   * Actualiser pour recharger les résultats en direct.
   */
  const bracketSection = (): HTMLElement => {
    const host = h('div', { class: 'overflow-x' }, h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, 'Chargement de l’arbre…'));
    const load = async () => {
      try {
        const data = await api.getTournamentBracket(id!) as unknown as BracketData;
        clear(host);
        host.append(BracketView(data, { onSpectate: spectate, onReplay: replay }));
      } catch (e) {
        clear(host);
        host.append(h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, `Arbre indisponible : ${(e as Error).message}`));
      }
    };
    void load();
    return h('div', { class: 'card' },
      h('div', { class: 'between', style: { marginBottom: '10px', alignItems: 'center' } },
        h('div', { class: 'title', style: { fontSize: '13px' } }, 'Arbre du tournoi'),
        h('button', { class: 'btn btn--sm btn--ghost', onClick: () => void load() }, '↻ Actualiser')),
      host);
  };

  const render = (t: TournamentDetail) => {
    clear(root);
    const startDate = new Date(t.startAt);
    root.append(
      h('div', { class: 'between' },
        h('div', {},
          h('div', { class: 'eyebrow' }, (FORMAT_LABEL[t.format] || t.format).toUpperCase() + ' \u00b7 ' + t.status.toUpperCase()),
          h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, t.name)),
        Button('← Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go('compet') })),
    );

    if (t.status === TournamentStatusClient.UPCOMING) root.append(renderUpcoming(t, startDate));
    else if (t.status === TournamentStatusClient.LIVE) root.append(renderLive(t));
    else if (t.status === TournamentStatusClient.FINISHED) root.append(renderFinished(t));
    else root.append(h('div', { class: 'mono', style: { color: 'var(--c-text-mute)' } }, 'Ce tournoi n\u2019est pas encore publi\u00e9.'));
  };

  /* ── Vue UPCOMING : inscription, compte à rebours, économie ─────────────── */
  const renderUpcoming = (t: TournamentDetail, startDate: Date) => {
    const meId = ctx.session.profile?.id;
    const isRegistered = t.participants.some((p) => p.userId === meId);
    const isFull = t.participants.length >= t.capacity;

    const statusEl = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', minHeight: '14px' } });

    const doJoin = () => router.go(`tournament-enroll?id=${t._id}`);
    const doLeave = async () => {
      try {
        const r = await api.leaveTournament(t._id);
        await ctx.session.refreshWallet();
        statusEl.textContent = `\u2713 D\u00e9sinscrit — +${r.refunded} \u25c6 rembours\u00e9s.`;
        void reload();
      } catch (e) { statusEl.textContent = `\u2717 ${(e as Error).message}`; }
    };

    return h('div', { class: 'col gap-3' },
      // Bloc principal : compte à rebours + inscription
      h('div', { class: 'feature-card', style: { padding: '20px', borderRadius: 'var(--r-lg)', '--card-grad': 'var(--g-gold)', color: '#fff' } as unknown as Partial<CSSStyleDeclaration> },
        h('div', { class: 'mono', style: { fontSize: '11px', opacity: '.85' } }, `D\u00c9BUT ${relativeTime(startDate).toUpperCase()}`),
        h('div', { class: 'title', style: { fontSize: '26px', margin: '6px 0 2px' } }, startDate.toLocaleString()),
        h('div', { style: { fontSize: '13px', opacity: '.9', marginBottom: '14px' } },
          `${t.participants.length} / ${t.capacity} inscrits \u00b7 Buy-in ${t.entryFee} \u25c6`),
        isRegistered
          ? h('button', { class: 'btn btn--sm', style: { color: '#8f2020', background: '#fff' }, onClick: () => void doLeave() }, 'Se d\u00e9sinscrire')
          : isFull
            ? h('span', { class: 'mono' }, 'COMPLET')
            : h('button', { class: 'btn btn--sm', style: { color: '#8f6f1f', background: '#fff' }, onClick: () => void doJoin() }, 'S\u2019inscrire'),
        statusEl),
      // Bloc gains par position (v14.14 : donn\u00e9es r\u00e9elles prizesByPosition).
      h('div', { class: 'card' },
        h('div', { class: 'title', style: { fontSize: '13px', marginBottom: '8px' } }, 'Gains par position'),
        ...((t.prizesByPosition ?? []).length
          ? (t.prizesByPosition ?? []).map((pp) => h('div', { class: 'between mono', style: { fontSize: '11px', padding: '4px 0', color: 'var(--c-text-soft)' } },
              h('span', {}, posLabel(pp.position)),
              h('span', { style: { color: 'var(--c-gold)' } }, `${pp.prize} \u25c6`)))
          : [h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, 'Aucun gain d\u00e9fini pour ce tournoi.')])),
    );
  };

  /* -- Vue LIVE : bracket INLINE (responsive) + matchs en cours -- */
  const renderLive = (t: TournamentDetail) => {
    const totalRounds = Math.log2(t.capacity);
    const alive = t.participants.filter((p) => p.eliminatedAtRound == null);
    return h('div', { class: 'col gap-3' },
      h('div', { class: 'card' },
        h('div', { class: 'between', style: { alignItems: 'center' } },
          h('div', {},
            h('div', { class: 'title', style: { fontSize: '13px' } }, 'Tournoi en cours'),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', marginTop: '3px' } },
              `${alive.length} survivant(s) \u00b7 ${totalRounds} rounds au total`)),
          h('span', { class: 'live-chip__dot' }))),
      // Resultats + matchs en cours affiches DIRECTEMENT (arbre responsive).
      bracketSection(),
    );
  };

  /* ── Vue FINISHED : podium coupe du monde ──────────────────────────────── */
  const renderFinished = (t: TournamentDetail) => {
    const winners = t.winners ?? [];
    const winnerName = (uid: string) => uid === ctx.session.profile?.id ? 'Vous' : `Joueur ${uid.slice(-4)}`;

    return h('div', { class: 'col gap-3' },
      // Bandeau podium
      h('div', { class: 'feature-card', style: { padding: '24px', borderRadius: 'var(--r-lg)', '--card-grad': 'var(--g-gold)', color: '#fff', textAlign: 'center' } as unknown as Partial<CSSStyleDeclaration> },
        h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\ud83c\udfc6'),
        h('div', { class: 'title', style: { fontSize: '22px', margin: '0 0 4px' } }, 'Tournoi termin\u00e9'),
        winners[0]
          ? h('div', { style: { fontSize: '14px', opacity: '.95' } }, `Champion : ${winnerName(winners[0])}`)
          : h('div', {}, ''),
        winners.length > 1 ? h('div', { style: { fontSize: '12px', opacity: '.85', marginTop: '4px' } },
          `Finalistes : ${winners.slice(0, 3).map(winnerName).join(', ')}`) : h('div', {}, ''),
        ),
      // v16 - Arbre (resultats + rejouer) affiche EN LIGNE, responsive.
      bracketSection(),
      // R\u00e9cap gains par position (v14.14 : donn\u00e9es r\u00e9elles).
      h('div', { class: 'card' },
        h('div', { class: 'title', style: { fontSize: '13px', marginBottom: '8px' } }, 'Gains par position'),
        ...((t.prizesByPosition ?? []).length
          ? (t.prizesByPosition ?? []).map((pp) => h('div', { class: 'between mono', style: { fontSize: '11px', padding: '4px 0', color: 'var(--c-text-soft)' } },
              h('span', {}, posLabel(pp.position)),
              h('span', { style: { color: 'var(--c-gold)' } }, `${pp.prize} \u25c6`)))
          : [h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, 'Aucun gain d\u00e9fini.')])),
      // Classement final : positions r\u00e9elles + gains vers\u00e9s par participant.
      h('div', { class: 'card' },
        h('div', { class: 'title', style: { fontSize: '13px', marginBottom: '8px' } }, 'Classement final'),
        ...(() => {
          const ranked = [...(t.participants ?? [])]
            .filter((p) => p.finalPosition != null)
            .sort((a, b) => (a.finalPosition ?? 0) - (b.finalPosition ?? 0));
          if (ranked.length === 0) return [h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, 'Classement indisponible.')];
          return ranked.map((p) => h('div', { class: 'between mono', style: { fontSize: '11px', padding: '4px 0', color: 'var(--c-text-soft)' } },
            h('span', {}, `${posLabel(p.finalPosition as number)} \u00b7 ${winnerName(String(p.userId))}`),
            h('span', { style: { color: (p.prizeAwarded ?? 0) > 0 ? 'var(--c-gold)' : 'var(--c-text-mute)' } }, `${p.prizeAwarded ?? 0} \u25c6`)));
        })()),
    );
  };

  const reload = async () => {
    try {
      const r = await api.getTournament(id);
      const t = r.tournament as TournamentDetail | null;
      if (!t) { clear(root); root.append(h('div', { class: 'mono', style: { color: 'var(--c-danger)' } }, 'Tournoi introuvable.')); return; }
      render(t);
    } catch (e) { clear(root); root.append(h('div', { class: 'mono', style: { color: 'var(--c-danger)' } }, `\u2717 ${(e as Error).message}`)); }
  };
  void reload();

  root._cleanup = () => { /* rien à nettoyer : pas de listener ni de timer */ };
  return root;
}
