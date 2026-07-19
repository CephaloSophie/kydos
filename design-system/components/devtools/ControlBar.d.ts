import React from "react";

/**
 * Barre de contrôle du moteur d'entraînement (pause/step/vitesse/délais).
 * @startingPoint section="Belote" subtitle="Contrôles moteur : pause, step, vitesse, délais" viewport="700x120"
 */
export interface ControlBarProps {
  playing?: boolean;
  /** Vitesse courante (0.25 → 12). */
  speed?: number;
  /** Délais en ms. */
  delayBefore?: number;
  delayAfter?: number;
  onTogglePlay?: () => void;
  onStep?: () => void;
  onSpeed?: (s: number) => void;
  onDelayBefore?: (ms: number) => void;
  onDelayAfter?: (ms: number) => void;
}

/** Barre de contrôle du moteur d'entraînement (pause/step/vitesse/délais). */
export function ControlBar(props: ControlBarProps): JSX.Element;
