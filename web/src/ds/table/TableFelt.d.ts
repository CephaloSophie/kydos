import React from "react";
import { Suit } from "./PlayingCard";

export interface FeltSeat {
  /** Position autour du tapis. */
  dir: "north" | "east" | "south" | "west";
  name: string;
  /** Nom du clan (source de la couleur/identicon). Défaut = name. */
  team?: string;
  isRobot?: boolean;
  /** Nb de cartes en main (dos affichés pour N/E/O). */
  cards?: number;
  /** Siège dont c'est le tour. */
  active?: boolean;
}

export interface TrickCard { rank: string; suit: Suit; winning?: boolean; }

/**
 * Tapis de jeu : 4 sièges, pli central, panneau pli précédent.
 * @startingPoint section="Belote" subtitle="Tapis de jeu 4 sièges + pli central" viewport="700x460"
 */
export interface TableFeltProps {
  seats: FeltSeat[];
  /** Carte posée au centre par direction : { south, north, east, west }. */
  trick?: Partial<Record<"north" | "east" | "south" | "west", TrickCard>>;
  /** Cartes du pli précédent (panneau coin). */
  prevTrick?: TrickCard[] | null;
  /** Couleur d'atout courante. */
  atout?: Suit | null;
  /** Surcouche (main du joueur, overlays…). */
  children?: React.ReactNode;
}

/** Tapis de jeu : 4 sièges, pli central, panneau pli précédent. */
export function TableFelt(props: TableFeltProps): JSX.Element;
