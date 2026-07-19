import { useEffect, useReducer, useRef, useState } from 'react';
import {
  ContreeRules, createAlgorithm, DEFAULT_PARTIE, GameEngine, makeRobot, robotFromFiche, robotAct,
  type Bid, type Card, type EnginePlayer, type LogEntry, type RobotAlgorithm, type Seat,
} from 'belote-core';
import { apiFetch } from '../lib/api';
import { useAuth } from '../state';
import { PixiTable } from '../table-pixi';
import { DevDock } from '../table';
import { Recap } from '../components/ScoreBoard';
import { ControlBar } from '../ds/devtools/ControlBar';

const rules = new ContreeRules();

interface RobotDoc { _id: string; name: string; personality: any; responseTimeMs: number; maxPlayTimeMs: number; algoSpec?: any }

/**
 * Entraînement v2 — même moteur local et mêmes réglages que l'entraînement v1,
 * mais rendu avec la NOUVELLE table Pixi (design system v9 : local / VIP / compétition).
 * Écran de configuration → table plein écran + barre de contrôle superposée.
 */
export function TrainingV2Page() {
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
  // v2 : thème du design system + visibilité des cartes adverses.
  const [theme, setTheme] = useState<'local' | 'vip' | 'competition'>('local');
  const [opponentCards, setOpponentCards] = useState<'back' | 'faceup'>('faceup');

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

  const stop = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    engineRef.current = null;
    setRunning(false); setPaused(false); bump();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Sauvegarde AUTOMATIQUE par défaut en fin de partie (même règle que la v1).
  useEffect(() => {
    if (e && e.phase === 'partie_end' && !savedId && !savingRef.current) {
      savingRef.current = true;
      save().catch(() => {}).finally(() => { savingRef.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Écran de configuration (avant lancement) ──
  if (!e) {
    return (
      <div className="container">
        <h1>Entraînement v2 <span className="muted" style={{ fontSize: 14 }}>(nouvelle table)</span></h1>
        <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <select value={mode} onChange={(ev) => setMode(ev.target.value as any)}>
            <option value="watch">Regarder 4 robots</option>
            <option value="play">Jouer avec mes robots (vous = siège A)</option>
          </select>
          <select value={manches} onChange={(ev) => setManches(Number(ev.target.value) as any)}>
            <option value={1}>1 manche</option><option value={2}>2 manches</option><option value={4}>4 manches</option>
          </select>
          <select value={clockwise ? 'h' : 'a'} onChange={(ev) => setClockwise(ev.target.value === 'h')} title="Sens du jeu">
            <option value="a">↺ Antihoraire</option><option value="h">↻ Horaire</option>
          </select>
          <select value={theme} onChange={(ev) => setTheme(ev.target.value as any)} title="Thème de table">
            <option value="local">Table locale</option>
            <option value="vip">Table VIP</option>
            <option value="competition">Table compétition</option>
          </select>
          <select value={opponentCards} onChange={(ev) => setOpponentCards(ev.target.value as any)} title="Cartes adverses">
            <option value="faceup">Cartes adverses visibles</option>
            <option value="back">Cartes adverses cachées (dos)</option>
          </select>
          <button className="primary" onClick={start}>Lancer</button>
          {mode === 'play' && robots.length < 3 && <span className="err">Créez au moins 3 robots pour jouer avec eux.</span>}
        </div>
        <p className="muted">
          Même moteur et mêmes robots que l'entraînement classique, rendu avec la nouvelle table
          (design system). En local, aucun point récompense n'est attribué.
        </p>
      </div>
    );
  }

  // ── Table dans sa section (HUD autour) + console/logs à côté, comme la v1 ──
  return (
    <div className="container" style={{ maxWidth: 'none' }}>
      <h1>Entraînement v2 <span className="muted" style={{ fontSize: 14 }}>(nouvelle table)</span></h1>
      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <button className="primary" onClick={start} disabled={running && e.phase !== 'partie_end'}>
          {running && e.phase !== 'partie_end' ? 'En cours…' : 'Relancer'}
        </button>
        <select value={theme} onChange={(ev) => setTheme(ev.target.value as any)} title="Thème de table">
          <option value="local">Table locale</option>
          <option value="vip">Table VIP</option>
          <option value="competition">Table compétition</option>
        </select>
        <select value={opponentCards} onChange={(ev) => setOpponentCards(ev.target.value as any)} title="Cartes adverses">
          <option value="faceup">Cartes adverses visibles</option>
          <option value="back">Cartes adverses cachées (dos)</option>
        </select>
        {e.phase === 'partie_end' && <span style={{ marginLeft: 'auto' }}>Vainqueur : <b>équipe {e.partieWinner}</b></span>}
        {e.phase === 'partie_end' && (savedId ? <a href={`#/replay/${savedId}`}>Voir le rejeu</a> : <button onClick={save}>Sauvegarder le rejeu</button>)}
        <button onClick={stop}>Quitter</button>
      </div>

      <div className="layout-game">
        <div className="layout-game__table">
          {/*
            tv2-wrap — la SECTION de la table : le canvas vit dans .tv2-stage, entouré de
            deux zones réservées au futur HUD dédié :
              .tv2-hud-top  : bande au-dessus (hauteur 200px mini)
              .tv2-hud-left : colonne à gauche (largeur 50px mini)
          */}
          <div className="tv2-wrap" style={{ position: 'relative', paddingTop: 200, paddingLeft: 50 }}>
            <div className="tv2-hud-top" style={{ position: 'absolute', top: 0, left: 50, right: 0, height: 200 }} />
            <div className="tv2-hud-left" style={{ position: 'absolute', top: 200, left: 0, width: 50, bottom: 0 }} />
            <div className="tv2-stage" style={{ position: 'relative', height: 'max(520px, calc(100vh - 420px))', borderRadius: 16, overflow: 'hidden' }}>
              <PixiTable
                view={e.view()}
                names={e.players.map((p) => p.name)}
                hands={[0, 1, 2, 3].map((i) => e.handOf(i as Seat))}
                mySeat={mode === 'play' ? 0 : null}
                legal={myTurnHuman ? e.legalCards(0) : []}
                onBid={mode === 'play' ? onBid : undefined}
                onPlay={myTurnHuman && e.phase === 'playing' ? onPlay : undefined}
                summary={e.summary()}
                theme={theme}
                opponentCards={opponentCards}
                onLeave={stop}
                onBeloteToggle={mode === 'play' ? (on) => { e.setBeloteAnnounce(0, on); bump(); } : undefined}
                forceLandscape={false}
              />
            </div>
          </div>
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
        <div className="layout-game__side" style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: 12 }}>
          <DevDock view={e.view()} names={e.players.map((p) => p.name)} logs={logs} />
        </div>
      </div>

      {e.phase === 'partie_end' && <Recap summary={e.summary()} names={e.players.map((p) => p.name)} />}
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
