// ============================================================================
//  Fixtures — alimente la base : utilisateurs, robots, et une partie de démo
//  (rejeu sauvegardé). Idempotent : relançable sans dupliquer.
//
//  Lancement :  npm --workspace belote-server run seed
//          ou :  cd server && npx tsx src/seed.ts
// ============================================================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  ContreeRules, createAlgorithm, DEFAULT_PARTIE, GameEngine, makeRobot, robotAct,
  type EnginePlayer, type Seat,
} from 'belote-core';
import { environment } from './core/environment.js';
import { UserModel } from './modules/user/user.model.js';
import { RobotModel } from './modules/robot/robot.model.js';
import { GameModel } from './modules/game/game.model.js';
import { GameReplayModel } from './modules/game/gameReplay.model.js';
import { gameProjectionService } from './modules/analytics/gameProjection.service.js';
import { TeamModel } from './modules/team/team.model.js';
import { InvitationModel } from './modules/invitation/invitation.model.js';

const USERS = [
  { username: 'ameur', password: 'belote123', email: 'ameur@contree.fr' },
  { username: 'invite', password: 'belote123', email: 'invite@contree.fr' },
  { username: 'sofia', password: 'belote123', email: 'sofia@contree.fr' },
];

const ROBOTS = [
  { name: 'Athéna', personality: { aggressiveness: 8, concentration: 7, velocity: 8 }, responseTimeMs: 700 },
  { name: 'Borée', personality: { aggressiveness: 3, concentration: 6, velocity: 5 }, responseTimeMs: 1000 },
  { name: 'Calliope', personality: { aggressiveness: 6, concentration: 8, velocity: 6 }, responseTimeMs: 900 },
  { name: 'Damon', personality: { aggressiveness: 4, concentration: 9, velocity: 4 }, responseTimeMs: 1200 },
];

async function upsertUser(username: string, password: string, email: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return UserModel.findOneAndUpdate(
    { username },
    { $set: { passwordHash, email }, $setOnInsert: { rewardPoints: 0 } },
    { upsert: true, new: true },
  );
}

/** Joue une partie robot-vs-robot et renvoie le ReplayRecord + logs. */
function playSamplePartie() {
  const rules = new ContreeRules();
  const robots = ROBOTS.map((r, i) => makeRobot({ id: `seed${i}`, name: r.name, personality: r.personality, responseTimeMs: r.responseTimeMs }));
  const players: EnginePlayer[] = robots.map((r, i) => ({ seat: i as Seat, name: r.name, type: 'robot', robotId: r.id }));
  const logs: any[] = [];
  const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches: 2, local: true }, rules, 1234);
  const brains = robots.map((r) => createAlgorithm(r, rules, (e) => { if (logs.length < 400) logs.push(e); }));

  let guard = 0;
  while (engine.phase !== 'partie_end' && guard++ < 5000) {
    if (engine.phase === 'donne_end') { engine.nextDonne(); continue; }
    if (engine.phase === 'manche_end') { engine.nextManche(); continue; }
    if (engine.view().awaitingCollect) { engine.collectTrick(); continue; }
    const seat = engine.turn!;
    const act = robotAct(engine, seat, brains[seat]);
    if (act.kind === 'bid') { const res = engine.submitBid(seat, act.bid); if (!res.ok) engine.submitBid(seat, { action: 'pass' }); }
    else engine.playCard(seat, act.card);
  }
  return { replay: engine.toReplay(), logs, winner: engine.partieWinner };
}

/** Alimente la base — suppose une connexion mongoose DÉJÀ établie (réutilisable). */
export async function seedDatabase() {

  // 1. utilisateurs
  const [ameur, invite, sofia] = await Promise.all(USERS.map((u) => upsertUser(u.username, u.password, u.email)));
  console.log(`[seed] utilisateurs : ${USERS.map((u) => u.username).join(', ')}`);

  // 2. robots du compte principal (remplace les précédents pour rester idempotent)
  // équipe de démo + rattachement
  const team = await TeamModel.findOneAndUpdate({ name: 'Les Atouts' }, { $set: { owner: ameur!._id, visibility: 'public' }, $setOnInsert: { points: 1200 } }, { upsert: true, new: true });
  await UserModel.updateOne({ _id: ameur!._id }, { $set: { team: team!._id } });
  await UserModel.updateOne({ _id: invite!._id }, { $set: { team: team!._id } });
  await UserModel.updateOne({ _id: sofia!._id }, { $set: { team: null } });
  // invitation en attente : ameur invite sofia
  await InvitationModel.deleteMany({ team: team!._id });
  await InvitationModel.create({ team: team!._id, from: ameur!._id, to: sofia!._id, status: 'pending' });
  console.log('[seed] invitation en attente : ameur -> sofia (Les Atouts)');

  await RobotModel.deleteMany({ owner: ameur!._id });
  await RobotModel.insertMany(ROBOTS.map((r, i) => ({ owner: ameur!._id, conventionConfig: {}, maxPlayTimeMs: 10000, offlineEnabled: i < 2, representativeSlot: i + 1, algoSpec: { version: 1, name: i % 2 ? 'Agressif' : 'Classique', personality: r.personality, bidding: { acePoints: 10 + i }, contre: { enabled: true, minOpponentRiskToContre: 0.65, minOwnStrengthToSurcontre: 0.8 }, play: { aggressiveness: r.personality.aggressiveness } }, ...r })));
  console.log(`[seed] ${ROBOTS.length} robots créés pour « ${ameur!.username} »`);

  // 3. une partie de démo enregistrée (agrégat + replay froid séparé)
  await GameModel.deleteMany({ owner: ameur!._id, mode: 'local' });
  await GameReplayModel.deleteMany({});
  const sample = playSamplePartie();
  const demoGameId = new mongoose.Types.ObjectId();
  const replay: any = sample.replay;
  const demoParticipants = (replay.players ?? []).map((player: any) => ({
    seatIndex: player.seat, team: player.seat % 2 === 0 ? 'A' : 'B',
    type: player.type === 'robot' ? 'robot' : 'human',
    user: player.type === 'robot' ? null : ameur!._id, robot: null, name: player.name ?? '', wasSubstitute: false,
  }));
  const demoManches = (replay.manches ?? []).map((manche: any, i: number) => ({
    number: manche.index ?? i + 1, target: manche.target ?? 0, winner: manche.winner ?? null,
    scoreTeamA: manche.cumulative?.A ?? 0, scoreTeamB: manche.cumulative?.B ?? 0,
  }));
  await GameReplayModel.create({ _id: demoGameId, game: demoGameId, replay, logs: sample.logs });
  await GameModel.create({
    _id: demoGameId, owner: ameur!._id, team: team!._id, visibility: 'public', mode: 'local',
    winner: sample.winner ?? null, participants: demoParticipants, manches: demoManches,
    projection: { status: 'pending', version: 0, at: null },
  });
  await gameProjectionService.projectGame(String(demoGameId));
  await UserModel.updateOne({ _id: ameur!._id }, { $set: { rewardPoints: 320, gamesPlayed: 12 } });
  await UserModel.updateOne({ _id: invite!._id }, { $set: { rewardPoints: 140, gamesPlayed: 6 } });
  console.log(`[seed] partie de démo sauvegardée (vainqueur équipe ${sample.winner})`);

  console.log('\n[seed] terminé ✓  — connecte-toi avec  ameur / belote123  (ou  invite / belote123 )');
}

/** Exécution en CLI : ouvre/ferme la connexion lui-même. */
async function cli() {
  await mongoose.connect(environment.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('[seed] connecté à MongoDB');
  await seedDatabase();
  await mongoose.disconnect();
}

// Lancé directement (et non importé) ?
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cli().catch((e) => { console.error('[seed] erreur :', e); process.exit(1); });
}
