import React from "react";
import { BidActionIcon } from "./BidActionIcon.jsx";

/**
 * AnnonceAnnonce — demande retenue d'un siège, HORS du contour LogoEspaceInfo.
 * Affiche la valeur + l'enseigne (dans SA vraie couleur rouge/noir) + 💭 si réflexion.
 * La couleur n'est montrée que si elle a été explicitement nommée (suitSymbol fourni) ;
 * sinon on n'affiche que la valeur — sauf montée sans renommer, où l'appelant fournit
 * l'enseigne de l'ATOUT (couleur effective) pour qu'elle s'affiche quand même.
 * Affiche aussi, PAR JOUEUR, l'icône contré / surcontré (jamais par équipe).
 */
export function AnnonceAnnonce({ value, capot = false, suitSymbol = null, isRed = false, reflexion = false, contre = "none", visible = true }) {
  const hasDemande = capot || value != null;
  if (!visible || (!hasDemande && contre === "none")) return null;
  return (
    <div className="gt-demande">
      {hasDemande && (
        <span className="gt-demande-val">
          {capot ? "Capot" : value}
          {suitSymbol && <span className={`gt-ens ${isRed ? "gt-suit-red" : "gt-suit-black"}`}>{suitSymbol}</span>}
          {reflexion && <span className="gt-demande-refl">💭</span>}
        </span>
      )}
      {contre === "contree" && <BidActionIcon action="contree" size={20} title="a contré" />}
      {contre === "surcontree" && <BidActionIcon action="surcontree" size={20} title="a surcontré" />}
    </div>
  );
}
