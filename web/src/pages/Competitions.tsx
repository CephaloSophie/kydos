import { useEffect, useState } from 'react';
import { competitionApiService, type Competition } from '../services/CompetitionApiService';
import { robotApiService } from '../services/RobotApiService';
import { socketService } from '../services/SocketService';
import { Button } from '../ds/core/Button';
import type { RobotSummary } from '../models/Robot.model';

const STATUS_LABEL: Record<string, string> = { open: 'En attente', running: 'En cours', finished: 'Terminée', cancelled: 'Annulée' };
const STATUS_COLOR: Record<string, string> = { open: 'var(--spark)', running: 'var(--accent)', finished: 'var(--success)', cancelled: 'var(--text-3)' };

/** Sélecteur de 2 robots (paire d'équipe). */
function RobotPairPicker({ robots, value, onChange }: { robots: RobotSummary[]; value: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((r) => r !== id));
    else if (value.length < 2) onChange([...value, id]);
  };
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {robots.map((robot) => {
        const picked = value.includes(robot.id);
        return (
          <button key={robot.id} className={`gt-bidchip ${picked ? 'capot' : 'pass'}`} style={{ padding: '4px 12px' }} onClick={() => toggle(robot.id)}>
            🤖 {robot.name}{picked ? ` (${value.indexOf(robot.id) === 0 ? 'A1' : 'A2'})` : ''}
          </button>
        );
      })}
    </div>
  );
}

export function CompetitionsPage() {
  const [myRobots, setMyRobots] = useState<RobotSummary[]>([]);
  const [openTables, setOpenTables] = useState<Competition[]>([]);
  const [myTables, setMyTables] = useState<Competition[]>([]);
  const [createPair, setCreatePair] = useState<string[]>([]);
  const [joinPairById, setJoinPairById] = useState<Record<string, string[]>>({});
  const [manches, setManches] = useState(2);
  const [errorMessage, setErrorMessage] = useState('');

  const refresh = () => {
    competitionApiService.listOpen().then(setOpenTables).catch(() => {});
    competitionApiService.listMine().then(setMyTables).catch(() => {});
  };

  useEffect(() => {
    robotApiService.listMine().then(setMyRobots).catch(() => {});
    refresh();
    const socket = socketService.getSocket();
    socket.emit('competitions:subscribe');
    const onChange = () => refresh();
    socket.on('competitions:changed', onChange);
    return () => { socket.emit('competitions:unsubscribe'); socket.off('competitions:changed', onChange); };
  }, []);

  const createTable = async () => {
    setErrorMessage('');
    try { await competitionApiService.create(createPair, manches); setCreatePair([]); refresh(); }
    catch (error) { setErrorMessage((error as Error).message); }
  };

  const joinTable = async (competitionId: string) => {
    setErrorMessage('');
    try { await competitionApiService.join(competitionId, joinPairById[competitionId] ?? []); refresh(); }
    catch (error) { setErrorMessage((error as Error).message); }
  };

  const cancelTable = async (competitionId: string) => {
    try { await competitionApiService.cancel(competitionId); refresh(); }
    catch (error) { setErrorMessage((error as Error).message); }
  };

  const enoughRobots = myRobots.length >= 2;

  return (
    <div className="container">
      <h1>Compétition de robots</h1>
      <p className="muted">Affrontez deux de vos robots contre ceux d'un autre joueur. La partie se joue automatiquement côté serveur ; vous consultez le résultat une fois terminée.</p>
      {errorMessage && <p className="err">{errorMessage}</p>}
      {!enoughRobots && <p className="err">Il vous faut au moins 2 robots. Créez-les dans l'onglet Robots.</p>}

      <div className="split">
        <div className="card">
          <h3>Créer une table (publique)</h3>
          <label>Vos 2 robots (équipe A)</label>
          <RobotPairPicker robots={myRobots} value={createPair} onChange={setCreatePair} />
          <div style={{ margin: '10px 0' }}>
            <label>Manches</label>
            <select value={manches} onChange={(event) => setManches(Number(event.target.value))}>{[1, 2, 4].map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <Button variant="primary" disabled={createPair.length !== 2} onClick={createTable}>Créer la table</Button>
          <p className="muted" style={{ fontSize: 'var(--fs-xs)', marginTop: 8 }}>Maximum 2 tables actives par joueur.</p>
        </div>

        <div className="card">
          <h3>Tables ouvertes</h3>
          {openTables.length === 0 && <p className="muted">Aucune table ouverte. Créez-en une ou attendez un adversaire.</p>}
          {openTables.map((table) => (
            <div key={table.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-1)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>🤖 {table.ownerRobots.map((r) => r.name).join(' + ')} · {table.config.manches} manche(s)</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <label style={{ fontSize: 'var(--fs-xs)' }}>Vos 2 robots (équipe B)</label>
                <RobotPairPicker robots={myRobots} value={joinPairById[table.id] ?? []} onChange={(ids) => setJoinPairById((prev) => ({ ...prev, [table.id]: ids }))} />
                <div style={{ marginTop: 6 }}>
                  <Button size="sm" variant="secondary" disabled={(joinPairById[table.id] ?? []).length !== 2} onClick={() => joinTable(table.id)}>Affronter</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Mes compétitions</h3>
        {myTables.length === 0 && <p className="muted">Aucune compétition pour l'instant.</p>}
        {myTables.map((table) => (
          <div key={table.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-1)' }}>
            <span>
              🤖 {table.ownerRobots.map((r) => r.name).join(' + ')}
              {table.challengerRobots.length > 0 && <> &nbsp;vs&nbsp; {table.challengerRobots.map((r) => r.name).join(' + ')}</>}
            </span>
            <span className="row" style={{ gap: 10 }}>
              {table.status === 'finished' && <b>Équipe {table.winner} · {table.scoreTeamA}–{table.scoreTeamB}</b>}
              <span style={{ color: STATUS_COLOR[table.status], fontWeight: 700 }}>{STATUS_LABEL[table.status]}</span>
              {table.status === 'open' && <Button size="sm" variant="ghost" onClick={() => cancelTable(table.id)}>Annuler</Button>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
