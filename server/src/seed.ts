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
import { CompetitionTableModel } from './modules/competition/competition.model.js';
import { PromoCodeModel } from './modules/promo/promo.model.js';
import { TableModel } from './modules/table/table.model.js';
import { DAILY_REWARD } from './shared/gameEconomy.js';

/**
 * Comptes de démonstration — couvrent TOUS les rôles d'équipe afin de pouvoir
 * tester les permissions sans manipulation manuelle.
 *   ameur  → propriétaire de l'équipe (owner)
 *   hamid  → super administrateur
 *   sofia  → administrateur
 *   invite → membre simple
 *   zoe    → hors équipe (sert à tester les invitations)
 * Mot de passe commun : belote123
 */
const USERS = [
  { username: 'ameur',  password: 'belote123', email: 'ameur@contree.fr',  role: 'owner',  tokens: 5000 },
  { username: 'hamid',  password: 'belote123', email: 'hamid@contree.fr',  role: 'super',  tokens: 3200 },
  { username: 'sofia',  password: 'belote123', email: 'sofia@contree.fr',  role: 'admin',  tokens: 2100 },
  { username: 'invite', password: 'belote123', email: 'invite@contree.fr', role: 'user',   tokens: 900 },
  { username: 'zoe',    password: 'belote123', email: 'zoe@contree.fr',    role: null,     tokens: 500 },
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

  // ── 1. Utilisateurs (tous les rôles représentés) ──────────────────────
  const users = await Promise.all(USERS.map((u) => upsertUser(u.username, u.password, u.email)));
  const byName = new Map(USERS.map((u, i) => [u.username, users[i]!]));
  const ameur = byName.get('ameur')!, hamid = byName.get('hamid')!;
  const sofia = byName.get('sofia')!, invite = byName.get('invite')!, zoe = byName.get('zoe')!;
  console.log(`[seed] utilisateurs : ${USERS.map((u) => u.username).join(', ')} (mot de passe : belote123)`);

  // ── 2. Porte-monnaie : solde initial + journal de transactions ────────
  for (const spec of USERS) {
    const user = byName.get(spec.username)!;
    await UserModel.updateOne({ _id: user._id }, {
      $set: {
        'wallet.tokens': spec.tokens,
        'wallet.lastClaimDay': null,
        'wallet.transactions': [
          { kind: 'daily', amount: DAILY_REWARD, balance: spec.tokens, at: new Date(Date.now() - 864e5) },
        ],
      },
    });
  }
  console.log(`[seed] porte-monnaie alimenté (${USERS.map((u) => `${u.username}:${u.tokens}`).join(', ')})`);

  // ── 3. Équipe de démo avec les 4 rôles ────────────────────────────────
  const team = await TeamModel.findOneAndUpdate(
    { name: 'Les Atouts' },
    { $set: { owner: ameur._id, visibility: 'public' }, $setOnInsert: { points: 1200 } },
    { upsert: true, new: true },
  );
  team!.members = [
    { user: ameur._id,  role: 'owner', joinedAt: new Date() },
    { user: hamid._id,  role: 'super', joinedAt: new Date() },
    { user: sofia._id,  role: 'admin', joinedAt: new Date() },
    { user: invite._id, role: 'user',  joinedAt: new Date() },
  ] as never;
  await team!.save();
  await UserModel.updateMany({ _id: { $in: [ameur._id, hamid._id, sofia._id, invite._id] } }, { $set: { team: team!._id } });
  await UserModel.updateOne({ _id: zoe._id }, { $set: { team: null } });
  console.log('[seed] équipe « Les Atouts » : owner=ameur, super=hamid, admin=sofia, user=invite');

  // Seconde équipe publique, pour tester l'adhésion.
  const rivals = await TeamModel.findOneAndUpdate(
    { name: 'Les Contrées' },
    { $set: { owner: zoe._id, visibility: 'public' }, $setOnInsert: { points: 640 } },
    { upsert: true, new: true },
  );
  rivals!.members = [{ user: zoe._id, role: 'owner', joinedAt: new Date() }] as never;
  await rivals!.save();
  console.log('[seed] équipe « Les Contrées » (publique, propriétaire zoe)');

  // ── 4. Invitation en attente : ameur invite zoe ───────────────────────
  await InvitationModel.deleteMany({ team: team!._id });
  await InvitationModel.create({ team: team!._id, from: ameur._id, to: zoe._id, status: 'pending' });
  console.log('[seed] invitation en attente : ameur -> zoe (Les Atouts)');

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

  // ── 8. Compétition ouverte entre robots (prête à être rejointe) ───────
  await CompetitionTableModel.deleteMany({});
  const ameurRobots = await RobotModel.find({ owner: ameur._id }).limit(2).lean();
  if (ameurRobots.length === 2) {
    await CompetitionTableModel.create({
      owner: ameur._id,
      ownerRobots: ameurRobots.map((r: any) => r._id),
      visibility: 'public',
      status: 'open',
      config: { manches: 2 },
    });
    console.log('[seed] compétition ouverte : 2 robots d\'ameur attendent un challenger');
  }

  // ── 9. Table de lobby publique (2 sièges libres) ──────────────────────
  await TableModel.deleteMany({});
  await TableModel.create({
    status: 'lobby', ownerType: 'user', owner: ameur._id, visibility: 'public',
    seats: [
      { index: 0, kind: 'human', user: ameur._id, robot: null, ownerId: null, name: 'ameur' },
      { index: 1, kind: 'empty', user: null, robot: null, ownerId: null, name: '' },
      { index: 2, kind: 'robot', user: null, robot: ameurRobots[0]?._id ?? null, ownerId: ameur._id, name: ameurRobots[0]?.name ?? 'Robot' },
      { index: 3, kind: 'empty', user: null, robot: null, ownerId: null, name: '' },
    ],
    config: { manches: 2 },
  });
  console.log('[seed] table de lobby publique : 2 sièges libres');

  // ── 10. Codes promo de démonstration (rechargement de jetons) ──────────
  await PromoCodeModel.deleteMany({});
  const nowMs = Date.now();
  await PromoCodeModel.create([
    { code: '111122223333', tokens: 500, expiresAt: new Date(nowMs + 7 * 86_400_000), maxRedemptions: 1000, label: 'Bienvenue (7 j)' },
    { code: '444455556666', tokens: 2000, expiresAt: new Date(nowMs + 30 * 86_400_000), maxRedemptions: 500, label: 'Promo 30 j' },
    { code: '999988887777', tokens: 10000, expiresAt: new Date(nowMs + 30 * 86_400_000), maxRedemptions: 50, label: 'Gros lot' },
  ]);
  console.log('[seed] 3 codes promo : 1111-2222-3333 (500), 4444-5555-6666 (2000), 9999-8888-7777 (10000)');

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
