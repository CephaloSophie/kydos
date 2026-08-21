/* =============================================================================
 * SCORING · scoreKydos.ts — Modèle UNIQUE et CENTRAL de score & niveau Kýdos.
 * -----------------------------------------------------------------------------
 * C'est LE cœur du système de points de l'application. Tout — joueurs comme
 * robots — gagne du score via ce modèle, et son niveau en est dérivé. Le
 * back-office est l'unique endroit qui édite cette configuration ; le reste de
 * l'application ne fait que la LIRE et l'APPLIQUER.
 *
 * Fonctions 100 % PURES (aucune I/O) → testables isolément, rejouables partout
 * (serveur, back-office, mobile). Aucune valeur de score n'est calculée ailleurs.
 *
 * Trois responsabilités :
 *   1. Barème de GAIN — combien de score un gagnant reçoit après une partie /
 *      un tournoi, en fonction du barème de base, du coefficient de la partie
 *      et du coefficient du type de jeu (+ éventuel bonus lié aux jetons).
 *   2. ÉCHELLE DE NIVEAUX — le score cumulé à atteindre pour franchir chaque
 *      niveau (progression géométrique, avec surcharges manuelles possibles),
 *      et la dérivation « niveau + points accumulés dans le niveau » d'un score.
 *   3. DIAGNOSTIC — détection des incohérences d'une configuration (seuils non
 *      croissants, valeurs négatives, pourcentages irréalistes, redondances…).
 * ========================================================================== */

/** Surcharge manuelle de l'incrément d'un niveau (remplace la valeur géométrique). */
export interface LevelOverride {
  /** Niveau concerné (1 = passage du niveau 1 au niveau 2). */
  level: number;
  /** Points à accumuler DANS ce niveau pour le franchir. */
  increment: number;
}

/**
 * Configuration COMPLÈTE du modèle de score. Éditée uniquement au back-office,
 * appliquée partout. Tous les champs ont une valeur par défaut raisonnable.
 */
export interface ScoreKydosConfig {
  /** Score de base gagné par un JOUEUR (humain) gagnant. Défaut 500. */
  baseWinnerPlayer: number;
  /** Score de base gagné par un ROBOT gagnant. Défaut 500. */
  baseWinnerRobot: number;
  /** Score cible pour franchir le PREMIER niveau (niveau 1 → 2). Défaut 500. */
  firstLevelThreshold: number;
  /**
   * Pourcentage d'augmentation du seuil à chaque niveau (progression
   * géométrique). Défaut 8 ⇒ niveau n+1 coûte 8 % de plus que le niveau n.
   */
  levelUpPercent: number;
  /** Nombre de niveaux gérés par l'échelle (table pré-remplie). Défaut 200. */
  maxLevel: number;
  /**
   * Pourcentage des JETONS accumulés (gagnés / quotidiens / achetés) converti
   * en score. Défaut 0 (désactivé). Ex. 50 ⇒ +50 % des jetons en score.
   */
  tokenScorePercent: number;
  /**
   * Coefficient par TYPE de jeu (catégorie × genre), appliqué au gain. Clé au
   * format `${category}:${kind}` (ex. `tournament:royal`). Absent ⇒ 1.
   */
  gameTypeCoefficients: Record<string, number>;
  /**
   * Surcharges manuelles de l'échelle de niveaux. La table géométrique est
   * pré-remplie ; ces entrées remplacent l'incrément d'un niveau précis.
   */
  levelOverrides: LevelOverride[];
}

/** Configuration par défaut — reproduit le barème décrit dans la spécification. */
export const DEFAULT_SCORE_KYDOS: ScoreKydosConfig = {
  baseWinnerPlayer: 500,
  baseWinnerRobot: 500,
  firstLevelThreshold: 500,
  levelUpPercent: 8,
  maxLevel: 200,
  tokenScorePercent: 0,
  gameTypeCoefficients: {},
  levelOverrides: [],
};

/* ── Catégories & genres de jeu (clé de coefficient) ──────────────────────── */

/** Catégorie de partie pour le coefficient de type de jeu. */
export type GameCategory = 'tournament' | 'quick' | 'team' | 'robot';
/** Genre de table (barème/format de jeu). */
export type GameKind = 'acier' | 'hybride' | 'royal';

/** Construit la clé de coefficient `${category}:${kind}`. */
export function gameTypeKey(category: GameCategory, kind: GameKind): string {
  return `${category}:${kind}`;
}

/** Toutes les combinaisons possibles (pour pré-remplir/valider la matrice). */
export const GAME_CATEGORIES: GameCategory[] = ['tournament', 'quick', 'team', 'robot'];
export const GAME_KINDS: GameKind[] = ['acier', 'hybride', 'royal'];

/**
 * Coefficient de type de jeu lu dans la config (défaut 1 si non défini ou
 * invalide). Toujours ≥ 0 côté lecture — le diagnostic signale les valeurs
 * douteuses, mais l'application ne doit jamais planter ni soustraire du score.
 */
export function gameTypeCoefficient(config: ScoreKydosConfig, category: GameCategory, kind: GameKind): number {
  const raw = config.gameTypeCoefficients?.[gameTypeKey(category, kind)];
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : 1;
}

/* ── 1. Barème de GAIN ────────────────────────────────────────────────────── */

/** Entrée du calcul de gain d'une partie/tournoi. */
export interface ScoreGainInput {
  /** Le gagnant est-il un robot ? (sinon joueur humain). */
  isRobot: boolean;
  /** Coefficient de la partie/tournoi (propriété back-office, défaut 1). */
  partieCoefficient: number;
  /** Coefficient du type de jeu (catégorie × genre, défaut 1). */
  gameTypeCoefficient: number;
  /** Jetons accumulés à créditer en score (via `tokenScorePercent`). Défaut 0. */
  tokensAccumulated?: number;
}

/** Détail du gain (traçable / affichable). */
export interface ScoreGainBreakdown {
  base: number;
  partieCoefficient: number;
  gameTypeCoefficient: number;
  tokenBonus: number;
  /** Total ENTIER ajouté au score cumulé (jamais négatif). */
  total: number;
}

const safeCoef = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 1);
const safeNonNeg = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/**
 * Score gagné par un GAGNANT après une partie / un tournoi.
 *   total = base × coefPartie × coefTypeJeu + (tokenScorePercent % des jetons)
 * Le résultat est arrondi et borné à ≥ 0 (aucun gain négatif possible).
 */
export function computeScoreGain(config: ScoreKydosConfig, input: ScoreGainInput): ScoreGainBreakdown {
  const base = Math.max(0, input.isRobot ? config.baseWinnerRobot : config.baseWinnerPlayer);
  const partieCoefficient = safeCoef(input.partieCoefficient);
  const gameTypeCoef = safeCoef(input.gameTypeCoefficient);
  const tokenPct = Math.max(0, config.tokenScorePercent ?? 0);
  const tokenBonus = Math.round((tokenPct / 100) * safeNonNeg(input.tokensAccumulated));
  const total = Math.max(0, Math.round(base * partieCoefficient * gameTypeCoef) + tokenBonus);
  return { base, partieCoefficient, gameTypeCoefficient: gameTypeCoef, tokenBonus, total };
}

/* ── 2. ÉCHELLE DE NIVEAUX ─────────────────────────────────────────────────── */

/** Une ligne de l'échelle : incrément du niveau + cumul pour l'atteindre. */
export interface LevelRow {
  /** Niveau (1-indexé). */
  level: number;
  /** Points à accumuler DANS ce niveau pour le franchir (incrément). */
  increment: number;
  /** Score cumulé total pour ATTEINDRE ce niveau (0 au niveau 1). */
  cumulative: number;
  /** Score cumulé total pour franchir ce niveau (= cumulative + increment). */
  cumulativeNext: number;
  /** L'incrément provient-il d'une surcharge manuelle ? */
  overridden: boolean;
}

/** Incrément géométrique « pur » du niveau `level` (avant surcharge). */
function geometricIncrement(config: ScoreKydosConfig, level: number): number {
  const first = config.firstLevelThreshold;
  const factor = 1 + config.levelUpPercent / 100;
  return Math.round(first * Math.pow(factor, level - 1));
}

/**
 * Construit l'échelle COMPLÈTE des niveaux (1..maxLevel), incréments géométriques
 * puis surcharges manuelles appliquées, avec les cumuls recalculés. Fonction
 * pure et déterministe — c'est la table « pré-remplie » visible au back-office.
 */
export function buildLevelTable(config: ScoreKydosConfig): LevelRow[] {
  const overrideByLevel = new Map<number, number>();
  for (const o of config.levelOverrides ?? []) {
    if (Number.isInteger(o.level) && o.level >= 1) overrideByLevel.set(o.level, o.increment);
  }
  const maxLevel = Math.max(1, Math.floor(config.maxLevel || 1));
  const rows: LevelRow[] = [];
  let cumulative = 0;
  for (let level = 1; level <= maxLevel; level++) {
    const override = overrideByLevel.get(level);
    const overridden = typeof override === 'number' && Number.isFinite(override);
    const increment = overridden ? Math.round(override as number) : geometricIncrement(config, level);
    rows.push({ level, increment, cumulative, cumulativeNext: cumulative + increment, overridden });
    cumulative += increment;
  }
  return rows;
}

/** Dérivation du niveau à partir d'un score cumulé. */
export interface LevelProgress {
  /** Niveau courant (1..maxLevel). */
  level: number;
  /** Points accumulés DANS le niveau courant (0 au début du niveau). */
  pointsInLevel: number;
  /** Points restants pour franchir le niveau courant (0 au niveau max). */
  pointsToNext: number;
  /** Incrément total du niveau courant (pointsInLevel + pointsToNext). */
  levelSpan: number;
  /** Progression dans le niveau, de 0 à 1 (1 au niveau max). */
  ratio: number;
}

/**
 * Dérive « niveau + points dans le niveau » d'un score cumulé, selon l'échelle.
 * Fonction pure : c'est la SEULE façon officielle de calculer un niveau — plus
 * aucun `1 + floor(score/100)` en dur ailleurs.
 */
export function levelForScore(config: ScoreKydosConfig, totalScore: number): LevelProgress {
  const table = buildLevelTable(config);
  const score = Math.max(0, Math.floor(totalScore || 0));
  // Dernière ligne dont le cumul d'ENTRÉE est ≤ score = niveau courant.
  let row = table[0];
  for (const r of table) {
    if (r.cumulative <= score) row = r; else break;
  }
  const isMax = row.level >= table[table.length - 1].level;
  const pointsInLevel = score - row.cumulative;
  if (isMax) {
    return { level: row.level, pointsInLevel, pointsToNext: 0, levelSpan: row.increment, ratio: 1 };
  }
  const pointsToNext = Math.max(0, row.cumulativeNext - score);
  const levelSpan = row.increment;
  const ratio = levelSpan > 0 ? Math.min(1, pointsInLevel / levelSpan) : 1;
  return { level: row.level, pointsInLevel, pointsToNext, levelSpan, ratio };
}

/* ── 3. DIAGNOSTIC ─────────────────────────────────────────────────────────── */

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticIssue {
  severity: DiagnosticSeverity;
  /** Code stable (pour tests / i18n éventuel). */
  code: string;
  /** Message lisible (français) décrivant l'incohérence. */
  message: string;
}

/** Bornes de « réalisme » (au-delà : avertissement, pas blocage). */
const REALISM = {
  maxLevelUpPercent: 100,   // > 100 %/niveau : croissance irréaliste
  maxTokenPercent: 200,     // > 200 % des jetons : irréaliste
  maxLevels: 1000,          // table démesurée
  maxCoefficient: 100,      // coefficient énorme
};

/**
 * Analyse une configuration et renvoie la liste des incohérences détectées,
 * triées par gravité (erreurs d'abord). Une liste vide = configuration saine.
 *
 * Détecte notamment (demande produit) : seuils NON croissants (ex. passage 1→2
 * à 400 pts mais 3→4 à 350 pts), scores négatifs, pourcentages irréalistes,
 * coefficients invalides, surcharges hors bornes, redondances.
 */
export function diagnoseScoreKydos(config: ScoreKydosConfig): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const err = (code: string, message: string) => issues.push({ severity: 'error', code, message });
  const warn = (code: string, message: string) => issues.push({ severity: 'warning', code, message });
  const info = (code: string, message: string) => issues.push({ severity: 'info', code, message });

  // Barèmes de base.
  if (!(config.baseWinnerPlayer >= 0)) err('base-player-negative', `Score de base joueur invalide (${config.baseWinnerPlayer}) : doit être ≥ 0.`);
  if (!(config.baseWinnerRobot >= 0)) err('base-robot-negative', `Score de base robot invalide (${config.baseWinnerRobot}) : doit être ≥ 0.`);
  if (config.baseWinnerPlayer === 0 && config.baseWinnerRobot === 0) warn('base-all-zero', 'Les deux scores de base sont à 0 : personne ne gagnera de points.');

  // Seuil initial.
  if (!(config.firstLevelThreshold > 0)) err('first-threshold-invalid', `Seuil du premier niveau invalide (${config.firstLevelThreshold}) : doit être > 0.`);

  // Pourcentage de passage de niveau.
  if (!(config.levelUpPercent >= 0)) err('levelup-negative', `Pourcentage de passage de niveau négatif (${config.levelUpPercent} %) : les niveaux deviendraient moins chers, progression incohérente.`);
  else if (config.levelUpPercent === 0) info('levelup-zero', 'Pourcentage de passage à 0 % : tous les niveaux coûtent le même nombre de points.');
  else if (config.levelUpPercent > REALISM.maxLevelUpPercent) warn('levelup-unrealistic', `Pourcentage de passage très élevé (${config.levelUpPercent} %) : progression irréaliste.`);

  // Nombre de niveaux.
  if (!(config.maxLevel >= 1)) err('maxlevel-invalid', `Nombre de niveaux invalide (${config.maxLevel}) : doit être ≥ 1.`);
  else if (config.maxLevel > REALISM.maxLevels) warn('maxlevel-huge', `Nombre de niveaux très grand (${config.maxLevel}).`);

  // Pourcentage jetons.
  if (!(config.tokenScorePercent >= 0)) err('token-percent-negative', `Pourcentage jetons négatif (${config.tokenScorePercent} %).`);
  else if (config.tokenScorePercent > REALISM.maxTokenPercent) warn('token-percent-unrealistic', `Pourcentage jetons très élevé (${config.tokenScorePercent} %) : peu réaliste.`);

  // Coefficients de type de jeu.
  const seenKeys = new Set<string>();
  for (const [key, value] of Object.entries(config.gameTypeCoefficients ?? {})) {
    if (seenKeys.has(key)) warn('coef-duplicate', `Coefficient de type de jeu redondant : « ${key} ».`);
    seenKeys.add(key);
    if (!(typeof value === 'number' && Number.isFinite(value))) err('coef-invalid', `Coefficient « ${key} » non numérique.`);
    else if (value < 0) err('coef-negative', `Coefficient « ${key} » négatif (${value}) : soustrairait du score.`);
    else if (value === 0) warn('coef-zero', `Coefficient « ${key} » à 0 : aucune partie de ce type ne rapportera de points.`);
    else if (value > REALISM.maxCoefficient) warn('coef-huge', `Coefficient « ${key} » démesuré (${value}).`);
  }

  // Surcharges de niveaux : bornes, doublons, valeurs.
  const overrideLevels = new Set<number>();
  for (const o of config.levelOverrides ?? []) {
    if (!Number.isInteger(o.level) || o.level < 1 || o.level > config.maxLevel) {
      err('override-out-of-range', `Surcharge de niveau hors bornes (niveau ${o.level}, plage 1..${config.maxLevel}).`);
      continue;
    }
    if (overrideLevels.has(o.level)) warn('override-duplicate', `Surcharge redondante pour le niveau ${o.level}.`);
    overrideLevels.add(o.level);
    if (!(typeof o.increment === 'number' && Number.isFinite(o.increment) && o.increment > 0)) {
      err('override-invalid', `Surcharge du niveau ${o.level} invalide (${o.increment}) : doit être > 0.`);
    }
  }

  // Cohérence de l'échelle EFFECTIVE : les incréments doivent être croissants
  // (ou au moins non décroissants). Un « creux » = incohérence produit.
  if (config.maxLevel >= 1 && config.firstLevelThreshold > 0) {
    const table = buildLevelTable(config);
    for (let i = 1; i < table.length; i++) {
      if (table[i].increment < table[i - 1].increment) {
        err(
          'levels-not-increasing',
          `Échelle incohérente : franchir le niveau ${table[i].level} coûte ${table[i].increment} pts, moins que le niveau ${table[i - 1].level} (${table[i - 1].increment} pts).`,
        );
        break; // un seul rapport suffit à signaler le problème.
      }
    }
  }

  // Tri : erreurs, puis avertissements, puis infos (ordre stable par ailleurs).
  const rank: Record<DiagnosticSeverity, number> = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/**
 * Normalise/complète une configuration partielle (ex. document Mongo) en une
 * `ScoreKydosConfig` sûre à consommer, en comblant chaque champ manquant par
 * son défaut. Ne juge pas la cohérence (c'est le rôle de `diagnoseScoreKydos`).
 */
export function resolveScoreKydosConfig(partial?: Partial<ScoreKydosConfig> | null): ScoreKydosConfig {
  const p = partial ?? {};
  return {
    baseWinnerPlayer: numOr(p.baseWinnerPlayer, DEFAULT_SCORE_KYDOS.baseWinnerPlayer),
    baseWinnerRobot: numOr(p.baseWinnerRobot, DEFAULT_SCORE_KYDOS.baseWinnerRobot),
    firstLevelThreshold: numOr(p.firstLevelThreshold, DEFAULT_SCORE_KYDOS.firstLevelThreshold),
    levelUpPercent: numOr(p.levelUpPercent, DEFAULT_SCORE_KYDOS.levelUpPercent),
    maxLevel: numOr(p.maxLevel, DEFAULT_SCORE_KYDOS.maxLevel),
    tokenScorePercent: numOr(p.tokenScorePercent, DEFAULT_SCORE_KYDOS.tokenScorePercent),
    gameTypeCoefficients: { ...(p.gameTypeCoefficients ?? {}) },
    levelOverrides: Array.isArray(p.levelOverrides) ? p.levelOverrides.map((o) => ({ level: o.level, increment: o.increment })) : [],
  };
}

const numOr = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
