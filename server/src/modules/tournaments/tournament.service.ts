/* =============================================================================
 * TOURNAMENTS · tournament.service.ts — Inscription / désinscription / démarrage.
 * -----------------------------------------------------------------------------
 * Règles clés :
 *   • On ne peut s'inscrire ou se désinscrire QUE si status=UPCOMING.
 *   • Le débit du buy-in est atomique (wallet.stake) et remboursable.
 *   • CONTRAINTE 1 tournoi/robot/jour : garantie par l'index unique
 *     {robotId, dayKey} sur TournamentRobotDayLock. Cet insert échoue si le
 *     robot est déjà engagé aujourd'hui → on refuse l'inscription.
 *   • Aucune modification une fois LIVE. Le worker de démarrage (T13) verrouille
 *     le tournoi et lance le bracket.
 * ========================================================================== */
import { Types } from 'mongoose';
import { TournamentModel, TournamentStatus, TournamentRobotDayLockModel, dayKeyUTC } from './tournament.model.js';
import { getMatchFormatRules, MatchFormat } from '../matches/matchFormat.js';
import { walletService } from '../wallet/wallet.service.js';
import { RobotModel } from '../robot/robot.model.js';
import { houseAccountingService } from '../houseAccounting/houseAccounting.service.js';
import { badRequest, notFound, forbidden } from '../../core/HttpError.js';
import { buildInitialBracket, advanceBracket, findBracketMatchByMatchId, computeFinalPositions, formTeamSeeds } from './bracket.js';
import { computeUserTournamentStatus } from './userStatus.js';
import { MatchModel } from '../matches/match.model.js';

export class TournamentService {
  /**
   * Liste des tournois visibles pour un joueur (jamais draft).
   * v14.12 — Filtre par LEVEL du joueur : on n'affiche que les tournois où
   * le level du joueur est compris entre [minLevel, maxLevel]. Si aucun
   * userLevel fourni, on renvoie tous les non-draft (mode admin/preview).
   */
  async listVisible(status?: TournamentStatus | 'all', userLevel?: number): Promise<any[]> {
    const query: any = { status: { $ne: TournamentStatus.DRAFT } };
    if (status && status !== 'all') query.status = status;
    if (typeof userLevel === 'number') {
      query.minLevel = { $lte: userLevel };
      query.$or = [{ maxLevel: null }, { maxLevel: { $gte: userLevel } }];
    }
    return TournamentModel.find(query).sort({ startAt: 1 }).lean();
  }

  /**
   * v16 — Statut ACTIF du joueur dans un tournoi LIVE : en train de jouer,
   * en attente de son prochain match (adversaire pas encore connu), etc.
   * Enrichit les matchs attendus avec leur table live (pour le mode
   * spectateur). Renvoie `null` si le joueur n'est engagé dans aucun tournoi
   * live en cours de progression.
   */
  async getMyActive(userId: string): Promise<any | null> {
    const tournaments = await TournamentModel.find({
      status: TournamentStatus.LIVE,
      'participants.userId': new Types.ObjectId(userId),
    }).select('name format color icon bracketTree').lean();

    for (const t of tournaments as any[]) {
      const status = computeUserTournamentStatus(t.bracketTree, userId);
      if (status.state === 'none' || status.state === 'eliminated' || status.state === 'champion') continue;

      // Table live des matchs attendus / du mien, pour spectate / rejoindre.
      const matchIds = [
        ...status.awaiting.map((a) => a.matchId).filter(Boolean),
        status.myMatchId,
      ].filter(Boolean) as string[];
      const tableByMatch = new Map<string, string>();
      if (matchIds.length) {
        const matches = await MatchModel.find({ _id: { $in: matchIds } }).select('liveTableId').lean();
        for (const m of matches as any[]) {
          if (m.liveTableId) tableByMatch.set(String(m._id), String(m.liveTableId));
        }
      }
      const roundLabel = (t.bracketTree?.rounds ?? []).find((r: any) => r.roundIndex === status.roundIndex)?.label ?? '';

      return {
        tournamentId: String(t._id),
        name: t.name, format: t.format, color: t.color, icon: t.icon,
        state: status.state,
        roundIndex: status.roundIndex,
        roundLabel,
        startsAt: status.startsAt,   // v16 — compte à rebours (état 'pending')
        myMatchId: status.myMatchId,
        myTableId: status.myMatchId ? tableByMatch.get(status.myMatchId) ?? null : null,
        awaiting: status.awaiting.map((a) => ({
          ...a,
          tableId: a.matchId ? tableByMatch.get(a.matchId) ?? null : null,
        })),
      };
    }
    return null;
  }

  /** Détail d'un tournoi (draft visible seulement à son créateur). */
  async getById(tournamentId: string, requesterId: string): Promise<any> {
    const doc = await TournamentModel.findById(tournamentId).lean();
    if (!doc) throw notFound('Tournoi introuvable.');
    const isCreator = String((doc as any).createdBy) === String(requesterId);
    if ((doc as any).status === TournamentStatus.DRAFT && !isCreator) throw notFound('Tournoi introuvable.');
    return doc;
  }

  /**
   * v14.12 — Renvoie l'arbre bracket enrichi pour affichage « coupe du
   * monde ». Retourne 404 si le tournoi n'est pas encore démarré (upcoming
   * → pas de bracket à voir, on affiche juste les seedings).
   */
  async getBracket(tournamentId: string, requesterId: string): Promise<any> {
    const doc: any = await TournamentModel.findById(tournamentId).lean();
    if (!doc) throw notFound('Tournoi introuvable.');
    if (doc.status === TournamentStatus.DRAFT && String(doc.createdBy) !== String(requesterId)) throw notFound('Tournoi introuvable.');
    if (doc.status === TournamentStatus.UPCOMING) throw badRequest('Le tournoi n\u2019a pas encore commenc\u00e9.');
    return {
      tournamentId: String(doc._id),
      name: doc.name, format: doc.format, capacity: doc.capacity,
      status: doc.status, color: doc.color, icon: doc.icon,
      bracket: doc.bracketTree || { rounds: [], lastCompletedRound: 0 },
      participants: doc.participants,
      winners: doc.winners,
    };
  }

  /**
   * v14.12 — Création d'un tournoi (par un utilisateur authentifié pour
   * l'instant ; le back office prendra le relais avec un middleware admin).
   * Le tournoi est créé en DRAFT et invisible aux autres joueurs jusqu'à
   * ce que son créateur le passe en UPCOMING (endpoint publish).
   */
  async create(userId: string, input: {
    name: string;
    format: MatchFormat;
    capacity: number;
    entryFee: number;
    startAt: Date;
    description?: string;
    color?: string;
    icon?: string;
    minLevel?: number;
    maxLevel?: number | null;
    prizesByPosition?: { position: number; prize: number }[];
    rounds?: { round: number; prize: number }[];
    publishImmediately?: boolean;
  }): Promise<{ tournamentId: string }> {
    if (!input.name || input.name.length < 3) throw badRequest('Nom trop court.');
    if (![4, 8, 16, 32, 64, 128].includes(input.capacity)) throw badRequest('Capacit\u00e9 invalide.');
    if (input.entryFee < 0) throw badRequest('Buy-in n\u00e9gatif interdit.');
    if (!input.startAt || input.startAt.getTime() < Date.now() - 60_000) throw badRequest('Date de d\u00e9but dans le pass\u00e9.');
    if (!getMatchFormatRules(input.format)) throw badRequest('Format inconnu.');
    // v14.14 — Carrée royale : le bracket se joue en ÉQUIPES de 2 humains
    // (capacity/2 feuilles). On exige au moins 4 humains (2 équipes) ; capacity
    // étant une puissance de 2, capacity/2 en est une aussi (bracket propre).
    if (input.format === MatchFormat.ROYAL_SQUARE && input.capacity < 4) {
      throw badRequest('Carrée royale : au moins 4 joueurs requis (2 équipes).');
    }
    if (input.minLevel != null && input.minLevel < 0) throw badRequest('minLevel < 0');
    if (input.maxLevel != null && input.minLevel != null && input.maxLevel < input.minLevel) {
      throw badRequest('maxLevel doit \u00eatre \u2265 minLevel.');
    }
    const doc = await TournamentModel.create({
      name: input.name.trim(),
      format: input.format,
      capacity: input.capacity,
      entryFee: input.entryFee,
      startAt: input.startAt,
      createdBy: new Types.ObjectId(userId),
      description: input.description ?? '',
      color: input.color ?? '#e6c46a',
      icon: input.icon ?? '\u2666',
      minLevel: input.minLevel ?? 0,
      maxLevel: input.maxLevel ?? null,
      prizesByPosition: input.prizesByPosition ?? [],
      rounds: input.rounds ?? [],
      status: input.publishImmediately ? TournamentStatus.UPCOMING : TournamentStatus.DRAFT,
    });
    return { tournamentId: String(doc._id) };
  }

  /** Passe un DRAFT → UPCOMING (visible aux joueurs, inscriptions ouvertes). */
  async publish(tournamentId: string, userId: string): Promise<{ published: true }> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (String((t as any).createdBy) !== String(userId)) throw forbidden('Seul le cr\u00e9ateur peut publier.');
    if (t.status !== TournamentStatus.DRAFT) throw badRequest('Le tournoi n\u2019est pas en brouillon.');
    t.status = TournamentStatus.UPCOMING;
    await t.save();
    return { published: true };
  }

  /**
   * Inscription d'un joueur avec ses robots (nombre selon format).
   * v14.12 — Le format `robotIds` respecte la convention v14.5 :
   *   [coéquipier(s)…, remplaçant?] où le dernier élément est le remplaçant
   *   ssi format.requiresSubstitute (HYBRID_ALLIANCE, ROYAL_SQUARE).
   */
  async join(tournamentId: string, userId: string, robotIds: string[]): Promise<{ joined: true }> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (t.status !== TournamentStatus.UPCOMING) throw badRequest('Les inscriptions sont ferm\u00e9es.');
    if (t.participants.length >= t.capacity) throw badRequest('Tournoi complet.');

    const rules = getMatchFormatRules(t.format as MatchFormat);
    const expected = rules.robotsPerPlayer + (rules.requiresSubstitute ? 1 : 0);
    if (robotIds.length !== expected) {
      throw badRequest(rules.requiresSubstitute
        ? `Ce format exige ${rules.robotsPerPlayer} co\u00e9quipier(s) + 1 rempla\u00e7ant.`
        : `Ce format exige ${rules.robotsPerPlayer} robot(s) par joueur.`);
    }
    const uniqueRobots = new Set(robotIds);
    if (uniqueRobots.size !== robotIds.length) throw badRequest('Les robots doivent \u00eatre distincts.');

    // Extraction du substitute (dernier élément si format le requiert).
    let teammates = robotIds;
    let substituteRobotId: string | null = null;
    if (rules.requiresSubstitute) {
      substituteRobotId = robotIds[robotIds.length - 1];
      teammates = robotIds.slice(0, -1);
    }

    // Robots appartiennent-ils au joueur ? (Tous : coéquipiers + substitute)
    if (robotIds.length > 0) {
      const owned = await RobotModel.countDocuments({ _id: { $in: robotIds }, owner: userId });
      if (owned !== robotIds.length) throw badRequest('Un robot au moins ne vous appartient pas.');
    }

    // Déjà inscrit ?
    if (t.participants.some((p: any) => String(p.userId) === String(userId))) {
      throw badRequest('Vous \u00eates d\u00e9j\u00e0 inscrit \u00e0 ce tournoi.');
    }

    // Contrainte 1 tournoi/robot/jour : on tente d'insérer les locks (pour
    // TOUS les robots impliqués — coéquipiers ET substitute).
    const dayKey = dayKeyUTC(t.startAt);
    const locks = robotIds.map((robotId) => ({
      robotId: new Types.ObjectId(robotId), dayKey, tournamentId: t._id, userId: new Types.ObjectId(userId),
    }));
    try {
      if (locks.length > 0) await TournamentRobotDayLockModel.insertMany(locks, { ordered: true });
    } catch (e: any) {
      if (e?.code === 11000) {
        // On identifie PR\u00c9CIS\u00c9MENT le(s) robot(s) d\u00e9j\u00e0 engag\u00e9(s) ce jour-l\u00e0 et,
        // pour le diagnostic, dans quel tournoi \u2014 le message g\u00e9n\u00e9rique masquait
        // l'origine du blocage (souvent un verrou orphelin d'un test pr\u00e9c\u00e9dent).
        const existing: any[] = await TournamentRobotDayLockModel
          .find({ robotId: { $in: robotIds.map((r) => new Types.ObjectId(r)) }, dayKey })
          .select('robotId tournamentId').lean();
        const lockedRobotIds = existing.map((l) => String(l.robotId));
        const robotsInfo: any[] = await RobotModel.find({ _id: { $in: lockedRobotIds } }).select('name').lean();
        const names = robotsInfo.map((r) => r.name).filter(Boolean);
        const label = names.length ? names.join(', ') : lockedRobotIds.join(', ');
        throw badRequest(
          `Robot(s) d\u00e9j\u00e0 engag\u00e9(s) dans un tournoi le ${dayKey} : ${label}. `
          + 'Un robot ne peut participer qu\'\u00e0 un seul tournoi par jour. '
          + 'Choisissez un autre robot, ou attendez un autre jour.',
        );
      }
      throw e;
    }

    // Débit du buy-in.
    try {
      await walletService.stake(userId, t.entryFee);
    } catch (e) {
      await TournamentRobotDayLockModel.deleteMany({ robotId: { $in: robotIds }, dayKey, tournamentId: t._id });
      throw e;
    }

    await houseAccountingService.recordTournamentEntry(t._id, userId, t.entryFee);

    t.participants.push({
      userId: new Types.ObjectId(userId),
      robotIds: teammates.map((r) => new Types.ObjectId(r)),
      substituteRobotId: substituteRobotId ? new Types.ObjectId(substituteRobotId) : null,
      seedIndex: null,
      eliminatedAtRound: null,
      finalPosition: null,
      prizeAwarded: 0,
      joinedAt: new Date(),
    } as any);
    await t.save();

    return { joined: true };
  }

  /** Désinscription (autorisée seulement en UPCOMING). Rembourse le buy-in. */
  async leave(tournamentId: string, userId: string): Promise<{ refunded: number }> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (t.status !== TournamentStatus.UPCOMING) throw badRequest('Impossible de quitter un tournoi d\u00e9marr\u00e9.');

    const index = t.participants.findIndex((p: any) => String(p.userId) === String(userId));
    if (index < 0) throw notFound('Vous n\u2019\u00eates pas inscrit \u00e0 ce tournoi.');

    // Libère les locks robots.
    const dayKey = dayKeyUTC(t.startAt);
    const robotIds = t.participants[index].robotIds.map((r: any) => String(r));
    if (robotIds.length > 0) {
      await TournamentRobotDayLockModel.deleteMany({ robotId: { $in: robotIds }, dayKey, tournamentId: t._id });
    }

    // Remboursement.
    await walletService.credit(userId, t.entryFee, undefined, 'refund');

    // Contre-écriture de l'entrée en comptabilité (amount négatif).
    await houseAccountingService.recordTournamentEntry(t._id, userId, -t.entryFee);

    // Retire le participant.
    t.participants.splice(index, 1);
    await t.save();

    return { refunded: t.entryFee };
  }

  /**
   * Passe un tournoi en LIVE : verrouille les inscriptions, seed FIFO
   * (ordre joinedAt), initialise le bracket vide ET l'arbre bracketTree
   * (v14.12). Le worker de démarrage (T13) appellera cette méthode à startAt.
   */
  async startNow(tournamentId: string, admin: { id: string }): Promise<void> {
    const t = await TournamentModel.findById(tournamentId).populate('participants.userId', 'username');
    if (!t) throw notFound('Tournoi introuvable.');
    if (String((t as any).createdBy) !== String(admin.id)) throw forbidden('Seul le cr\u00e9ateur peut d\u00e9marrer un tournoi.');
    if (t.status !== TournamentStatus.UPCOMING) throw badRequest('Le tournoi n\u2019est pas en attente.');
    if (t.participants.length !== t.capacity) {
      throw badRequest(`Effectif incomplet : ${t.participants.length}/${t.capacity} inscrits.`);
    }

    // Seed FIFO : ordre d'inscription.
    t.participants.sort((a: any, b: any) => a.joinedAt.getTime() - b.joinedAt.getTime());
    t.participants.forEach((p: any, i: number) => { p.seedIndex = i; });

    // Seeds individuels (userId + displayName dénormalisé pour affichage).
    const indiv = t.participants.map((p: any) => ({
      userId: String((typeof p.userId === 'object' && p.userId) ? p.userId._id : p.userId),
      displayName: (typeof p.userId === 'object' && p.userId?.username) ? p.userId.username : 'Joueur',
    }));

    // v14.14 — Carrée royale : on forme des ÉQUIPES de 2 humains, tirées
    // aléatoirement, fixes jusqu'à la fin. Le bracket se joue alors sur
    // capacity/2 feuilles (chaque slot = une équipe). Les autres formats
    // (Duo, Hybrid) gardent un bracket 1 vs 1 sur `capacity` feuilles.
    let seeds; let leafCount: number;
    if (t.format === MatchFormat.ROYAL_SQUARE) {
      const shuffled = [...indiv];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      seeds = formTeamSeeds(shuffled);
      leafCount = seeds.length;               // capacity / 2 équipes (chaque slot = 1 équipe)
    } else {
      seeds = indiv;
      leafCount = t.capacity;
    }
    const tree = buildInitialBracket(leafCount, seeds);
    (t as any).bracketTree = tree;

    t.status = TournamentStatus.LIVE;
    t.startedAt = new Date();
    t.bracket = [];
    await t.save();
  }

  /**
   * v14.12 — Hook appelé à la fin d'un match d'un tournoi. Met à jour
   * l'arbre bracketTree, propage le gagnant au round suivant. Si la finale
   * est jouée, marque le tournoi FINISHED, calcule les positions finales et
   * verse les gains selon `prizesByPosition` (ou fallback `rounds` legacy).
   */
  async recordMatchResult(input: {
    tournamentId: string;
    matchId: string;
    winnerUserId: string;         // pour retrouver quel slot est gagnant
    scoreA: number;
    scoreB: number;
    gameId: string | null;
  }): Promise<void> {
    const t = await TournamentModel.findById(input.tournamentId);
    if (!t) return;                          // silencieux : match d'un autre contexte
    if (t.status !== TournamentStatus.LIVE) return;
    const tree = (t as any).bracketTree as ReturnType<typeof buildInitialBracket>;
    if (!tree || !tree.rounds || tree.rounds.length === 0) return;

    const found = findBracketMatchByMatchId(tree as any, input.matchId);
    if (!found) return;                      // match pas dans ce bracket
    const round = tree.rounds[found.roundIndex - 1];
    const bm = round.matches[found.matchIndex];
    // Déterminer quel slot est le gagnant (Carrée royale : vérifier les 2 coéquipiers).
    const winner: 'A' | 'B' = (String(bm.slotA.userId) === String(input.winnerUserId)
      || String((bm.slotA as any).userId2) === String(input.winnerUserId)) ? 'A' : 'B';

    const result = advanceBracket(tree as any, {
      roundIndex: found.roundIndex,
      matchIndex: found.matchIndex,
      winner,
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      gameId: input.gameId,
      matchId: input.matchId,
      finishedAt: new Date(),
    });

    // Marquer l'éliminé dans participants (utile pour affichage rapide et
    // pour la logique 1-tournoi-jour dans les stats).
    const loserSlot = winner === 'A' ? bm.slotB : bm.slotA;
    for (const luid of [loserSlot.userId, (loserSlot as any).userId2]) {
      if (!luid) continue;
      const p = t.participants.find((pp: any) => String(pp.userId) === String(luid));
      if (p && !p.eliminatedAtRound) p.eliminatedAtRound = found.roundIndex;
    }

    // Si tournoi fini, calculer positions & verser les gains.
    if (result.tournamentDone) {
      await this.#finalizeTournament(t, tree as any);
    }
    await t.save();

    // Progression immédiate : dès qu'un round est entièrement terminé (et que
    // le tournoi n'est pas fini), on crée tout de suite les matchs du round
    // suivant plutôt que d'attendre le prochain tick du worker (jusqu'à 30 s).
    // Les gagnants voient ainsi leur match suivant apparaître en quelques
    // secondes. Import dynamique pour éviter tout cycle service ↔ orchestrateur.
    if (result.roundJustDone && !result.tournamentDone) {
      try {
        const { tournamentOrchestrator } = await import('./tournament.orchestrator.js');
        await tournamentOrchestrator.run(String(t._id));
      } catch { /* le worker rattrapera au prochain tick */ }
    }
  }

  /**
   * v14.14 — Écrit le score EN COURS d'un match dans l'arbre bracket (sans
   * marquer de vainqueur). Appelé périodiquement par le sweep temps-réel à
   * partir du score live de la table. Comme le bracket vit en MongoDB, ce
   * score devient consultable EN DIRECT à la fois par le back-office (process
   * séparé) et par les joueurs — sans dépendance Redis supplémentaire.
   * No-op si le match a déjà un vainqueur (score final déjà figé).
   */
  async updateLiveScore(input: { tournamentId: string; matchId: string; scoreA: number; scoreB: number }): Promise<void> {
    const t = await TournamentModel.findById(input.tournamentId);
    if (!t || t.status !== TournamentStatus.LIVE) return;
    const tree = (t as any).bracketTree;
    if (!tree?.rounds) return;
    const found = findBracketMatchByMatchId(tree, input.matchId);
    if (!found) return;
    const bm = tree.rounds[found.roundIndex - 1].matches[found.matchIndex];
    if (!bm || bm.winner) return;                      // déjà terminé → score figé
    if (bm.scoreA === input.scoreA && bm.scoreB === input.scoreB) return;  // inchangé
    bm.scoreA = input.scoreA;
    bm.scoreB = input.scoreB;
    if (!bm.startedAt) bm.startedAt = new Date();
    (t as any).markModified?.('bracketTree');
    await t.save();
  }

  /**
   * Finalisation du tournoi : calcule les positions finales, verse les gains
   * (selon prizesByPosition ou fallback rounds legacy), enregistre les
   * `houseAccountingService` par prix versé, remplit `winners` (top 3).
   */
  async #finalizeTournament(t: any, tree: any): Promise<void> {
    const capacity = t.capacity as number;
    // v14.14 — Carrée royale : rangs calculés sur les ÉQUIPES (capacity/2 feuilles).
    const leaves = t.format === MatchFormat.ROYAL_SQUARE ? capacity / 2 : capacity;
    const positions = computeFinalPositions(tree, leaves);

    // Distribuer les prix : soit prizesByPosition (v14.12), soit rounds (legacy).
    const useByPosition = Array.isArray(t.prizesByPosition) && t.prizesByPosition.length > 0;
    const prizeMap: Record<number, number> = {};   // rang → prix par occupant
    if (useByPosition) {
      for (const pp of t.prizesByPosition) prizeMap[pp.position] = pp.prize;
    } else {
      // Legacy : convertit rounds vers positions équivalentes.
      // Round R (perdants) → rang capacity/2^R + 1. Vainqueur (finale gagnée) → rang 1.
      const totalRounds = Math.log2(leaves);
      for (const rp of (t.rounds || [])) {
        // rp.round est le round survécu par le gagnant → il reçoit rp.prize.
        // On convertit : les survivants au round R (avant élimination) sont
        // ceux qui ont survécu à R-1 rounds. Pour simplicité, on garde le
        // mapping : rp.round == totalRounds+1 → rang 1 (vainqueur), sinon
        // le round R correspond aux perdants du round R eux-mêmes.
        // Rétrocompat simple : le round final donne le rang 1.
        if (rp.round === totalRounds) prizeMap[1] = rp.prize;  // vainqueur finale
      }
    }

    // Attribuer positions + verser gains.
    for (const p of t.participants) {
      const uid = String(p.userId?._id ?? p.userId);
      const finalPos = positions.get(uid);
      if (finalPos == null) continue;      // n'a pas joué (rare, ne devrait pas arriver)
      p.finalPosition = finalPos;
      const prize = prizeMap[finalPos] ?? 0;
      p.prizeAwarded = prize;
      if (prize > 0) {
        try { await walletService.credit(uid, prize, undefined, 'game_win'); }
        catch (e) { /* on continue, l'important est de ne pas bloquer */ }
        try { await houseAccountingService.recordTournamentPrize(t._id, uid, 0, prize); }
        catch { /* pareil */ }
      }
    }

    // Top 3 pour affichage rapide (winners[]).
    const sorted = [...t.participants]
      .filter((p: any) => p.finalPosition)
      .sort((a: any, b: any) => a.finalPosition - b.finalPosition);
    t.winners = sorted.slice(0, 3).map((p: any) => new Types.ObjectId(String(p.userId?._id ?? p.userId)));

    t.status = TournamentStatus.FINISHED;
    t.finishedAt = new Date();
  }

  /** Passe un tournoi en FINISHED (appelé par l'orchestrateur quand tous les rounds sont joués). */
  async markFinished(tournamentId: string, winnersUserIds: string[]): Promise<void> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (t.status !== TournamentStatus.LIVE) throw badRequest('Tournoi non actif.');
    t.status = TournamentStatus.FINISHED;
    t.finishedAt = new Date();
    t.winners = winnersUserIds.map((id) => new Types.ObjectId(id));
    await t.save();
  }
}

export const tournamentService = new TournamentService();
