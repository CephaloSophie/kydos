# CLAUDE.md — belote-server context

Context for working **inside `server/`**. The repo-wide rules live in
[`../CLAUDE.md`](../CLAUDE.md) (central modules, robot parity contract, mirrors to keep
in sync) — this file does not repeat them.

## Project overview

Kýdos Belote is a full-stack **belote contrée** platform. Players create AI robots and
compete in matches and tournaments with real-time play over WebSockets. The economy
runs on virtual tokens (jetons ◆).

- **Company**: Cephalo Sophie — CEO/Founder: Ameur Hamdouni
- **Current version**: `16.0.0` in every `package.json`. Docs saying "v17/v18/v19" mean
  **design milestones**, not npm versions — the version bump stopped at 16.
- **Language**: French UI, French code comments and docs (test comments are English by
  historical exception).

## Where the server sits

```
belote-kydos/
├── packages/core/        belote-core       — pure game engine (SACRED, see rules)
├── packages/table-pixi/  @kydos/table-pixi — PixiJS renderer (client only)
├── server/               belote-server     — ← YOU ARE HERE (Express + Mongoose + Socket.IO)
├── mobile/               belote-mobile     — SPA client (vanilla TS + Capacitor)
└── back-office/          Angular 19 + its OWN Express API on :3001 — OUTSIDE npm workspaces
```

Two things that used to be true and are not:

- **`web/` was deleted in v16.** Anything referencing `belote-web` is dead.
- **`packages/application` and `packages/belote-table` are legacy** — still versioned,
  imported by nobody, excluded from `typecheck:all` / `test:all`.

The back-office talks to **the same MongoDB** but does **not** import `belote-core`.
Some pure logic is therefore **duplicated** there — see the mirror table in
[`../CLAUDE.md`](../CLAUDE.md). Changing `tableTheme.colors.ts` or `scoreKydos.ts`
without updating its mirror is the easiest regression to introduce.

## Commands

```bash
# from repo root
npm install --no-audit --no-fund
npm run dev:server                       # tsx watch
npm run seed                             # 5 users + robots + teams + tournaments + promos
npm --workspace belote-server run typecheck
npm --workspace belote-server run test   # 216 tests (pure whitelist — see Testing)
npm run tnr:server                       # typecheck + tests + coverage

# from server/
npx vitest run
npx vitest run src/modules/tournaments/tournament.test.ts   # single file
MONGOMS_AVAILABLE=1 npx vitest run                          # + Mongo integration tests
```

## Seed users (password `belote123`)

| Username | Team role in « Les Atouts » | Tokens |
|----------|------|--------|
| ameur    | owner | 5000 |
| hamid    | super | 3200 |
| sofia    | admin | 2100 |
| invite   | user  | 900  |
| zoe      | none (pending invitation) | 500 |

Promo codes: `111122223333` (500 ◆), `444455556666` (2000 ◆), `999988887777` (10000 ◆).

> Team roles (`owner/super/admin/user`) live on **team membership**, not on `User`.
> `User.role` is a separate axis: `'user' | 'admin' | 'banned'` — `admin` is what the
> back-office checks.

## Architecture

### Module system

Each domain is a self-contained `AppModule` in `src/modules/<name>/`:

```typescript
interface AppModule {
  name: string;
  basePath?: string;                          // REST prefix under /api
  router?: Router;
  registerSocketHandlers?: (server: Server) => void;
  startBackgroundTasks?: () => void;
}
```

Registered in `src/modules/index.ts` → mounted by `src/app.ts`.
**All REST routes are prefixed with `/api`** (e.g. `GET /api/tournaments`).

### Modules WITH a router (registered in `applicationModules`)

| Module | Purpose |
|--------|---------|
| auth | register, login, JWT (7d), `getCurrentUser`, settings |
| user | profile (firstName/lastName/avatarId), search |
| team · invitation | teams (max 40 members; owner/super/admin/user), invitations |
| robot | robot CRUD — engine personality + `algoSpec` + display metadata |
| robotAvatar · playerAvatar | avatar catalogues (robot avatars gated by player level; player avatars free) |
| table | live tables, seats, lobby → playing → finished |
| game | archival, history, replay, **live play** (`liveGame.service`) |
| competition | legacy robots-vs-robots domain; its headless runner is still used |
| matchmaking | queues, pairing, match provisioning (owns the `/matches/*` routes) |
| tournaments | brackets, orchestrator, 30 s worker |
| brain | versioned robot brains — **REST only**, its editor UI died with `web/` |
| wallet · promo | tokens, stakes, payouts, VIP, promo codes |
| analytics | CQRS read model (`participationFact`) |

### Support modules (no router of their own)

`matches` (format catalog, headless + live runners, spectator socket),
`tableTheme`, `scoreConfig`, `houseAccounting`. `monitor` registers its routes and
socket **directly** in `app.ts` / `index.ts`, not via `applicationModules`.

### Core patterns

```typescript
// Errors — throw HttpError, caught by asyncHandler
import { badRequest, notFound, forbidden, unauthorized } from '../../core/HttpError.js';

// Route wrapping
import { asyncHandler } from '../../core/asyncHandler.js';
router.get('/path', requireAuthentication, asyncHandler((req, res) => controller.method(req, res)));

// Auth middleware sets req.userId
import { requireAuthentication, AuthenticatedRequest } from '../../shared/authentication.js';

// Socket auth — IMPLEMENTED in shared/socketAuthentication.ts, attached in index.ts.
// Handshake JWT is verified; socket.data.userId / socket.data.username are set;
// connection is REFUSED without a valid token.
import { getSocketServer } from './core/socketAccessor.js';

// Logging
import { createLogger } from '../../core/logger.js';
const log = createLogger('module-name');
```

`src/core/` also holds `eventBus.ts` and `jobQueue.ts`.

### Table configuration — never hand-roll it

A table's engine config comes from **one** place: `resolveTableConfig()` in
`belote-core` (`packages/core/src/engine/tableConfig.ts`). It maps business options
(opening bid, belote counted or not, play direction, manches, target score) to
`RulesConfig` + `PartieConfig`. `liveGame.service`, `match.headlessRunner`,
`robotMatch.service`, `match.liveRunner.provision` and the tournament orchestrator all
go through it. **No runner builds those objects by hand.**

### Score & levels

Every score in the app — players *and* robots — goes through `scoreKydos` in
`belote-core`. Single award point: `gamePersistence.awardKydosScores()`. Persisted on
`User.rewardPoints/level/scoreInLevel` and `Robot.score/level/scoreInLevel`. Config is
edited in the back-office (`ScoreConfig` singleton). **Never credit score anywhere else.**

### Environment variables (`server/.env`)

```bash
PORT=4000                                                  # API + WebSocket port
MONGO_URI=mongodb://127.0.0.1:27017/belote                 # or 'memory' for in-memory
USE_MEMORY_DB=false                                        # alternative to MONGO_URI=memory
JWT_SECRET=dev-secret-change-me                            # MUST change in production
CORS_ORIGIN=http://localhost:5173,http://localhost:5180    # comma-separated, REST + WS
REDIS_URL=                                                 # optional; empty → InMemoryQueue
```

Read by `src/core/environment.ts`. An unreachable Redis falls back to `InMemoryQueue`
transparently, with a log.

### Socket.IO — actual event names

```
Received:  table:subscribe · table:unsubscribe · table:bid · table:play · table:reclaim
           table:signal · match:spectate · match:leave-spectate
           competitions:subscribe · competitions:unsubscribe

Emitted:   table:update · table:game · table:finished · table:countdown · table:reclaimed
           table:spectators · table:spectator:full · table:substitute · table:surcontre
           table:signal · tables:changed · match:spectator-count · competitions:changed
           monitor:snapshot · monitor:sessions · monitor:log
```

Spectators **never** receive `hands`. Max 5 per free table, 10 per match
(`MAX_SPECTATORS_PER_MATCH`); `DUO_STEEL` refuses them.

## Game economy (exact figures from `matchFormat.ts`)

| Format | Label | Buy-in/player | Prize | Rake | Humans | Robots | Headless |
|--------|-------|--------|-------|------|--------|--------|----------|
| `DUO_STEEL` | Duo d'acier | 200 ◆ | 150 ◆ | 50 ◆ | 2 | 4 | Yes |
| `HYBRID_ALLIANCE` | Alliance hybride | 150 ◆ | 225 ◆ | 75 ◆ | 2 | 2 | No |
| `ROYAL_SQUARE` | Carrée royale | 100 ◆ | 150 ◆ ×2 | 100 ◆ | 4 | 0 | No |

`MATCH_FORMAT_CATALOG` is the **single source of truth** — to change a price or add a
4th format, touch only that file. `verifyEconomics()` guards it in tests.
Per-variant overrides edited in the back-office are merged by
`matchFormatConfig.getEffective()` (effective rake = catalog rake + delta).

**Stake is taken at launch** (`walletService.stakeGame`): all-or-nothing — if a player
cannot pay, the game does not start, and partial debits are refunded.

### Non-headless matches reuse the live engine

`matchLiveService.provision()` turns a Match into an **ephemeral Table**
(`Table.origin = 'match' | 'tournament'`) and hands everything to `liveGameService`.
A 3 s sweep calls `settle()` (score → Match, payouts, rake). Both are **idempotent**.
Never duplicate the real-time loop.

### Tournament positions (ex aequo rule)

Single-elimination positions are **shared**:

- capacity=4 → ranks [1, 2, 3(×2)]
- capacity=8 → [1, 2, 3(×2), 5(×4)]
- capacity=16 → [1, 2, 3(×2), 5(×4), 9(×8)]
- Formula: losers at round R → rank = `capacity / 2^R + 1`

**`ROYAL_SQUARE` tournaments ARE supported** (since v14.14): teams of 2 humans drawn at
start, bracket over `capacity/2` leaves, each rank paid to 2 players.
⚠️ The header comment of `tournament.orchestrator.ts` still claims the opposite — it is
stale, the code below it implements the team bracket.

`tournament.worker.ts` (`setInterval` 30 s) promotes `UPCOMING → LIVE` and drives
`tournament.orchestrator.run()`, which is **idempotent** and rebuilds bracket state on
every pass. No external scheduler.

### House accounting

`HouseTransaction`: `MATCH_RAKE`, `TOURNAMENT_ENTRY`, `TOURNAMENT_PRIZE`.

## Key models

### User (`user.model.ts`)
`username (unique)`, `email`, `passwordHash` (bcrypt 10), `firstName`, `lastName`,
`avatarId`, **`role: 'user'|'admin'|'banned'`**, `team → Team`, `settings`,
`rewardPoints`, **`level`**, **`scoreInLevel`**, `gamesPlayed`,
`wallet: {tokens, lastClaimDay, transactions[]}`, `activeSession`, `favoriteRobot`,
`vipExpiresAt`.

### Tournament (`tournament.model.ts`)
`name, format, status (draft/upcoming/live/finished/cancelled), capacity (4–128),
description, color, icon, minLevel, maxLevel, entryFee, prizesByPosition[], rounds[]
(legacy), gameConfig, startAt, createdBy, participants[{userId, robotIds[],
substituteRobotId, seedIndex, eliminatedAtRound, finalPosition, prizeAwarded}],
bracketTree{rounds[{roundIndex, label, matches[{matchIndex, matchId, gameId, slotA,
slotB, winner, scoreA, scoreB, manchesA, manchesB, …}]}], builtAt,
lastCompletedRound}, winners[]`

`manchesA/manchesB` (manches won) is the **monotone** in-progress score. Never display
the per-manche point total — it resets each manche and showed a misleading "0".

### Match (`match.model.ts`)
`format, status (queued/pairing/running/finished/cancelled), participants[{seat, userId,
robotId, substituteRobotId, team, isHuman}], tournament, tournamentRound, game,
liveTableId, winnerTeam, scores`

### Table (`table.model.ts`)
`status (lobby/playing/finished/draft), kind (hybride/acier/royal), origin
(user/match/tournament), owner, ownerType, visibility, seats[], config, startsAt,
lastActivityAt`

### Game (`game.model.ts`)
`participants[], manches[], stats{}, table, session, owner, team, visibility,
mode (local/online/competition), kind, target, winner, scores, replay`

Replay structure is `manches[].donnes[].operations[]`, read by `op.seat`.

## Testing

### ⚠️ Test files must be registered

`server/vitest.config.ts` keeps an explicit **whitelist of pure tests** by default,
because `mongodb-memory-server` cannot download its binary without network egress.
**A new pure test not added to that list never runs — silently.**

Current list (v19): `permissions`, `gameEconomy`, `profileHelpers`, `scoreLogic`,
`promo.service`, `api.contract`, `logger`, `matchFormat`, `queue`, `tournament`,
`bracket-advance`, `matchEligibility`, `matchFormatConfig`, `royal-bracket`,
`userStatus`, `activeEngagement`, `matchmaking.autoRejoin`, `tableTheme.colors`,
`gameTracking`, `robotAvatar`, `gameQuery.filter`, `scoreConfig.classify`.

`MONGOMS_AVAILABLE=1` switches to `src/**/*.test.ts` (full suite, real Mongo).

**Current state: 22 files, 216 tests, all green.**

Coverage thresholds live in `vitest.config.ts` (statements 30 / branches 70 /
functions 15 / lines 30) — ratchet only, never lower them.

## API routes (all under `/api`)

```
# Auth / users
POST /auth/register    POST /auth/login    GET /auth/me    PUT /settings
PATCH /users/me        GET /users/:id/profile    GET /users/search?q=

# Robots, avatars, brains
GET|POST /robots    GET|PUT|DELETE /robots/:id
GET /avatars        GET /player-avatars
GET|POST /brains    GET /brains/:id    PUT /brains/:id/versions/:v
POST /brains/:id/versions    PUT /brains/:id/active/:v    POST /brains/:id/clone    DELETE /brains/:id

# Tables / games
POST|GET /tables    GET /tables/public-live?page=N    GET /tables/:id
POST /tables/:id/seat    POST /tables/:id/cancel    POST /tables/:id/leave    POST /tables/:id/start
GET /games?scope=&page=&kind=&mode=    GET /games/public    GET /games/:id
POST /games    POST /games/robots

# Matches / matchmaking
POST /matches/enqueue    POST /matches/cancel    GET /matches/queues    GET /matches/formats
GET /matches/mine        GET /matches/:id        POST /matches/:id/live-table    POST /matches/:id/run

# Tournaments
GET /tournaments?status=&all=1    GET /tournaments/mine    POST /tournaments
GET /tournaments/:id              GET /tournaments/:id/bracket
POST /tournaments/:id/join        POST /tournaments/:id/leave
POST /tournaments/:id/publish     POST /tournaments/preview-economics

# Teams / invitations
GET /teams    GET /teams/mine    POST /teams    GET|PUT /teams/:id
POST /teams/:id/join    POST /teams/:id/leave    DELETE /teams/:id/members/:userId
PUT /teams/:id/members/:userId/role    POST /teams/:id/invite
GET /invitations    GET /invitations/count    GET /teams/:id/invitations
POST /invitations/:id/accept    POST /invitations/:id/decline    POST /invitations/:id/cancel

# Wallet / promo / analytics / legacy competitions
GET /wallet    POST /wallet/claim    GET|POST /wallet/vip    POST /promo/redeem
GET /analytics/me    GET /analytics/robots/:id    POST /analytics/rebuild
POST|GET /competitions    GET /competitions/mine    GET /competitions/:id
POST /competitions/:id/join    POST /competitions/:id/cancel
```

Full schemas: [`../docs/api-reference.md`](../docs/api-reference.md) and
[`../docs/websocket-reference.md`](../docs/websocket-reference.md).

## VPS production

```
IP: 217.160.186.250
PM2: ecosystem.config.js — kydos-api (PORT=8881) + kydos-mobile (vite preview :8882)
     fork mode, tsx, max_memory_restart 512M
```

⚠️ Three PM2 files disagree with each other. `ecosystem.config.cjs` (older) still
declares `belote-web` / `belote-web-dev`, which point at the **deleted** `web/`
workspace. And the repo root is `"type": "module"`, so a `.js` config using
`module.exports` is not loadable as-is. **Check which file the VPS actually uses before
any `pm2 reload`**, and move the hardcoded Mongo/JWT secrets out into `.env`.

## Strict rules

1. **No stubs** — deliver complete code, never stop before everything is done.
2. **Read everything before coding** — understand the full context.
3. **No TNR unless explicitly requested.**
4. **Do not touch `board/tasks.json`** unless asked (it is no longer maintained anyway).
5. **Keep code modular** — follow the `AppModule` pattern.
6. **Never ask "continue"** — just deliver.
7. **`belote-core` is sacred** — never modify the game engine to work around a server
   problem. If the engine genuinely needs a change, say so explicitly first.
8. **One decision, one place** — never recompute in a runner what `resolveTableConfig`,
   `matchFormat`, or `scoreKydos` already resolves.
9. **Every fixed bug ships with a test that failed before the fix**, added to the
   `vitest.config.ts` whitelist.

## Known issues & gaps (verified on this tree)

Still open:

- No rate limiting on any endpoint.
- No helmet / security headers.
- No Zod/Joi input validation (manual checks only).
- No `express-mongo-sanitize` (NoSQL injection possible).
- JWT lasts **7 days** and `JWT_SECRET` defaults to a predictable string.
- Body limit is 5 MB (`app.ts`) — should be ~100 KB.
- Wallet operations are **not transactional** (`document.save()`, no Mongo sessions).
- No password reset / email verification; no RGPD `DELETE /users/me`.
- PM2 single instance (no cluster mode); no Sentry, no Prometheus.
- `rewardScoring.computeReward` still neutralises its "bonus D" (dedans, capots,
  contrés) although `Game.stats` carries the data.

Fixed since the v14.14 audit — **do not re-report these**:

- ✅ Socket.IO **is** authenticated (`shared/socketAuthentication.ts`, attached in `index.ts`).
- ✅ `User.role` **is** persisted (`'user' | 'admin' | 'banned'`, indexed).
- ✅ `ROYAL_SQUARE` tournaments **are** supported (team-of-2 brackets, v14.14).
- ✅ Stakes **are** debited at launch (`walletService.stakeGame`, all-or-nothing).
