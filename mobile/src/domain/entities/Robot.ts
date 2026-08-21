/* =============================================================================
 * DOMAIN · entities/Robot.ts — Entité métier « Robot ».
 * Port TypeScript FIDÈLE du design system (js/domain/entities/Robot.js),
 * étendu du pont vers le MOTEUR (belote-core) :
 *   - les 4 curseurs mobiles (aggro/risk/bluff/memoire, 0–100) sont une vue de
 *     PRÉSENTATION ; le comportement moteur reste piloté par `personality`
 *     (aggressiveness/concentration/velocity, 1–10) ;
 *   - le mapping ci-dessous est SANS PERTE et RÉVERSIBLE afin de ne jamais
 *     altérer le comportement des robots créés côté web.
 * ========================================================================== */

/**
 * @deprecated v18 — Le catalogue d'avatars est désormais servi par le
 * back-office (`data/AvatarCatalog`). Cette liste ne sert plus que de repli
 * hors-ligne / pour les tests. Ne plus l'utiliser dans l'UI : préférer
 * `getAvatarList()` / `avatarAccent()`.
 */
export const AVATAR_PRESETS = [
  { id: 'atne', name: 'Atné', accent: '#7ecb98' },
  { id: 'bato', name: 'Bâto', accent: '#e6c46a' },
  { id: 'celi', name: 'Céli', accent: '#e85d70' },
  { id: 'doxa', name: 'Doxa', accent: '#9db4dd' },
  { id: 'eris', name: 'Éris', accent: '#b39ddb' },
] as const;

export type AvatarId = (typeof AVATAR_PRESETS)[number]['id'];

/** Curseurs de stratégie de l'éditeur mobile (échelle 0–100). */
export interface RobotStrategy { aggro: number; risk: number; bluff: number; memoire: number }

/** Personnalité MOTEUR (échelle 1–10) — contrat de belote-core. */
export interface EnginePersonality { aggressiveness: number; concentration: number; velocity: number }

export type RobotStatus = 'idle' | 'playing';

export interface RobotData {
  id: string;
  name: string;
  avatarId: AvatarId | string;
  strategy: RobotStrategy;
  elo?: number;
  games?: number;
  wins?: number;
  status?: RobotStatus;
}

const clampSlider = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const to10 = (v: number) => Math.max(1, Math.min(10, Math.round(clampSlider(v) / 10) || 1));
const from10 = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10)));

/**
 * Convertit les curseurs mobiles (0–100) en personnalité moteur (1–10).
 * Mapping FIXE et documenté (docs/ai/MOBILE.md) :
 *   aggressiveness ← aggro · concentration ← memoire · velocity ← risk.
 * `bluff` n'a pas d'équivalent moteur : purement présentationnel (conservé
 * dans `mobile.strategy`, jamais injecté dans le comportement).
 */
export function strategyToPersonality(s: RobotStrategy): EnginePersonality {
  return { aggressiveness: to10(s.aggro), concentration: to10(s.memoire), velocity: to10(s.risk) };
}

/** Reconstruit des curseurs à partir d'une personnalité moteur (robots web). */
export function personalityToStrategy(p: EnginePersonality, bluff = 45): RobotStrategy {
  return { aggro: from10(p.aggressiveness), memoire: from10(p.concentration), risk: from10(p.velocity), bluff: clampSlider(bluff) };
}

/** Libellé de personnalité dérivé des curseurs — seuils EXACTS du DS. */
export function personalityLabel(s: RobotStrategy): 'Offensif' | 'Prudent' | 'Joueur' | 'Équilibré' {
  if (s.aggro > 66) return 'Offensif';
  if (s.aggro < 34) return 'Prudent';
  return s.bluff > 55 ? 'Joueur' : 'Équilibré';
}

export class Robot {
  id: string;
  name: string;
  avatarId: AvatarId | string;
  strategy: RobotStrategy;
  elo: number;
  games: number;
  wins: number;
  status: RobotStatus;

  constructor(data: RobotData) {
    this.id = data.id;
    this.name = data.name;
    this.avatarId = data.avatarId;
    this.strategy = data.strategy;
    this.elo = data.elo ?? 1000;
    this.games = data.games ?? 0;
    this.wins = data.wins ?? 0;
    this.status = data.status ?? 'idle';
  }

  /**
   * Couleur d'accent de l'avatar — REPLI domaine (presets). La couleur
   * effective affichée provient du catalogue back-office et est résolue dans la
   * couche présentation via `avatarAccent(robot.avatarId)` (clean architecture :
   * le domaine ne dépend pas de l'infrastructure/API).
   */
  get accent(): string {
    return (AVATAR_PRESETS.find((a) => a.id === this.avatarId) ?? AVATAR_PRESETS[0]).accent;
  }

  /** Taux de victoire arrondi (%) — 0 si aucune partie. */
  get winRate(): number { return this.games ? Math.round((this.wins / this.games) * 100) : 0; }

  /** Libellé de personnalité dérivé de la stratégie. */
  get personality(): ReturnType<typeof personalityLabel> { return personalityLabel(this.strategy); }

  /** Personnalité MOTEUR pour belote-core. */
  get enginePersonality(): EnginePersonality { return strategyToPersonality(this.strategy); }

  toJSON(): RobotData {
    return {
      id: this.id, name: this.name, avatarId: this.avatarId, strategy: this.strategy,
      elo: this.elo, games: this.games, wins: this.wins, status: this.status,
    };
  }
}
