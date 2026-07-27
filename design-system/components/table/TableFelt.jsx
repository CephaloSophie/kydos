import React from "react";
import { PlayingCard } from "./PlayingCard.jsx";
import { TeamBadge } from "../score/TeamBadge.jsx";

const POS = {
  south: { bottom: "6%", left: "50%", tx: "-50%", ty: "0" },
  north: { top: "6%", left: "50%", tx: "-50%", ty: "0" },
  west: { left: "4%", top: "50%", tx: "0", ty: "-50%" },
  east: { right: "4%", top: "50%", tx: "0", ty: "-50%" },
};
const TRICK = {
  south: { bottom: "30%", left: "50%", tx: "-50%", ty: "0" },
  north: { top: "30%", left: "50%", tx: "-50%", ty: "0" },
  west: { left: "32%", top: "50%", tx: "0", ty: "-50%" },
  east: { right: "32%", top: "50%", tx: "0", ty: "-50%" },
};

/**
 * TableFelt — tapis de jeu : 4 sièges (N/E/S/O), pli central, panneau du pli
 * précédent. Le siège actif est surligné. Couleurs d'équipe via tokens.
 */
export function TableFelt({ seats = [], trick = {}, prevTrick = null, atout = null, children }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 380, borderRadius: "var(--r-xl)", overflow: "hidden", border: "4px solid var(--felt-rail)", boxShadow: "var(--shadow-3)" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 110% at 50% 42%, var(--felt-bright), var(--felt) 52%, var(--felt-edge))" }} />
      {/* zone de pli centrale */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 150, height: 150, borderRadius: "50%", border: "1px dashed var(--felt-line)" }} />
      {atout && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: "#cfeede", fontSize: "var(--fs-xs)", letterSpacing: "0.08em", textTransform: "uppercase", pointerEvents: "none" }}>
          <span style={{ opacity: 0.7 }}>Atout</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 26, color: suitColor(atout) }}>{suitGlyph(atout)}</span>
        </div>
      )}

      {seats.map((seat) => (
        <Seat key={seat.dir} seat={seat} />
      ))}
      {Object.entries(trick).map(([dir, card]) => card && (
        <div key={dir} className="anim-card-deal" style={{ position: "absolute", ...absFor(TRICK[dir]) }}>
          <PlayingCard rank={card.rank} suit={card.suit} size="md" winning={card.winning} />
        </div>
      ))}

      {prevTrick && (
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(8,12,10,.7)", backdropFilter: "blur(6px)", border: "1px solid var(--felt-line)", borderRadius: "var(--r-md)", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "var(--fs-xs)", color: "#bfe6d6", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pli précédent</span>
          <div style={{ display: "flex", gap: 4 }}>
            {prevTrick.map((c, i) => <PlayingCard key={i} rank={c.rank} suit={c.suit} size="sm" winning={c.winning} />)}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function Seat({ seat }) {
  const p = POS[seat.dir] || POS.south;
  const active = seat.active;
  return (
    <div style={{ position: "absolute", ...absFor(p), display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 6px",
        background: active ? "rgba(234,178,58,.16)" : "rgba(8,12,10,.55)",
        border: `1px solid ${active ? "var(--accent-line)" : "var(--felt-line)"}`,
        borderRadius: "var(--r-full)", boxShadow: active ? "var(--glow-accent)" : "none",
        backdropFilter: "blur(4px)",
      }}>
        <TeamBadge name={seat.team || seat.name} size={26} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--fs-sm)", color: active ? "var(--accent-strong)" : "#eaf3ee", whiteSpace: "nowrap" }}>
            {seat.name}{seat.isRobot && <span style={{ marginLeft: 5, color: "var(--spark)", fontSize: "var(--fs-xs)" }}>BOT</span>}
          </span>
          {seat.cards != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#9fc4b4" }}>{seat.cards} cartes</span>}
        </span>
      </div>
      {seat.dir !== "south" && seat.cards != null && (
        <div style={{ display: "flex", gap: -8 }}>
          {Array.from({ length: Math.min(seat.cards, 6) }).map((_, i) => (
            <PlayingCard key={i} faceDown size="sm" style={{ marginLeft: i ? -22 : 0 }} />
          ))}
        </div>
      )}
    </div>
  );
}

function absFor(p) {
  return { top: p.top, bottom: p.bottom, left: p.left, right: p.right, transform: `translate(${p.tx}, ${p.ty})` };
}
function suitGlyph(s) { return { hearts: "♥", diamonds: "♦", spades: "♠", clubs: "♣" }[s] || s; }
function suitColor(s) { return s === "hearts" || s === "diamonds" ? "var(--card-red)" : "#e7eef0"; }
