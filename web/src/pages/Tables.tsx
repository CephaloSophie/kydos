import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../state';
import { tableApiService } from '../services/TableApiService';
import { robotApiService } from '../services/RobotApiService';
import { API_URL } from '../lib/api';
import { Button } from '../ds/core/Button';
import { Switch } from '../ds/forms/Switch';
import { TeamBadge } from '../ds/score/TeamBadge';
import { TableSurface, BeloteTableClient } from '../table';
import type { Bid, Card, Seat } from 'belote-core';
import type { GameTable } from '../models/GameTable.model';
import type { RobotListItem } from '../models/Robot.model';
import type { GameState } from '../models/GameState.model';

export function TablesPage() {
  const { user } = useAuth();
  const [tableList, setTableList] = useState<GameTable[]>([]);
  const [currentTable, setCurrentTable] = useState<GameTable | null>(null);
  const [myRobots, setMyRobots] = useState<RobotListItem[]>([]);
  const [forTeam, setForTeam] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [mancheCount, setMancheCount] = useState(2);
  const [errorMessage, setErrorMessage] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [finishedResult, setFinishedResult] = useState<{ winner?: string } | null>(null);

  // CONTRÔLEUR réseau (socket + actions) — toute la plomberie est encapsulée ici.
  const clientRef = useRef<BeloteTableClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new BeloteTableClient({ socketUrl: API_URL, token: localStorage.getItem('token') ?? undefined });
  }
  const client = clientRef.current;

  const refreshTableList = () => tableApiService.listOpen().then(setTableList).catch(() => {});

  useEffect(() => {
    refreshTableList();
    robotApiService.listMine().then(setMyRobots).catch(() => {});
    const off = client.on((event) => {
      if (event.type === 'tablesChanged') refreshTableList();
      else if (event.type === 'table') setCurrentTable((current) => (current && current.id === event.table.id ? (event.table as unknown as GameTable) : current));
      else if (event.type === 'state') { setGameState(event.state as GameState); setFinishedResult(null); }
      else if (event.type === 'finished') setFinishedResult({ winner: event.winner });
    });
    client.connect();
    return () => { off(); client.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTable = async (tableId: string) => {
    const table = await tableApiService.getById(tableId);
    setCurrentTable(table);
    client.subscribe(table.id);
  };

  const createTable = async () => {
    setErrorMessage('');
    try {
      const table = await tableApiService.create(isPublic ? 'public' : 'private', forTeam, { manches: mancheCount });
      setCurrentTable(table);
      client.subscribe(table.id);
      refreshTableList();
    } catch (error) { setErrorMessage((error as Error).message); }
  };

  const assignSeat = async (seatIndex: number, assignment: string) => {
    if (!currentTable) return;
    try { setCurrentTable(await tableApiService.changeSeat(currentTable.id, seatIndex, assignment)); }
    catch (error) { setErrorMessage((error as Error).message); }
  };

  const leaveTable = async () => {
    if (!currentTable) return;
    await tableApiService.leave(currentTable.id);
    client.unsubscribe();
    setCurrentTable(null);
    setGameState(null);
    setFinishedResult(null);
    refreshTableList();
  };

  // ---- Partie en cours --------------------------------------------------------
  if (currentTable && gameState) {
    const playerNames = [0, 1, 2, 3].map((seatIndex) => currentTable.seats.find((seat) => seat.index === seatIndex)?.name ?? `Siège ${seatIndex + 1}`);
    const handsByPosition = gameState.watcher
      ? (gameState.hands ?? [])
      : [0, 1, 2, 3].map((seatIndex) => (seatIndex === gameState.mySeat ? (gameState.myHand ?? []) : null));
    return (
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>Partie en cours</h1>
          <Button variant="ghost" onClick={leaveTable}>Quitter</Button>
        </div>
        {finishedResult && <p style={{ color: 'var(--success)' }}>Partie terminée — équipe <b>{finishedResult.winner}</b> gagne. 🏆</p>}
        <div style={{ height: 560 }}>
          <TableSurface
            view={gameState.view}
            names={playerNames}
            hands={handsByPosition as any}
            mySeat={(gameState.mySeat ?? null) as Seat | null}
            legal={gameState.legal}
            summary={gameState.summary}
            onBid={(bid: Omit<Bid, 'seat'>) => client.bid(bid)}
            onPlay={(card: Card) => client.play(card)}
            config={{ feltTheme: 'cosmos' }}
          />
        </div>
      </div>
    );
  }

  // ---- Lobby de la table ------------------------------------------------------
  if (currentTable) {
    const allSeatsFilled = currentTable.seats.every((seat) => seat.kind !== 'empty');
    const filledSeatCount = currentTable.seats.filter((seat) => seat.kind !== 'empty').length;
    return (
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>Table {currentTable.ownerType === 'team' ? "d'équipe" : 'perso'} · <span className="muted">{currentTable.visibility}</span></h1>
          <Button variant="ghost" onClick={leaveTable}>Quitter</Button>
        </div>
        {errorMessage && <p className="err">{errorMessage}</p>}
        <p className="muted">Placez-vous, basculez avec un robot, ou laissez un robot prendre la place. Tout changement est visible en direct.</p>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 640 }}>
          {currentTable.seats.map((seat) => (
            <div key={seat.index} className="card" style={{ borderColor: seat.team === 'A' ? 'var(--team-a, var(--accent))' : 'var(--team-b, var(--spark))' }}>
              <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Siège {seat.index + 1} · Équipe {seat.team}</div>
              <div className="row" style={{ gap: 8, margin: '6px 0', minHeight: 34 }}>
                {seat.kind !== 'empty' ? (<><TeamBadge name={seat.name} size={26} /><b>{seat.name}</b><span className="muted">{seat.kind === 'robot' ? '🤖' : ''}</span></>) : <span className="muted">— libre —</span>}
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" onClick={() => assignSeat(seat.index, 'me')}>M'asseoir</Button>
                {myRobots.slice(0, 3).map((robot) => <Button key={robot.id} size="sm" variant="ghost" onClick={() => assignSeat(seat.index, robot.id)}>🤖 {robot.name}</Button>)}
              </div>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          {!allSeatsFilled && <span className="muted">En attente de 4 joueurs… ({filledSeatCount}/4)</span>}
          {allSeatsFilled && currentTable.status === 'lobby' && <span style={{ color: 'var(--accent)' }}>Table complète — départ automatique dans 3 s ⏳</span>}
          {currentTable.status === 'playing' && !gameState && <span style={{ color: 'var(--spark)' }}>La partie démarre…</span>}
        </div>
      </div>
    );
  }

  // ---- Liste des tables -------------------------------------------------------
  return (
    <div className="container">
      <h1>Tables</h1>
      <div className="split">
        <div className="card">
          <h3>Créer une table</h3>
          <div style={{ margin: '8px 0' }}><Switch checked={isPublic} onChange={setIsPublic} label={isPublic ? 'Publique' : 'Privée'} /></div>
          {user?.team && <div style={{ margin: '8px 0' }}><Switch checked={forTeam} onChange={setForTeam} label={forTeam ? "Table d'équipe (membres autorisés)" : 'Table perso'} /></div>}
          <label>Manches</label>
          <select value={mancheCount} onChange={(event) => setMancheCount(Number(event.target.value))}>{[1, 2, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select>
          {errorMessage && <p className="err">{errorMessage}</p>}
          <div style={{ marginTop: 12 }}><Button variant="primary" onClick={createTable}>Créer &amp; m'asseoir</Button></div>
        </div>
        <div className="card">
          <h3>Tables ouvertes</h3>
          {tableList.length === 0 && <p className="muted">Aucune table ouverte. Créez-en une.</p>}
          {tableList.map((table) => (
            <div key={table.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
              <span>{table.ownerType === 'team' ? '👥' : '👤'} <b>{table.seats.filter((seat) => seat.kind !== 'empty').length}/4</b> · {table.visibility} · {table.config?.manches ?? 2} manche(s)</span>
              <Button size="sm" variant="secondary" onClick={() => openTable(table.id)}>Entrer</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
