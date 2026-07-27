import React from "react";

/**
 * Curseur de réglage (personnalité robot, vitesse, délais).
 * @startingPoint section="Forms" subtitle="Curseur de réglage piloté par token" viewport="700x120"
 */
export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  /** Libellé à gauche. */
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Renvoie la nouvelle valeur (number). */
  onChange?: (v: number) => void;
  /** Formate la valeur affichée (ex: v => `${v}×`). */
  format?: (v: number) => React.ReactNode;
  disabled?: boolean;
  /** Couleur de remplissage de la piste (token). Défaut = accent. */
  accent?: string;
}

/** Curseur de réglage (personnalité robot, vitesse, délais). */
export function Slider(props: SliderProps): JSX.Element;
