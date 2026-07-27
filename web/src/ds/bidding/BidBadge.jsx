import React from "react";

const SUIT = { hearts: "♥", diamonds: "♦", spades: "♠", clubs: "♣", sa: "SA", ta: "TA", null: "" };

/**
 * BidBadge — annonce d'enchère : passe / contrat chiffré / contré / surcontré.
 * Coloré par équipe via --team-* ; le contre/surcontre garde sa teinte d'alerte.
 */
export function BidBadge({ kind = "bid", value, suit, team, size = "md", animate = false, style, ...rest }) {
  const palettes = {
    pass: { bg: "var(--bid-pass-bg)", fg: "var(--bid-pass-fg)", line: "var(--border-2)" },
    bid: { bg: "var(--bid-bid-bg)", fg: "var(--bid-bid-fg)", line: "var(--accent-line)" },
    contre: { bg: "var(--bid-contre-bg)", fg: "var(--bid-contre-fg)", line: "var(--bid-contre-fg)" },
    surcontre: { bg: "var(--bid-surcontre-bg)", fg: "var(--bid-surcontre-fg)", line: "var(--bid-surcontre-fg)" },
  };
  // si une équipe est fournie pour un "bid", on relaie sa couleur
  const teamTint = team && kind === "bid"
    ? { bg: `var(--team-${team}-soft)`, fg: `var(--team-${team})`, line: `var(--team-${team}-line)` }
    : null;
  const p = teamTint || palettes[kind] || palettes.bid;
  const dims = size === "sm" ? { h: 22, fs: "var(--fs-xs)", px: 9 } : size === "lg" ? { h: 34, fs: "var(--fs-h3)", px: 14 } : { h: 27, fs: "var(--fs-sm)", px: 11 };
  const isRed = suit === "hearts" || suit === "diamonds";

  const label = kind === "pass" ? "Passe"
    : kind === "contre" ? "Contré"
    : kind === "surcontre" ? "Surcontré"
    : `${value ?? ""}`;

  return (
    <span
      className={animate ? "anim-bid" : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        height: dims.h, padding: `0 ${dims.px}px`, borderRadius: "var(--r-full)",
        background: p.bg, color: p.fg, border: `1px solid ${p.line}`,
        fontFamily: "var(--font-display)", fontSize: dims.fs, fontWeight: 600, whiteSpace: "nowrap", ...style,
      }}
      {...rest}
    >
      {label}
      {kind === "bid" && suit && (
        <span style={{ color: isRed ? "var(--card-red)" : "inherit", fontSize: "1.1em" }}>{SUIT[suit] ?? suit}</span>
      )}
    </span>
  );
}
