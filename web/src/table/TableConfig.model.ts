import type { Suit } from 'belote-core';

/** Thèmes visuels du tapis (clin d'œil astronomie / Grèce). */
export type FeltTheme = 'classic' | 'cosmos' | 'olympus';

/**
 * Contexte de configuration d'une table — l'objet JSON unique qui décrit TOUT
 * ce qui est paramétrable. On instancie le module Table avec ce modèle.
 */
export interface TableConfig {
  /** Nombre de manches de la partie. */
  manches: 1 | 2 | 4;
  /** Sens de jeu : false = anti-horaire (défaut), true = horaire. */
  clockwise: boolean;
  /** Délai entre la fin d'un pli et son ramassage (ms). */
  trickDelayMs: number;
  /** Vitesse de simulation (×). */
  speed: number;
  /** Type de jeu (extensible : 'contree', ...). */
  gameType: string;
  /** Nombre de joueurs attendus (4 pour la contrée). */
  maxPlayers: number;
  /** Spectateurs autorisés. */
  allowSpectators: boolean;
  /** Visibilité de la table. */
  visibility: 'public' | 'private';
  /** Thème du tapis. */
  feltTheme: FeltTheme;
  /** Délai avant qu'un robot remplace un humain inactif (ms). */
  turnTimeoutMs: number;
  /** Fenêtre laissée pour surcoincher après un contre (ms). */
  surcoincheWindowMs: number;
  /** Durée d'affichage d'une notification d'annonce (ms). */
  notifyMs: number;
  /** Opacité du grand atout central (transparent pour ne pas masquer les cartes). */
  atoutGlyphOpacity: number;
  /** Signaux d'enchère activés à cette table (initialisés à la création). */
  signals: {
    /** Autoriser le signal « réflexion » attaché à une montée d'enchère. */
    reflexion: boolean;
    /** Autoriser le signal « répéter la couleur du coéquipier ». */
    repeatSuit: boolean;
  };
}

/** Configuration par défaut — surchargée à l'instanciation. */
export const DEFAULT_TABLE_CONFIG: TableConfig = {
  manches: 2,
  clockwise: false,
  trickDelayMs: 1500,
  speed: 1,
  gameType: 'contree',
  maxPlayers: 4,
  allowSpectators: true,
  visibility: 'private',
  feltTheme: 'classic',
  turnTimeoutMs: 10000,
  surcoincheWindowMs: 3500,
  notifyMs: 5000,
  atoutGlyphOpacity: 0.06,
  signals: { reflexion: true, repeatSuit: true },
};

/** Fusionne une config partielle (JSON) avec les défauts. */
export function buildTableConfig(partial: Partial<TableConfig> = {}): TableConfig {
  return { ...DEFAULT_TABLE_CONFIG, ...partial };
}

/** Description d'un participant à instancier sur la table. */
export interface TableParticipant {
  seatIndex: number;
  name: string;
  type: 'human' | 'robot';
  robotConfig?: {
    id: string;
    personality?: { aggressiveness: number; concentration: number; velocity: number };
    responseTimeMs?: number;
    maxPlayTimeMs?: number;
    algoSpec?: unknown;
  };
}

/** Contexte complet d'instanciation d'une table locale. */
export interface TableContext {
  config: TableConfig;
  participants: TableParticipant[];
}

export type { Suit };
