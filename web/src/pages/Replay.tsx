import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SUIT_SYMBOL, sameCard, teamOf, type Card, type EngineView, type ScoreSummary, type Seat } from 'belote-core';
import { apiFetch } from '../lib/api';
import { TableSurface } from '../table';
import { Recap } from '../components/ScoreBoard';

interface DonneRec {
  dealer: Seat; hands: Card[][]; trump: any; bidderSeat: Seat | null; contract: number | null; contre: any;
  operations: { type: string; seat?: Seat; data: any }[]; donneScore?: { A: number; B: number };
}
interface MancheRec { index: number; target: number; isLabel: boolean; labelKind?: any; donnes: DonneRec[]; winner?: 'A' | 'B'; cumulative: { A: number; B: number } }
interface Replay { config: any; players: { name: string }[]; manches: MancheRec[]; manchesWon: { A: number; B: number }; winner?: 'A' | 'B' }

export function ReplayPage() {
  const { id = '' } = useParams();
  const [replay, setReplay] = useState<Replay | null>(null);
  const [mi, setMi] = useState(0);
  const [di, setDi] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiFetch(`/games/${id}`).then((r) => setReplay(r.game.replay)).catch((e) => setErr((e as Error).message));
  }, [id]);

  const flat = useMemo(() => {
    if (!replay) return [];
    const arr: { mi: number; di: number }[] = [];
    replay.manches.forEach((m, i) => m.donnes.forEach((_, j) => arr.push({ mi: i, di: j })));
    return arr;
  }, [replay]);

  if (err) return <div className="container"><p className="err">{err}</p></div>;
  if (!replay) return <div className="container"><p className="muted">Chargement du rejeu…</p></div>;

  const manche = replay.manches[mi];
  const donne = manche?.donnes[di];
  if (!donne) return <div className="container"><p className="muted">Donne introuvable.</p></div>;

  const ops = donne.operations;
  const baseCum = replay.manches[mi].donnes.slice(0, di).reduce(
    (acc, d) => ({ A: acc.A + (d.donneScore?.A ?? 0), B: acc.B + (d.donneScore?.B ?? 0) }), { A: 0, B: 0 });
  const manchesWonBefore = replay.manches.slice(0, mi).reduce(
    (acc, m) => ({ A: acc.A + (m.winner === 'A' ? 1 : 0), B: acc.B + (m.winner === 'B' ? 1 : 0) }), { A: 0, B: 0 });

  // Reconstruit l'état jusqu'au curseur
  const hands = donne.hands.map((h) => [...h]);
  let trick: { seat: Seat; card: Card }[] = [];
  let curLeader: Seat | null = null;
  let lastTrick: { plays: { seat: Seat; card: Card }[]; leaderSeat: Seat | null; winnerSeat: Seat | null } | null = null;
  const replayBids: any[] = [];
  const bidsText: string[] = [];
  const cum = { ...baseCum };
  let sawPlay = false;
  let lastSeat: Seat | null = null;
  const donneRaw = { A: 0, B: 0 };
  const tricksW = { A: 0, B: 0 };
  for (let k = 0; k <= cursor && k < ops.length; k++) {
    const op = ops[k];
    if (op.type === 'bid') {
      replayBids.push({ seat: op.seat, action: op.data.action, value: op.data.value, suit: op.data.suit });
      bidsText.push(`${replay.players[op.seat!]?.name}: ${op.data.action}${op.data.value ? ' ' + op.data.value + ' ' + SUIT_SYMBOL[op.data.suit as keyof typeof SUIT_SYMBOL] : ''}`);
    }
    if (op.type === 'play') {
      sawPlay = true;
      if (trick.length === 0) curLeader = op.seat!;
      hands[op.seat!] = hands[op.seat!].filter((c) => !sameCard(c, op.data.card));
      trick.push({ seat: op.seat!, card: op.data.card }); lastSeat = op.seat!;
    }
    if (op.type === 'trick') {
      const wt = teamOf(op.data.winnerSeat as Seat);
      donneRaw[wt] += op.data.points ?? 0; tricksW[wt] += 1;
      lastTrick = { plays: [...trick], leaderSeat: curLeader, winnerSeat: op.data.winnerSeat };
      trick = []; curLeader = null;
    }
    if (op.type === 'donne_score') { cum.A += op.data.A; cum.B += op.data.B; }
  }

  const view: EngineView = {
    phase: sawPlay ? 'playing' : 'bidding',
    turn: lastSeat != null ? ((lastSeat + 1) % 4) as Seat : donne.bidderSeat,
    trump: donne.trump, bidderSeat: donne.bidderSeat, currentBidValue: donne.contract, contre: donne.contre, belote: null,
    dealer: donne.dealer ?? 0, firstBidderSeat: ((((donne.dealer ?? 0) + (replay.config?.clockwise ? 3 : 1)) % 4) as Seat),
    contreSeats: [], surcontreSeats: [],
    bids: replayBids, currentTrick: trick, currentTrickLeader: curLeader,
    awaitingCollect: false, pendingWinnerSeat: null, lastTrick,
    manchesWon: manchesWonBefore, cumulative: cum,
    board: { donneRaw, tricks: tricksW, bidderTeam: donne.bidderSeat != null ? teamOf(donne.bidderSeat) : null },
    target: manche.target,
    mancheIndex: manche.index, isLabel: manche.isLabel, labelKind: manche.labelKind,
    clockwise: !!replay.config?.clockwise,
  };

  const bids = bidsText;

  const goDonne = (gi: number) => { const f = flat[gi]; if (f) { setMi(f.mi); setDi(f.di); setCursor(0); } };
  const flatIndex = flat.findIndex((f) => f.mi === mi && f.di === di);

  const summary: ScoreSummary = {
    manches: replay.manches.map((m) => ({
      index: m.index, target: m.target, isLabel: m.isLabel, labelKind: m.labelKind, winner: m.winner, cumulative: m.cumulative,
      donnes: m.donnes.map((d, i) => ({
        index: i + 1, dealer: d.dealer, bidderSeat: d.bidderSeat,
        bidderTeam: d.bidderSeat != null ? teamOf(d.bidderSeat) : null,
        trump: d.trump, contract: d.contract, contre: d.contre, score: d.donneScore ?? { A: 0, B: 0 },
      })),
    })),
    manchesWon: replay.manchesWon, winner: replay.winner,
  };

  return (
    <div className="container">
      <h1>Rejeu <span className="muted">· vainqueur équipe {replay.winner}</span></h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <button onClick={() => goDonne(flatIndex - 1)} disabled={flatIndex <= 0}>◀ Donne préc.</button>
        <span className="pill">Donne {flatIndex + 1}/{flat.length} (manche {manche.index})</span>
        <button onClick={() => goDonne(flatIndex + 1)} disabled={flatIndex >= flat.length - 1}>Donne suiv. ▶</button>
        <span style={{ marginLeft: 'auto' }} />
        <button onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}>◀ Étape</button>
        <span className="pill">Étape {cursor + 1}/{ops.length}</span>
        <button onClick={() => setCursor((c) => Math.min(ops.length - 1, c + 1))} disabled={cursor >= ops.length - 1}>Étape ▶</button>
      </div>
      <div className="layout-game" style={{ height: 620 }}>
        <div className="layout-game__table">
          <TableSurface view={view} names={replay.players.map((p) => p.name)} hands={hands} mySeat={null} summary={summary} config={{ sheetSeed: id }} />
        </div>
        <div className="card layout-game__side" style={{ overflow: 'auto' }}>
          <h3>Enchères</h3>
          {bids.length === 0 ? <p className="muted">—</p> : bids.map((b, i) => <div key={i} className="logline">{b}</div>)}
          {donne.donneScore && cursor >= ops.length - 1 && (
            <p style={{ marginTop: 10 }}>Score de la donne : <b>A {donne.donneScore.A}</b> — <b>B {donne.donneScore.B}</b></p>
          )}
        </div>
      </div>
      <Recap summary={summary} names={replay.players.map((p) => p.name)} />
    </div>
  );
}
