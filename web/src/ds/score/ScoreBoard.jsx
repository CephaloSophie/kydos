import React from "react";
import { TeamBadge } from "./TeamBadge.jsx";

/**
 * ScoreBoard — bandeau de score : équipe A · centre · équipe B.
 * Affiche identicons, cumul de manche live, brut de donne, manche courante.
 */
export function ScoreBoard({ teamA, teamB, target = 1500, round = 1, rounds = 3, brut, compact = false }) {
  const leadA = (teamA.score || 0) >= (teamB.score || 0);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: compact ? "var(--sp-3)" : "var(--sp-5)",
      background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)",
      padding: compact ? "var(--sp-2) var(--sp-3)" : "var(--sp-3) var(--sp-5)",
    }}>
      <TeamSide team={teamA} lead={leadA} brut={brut?.a} align="left" compact={compact} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "0 var(--sp-2)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-3)", letterSpacing: "0.04em" }}>
          MANCHE {round}/{rounds}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--accent)", whiteSpace: "nowrap" }}>→ {target}</span>
      </div>
      <TeamSide team={teamB} lead={!leadA} brut={brut?.b} align="right" compact={compact} />
    </div>
  );
}

function TeamSide({ team, lead, brut, align, compact }) {
  const right = align === "right";
  const c = team.color || "var(--team-a)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 12, flexDirection: right ? "row-reverse" : "row", justifyContent: right ? "flex-start" : "flex-start" }}>
      <TeamBadge name={team.name} size={compact ? 30 : 40} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: right ? "flex-end" : "flex-start", minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-1)", fontSize: compact ? "var(--fs-sm)" : "var(--fs-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexDirection: right ? "row-reverse" : "row" }}>
          {team.name}
          {lead && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} title="En tête" />}
        </span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexDirection: right ? "row-reverse" : "row" }}>
          <span className="anim-score-tick" key={team.score} style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: compact ? 20 : 26, color: "var(--text-1)", lineHeight: 1 }}>
            {(team.score || 0).toLocaleString("fr-FR")}
          </span>
          {brut != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: c }}>+{brut}</span>}
        </span>
      </div>
    </div>
  );
}
