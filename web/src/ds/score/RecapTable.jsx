import React from "react";
import { TeamBadge } from "./TeamBadge.jsx";

/**
 * RecapTable — récapitulatif de fin de partie : une ligne par donne,
 * colonnes équipe A / équipe B, totaux de manche, vainqueur surligné.
 */
export function RecapTable({ teamA, teamB, rows = [], winner }) {
  const totA = rows.reduce((s, r) => s + (r.a || 0), 0);
  const totB = rows.reduce((s, r) => s + (r.b || 0), 0);
  const th = { textAlign: "right", padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" };
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-ui)" }}>
        <thead>
          <tr style={{ background: "var(--bg-3)" }}>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "var(--fs-xs)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>Donne</th>
            <HeadTeam team={teamA} won={winner === "a"} />
            <HeadTeam team={teamB} won={winner === "b"} />
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "var(--fs-xs)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>Contrat</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border-1)" }}>
              <td style={{ padding: "8px 12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>
                {r.label || `#${i + 1}`}{r.roundEnd && <span style={{ color: "var(--accent)", marginLeft: 6 }}>▸ fin manche</span>}
              </td>
              <td style={{ ...th, color: r.a >= r.b ? "var(--text-1)" : "var(--text-3)", fontWeight: r.a >= r.b ? 600 : 400 }}>{fmt(r.a)}</td>
              <td style={{ ...th, color: r.b > r.a ? "var(--text-1)" : "var(--text-3)", fontWeight: r.b > r.a ? 600 : 400 }}>{fmt(r.b)}</td>
              <td style={{ padding: "8px 12px", fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>{r.contract || "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid var(--border-2)", background: "var(--bg-3)" }}>
            <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-1)" }}>Total</td>
            <td style={{ ...th, fontSize: "var(--fs-body)", fontWeight: 700, color: winner === "a" ? "var(--accent)" : "var(--text-1)" }}>{totA}</td>
            <td style={{ ...th, fontSize: "var(--fs-body)", fontWeight: 700, color: winner === "b" ? "var(--accent)" : "var(--text-1)" }}>{totB}</td>
            <td style={{ padding: "10px 12px", fontSize: "var(--fs-sm)", color: "var(--accent)", fontWeight: 600 }}>
              {winner ? `Victoire ${winner === "a" ? teamA.name : teamB.name}` : ""}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function HeadTeam({ team, won }) {
  return (
    <th style={{ padding: "8px 12px" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, justifyContent: "flex-end", width: "100%" }}>
        <TeamBadge name={team.name} size={22} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-sm)", fontWeight: 600, color: won ? "var(--accent)" : "var(--text-1)", whiteSpace: "nowrap" }}>{team.name}</span>
      </span>
    </th>
  );
}

function fmt(n) { return n == null ? "—" : n; }
