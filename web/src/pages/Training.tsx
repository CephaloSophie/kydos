import { useEffect, useReducer, useRef, useState } from 'react';
import {
  ContreeRules, createAlgorithm, DEFAULT_PARTIE, GameEngine, makeRobot, robotFromFiche, robotAct,
  type Bid, type Card, type EnginePlayer, type LogEntry, type RobotAlgorithm, type Seat,
} from 'belote-core';
import { apiFetch } from '../lib/api';
import { useAuth } from '../state';
import { TableSurface } from '../table';
import { Recap } from '../components/ScoreBoard';
import { DevDock } from '../table';
import { ControlBar } from '../ds/devtools/ControlBar';

const rules = new ContreeRules();
const SPEEDS = [0.25, 0.5, 1, 2, 4, 12];

interface RobotDoc { _id: string; name: string; personality: any; responseTimeMs: number; maxPlayTimeMs: number; algoSpec?: any }

export function TrainingPage() {
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotDoc[]>([]);
  const engineRef = useRef<GameEngine | null>(null);
  const brainsRef = useRef<(RobotAlgorithm | null)[]>([]);
  const timer = useRef<any>(null);
  const savingRef = useRef(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState<'watch' | 'play'>('watch');
  const [manches, setManches] = useState<1 | 2 | 4>((user?.settings.defaultManches as any) ?? 2);
  const [speed, setSpeed] = useState(1);
  const [clockwise, setClockwise] = useState(false);
  const [preDelay, setPreDelay] = useState(400);
  const [trickPause, setTrickPause] = useState(1500);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => { apiFetch('/robots').then((r) => setRobots(r.robots)).catch(() => {}); }, []);

  const start = () => {
    setLogs([]); setSavedId(null); setPaused(false);
    const pool = robots.length >= (mode === 'play' ? 3 : 4) ? robots : null;
    const cfg = makeRobotConfigs(pool, mode, user?.settings.responseTimeMs ?? 1000);
    const players: EnginePlayer[] = cfg.map((c, i) => ({
      seat: i as Seat, name: c.name, type: mode === 'play' && i === 0 ? 'human' : 'robot', robotId: c.id,
    }));
    const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches, clockwise, local: true, responseTimeMs: user?.settings.responseTimeMs ?? 1000 }, rules);
    const sink = (e: LogEntry) => setLogs((prev) => (prev.length > 400 ? [...prev.slice(-400), e] : [...prev, e]));
    brainsRef.current = players.map((p, i) => (p.type === 'robot' ? createAlgorithm(cfg[i], rules, sink) : null));
    engineRef.current = engine;
    setRunning(true); bump();
  };

  // Détermine la prochaine action automatique + son délai (null = au tour de l'humain).
  const planStep = (e: GameEngine): { run: () => void; ms: number; noSpeed?: boolean } | null => {
    if (e.phase === 'partie_end') return null;
    if (e.phase === 'donne_end') return { run: () => e.nextDonne(), ms: 1200 };
    // Pause de manche calée sur le chrono de la popup (5 s), non accélérée.
    if (e.phase === 'manche_end') return { run: () => e.nextManche(), ms: 5200, noSpeed: true };
    if (e.view().awaitingCollect) return { run: () => e.collectTrick(), ms: trickPause };
    const seat = e.turn!;
    const brain = brainsRef.current[seat];
    if (!brain) return null; // tour d'un humain
    const act = robotAct(e, seat, brain);
    const run = () => {
      if (act.kind === 'bid') { const r = e.submitBid(seat, act.bid); if (!r.ok) e.submitBid(seat, { action: 'pass' }); }
      else e.playCard(seat, act.card);
    };
    // Réponse à l'annonce fixée à 700 ms (non modifiable) ; jeu = thinkMs du robot.
    return { run, ms: act.kind === 'bid' ? 700 : preDelay + act.thinkMs, noSpeed: act.kind === 'bid' };
  };

  const [step, bump] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const e = engineRef.current;
    if (!e || !running || paused || timer.current) return;
    const plan = planStep(e);
    if (!plan) { if (e.phase === 'partie_end') setRunning(false); return; }
    const delay = plan.noSpeed ? plan.ms : Math.max(60, plan.ms / speed);
    timer.current = setTimeout(() => { timer.current = null; plan.run(); bump(); }, delay);
    return () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  }, [running, paused, step, speed, preDelay, trickPause]);

  const stepOnce = () => {
    const e = engineRef.current; if (!e) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    planStep(e)?.run(); bump();
  };

  const e = engineRef.current;
  const myTurnHuman = e && mode === 'play' && e.turn === 0 && !e.view().awaitingCollect;
  const onBid = (bid: Omit<Bid, 'seat'>) => { if (!e) return; e.submitBid(0, bid); bump(); };
  const onPlay = (card: Card) => { if (!e) return; e.playCard(0, card); bump(); };

  const save = async () => {
    if (!e) return;
    const { id } = await apiFetch('/games', { method: 'POST', body: JSON.stringify({ replay: e.toReplay(), logs: logs.slice(-400), mode: 'local', winner: e.partieWinner }) });
    setSavedId(id);
  };

  // Sauvegarde AUTOMATIQUE par défaut en fin de partie (visibilité héritée du groupe).
  useEffect(() => {
    if (e && e.phase === 'partie_end' && !savedId && !savingRef.current) {
      savingRef.current = true;
      save().catch(() => {}).finally(() => { savingRef.current = false; });
    }
  }, [step]);

  const Slider = ({ label, val, set, min, max, stepv }: { label: string; val: number; set: (n: number) => void; min: number; max: number; stepv: number }) => (
    <div style={{ minWidth: 180 }}>
      <label>{label} : <b>{val} ms</b></label>
      <div className="slider"><input type="range" min={min} max={max} step={stepv} value={val} onChange={(ev) => set(Number(ev.target.value))} /></div>
    </div>
  );

  return (
    <div className="container">
      <h1>Entraînement local</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <select value={mode} onChange={(ev) => setMode(ev.target.value as any)} disabled={running}>
          <option value="watch">Regarder 4 robots</option>
          <option value="play">Jouer avec mes robots (vous = siège A)</option>
        </select>
        <select value={manches} onChange={(ev) => setManches(Number(ev.target.value) as any)} disabled={running}>
          <option value={1}>1 manche</option><option value={2}>2 manches</option><option value={4}>4 manches</option>
        </select>
        <select value={clockwise ? 'h' : 'a'} onChange={(ev) => setClockwise(ev.target.value === 'h')} disabled={running} title="Sens du jeu">
          <option value="a">↺ Antihoraire</option><option value="h">↻ Horaire</option>
        </select>
        <button className="primary" onClick={start} disabled={running && e?.phase !== 'partie_end'}>
          {running && e?.phase !== 'partie_end' ? 'En cours…' : 'Lancer'}
        </button>
        {mode === 'play' && robots.length < 3 && <span className="err">Créez au moins 3 robots pour jouer avec eux.</span>}
        {e?.phase === 'partie_end' && <span style={{ marginLeft: 'auto' }}>Vainqueur : <b>équipe {e.partieWinner}</b></span>}
        {e?.phase === 'partie_end' && (savedId ? <a href={`#/replay/${savedId}`}>Voir le rejeu</a> : <button onClick={save}>Sauvegarder le rejeu</button>)}
      </div>

      {!e && <p className="muted">Configurez puis lancez une partie. En local, aucun point récompense n'est attribué et toutes les cartes sont visibles.</p>}

      {e && (
        <div className="layout-game" style={{ height: 660 }}>
          <div className="layout-game__table">
            <TableSurface
              view={e.view()}
              names={e.players.map((p) => p.name)}
              hands={[0, 1, 2, 3].map((i) => e.handOf(i as Seat))}
              mySeat={mode === 'play' ? 0 : null}
              legal={myTurnHuman ? e.legalCards(0) : []}
              onBid={onBid}
              onPlay={myTurnHuman && e.phase === 'playing' ? onPlay : undefined}
              manches={manches}
              summary={e.summary()}
            />
            {running && (
              <ControlBar
                playing={running && !paused}
                speed={speed}
                delayBefore={preDelay}
                delayAfter={trickPause}
                onTogglePlay={() => setPaused((p) => !p)}
                onStep={stepOnce}
                onSpeed={setSpeed}
                onDelayBefore={setPreDelay}
                onDelayAfter={setTrickPause}
              />
            )}
          </div>
          <div className="layout-game__side">
            <DevDock view={e.view()} names={e.players.map((p) => p.name)} logs={logs} />
          </div>
        </div>
      )}

      {e?.phase === 'partie_end' && <Recap summary={e.summary()} names={e.players.map((p) => p.name)} />}
    </div>
  );
}

function makeRobotConfigs(pool: RobotDoc[] | null, mode: 'watch' | 'play', baseRt: number) {
  const greek = ['Athéna', 'Borée', 'Calliope', 'Damon'];
  return Array.from({ length: 4 }).map((_, i) => {
    if (mode === 'play' && i === 0) return makeRobot({ id: 'human', name: 'Vous' });
    const idx = mode === 'play' ? i - 1 : i;
    const r = pool?.[idx];
    // Fiche COMPLÈTE (personnalité + algoSpec) via la fabrique partagée : un robot pense
    // exactement comme en compétition/online. Repli sur un robot générique si pas assez de robots.
    return r
      ? robotFromFiche(r, { id: r._id, name: r.name })
      : makeRobot({ id: `bot${i}`, name: greek[i], responseTimeMs: baseRt, personality: { aggressiveness: 3 + i * 2, concentration: 5, velocity: 5 } });
  });
}
