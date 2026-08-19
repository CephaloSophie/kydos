import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';

const TOURNAMENT_CAPACITIES = [4, 8, 16, 32, 64, 128];
const VALID_FORMATS = ['duo_steel', 'hybrid_alliance', 'royal_square'];
const VALID_STATUSES = ['draft', 'upcoming', 'live', 'finished', 'cancelled'];

function occupantsAtPosition(capacity: number, position: number): number {
  if (position === 1 || position === 2) return 1;
  let rank = 3;
  let losers = 2;
  while (losers <= capacity / 2) {
    if (rank === position) return losers;
    rank += losers;
    losers *= 2;
  }
  return 0;
}

/**
 * Économie d'un tournoi (prix par position).
 *
 * Carrée royale (royal_square) : le bracket se joue en ÉQUIPES de 2 humains,
 * donc `capacity/2` feuilles, et chaque rang final est occupé par 2 humains
 * par équipe. On applique alors leaves = capacity/2 et teamSize = 2.
 * Les autres formats (1 vs 1) : leaves = capacity, teamSize = 1.
 */
function computeEconomics(capacity: number, entryFee: number, prizesByPosition: { position: number; prize: number }[], format?: string) {
  const isRoyal = format === 'royal_square';
  const leaves = isRoyal ? capacity / 2 : capacity;
  const teamSize = isRoyal ? 2 : 1;
  const totalCollected = capacity * entryFee;
  let totalPaid = 0;
  const breakdown = prizesByPosition.map(pp => {
    const occupants = occupantsAtPosition(leaves, pp.position) * teamSize;
    const totalPaidAtThisPosition = occupants * pp.prize;
    totalPaid += totalPaidAtThisPosition;
    return { position: pp.position, occupants, prizePerOccupant: pp.prize, totalPaidAtThisPosition };
  });
  return { totalCollected, totalPaid, houseNet: totalCollected - totalPaid, breakdown };
}

/**
 * Normalise la config de jeu d'un tournoi (v16). Applique bornes et valeurs
 * par défaut pour tout paramètre accepté par la table / la session de jeu.
 */
function sanitizeGameConfig(raw: any): any {
  const g = raw || {};
  const clamp = (v: any, min: number, max: number, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  return {
    manches: [1, 2, 4].includes(Number(g.manches)) ? Number(g.manches) : 2,
    baseTarget: clamp(g.baseTarget, 100, 100000, 1500),
    labelTarget: clamp(g.labelTarget, 100, 100000, 2000),
    roundCountdownSec: clamp(g.roundCountdownSec, 0, 300, 10),
    autoRejoinSec: clamp(g.autoRejoinSec, 0, 60, 5),
    trickDelayMs: clamp(g.trickDelayMs, 0, 10000, 900),
    speed: clamp(g.speed, 0.5, 4, 1),
    turnTimeoutMs: clamp(g.turnTimeoutMs, 3000, 120000, 15000),
    allowSpectators: g.allowSpectators !== false,
    feltTheme: ['classic', 'cosmos', 'olympus'].includes(g.feltTheme) ? g.feltTheme : 'classic',
    signals: {
      reflexion: g.signals?.reflexion !== false,
      repeatSuit: g.signals?.repeatSuit !== false,
    },
  };
}

const router = Router();

router.get('/', async (req, res) => {
  try {
    const TournamentModel = mongoose.model('Tournament');
    const filter: any = {};
    const status = req.query.status as string;
    if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }
    const tournaments = await TournamentModel.find(filter)
      .sort({ startAt: -1 })
      .lean();
    res.json({ tournaments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Retourne un tournoi entièrement enrichi pour la vue Détail : usernames et
 * noms de robots (participants + slots du bracket), état de chaque match du
 * bracket (statut, table live, partie associée, scores serveur, dates) et
 * gagnants nommés. Conçu comme LA source unique de vérité de la page —
 * l'IHM n'a plus besoin d'appels supplémentaires.
 */
router.get('/:id', async (req, res) => {
  try {
    const TournamentModel = mongoose.model('Tournament');
    const UserModel = mongoose.model('User');
    const RobotModel = mongoose.model('Robot');
    const MatchModel = mongoose.model('Match');

    const tournament: any = await TournamentModel.findById(req.params.id).lean();
    if (!tournament) {
      res.status(404).json({ error: 'Tournoi non trouvé' });
      return;
    }

    // 1) Résolution centralisée des noms (users + robots) en 2 requêtes.
    const userIds = new Set<string>();
    const robotIds = new Set<string>();
    for (const p of tournament.participants ?? []) {
      if (p.userId) userIds.add(String(p.userId));
      for (const r of p.robotIds ?? []) robotIds.add(String(r));
      if (p.substituteRobotId) robotIds.add(String(p.substituteRobotId));
    }
    for (const w of tournament.winners ?? []) userIds.add(String(w));
    for (const r of tournament.bracketTree?.rounds ?? []) {
      for (const m of r.matches ?? []) {
        if (m.slotA?.userId) userIds.add(String(m.slotA.userId));
        if (m.slotA?.userId2) userIds.add(String(m.slotA.userId2));
        if (m.slotB?.userId) userIds.add(String(m.slotB.userId));
        if (m.slotB?.userId2) userIds.add(String(m.slotB.userId2));
      }
    }
    const [users, robots] = await Promise.all([
      UserModel.find({ _id: { $in: [...userIds] } }).select('username').lean(),
      RobotModel.find({ _id: { $in: [...robotIds] } }).select('name owner').lean(),
    ]);
    const userName = new Map<string, string>();
    for (const u of users as any[]) userName.set(String(u._id), u.username);
    const robotById = new Map<string, { name: string; owner: string }>();
    for (const r of robots as any[]) robotById.set(String(r._id), { name: r.name, owner: String(r.owner ?? '') });

    // 2) Enrichissement des participants (usernames + noms de robots).
    const participants = (tournament.participants ?? []).map((p: any) => ({
      userId: String(p.userId ?? ''),
      username: userName.get(String(p.userId ?? '')) ?? null,
      seedIndex: p.seedIndex ?? null,
      eliminatedAtRound: p.eliminatedAtRound ?? null,
      finalPosition: p.finalPosition ?? null,
      prizeAwarded: p.prizeAwarded ?? 0,
      joinedAt: p.joinedAt,
      robots: (p.robotIds ?? []).map((rid: any) => {
        const r = robotById.get(String(rid));
        return { id: String(rid), name: r?.name ?? '(robot supprimé)' };
      }),
      substituteRobot: p.substituteRobotId
        ? { id: String(p.substituteRobotId), name: robotById.get(String(p.substituteRobotId))?.name ?? '(robot supprimé)' }
        : null,
    }));

    // 3) Enrichissement du bracket : noms sur chaque slot + état du match.
    const bracketMatchIds: string[] = [];
    for (const r of tournament.bracketTree?.rounds ?? []) {
      for (const m of r.matches ?? []) {
        if (m.matchId) bracketMatchIds.push(String(m.matchId));
      }
    }
    const matchDocs = bracketMatchIds.length
      ? await MatchModel.find({ _id: { $in: bracketMatchIds } })
          .select('status liveTableId game scoreTeamA scoreTeamB winnerTeam startedAt finishedAt')
          .lean()
      : [];
    const matchById = new Map<string, any>();
    for (const m of matchDocs as any[]) matchById.set(String(m._id), m);

    const resolveSlot = (s: any) => ({
      userId: s?.userId ? String(s.userId) : null,
      username: s?.userId ? userName.get(String(s.userId)) ?? s?.displayName ?? null : null,
      seedIndex: s?.seedIndex ?? null,
      // Carrée royale : coéquipier.
      userId2: s?.userId2 ? String(s.userId2) : null,
      username2: s?.userId2 ? userName.get(String(s.userId2)) ?? s?.displayName2 ?? null : null,
      displayName: s?.displayName ?? '',
      displayName2: s?.displayName2 ?? '',
    });

    const bracketTree = {
      builtAt: tournament.bracketTree?.builtAt ?? null,
      lastCompletedRound: tournament.bracketTree?.lastCompletedRound ?? 0,
      rounds: (tournament.bracketTree?.rounds ?? []).map((round: any) => ({
        roundIndex: round.roundIndex,
        label: round.label || `Round ${round.roundIndex}`,
        matches: (round.matches ?? []).map((m: any) => {
          const md = m.matchId ? matchById.get(String(m.matchId)) : null;
          // Statut visuel unique consommé par l'IHM.
          const state = m.winner
            ? 'finished'
            : md?.status === 'running'
              ? 'live'
              : m.scheduledStartAt && new Date(m.scheduledStartAt).getTime() > Date.now()
                ? 'countdown'
                : (m.slotA?.userId && m.slotB?.userId) ? 'ready' : 'pending';
          return {
            matchIndex: m.matchIndex,
            matchId: m.matchId ? String(m.matchId) : null,
            gameId: m.gameId ? String(m.gameId) : (md?.game ? String(md.game) : null),
            liveTableId: md?.liveTableId ? String(md.liveTableId) : null,
            slotA: resolveSlot(m.slotA),
            slotB: resolveSlot(m.slotB),
            winner: m.winner ?? null,
            scoreA: m.scoreA ?? md?.scoreTeamA ?? null,
            scoreB: m.scoreB ?? md?.scoreTeamB ?? null,
            startedAt: m.startedAt ?? md?.startedAt ?? null,
            finishedAt: m.finishedAt ?? md?.finishedAt ?? null,
            scheduledStartAt: m.scheduledStartAt ?? null,
            state,
          };
        }),
      })),
    };

    const winners = (tournament.winners ?? []).map((w: any) => ({
      userId: String(w),
      username: userName.get(String(w)) ?? null,
    }));

    res.json({
      tournament: {
        ...tournament,
        participants,
        winners,
        bracketTree,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AdminRequest, res) => {
  try {
    const { name, format, capacity, entryFee, minLevel, maxLevel, startAt, description, color, icon, prizesByPosition, rounds, gameConfig, acceptLoss, publishImmediately } = req.body;

    if (!name || name.length < 3) {
      res.status(400).json({ error: 'Le nom doit contenir au moins 3 caractères' });
      return;
    }
    if (!VALID_FORMATS.includes(format)) {
      res.status(400).json({ error: 'Format invalide' });
      return;
    }
    if (!TOURNAMENT_CAPACITIES.includes(capacity)) {
      res.status(400).json({ error: 'Capacité invalide' });
      return;
    }
    if (entryFee < 0) {
      res.status(400).json({ error: 'Le frais d\'entrée doit être >= 0' });
      return;
    }
    const startDate = new Date(startAt);
    if (startDate.getTime() <= Date.now() - 60000) {
      res.status(400).json({ error: 'La date de début doit être dans le futur' });
      return;
    }

    if (prizesByPosition?.length) {
      const economics = computeEconomics(capacity, entryFee, prizesByPosition, format);
      if (economics.houseNet < 0 && !acceptLoss) {
        res.status(400).json({
          error: `Ce tournoi coûtera ${Math.abs(economics.houseNet)} ◆ à kydos. Ajoutez acceptLoss: true pour confirmer.`,
          economics,
        });
        return;
      }
    }

    const TournamentModel = mongoose.model('Tournament');
    const tournament = await TournamentModel.create({
      name,
      format,
      capacity,
      entryFee,
      minLevel: minLevel || 0,
      maxLevel: maxLevel ?? null,
      startAt: startDate,
      description: description || '',
      color: color || '#e6c46a',
      icon: icon || '♦',
      prizesByPosition: prizesByPosition || [],
      rounds: rounds || [],
      gameConfig: sanitizeGameConfig(gameConfig),
      status: publishImmediately ? 'upcoming' : 'draft',
      createdBy: req.adminId,
    });
    await logAudit(req.adminId!, 'tournament.create', tournament._id.toString(), {
      after: { name, format, capacity, entryFee, status: publishImmediately ? 'upcoming' : 'draft' },
    });
    res.json({ tournamentId: tournament._id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AdminRequest, res) => {
  try {
    const TournamentModel = mongoose.model('Tournament');
    const tournament = await TournamentModel.findById(req.params.id) as any;
    if (!tournament) {
      res.status(404).json({ error: 'Tournoi non trouvé' });
      return;
    }
    const before = { name: tournament.name, format: tournament.format, capacity: tournament.capacity, entryFee: tournament.entryFee };

    if (tournament.status === 'finished') {
      const { name } = req.body;
      if (name !== undefined) tournament.name = name;
      const otherFields = Object.keys(req.body).filter(k => k !== 'name');
      if (otherFields.length) {
        res.status(400).json({ error: 'Seul le nom peut être modifié pour un tournoi terminé' });
        return;
      }
    } else if (tournament.status === 'draft') {
      const { name, format, capacity, entryFee, minLevel, maxLevel, startAt, description, color, icon, prizesByPosition, rounds, gameConfig } = req.body;
      if (name !== undefined) tournament.name = name;
      if (format !== undefined) tournament.format = format;
      if (capacity !== undefined) tournament.capacity = capacity;
      if (entryFee !== undefined) tournament.entryFee = entryFee;
      if (minLevel !== undefined) tournament.minLevel = minLevel;
      if (maxLevel !== undefined) tournament.maxLevel = maxLevel;
      if (startAt !== undefined) tournament.startAt = new Date(startAt);
      if (description !== undefined) tournament.description = description;
      if (color !== undefined) tournament.color = color;
      if (icon !== undefined) tournament.icon = icon;
      if (prizesByPosition !== undefined) tournament.prizesByPosition = prizesByPosition;
      if (rounds !== undefined) tournament.rounds = rounds;
      if (gameConfig !== undefined) tournament.gameConfig = sanitizeGameConfig(gameConfig);
    } else {
      res.status(400).json({ error: 'Ce tournoi ne peut pas être modifié dans son état actuel' });
      return;
    }
    await tournament.save();
    await logAudit(req.adminId!, 'tournament.update', req.params.id, {
      before,
      after: { name: tournament.name, format: tournament.format, capacity: tournament.capacity, entryFee: tournament.entryFee },
    });
    res.json({ tournament });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/publish', async (req: AdminRequest, res) => {
  try {
    const TournamentModel = mongoose.model('Tournament');
    const tournament = await TournamentModel.findById(req.params.id) as any;
    if (!tournament) {
      res.status(404).json({ error: 'Tournoi non trouvé' });
      return;
    }
    if (tournament.status !== 'draft') {
      res.status(400).json({ error: 'Seuls les brouillons peuvent être publiés' });
      return;
    }
    if (tournament.startAt.getTime() <= Date.now()) {
      res.status(400).json({ error: 'La date de début doit être dans le futur' });
      return;
    }
    tournament.status = 'upcoming';
    await tournament.save();
    await logAudit(req.adminId!, 'tournament.publish', req.params.id, {
      before: { status: 'draft' },
      after: { status: 'upcoming' },
    });
    res.json({ published: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', async (req: AdminRequest, res) => {
  try {
    const TournamentModel = mongoose.model('Tournament');
    const tournament = await TournamentModel.findById(req.params.id) as any;
    if (!tournament) {
      res.status(404).json({ error: 'Tournoi non trouvé' });
      return;
    }
    if (tournament.status !== 'upcoming') {
      res.status(400).json({ error: 'Seuls les tournois UPCOMING peuvent être annulés' });
      return;
    }
    const UserModel = mongoose.model('User');
    const HouseTransactionModel = mongoose.model('HouseTransaction');
    const TournamentRobotDayLockModel = mongoose.model('TournamentRobotDayLock');
    const dayKey = tournament.startAt.toISOString().slice(0, 10);

    for (const p of tournament.participants) {
      await UserModel.updateOne(
        { _id: p.userId },
        { $inc: { 'wallet.tokens': tournament.entryFee } },
      );
      await TournamentRobotDayLockModel.deleteMany({
        robotId: { $in: p.robotIds },
        dayKey,
        tournamentId: tournament._id,
      });
      await HouseTransactionModel.create({
        kind: 'tournament_entry',
        amount: -tournament.entryFee,
        tournamentId: tournament._id,
        userId: p.userId,
        note: 'Remboursement annulation tournoi',
      });
    }
    tournament.status = 'cancelled';
    await tournament.save();
    await logAudit(req.adminId!, 'tournament.cancel', req.params.id, {
      before: { status: 'upcoming' },
      after: { status: 'cancelled' },
      meta: { refundedCount: tournament.participants.length, entryFee: tournament.entryFee },
    });
    res.json({ cancelled: true, refundedCount: tournament.participants.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AdminRequest, res) => {
  try {
    const TournamentModel = mongoose.model('Tournament');
    const tournament = await TournamentModel.findById(req.params.id) as any;
    if (!tournament) {
      res.status(404).json({ error: 'Tournoi non trouvé' });
      return;
    }
    if (tournament.status !== 'draft') {
      res.status(400).json({ error: 'Seuls les brouillons peuvent être supprimés' });
      return;
    }
    await TournamentModel.deleteOne({ _id: tournament._id });
    await logAudit(req.adminId!, 'tournament.delete', req.params.id, {
      before: { name: tournament.name, format: tournament.format, capacity: tournament.capacity },
    });
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/preview-economics', async (req, res) => {
  try {
    const { capacity, entryFee, prizesByPosition, format } = req.body;
    if (!capacity || entryFee === undefined || !prizesByPosition) {
      res.status(400).json({ error: 'Champs requis: capacity, entryFee, prizesByPosition' });
      return;
    }
    const economics = computeEconomics(capacity, entryFee, prizesByPosition, format);
    res.json({ economics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
