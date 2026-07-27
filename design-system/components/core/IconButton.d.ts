import React from "react";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Variante visuelle. */
  variant?: "ghost" | "solid" | "accent";
  size?: "sm" | "md" | "lg";
  /** OBLIGATOIRE — libellé accessible (aria-label + title). */
  label: string;
  /** État actif (toggle), pose aria-pressed. */
  active?: boolean;
  disabled?: boolean;
  /** L'icône (SVG). */
  children?: React.ReactNode;
}

/** Bouton-icône carré. */
export function IconButton(props: IconButtonProps): JSX.Element;
