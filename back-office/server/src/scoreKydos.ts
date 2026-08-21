/* =============================================================================
 * BACK-OFFICE · scoreKydos.ts — Miroir de belote-core `scoring/scoreKydos.ts`.
 * -----------------------------------------------------------------------------
 * Le back-office ne dépend pas de belote-core : on reproduit ICI, à l'identique,
 * la logique PURE du modèle de score (résolution, échelle de niveaux, barème de
 * gain, diagnostic). Toute évolution doit rester synchronisée avec le cœur.
 * ========================================================================== */

export interface LevelOverride { level: number; increment: number }

export interface ScoreKydosConfig {
  baseWinnerPlayer: number;
  baseWinnerRobot: number;
  firstLevelThreshold: number;
  levelUpPercent: number;
  maxLevel: number;
  tokenScorePercent: number;
  gameTypeCoefficients: Record<string, number>;
  levelOverrides: LevelOverride[];
}

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

export type GameCategory = 'tournament' | 'quick' | 'team' | 'robot';
export type GameKind = 'acier' | 'hybride' | 'royal';
export const GAME_CATEGORIES: GameCategory[] = ['tournament', 'quick', 'team', 'robot'];
export const GAME_KINDS: GameKind[] = ['acier', 'hybride', 'royal'];
export const gameTypeKey = (category: GameCategory, kind: GameKind): string => `${category}:${kind}`;

const numOr = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

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

/* ── Barème de gain ────────────────────────────────────────────────────────── */

export interface ScoreGainBreakdown { base: number; partieCoefficient: number; gameTypeCoefficient: number; tokenBonus: number; total: number }
const safeCoef = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 1);
const safeNonNeg = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

export function gameTypeCoefficient(config: ScoreKydosConfig, category: GameCategory, kind: GameKind): number {
  const raw = config.gameTypeCoefficients?.[gameTypeKey(category, kind)];
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : 1;
}

export function computeScoreGain(config: ScoreKydosConfig, input: { isRobot: boolean; partieCoefficient: number; gameTypeCoefficient: number; tokensAccumulated?: number }): ScoreGainBreakdown {
  const base = Math.max(0, input.isRobot ? config.baseWinnerRobot : config.baseWinnerPlayer);
  const partieCoefficient = safeCoef(input.partieCoefficient);
  const gameTypeCoef = safeCoef(input.gameTypeCoefficient);
  const tokenPct = Math.max(0, config.tokenScorePercent ?? 0);
  const tokenBonus = Math.round((tokenPct / 100) * safeNonNeg(input.tokensAccumulated));
  const total = Math.max(0, Math.round(base * partieCoefficient * gameTypeCoef) + tokenBonus);
  return { base, partieCoefficient, gameTypeCoefficient: gameTypeCoef, tokenBonus, total };
}

/* ── Échelle de niveaux ────────────────────────────────────────────────────── */

export interface LevelRow { level: number; increment: number; cumulative: number; cumulativeNext: number; overridden: boolean }

function geometricIncrement(config: ScoreKydosConfig, level: number): number {
  const factor = 1 + config.levelUpPercent / 100;
  return Math.round(config.firstLevelThreshold * Math.pow(factor, level - 1));
}

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

export interface LevelProgress { level: number; pointsInLevel: number; pointsToNext: number; levelSpan: number; ratio: number }

export function levelForScore(config: ScoreKydosConfig, totalScore: number): LevelProgress {
  const table = buildLevelTable(config);
  const score = Math.max(0, Math.floor(totalScore || 0));
  let row = table[0];
  for (const r of table) { if (r.cumulative <= score) row = r; else break; }
  const isMax = row.level >= table[table.length - 1].level;
  const pointsInLevel = score - row.cumulative;
  if (isMax) return { level: row.level, pointsInLevel, pointsToNext: 0, levelSpan: row.increment, ratio: 1 };
  const pointsToNext = Math.max(0, row.cumulativeNext - score);
  const ratio = row.increment > 0 ? Math.min(1, pointsInLevel / row.increment) : 1;
  return { level: row.level, pointsInLevel, pointsToNext, levelSpan: row.increment, ratio };
}

/* ── Diagnostic ────────────────────────────────────────────────────────────── */

export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export interface DiagnosticIssue { severity: DiagnosticSeverity; code: string; message: string }

const REALISM = { maxLevelUpPercent: 100, maxTokenPercent: 200, maxLevels: 1000, maxCoefficient: 100 };

export function diagnoseScoreKydos(config: ScoreKydosConfig): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const err = (code: string, message: string) => issues.push({ severity: 'error', code, message });
  const warn = (code: string, message: string) => issues.push({ severity: 'warning', code, message });
  const info = (code: string, message: string) => issues.push({ severity: 'info', code, message });

  if (!(config.baseWinnerPlayer >= 0)) err('base-player-negative', `Score de base joueur invalide (${config.baseWinnerPlayer}) : doit être ≥ 0.`);
  if (!(config.baseWinnerRobot >= 0)) err('base-robot-negative', `Score de base robot invalide (${config.baseWinnerRobot}) : doit être ≥ 0.`);
  if (config.baseWinnerPlayer === 0 && config.baseWinnerRobot === 0) warn('base-all-zero', 'Les deux scores de base sont à 0 : personne ne gagnera de points.');

  if (!(config.firstLevelThreshold > 0)) err('first-threshold-invalid', `Seuil du premier niveau invalide (${config.firstLevelThreshold}) : doit être > 0.`);

  if (!(config.levelUpPercent >= 0)) err('levelup-negative', `Pourcentage de passage de niveau négatif (${config.levelUpPercent} %) : les niveaux deviendraient moins chers, progression incohérente.`);
  else if (config.levelUpPercent === 0) info('levelup-zero', 'Pourcentage de passage à 0 % : tous les niveaux coûtent le même nombre de points.');
  else if (config.levelUpPercent > REALISM.maxLevelUpPercent) warn('levelup-unrealistic', `Pourcentage de passage très élevé (${config.levelUpPercent} %) : progression irréaliste.`);

  if (!(config.maxLevel >= 1)) err('maxlevel-invalid', `Nombre de niveaux invalide (${config.maxLevel}) : doit être ≥ 1.`);
  else if (config.maxLevel > REALISM.maxLevels) warn('maxlevel-huge', `Nombre de niveaux très grand (${config.maxLevel}).`);

  if (!(config.tokenScorePercent >= 0)) err('token-percent-negative', `Pourcentage jetons négatif (${config.tokenScorePercent} %).`);
  else if (config.tokenScorePercent > REALISM.maxTokenPercent) warn('token-percent-unrealistic', `Pourcentage jetons très élevé (${config.tokenScorePercent} %) : peu réaliste.`);

  const seenKeys = new Set<string>();
  for (const [key, value] of Object.entries(config.gameTypeCoefficients ?? {})) {
    if (seenKeys.has(key)) warn('coef-duplicate', `Coefficient de type de jeu redondant : « ${key} ».`);
    seenKeys.add(key);
    if (!(typeof value === 'number' && Number.isFinite(value))) err('coef-invalid', `Coefficient « ${key} » non numérique.`);
    else if (value < 0) err('coef-negative', `Coefficient « ${key} » négatif (${value}) : soustrairait du score.`);
    else if (value === 0) warn('coef-zero', `Coefficient « ${key} » à 0 : aucune partie de ce type ne rapportera de points.`);
    else if (value > REALISM.maxCoefficient) warn('coef-huge', `Coefficient « ${key} » démesuré (${value}).`);
  }

  const overrideLevels = new Set<number>();
  for (const o of config.levelOverrides ?? []) {
    if (!Number.isInteger(o.level) || o.level < 1 || o.level > config.maxLevel) { err('override-out-of-range', `Surcharge de niveau hors bornes (niveau ${o.level}, plage 1..${config.maxLevel}).`); continue; }
    if (overrideLevels.has(o.level)) warn('override-duplicate', `Surcharge redondante pour le niveau ${o.level}.`);
    overrideLevels.add(o.level);
    if (!(typeof o.increment === 'number' && Number.isFinite(o.increment) && o.increment > 0)) err('override-invalid', `Surcharge du niveau ${o.level} invalide (${o.increment}) : doit être > 0.`);
  }

  if (config.maxLevel >= 1 && config.firstLevelThreshold > 0) {
    const table = buildLevelTable(config);
    for (let i = 1; i < table.length; i++) {
      if (table[i].increment < table[i - 1].increment) {
        err('levels-not-increasing', `Échelle incohérente : franchir le niveau ${table[i].level} coûte ${table[i].increment} pts, moins que le niveau ${table[i - 1].level} (${table[i - 1].increment} pts).`);
        break;
      }
    }
  }

  const rank: Record<DiagnosticSeverity, number> = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
