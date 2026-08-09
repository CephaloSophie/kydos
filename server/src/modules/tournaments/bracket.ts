/* =============================================================================
 * TOURNAMENTS · bracket.ts — Génération et progression du bracket.
 * -----------------------------------------------------------------------------
 * Élimination directe pure : au round N, on apparie les survivants du round
 * précédent 2 par 2 (ou 4 par 4 pour ROYAL_SQUARE, mais avec 2 vainqueurs). Ce
 * fichier est PUR (aucune I/O) pour être trivialement testable.
 *
 * Les matchs eux-mêmes sont créés/joués par le module matches ; ici on gère
 * uniquement la logique de progression : « qui affronte qui à ce round ? ».
 * ========================================================================== */

export interface BracketSlot {
  /** Position au round 1 (0..capacity-1) après seed. */
  seedIndex: number;
  userId: string;
  robotIds: string[];
  /** Round où le participant a été éliminé (null s'il est encore là). */
  eliminatedAtRound: number | null;
}

/** Nombre de rounds nécessaires pour épuiser un bracket. */
export function roundCount(capacity: number): number {
  // capacity 4 → 2 rounds (demi, finale). 8 → 3. 128 → 7.
  return Math.log2(capacity);
}

/** Survivants au début du round N (participants non éliminés à un round antérieur). */
export function survivorsAtStartOfRound(slots: BracketSlot[], round: number): BracketSlot[] {
  return slots.filter((s) => s.eliminatedAtRound === null || s.eliminatedAtRound >= round);
}

/**
 * Appariement FIFO strict au round donné : consomme les survivants par blocs de 2
 * (formats à 2 joueurs) ou 4 (ROYAL_SQUARE). Retourne les groupes appariés.
 */
export function pairForRound(survivors: BracketSlot[], playersPerMatch: 2 | 4): BracketSlot[][] {
  const pairs: BracketSlot[][] = [];
  for (let i = 0; i + playersPerMatch <= survivors.length; i += playersPerMatch) {
    pairs.push(survivors.slice(i, i + playersPerMatch));
  }
  return pairs;
}

/** Vrai si le tournoi est fini (un seul survivant en formats 1v1, deux en équipe). */
export function isBracketFinished(slots: BracketSlot[], playersPerMatch: 2 | 4): boolean {
  const alive = slots.filter((s) => s.eliminatedAtRound === null);
  return alive.length <= (playersPerMatch === 4 ? 2 : 1);
}
