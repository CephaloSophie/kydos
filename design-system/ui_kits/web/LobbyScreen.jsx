// Écran LOBBY — filtres + grille de tables.
const { Card: LCard, Badge: LBadge, Button: LButton, Tag: LTag, TeamBadge: LTeamBadge, Input: LInput } = window.ContrEDesignSystem_9c78ea;

const TABLES = [
  { id: 214, teamA: "Les Atouts", teamB: "Capot City", round: "Manche 2/3", players: 2, bots: 2, watchers: 7, live: true, private: false },
  { id: 198, teamA: "Pique & Coeur", teamB: "Belote Club", round: "Enchères", players: 3, bots: 1, watchers: 2, live: true, private: false },
  { id: 231, teamA: "Les Carreaux", teamB: "—", round: "En attente", players: 1, bots: 0, watchers: 0, live: false, private: true },
  { id: 240, teamA: "Trèfle FC", teamB: "Capot City", round: "Manche 1/2", players: 4, bots: 0, watchers: 12, live: true, private: false },
  { id: 245, teamA: "Les Atouts", teamB: "—", round: "En attente", players: 2, bots: 2, watchers: 0, live: false, private: false },
  { id: 251, teamA: "Roi & Dame", teamB: "Belote Club", round: "Manche 3/3", players: 4, bots: 0, watchers: 23, live: true, private: false },
];

function LobbyScreen() {
  const [q, setQ] = React.useState("");
  const [showPrivate, setShowPrivate] = React.useState(true);
  const [liveOnly, setLiveOnly] = React.useState(false);
  const tables = TABLES.filter((t) =>
    (showPrivate || !t.private) && (!liveOnly || t.live) &&
    (`${t.id} ${t.teamA} ${t.teamB}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="layout-lobby">
      <aside className="layout-lobby__filters">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", color: "var(--text-1)" }}>Lobby</h2>
        <LInput placeholder="Rechercher une table…" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={window.Ic.search()} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: "var(--fs-xs)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>Filtres</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <LTag selected={showPrivate} onClick={() => setShowPrivate((v) => !v)}>Privées</LTag>
            <LTag selected={liveOnly} onClick={() => setLiveOnly((v) => !v)}>En direct</LTag>
          </div>
        </div>
        <LButton variant="primary" iconLeft={window.Ic.plus()} fullWidth>Créer une table</LButton>
      </aside>

      <div className="layout-lobby__grid">
        {tables.map((t) => (
          <LCard key={t.id} interactive elevated padding="none"
            header={<><span style={{ display: "flex", alignItems: "center", gap: 8 }}>Table #{t.id}{t.private && <span style={{ color: "var(--text-3)", display: "flex" }}>{window.Ic.lock()}</span>}</span>
              {t.live ? <LBadge tone="spark" dot>Live</LBadge> : <LBadge tone="neutral">Ouverte</LBadge>}</>}>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <LTeamBadge name={t.teamA} size={34} showName />
                <span style={{ fontFamily: "var(--font-display)", color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>vs</span>
                {t.teamB !== "—" ? <LTeamBadge name={t.teamB} size={34} /> : <span style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>1 place</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>
                <span>{t.round}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{t.players}👤 · {t.bots} BOT · {t.watchers}👁</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <LButton variant={t.live ? "secondary" : "primary"} size="sm" fullWidth>{t.live ? "Rejoindre" : "S'asseoir"}</LButton>
                {t.live && <LButton variant="ghost" size="sm" iconLeft={window.Ic.eye({ width: 16, height: 16 })}>Observer</LButton>}
              </div>
            </div>
          </LCard>
        ))}
      </div>
    </div>
  );
}
window.LobbyScreen = LobbyScreen;
