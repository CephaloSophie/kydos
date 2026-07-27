import React from "react";
import { BidBadge } from "./BidBadge.jsx";

/**
 * AnnounceStream — flux d'enchères chronologique, coloré par équipe.
 * Sert pendant les enchères et comme historique de partie. Scrolle en interne.
 */
export function AnnounceStream({ entries = [], title = "Flux d'enchères" }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", minHeight: 0, height: "100%", overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border-1)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-1)", fontSize: "var(--fs-body)" }}>{title}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-3)" }}>{entries.length}</span>
      </header>
      <div style={{ overflowY: "auto", minHeight: 0, padding: "8px 6px" }}>
        {entries.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: "var(--r-sm)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: `var(--team-${e.team || "a"})`, justifySelf: "center" }} />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-1)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.player}{e.isRobot && <span style={{ color: "var(--spark)", fontSize: "var(--fs-xs)", marginLeft: 5 }}>BOT</span>}
              </span>
              {e.round && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-3)" }}>{e.round}</span>}
            </span>
            <BidBadge kind={e.kind || "bid"} value={e.value} suit={e.suit} team={e.team} size="sm" />
          </div>
        ))}
      </div>
    </section>
  );
}
