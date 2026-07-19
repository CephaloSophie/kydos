import React from "react";

export interface BidBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Nature de l'annonce. */
  kind?: "pass" | "bid" | "contre" | "surcontre";
  /** Valeur du contrat (80,90…,250,capot) pour kind="bid". */
  value?: string | number;
  /** Couleur demandée. sa = sans-atout, ta = tout-atout. */
  suit?: "hearts" | "diamonds" | "spades" | "clubs" | "sa" | "ta";
  /** Équipe ("a" | "b") — relaie --team-* sur un contrat. */
  team?: "a" | "b";
  size?: "sm" | "md" | "lg";
  /** Apparition scale-in. */
  animate?: boolean;
}

/** Badge d'annonce d'enchère. */
export function BidBadge(props: BidBadgeProps): JSX.Element;
