import React from "react";
import { TeamBadge } from "../score/TeamBadge.jsx";

/**
 * LogoEspaceInfo — identité d'un siège : le logo (badge d'équipe) + les 4 premières
 * lettres du nom du joueur (ou robot). Rien d'autre : les jetons, le Meneur et la
 * demande vivent dans des composants séparés (JetonAnnonce, AnnonceAnnonce).
 */
export function LogoEspaceInfo({ team = "a", name = "", logoName, size = 30 }) {
  const short = (name ?? "").slice(0, 4);
  return (
    <div className={`gt-info team-${team}`}>
      <TeamBadge name={logoName ?? name} size={size} />
      <span className="gt-info-name">{short}</span>
    </div>
  );
}
