/* =============================================================================
 * SOUND · soundConfig.ts — LE fichier à éditer pour changer les sons.
 * -----------------------------------------------------------------------------
 * Tous les fichiers vivent dans `mobile/public/sounds/` et sont servis sous
 * `/sounds/…`. Pour REMPLACER un son sans toucher au code : déposez votre .wav
 * (ou .mp3/.ogg) sous le MÊME NOM. Pour changer un mapping ou ajouter une
 * mélodie de table : éditez les tables ci-dessous. Doc : docs/SOUNDS.md.
 * ========================================================================== */

/** Événements sonores de la table (détectés par soundEvents.ts). */
export type SoundEffect =
  | 'card-play'       // JE joue une carte
  | 'card-other'      // un autre joueur / robot joue une carte
  | 'emote'           // un émoji apparaît sur la table
  | 'belote'          // annonce de belote (et rebelote)
  | 'pass'            // un joueur passe
  | 'bid-raise'       // hausse d'annonce (80, 90, 100…)
  | 'bid-reflexion'   // hausse d'annonce APRÈS réflexion 💭
  | 'contre'          // contré (coinche)
  | 'surcontre'       // surcontré (surcoinche)
  | 'trick-collect';  // ramassage du pli

/** Fichier de chaque effet (relatif à /sounds/). */
export const EFFECT_FILES: Record<SoundEffect, string> = {
  'card-play': 'card-play.wav',
  'card-other': 'card-other.wav',
  'emote': 'emote.wav',
  'belote': 'belote.wav',
  'pass': 'pass.wav',
  'bid-raise': 'bid-raise.wav',
  'bid-reflexion': 'bid-reflexion.wav',
  'contre': 'contre.wav',
  'surcontre': 'surcontre.wav',
  'trick-collect': 'trick-collect.wav',
};

/**
 * Mélodie d'ambiance PAR TYPE DE TABLE (jouée en boucle pendant la partie).
 * Clés = kind de table ; 'default' est le repli si le kind n'est pas listé.
 * Ajoutez une entrée (ex. 'ligue': 'melody-ligue.wav') + le fichier, c'est tout.
 */
export const MELODY_BY_TABLE_KIND: Record<string, string> = {
  default: 'melody-default.wav',        // Ode à la joie (Beethoven, domaine public)
  local: 'melody-training.wav',         // entraînement — Für Elise
  hybride: 'melody-team.wav',           // table équipe/hybride — valse maison
  acier: 'melody-competition.wav',      // table acier — 5e symphonie
  royal: 'melody-vip.wav',              // table royale/VIP — arpèges « Clair de lune »
  competition: 'melody-competition.wav',
  vip: 'melody-vip.wav',
};

/** Base publique des fichiers audio. */
export const SOUNDS_BASE = '/sounds/';

/** Volumes par défaut (0..100) et clés de persistance locale. */
export const DEFAULT_MELODY_VOLUME = 35;
export const DEFAULT_SFX_VOLUME = 70;
export const STORAGE_KEYS = {
  melody: 'kydos.sound.melodyVolume',
  sfx: 'kydos.sound.sfxVolume',
} as const;
