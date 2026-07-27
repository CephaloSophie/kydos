import React from "react";

/**
 * EmotionIcon — pictogramme d'émotion affiché dans les messages de table :
 *   • victoire    (vert, sourire + étoiles)
 *   • frustration (orange, grimace)
 *   • defaite     (bleu, larme)
 * Purement présentation. Utilisé par TableMessage (popups inter-manche / fin de partie).
 */
const PALETTE = {
  victoire: "var(--success, #2DBE73)",
  frustration: "var(--accent, #E8A14A)",
  defaite: "var(--info, #4A9BE8)",
};

export function EmotionIcon({ emotion = "victoire", size = 64 }) {
  const color = PALETTE[emotion] ?? PALETTE.victoire;
  const c = size / 2;
  const r = c - 3;

  return (
    <span style={{ display: "inline-flex", lineHeight: 0, filter: `drop-shadow(0 0 10px ${color}55)` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={emotion}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="3" />
        {/* yeux */}
        {emotion === "frustration" ? (
          <>
            <line x1={c - 16} y1={c - 8} x2={c - 6} y2={c - 4} stroke={color} strokeWidth="3" strokeLinecap="round" />
            <line x1={c + 16} y1={c - 8} x2={c + 6} y2={c - 4} stroke={color} strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx={c - 11} cy={c - 6} r="3.2" fill={color} />
            <circle cx={c + 11} cy={c - 6} r="3.2" fill={color} />
          </>
        )}
        {/* bouche */}
        {emotion === "victoire" && (
          <path d={`M ${c - 14} ${c + 6} Q ${c} ${c + 20} ${c + 14} ${c + 6}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        )}
        {emotion === "frustration" && (
          <path d={`M ${c - 12} ${c + 14} Q ${c} ${c + 6} ${c + 12} ${c + 14}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        )}
        {emotion === "defaite" && (
          <>
            <path d={`M ${c - 11} ${c + 14} Q ${c} ${c + 7} ${c + 11} ${c + 14}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <path d={`M ${c + 13} ${c - 1} q 3 6 0 9 q -3 -3 0 -9`} fill={color} />
          </>
        )}
        {/* étoiles de victoire */}
        {emotion === "victoire" && [[-1, -1], [1, -1]].map(([sx], i) => (
          <text key={i} x={c + sx * 17} y={c - 15} textAnchor="middle" fontSize="11" fill={color}>✦</text>
        ))}
      </svg>
    </span>
  );
}
