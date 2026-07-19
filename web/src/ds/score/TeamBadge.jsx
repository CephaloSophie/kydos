import React from "react";

/** Hash FNV-1a 32-bit déterministe. */
function hashName(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Couleur d'équipe (HSL) dérivée du nom — source de vérité unique. */
export function teamColor(name) {
  const h = hashName(name || "");
  return { h: h % 360, s: 58 + ((h >> 9) % 18), l: 52 + ((h >> 17) % 10) };
}

/**
 * TeamBadge — identicon algorithmique 5×5 (façon GitHub) + couleur HSL
 * dérivée du nom du clan. Optionnellement nom + total de points.
 * La couleur n'est JAMAIS codée en dur : toujours issue du hash.
 */
export function TeamBadge({ name, size = 40, showName = false, points = null, animate = false, style, ...rest }) {
  const h = hashName(name || "");
  const c = teamColor(name);
  const fg = `hsl(${c.h} ${c.s}% ${c.l}%)`;
  const cell = size / 5;
  const cells = [];
  let k = 0;
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 5; y++) {
      if ((h >> (x * 5 + y)) & 1) {
        const xs = x === 2 ? [2] : [x, 4 - x];
        for (const cx of xs) {
          cells.push(
            <rect key={`${cx}-${y}`} x={cx * cell} y={y * cell} width={cell} height={cell} rx={Math.max(1, cell * 0.12)}
              fill={fg} className={animate ? "anim-identicon-cell" : undefined} style={animate ? { "--i": k++ } : undefined} />
          );
        }
      }
    }
  }
  const svg = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Clan ${name}`}
      style={{ borderRadius: "var(--r-md)", background: "var(--bg-3)", border: "1px solid var(--border-1)", display: "block", flex: "0 0 auto" }}>
      {cells}
    </svg>
  );
  if (!showName && points == null) return <span style={style} {...rest}>{svg}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, ...style }} {...rest}>
      {svg}
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {showName && <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-1)", fontSize: "var(--fs-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>}
        {points != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: fg, fontWeight: 600 }}>{points.toLocaleString("fr-FR")} pts</span>}
      </span>
    </span>
  );
}
