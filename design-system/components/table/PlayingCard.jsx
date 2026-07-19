import React from "react";

const SUITS = {
  hearts: { glyph: "♥", color: "var(--card-red)" },
  diamonds: { glyph: "♦", color: "var(--card-red)" },
  spades: { glyph: "♠", color: "var(--card-black)" },
  clubs: { glyph: "♣", color: "var(--card-black)" },
};

const SIZES = {
  sm: { w: 44, h: 62, r: 16, c: 11 },
  md: { w: 62, h: 88, r: 24, c: 15 },
  lg: { w: 86, h: 122, r: 34, c: 20 },
};

/**
 * PlayingCard — carte de Belote. Face (rang + couleur) ou dos. Tailles sm/md/lg.
 * États : playable (surlignée jouable), winning (lueur), disabled (atténuée).
 */
export function PlayingCard({ rank = "A", suit = "spades", size = "md", faceDown = false, playable = false, winning = false, disabled = false, raised = false, onClick, style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const meta = SUITS[suit] || SUITS.spades;
  const interactive = !!onClick && !disabled;

  if (faceDown) {
    return (
      <div aria-label="Carte face cachée" style={{
        width: s.w, height: s.h, borderRadius: "var(--r-card)", flex: "0 0 auto",
        background: `repeating-linear-gradient(45deg, var(--card-back), var(--card-back) 5px, var(--card-back-line) 5px, var(--card-back-line) 10px)`,
        border: "3px solid var(--card-face)", boxShadow: "var(--shadow-2)", ...style,
      }} {...rest} />
    );
  }

  return (
    <button
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      aria-label={`${rank} de ${frSuit(suit)}${playable ? ", jouable" : ""}`}
      className={interactive ? "focus-ring" : undefined}
      style={{
        position: "relative", width: s.w, height: s.h, padding: 0, flex: "0 0 auto",
        borderRadius: "var(--r-card)", background: "var(--card-face)", color: meta.color,
        border: "1px solid var(--card-face-edge)", cursor: interactive ? "pointer" : "default",
        boxShadow: winning ? "var(--glow-win)" : playable ? "var(--glow-accent)" : "var(--shadow-2)",
        opacity: disabled ? "var(--card-disabled)" : 1,
        transform: raised || winning ? "translateY(-10px)" : "none",
        transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        fontFamily: "var(--font-display)", overflow: "hidden", display: "block", ...style,
      }}
      onMouseEnter={interactive ? (e) => { if (playable) e.currentTarget.style.transform = "translateY(-10px)"; } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.transform = raised || winning ? "translateY(-10px)" : "none"; } : undefined}
      {...rest}
    >
      <Corner rank={rank} glyph={meta.glyph} size={s.c} pos="tl" />
      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: s.w * 0.5, lineHeight: 1, opacity: 0.95 }}>{meta.glyph}</span>
      <Corner rank={rank} glyph={meta.glyph} size={s.c} pos="br" />
    </button>
  );
}

function Corner({ rank, glyph, size, pos }) {
  const base = { position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.95, fontWeight: 700 };
  const place = pos === "tl" ? { top: 4, left: 5 } : { bottom: 4, right: 5, transform: "rotate(180deg)" };
  return (
    <span style={{ ...base, ...place }}>
      <span style={{ fontSize: size }}>{rank}</span>
      <span style={{ fontSize: size * 0.82 }}>{glyph}</span>
    </span>
  );
}

function frSuit(s) { return { hearts: "cœur", diamonds: "carreau", spades: "pique", clubs: "trèfle" }[s] || s; }
