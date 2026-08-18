/* =============================================================================
 * TOURNAMENTS · userStatus.ts — Statut d'un joueur dans un tournoi LIVE (v16).
 * -----------------------------------------------------------------------------
 * Fonction PURE (aucune I/O) : à partir de l'arbre bracket et d'un userId, dit
 * où en est le joueur — en train de jouer, EN ATTENTE de son prochain match
 * (son adversaire n'est pas encore connu), éliminé, ou champion. Sert à :
 *   • l'écran mobile « waiting » du gagnant (score en direct de l'autre match,
 *     lien spectateur, saut automatique quand mon match démarre) ;
 *   • la bannière d'accueil / pastille LIVE.
 * ========================================================================== */
import type { BracketTree, BracketMatch } from './bracket.js';

export type UserTournamentState = 'champion' | 'playing' | 'waiting' | 'pending' | 'eliminated' | 'none';

export interface AwaitedMatch {
  matchId: string | null;
  roundIndex: number;
  matchIndex: number;
  slotAName: string;
  slotBName: string;
  scoreA: number | null;
  scoreB: number | null;
  winner: 'A' | 'B' | null;
}

export interface UserTournamentStatus {
  state: UserTournamentState;
  /** Round de mon match courant / prochain (1-based) ; null si hors bracket. */
  roundIndex: number | null;
  /** Mon match en cours (à rejoindre) si state === 'playing'. */
  myMatchId: string | null;
  /** Match(s) dont dépend le démarrage du mien (à finir avant), si 'waiting'. */
  awaiting: AwaitedMatch[];
}

const sameId = (a: any, b: any): boolean => a != null && b != null && String(a) === String(b);

/** Le joueur occupe-t-il ce slot ? (Carrée royale : 2 coéquipiers par slot). */
function inSlot(slot: BracketMatch['slotA'], uid: string): boolean {
  return sameId(slot.userId, uid) || sameId((slot as any).userId2, uid);
}

function toAwaited(m: BracketMatch, roundIndex: number): AwaitedMatch {
  return {
    matchId: m.matchId ? String(m.matchId) : null,
    roundIndex,
    matchIndex: m.matchIndex,
    slotAName: m.slotA.displayName || '—',
    slotBName: m.slotB.displayName || '—',
    scoreA: m.scoreA, scoreB: m.scoreB, winner: m.winner,
  };
}

export function computeUserTournamentStatus(tree: BracketTree, userId: string): UserTournamentStatus {
  const none: UserTournamentStatus = { state: 'none', roundIndex: null, myMatchId: null, awaiting: [] };
  if (!tree?.rounds?.length) return none;

  // Dernière apparition du joueur dans un slot = sa progression la plus avancée
  // (en gagnant, son slot est propagé au match parent du round suivant).
  let cur: BracketMatch | null = null;
  let curRound = 0;
  for (const round of tree.rounds) {
    for (const m of round.matches) {
      if (inSlot(m.slotA, userId) || inSlot(m.slotB, userId)) { cur = m; curRound = round.roundIndex; }
    }
  }
  if (!cur) return none;

  const mySlotKey: 'A' | 'B' = inSlot(cur.slotA, userId) ? 'A' : 'B';
  const otherSlot = mySlotKey === 'A' ? cur.slotB : cur.slotA;

  // Match déjà décidé ?
  if (cur.winner) {
    const winnerSlot = cur.winner === 'A' ? cur.slotA : cur.slotB;
    if (inSlot(winnerSlot, userId)) {
      // Gagnant d'un match décidé sans apparaître plus loin ⇒ c'était la finale.
      return { state: 'champion', roundIndex: curRound, myMatchId: cur.matchId ? String(cur.matchId) : null, awaiting: [] };
    }
    return { state: 'eliminated', roundIndex: curRound, myMatchId: null, awaiting: [] };
  }

  // Mon match est en cours (créé, pas encore fini) ⇒ à rejoindre.
  if (cur.matchId) {
    return { state: 'playing', roundIndex: curRound, myMatchId: String(cur.matchId), awaiting: [] };
  }

  // Match pas encore créé. Si l'autre slot est vide, j'attends le(s) match(s)
  // du round précédent qui l'alimente(nt) (mon adversaire n'est pas connu).
  if (!otherSlot.userId) {
    const otherSlotKey: 'A' | 'B' = mySlotKey === 'A' ? 'B' : 'A';
    const prev = tree.rounds.find((r) => r.roundIndex === curRound - 1);
    const feeders = prev
      ? prev.matches.filter((m) => m.nextMatchIndex === cur!.matchIndex && m.nextSlot === otherSlotKey)
      : [];
    return {
      state: 'waiting',
      roundIndex: curRound,
      myMatchId: null,
      awaiting: feeders.map((m) => toAwaited(m, curRound - 1)),
    };
  }

  // Les deux slots sont remplis mais le match n'est pas encore créé : il va
  // démarrer imminemment (l'orchestrateur le crée au prochain tick).
  return { state: 'pending', roundIndex: curRound, myMatchId: null, awaiting: [] };
}
