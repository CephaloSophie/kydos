import React from "react";
import { BidActionIcon } from "./BidActionIcon.jsx";

/**
 * ContreeIcon — bouton d'action contré / surcontré d'un joueur, placé en bas du tapis
 * à droite de SON siège (chaque joueur se voit en bas). Remplace l'ancien bouton central.
 */
export function ContreeIcon({ action = "contree", onClick, label }) {
  const text = label ?? (action === "surcontree" ? "Surcoincher" : "Coincher");
  return (
    <button className={`gt-contree-icon ${action}`} onClick={onClick} title={text}>
      <BidActionIcon action={action} size={22} /> {text}
    </button>
  );
}
