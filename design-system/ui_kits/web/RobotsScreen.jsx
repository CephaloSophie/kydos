// Écran MES ROBOTS — liste + détail/édition (sliders) + comparaison côte à côte.
const { Card: RCard, Badge: RBadge, Button: RButton, Slider: RSlider, Select: RSelect, Switch: RSwitch, Input: RInput } = window.ContrEDesignSystem_9c78ea;

const ROBOTS = [
  { id: 1, name: "Iznogoud", agr: 0.82, conc: 0.6, vel: 0.7, conv: "aggressive", active: true, win: 73, avg: 128, games: 1204 },
  { id: 2, name: "Roboubelot", agr: 0.4, conc: 0.85, vel: 0.5, conv: "classique", active: true, win: 68, avg: 119, games: 980 },
  { id: 3, name: "Le Prudent", agr: 0.2, conc: 0.95, vel: 0.3, conv: "soft", active: false, win: 61, avg: 104, games: 412 },
  { id: 4, name: "Capot-or", agr: 0.95, conc: 0.5, vel: 0.9, conv: "aggressive", active: true, win: 70, avg: 134, games: 1560 },
];

function Stat({ label, value, suffix }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "var(--fs-xs)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-h2)", color: "var(--text-1)" }}>{value}<span style={{ fontSize: "var(--fs-sm)", color: "var(--text-3)", marginLeft: 2 }}>{suffix}</span></span>
    </div>
  );
}

function RobotEditor({ bot, onChange }) {
  return (
    <RCard padding="lg" header={<><span>Édition · {bot.name}</span><RSwitch checked={bot.active} onChange={(v) => onChange({ ...bot, active: v })} label="Actif" /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
        <Stat label="Contrat réussi" value={bot.win} suffix="%" />
        <Stat label="Pts / donne" value={bot.avg} suffix="" />
        <Stat label="Parties" value={bot.games.toLocaleString("fr-FR")} suffix="" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <RInput label="Nom" value={bot.name} onChange={(e) => onChange({ ...bot, name: e.target.value })} />
        <RSlider label="Agressivité" value={bot.agr} min={0} max={1} onChange={(v) => onChange({ ...bot, agr: v })} format={(v) => v.toFixed(2)} />
        <RSlider label="Concentration" value={bot.conc} min={0} max={1} onChange={(v) => onChange({ ...bot, conc: v })} format={(v) => v.toFixed(2)} />
        <RSlider label="Vélocité" value={bot.vel} min={0} max={1} onChange={(v) => onChange({ ...bot, vel: v })} format={(v) => v.toFixed(2)} />
        <RSelect label="Convention d'enchères" value={bot.conv} onChange={(v) => onChange({ ...bot, conv: v })}
          options={[{ value: "classique", label: "Classique" }, { value: "soft", label: "Soft" }, { value: "aggressive", label: "Agressive" }]} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <RButton variant="primary">Enregistrer</RButton>
        <RButton variant="secondary" iconLeft={window.Ic.copy()}>Dupliquer</RButton>
        <RButton variant="ghost" style={{ marginLeft: "auto", color: "var(--error)" }}>Supprimer</RButton>
      </div>
    </RCard>
  );
}

function RobotsScreen() {
  const [bots, setBots] = React.useState(ROBOTS);
  const [selId, setSelId] = React.useState(1);
  const [compare, setCompare] = React.useState(false);
  const [cmpId, setCmpId] = React.useState(4);
  const sel = bots.find((b) => b.id === selId);
  const cmp = bots.find((b) => b.id === cmpId);
  const update = (next) => setBots((bs) => bs.map((b) => (b.id === next.id ? next : b)));

  return (
    <div className="layout-robots">
      <div className="layout-robots__list">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", color: "var(--text-1)" }}>Mes robots</h2>
          <RButton size="sm" iconLeft={window.Ic.plus()}>Nouveau</RButton>
        </div>
        {bots.map((b) => (
          <button key={b.id} onClick={() => setSelId(b.id)} className="focus-ring"
            style={{ textAlign: "left", border: `1px solid ${selId === b.id ? "var(--accent-line)" : "var(--border-1)"}`, background: selId === b.id ? "var(--accent-ghost)" : "var(--bg-2)", borderRadius: "var(--r-md)", padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontWeight: 600, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8 }}>{b.name}{!b.active && <RBadge tone="neutral">off</RBadge>}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-3)" }}>{b.win}% · {b.avg} pts · {b.conv}</span>
            </span>
            <RBadge tone="accent">{b.games > 1000 ? "Pro" : "Rookie"}</RBadge>
          </button>
        ))}
        <RButton variant="ghost" size="sm" onClick={() => setCompare((c) => !c)} style={{ marginTop: 8 }}>
          {compare ? "← Revenir au détail" : "Comparer deux robots"}
        </RButton>
      </div>

      <div className="layout-robots__detail">
        {compare ? (
          <div className="layout-robots__compare">
            <RobotEditor bot={sel} onChange={update} />
            <RobotEditor bot={cmp} onChange={update} />
          </div>
        ) : (
          <RobotEditor bot={sel} onChange={update} />
        )}
      </div>
    </div>
  );
}
window.RobotsScreen = RobotsScreen;
