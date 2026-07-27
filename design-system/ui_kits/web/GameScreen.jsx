// Écran ENTRAÎNEMENT / partie — flagship. Tapis 2/3 + panneaux droits 1/3.
const { ScoreBoard, TableFelt, PlayingCard, AnnounceStream, LogConsole, ControlBar, Button, Badge } = window.ContrEDesignSystem_9c78ea;

const START_HAND = [
  { rank: "A", suit: "hearts" }, { rank: "10", suit: "hearts" }, { rank: "R", suit: "spades" },
  { rank: "9", suit: "spades" }, { rank: "V", suit: "clubs" }, { rank: "8", suit: "diamonds" }, { rank: "7", suit: "diamonds" },
];

function GameScreen() {
  const [hand, setHand] = React.useState(START_HAND);
  const [trick, setTrick] = React.useState({
    west: { rank: "9", suit: "hearts" }, north: { rank: "7", suit: "hearts" },
  });
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(2);
  const [before, setBefore] = React.useState(400);
  const [after, setAfter] = React.useState(700);

  const playCard = (i) => {
    const card = hand[i];
    setTrick((t) => ({ ...t, south: { ...card, winning: true } }));
    setHand((h) => h.filter((_, idx) => idx !== i));
  };

  const log = [
    { ts: "12:04:01", level: "info", msg: "donne 4 — distribution 3-2-3" },
    { ts: "12:04:01", level: "debug", msg: "eval main Sud = 0.71 · atout ♥" },
    { ts: "12:04:01", level: "warning", msg: "annonce capot à risque (concentration 0.4)" },
    { ts: "12:04:02", level: "info", msg: "pli 3 remporté par Sud (R♥)" },
    { ts: "12:04:02", level: "debug", msg: "ws → state.tick #482" },
    { ts: "12:04:02", level: "error", msg: "contrat menacé — équipe B à 148/150" },
  ];
  const stream = [
    { player: "Vous", team: "a", kind: "bid", value: 80, suit: "spades" },
    { player: "Iznogoud", team: "b", isRobot: true, kind: "bid", value: 90, suit: "hearts" },
    { player: "Partenaire", team: "a", kind: "bid", value: 110, suit: "spades" },
    { player: "Roboubelot", team: "b", isRobot: true, kind: "contre" },
    { player: "Vous", team: "a", kind: "surcontre" },
  ];

  return (
    <div className="layout-game">
      <div className="layout-game__table">
        <ScoreBoard
          teamA={{ name: "Les Atouts", score: 1240 }}
          teamB={{ name: "Capot City", score: 980 }}
          target={1500} round={2} rounds={3} brut={{ a: 82, b: 80 }} />

        <div style={{ flex: 1, minHeight: 0 }}>
          <TableFelt
            atout="hearts"
            seats={[
              { dir: "south", name: "Vous", team: "Les Atouts", cards: hand.length, active: true },
              { dir: "west", name: "Iznogoud", team: "Capot City", isRobot: true, cards: 6 },
              { dir: "north", name: "Partenaire", team: "Les Atouts", cards: 6 },
              { dir: "east", name: "Roboubelot", team: "Capot City", isRobot: true, cards: 7 },
            ]}
            trick={trick}
            prevTrick={[{ rank: "R", suit: "spades" }, { rank: "7", suit: "spades" }, { rank: "8", suit: "spades", winning: true }, { rank: "D", suit: "spades" }]} />
        </div>

        {/* Main du joueur */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, padding: "4px 0 2px", minHeight: 96 }}>
          {hand.map((c, i) => (
            <PlayingCard key={`${c.rank}${c.suit}`} rank={c.rank} suit={c.suit} size="lg" playable onClick={() => playCard(i)} />
          ))}
          {hand.length === 0 && <span style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)", paddingBottom: 32 }}>Main jouée — pli en cours.</span>}
        </div>

        <ControlBar
          playing={playing} speed={speed} delayBefore={before} delayAfter={after}
          onTogglePlay={() => setPlaying((p) => !p)} onStep={() => {}} onSpeed={setSpeed}
          onDelayBefore={setBefore} onDelayAfter={setAfter} />
      </div>

      <div className="layout-game__side">
        <AnnounceStream entries={stream} />
        <LogConsole defaultHidden={["trace"]} entries={log} />
      </div>
    </div>
  );
}
window.GameScreen = GameScreen;
