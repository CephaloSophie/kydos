// Écran TOURNOIS — classement des équipes + fiche tournoi.
const { Card: TCard, Badge: TBadge, Button: TButton, TeamBadge: TTeamBadge } = window.ContrEDesignSystem_9c78ea;

const STANDINGS = [
  { rank: 1, name: "Les Atouts", pts: 4820, games: 38 },
  { rank: 2, name: "Capot City", pts: 4510, games: 40 },
  { rank: 3, name: "Roi & Dame", pts: 4180, games: 36 },
  { rank: 4, name: "Pique & Coeur", pts: 3990, games: 39 },
  { rank: 5, name: "Trèfle FC", pts: 3720, games: 35 },
  { rank: 6, name: "Belote Club", pts: 3110, games: 37 },
];

function TournamentScreen() {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <TButton variant="primary" size="sm">Actifs</TButton>
        <TButton variant="ghost" size="sm">À venir</TButton>
        <TButton variant="ghost" size="sm">Terminés</TButton>
      </div>
      <div className="layout-tournament">
        <div className="layout-tournament__board">
          <h2 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", color: "var(--text-1)" }}>Coupe d'Automne · classement</h2>
          {STANDINGS.map((s) => {
            const mine = s.name === "Les Atouts";
            return (
              <div key={s.rank} style={{
                display: "grid", gridTemplateColumns: "28px 1fr auto auto", alignItems: "center", gap: 14,
                padding: "10px 14px", borderRadius: "var(--r-md)",
                background: mine ? "var(--accent-ghost)" : "var(--bg-2)",
                border: `1px solid ${mine ? "var(--accent-line)" : "var(--border-1)"}`,
              }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-h3)", color: s.rank <= 3 ? "var(--accent)" : "var(--text-3)" }}>{s.rank}</span>
                <TTeamBadge name={s.name} size={32} showName />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-3)" }}>{s.games} parties</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-h3)", color: "var(--text-1)" }}>{s.pts.toLocaleString("fr-FR")}</span>
              </div>
            );
          })}
        </div>

        <aside className="layout-tournament__aside">
          <TCard padding="lg" header="Coupe d'Automne">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TBadge tone="spark" dot>En cours</TBadge>
                <span style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>jusqu'au 30 nov.</span>
              </div>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: "var(--fs-sm)", lineHeight: 1.5 }}>
                Compétition entre 12 clans. Les points de récompense s'accumulent à chaque partie en ligne (base 100 + écart de score + primes).
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--border-1)", borderBottom: "1px solid var(--border-1)" }}>
                <span style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>Votre rang</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)" }}>1<sup>er</sup> · 4 820 pts</span>
              </div>
              <TButton variant="primary" fullWidth>Rejoindre une partie classée</TButton>
            </div>
          </TCard>
        </aside>
      </div>
    </div>
  );
}
window.TournamentScreen = TournamentScreen;
