import React from "react";

export interface AnnounceEntry {
  player: string;
  team?: "a" | "b";
  isRobot?: boolean;
  kind?: "pass" | "bid" | "contre" | "surcontre";
  value?: string | number;
  suit?: "hearts" | "diamonds" | "spades" | "clubs" | "sa" | "ta";
  /** Repère temporel (ex: "Donne 3 · tour 2"). */
  round?: string;
}

/**
 * Flux d'enchères coloré par équipe (panneau droit du jeu).
 * @startingPoint section="Belote" subtitle="Flux d'enchères coloré par équipe" viewport="380x420"
 */
export interface AnnounceStreamProps {
  entries: AnnounceEntry[];
  title?: string;
}

/** Flux d'enchères coloré par équipe (panneau droit du jeu). */
export function AnnounceStream(props: AnnounceStreamProps): JSX.Element;
