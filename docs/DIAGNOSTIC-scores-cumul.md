# Diagnostic — Cumul des scores dans Kýdos Belote

_État au 2026-08-21, branche `claude/back-office-angular-mhtcd8`._

Ce document répond à trois questions :

1. **Quels scores existent dans l'application** (par manche, par partie, par joueur, par robot) et où sont-ils **définis dans le code** ?
2. **Comment le score est-il incrémenté** pour un joueur ou pour un robot ?
3. **Où est-il sauvegardé** dans la base de données ?

Une carte rapide avant d'entrer dans le détail.

## 1. Vue d'ensemble — trois couches de « score » bien séparées

Kýdos superpose **trois systèmes de score distincts** qui ne se cumulent pas entre eux et n'ont pas la même durée de vie :

| Couche | Ce qu'elle mesure | Périmètre | Persistée où | Cumul multi-partie ? |
|---|---|---|---|---|
| **A. Points de cartes belote** | Points de la donne (base 162 + belote/dedans/contres/capots), cumulés dans la manche, best-of sur la partie. | Par **équipe** (A/B) et **par partie**. | Éphémère dans `GameEngine` puis figé sur `Game.manches[]` / `Game.finalScoreA/B` / `Game.manchesWonA/B` / `GameReplay`. | **Non** — remis à zéro à chaque partie. |
| **B. Points récompense (profil joueur)** | Progression du joueur (niveau, rang). Formule 100 + A + B + C + D. | Par **utilisateur humain** uniquement. | `User.rewardPoints` (`+=` en fin de partie). | **Oui** — incrémental à vie. |
| **C. Économie (jetons / wallet)** | Monnaie in-game : mise à l'entrée, gains à la sortie, prix de tournoi, quotidien, VIP. | Par **utilisateur** (le propriétaire du robot pour un gain robot). | `User.wallet.tokens` + `User.wallet.transactions[]`. | **Oui** — solde cumulé + journal borné (200). |

Deux systèmes complémentaires plus techniques :

| Couche | Rôle |
|---|---|
| **D. `ParticipationFact` (CQRS lecture)** | Table dénormalisée append-only, granularité **donne × siège**. C'est **la seule source de cumul multi-partie pour les robots** (dérivé/rebuildable depuis `GameReplay`). Alimente `/analytics/robots/:id` et `/analytics/me`. |
| **E. ELO d'affichage** | Chiffre dérivé de la personnalité (**pas** un vrai classement compétitif). Non persisté ; recalculé à la volée. |

**Ce que Kýdos ne stocke PAS** :

- **Aucun** score cumulé sur `RobotModel` — pas de champ `games`, `wins`, `elo`, `rewardPoints` sur le robot. Les stats robot sont **agrégées à la demande** depuis `ParticipationFact`.
- **Aucun** classement ELO réel : `eloFromPersonality` est purement décoratif.

---

## 2. Couche A — Points de cartes belote (score de la partie)

### 2.1 Score d'une donne (par équipe)

**Fonction pure**, entièrement testée : `scoreManche` dans `packages/core/src/scoring/donneScoring.ts:29`.

Règles telles qu'implémentées :

- Base **162** par donne (152 cartes + 10 de der ; le _der_ est ajouté à l'équipe du dernier pli **avant** l'arrondi).
- Arrondi **par équipe** à la dizaine, ≥ 5 monte (`roundPoints`, ligne 20).
- **Belote (+20)** uniquement si annoncée ; sinon personne ne prend les 20. En cas de défaite du camp annonceur, les 20 passent à l'adversaire.
- **Sans contre** :
  - Contrat réussi → chaque équipe garde ses points arrondis + sa propre belote (l.71).
  - Contrat chuté → défense = **160 fixe** (+ belote si applicable), preneur = **0** (l.81).
- **Avec contre** : forfait fixe **320** au camp gagnant ; **surcontre = 640** (l.61).
- **Capot** : barème dédié `capotDeclared` / `capotUndeclared`, multiplicateur × contre/surcontre (l.46).

**Configurable à l'instanciation de la table** via `resolveTableConfig` :
- `countBelote` → `beloteBonus = 20` ou `0` ;
- `openingBidMin` → `minBid` (utilisé pour l'échelle d'enchères) ;
- `clockwise` → sens du jeu.

### 2.2 Cumul dans le moteur (par équipe, par manche, par partie)

Dans **`packages/core/src/engine/GameEngine.ts`** :

| Champ | Ligne | Rôle |
|---|---|---|
| `pointsThisDonne: {A,B}` | 78, 216, 466 | Points bruts des plis d'une **donne** ; alimenté à chaque `collectTrick` par `cardValue` × cartes du pli. |
| `cumulative: {A,B}` | 56, 542-543, 558 | **Somme des donnes** dans la **manche** courante. Incrémenté par `endDonne()` avec le résultat de `scoreManche`. |
| `manches[].cumulative` | 558 | Snapshot du cumul figé à la fin de chaque donne, embarqué dans `MancheRecord`. |
| `manchesWon: {A,B}` | 47, 578 | Compteur de **manches gagnées** par équipe (`endManche` : `manchesWon[winner] += 1`). |
| `partieWinner` | 49, 589 | Équipe qui a gagné la partie (best-of `manches` : 1, 2 ou 4). |

Fin de manche (`endManche`, l.574) : `winner = cumulative.A >= cumulative.B ? 'A' : 'B'`, la manche est bouclée dès que `cumulative.A >= target` **ou** `cumulative.B >= target` (l.561). `target` vient de `PartieConfig.baseTarget` (1500 par défaut, configurable par table/tournoi).

### 2.3 Statistiques dérivées (post-partie)

**Fonction pure** `computeGameStats` dans `packages/core/src/scoring/GameStats.ts:107`. Depuis le `ReplayRecord`, elle recalcule :
- `finalScore.{A,B}`, `manchesWon.{A,B}`, `winner` ;
- `totalDonnes`, `totalTricks.{A,B}` (via `op('trick')`) ;
- `contres.total / surcontres / contresReussies` ;
- `capots.{A,B,total}` (8 plis) et `capotsAnnonces.{A,B,total}` ;
- `belotes.{A,B}` (via `op('belote_announce', {on:true})`) ;
- une ligne `DonneStat` par donne (contrat, atout, contre, tricks, score).

Enrichi par `deriveExtraStats` (`server/src/modules/game/gameTracking.ts:30`) qui ajoute `totalTricks`, `contractsMade`, `contractsFailed`, `avgContract`, plus `replayDurationMs` (écart 1ᵉʳ↔dernier `op.at`).

### 2.4 Persistance MongoDB

`server/src/modules/game/game.model.ts` — collection **`Game`** :

- `finalScoreA`, `finalScoreB` — score de cartes final (l.107-108).
- `manchesWonA`, `manchesWonB` (l.110-111).
- `manches: [{ number, target, winner, scoreTeamA, scoreTeamB }]` embarqué (l.24, 104).
- Sous-doc **`stats`** complet (l.113) : `totalDonnes`, `totalTricks{A,B,total}`, `contres`, `surcontres`, `contresReussies`, `capotsA/B/Total`, `capotsAnnonces*`, `belotesA/B`, `contractsMade`, `contractsFailed`, `avgContract`.
- `winner: 'A'|'B'|null` (l.97).
- Collection froide **`GameReplay`** (`gameReplay.model.ts`) : même `_id` que le `Game`, contient tout le déroulé rejouable (opérations horodatées, mains initiales…) — c'est ce qui permet le _rebuild_ des projections.

**Écriture** : `gamePersistence.service.ts:105-144` (`GameModel.create(...)`) à la fin de la partie, après avoir écrit le `GameReplay` d'abord (l.74).

**Point important** : ce score n'est jamais reventilé par siège. Les seules dimensions persistées sont **équipe A / équipe B**. Un cumul par joueur ou par robot doit donc passer par `Game.participants[]` ou par `ParticipationFact` (couche D).

---

## 3. Couche B — Points récompense (profil joueur)

### 3.1 Formule (pure)

`packages/core/src/scoring/rewardScoring.ts:40` — `computeReward(input)` :

```
default = 100
A       = max(0, myScore − oppScore)                     // écart de la manche
B       = wonManche ? mancheTarget : 0                    // 1500 ou 2000
C       = wonPartie ? PARTIE_BONUS[partieManches] : 0    // 0 / 3000 / 6000 pour 1/2/4 manches
D       = 160·advDedans + 500·capotsDeclaresRealises
        + 320·contreesGagnees + 640·surcontreesGagnees
total   = default + A + B + C + D
```

Cas particulier : `local === true` (entraînement) → **tous zéros** (rien ne progresse en local). Voir `PartieConfig.local`.

### 3.2 Incrémentation et persistance

Dans `server/src/modules/game/gamePersistence.service.ts:150-165`, au moment de persister la partie terminée, pour **chaque siège humain** :

```ts
const reward = computeReward({
  myScore: finalManche.cumulative[teamLetter],
  oppScore: finalManche.cumulative[opponentLetter],
  wonManche: finalManche.winner === teamLetter,
  mancheTarget: finalManche.target,
  wonPartie: winner === teamLetter,
  partieManches: engine.manches.length,
  advDedans: 0, capotsDeclaresRealises: 0, contreesGagnees: 0, surcontreesGagnees: 0,
  local: false,
});
await UserModel.findByIdAndUpdate(
  participant.userId,
  { $inc: { rewardPoints: reward.total, gamesPlayed: 1 } },
);
```

Deux dettes techniques évidentes ici :

- Les compteurs **D** (`advDedans`, `capotsDeclaresRealises`, `contreesGagnees`, `surcontreesGagnees`) sont **codés en dur à zéro** au niveau de la persistance — donc le volet « bonus D » de la formule est neutralisé en pratique aujourd'hui.
- La récompense n'est calculée qu'à partir de la **dernière manche** de la partie, pas de la partie entière.

**Persistance** : `User.rewardPoints` (l.34 de `user.model.ts`, type `Number`, défaut 0) + `User.gamesPlayed`. `$inc` atomique, une écriture par siège humain à la fin de la partie.

**Robots** : aucune ligne dans cette boucle. **Les robots ne touchent pas de points récompense**, et il n'y a pas de champ équivalent sur `RobotModel`.

### 3.3 Dérivés

- **Niveau joueur** : `computePlayerLevel(rewardPoints) = 1 + floor(rewardPoints / 100)` (`server/src/shared/levels.ts`).
- **Rang indicatif** : `rankLabel(level)` : `Débutant < 6 ≤ Initié < 12 ≤ Confirmé < 20 ≤ Expert < 30 ≤ Maître` (`user.service.ts:17`).
- Le niveau sert notamment à **filtrer les avatars débloqués** dans `robotAvatar.service.ts:isAvatarUnlocked(level, min, max)`, appelé par `GET /avatars`.

---

## 4. Couche C — Économie (jetons / wallet)

Barème central : `server/src/shared/gameEconomy.ts`.

### 4.1 Mises

- Constantes : `HUMAN_STAKE = 100`, `ROBOT_STAKE = 50`, `DAILY_REWARD = 500`.
- `stakeForSeat(ctx, seat)` → 0 en mode `local`, sinon 100 (humain) / 50 (robot).
- `stakesByUser(ctx)` agrège par utilisateur (humain sur ses sièges + propriétaire des robots).
- Application au démarrage d'une partie facturable : `walletService.stakeGame(map)` (`wallet.service.ts:132`) — **vérifie tous les soldes d'abord**, puis débite ; en cas d'échec en cours, **rembourse** tout ce qui a déjà été débité. `stake()` (l.58) crée une transaction `game_stake` négative avec le nouveau solde.

### 4.2 Gains fin de partie

`payoutsByUser(ctx)` (`gameEconomy.ts:39`) selon composition des sièges de l'équipe gagnante :

| Composition | Gain (par utilisateur gagnant) |
|---|---|
| 4 humains | 150 par humain gagnant |
| 2 humains + 2 robots | 225 par humain gagnant |
| 4 robots | 150 au **propriétaire** du robot gagnant |
| 1H+3R ou 3H+1R | 150 par humain gagnant (fallback) |

Écrit dans `gamePersistence.service.ts:170-189` : pour chaque `[userId, amount]` de `payouts`, `walletService.credit(userId, amount, gameId, 'game_win')`.

### 4.3 Récompense quotidienne, remboursements, VIP, promos

- `POST /wallet/claim-daily` (`wallet.controller.ts`) → `walletService.claimDaily(userId)` (`wallet.service.ts:37`) : idempotent par jour ISO (`todayIso()`), écrit une transaction `daily` de `+500`.
- Remboursement (`refund`) : annulation d'une partie pending, remboursement d'un tournoi (`tournament.service.ts:312`).
- VIP : `purchaseVip` débite `costTokens`, prolonge `User.vipExpiresAt`, transaction `vip`.
- Promo : transactions `promo`.

### 4.4 Persistance MongoDB

`server/src/modules/user/user.model.ts` — sous-doc `wallet` sur `User` :

```ts
wallet: {
  tokens: Number,                                    // solde courant
  lastClaimDay: String | null,                       // 'YYYY-MM-DD'
  transactions: [WalletTransaction],                 // journal borné (200 dernières)
}
```

`WalletTransactionSchema` (l.11) : `{ kind, amount, balance, at, game }` avec `kind ∈ {daily, game_stake, game_win, refund, promo, vip}`.

**Robots** : pas de wallet propre. Les gains d'un robot sont crédités au **propriétaire** du robot (`Robot.owner`).

### 4.5 Comptabilité maison

En parallèle des versements aux joueurs, `houseAccountingService` (`server/src/modules/houseAccounting/`) enregistre les mouvements de la « banque Kýdos » : entrées tournoi (`recordTournamentEntry`), prix versés (`recordTournamentPrize`), etc. Cela sert le module « Accounting » du back-office (marges maison), pas le score du joueur.

---

## 5. Couche D — `ParticipationFact` : le vrai cumul multi-parties (CQRS)

C'est la **seule source de cumul long-terme** aussi bien pour les humains **que pour les robots**.

### 5.1 Modèle (`participationFact.model.ts`)

Append-only, une ligne **par donne × par siège** (donc jusqu'à `4 × donnes_de_la_partie` lignes par partie). Le contexte est **dénormalisé** — aucune jointure requise pour les agrégations.

Dimensions :

| Champ | Type | Utilité |
|---|---|---|
| `game`, `participantType`, `user`, `robot` | refs + enum | Identité du siège. |
| `seatIndex`, `team` ('A'/'B') | | Position. |
| `mancheNumber`, `donneNumber` | | Contexte temporel. |
| `trump`, `contract`, `contre` | | Contexte de la donne. |

Mesures (faits) :

| Champ | Type | Sens |
|---|---|---|
| `wasBidder` | Bool | Ce siège était preneur ? |
| `wasSubstitute` | Bool | Ce siège était joué par un remplaçant ? |
| `pointsTeam` / `pointsOpponent` | Number | Points de cette **donne**, côté du siège vs adversaire. |
| `wonDonne` | Bool | `pointsTeam > pointsOpponent` sur la donne. |
| `wonManche` | Bool | Équipe du siège a gagné la manche. |
| `wonGame` | Bool | Équipe du siège a gagné la partie. |

Index :
- `robot: 1, wasBidder: 1` — stats par robot en tant que preneur ;
- `user: 1, wasBidder: 1` — idem côté joueur ;
- Index simples sur `game`, `user`, `robot`, `playedAt`.

### 5.2 Projection (écriture)

`server/src/modules/analytics/gameProjection.service.ts:22` — `projectGame(gameId)` :

1. Charge `Game` + `GameReplay`.
2. `buildFacts` traverse `replay.manches[].donnes[]` et crée une ligne par participant × donne.
3. Purge les faits existants du game (idempotent), insert bulk `ordered: false`.
4. Marque `Game.projection = { status: 'done', version: PROJECTION_VERSION, at }`.

Chemin : `LiveGameService` termine → `gamePersistenceService.persistFinishedGame` publie `DomainEvents.GameFinished` (`gamePersistence.service.ts:195`) → un handler consomme et appelle `gameProjectionService.projectGame(id)`. La **source de vérité reste `Game` + `GameReplay`** : la projection peut échouer sans corrompre les données, et être _rebuild_ à tout moment via `rebuildOutdated()`.

### 5.3 Lecture (agrégation)

`server/src/modules/analytics/analytics.service.ts:53-61` :

- `getRobotStats(robotId)` → `$match { robot: robotId }` → `donnesPlayed`, `donnesWon`, `winRate`, `asBidder`, `asBidderWon`, `bidderWinRate`, `byTrump`.
- `getPlayerStats(userId)` → même agrégation, `$match { user: userId }`.

Endpoints : `GET /analytics/robots/:id`, `GET /analytics/me`, `POST /analytics/rebuild`.

C'est ici, et **uniquement ici**, qu'on obtient le « cumul » (donnes jouées / gagnées, taux de victoire, breakdown par atout) pour un **robot** à travers toutes ses parties.

---

## 6. Couche E — ELO d'affichage (décoratif)

`server/src/modules/user/user.service.ts:9` :

```ts
export function eloFromPersonality(p): number {
  return Math.round(1000 + (p.aggressiveness + p.concentration + p.velocity) / 30 * 900);
}
```

Calculé **à la volée** à partir de la personnalité du robot, **jamais** stocké. C'est un indicateur de « force estimée » (1000–1900), pas un vrai ELO Glicko/compétitif.

Côté mobile, `Robot.elo` (`mobile/src/domain/entities/Robot.ts:89`) prend `data.elo ?? 1000`. `RobotRepository.toDomain` (`mobile/src/data/RobotRepository.ts:30`) l'**initialise à 1000 en dur** ; de même pour `games: 0` et `wins: 0`. Ces trois valeurs ne remontent donc **pas** du serveur aujourd'hui — cohérent avec l'absence de champ correspondant sur `RobotModel`.

---

## 7. Tournois — couche de prix additionnelle (jetons)

`server/src/modules/tournaments/tournament.service.ts` :

- **Inscription** : `walletService.stake(userId, t.entryFee)` (l.272) + `houseAccountingService.recordTournamentEntry`. Transaction `game_stake`.
- **Refund** avant le lancement : `walletService.credit(userId, t.entryFee, undefined, 'refund')` (l.312).
- **Distribution des prix** en fin de tournoi (l.492-523) : selon `prizesByPosition` (v14.12) ou fallback `rounds` legacy. Pour chaque position finale, `walletService.credit(uid, prize, undefined, 'game_win')` + `houseAccountingService.recordTournamentPrize`. Le champ `Participant.prizeAwarded` est écrit sur le sous-doc du tournoi.
- **Rentabilité (pur)** : `tournamentEconomics` / `tournamentEconomicsByPosition` dans `economics.ts` — sert le back-office.

Cette couche s'empile sur la couche C (jetons) — elle n'ajoute rien aux `rewardPoints` (couche B).

---

## 8. Récap — « où finit chaque chose ? »

À la fin d'une partie en ligne / compétition :

```
GameEngine (mémoire)
  ├─► GameReplay.replay                     (froid, rejouable)
  ├─► Game.{manches, participants,          (agrégat chaud)
  │        finalScoreA/B, manchesWonA/B,
  │        winner, stats.*, durationMs}
  ├─► pour chaque humain :
  │     User.rewardPoints  += computeReward(...).total       (couche B)
  │     User.gamesPlayed   += 1
  ├─► payoutsByUser(...) →
  │     User.wallet.tokens += gain          (couche C, 150 ou 225)
  │     User.wallet.transactions.push({kind:'game_win', ...})
  ├─► SessionModel { status:'finished', finishedAt }
  └─► publish GameFinished
        └─► ParticipationFact.insertMany(4·donnes lignes)   (couche D)
              → Game.projection = { status:'done', version, at }
```

Et pour un **robot** : rien ne s'écrit sur son document `Robot`. Sa « progression » se lit dynamiquement en agrégant `ParticipationFact`. Ses gains éventuels se retrouvent sur le **wallet du propriétaire**.

---

## 9. Constats et pistes

1. **Les points récompense n'utilisent que la dernière manche** (`finalManche`) et **neutralisent le bonus D** (dedans/capots/contres). C'est une simplification volontaire ou une dette : les infos existent déjà dans `Game.stats` (`contres`, `capotsA/B`, etc.) — on pourrait les câbler.
2. **`RobotModel` n'a aucun champ de cumul** (games, wins, elo, rewardPoints). Si on veut afficher rapidement l'historique d'un robot (nombre de parties, victoires…) sans agrégation Mongo, il faudrait ajouter des compteurs incrémentés au même moment que `User.gamesPlayed`, ou mettre en cache le résultat de `getRobotStats`.
3. **Le mobile initialise `Robot.elo/games/wins` à 1000/0/0 en dur** (`RobotRepository.toDomain`), donc l'ELO affiché n'a **aucun rapport** avec les vraies parties jouées. Si on veut coller au serveur, il faut soit exposer l'ELO calculé (`eloFromPersonality`) via `/robots`, soit remplacer par les stats d'agrégation.
4. **Le bonus D reward** dépend d'événements binaires (dedans, contres réussies, capots réussis, surcontres réussies) qui sont **déjà dans `Game.stats`** post-partie — un simple mapping ferait vivre la couche B.
5. **`Game.finalScoreA/B` = score de la dernière manche uniquement** (via `computeGameStats` : `finalScore = last.cumulative`). Pour un « score de partie » cumulé sur toutes les manches, il faut sommer `manches[].scoreTeamA/B`.
6. **Un unique `activeSession` par utilisateur** (`User.activeSession` + `singleGameLockService`) garantit qu'un joueur n'a qu'une partie facturable ouverte à la fois — un point important pour l'intégrité de la couche C.

---

## 10. Références de code (index rapide)

**Belote-core**
- `packages/core/src/engine/GameEngine.ts` — `cumulative`, `manchesWon`, `endDonne`, `endManche`, `partieWinner`.
- `packages/core/src/scoring/donneScoring.ts` — `scoreManche`, `roundPoints`.
- `packages/core/src/scoring/rewardScoring.ts` — `computeReward`.
- `packages/core/src/scoring/GameStats.ts` — `computeGameStats`.
- `packages/core/src/engine/tableConfig.ts` — `resolveTableConfig` (openingBidMin, countBelote, clockwise).

**Serveur**
- `server/src/modules/game/gamePersistence.service.ts` — persistance Game/Replay, `$inc rewardPoints`, `payoutsByUser`.
- `server/src/modules/game/game.model.ts` — schéma `Game` (finalScoreA/B, manchesWonA/B, `stats`).
- `server/src/modules/game/gameTracking.ts` — `deriveExtraStats`, `replayDurationMs`.
- `server/src/modules/game/gameReplay.model.ts` — schéma froid `GameReplay`.
- `server/src/shared/gameEconomy.ts` — `HUMAN_STAKE`, `ROBOT_STAKE`, `stakesByUser`, `payoutsByUser`.
- `server/src/modules/wallet/wallet.service.ts` — `stake`, `credit`, `claimDaily`, `stakeGame`.
- `server/src/modules/user/user.model.ts` — `rewardPoints`, `gamesPlayed`, `wallet.*`, `vipExpiresAt`.
- `server/src/modules/robot/robot.model.ts` — `RobotModel` (aucun cumul).
- `server/src/shared/levels.ts` — `computePlayerLevel`.
- `server/src/modules/user/user.service.ts` — `eloFromPersonality`, `rankLabel`, `getPublicProfile`.
- `server/src/modules/analytics/participationFact.model.ts` — `ParticipationFact`.
- `server/src/modules/analytics/gameProjection.service.ts` — `projectGame`, `rebuildOutdated`.
- `server/src/modules/analytics/analytics.service.ts` — `getRobotStats`, `getPlayerStats`.
- `server/src/modules/tournaments/tournament.service.ts` — prix (`prizesByPosition`), `walletService.credit` (l.521).
- `server/src/modules/tournaments/economics.ts` — rentabilité tournoi (pur).

**Mobile**
- `mobile/src/domain/entities/Robot.ts` — `elo`, `games`, `wins`, `winRate` (défauts locaux).
- `mobile/src/data/RobotRepository.ts` — `toDomain` (elo=1000, games=0, wins=0 en dur).
- `mobile/src/services/wallet.ts` — lecture wallet + fallback local.

---

## 11. Mise à jour v19 — Modèle UNIQUE `ScoreKydos` (centralisé, back-office)

Depuis la v19, le calcul du score & du niveau — pour **joueurs ET robots** — passe
par un **modèle unique** édité au back-office et appliqué partout. Il remplace
l'ancien `computeReward` (couche B) dans le chemin de persistance, et redéfinit
le niveau (fin de l'ancien `1 + floor(score/100)`).

### Cœur pur (belote-core)
`packages/core/src/scoring/scoreKydos.ts` — 100 % pur, testé :
- `computeScoreGain(config, {isRobot, partieCoefficient, gameTypeCoefficient, tokensAccumulated})`
  → `base(joueur|robot) × coefPartie × coefTypeJeu + tokenScorePercent % des jetons` (borné ≥ 0).
- `buildLevelTable(config)` — échelle géométrique : incrément niveau _n_ = `firstLevelThreshold × (1+pct)^(n-1)`,
  surcharges manuelles possibles. Défaut : 500 pts, +8 %/niveau (niveau 2 à 500, niveau 3 à 1040).
- `levelForScore(config, score)` → `{ level, pointsInLevel, pointsToNext, ratio }`.
- `diagnoseScoreKydos(config)` — détecte incohérences (échelle non croissante, valeurs
  négatives, pourcentages irréalistes, coefficients ≤ 0, surcharges hors bornes, redondances).

### Configuration (singleton)
`ScoreConfig` (`server/.../scoreConfig/scoreConfig.model.ts`, miroir back-office `models.ts`),
document unique `key:'default'`. Champs : `baseWinnerPlayer`, `baseWinnerRobot`,
`firstLevelThreshold`, `levelUpPercent`, `maxLevel`, `tokenScorePercent`,
`gameTypeCoefficients` (`${catégorie}:${genre}` → coef, défaut 1), `levelOverrides[]`.

### Coefficient par partie/tournoi
`scoreCoefficient` (défaut 1) ajouté à : `Table.config`, `Tournament.gameConfig`,
`MatchFormatConfig`. Propagé jusqu'à `persistFinishedGame` via la table live / les runners.

### Attribution (chemin unique et sûr)
`gamePersistence.awardKydosScores` — pour chaque **siège gagnant** (hors mode `local`) :
gain via `computeScoreGain`, `$inc` du score cumulé (`User.rewardPoints` / `Robot.score`),
puis dérivation et écriture de `level` + `scoreInLevel`. Chaque écriture est isolée.
Catégorie de jeu classée par `classifyGameCategory` (tournoi > équipe/compétition > robot > rapide).

### Nouveaux champs persistés
- `User` : `level`, `scoreInLevel` (score cumulé = `rewardPoints`).
- `Robot` : `score`, `level`, `scoreInLevel` (comble l'absence de cumul relevée au §9-2).
- Le niveau (`computePlayerLevel`) et le profil (`getPublicProfile`) dérivent désormais
  du modèle (config live), corrigeant les points §9-3/§9-4.

### Gestion back-office
Route `/admin/score-config` (GET / POST preview / PUT) + page Angular « Score & niveaux » :
édition groupée, **diagnostic en direct**, aperçu de l'échelle et exemples de gain.
La sauvegarde est **refusée tant qu'il subsiste une erreur** de diagnostic.
