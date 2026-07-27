import React from "react";

/**
 * Bouton d'action principal.
 * @startingPoint section="Core" subtitle="Boutons : primary, secondary, ghost, danger, spark" viewport="700x180"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Hiérarchie visuelle. primary = action atout (gold). */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "spark";
  /** Hauteur du contrôle. */
  size?: "sm" | "md" | "lg";
  /** Élément icône avant le label (SVG/glyph). */
  iconLeft?: React.ReactNode;
  /** Élément icône après le label. */
  iconRight?: React.ReactNode;
  /** Occupe toute la largeur disponible. */
  fullWidth?: boolean;
  /** Affiche un spinner et bloque le clic. */
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Bouton d'action principal.
 */
export function Button(props: ButtonProps): JSX.Element;
