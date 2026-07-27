import React from "react";

/**
 * Champ texte.
 * @startingPoint section="Forms" subtitle="Champ texte : label, hint, erreur, addons" viewport="700x140"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Libellé au-dessus du champ (lié via htmlFor). */
  label?: string;
  /** Texte d'aide sous le champ. */
  hint?: string;
  /** Message d'erreur — passe le champ en état invalide. */
  error?: string;
  /** Icône à gauche dans le champ. */
  iconLeft?: React.ReactNode;
  /** Élément à droite (bouton, unité…). */
  addonRight?: React.ReactNode;
}

/** Champ texte. */
export function Input(props: InputProps): JSX.Element;
