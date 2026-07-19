import React from "react";
import { ScoreTeam } from "./ScoreBoard";

export interface RecapRow {
  /** Libellé de donne (ex: "Donne 4"). */
  label?: string;
  a: number;
  b: number;
  /** Contrat annoncé (ex: "110 ♥ · contré"). */
  contract?: string;
  /** Marque la fin d'une manche. */
  roundEnd?: boolean;
}

export interface RecapTableProps {
  teamA: Pick<ScoreTeam, "name">;
  teamB: Pick<ScoreTeam, "name">;
  rows: RecapRow[];
  /** Équipe gagnante : "a" | "b". */
  winner?: "a" | "b";
}

/** Tableau récapitulatif de fin de partie (donne / manche / total). */
export function RecapTable(props: RecapTableProps): JSX.Element;
