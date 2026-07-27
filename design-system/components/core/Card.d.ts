import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Élément racine rendu. */
  as?: keyof JSX.IntrinsicElements;
  /** Pose l'ombre d'élévation. */
  elevated?: boolean;
  /** Hover + curseur cliquable. */
  interactive?: boolean;
  /** Padding du corps. */
  padding?: "none" | "sm" | "md" | "lg";
  /** Bandeau d'en-tête (bordure basse). */
  header?: React.ReactNode;
  /** Pied (bordure haute). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/** Surface posée standard. */
export function Card(props: CardProps): JSX.Element;
