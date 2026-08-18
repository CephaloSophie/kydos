/* =============================================================================
 * TOURNAMENTS · bracket.ts — Fonctions PURES autour du bracket.
 * -----------------------------------------------------------------------------
 * Aucune I/O, aucune dépendance Mongo — 100 % testable. Utilisé par le
 * service tournois pour construire l'arbre initial, avancer un nœud à la
 * fin d'un match, et calculer les rangs finaux (avec ex æquo).
 *
 * Concepts clés :
 *
 *   • ROUND = étape du tournoi. Round 1 = premier tour. Le dernier round est
 *     la FINALE. Nombre de rounds = log2(capacity).
 *
 *   • POSITIONS FINALES avec EX ÆQUO :
 *       Dans un bracket à élimination directe, un même RANG peut être
 *       occupé par plusieurs joueurs. Les perdants d'un round partagent
 *       tous le même rang. Exemple capacity=16 :
 *         rang 1  : vainqueur finale                 (1 personne)
 *         rang 2  : finaliste perdant                (1 personne)
 *         rang 3  : perdants demi-finale             (2 personnes ex æquo)
 *         rang 5  : perdants quart de finale         (4 personnes ex æquo)
 *         rang 9  : perdants huitième de finale      (8 personnes ex æquo)
 *       → aucun 4, 6, 7, 8, 10-16 : ces rangs n'existent pas.
 *
 *   • PRIZES BY POSITION : le back office définit un prix par RANG unique
 *     (1, 2, 3, 5, 9, …). Chaque occupant du rang reçoit le prix.
 * ========================================================================== */

/* ── Structures internes (miroir simplifié des schemas Mongo) ─────────────── */

export interface BracketSlot {
  userId: string | null;
  seedIndex: number | null;
  displayName: string;
  /**
   * v14.14 — Carrée royale : un slot du bracket représente une ÉQUIPE de 2
   * humains (formés aléatoirement au démarrage, fixes jusqu'à la fin). Le
   * second coéquipier est stocké ici. `null` pour les formats en 1 vs 1
   * (Duo d'acier, Alliance hybride) où un slot = un seul participant.
   */
  userId2?: string | null;
  displayName2?: string;
}

export interface BracketMatch {
  matchIndex: number;
  matchId: string | null;
  gameId: string | null;
  slotA: BracketSlot;
  slotB: BracketSlot;
  winner: 'A' | 'B' | null;
  scoreA: number | null;
  scoreB: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  /**
   * v16 — Instant planifié de démarrage : posé par l'orchestrateur dès que les
   * 2 slots sont connus, à `now + roundCountdownSec`. Le match n'est créé/lancé
   * qu'une fois cet instant atteint (compte à rebours côté joueur).
   */
  scheduledStartAt?: Date | null;
  nextMatchIndex: number | null;   // dans le round suivant
  nextSlot: 'A' | 'B' | null;      // A ou B du parent
}

export interface BracketRound {
  roundIndex: number;    // 1-based
  label: string;         // 'Huitièmes', 'Finale', etc.
  matches: BracketMatch[];
}

export interface BracketTree {
  rounds: BracketRound[];
  builtAt: Date | null;
  lastCompletedRound: number;
}

/* ── Labels & positions ───────────────────────────────────────────────────── */

/** Nombre de rounds pour une capacité. Ex. 16 → 4 rounds. */
export function roundCountForCapacity(capacity: number): number {
  return Math.log2(capacity);
}

/**
 * Libellé humain d'un round selon la capacité et l'index (1-based).
 * Le DERNIER round est toujours « Finale ». Les précédents sont dérivés
 * du nombre de survivants entrants (16 → « 8ᵉ », 8 → « Quart », etc.).
 */
export function labelForRound(capacity: number, roundIndex: number): string {
  const total = roundCountForCapacity(capacity);
  if (roundIndex === total) return 'Finale';
  if (roundIndex === total - 1) return 'Demi-finale';
  if (roundIndex === total - 2) return 'Quart de finale';
  const survivorsIn = capacity / Math.pow(2, roundIndex - 1);
  if (survivorsIn === 8) return 'Quart de finale';
  if (survivorsIn === 16) return '8es de finale';
  if (survivorsIn === 32) return '16es de finale';
  if (survivorsIn === 64) return '32es de finale';
  if (survivorsIn === 128) return '64es de finale';
  return `Round ${roundIndex}`;
}

/**
 * Rangs finaux uniques possibles pour une capacité donnée (avec ex æquo).
 * Ex. capacity=16 → [1, 2, 3, 5, 9].
 * Ex. capacity=8  → [1, 2, 3, 5].
 * Ex. capacity=4  → [1, 2, 3].
 */
export function computePositions(capacity: number): number[] {
  const positions: number[] = [1, 2];
  let losersPerRank = 2;                  // 2 perdants demi = 3ᵉ ex æquo
  let currentRank = 3;
  while (losersPerRank <= capacity / 2) {
    positions.push(currentRank);
    currentRank += losersPerRank;         // prochain rang = rang actuel + nb d'ex æquo
    losersPerRank *= 2;
  }
  return positions;
}

/**
 * Combien de personnes occupent CHAQUE rang final ? Renvoie une map
 * { rang → nombre d'occupants }. Ex. capacity=16 → {1:1, 2:1, 3:2, 5:4, 9:8}.
 */
export function occupantsPerPosition(capacity: number): Record<number, number> {
  const out: Record<number, number> = { 1: 1, 2: 1 };
  let losers = 2;
  let rank = 3;
  while (losers <= capacity / 2) {
    out[rank] = losers;
    rank += losers;
    losers *= 2;
  }
  return out;
}

/**
 * Rang final d'un participant selon le round où il a été éliminé.
 *   • Vainqueur (jamais éliminé)     → 1
 *   • Perdant de la finale           → 2
 *   • Perdant de la demi-finale      → 3 (ex æquo avec l'autre demi-perdant)
 *   • Perdant du quart               → 5 (ex æquo × 4)
 *   • Perdant du huitième            → 9 (ex æquo × 8)
 *   • etc.
 *
 * Formule : à un round R sur un total N, il y a `capacity / 2^R` gagnants
 * (survivants). Les perdants de ce round partagent tous le rang :
 *   rank = capacity / 2^R + 1
 * Exemple capacity=16, R=1 (huitième) : 16/2 = 8 gagnants → perdants au rang 9.
 * R=2 (quart) : 16/4 = 4 gagnants → perdants au rang 5.
 * R=3 (demi) : 16/8 = 2 gagnants → perdants au rang 3.
 * R=4 (finale) : 16/16 = 1 gagnant (rang 1) → perdant au rang 2.
 */
export function positionForLoserAtRound(capacity: number, roundIndex: number): number {
  return capacity / Math.pow(2, roundIndex) + 1;
}

/* ── Construction du bracket initial ──────────────────────────────────────── */

export interface SeedInput {
  userId: string;
  displayName: string;
  /** v14.14 — 2ᵉ coéquipier pour un seed « équipe » (Carrée royale). */
  userId2?: string;
  displayName2?: string;
}

/**
 * v14.14 — Forme des ÉQUIPES de 2 à partir d'une liste de participants
 * (Carrée royale). Fonction PURE : le mélange aléatoire éventuel est fait
 * en amont par l'appelant. Paire les participants consécutifs :
 *   [p0,p1,p2,p3] → [{p0,p1}, {p2,p3}].
 * Lève si le nombre de participants est impair.
 */
export function formTeamSeeds(participants: { userId: string; displayName: string }[]): SeedInput[] {
  if (participants.length % 2 !== 0) {
    throw new Error(`Nombre de participants impair (${participants.length}) : impossible de former des équipes de 2.`);
  }
  const seeds: SeedInput[] = [];
  for (let i = 0; i < participants.length; i += 2) {
    seeds.push({
      userId: participants[i].userId,
      displayName: participants[i].displayName,
      userId2: participants[i + 1].userId,
      displayName2: participants[i + 1].displayName,
    });
  }
  return seeds;
}

/**
 * Construit l'arbre vide à partir de la liste des participants seed
 * (déjà triés ou mélangés selon la politique de seeding). Renvoie tous
 * les rounds ; le round 1 est alimenté avec les paires seed[i]/seed[i+1].
 * Les rounds suivants ont des slots vides que `advanceBracket` remplira
 * au fur et à mesure des victoires.
 *
 * Convention pairing : match 0 = seed[0] vs seed[1], match 1 = seed[2] vs
 * seed[3], etc. Le gagnant du match k va vers le match `floor(k/2)` du
 * round suivant, sur le slot A si k pair, B si k impair.
 */
export function buildInitialBracket(leafCount: number, seeds: SeedInput[]): BracketTree {
  if (seeds.length !== leafCount) {
    throw new Error(`Nombre de seeds (${seeds.length}) != nombre de feuilles (${leafCount})`);
  }
  // v14.14 — `leafCount` = nombre de feuilles du bracket. Pour les formats
  // 1 vs 1 (Duo/Hybrid) c'est la capacité en joueurs ; pour Carrée royale
  // c'est le nombre d'ÉQUIPES (capacity / 2). Chaque seed peut porter 2 users.
  const totalRounds = roundCountForCapacity(leafCount);
  const rounds: BracketRound[] = [];
  const emptySlot = (): BracketSlot => ({ userId: null, seedIndex: null, displayName: '', userId2: null, displayName2: '' });
  const seedSlot = (idx: number): BracketSlot => ({
    userId: seeds[idx].userId, seedIndex: idx, displayName: seeds[idx].displayName,
    userId2: seeds[idx].userId2 ?? null, displayName2: seeds[idx].displayName2 ?? '',
  });

  // Round 1 : alimenté depuis seeds.
  const round1Matches: BracketMatch[] = [];
  for (let i = 0; i < leafCount / 2; i++) {
    const parentIndex = Math.floor(i / 2);
    round1Matches.push({
      matchIndex: i,
      matchId: null,
      gameId: null,
      slotA: seedSlot(i * 2),
      slotB: seedSlot(i * 2 + 1),
      winner: null, scoreA: null, scoreB: null,
      startedAt: null, finishedAt: null,
      nextMatchIndex: totalRounds > 1 ? parentIndex : null,
      nextSlot: totalRounds > 1 ? (i % 2 === 0 ? 'A' : 'B') : null,
    });
  }
  rounds.push({ roundIndex: 1, label: labelForRound(leafCount, 1), matches: round1Matches });

  // Rounds suivants : matchs vides (les slots seront remplis par advanceBracket).
  for (let r = 2; r <= totalRounds; r++) {
    const matchCount = leafCount / Math.pow(2, r);
    const isLastRound = r === totalRounds;
    const matches: BracketMatch[] = [];
    for (let i = 0; i < matchCount; i++) {
      matches.push({
        matchIndex: i,
        matchId: null,
        gameId: null,
        slotA: emptySlot(),
        slotB: emptySlot(),
        winner: null, scoreA: null, scoreB: null,
        startedAt: null, finishedAt: null,
        nextMatchIndex: isLastRound ? null : Math.floor(i / 2),
        nextSlot: isLastRound ? null : (i % 2 === 0 ? 'A' : 'B'),
      });
    }
    rounds.push({ roundIndex: r, label: labelForRound(leafCount, r), matches });
  }

  return { rounds, builtAt: new Date(), lastCompletedRound: 0 };
}

/* ── Avance : rapporter le résultat d'un match dans l'arbre ──────────────── */

export interface AdvanceInput {
  roundIndex: number;         // round du match qui vient de finir (1-based)
  matchIndex: number;         // index dans ce round
  winner: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  gameId: string | null;      // ref Game archivée
  matchId?: string | null;    // ref Match (utile pour debug/lookup)
  finishedAt?: Date;
}

/**
 * Met à jour le bracket : marque le match fini, propage le gagnant au
 * round suivant. Idempotent (si le match était déjà marqué fini avec le
 * même résultat, ne fait rien).
 *
 * Renvoie :
 *   • updated       : le bracket muté (référence, aussi renvoyée par commodité)
 *   • propagated    : true si le gagnant a été inséré dans un slot parent
 *   • roundJustDone : numéro du round qui vient d'être complètement fini
 *                     (tous ses matchs ont un winner), ou null.
 *   • tournamentDone: true si la finale vient d'être jouée.
 */
export function advanceBracket(bracket: BracketTree, input: AdvanceInput): {
  updated: BracketTree;
  propagated: boolean;
  roundJustDone: number | null;
  tournamentDone: boolean;
} {
  const round = bracket.rounds.find((r) => r.roundIndex === input.roundIndex);
  if (!round) throw new Error(`Round ${input.roundIndex} introuvable dans le bracket`);
  const match = round.matches[input.matchIndex];
  if (!match) throw new Error(`Match ${input.matchIndex} introuvable dans round ${input.roundIndex}`);

  // Idempotence : si déjà marqué fini avec le même winner, ne rien refaire.
  if (match.winner && match.finishedAt) {
    if (match.winner === input.winner && match.gameId === input.gameId) {
      return { updated: bracket, propagated: false, roundJustDone: null, tournamentDone: false };
    }
  }

  match.winner = input.winner;
  match.scoreA = input.scoreA;
  match.scoreB = input.scoreB;
  match.gameId = input.gameId;
  if (input.matchId) match.matchId = input.matchId;
  match.finishedAt = input.finishedAt ?? new Date();

  const winnerSlot = input.winner === 'A' ? match.slotA : match.slotB;

  // Propagation au parent (si pas la finale).
  let propagated = false;
  if (match.nextMatchIndex != null && match.nextSlot) {
    const nextRound = bracket.rounds.find((r) => r.roundIndex === input.roundIndex + 1);
    if (nextRound) {
      const parent = nextRound.matches[match.nextMatchIndex];
      if (parent) {
        const target = match.nextSlot === 'A' ? parent.slotA : parent.slotB;
        target.userId = winnerSlot.userId;
        target.seedIndex = winnerSlot.seedIndex;
        target.displayName = winnerSlot.displayName;
        target.userId2 = winnerSlot.userId2 ?? null;   // v14.14 — propage le coéquipier (Carrée royale)
        target.displayName2 = winnerSlot.displayName2 ?? '';
        propagated = true;
      }
    }
  }

  // Round terminé ?
  const roundDone = round.matches.every((m) => m.winner);
  const roundJustDone = roundDone && bracket.lastCompletedRound < input.roundIndex ? input.roundIndex : null;
  if (roundJustDone) bracket.lastCompletedRound = roundJustDone;

  // Tournoi terminé = finale finie (dernier round complet).
  const totalRounds = bracket.rounds.length;
  const tournamentDone = roundDone && input.roundIndex === totalRounds;

  return { updated: bracket, propagated, roundJustDone, tournamentDone };
}

/* ── Calcul des positions finales ─────────────────────────────────────────── */

/**
 * Renvoie une map { userId → rang final } après un tournoi terminé.
 * Les rangs suivent les règles d'ex æquo (voir en-tête du module).
 *
 * Fonctionnement :
 *   • Pour chaque round, tous les perdants prennent le rang
 *     `capacity / 2^R + 1`.
 *   • Le vainqueur de la finale prend le rang 1.
 */
export function computeFinalPositions(bracket: BracketTree, capacity: number): Map<string, number> {
  const positions = new Map<string, number>();
  for (const round of bracket.rounds) {
    const rankOfLosers = positionForLoserAtRound(capacity, round.roundIndex);
    for (const m of round.matches) {
      if (!m.winner) continue;
      const winnerSlot = m.winner === 'A' ? m.slotA : m.slotB;
      const loserSlot = m.winner === 'A' ? m.slotB : m.slotA;
      // Le perdant prend le rang de ce round (les 2 coéquipiers en Carrée royale).
      if (loserSlot.userId && !positions.has(loserSlot.userId)) {
        positions.set(loserSlot.userId, rankOfLosers);
      }
      if (loserSlot.userId2 && !positions.has(loserSlot.userId2)) {
        positions.set(loserSlot.userId2, rankOfLosers);
      }
      // Si c'est la finale, le vainqueur prend le rang 1 (les 2 coéquipiers).
      if (round.roundIndex === bracket.rounds.length && winnerSlot.userId) {
        positions.set(winnerSlot.userId, 1);
        if (winnerSlot.userId2) positions.set(winnerSlot.userId2, 1);
      }
    }
  }
  return positions;
}

/* ── Recherche d'un match par matchId (pour hook fin de match) ────────────── */

export function findBracketMatchByMatchId(bracket: BracketTree, matchId: string): { roundIndex: number; matchIndex: number } | null {
  for (const round of bracket.rounds) {
    for (const m of round.matches) {
      if (m.matchId && String(m.matchId) === String(matchId)) {
        return { roundIndex: round.roundIndex, matchIndex: m.matchIndex };
      }
    }
  }
  return null;
}
