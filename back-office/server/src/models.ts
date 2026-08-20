import mongoose, { Schema, model } from 'mongoose';

const WalletTransactionSchema = new Schema(
  {
    kind: { type: String, enum: ['daily', 'game_stake', 'game_win', 'refund', 'promo', 'vip'], required: true },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'banned'], default: 'user', index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    settings: {
      responseTimeMs: { type: Number, default: 1000 },
      maxPlayTimeMs: { type: Number, default: 10000 },
      defaultManches: { type: Number, default: 2 },
    },
    rewardPoints: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    wallet: {
      tokens: { type: Number, default: 0 },
      lastClaimDay: { type: String, default: null },
      transactions: { type: [WalletTransactionSchema], default: [] },
    },
    activeSession: { type: Schema.Types.ObjectId, ref: 'Session', default: null, index: true },
    favoriteRobot: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    vipExpiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);
mongoose.models.User ?? model('User', UserSchema);

const RobotSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    personality: {
      aggressiveness: { type: Number, default: 5 },
      concentration: { type: Number, default: 5 },
      velocity: { type: Number, default: 5 },
    },
    responseTimeMs: { type: Number, default: 1000 },
    maxPlayTimeMs: { type: Number, default: 10000 },
    bidResponseMs: { type: Number, default: 700 },
    conventionConfig: { type: Schema.Types.Mixed, default: {} },
    algoSpec: { type: Schema.Types.Mixed, default: null },
    offlineEnabled: { type: Boolean, default: false },
    representativeSlot: { type: Number, default: 0 },
    mobile: {
      avatarId: { type: String, default: 'atne' },
      strategy: {
        aggro: { type: Number, default: 50 },
        risk: { type: Number, default: 50 },
        bluff: { type: Number, default: 50 },
        memoire: { type: Number, default: 50 },
      },
    },
  },
  { timestamps: true },
);
mongoose.models.Robot ?? model('Robot', RobotSchema);

const MATCH_FORMATS = ['duo_steel', 'hybrid_alliance', 'royal_square'];
const MATCH_STATUSES = ['queued', 'pairing', 'running', 'finished', 'cancelled'];

const MatchParticipantSchema = new Schema(
  {
    seat: { type: Number, required: true, min: 0, max: 3 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    robotId: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    substituteRobotId: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    team: { type: String, enum: ['A', 'B'], required: true },
    isHuman: { type: Boolean, required: true },
  },
  { _id: false },
);

const MatchSchema = new Schema(
  {
    format: { type: String, enum: MATCH_FORMATS, required: true, index: true },
    status: { type: String, enum: MATCH_STATUSES, default: 'queued', index: true },
    participants: { type: [MatchParticipantSchema], default: [] },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    tournamentRound: { type: Number, default: null },
    game: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    liveTableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
    winnerTeam: { type: String, enum: ['A', 'B', null], default: null },
    scoreTeamA: { type: Number, default: 0 },
    scoreTeamB: { type: Number, default: 0 },
    queuedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
MatchSchema.index({ status: 1, format: 1, createdAt: -1 });
MatchSchema.index({ tournament: 1, tournamentRound: 1 });
mongoose.models.Match ?? model('Match', MatchSchema);

const ParticipantSubSchema = new Schema(
  {
    seatIndex: { type: Number, required: true },
    team: { type: String, enum: ['A', 'B'], required: true },
    type: { type: String, enum: ['human', 'robot'], required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    robot: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    name: { type: String, default: '' },
    wasSubstitute: { type: Boolean, default: false },
  },
  { _id: false },
);

const MancheSubSchema = new Schema(
  {
    number: { type: Number, required: true },
    target: { type: Number, default: 0 },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    scoreTeamA: { type: Number, default: 0 },
    scoreTeamB: { type: Number, default: 0 },
  },
  { _id: false },
);

const StatsSubSchema = new Schema(
  {
    totalDonnes: { type: Number, default: 0 },
    totalTricksA: { type: Number, default: 0 },
    totalTricksB: { type: Number, default: 0 },
    contres: { type: Number, default: 0 },
    surcontres: { type: Number, default: 0 },
    contresReussies: { type: Number, default: 0 },
    capotsA: { type: Number, default: 0 },
    capotsB: { type: Number, default: 0 },
    capotsTotal: { type: Number, default: 0 },
    capotsAnnoncesA: { type: Number, default: 0 },
    capotsAnnoncesB: { type: Number, default: 0 },
    capotsAnnoncesTotal: { type: Number, default: 0 },
    belotesA: { type: Number, default: 0 },
    belotesB: { type: Number, default: 0 },
    // v18 — métriques enrichies.
    totalTricks: { type: Number, default: 0 },
    contractsMade: { type: Number, default: 0 },
    contractsFailed: { type: Number, default: 0 },
    avgContract: { type: Number, default: 0 },
  },
  { _id: false },
);

const GameSchema = new Schema(
  {
    table: { type: Schema.Types.ObjectId, ref: 'Table', default: null, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', default: null, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    // v18 — rattachement compétition.
    match: { type: Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
    formatConfig: { type: Schema.Types.ObjectId, ref: 'MatchFormatConfig', default: null, index: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    visibility: { type: String, enum: ['public', 'private', 'team'], default: 'private', index: true },
    mode: { type: String, enum: ['local', 'online', 'competition'], default: 'local' },
    kind: { type: String, enum: ['hybride', 'acier', 'royal', 'local'], default: 'local', index: true },
    target: { type: Number, default: 0 },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    finishedAt: { type: Date, default: () => new Date() },
    durationMs: { type: Number, default: 0 },
    participants: { type: [ParticipantSubSchema], default: [] },
    manches: { type: [MancheSubSchema], default: [] },
    finalScoreA: { type: Number, default: 0 },
    finalScoreB: { type: Number, default: 0 },
    manchesWonA: { type: Number, default: 0 },
    manchesWonB: { type: Number, default: 0 },
    stats: { type: StatsSubSchema, default: () => ({}) },
    projection: {
      status: { type: String, enum: ['pending', 'done', 'failed'], default: 'pending', index: true },
      version: { type: Number, default: 0 },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);
mongoose.models.Game ?? model('Game', GameSchema);

const TOURNAMENT_STATUSES = ['draft', 'upcoming', 'live', 'finished', 'cancelled'];
const TOURNAMENT_CAPACITIES = [4, 8, 16, 32, 64, 128];

const RoundPrizeSchema = new Schema(
  { round: { type: Number, required: true, min: 1 }, prize: { type: Number, required: true, min: 0 } },
  { _id: false },
);

const PositionPrizeSchema = new Schema(
  { position: { type: Number, required: true, min: 1 }, prize: { type: Number, required: true, min: 0 } },
  { _id: false },
);

const TournamentParticipantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    robotIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Robot' }], default: [] },
    substituteRobotId: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    seedIndex: { type: Number, default: null },
    eliminatedAtRound: { type: Number, default: null },
    finalPosition: { type: Number, default: null },
    prizeAwarded: { type: Number, default: 0 },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const BracketSlotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    seedIndex: { type: Number, default: null },
    displayName: { type: String, default: '' },
    userId2: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    displayName2: { type: String, default: '' },
  },
  { _id: false },
);

const BracketMatchSchema = new Schema(
  {
    matchIndex: { type: Number, required: true, min: 0 },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', default: null },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    slotA: { type: BracketSlotSchema, default: () => ({}) },
    slotB: { type: BracketSlotSchema, default: () => ({}) },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    scoreA: { type: Number, default: null },
    scoreB: { type: Number, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    scheduledStartAt: { type: Date, default: null },
    nextMatchIndex: { type: Number, default: null },
    nextSlot: { type: String, enum: ['A', 'B', null], default: null },
  },
  { _id: false },
);

const BracketRoundSchema = new Schema(
  {
    roundIndex: { type: Number, required: true, min: 1 },
    label: { type: String, default: '' },
    matches: { type: [BracketMatchSchema], default: [] },
  },
  { _id: false },
);

const BracketTreeSchema = new Schema(
  {
    rounds: { type: [BracketRoundSchema], default: [] },
    builtAt: { type: Date, default: null },
    lastCompletedRound: { type: Number, default: 0 },
  },
  { _id: false },
);

const TournamentGameConfigSchema = new Schema(
  {
    manches: { type: Number, enum: [1, 2, 4], default: 2 },
    baseTarget: { type: Number, default: 1500 },
    labelTarget: { type: Number, default: 2000 },
    openingBidMin: { type: Number, default: 90 },
    countBelote: { type: Boolean, default: true },
    clockwise: { type: Boolean, default: false },
    roundCountdownSec: { type: Number, default: 10 },
    autoRejoinSec: { type: Number, default: 5 },
    trickDelayMs: { type: Number, default: 900 },
    speed: { type: Number, default: 1 },
    turnTimeoutMs: { type: Number, default: 15000 },
    allowSpectators: { type: Boolean, default: true },
    feltTheme: { type: String, enum: ['classic', 'cosmos', 'olympus'], default: 'classic' },
    signals: {
      reflexion: { type: Boolean, default: true },
      repeatSuit: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    format: { type: String, enum: MATCH_FORMATS, required: true, index: true },
    status: { type: String, enum: TOURNAMENT_STATUSES, default: 'draft', index: true },
    capacity: { type: Number, enum: TOURNAMENT_CAPACITIES, required: true },
    gameConfig: { type: TournamentGameConfigSchema, default: () => ({}) },
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '#e6c46a' },
    icon: { type: String, default: '♦' },
    minLevel: { type: Number, default: 0, min: 0 },
    maxLevel: { type: Number, default: null },
    entryFee: { type: Number, required: true, min: 0 },
    rounds: { type: [RoundPrizeSchema], default: [] },
    prizesByPosition: { type: [PositionPrizeSchema], default: [] },
    startAt: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: { type: [TournamentParticipantSchema], default: [] },
    bracket: { type: [[Schema.Types.ObjectId]], default: [] },
    bracketTree: { type: BracketTreeSchema, default: () => ({ rounds: [], lastCompletedRound: 0 }) },
    winners: { type: [Schema.Types.ObjectId], default: [] },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
TournamentSchema.index({ status: 1, startAt: 1 });
TournamentSchema.index({ status: 1, minLevel: 1 });
mongoose.models.Tournament ?? model('Tournament', TournamentSchema);

const TournamentRobotDayLockSchema = new Schema(
  {
    robotId: { type: Schema.Types.ObjectId, ref: 'Robot', required: true },
    dayKey: { type: String, required: true },
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);
TournamentRobotDayLockSchema.index({ robotId: 1, dayKey: 1 }, { unique: true });
mongoose.models.TournamentRobotDayLock ?? model('TournamentRobotDayLock', TournamentRobotDayLockSchema);

const HouseTransactionKinds = ['match_rake', 'tournament_entry', 'tournament_prize'];

const HouseTransactionSchema = new Schema(
  {
    kind: { type: String, enum: HouseTransactionKinds, required: true, index: true },
    amount: { type: Number, required: true },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    round: { type: Number, default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);
HouseTransactionSchema.index({ kind: 1, createdAt: -1 });
mongoose.models.HouseTransaction ?? model('HouseTransaction', HouseTransactionSchema);

const MatchFormatConfigSchema = new Schema(
  {
    format: { type: String, enum: MATCH_FORMATS, required: true, unique: true, index: true },
    label: { type: String, required: true },
    subtitle: { type: String, default: '' },
    buyInPerPlayer: { type: Number, required: true, min: 0 },
    prizePerWinner: { type: Number, required: true, min: 0 },
    manches: { type: Number, enum: [1, 2, 4], default: 2 },
    baseTarget: { type: Number, default: 1500 },
    labelTarget: { type: Number, default: 2000 },
    color: { type: String, default: '#3f6ea1' },
    icon: { type: String, default: '♦' },
    minLevel: { type: Number, default: 0, min: 0 },
    maxLevel: { type: Number, default: null },
    autoRejoinSec: { type: Number, default: 5, min: 0 },
    openingBidMin: { type: Number, default: 90 },
    countBelote: { type: Boolean, default: true },
    clockwise: { type: Boolean, default: false },
    tableThemeId: { type: Schema.Types.ObjectId, ref: 'TableTheme', default: null },
    active: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['draft', 'pending', 'active'], default: 'active', index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);
mongoose.models.MatchFormatConfig ?? model('MatchFormatConfig', MatchFormatConfigSchema);

/* ── Bibliothèque de thèmes de table (v18) ────────────────────────────────── */
const TableThemeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    key: { type: String, default: null, index: true },
    builtIn: { type: Boolean, default: false, index: true },
    feltColor: { type: String, required: true },
    feltEdgeColor: { type: String, default: null },
    railColor: { type: String, required: true },
    accentColor: { type: String, default: null },
    active: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['draft', 'pending', 'active'], default: 'active', index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);
mongoose.models.TableTheme ?? model('TableTheme', TableThemeSchema);

const PromoCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true, match: /^\d{12}$/ },
    tokens: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true, index: true },
    maxRedemptions: { type: Number, default: 1, min: 1 },
    redeemedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    active: { type: Boolean, default: true },
    label: { type: String, default: '' },
  },
  { timestamps: true },
);
mongoose.models.PromoCode ?? model('PromoCode', PromoCodeSchema);
