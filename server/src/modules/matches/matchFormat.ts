/* =============================================================================
 * MATCHES · matchFormat.ts — Enum des 3 formats de match + catalogue économique.
 * -----------------------------------------------------------------------------
 * SOURCE UNIQUE de vérité pour les règles économiques de chaque format. Pour
 * ajuster un prix, un gain ou ajouter un 4ᵉ format, on ne touche QUE ce fichier.
 *
 * Trois formats :
 *   • DUO_STEEL       — 2 robots vs 2 robots, 100 % back-end, aucun visuel,
 *                       aucun délai (partie jouée instantanément dans un worker).
 *   • HYBRID_ALLIANCE — humain + robot vs humain + robot (2 humains).
 *   • ROYAL_SQUARE    — 4 humains.
 *
 * Terminologie : on parle désormais de « Match » (immédiat, 1 partie) et
 * « Tournament » (bracket planifié). Le mot « compétition » (ambigu) disparaît.
 * ========================================================================== */

export enum MatchFormat {
  DUO_STEEL = 'duo_steel',
  HYBRID_ALLIANCE = 'hybrid_alliance',
  ROYAL_SQUARE = 'royal_square',
}

export interface MatchFormatRules {
  /** Coût d'inscription payé par chaque joueur (jetons). */
  buyInPerPlayer: number;
  /** Gain crédité au vainqueur (jetons). */
  prizePerWinner: number;
  /** Nombre de joueurs humains distincts nécessaires. */
  humansPerMatch: number;
  /** Nombre de robots distincts nécessaires. */
  robotsPerMatch: number;
  /**
   * Nombre de robots CO-ÉQUIPIERS à fournir par chaque humain à l'inscription
   * (ils jouent effectivement en équipe avec le joueur).
   */
  robotsPerPlayer: number;
  /**
   * v14.5 — Est-ce qu'un robot REMPLAÇANT est attendu en plus (pour prendre
   * la main quand le joueur s'absente ou dépasse le temps) ?
   * • false pour DUO_STEEL (pas d'humain, pas de remplacement possible).
   * • true pour HYBRID_ALLIANCE et ROYAL_SQUARE.
   */
  requiresSubstitute: boolean;
  /** Nombre de sièges à la table (toujours 4 à la belote contrée). */
  seatsTotal: 4;
  /** Nombre de vainqueurs (2 pour les formats en équipe, 1 pour un solo). */
  winnersPerMatch: number;
  /** Retour économique attendu pour kydos (positif = maison bénéficiaire). */
  houseRake: number;
  /** Vrai si le match est purement back-end (aucun broadcast temps réel). */
  isHeadless: boolean;
  /** Libellé UI. */
  label: string;
  /** Description courte. */
  description: string;
}

/** Catalogue immuable — validé par un test de cohérence économique. */
export const MATCH_FORMAT_CATALOG: Readonly<Record<MatchFormat, Readonly<MatchFormatRules>>> = Object.freeze({
  [MatchFormat.DUO_STEEL]: Object.freeze({
    buyInPerPlayer: 200,   // 100 par robot × 2 robots
    prizePerWinner: 150,
    humansPerMatch: 2,
    robotsPerMatch: 4,
    robotsPerPlayer: 2,
    requiresSubstitute: false,   // aucun humain, aucune substitution
    seatsTotal: 4,
    winnersPerMatch: 1,    // le propriétaire de l'équipe vainqueur (2 robots)
    houseRake: 50,         // 200×2 - 150×2 = 100 ; part propriétaire = 50 (spec)
    isHeadless: true,
    label: 'Duo d\u2019acier',
    description: '2 robots contre 2 robots — 100 % en coulisses.',
  }),
  [MatchFormat.HYBRID_ALLIANCE]: Object.freeze({
    buyInPerPlayer: 150,
    prizePerWinner: 225,
    humansPerMatch: 2,
    robotsPerMatch: 2,
    robotsPerPlayer: 1,
    requiresSubstitute: true,   // 1 coéquipier + 1 remplaçant
    seatsTotal: 4,
    winnersPerMatch: 1,    // l'humain vainqueur (son robot coéquipier gagne avec)
    houseRake: 75,
    isHeadless: false,
    label: 'Alliance hybride',
    description: 'Toi + ton robot contre un autre binôme humain/robot.',
  }),
  [MatchFormat.ROYAL_SQUARE]: Object.freeze({
    buyInPerPlayer: 100,
    prizePerWinner: 150,
    humansPerMatch: 4,
    robotsPerMatch: 0,
    robotsPerPlayer: 0,
    requiresSubstitute: true,   // pas de coéquipier robot, mais 1 remplaçant obligatoire
    seatsTotal: 4,
    winnersPerMatch: 2,    // les 2 humains de l'équipe gagnante
    houseRake: 100,        // 100×4 - 150×2 = 100
    isHeadless: false,
    label: 'Carr\u00e9e royale',
    description: 'Quatre humains, deux \u00e9quipes, la table couronn\u00e9e.',
  }),
});

/** Récupère les règles d'un format ; lève si le format est inconnu. */
export function getMatchFormatRules(format: MatchFormat): MatchFormatRules {
  const rules = MATCH_FORMAT_CATALOG[format];
  if (!rules) throw new Error(`Format inconnu : ${format}`);
  return rules;
}

/** Vérifie la cohérence économique interne d'un format (utilisé en test). */
export function verifyEconomics(format: MatchFormat): { collected: number; paid: number; rake: number; balanced: boolean } {
  const r = getMatchFormatRules(format);
  const collected = r.buyInPerPlayer * r.humansPerMatch;
  const paid = r.prizePerWinner * r.winnersPerMatch;
  const rake = collected - paid;
  return { collected, paid, rake, balanced: rake === r.houseRake };
}
