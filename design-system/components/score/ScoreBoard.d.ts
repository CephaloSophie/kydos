import React from "react";

export interface ScoreTeam {
  name: string;
  /** Cumul de manche. */
  score: number;
  /** Couleur d'équipe (token ou hsl()). Défaut = --team-a/b. */
  color?: string;
}

/**
 * Bandeau de score équipe A · centre · équipe B.
 * @startingPoint section="Belote" subtitle="Bandeau de score live avec identicons" viewport="700x120"
 */
export interface ScoreBoardProps {
  teamA: ScoreTeam;
  teamB: ScoreTeam;
  /** Objectif de manche (1500 / 2000). */
  target?: number;
  round?: number;
  rounds?: number;
  /** Brut de donne en cours par équipe : { a, b }. */
  brut?: { a?: number; b?: number };
  /** Version réduite (bandeau mobile / observer). */
  compact?: boolean;
}

/** Bandeau de score équipe A · centre · équipe B. */
export function ScoreBoard(props: ScoreBoardProps): JSX.Element;
