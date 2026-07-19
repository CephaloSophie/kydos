import React from "react";
import { BidBadge } from "./BidBadge.jsx";

const SUIT = { hearts: "♥", diamonds: "♦", spades: "♠", clubs: "♣", sa: "SA", ta: "TA" };

/**
 * AnnouncePopup — popup auto-disparaissante en haut du tapis : preneur, atout,
 * contrat, et éventuel contre/surcontre. Slide-down + fade-out automatique.
 * Purement présentation : ne pilote jamais l'état du moteur.
 */
export function AnnouncePopup({ taker, team = "a", atout, contract, kind = "bid", visible = true }) {
  if (!visible) return null;
  const isRed = atout === "hearts" || atout === "diamonds";
  return (
    <div role="status" aria-live="polite" className="anim-announce" style={{
      position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: "var(--z-announce)",
      display: "flex", alignItems: "center", gap: 14, padding: "12px 18px",
      background: "rgba(14,18,24,.92)", backdropFilter: "blur(10px)",
      border: `1px solid var(--team-${team}-line)`, borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-pop)",
    }}>
      <span style={{ width: 4, alignSelf: "stretch", borderRadius: "var(--r-full)", background: `var(--team-${team})` }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "var(--fs-xs)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>Preneur</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-1)", fontSize: "var(--fs-h3)" }}>{taker}</span>
      </div>
      {contract && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 14, borderLeft: "1px solid var(--border-2)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-h2)", color: "var(--text-1)" }}>{contract}</span>
          {atout && <span style={{ fontSize: 26, color: isRed ? "var(--card-red)" : "var(--text-1)" }}>{SUIT[atout] ?? atout}</span>}
        </div>
      )}
      {(kind === "contre" || kind === "surcontre") && <BidBadge kind={kind} size="md" />}
    </div>
  );
}
