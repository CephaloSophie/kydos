import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tonalité sémantique. */
  tone?: "neutral" | "accent" | "success" | "warning" | "error" | "info" | "spark";
  /** Fond plein (vs. atténué). */
  solid?: boolean;
  /** Affiche un point de statut avant le texte. */
  dot?: boolean;
  children?: React.ReactNode;
}

/** Pastille de statut. */
export function Badge(props: BadgeProps): JSX.Element;
