# Architecture — Kýdos Belote

Vue d'ensemble technique : dépendances entre espaces, couches de chaque
application, modules serveur, et flux d'une partie.

> Les règles opérationnelles (modules centraux, contrats à ne jamais casser,
> miroirs à synchroniser) sont dans [`../../CLAUDE.md`](../../CLAUDE.md).

## 1. Le dépôt

```
belote-kydos/
├── packages/
│   ├── core/          belote-core        — moteur de jeu PUR
│   ├── table-pixi/    @kydos/table-pixi  — table PixiJS + HUD
│   ├── application/   ⚠️ legacy, aucun import
│   └── belote-table/  ⚠️ legacy, aucun import
├── server/            belote-server      — API Express + MongoDB + Socket.IO
├── mobile/            belote-mobile      — app joueur (Vite + Capacitor)
├── back-office/       Angular 19 + Express admin — HORS workspaces npm
├── scripts/           tnr.mjs · tnr-server.mjs · coverage.mjs · healthcheck.mjs
└── docs/
```

Le workspace `web/` (React) a été **supprimé en v16** ; `packages/application` et
`packages/belote-table` sont encore versionnés mais **plus personne ne les importe**.

## 2. Règle de dépendance fondamentale

```
                 ┌──────────────────┐
                 │   belote-core    │  moteur pur, aucune dépendance
                 └────────┬─────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│ @kydos/table-pixi  │          │   belote-server    │
│ la table de jeu    │          │   API + sockets    │
└─────────┬──────────┘          └─────────┬──────────┘
          │                               │ HTTP / WS
          └──────────────┬────────────────┘
                         ▼
                  ┌────────────┐
                  │   mobile   │
                  └────────────┘

┌──────────────────────┐      ┌───────────────────────┐      ┌──────────┐
│ back-office (Angular)│─────►│ back-office/server    │─────►│ MongoDB  │
└──────────────────────┘      │ Express :3001 /admin  │      │  (même   │
                              └───────────────────────┘      │   base)  │
```

Le **back-office ne dépend ni de `belote-core` ni de `table-pixi`** : il partage
seulement la base MongoDB avec le serveur de jeu. Conséquence directe — certaines
logiques pures y sont **recopiées à l'identique** :

| Original | Miroir |
| --- | --- |
| `packages/core/src/scoring/scoreKydos.ts` | `back-office/server/src/scoreKydos.ts` |
| `server/src/modules/tableTheme/tableTheme.colors.ts` | `back-office/server/src/tableThemeColors.ts` |
| `packages/table-pixi/robotMascot.ts` | `mobile/src/presentation/components/RobotMascot.ts` · `back-office/src/app/shared/robot-mascot.ts` |

Toucher à un original **sans** répercuter sur son miroir est la régression la plus
facile à introduire dans ce dépôt. Le miroir mobile de la mascotte est volontaire :
importer `@kydos/table-pixi` tirerait Pixi dans l'environnement de test mobile.

## 3. `belote-core` — le moteur

Pur : aucun DOM, aucun réseau, aucune persistance.

```
packages/core/src/
├── domain/     types (Card, Seat, Suit, RobotConfig, Personality…)
├── rules/      ContreeRules — obligations, atout maître, plis
├── engine/     GameEngine · RobotDriver · tableConfig
├── robot/      AlgoSpec · RobotBrain · algorithm/* · conventions/* · workflow/*
└── scoring/    donneScoring · scoreKydos · GameStats · rewardScoring
```

Trois points d'entrée structurants :

- **`GameEngine`** — une partie complète (annonces → jeu → scores). API :
  `submitBid`, `playCard`, `collectTrick`, `nextDonne`, `nextManche`,
  `setBeloteAnnounce`, `view()`, `handOf()`, `legalCards()`, `toReplay()`.
- **`tableConfig.resolveTableConfig()`** — LE traducteur des options métier d'une
  table (enchère d'ouverture, belote comptée, sens du jeu, manches, score cible) en
  `RulesConfig` + `PartieConfig`. **Aucun runner ne fabrique ces objets à la main.**
- **`RobotDriver.robotAct(engine, seat, algo)`** — le seul endroit qui connaît à la
  fois le moteur et un cerveau de robot.

Détail de la chaîne robot : [`../architecture-robots.md`](../architecture-robots.md).

## 4. Le serveur

Express + MongoDB (Mongoose) + Socket.IO, port **4000**. Chaque module est autonome
(`model → service → controller → routes`) et **enregistré en une ligne** dans
`server/src/modules/index.ts` ; `app.ts` monte chaque routeur sous `/api` et branche
les handlers socket + tâches de fond déclarés par le module.

Modules **avec routeur** (`applicationModules`) :

| Module | Responsabilité |
| --- | --- |
| `auth` | inscription, connexion, JWT |
| `user` | profil (prénom, nom, avatar), recherche, réglages |
| `team` · `invitation` | équipes (owner/super/admin/user, 40 membres), invitations |
| `robot` | écurie : personnalité moteur + `algoSpec` + métadonnées d'affichage |
| `robotAvatar` · `playerAvatar` | catalogues d'avatars (robots par niveau, joueurs libres) |
| `table` | tables de jeu, sièges, cycle lobby → playing → finished |
| `game` | parties, replays, verrou une-partie, **moteur live** (`liveGame.service`) |
| `analytics` | statistiques joueur et robot |
| `competition` | ancien domaine robots-vs-robots (runner headless encore utilisé) |
| `matchmaking` | files d'attente, appariement, provisionnement des matchs |
| `tournaments` | brackets, orchestrateur, worker cron 30 s |
| `brain` | versionnage des cerveaux de robots (API REST seule — l'UI a disparu avec `web/`) |
| `wallet` · `promo` | jetons, mises, gains, VIP, codes de rechargement |

Modules **support** (pas de routeur propre, consommés par les précédents) :
`matches` (catalogue de formats, runners headless et live, socket spectateurs),
`tableTheme`, `scoreConfig`, `houseAccounting`. `monitor` enregistre ses routes
directement dans `app.ts`.

## 5. L'application mobile

Clean architecture stricte, dépendances dirigées vers l'intérieur :

```
core          dom · Router · Store · EventBus
   ▲
data          ApiClient · SessionCache · bootstrap · TableSocket · catalogues d'avatars
   ▲
domain        entités et cas d'usage
   ▲
presentation  écrans + composants        design-system (CSS autonome)
services      localGame · gameLoop · wallet · sound/* · ads/*
```

`main.tsx` est la **seule** composition root ; la présentation résout ses
dépendances via `presentation/context.ts`.

Deux singularités à connaître :

- **Bootstrap unique** — `runBootstrap()` charge profil, wallet, VIP et robots puis
  précharge les sons, derrière l'écran d'attente `#boot`. Les écrans lisent ensuite
  `SessionCache` en **synchrone** et ne refetchent jamais au montage. Voir
  [`../session-cache.md`](../session-cache.md).
- **Design system autonome** — aucune valeur en dur dans les écrans, paysage
  uniquement, jamais de `<select>` natif. Voir [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md).

## 6. Flux d'une partie

**Entraînement local (hors-ligne possible, gratuit)**

```
GameSetupDialog → buildLocalGame(setup, robots) → GameLoop
    → robotAct(engine, seat, brain) → engine.submitBid/playCard
    → rendu @kydos/table-pixi → POST /games à la fin
```

**Partie en ligne (table libre)**

```
POST /tables → /seat (verrou activeSession) → /start
    → walletService.stakeGame (tout ou rien)
    → liveGameService : timers, substitution robot, diffusion filtrée
    → persistance + gains + score Kýdos + libération du verrou
```

**Match rapide**

```
enqueue(format, robotIds) → stake → file FIFO (InMemory ou Redis)
    → appariement complet → Match(PAIRING)
         ├── DUO_STEEL (headless) → matchHeadlessRunner.run() en synchrone
         └── HYBRID / ROYAL       → matchLiveService.provision()
                                     = Table éphémère → liveGameService
                                     puis sweep 3 s → settle()
```

**Tournoi** — le worker (`setInterval` 30 s) passe `UPCOMING → LIVE` à `startAt`
puis appelle `tournament.orchestrator.run()`, **idempotent** : il reconstruit l'état
du bracket, crée les Matchs manquants du round, propage les gagnants, distribue les
gains et clôt le tournoi. Aucun scheduler externe.

Détail : [`../matches-tournaments.md`](../matches-tournaments.md) et
[`../match-live-runner.md`](../match-live-runner.md).

## 7. Contrats à ne jamais casser

1. **Personnalité moteur** `{ aggressiveness, concentration, velocity }` sur **1–10**.
   Les curseurs mobiles 0–100 y sont mappés sans perte ; `bluff` est présentationnel
   et n'est **jamais** injecté dans le moteur.
2. **Manches** : le moteur n'accepte que `1 | 2 | 4`.
3. **Coéquipier caché** : jamais visible, même en mode « cartes visibles ».
4. **Spectateurs** : ne reçoivent **jamais** `hands`. Max 5 par table libre, 10 par
   match ; `DUO_STEEL` les refuse.
5. **Replay** : structure `manches[].donnes[].operations[]`, lue par `op.seat`.
6. **Verrou une-partie-à-la-fois** : `User.activeSession`, libéré à la persistance
   de fin de partie.
7. **Parité des robots** : un même `algoSpec` décide pareil dans tous les pilotes.
   Ne jamais dupliquer une heuristique dans un pilote.

## 8. Dette structurelle connue

- **Sécurité du serveur de jeu** : ni `helmet`, ni rate-limiting, ni `mongo-sanitize`,
  ni validation d'entrée (Zod/Joi) ; JWT à **7 jours**. Les sockets, eux, **sont**
  authentifiés (`shared/socketAuthentication.ts`) — le diagnostic est périmé sur ce
  point. Le back-office a rate limit + audit + JWT 4 h.
  Verdict de l'audit : **ne pas exposer au public en l'état**
  ([`../DIAGNOSTIC-v14.14-production-readiness.md`](../DIAGNOSTIC-v14.14-production-readiness.md)).
- **Duplication assumée** des logiques pures vers le back-office (§2).
- **Packages legacy** `application` / `belote-table` toujours dans le glob des
  workspaces, hors typecheck et hors tests.
- `rewardScoring.computeReward` neutralise son volet « bonus D » (dedans, capots,
  contrées) alors que `Game.stats` porte l'information.
