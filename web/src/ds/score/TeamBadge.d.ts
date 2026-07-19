import React from "react";

/**
 * Identicon de clan 5×5 + couleur HSL dérivée du nom.
 * @startingPoint section="Belote" subtitle="Identicon de clan + couleur HSL dynamique" viewport="700x150"
 */
export interface TeamBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Nom du clan — seule source de la couleur et du motif. */
  name: string;
  /** Côté du carré en px. */
  size?: number;
  /** Affiche le nom à droite. */
  showName?: boolean;
  /** Total de points affiché sous le nom (null = masqué). */
  points?: number | null;
  /** Anime le tracé des cellules (draw-in). */
  animate?: boolean;
}

export interface TeamHSL { h: number; s: number; l: number; }

/** Couleur d'équipe (HSL) dérivée du nom — à brancher sur --team-*-h/s/l. */
export function teamColor(name: string): TeamHSL;

/** Identicon de clan 5×5 + couleur HSL dérivée du nom. */
export function TeamBadge(props: TeamBadgeProps): JSX.Element;
