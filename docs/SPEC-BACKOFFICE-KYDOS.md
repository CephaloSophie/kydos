# SPEC — Kýdos Belote Back Office (Administration)

> **⚠️ Document de CONSTRUCTION — le back-office existe désormais.** Ce texte a servi
> à *spécifier* l'outil d'administration avant son écriture ; il ne décrit pas
> forcément ce qui a été livré. Pour l'implémentation réelle (API `/admin`, pages
> Angular, auth, audit, déploiement) : [`backoffice/technique.md`](./backoffice/technique.md)
> et [`backoffice/fonctionnel.md`](./backoffice/fonctionnel.md). Les mentions du
> workspace `web/` sont caduques (supprimé en v16).


> **Public cible** : session Claude Code qui construira le back office complet.
> Ce document est AUTOSUFFISANT — il contient toutes les informations nécessaires
> pour construire l'application d'administration sans accéder au code du serveur
> de jeu. Lire EN ENTIER avant de coder.

---

## 1. OBJECTIF

Construire un **back office web** qui permet à l'équipe Kýdos de :

1. **Gérer les tournois** — créer, éditer, publier, annuler, consulter l'arbre bracket.
2. **Suivre l'économie** — dashboard revenus/dépenses kydos (rake matchs, buy-ins tournois, prizes versés).
3. **Surveiller le serveur** — matchs en cours, tables live, tournois actifs, files matchmaking.
4. **Gérer les utilisateurs** — consulter profils, ajuster solde wallet, bannir, modifier rôle.
5. **Gérer les équipes** — consulter, dissoudre, modifier membres.
6. **Gérer les codes promo** — créer, activer/désactiver, consulter utilisations.
7. **Consulter l'historique des parties** — filtrer par mode/kind/joueur, replay.
8. **Configurer le serveur** — paramètres économie, maintenance mode.

Le back office **ne joue pas** — il consulte, configure, publie. Toute la logique
métier est côté serveur de jeu.

---

## 2. ARCHITECTURE

### 2.1 Recommandation stack

```
Back Office ← React (Vite) + TailwindCSS + shadcn/ui
     │
     │ HTTPS (fetch, JWT Bearer)
     ▼
Serveur de jeu existant (Express + Mongoose + Socket.IO)
  Port API : 8882 (VPS) / 4000 (local)
  MongoDB : même base que le jeu
```

Le back office est une **SPA React** séparée, servie par Vite preview ou un
serveur statique (Caddy, Nginx). Il communique avec l'API existante du serveur
de jeu via les endpoints joueurs + les **nouveaux endpoints admin** à ajouter.

### 2.2 Ce qui existe déjà (board/)

Un squelette `board/` existe dans le repo avec :
- `board/server/` : mini API Express pour un board de tâches internes (login propre, JWT propre, MongoDB propre). **À IGNORER** — le back office doit utiliser l'API du SERVEUR DE JEU directement.
- `board/board.html` : proto statique.
- `board/tasks.json` : fichier de tâches.

**Décision** : le nouveau back office vivra dans `board/web/` (SPA React) et
communiquera avec le serveur de jeu (port 8882) — pas avec `board/server/`.

### 2.3 Authentification admin

Le serveur de jeu a un champ `User.role` visible dans le seed :
```
ameur  → owner (plein pouvoir)
hamid  → super
sofia  → admin
invite → user
zoe    → null (user standard)
```

**À ajouter côté serveur** : un middleware `requireAdmin` qui vérifie que
`User.role ∈ {owner, super, admin}`. Les endpoints admin ne seront accessibles
qu'aux utilisateurs avec ces rôles.

**Note** : le champ `role` N'EXISTE PAS encore comme champ Mongo dans `UserSchema`.
Les rôles sont assignés dans le seed mais jamais persistés. **Il faut l'ajouter** :

```typescript
// Dans user.model.ts, ajouter :
role: { type: String, enum: ['owner', 'super', 'admin', 'user', null], default: null, index: true },
banned: { type: Boolean, default: false, index: true },
banReason: { type: String, default: null },
bannedAt: { type: Date, default: null },
```

---

## 3. SERVEUR DE JEU — ENDPOINTS EXISTANTS UTILISABLES PAR LE BACK OFFICE

Tous les endpoints existants fonctionnent avec `Authorization: Bearer <jwt>`.
Le back office se connecte via un **login standard** (`POST /auth/login`), récupère
le JWT et l'utilise pour toutes les requêtes.

### 3.1 Auth
```
POST /auth/login              {username, password} → {token, user}
GET  /auth/me                 → {user} (profil complet)
```

### 3.2 Tournois (v14.12+)
```
GET    /tournaments                    Liste (auto-filtrée par level user, ?all=1 pour bypass)
GET    /tournaments?status=live        Filtre par statut
POST   /tournaments                    Créer (voir body complet ci-dessous)
GET    /tournaments/:id                Détail
GET    /tournaments/:id/bracket        Arbre bracket (LIVE/FINISHED seulement)
POST   /tournaments/:id/join           Inscription joueur
POST   /tournaments/:id/leave          Désinscription
POST   /tournaments/:id/publish        DRAFT → UPCOMING
POST   /tournaments/preview-economics  Aperçu rentabilité
```

**Body de création tournoi** :
```json
{
  "name": "Coupe des Héros",
  "format": "DUO_STEEL",                         // ou "HYBRID_ALLIANCE"
  "capacity": 16,                                // 4|8|16|32|64|128
  "entryFee": 100,
  "startAt": "2026-08-25T18:00:00Z",
  "description": "Bracket rapide 16 duos robots",
  "color": "#c99c3f",                            // hex CSS
  "icon": "♦",                                   // enseigne ou emoji
  "minLevel": 0,
  "maxLevel": null,                              // null = pas de plafond
  "prizesByPosition": [
    {"position": 1, "prize": 5000},
    {"position": 2, "prize": 2000},
    {"position": 3, "prize": 1000},              // 2 ex-æquo recevront chacun 1000
    {"position": 5, "prize": 400},               // 4 ex-æquo recevront chacun 400
    {"position": 9, "prize": 100}                // 8 ex-æquo recevront chacun 100
  ],
  "publishImmediately": false                    // true → UPCOMING direct
}
```

**Règle ex æquo** : dans un bracket élimination directe, capacity=16 → rangs
[1, 2, 3(×2), 5(×4), 9(×8)]. Pas de rang 4, 6, 7, 8.
Le back office DOIT proposer les positions valides selon la capacity choisie.

### 3.3 Matchs & Matchmaking
```
GET  /matches/mine                    Match en cours du joueur
GET  /matches/:id                     Détail match
GET  /matches/queues                  État des 3 files de matchmaking
POST /matches/enqueue                 Inscription à la file
POST /matches/cancel                  Annuler inscription
POST /matches/:id/live-table          Provisioner une table live
POST /matches/:id/run                 Lancer un match headless
```

### 3.4 Parties (Games / historique)
```
GET  /games                           Historique paginé (?scope=mine|public|team, ?page=N)
GET  /games?mode=competition          Filtre par mode (local|online|competition)
GET  /games?kind=hybride              Filtre par type feutre (hybride|acier|royal|local)
GET  /games/:id                       Détail partie (avec replay)
GET  /games/public                    Parties publiques
POST /games                           Sauvegarder une partie locale
POST /games/robots                    Simuler une partie 100% robots
```

### 3.5 Tables
```
GET  /tables                          Liste tables du joueur
GET  /tables/public-live?page=N       Tables publiques en cours (5/page)
GET  /tables/:id                      Détail table
POST /tables                          Créer table
POST /tables/:id/start                Lancer une table
POST /tables/:id/cancel               Annuler table
POST /tables/:id/leave                Quitter table
POST /tables/:id/seat                 Changer de siège
```

### 3.6 Équipes
```
GET    /teams                         Liste classées
GET    /teams/mine                    Mon équipe
GET    /teams/:id                     Détail (membres + rôles)
POST   /teams                         Créer
PUT    /teams/:id                     Modifier (nom, visibilité)
POST   /teams/:id/join                Rejoindre
POST   /teams/:id/leave               Quitter
DELETE /teams/:id/members/:userId     Expulser
PUT    /teams/:id/members/:userId/role Changer rôle
POST   /teams/:id/invite              Inviter
```

### 3.7 Utilisateurs
```
GET  /users/:id/profile               Profil public
GET  /users/search?q=xxx              Recherche par username
```

### 3.8 Wallet
```
GET  /wallet                          Solde + transactions (joueur connecté)
POST /wallet/claim                    Réclamer récompense quotidienne (500 ◆)
GET  /wallet/vip                      État VIP
POST /wallet/vip                      Acheter VIP
```

### 3.9 Codes promo
```
POST /promo/redeem                    {code: "111122223333"} → {tokens, balance}
```

### 3.10 Analytics
```
GET  /analytics/me                    Stats personnelles
GET  /analytics/robots/:id            Stats d'un robot
POST /analytics/rebuild               Recalculer le cube analytique
```

### 3.11 Robots & Cerveaux
```
GET    /robots                        Liste mes robots
POST   /robots                        Créer
PUT    /robots/:id                    Modifier
DELETE /robots/:id                    Supprimer
GET    /robots/:id                    Profil public robot
GET    /brains                        Liste mes cerveaux
POST   /brains                        Créer
GET    /brains/:id                    Détail
PUT    /brains/:id/versions/:v        Modifier version
POST   /brains/:id/versions           Ajouter version
PUT    /brains/:id/active/:v          Changer version active
POST   /brains/:id/clone              Cloner
DELETE /brains/:id                    Supprimer
```

---

## 4. ENDPOINTS ADMIN À CRÉER SUR LE SERVEUR DE JEU

Le back office a besoin de ces endpoints **qui n'existent pas encore**. Ils
doivent être ajoutés dans le serveur de jeu avec le préfixe `/admin/` et le
middleware `requireAdmin`.

### 4.1 Dashboard économie
```
GET /admin/economy/summary
→ {
  totalMatchRake: number,           // somme de tous les rakes matchs
  totalTournamentEntries: number,   // buy-ins collectés
  totalTournamentPrizes: number,    // prizes versés (négatif pour kydos)
  houseNet: number,                 // totalMatchRake + entries - prizes
  totalTokensInCirculation: number, // somme de tous les User.wallet.tokens
  totalUsersCount: number,
  activeUsersLast24h: number,
  activeUsersLast7d: number,
  gamesPlayedToday: number,
  matchesRunningNow: number,
  tournamentsLiveNow: number,
}
```

### 4.2 Utilisateurs admin
```
GET    /admin/users                    Liste paginée (?page, ?search, ?role, ?banned)
GET    /admin/users/:id                Détail complet (wallet, robots, équipe, games count)
PUT    /admin/users/:id/wallet         {action:'credit'|'debit', amount, reason}
POST   /admin/users/:id/ban            {reason} → bannir
POST   /admin/users/:id/unban          → débannir
PUT    /admin/users/:id/role            {role: 'admin'|'super'|'user'|null}
DELETE /admin/users/:id                 Supprimer compte complet (RGPD)
```

### 4.3 Équipes admin
```
GET    /admin/teams                    Liste paginée (?search, ?page)
GET    /admin/teams/:id                Détail complet (membres, points, parties)
PUT    /admin/teams/:id                Modifier (nom, visibilité, points)
DELETE /admin/teams/:id                Dissoudre (déréférence tous les membres)
DELETE /admin/teams/:id/members/:uid   Expulser en admin
```

### 4.4 Tournois admin (compléments)
```
PUT    /admin/tournaments/:id          Modifier (nom, description, color, icon, dates, prizes)
POST   /admin/tournaments/:id/start    Démarrer manuellement
POST   /admin/tournaments/:id/cancel   Annuler (rembourse tous les inscrits)
DELETE /admin/tournaments/:id          Supprimer
GET    /admin/tournaments/:id/logs     Journal des événements
```

### 4.5 Matchs admin
```
GET    /admin/matches                  Liste paginée (?status, ?format, ?page)
GET    /admin/matches/:id              Détail complet
POST   /admin/matches/:id/cancel       Annuler un match (rembourse les joueurs)
```

### 4.6 Tables admin
```
GET    /admin/tables                   Liste paginée (?status, ?kind, ?origin, ?page)
GET    /admin/tables/:id               Détail
POST   /admin/tables/:id/force-stop    Arrêter de force (fin anormale)
```

### 4.7 Parties admin
```
GET    /admin/games                    Liste paginée (?mode, ?kind, ?owner, ?date_from, ?date_to)
GET    /admin/games/:id                Détail + replay data
```

### 4.8 Codes promo admin
```
GET    /admin/promos                   Liste tous les codes (?active, ?expired)
POST   /admin/promos                   Créer {code, tokens, expiresAt, maxRedemptions, label}
PUT    /admin/promos/:id               Modifier (active, maxRedemptions, label, expiresAt)
DELETE /admin/promos/:id               Supprimer
GET    /admin/promos/:id/usage         Liste des utilisateurs qui l'ont utilisé
```

### 4.9 Comptabilité kydos
```
GET    /admin/house-transactions       Liste paginée (?kind, ?date_from, ?date_to, ?page)
GET    /admin/house-transactions/export?format=csv   Export CSV
```

### 4.10 Monitoring temps réel
```
GET    /admin/live/sockets             Nombre de sockets connectés
GET    /admin/live/queues              État des files matchmaking (taille par format)
GET    /admin/live/tables              Tables en status 'playing' (count + list)
GET    /admin/live/tournaments         Tournois LIVE (count + détails)
```

### 4.11 Configuration serveur
```
GET    /admin/config                   Config actuelle (économie, limites)
PUT    /admin/config                   Modifier (maintenance_mode, daily_reward, etc.)
```

---

## 5. MODÈLES DE DONNÉES — SCHÉMAS COMPLETS

Tous les modèles vivent dans MongoDB, base `belote`.

### 5.1 User
```
{
  _id, username (unique), email, passwordHash (bcrypt 10),
  role: 'owner'|'super'|'admin'|'user'|null,   // À AJOUTER
  banned: boolean,                               // À AJOUTER
  banReason: string|null,                        // À AJOUTER
  bannedAt: Date|null,                           // À AJOUTER
  team: ObjectId → Team,
  settings: { responseTimeMs, maxPlayTimeMs, defaultManches },
  rewardPoints: number,
  gamesPlayed: number,
  wallet: {
    tokens: number (≥ 0),
    lastClaimDay: string (YYYY-MM-DD),
    transactions: [{kind, amount, balance, game?, at}] (max 200)
  },
  activeSession: ObjectId → Session,
  favoriteRobot: ObjectId → Robot,
  vipExpiresAt: Date|null,
  createdAt, updatedAt
}
```

**Kinds transaction wallet** : `daily`, `game_stake`, `game_win`, `refund`, `promo`, `vip`.

### 5.2 Team
```
{
  _id, name (unique), owner: ObjectId → User, points: number,
  visibility: 'public'|'private',
  members: [{ user: ObjectId, role: 'owner'|'super'|'admin'|'user', joinedAt }],
  createdAt, updatedAt
}
```
Max 40 membres. Rôle d'équipe (pas le même que le rôle admin global).

### 5.3 Robot
```
{
  _id, name, owner: ObjectId → User,
  brain: ObjectId → Brain, activeBrainVersion: number,
  style: 'agressif'|'equilibre'|'defensif'|'bluffeur',
  config: { aggressivity, riskTaking, bluff, cardMemory } (0-100 chaque),
  avatar: { face, color },
  stats: { gamesPlayed, wins, losses, winRate, elo },
  createdAt, updatedAt
}
```

### 5.4 Brain
```
{
  _id, name, owner: ObjectId → User,
  versions: [{ version: number, config: {...}, createdAt }],
  activeVersion: number,
  createdAt, updatedAt
}
```

### 5.5 Match
```
{
  _id, format: 'DUO_STEEL'|'HYBRID_ALLIANCE'|'ROYAL_SQUARE',
  status: 'queued'|'pairing'|'running'|'finished'|'cancelled',
  participants: [{
    seat (0-3), userId, robotId, substituteRobotId,
    team: 'A'|'B', isHuman: boolean
  }],
  tournament: ObjectId|null, tournamentRound: number|null,
  game: ObjectId → Game, liveTableId: ObjectId → Table,
  winnerTeam: 'A'|'B'|null, scoreTeamA, scoreTeamB,
  queuedAt, finishedAt, createdAt, updatedAt
}
```

### 5.6 Tournament
```
{
  _id, name, format, status: 'draft'|'upcoming'|'live'|'finished',
  capacity: 4|8|16|32|64|128,
  description (500 max), color (hex), icon (enseigne),
  minLevel, maxLevel (null = pas de plafond),
  entryFee,
  rounds: [{round, prize}],                   // legacy
  prizesByPosition: [{position, prize}],       // v14.12 (standard)
  startAt, createdBy: ObjectId → User,
  participants: [{
    userId, robotIds[], substituteRobotId,
    seedIndex, eliminatedAtRound,
    finalPosition, prizeAwarded, joinedAt
  }],
  bracket: [[ObjectId]] (legacy),
  bracketTree: {                              // v14.12 (arbre persistant)
    rounds: [{
      roundIndex (1-based), label,
      matches: [{
        matchIndex, matchId, gameId,
        slotA: {userId, seedIndex, displayName},
        slotB: {userId, seedIndex, displayName},
        winner: 'A'|'B'|null, scoreA, scoreB,
        startedAt, finishedAt,
        nextMatchIndex, nextSlot: 'A'|'B'
      }]
    }],
    builtAt, lastCompletedRound
  },
  winners: [ObjectId] (top 3),
  startedAt, finishedAt, createdAt, updatedAt
}
```

### 5.7 Game
```
{
  _id, participants: [{seatIndex, team, type, user, robot, name, wasSubstitute}],
  manches: [{number, target, winner, scoreTeamA, scoreTeamB}],
  stats: {totalDonnes, totalTricksA/B, contres, capots, belotes, ...},
  table, session, owner, team,
  visibility: 'public'|'private'|'team',
  mode: 'local'|'online'|'competition',
  kind: 'hybride'|'acier'|'royal'|'local',
  target, winner, scoreTeamA, scoreTeamB,
  replay: ObjectId → GameReplay,
  createdAt, updatedAt
}
```

### 5.8 Table
```
{
  _id, status: 'lobby'|'playing'|'finished'|'draft',
  kind: 'hybride'|'acier'|'royal',
  origin: 'user'|'match'|'tournament',         // v14.11
  owner, ownerType: 'user'|'team',
  visibility: 'public'|'private',
  seats: [{index, kind, name, team, userId, robotId, ownerId}],
  config: {manches, maxPlayers, allowSpectators, turnTimeoutMs},
  startsAt, lastActivityAt, createdAt, updatedAt
}
```

### 5.9 HouseTransaction
```
{
  _id, kind: 'match_rake'|'tournament_entry'|'tournament_prize',
  amount: number (signé : + kydos gagne, − kydos perd),
  matchId, tournamentId, round, userId, note,
  createdAt, updatedAt
}
```

### 5.10 PromoCode
```
{
  _id, code: string (12 chiffres), tokens: number,
  expiresAt: Date, maxRedemptions: number,
  redeemedBy: [ObjectId → User], active: boolean, label: string,
  createdAt, updatedAt
}
```

### 5.11 Invitation
```
{
  _id, from: ObjectId → User, to: ObjectId → User, team: ObjectId → Team,
  status: 'pending'|'accepted'|'declined'|'cancelled',
  createdAt, updatedAt
}
```

### 5.12 ParticipationFact (analytics, CQRS read model)
```
{
  _id, game, participantType, user, robot, seatIndex, team,
  mancheNumber, donneNumber, trump, contract, contre,
  wasBidder, wasSubstitute, pointsTeam, pointsOpponent, ...
}
```

---

## 6. ÉCONOMIE DU JEU (chiffres exacts)

### 6.1 Match rapide — 3 formats (source unique : matchFormat.ts)

| Format | Effectif | Buy-in/joueur | Gain vainqueur | Rake kydos | Headless |
|---|---|---|---|---|---|
| DUO_STEEL | 2 humains × 2 robots | 200 ◆ | 150 ◆ | 50 ◆ | Oui |
| HYBRID_ALLIANCE | 2 humains + 2 robots | 150 ◆ | 225 ◆ | 75 ◆ | Non |
| ROYAL_SQUARE | 4 humains, 0 robots | 100 ◆ | 150 ◆ × 2 | 100 ◆ | Non |

### 6.2 Tournois — positions ex æquo (chiffres d'exemple capacity=16, entryFee=100)

```
Total collecté : 16 × 100 = 1 600 ◆
Distribué :
  1er : 1 × 500 = 500
  2ᵉ  : 1 × 200 = 200
  3ᵉ  : 2 × 100 = 200   (perdants demi-finale, EX ÆQUO)
  5ᵉ  : 4 × 40  = 160   (perdants quart)
  9ᵉ  : 8 × 10  = 80    (perdants huitième)
Total payé : 1 140 ◆
Gain kydos : 460 ◆
```

### 6.3 Récompenses quotidiennes
- Reward daily : 500 ◆ par jour, 1 claim par jour calendaire UTC.
- Code promo : montant variable, 1 utilisation par user par code.

### 6.4 VIP
- Achat VIP : configurable côté serveur.
- VIP donne accès à des fonctionnalités premium (emojis, priorité file).

---

## 7. CONNEXION AU SERVEUR

### 7.1 VPS de production
```
IP : 217.160.186.250
Port API : 8882
Port mobile : 8881
```

### 7.2 Utilisateurs seed pour les tests
```
ameur   / belote123  (owner, 5000 ◆)
hamid   / belote123  (super, 3200 ◆)
sofia   / belote123  (admin, 2100 ◆)
invite  / belote123  (user, 900 ◆)
zoe     / belote123  (user, 500 ◆)
```

### 7.3 Codes promo seed
```
1111-2222-3333 → 500 ◆
4444-5555-6666 → 2000 ◆
9999-8888-7777 → 10000 ◆
```

---

## 8. PAGES DU BACK OFFICE À CONSTRUIRE

### 8.1 Dashboard
- Résumé économie (houseNet, tokens en circulation)
- Compteurs live (matchs en cours, tournois live, tables actives, sockets)
- Graphiques : revenus par jour (7 derniers jours), parties par jour
- Alertes si houseNet négatif sur un tournoi

### 8.2 Tournois
- **Liste** : tableau paginé (nom, format, statut, capacity, inscrits/max, entryFee, startAt)
- **Filtre** : par statut (draft/upcoming/live/finished), format
- **Créer** : formulaire avec tous les champs (capacity → propose les positions valides)
  - Preview économie en temps réel (appel /tournaments/preview-economics)
  - Sélecteur de positions valides selon capacity
  - Couleur picker + icône enseigne
- **Détail** :
  - Header avec nom, statut, dates, format, capacity
  - Liste inscrits avec wallet, robots, seed
  - **Arbre bracket** (vue coupe du monde si LIVE ou FINISHED) :
    - Colonnes rounds, cartes matchs, connecteurs SVG/CSS
    - Score, gagnant highlight
    - Click → détail match/partie
  - Boutons : Publier (DRAFT→UPCOMING), Démarrer (UPCOMING→LIVE), Annuler
- **Économie du tournoi** : breakdown par position, collect/paid/net

### 8.3 Matchs
- **Liste** : paginée, filtrée par status/format
- **Détail** : participants, scores, lien vers la partie archivée
- Action : annuler un match en cours

### 8.4 Parties (historique)
- **Liste** : paginée, filtres croisés mode × kind × date
- **Détail** : scores manches, stats, participants, lien replay
- Export CSV (date, joueurs, scores, format, kind, mode)

### 8.5 Utilisateurs
- **Liste** : paginée, recherche par username/email
- **Profil** : username, email, rôle, solde wallet, VIP, équipe, robots count, games count
- **Actions** :
  - Ajuster wallet (credit/debit + raison textuelle)
  - Bannir / débannir
  - Changer rôle (owner/super/admin/user)
  - Supprimer compte (RGPD)
- **Historique wallet** : 50 dernières transactions

### 8.6 Équipes
- **Liste** : paginée, recherche par nom
- **Détail** : membres avec rôles, points, games count
- **Actions** : dissoudre, expulser membre, renommer

### 8.7 Codes promo
- **Liste** : paginée, filtre actif/expiré
- **Créer** : code (12 chiffres), tokens, expiration, max utilisations, label
- **Détail** : liste des utilisateurs qui l'ont utilisé
- **Actions** : activer/désactiver, modifier

### 8.8 Comptabilité kydos
- **Liste transactions** : paginée, filtrable (match_rake / tournament_entry / tournament_prize)
- **Agrégats** : total par kind, total net kydos
- Export CSV

### 8.9 Monitoring live
- Nombre de sockets connectés
- État des 3 files matchmaking (taille par format)
- Tables en statut 'playing' (liste compacte)
- Tournois LIVE (avec progression rounds)
- Auto-refresh toutes les 5s (poll ou WebSocket)

---

## 9. RÈGLES MÉTIER IMPORTANTES

### 9.1 Positions finales tournoi (ex æquo)
- Capacity 4 → rangs [1, 2, 3(×2)]
- Capacity 8 → [1, 2, 3(×2), 5(×4)]
- Capacity 16 → [1, 2, 3(×2), 5(×4), 9(×8)]
- Capacity 32 → + 17(×16)
- Capacity 64 → + 33(×32)
- Capacity 128 → + 65(×64)
- **Formule** : perdants au round R → rang = capacity / 2^R + 1

### 9.2 Lifecycle tournoi
```
DRAFT → UPCOMING (via publish) → LIVE (via start ou auto quand startAt atteint)
  ↓                                    ↓
  (cancel → rembourse)             FINISHED (auto quand finale jouée)
```
- Inscription possible seulement en UPCOMING.
- Désinscription possible seulement en UPCOMING (remboursement complet).
- ROYAL_SQUARE refusé en tournoi (v14.12).

### 9.3 Contrainte 1 robot / 1 tournoi / 1 jour
Un robot ne peut participer qu'à UN seul tournoi par jour calendaire UTC.
Collection `TournamentRobotDayLock` avec index unique `{robotId, dayKey}`.

### 9.4 Substitute robot
Formats HYBRID_ALLIANCE et ROYAL_SQUARE exigent un robot remplaçant. La
convention d'inscription est : `robotIds = [coéquipier(s)..., remplaçant]`
(le dernier est le substitute).

### 9.5 Table.origin
- `user` : partie libre créée par un joueur
- `match` : table éphémère créée par matchLiveService pour un match compétition
- `tournament` : table créée pour un match de tournoi
Impact : les tables match/tournament sont marquées `mode: 'competition'` dans
l'historique et exclues des lobbies publics.

### 9.6 Wallet
- Jamais négatif.
- Max 200 transactions stockées (FIFO tronqué).
- Opérations NON transactionnelles (pas de session Mongo) — prévu en v14.15.

---

## 10. CONTRAINTES TECHNIQUES

### 10.1 CORS
Le serveur de jeu autorise les origines listées dans `CORS_ORIGIN`.
Pour le back office, ajouter l'origine (ex. `http://localhost:5200`) dans
la variable d'environnement.

### 10.2 JWT
- Émis par `POST /auth/login`.
- Durée : 7 jours (le back office devra gérer le renouvellement).
- Header : `Authorization: Bearer <token>`.
- Payload : `{userId: string}`.

### 10.3 Pagination
La plupart des listes renvoient :
```json
{
  "items": [...],
  "page": 1,
  "pageSize": 15,
  "total": 42,
  "totalPages": 3
}
```
Certains endpoints (anciens) renvoient directement un tableau sans pagination.
Les endpoints admin DOIVENT tous être paginés.

### 10.4 Erreurs
Format standard :
```json
{
  "status": 400,
  "message": "Nom trop court.",
  "error": "Bad Request"
}
```

---

## 11. FICHIERS À MODIFIER SUR LE SERVEUR DE JEU

Pour que le back office fonctionne, un développeur doit ajouter au serveur :

### 11.1 `server/src/modules/user/user.model.ts`
Ajouter les champs `role`, `banned`, `banReason`, `bannedAt` dans le UserSchema.
Mettre à jour le seed pour persister les rôles.

### 11.2 `server/src/shared/adminAuth.ts` (nouveau)
Middleware Express `requireAdmin` :
```typescript
export function requireAdmin(req, res, next) {
  // Vérifie que req.userId a un rôle admin
  // Lit User.role en base (ou cache 60s)
  // Si role ∉ {owner, super, admin} → 403
}
```

### 11.3 `server/src/modules/admin/` (nouveau module)
Créer :
- `admin.controller.ts` — tous les handlers admin
- `admin.routes.ts` — toutes les routes `/admin/*`
- `admin.service.ts` — logique métier admin (ban, ajust wallet, stats agrégées)

### 11.4 `server/src/app.ts`
Monter le router admin :
```typescript
import { adminRouter } from './modules/admin/admin.routes.js';
application.use(adminRouter);
```

### 11.5 `server/src/seed.ts`
Persister `role` sur les utilisateurs seed.

---

## 12. DESIGN UX

### Style
- Thème sombre (cohérent avec le jeu) ou thème clair pro (au choix).
- shadcn/ui recommandé pour les composants.
- Palette : or `#e6c46a`, vert `#7ecb98`, bleu `#7ea8e0`, rouge `#e85d70`.

### Navigation
Sidebar permanente :
```
Dashboard
Tournois
Matchs
Parties
Utilisateurs
Équipes
Codes promo
Comptabilité
Monitoring
Config
```

### Responsive
Desktop-first (le back office est principalement utilisé sur desktop). Tablet
supporté pour le monitoring en astreinte.

---

## 13. LIVRABLES ATTENDUS

1. **SPA React** dans `board/web/` (Vite + React + Tailwind + shadcn/ui).
2. **Module admin serveur** dans `server/src/modules/admin/` avec tous les
   endpoints listés en §4.
3. **Middleware requireAdmin** dans `server/src/shared/adminAuth.ts`.
4. **User.role + banned** : migration du modèle User + seed.
5. **Collection Postman** `docs/api/kydos-backoffice.postman_collection.json`
   avec tous les endpoints admin.
6. **Tests** :
   - Tests unitaires pour `admin.service.ts` (au minimum : ban/unban, wallet adjust, economy summary).
   - Tests d'intégration si Mongo disponible.
7. **README** dans `board/web/README.md` avec instructions de lancement.
8. **Variables d'environnement** : le back office doit lire `VITE_API_URL`
   (défaut `http://localhost:4000`).

---

## 14. CE QU'IL NE FAUT PAS FAIRE

- Ne **PAS** créer un serveur séparé pour le back office — tout passe par l'API de jeu existante.
- Ne **PAS** toucher au code du moteur belote (`packages/core/`).
- Ne **PAS** modifier les endpoints joueur existants — juste en ajouter.
- Ne **PAS** dupliquer les modèles Mongoose (les importer depuis le serveur de jeu).
- Ne **PAS** stocker de secrets dans le code front.
- Ne **PAS** rendre les endpoints admin accessibles sans `requireAdmin`.

---

*Fin du spec. Document exhaustif pour construire le back office complet de Kýdos Belote.*
