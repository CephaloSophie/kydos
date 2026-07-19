import React from "react";

export type Suit = "hearts" | "diamonds" | "spades" | "clubs";

/**
 * Carte à jouer (face/dos, tailles, états).
 * @startingPoint section="Belote" subtitle="Carte à jouer : face/dos, jouable, gagnante" viewport="700x180"
 */
export interface PlayingCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Rang affiché (7,8,9,10,V,D,R,A…). */
  rank?: string;
  suit?: Suit;
  size?: "sm" | "md" | "lg";
  /** Dos de carte (main adverse). */
  faceDown?: boolean;
  /** Surlignage « jouable » (anneau gold + soulèvement au survol). */
  playable?: boolean;
  /** Lueur « carte gagnante du pli ». */
  winning?: boolean;
  /** Carte non jouable : atténuée. */
  disabled?: boolean;
  /** Soulevée en permanence (carte sélectionnée). */
  raised?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

/** Carte à jouer (face/dos, tailles, états). */
export function PlayingCard(props: PlayingCardProps): JSX.Element;
