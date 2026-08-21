/* =============================================================================
 * TOURNAMENTS · activeEngagement.ts — Composition pure de l'engagement joueur.
 * -----------------------------------------------------------------------------
 * Ce module isole la LOGIQUE DE COMPOSITION consommée par
 * `tournamentService.getMyActive` : à partir d'un tournoi + son statut calculé
 * + une table de correspondance matchId → tableId, il produit l'objet exposé
 * au mobile (pastille LIVE, écran d'attente, popup Rejoindre).
 *
 * Séparer cette composition des I/O Mongoose la rend UNIT-testable sans base.
 *
 * Deux fonctions exportées, toutes deux pures :
 *   • buildActiveResponse   : compose l'objet quand le joueur est engagé
 *     (state = playing | waiting | pending) — inclut myTableId, awaiting[]
 *     enrichis et autoRejoinSec.
 *   • buildFallbackResponse : compose l'objet « repli » (state = champion |
 *     eliminated) qui garde l'accès à l'arbre après élimination/victoire.
 * ========================================================================== */
import type { UserTournamentStatus } from './userStatus.js';

export interface TournamentSummary {
  _id: unknown;
  name?: string;
  format?: string;
  color?: string;
  icon?: string;
  gameConfig?: { autoRejoinSec?: unknown } | null;
  bracketTree?: { rounds?: { roundIndex: number; label?: string }[] } | null;
}

export interface ActiveResponse {
  tournamentId: string;
  name?: string; format?: string; color?: string; icon?: string;
  state: UserTournamentStatus['state'];
  roundIndex: number | null;
  roundLabel: string;
  startsAt: string | null;
  myMatchId: string | null;
  myTableId: string | null;
  awaiting: (UserTournamentStatus['awaiting'][number] & { tableId: string | null })[];
  autoRejoinSec: number;
}

/**
 * Lecture robuste de `autoRejoinSec` depuis un gameConfig arbitraire.
 * Défaut : 5 s. Toute valeur non-finie est rejetée.
 */
export function readAutoRejoinSec(gameConfig: TournamentSummary['gameConfig']): number {
  const n = Number(gameConfig?.autoRejoinSec);
  return Number.isFinite(n) ? n : 5;
}

function roundLabelOf(t: TournamentSummary, roundIndex: number | null): string {
  if (roundIndex == null) return '';
  const rounds = t.bracketTree?.rounds ?? [];
  return rounds.find((r) => r.roundIndex === roundIndex)?.label ?? '';
}

/** Compose la réponse pour un joueur ENGAGÉ (playing / waiting / pending). */
export function buildActiveResponse(
  t: TournamentSummary,
  status: UserTournamentStatus,
  tableByMatch: Map<string, string>,
): ActiveResponse {
  return {
    tournamentId: String(t._id),
    name: t.name, format: t.format, color: t.color, icon: t.icon,
    state: status.state,
    roundIndex: status.roundIndex,
    roundLabel: roundLabelOf(t, status.roundIndex),
    startsAt: status.startsAt,
    myMatchId: status.myMatchId,
    myTableId: status.myMatchId ? tableByMatch.get(status.myMatchId) ?? null : null,
    awaiting: status.awaiting.map((a) => ({
      ...a,
      tableId: a.matchId ? tableByMatch.get(a.matchId) ?? null : null,
    })),
    autoRejoinSec: readAutoRejoinSec(t.gameConfig),
  };
}

/**
 * Compose la réponse REPLI pour un joueur éliminé/champion d'un tournoi
 * encore LIVE : il conserve l'accès à l'arbre pour consulter les autres
 * matchs. Aucune table à rejoindre.
 */
export function buildFallbackResponse(
  t: TournamentSummary,
  status: UserTournamentStatus,
): ActiveResponse {
  return {
    tournamentId: String(t._id),
    name: t.name, format: t.format, color: t.color, icon: t.icon,
    state: status.state,
    roundIndex: status.roundIndex,
    roundLabel: roundLabelOf(t, status.roundIndex),
    startsAt: null,
    myMatchId: null,
    myTableId: null,
    awaiting: [],
    autoRejoinSec: readAutoRejoinSec(t.gameConfig),
  };
}
