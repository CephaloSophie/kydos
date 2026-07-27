import React from "react";

/**
 * DealerToken — jeton « D » de type jeton de casino, affiché devant le premier
 * annonceur (le « man »). Coloré par équipe : doré (équipe A) / rouge (équipe B).
 * Purement présentation : ne pilote jamais l'état du moteur.
 */
export function DealerToken({ team = "a", size = 38, label = "D", title = "Premier annonceur" }) {
  const ring = team === "b" ? "var(--team-b, #E8556F)" : "var(--team-a, var(--accent))";
  const notches = Array.from({ length: 8 });
  const center = size / 2;
  const outer = center - 1.5;
  const inner = outer * 0.62;

  return (
    <span title={title} style={{ display: "inline-flex", lineHeight: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.45))" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
        <circle cx={center} cy={center} r={outer} fill="#10141c" stroke={ring} strokeWidth="2.2" />
        {notches.map((_, i) => {
          const angle = (i * Math.PI) / 4;
          const x1 = center + Math.cos(angle) * (outer - 0.5);
          const y1 = center + Math.sin(angle) * (outer - 0.5);
          const x2 = center + Math.cos(angle) * (outer - 5);
          const y2 = center + Math.sin(angle) * (outer - 5);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ring} strokeWidth="2.4" strokeLinecap="round" />;
        })}
        <circle cx={center} cy={center} r={inner} fill="none" stroke={ring} strokeWidth="1.4" opacity="0.65" />
        <text x={center} y={center} dominantBaseline="central" textAnchor="middle"
          fontFamily="var(--font-display)" fontWeight="800" fontSize={size * 0.42} fill={ring}>{label}</text>
      </svg>
    </span>
  );
}
