# Back Office — Guide de construction

> **Public** : équipe / IA qui construira le back office admin de Kýdos Belote.
> Contient toutes les informations nécessaires pour construire une interface
> d'administration complète sans avoir à explorer le code source.

## Objectif

Le back office est une application web séparée (Express + JWT + React
recommandé) qui permet à l'équipe kydos de :

1. **Gérer les tournois** — créer, éditer, publier, annuler.
2. **Suivre l'économie** — dashboard des gains/pertes kydos.
3. **Surveiller le serveur** — sessions en cours, matchs, tournois live.
4. **Modérer les utilisateurs** — comptes, robots, historiques, codes promo.

Le back office **ne joue pas** — il consulte, configure, publie. Toute la
logique métier est déjà côté serveur.

## Architecture recommandée

```
back-office/
├─ server/          Express (5 routes admin, réutilise les modèles Mongoose)
│   ├─ auth/        JWT admin distinct des joueurs
│   ├─ tournaments/ CRUD tournois
│   ├─ users/       Gestion joueurs et robots
│   ├─ accounting/  Reporting HouseTransaction
│   └─ monitor/     Socket.IO namespace /admin
└─ web/             React + Tailwind
    ├─ pages/       login, dashboard, tournois, users, accounting
    └─ components/  Tables, formulaires, graphiques
```

Le back office pointe vers **la même base MongoDB** que le serveur de jeu.
Cela évite toute duplication : ce qu'on saisit dans le back apparaît
immédiatement pour les joueurs.

## Base MongoDB — collections utilisées

Toutes ces collections existent déjà dans la base `beloteKydosV14`. Les
modèles Mongoose sont dans `server/src/modules/*/`.

### Users

Collection `users`. Modèle : `user.model.ts`.

```ts
{
  _id: ObjectId,
  username: string,             // unique, indexé
  passwordHash: string,          // bcrypt
  email: string,
  rewardPoints: number,          // solde en jetons ◆
  vipUntil: Date | null,
  role: 'user' | 'admin',        // ← pour le back office
  activeSession: ObjectId | null, // table en cours
  gamesPlayed: number,
  team: ObjectId | null,
  createdAt, updatedAt
}
```

**Créer un admin** :
```js
await UserModel.updateOne({ username: 'ameur' }, { $set: { role: 'admin' } });
```

### Robots

Collection `robots`. Modèle : `robot.model.ts`.

```ts
{
  _id: ObjectId,
  owner: ObjectId,               // ref User
  name: string,
  avatarId: string,
  mobile: {
    avatarId: string,
    strategy: { aggro, risk, bluff, memoire }  // 0..100 chacun
  },
  elo: number,                   // classement, défaut 1000
  representativeSlot: 0|1|2|3,   // slot titulaire (max 1 par owner)
  createdAt, updatedAt
}
```

### Games (parties archivées)

Collection `games`. Modèle : `game.model.ts`.

```ts
{
  _id: ObjectId,
  owner: ObjectId | null,
  table: ObjectId | null,
  visibility: 'public' | 'private' | 'unlisted',
  mode: 'friendly' | 'competition' | 'tournament',
  participants: Array<{ seat, type: 'human'|'robot', userId?, robotId? }>,
  scoreA: number, scoreB: number,
  winner: 'A' | 'B' | null,
  replay: { manches: Array<{ donnes, cumulative, ... }> },
  logs: Array<{ time, kind, message }>,
  createdAt, finishedAt
}
```

### Matches (v14+)

Collection `matches`. Modèle : `matches/match.model.ts`.

```ts
{
  _id: ObjectId,
  format: 'duo_steel' | 'hybrid_alliance' | 'royal_square',
  status: 'queued' | 'pairing' | 'running' | 'finished' | 'cancelled',
  participants: Array<{ seat, userId, robotId?, team: 'A'|'B', isHuman }>,
  tournament: ObjectId | null,   // ref Tournament si match de tournoi
  tournamentRound: number | null,
  game: ObjectId | null,         // ref Game archivée à la fin
  winnerTeam: 'A' | 'B' | null,
  scoreTeamA: number, scoreTeamB: number,
  queuedAt, startedAt, finishedAt
}
```

### Tournaments (v14.1+)

Collection `tournaments`. Modèle : `tournaments/tournament.model.ts`.

```ts
{
  _id: ObjectId,
  name: string,
  format: 'duo_steel' | 'hybrid_alliance' | 'royal_square',
  status: 'draft' | 'upcoming' | 'live' | 'finished',
  capacity: 4 | 8 | 16 | 32 | 64 | 128,     // enum TOURNAMENT_CAPACITIES
  minLevel: number,
  entryFee: number,              // buy-in en ◆
  rounds: Array<{ round: number, prize: number }>,
  startAt: Date,
  participants: Array<{
    userId, robotIds: ObjectId[],
    seedIndex: number | null,
    eliminatedAtRound: number | null,
    joinedAt: Date
  }>,
  bracket: Array<Array<ObjectId>>,   // bracket[round-1] = Match[]
  winners: ObjectId[],               // top 3 final
  createdBy: ObjectId,
  startedAt, finishedAt, createdAt, updatedAt
}
```

### TournamentRobotDayLock

Collection `tournamentrobotdaylocks`. Index unique `{robotId, dayKey}`.
Verrouille un robot pour un jour donné.

```ts
{
  robotId: ObjectId,
  dayKey: string,             // 'YYYY-MM-DD' UTC
  tournamentId: ObjectId,
  userId: ObjectId,
  createdAt, updatedAt
}
```

**Le back office ne devrait jamais toucher directement à cette collection**
— la contrainte est enforced par l'index unique et gérée par le service.

### HouseTransaction (comptabilité)

Collection `housetransactions`. Modèle : `houseAccounting/houseTransaction.model.ts`.

```ts
{
  _id: ObjectId,
  kind: 'match_rake' | 'tournament_entry' | 'tournament_prize',
  amount: number,             // SIGNÉ : + kydos gagne, − kydos perd
  matchId: ObjectId | null,
  tournamentId: ObjectId | null,
  round: number | null,
  userId: ObjectId | null,
  note: string,
  createdAt, updatedAt
}
```

### PromoCode

Collection `promocodes`. Modèle : `promo/promo.model.ts`.

```ts
{
  _id: ObjectId,
  code: string,               // ex. "1111-2222-3333"
  value: number,              // ◆ crédités
  maxUses: number,
  usedBy: ObjectId[],
  expiresAt: Date | null,
  createdAt
}
```

---

## Constantes centralisées à réutiliser

### Formats de match

Source : `server/src/modules/matches/matchFormat.ts`

```ts
enum MatchFormat {
  DUO_STEEL = 'duo_steel',
  HYBRID_ALLIANCE = 'hybrid_alliance',
  ROYAL_SQUARE = 'royal_square',
}

MATCH_FORMAT_CATALOG[format] = {
  buyInPerPlayer, prizePerWinner,
  humansPerMatch, robotsPerMatch, robotsPerPlayer, seatsTotal,
  winnersPerMatch, houseRake, isHeadless,
  label, description
}
```

Le back office affiche `label` et `description` dans les listes déroulantes,
et lit `buyInPerPlayer` etc. pour pré-remplir les formulaires.

### Capacités de tournoi

```ts
TOURNAMENT_CAPACITIES = [4, 8, 16, 32, 64, 128]
```

### Statuts

```ts
TournamentStatus = { DRAFT, UPCOMING, LIVE, FINISHED }
MatchStatus     = { QUEUED, PAIRING, RUNNING, FINISHED, CANCELLED }
HouseTransactionKind = { MATCH_RAKE, TOURNAMENT_ENTRY, TOURNAMENT_PRIZE }
```

---

## Fonctions serveur à réutiliser (import direct)

Le back office peut importer ces fonctions **sans dupliquer la logique** :

### `tournamentEconomics(input)`

Source : `server/src/modules/tournaments/economics.ts`

Fonction pure qui calcule la rentabilité d'un tournoi.

```ts
const { totalCollected, totalPaid, houseNet, breakdown } =
  tournamentEconomics({
    capacity: 16,
    entryFee: 1000,
    rounds: [{ round: 5, prize: 1500 }, ...]
  });

// Le back office affiche houseNet en temps réel pendant la saisie.
// Si houseNet < 0 → afficher un warning avant "Publier".
```

### `tournamentService.startNow(id, admin)`

Passe un tournoi manuellement en LIVE (avant `startAt`).

### `tournamentService.markFinished(id, winnerIds)`

Force la fin d'un tournoi (usage exceptionnel — annulation).

### `matchmakingService.queueSizes()`

Renvoie la taille de chaque file d'attente pour le monitoring.

### `houseAccountingService.totalByKind(kind?)`

Total agrégé signé sur une période / un type.

---

## Endpoints admin à créer

Le back office expose ses propres endpoints, distincts de ceux consommés
par le mobile. Ils partagent la même authentification JWT mais vérifient
`user.role === 'admin'` via un middleware `requireAdmin`.

### `POST /admin/auth/login`

Login admin. Vérifie `role === 'admin'` sinon renvoie 403.

### `GET /admin/tournaments?status=all|draft|upcoming|live|finished`

Liste **tous** les tournois (drafts inclus, contrairement à l'endpoint joueur).

### `POST /admin/tournaments`

Crée un tournoi en `DRAFT`.

**Request** :
```json
{
  "name": "Grand Prix des IA",
  "format": "duo_steel",
  "capacity": 16,
  "entryFee": 1000,
  "minLevel": 0,
  "rounds": [{ "round": 5, "prize": 1500 }],
  "startAt": "2026-08-15T14:00:00.000Z"
}
```

Doit valider avant insertion :
- `capacity` dans `TOURNAMENT_CAPACITIES`.
- `format` dans `MatchFormat`.
- `rounds[*].round` dans [1..log2(capacity)+1].
- `startAt` dans le futur.
- Appeler `tournamentEconomics()` : si `houseNet < 0`, exiger un flag
  `acceptLoss: true` dans la requête.

### `PUT /admin/tournaments/:id`

Édite un tournoi. **Autorisé uniquement en `DRAFT`** — sinon 400.

### `POST /admin/tournaments/:id/publish`

Passe `DRAFT` → `UPCOMING`. Vérifie `startAt` dans le futur.

### `POST /admin/tournaments/:id/cancel`

Annule un tournoi (`UPCOMING` uniquement) : rembourse tous les
participants et libère les verrous robots/jour.

**Pseudo-code** :
```ts
for (const p of tournament.participants) {
  await walletService.credit(p.userId, tournament.entryFee, null, 'refund');
  await TournamentRobotDayLockModel.deleteMany({
    robotId: { $in: p.robotIds },
    dayKey: dayKeyUTC(tournament.startAt),
    tournamentId: tournament._id,
  });
  await houseAccountingService.recordTournamentEntry(
    tournament._id, p.userId, -tournament.entryFee
  );
}
tournament.status = 'cancelled';   // ← ajouter ce statut si besoin
await tournament.save();
```

### `GET /admin/accounting/summary?from=&to=`

Résumé de la comptabilité kydos sur une période.

**Response** :
```json
{
  "period": { "from": "...", "to": "..." },
  "totals": {
    "matchRake": 1250,
    "tournamentEntries": 48000,
    "tournamentPrizes": -32500,
    "net": 16750
  },
  "byDay": [
    { "date": "2026-08-01", "matchRake": 250, "tournamentNet": 3400 },
    ...
  ]
}
```

### `GET /admin/monitor/snapshot`

Snapshot temps réel du serveur (compte total users, matchs actifs,
tournois live, files d'attente).

### `WebSocket namespace /admin`

Réservé aux comptes admin. Événements :
- `monitor:snapshot` — à la connexion.
- `monitor:log` — logs live.
- `monitor:sessions` — snapshot des tables + matchs live toutes les 2s.

Voir `websocket-reference.md` § Monitoring.

---

## Pages du back office (recommandations UI)

### `/login`

Formulaire simple. Redirige vers `/dashboard` si succès.

### `/dashboard`

Vue d'ensemble avec :
- Nombre de joueurs connectés (temps réel via socket).
- Nombre de matchs en cours par format.
- Nombre de tournois LIVE.
- Graphique du `houseNet` sur 30 jours.
- Alertes actives (tournoi UPCOMING dans <2h, tournoi FINISHED à archiver).

### `/tournaments`

Liste avec filtres par statut. Chaque ligne :
- Nom · Format · Capacité · Buy-in · Statut · Date de début · Participants.
- Actions selon statut :
  - `DRAFT` → **Éditer**, **Publier**, **Supprimer**.
  - `UPCOMING` → **Consulter**, **Annuler**.
  - `LIVE` → **Consulter**, **Forcer la fin**.
  - `FINISHED` → **Consulter**, **Voir replays**.

### `/tournaments/new`

Formulaire de création avec :
- Champs de base (nom, format, capacité).
- Grille des rounds (générée automatiquement selon capacité) : chaque
  round a un input `prize`.
- **Panneau de rentabilité en direct** à droite :
  - Total collecté, total payé, gain kydos net.
  - Warning rouge si `houseNet < 0`.
- Boutons **Enregistrer en brouillon** et **Publier maintenant**.

L'aperçu de rentabilité utilise l'endpoint `POST /tournaments/preview-economics`
côté serveur (déjà exposé), qui appelle `tournamentEconomics()`.

### `/tournaments/:id`

Vue détaillée avec :
- Bandeau statut avec CTA contextuel.
- Info panel (paramètres, gains par round, économie).
- Liste des participants avec leur position, robots, historique.
- Bracket visuel (si LIVE ou FINISHED).
- Comptabilité liée (entries + prizes) filtrable.

### `/users`

Liste des joueurs paginée. Recherche par nom. Filtres :
- VIP / Non VIP.
- Actif dans les 30 derniers jours.
- Solde > X ◆.

Chaque ligne cliquable → fiche joueur avec :
- Solde, VIP, statistiques.
- Robots.
- Historique de parties.
- Historique wallet (crédits/débits).
- Actions : **Crédit manuel** (bug/geste commercial), **Bannir**, **Reset password**.

### `/promos`

CRUD codes promo. Chaque code : valeur ◆, usages, max, expiration.

### `/accounting`

Rapport économique complet :
- Sélecteur de période.
- Graphiques : recettes vs paiements par jour.
- Table exportable (CSV) de toutes les `HouseTransaction`.
- Total kydos sur la période.

### `/monitor`

Panneau temps réel :
- Tables ouvertes avec état.
- Matchs en cours.
- Files d'attente (Duo/Alliance/Carrée).
- Flux de logs live avec filtres par niveau.

---

## Sécurité

- **JWT admin séparé** avec expiration courte (4h par exemple).
- **Middleware `requireAdmin`** sur toutes les routes `/admin/*` :
  ```ts
  export const requireAdmin: RequestHandler = async (req, res, next) => {
    const user = await UserModel.findById(req.userId).select('role').lean();
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
    next();
  };
  ```
- **Rate limit strict** : 30 req/min par admin.
- **Audit log** : chaque action admin est loguée dans une collection
  `adminAuditLog` avec `{ adminId, action, targetId, before, after, at }`.
- **HTTPS obligatoire en production** (le back office traite des données
  financières).

---

## Points d'attention métier

### Modification d'un tournoi

- **`DRAFT`** — tout est modifiable.
- **`UPCOMING`** — bloqué. Si un tournoi a déjà des inscrits, une
  modification serait un abus de confiance envers les joueurs. Pour
  changer les paramètres, il faut d'abord annuler (rembourse tout le monde)
  puis créer un nouveau tournoi.
- **`LIVE`** — impossible.
- **`FINISHED`** — seul le nom peut être édité pour clarté d'historique.

### Rentabilité négative

Si un tournoi affiche `houseNet < 0`, le back office doit :
1. Afficher un warning rouge très visible.
2. Exiger une confirmation explicite avec case à cocher « Je comprends
   que ce tournoi coûtera X ◆ à kydos ».
3. Loguer l'action dans `adminAuditLog` avec la raison.

### Verrous robots/jour

Le back office **ne doit pas** manipuler `TournamentRobotDayLock`
manuellement. Les seuls chemins autorisés sont via `tournamentService.join`
et `.leave` qui gèrent atomiquement pose et libération.

### Codes promo

Les codes 1111-2222-3333, 4444-5555-6666, 9999-8888-7777 sont créés par
le seed pour la démo. En production, générer des codes aléatoires
(8+ caractères) et logger chaque utilisation.

---

## Setup rapide (mise en route)

```bash
# 1. Cloner ce projet (accès aux modèles Mongoose)
git clone <projet-belote>
cd belote

# 2. Créer le back office à côté
mkdir back-office && cd back-office
npm init -y
npm install express mongoose bcrypt jsonwebtoken cors socket.io
npm install -D typescript tsx @types/express

# 3. Réutiliser les modèles Mongoose du serveur belote
# Dans back-office/server/tsconfig.json, ajouter :
{
  "compilerOptions": {
    "paths": { "@belote/*": ["../belote/server/src/*"] }
  }
}

# 4. Créer un premier endpoint
cat > back-office/server/src/index.ts <<'EOF'
import express from 'express';
import mongoose from 'mongoose';
import { TournamentModel } from '@belote/modules/tournaments/tournament.model';

await mongoose.connect(process.env.MONGO_URI!);
const app = express();
app.get('/admin/tournaments', async (req, res) => {
  const t = await TournamentModel.find({}).sort({ startAt: -1 }).lean();
  res.json({ tournaments: t });
});
app.listen(3001);
EOF
```

Une fois ces bases posées, itérer page par page. Chaque page consomme des
endpoints admin dédiés qui délèguent à `tournamentService`, `walletService`,
`houseAccountingService` etc.

---

## Ressources complémentaires

- `docs/api-reference.md` — surface REST joueur (à consulter pour éviter
  les collisions et comprendre ce que voit le mobile).
- `docs/websocket-reference.md` — événements socket.
- `docs/matches-tournaments.md` — architecture technique v14 côté serveur.
- `docs/competitions-fonctionnel.md` — vision fonctionnelle joueur.
- `docs/session-cache.md` — mécanique du cache mobile (utile pour
  comprendre les événements que le back office peut émettre pour
  rafraîchir les mobiles).

Le back office peut être développé de manière incrémentale : commencer par
la liste des tournois + le formulaire de création, puis ajouter les autres
pages selon les priorités opérationnelles.

---

# Nouveautés v14.11 → v14.14 — endpoints et modèle

## Endpoints tournois enrichis (v14.12/13)

### Créer un tournoi
```
POST /tournaments
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Coupe des Héros",
  "format": "DUO_STEEL",
  "capacity": 16,
  "entryFee": 100,
  "startAt": "2026-08-20T18:00:00Z",
  "description": "Bracket rapide 16 duos robots. Ex æquo pour les demi.",
  "color": "#c99c3f",
  "icon": "♦",
  "minLevel": 0,
  "maxLevel": null,
  "prizesByPosition": [
    { "position": 1, "prize": 500 },
    { "position": 2, "prize": 200 },
    { "position": 3, "prize": 100 },
    { "position": 5, "prize": 40 },
    { "position": 9, "prize": 10 }
  ],
  "publishImmediately": false
}
→ 200 { "tournamentId": "..." }
```

`publishImmediately: false` → statut **DRAFT** (invisible aux joueurs).
`publishImmediately: true` → statut **UPCOMING** direct (inscriptions ouvertes).

**Validations serveur** (retour 400 avec message clair) :
- `name` ≥ 3 caractères.
- `capacity` ∈ {4, 8, 16, 32, 64, 128}.
- `entryFee` ≥ 0.
- `startAt` dans le futur (tolérance 60 s).
- `format` connu ; **ROYAL_SQUARE refusé en tournoi** (arrive en v14.15).
- `maxLevel` ≥ `minLevel` si les deux fournis.

### Publier un draft
```
POST /tournaments/:id/publish
→ 200 { "published": true }
```
Seul le créateur peut publier. DRAFT → UPCOMING.

### Consulter le bracket en direct ou en fin
```
GET /tournaments/:id/bracket
→ 200 {
  tournamentId, name, format, capacity, status, color, icon,
  bracket: {
    rounds: [
      {
        roundIndex: 1,
        label: "8es de finale",
        matches: [
          {
            matchIndex: 0,
            matchId, gameId,
            slotA: { userId, seedIndex, displayName },
            slotB: { ... },
            winner: 'A' | 'B' | null,
            scoreA, scoreB,
            startedAt, finishedAt
          }, ...
        ]
      }, ...
    ],
    lastCompletedRound: 2,
    builtAt: "..."
  },
  participants: [...],
  winners: ["userId1", "userId2", "userId3"]
}
```
- 400 si statut UPCOMING (aucun bracket construit).
- 404 si DRAFT et non-créateur.

### Aperçu économie
```
POST /tournaments/preview-economics
{
  "capacity": 16,
  "entryFee": 100,
  "prizesByPosition": [
    { "position": 1, "prize": 500 },
    { "position": 2, "prize": 200 },
    { "position": 3, "prize": 100 },
    { "position": 5, "prize": 40 },
    { "position": 9, "prize": 10 }
  ]
}
→ 200 {
  "economics": {
    "totalCollected": 1600,
    "totalPaid": 1140,
    "houseNet": 460,
    "breakdown": [
      { "position": 1, "occupants": 1, "prizePerOccupant": 500, "totalPaidAtThisPosition": 500 },
      { "position": 2, "occupants": 1, "prizePerOccupant": 200, "totalPaidAtThisPosition": 200 },
      { "position": 3, "occupants": 2, "prizePerOccupant": 100, "totalPaidAtThisPosition": 200 },
      { "position": 5, "occupants": 4, "prizePerOccupant": 40, "totalPaidAtThisPosition": 160 },
      { "position": 9, "occupants": 8, "prizePerOccupant": 10, "totalPaidAtThisPosition": 80 }
    ]
  }
}
```

Compat rétro : si `rounds: []` est fourni au lieu de `prizesByPosition`, le
serveur calcule l'économie legacy.

### Filtre par niveau utilisateur
```
GET /tournaments                        # filtre auto par level du user
GET /tournaments?all=1                  # renvoie tout (mode admin)
GET /tournaments?status=live            # filtre par statut
```

## Modèle Tournament — nouveaux champs (v14.12)

Cf. `server/src/modules/tournaments/tournament.model.ts` :

| Champ | Type | Utilité |
|---|---|---|
| `description` | string ≤ 500 | Texte marketing affiché sur la carte |
| `color` | string (hex) | Palette de la carte (défaut `#e6c46a`) |
| `icon` | string | Enseigne ou emoji |
| `minLevel`, `maxLevel` | number, number\|null | Critères d'accès filtrés côté serveur |
| `prizesByPosition` | `[{position, prize}]` | Le nouveau standard des gains |
| `bracketTree` | embed | Arbre persistant mis à jour à chaque fin de match |
| `participants[].substituteRobotId` | ObjectId | Robot de secours (v14.5, ajouté au join tournoi en v14.12) |
| `participants[].finalPosition` | number | Rang final calculé à la fin |
| `participants[].prizeAwarded` | number | Prix versé (0 si pas dans les places rémunérées) |

## Table éphémère `origin` (v14.11)

`Table.origin` : `'user' | 'match' | 'tournament'`. Utilisé pour :

- Marquer la Game archivée avec `mode: 'competition'` si origin ≠ user.
- Filtrer les tables publiques (les tables match/tournament sont invisibles).
- Distinguer dans l'historique compétition vs partie libre.
