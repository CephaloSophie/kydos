// Shell de l'application web : brand + nav latérale + topbar + screen switch.
const { TeamBadge: ATeamBadge, Button: AButton, Badge: ABadge } = window.ContrEDesignSystem_9c78ea;

const NAV = [
  { id: "game", label: "Entraînement", icon: "play" },
  { id: "lobby", label: "Lobby", icon: "cards" },
  { id: "watch", label: "Regarder", icon: "eye" },
  { id: "robots", label: "Mes robots", icon: "bot" },
  { id: "tournaments", label: "Tournois", icon: "trophy" },
];

function NavItem({ item, active, onClick }) {
  return (
    <button onClick={onClick} className="focus-ring"
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
        padding: "10px 12px", borderRadius: "var(--r-md)", border: 0, cursor: "pointer",
        background: active ? "var(--accent-ghost)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-2)",
        fontFamily: "var(--font-ui)", fontSize: "var(--fs-body)", fontWeight: active ? 600 : 500,
      }}>
      {window.Ic[item.icon]()}
      <span>{item.label}</span>
    </button>
  );
}

function App() {
  const [screen, setScreen] = React.useState("game");
  const Screen = {
    game: window.GameScreen, lobby: window.LobbyScreen, robots: window.RobotsScreen,
    tournaments: window.TournamentScreen, watch: window.LobbyScreen,
  }[screen];

  return (
    <div className="app-shell">
      <div className="app-shell__brand">
        <img src={(window.__resources && window.__resources.mark) || "../../assets/mark-contree.svg"} alt="" width="26" height="26" />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-h3)", color: "var(--text-1)" }}>Contrée</span>
      </div>
      <div className="app-shell__topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h3)", fontWeight: 600, color: "var(--text-1)" }}>
            {NAV.find((n) => n.id === screen)?.label}
          </span>
          {screen === "watch" && <ABadge tone="spark" dot>Mode spectateur</ABadge>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ABadge tone="accent" solid>4 820 pts</ABadge>
          <ATeamBadge name="Les Atouts" size={32} showName />
        </div>
      </div>
      <nav className="app-shell__nav">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n) => <NavItem key={n.id} item={n} active={screen === n.id} onClick={() => setScreen(n.id)} />)}
        </div>
      </nav>
      <main className="app-shell__main">
        {Screen ? <Screen /> : null}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
