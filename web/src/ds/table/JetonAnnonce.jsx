import React from "react";
import { DealerToken } from "./DealerToken.jsx";

/**
 * JetonAnnonce — espace de marqueurs d'un siège, HORS du contour LogoEspaceInfo :
 *   • jeton Donneur (« D ») — fixe toute la donne
 *   • jeton Entame  (« E ») — fixe toute la donne (joueur juste après le Donneur)
 *   • triangle vert Meneur  — joueur dont c'est le tour ; mobile, disparaît/bouge en premier
 * Les trois peuvent coexister. Le Meneur est le seul volatil.
 */
export function JetonAnnonce({ team = "a", isDonneur = false, isEntame = false, isMeneur = false, size = 30 }) {
  if (!isDonneur && !isEntame && !isMeneur) return null;
  return (
    <div className="gt-jetons">
      {isDonneur && <DealerToken team={team} size={size} label="D" title="Donneur" />}
      {isEntame && <DealerToken team={team} size={size} label="E" title="Entame" />}
      {isMeneur && <span className="gt-meneur" title="À ce joueur de jouer">▲</span>}
    </div>
  );
}
