import React from "react";

/**
 * BidActionIcon — pictogramme rond d'une action d'enchère :
 *   • passe       (gris, tiret)
 *   • contree     (orange, croix nouée ✕)
 *   • surcontree  (magenta, double croix ✕✕)
 *   • capot       (or, couronne ♛)
 * Sert de pastille pour les boutons d'annonce ET d'indicateur sur les sièges.
 * Purement présentation : ne pilote jamais l'état du moteur.
 */
const PALETTE = {
  passe: "var(--text-3, #8A93A3)",
  contree: "var(--accent-strong, #E8714A)",
  surcontree: "var(--pink, #E8559F)",
  capot: "var(--gold, #C9A24A)",
};

export function BidActionIcon({ action = "passe", size = 44, active = false, title }) {
  const color = PALETTE[action] ?? PALETTE.passe;
  const c = size / 2;
  const r = c - 2;
  const label = title ?? action;

  return (
    <span title={label} style={{ display: "inline-flex", lineHeight: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle cx={c} cy={c} r={r} fill={active ? `${color}22` : "rgba(12,16,22,.55)"} stroke={color} strokeWidth="2.4" />

        {action === "passe" && (
          <line x1={c - 9} y1={c} x2={c + 9} y2={c} stroke={color} strokeWidth="3" strokeLinecap="round" />
        )}

        {action === "contree" && (
          <g stroke={color} strokeWidth="3" strokeLinecap="round">
            <line x1={c - 8} y1={c - 8} x2={c + 8} y2={c + 8} />
            <line x1={c + 8} y1={c - 8} x2={c - 8} y2={c + 8} />
            <circle cx={c} cy={c} r="3.1" fill={color} stroke="none" />
          </g>
        )}

        {action === "surcontree" && (
          <g stroke={color} strokeWidth="2.6" strokeLinecap="round">
            <line x1={c - 11} y1={c - 8} x2={c - 1} y2={c + 8} />
            <line x1={c - 1} y1={c - 8} x2={c - 11} y2={c + 8} />
            <line x1={c + 1} y1={c - 8} x2={c + 11} y2={c + 8} />
            <line x1={c + 11} y1={c - 8} x2={c + 1} y2={c + 8} />
          </g>
        )}

        {action === "capot" && (
          <g fill={color}>
            <path d={`M ${c - 11} ${c + 7} L ${c - 11} ${c - 6} L ${c - 5} ${c + 1} L ${c} ${c - 9} L ${c + 5} ${c + 1} L ${c + 11} ${c - 6} L ${c + 11} ${c + 7} Z`} />
            <rect x={c - 11} y={c + 8} width="22" height="3.4" rx="1.4" />
          </g>
        )}
      </svg>
    </span>
  );
}
