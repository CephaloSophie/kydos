/* =============================================================================
 * BACK-OFFICE · tournamentDetail.ts — Helpers purs de la vue Détail tournoi.
 * -----------------------------------------------------------------------------
 * Ce module isole les logiques SANS I/O (pas de Mongoose, pas d'Express) :
 *
 *   • sanitizeGameConfig  : normalisation + bornes des paramètres de jeu.
 *   • occupantsAtPosition : nombre de finissants à une position bracket.
 *   • computeEconomics    : totaux collectés / payés / net kydos.
 *   • resolveSlot         : slot lisible (usernames + fallback displayName).
 *   • resolveMatchState   : état visuel unifié d'un match du bracket.
 *   • buildTournamentDetail : compose la vue enrichie à partir des données
 *                             brutes + tables de correspondance de noms.
 *
 * La route HTTP se contente d'assembler les IDs, d'exécuter les 3 requêtes
 * de résolution (users / robots / matches), puis d'appeler ces helpers.
 * ========================================================================== */

export type MatchState = 'pending' | 'ready' | 'countdown' | 'live' | 'finished';

export interface RawSlot {
  userId?: unknown; userId2?: unknown;
  seedIndex?: number | null;
  displayName?: string; displayName2?: string;
}
export interface ResolvedSlot {
  userId: string | null;   username: string | null;
  userId2: string | null;  username2: string | null;
  seedIndex: number | null;
  displayName: string;     displayName2: string;
}

export interface RawBracketMatch {
  matchIndex: number;
  matchId?: unknown;
  gameId?: unknown;
  slotA?: RawSlot; slotB?: RawSlot;
  winner?: 'A' | 'B' | null;
  scoreA?: number | null; scoreB?: number | null;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
  scheduledStartAt?: Date | string | null;
}

export interface MatchDoc {
  status?: string;
  liveTableId?: unknown;
  game?: unknown;
  scoreTeamA?: number;
  scoreTeamB?: number;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
}

/* ── Normalisation des paramètres de jeu ──────────────────────────────────── */

export interface GameConfigInput {
  manches?: unknown; baseTarget?: unknown; labelTarget?: unknown;
  roundCountdownSec?: unknown; autoRejoinSec?: unknown;
  trickDelayMs?: unknown; speed?: unknown; turnTimeoutMs?: unknown;
  allowSpectators?: unknown; feltTheme?: unknown;
  signals?: { reflexion?: unknown; repeatSuit?: unknown };
}

const clamp = (v: unknown, min: number, max: number, def: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export function sanitizeGameConfig(raw: GameConfigInput | null | undefined) {
  const g = raw ?? {};
  return {
    manches: [1, 2, 4].includes(Number(g.manches)) ? Number(g.manches) : 2,
    baseTarget: clamp(g.baseTarget, 100, 100000, 1500),
    labelTarget: clamp(g.labelTarget, 100, 100000, 2000),
    roundCountdownSec: clamp(g.roundCountdownSec, 0, 300, 10),
    autoRejoinSec: clamp(g.autoRejoinSec, 0, 60, 5),
    trickDelayMs: clamp(g.trickDelayMs, 0, 10000, 900),
    speed: clamp(g.speed, 0.5, 4, 1),
    turnTimeoutMs: clamp(g.turnTimeoutMs, 3000, 120000, 15000),
    allowSpectators: g.allowSpectators !== false,
    feltTheme: (['classic', 'cosmos', 'olympus'] as const).includes(g.feltTheme as any)
      ? (g.feltTheme as 'classic' | 'cosmos' | 'olympus') : 'classic',
    signals: {
      reflexion: g.signals?.reflexion !== false,
      repeatSuit: g.signals?.repeatSuit !== false,
    },
  };
}

/* ── Économie des prix par position ───────────────────────────────────────── */

/**
 * Nombre de finissants à un rang bracket donné (single-elimination).
 * Rang 1 = vainqueur (1), rang 2 = finaliste perdant (1), rang 3 = perdants
 * de demies (2), rang 5 = perdants de quarts (4), etc.
 * @param leaves - nombre de feuilles (matchs au 1er round × 2 slots).
 */
export function occupantsAtPosition(leaves: number, position: number): number {
  if (position === 1 || position === 2) return 1;
  let rank = 3;
  let losers = 2;
  while (losers <= leaves / 2) {
    if (rank === position) return losers;
    rank += losers;
    losers *= 2;
  }
  return 0;
}

export interface EconomicsResult {
  totalCollected: number;
  totalPaid: number;
  houseNet: number;
  breakdown: { position: number; occupants: number; prizePerOccupant: number; totalPaidAtThisPosition: number }[];
}

/**
 * Économie d'un tournoi. Carrée royale (`royal_square`) : le bracket est joué
 * en ÉQUIPES de 2 humains → `leaves = capacity / 2`, `teamSize = 2`.
 */
export function computeEconomics(
  capacity: number,
  entryFee: number,
  prizesByPosition: { position: number; prize: number }[],
  format?: string,
): EconomicsResult {
  const isRoyal = format === 'royal_square';
  const leaves = isRoyal ? capacity / 2 : capacity;
  const teamSize = isRoyal ? 2 : 1;
  const totalCollected = capacity * entryFee;
  let totalPaid = 0;
  const breakdown = prizesByPosition.map((pp) => {
    const occupants = occupantsAtPosition(leaves, pp.position) * teamSize;
    const totalPaidAtThisPosition = occupants * pp.prize;
    totalPaid += totalPaidAtThisPosition;
    return { position: pp.position, occupants, prizePerOccupant: pp.prize, totalPaidAtThisPosition };
  });
  return { totalCollected, totalPaid, houseNet: totalCollected - totalPaid, breakdown };
}

/* ── Enrichissement d'un slot de bracket ──────────────────────────────────── */

/**
 * Résout un slot : ObjectId → username lu dans `userName`, avec fallback sur
 * `displayName*` du bracket (utile si l'utilisateur a été supprimé après coup).
 */
export function resolveSlot(s: RawSlot | undefined, userName: Map<string, string>): ResolvedSlot {
  const uid = s?.userId ? String(s.userId) : null;
  const uid2 = s?.userId2 ? String(s.userId2) : null;
  return {
    userId: uid,
    username: uid ? userName.get(uid) ?? s?.displayName ?? null : null,
    userId2: uid2,
    username2: uid2 ? userName.get(uid2) ?? s?.displayName2 ?? null : null,
    seedIndex: s?.seedIndex ?? null,
    displayName: s?.displayName ?? '',
    displayName2: s?.displayName2 ?? '',
  };
}

/* ── État visuel unifié d'un match ─────────────────────────────────────────── */

/**
 * Le back-office consomme un unique état lisible par match :
 *   • `finished`  — un vainqueur est proclamé.
 *   • `live`      — le Match rattaché est en `running`.
 *   • `countdown` — `scheduledStartAt` est dans le futur.
 *   • `ready`     — les deux slots sont connus, en attente de démarrage.
 *   • `pending`   — au moins un slot est encore vide (attente d'un match amont).
 */
export function resolveMatchState(m: RawBracketMatch, md: MatchDoc | null, now: number = Date.now()): MatchState {
  if (m.winner) return 'finished';
  if (md?.status === 'running') return 'live';
  if (m.scheduledStartAt && new Date(m.scheduledStartAt as any).getTime() > now) return 'countdown';
  return (m.slotA?.userId && m.slotB?.userId) ? 'ready' : 'pending';
}

/* ── Composition finale de la vue Détail ──────────────────────────────────── */

export interface EnrichedParticipant {
  userId: string; username: string | null;
  seedIndex: number | null;
  eliminatedAtRound: number | null;
  finalPosition: number | null;
  prizeAwarded: number;
  joinedAt: Date | string | null;
  robots: { id: string; name: string }[];
  substituteRobot: { id: string; name: string } | null;
}

export interface RawParticipant {
  userId: unknown;
  robotIds?: unknown[];
  substituteRobotId?: unknown;
  seedIndex?: number | null;
  eliminatedAtRound?: number | null;
  finalPosition?: number | null;
  prizeAwarded?: number;
  joinedAt?: Date | string | null;
}

export interface TournamentDetailInput {
  participants?: RawParticipant[];
  winners?: unknown[];
  bracketTree?: {
    builtAt?: Date | string | null;
    lastCompletedRound?: number;
    rounds?: { roundIndex: number; label?: string; matches?: RawBracketMatch[] }[];
  } | null;
}

export interface EnrichedBracket {
  builtAt: Date | string | null;
  lastCompletedRound: number;
  rounds: {
    roundIndex: number; label: string;
    matches: (Omit<RawBracketMatch, 'slotA' | 'slotB'> & {
      matchId: string | null; gameId: string | null; liveTableId: string | null;
      slotA: ResolvedSlot; slotB: ResolvedSlot;
      scoreA: number | null; scoreB: number | null;
      state: MatchState;
    })[];
  }[];
}

export interface TournamentDetailOutput {
  participants: EnrichedParticipant[];
  winners: { userId: string; username: string | null }[];
  bracketTree: EnrichedBracket;
}

/**
 * Compose la vue Détail enrichie à partir des données brutes du tournoi et
 * des cartes de correspondance résolues par la route (users / robots /
 * matches). C'est ici que se joue tout le mapping — pur, testable seul.
 */
export function buildTournamentDetail(
  raw: TournamentDetailInput,
  userName: Map<string, string>,
  robotById: Map<string, { name: string; owner?: string }>,
  matchById: Map<string, MatchDoc>,
  now: number = Date.now(),
): TournamentDetailOutput {
  const participants: EnrichedParticipant[] = (raw.participants ?? []).map((p) => ({
    userId: String(p.userId ?? ''),
    username: userName.get(String(p.userId ?? '')) ?? null,
    seedIndex: p.seedIndex ?? null,
    eliminatedAtRound: p.eliminatedAtRound ?? null,
    finalPosition: p.finalPosition ?? null,
    prizeAwarded: p.prizeAwarded ?? 0,
    joinedAt: p.joinedAt ?? null,
    robots: (p.robotIds ?? []).map((rid) => {
      const r = robotById.get(String(rid));
      return { id: String(rid), name: r?.name ?? '(robot supprimé)' };
    }),
    substituteRobot: p.substituteRobotId
      ? { id: String(p.substituteRobotId), name: robotById.get(String(p.substituteRobotId))?.name ?? '(robot supprimé)' }
      : null,
  }));

  const winners = (raw.winners ?? []).map((w) => ({
    userId: String(w),
    username: userName.get(String(w)) ?? null,
  }));

  const bracketTree: EnrichedBracket = {
    builtAt: raw.bracketTree?.builtAt ?? null,
    lastCompletedRound: raw.bracketTree?.lastCompletedRound ?? 0,
    rounds: (raw.bracketTree?.rounds ?? []).map((round) => ({
      roundIndex: round.roundIndex,
      label: round.label || `Round ${round.roundIndex}`,
      matches: (round.matches ?? []).map((m) => {
        const md = m.matchId ? matchById.get(String(m.matchId)) ?? null : null;
        return {
          matchIndex: m.matchIndex,
          matchId: m.matchId ? String(m.matchId) : null,
          gameId: m.gameId ? String(m.gameId) : (md?.game ? String(md.game) : null),
          liveTableId: md?.liveTableId ? String(md.liveTableId) : null,
          slotA: resolveSlot(m.slotA, userName),
          slotB: resolveSlot(m.slotB, userName),
          winner: m.winner ?? null,
          scoreA: m.scoreA ?? md?.scoreTeamA ?? null,
          scoreB: m.scoreB ?? md?.scoreTeamB ?? null,
          startedAt: m.startedAt ?? md?.startedAt ?? null,
          finishedAt: m.finishedAt ?? md?.finishedAt ?? null,
          scheduledStartAt: m.scheduledStartAt ?? null,
          state: resolveMatchState(m, md, now),
        };
      }),
    })),
  };

  return { participants, winners, bracketTree };
}
