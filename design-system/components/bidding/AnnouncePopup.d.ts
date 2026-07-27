import React from "react";

export interface AnnouncePopupProps {
  /** Nom du preneur. */
  taker: string;
  /** Équipe du preneur ("a" | "b"). */
  team?: "a" | "b";
  /** Couleur d'atout. */
  atout?: "hearts" | "diamonds" | "spades" | "clubs" | "sa" | "ta";
  /** Contrat (110, 250, Capot…). */
  contract?: string | number;
  /** Type d'annonce, ajoute un badge contré/surcontré. */
  kind?: "bid" | "contre" | "surcontre";
  /** Monté/démonté (l'anim gère la disparition). */
  visible?: boolean;
}

/** Popup auto-disparaissante du preneur/contrat (overlay tapis). */
export function AnnouncePopup(props: AnnouncePopupProps): JSX.Element | null;
