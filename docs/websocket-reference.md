# WebSocket Reference — Kýdos Belote v14

> **Public** : développeurs mobile, back office, intégrateurs. Décrit tous les
> événements WebSocket (Socket.IO) émis et reçus par le serveur, avec les
> schémas de payload, les rooms utilisées, et les scénarios types.

## Connexion

**URL du serveur** :
- Production : `http://217.160.186.250:8882` (même port que l'API HTTP).
- Dev local : `http://localhost:4000`.

**Authentification** : le JWT doit être fourni à la connexion via l'option
`auth.token` du client Socket.IO. Le serveur pose `socket.data.userId` sur
tous les sockets authentifiés.

```js
import { io } from 'socket.io-client';

const socket = io('http://217.160.186.250:8882', {
  auth: { token: 'eyJhbGciOi...' },
  transports: ['websocket'],
});

socket.on('connect', () => console.log('connected:', socket.id));
socket.on('connect_error', (err) => console.error(err.message));
```

**Codes d'erreur de connexion** :
- `Non authentifié` — token absent ou invalide.
- `Session expirée` — le JWT est expiré, refaire un `POST /auth/login`.

## Rooms

Le serveur utilise des rooms Socket.IO pour cibler les broadcasts :

| Room | Description | Peuplée par |
|---|---|---|
| `table:<id>` | Une table de jeu libre | `table:subscribe` |
| `match:<id>` | Un match de tournoi ou format | `match:spectate` |
| `competitions` | Broadcast des mises à jour tournois | `competitions:subscribe` |
| `monitor` | Panneau d'admin (interne) | `monitor:subscribe` |

Une socket peut être dans plusieurs rooms simultanément (jeu + spectateur
d'un match, par exemple).

---

## Événements — Tables de jeu libres

Namespace : événements préfixés `table:`.

### Client → Serveur

#### `table:subscribe`

Rejoint la room d'une table (comme joueur ou spectateur, le serveur décide).

**Payload** : `tableId: string`

**Effets** :
- Si le user est assis à un siège → rejoint comme joueur.
- Sinon → rejoint comme spectateur (jusqu'à `MAX_SPECTATORS = 20` par
  table).
- Le serveur envoie immédiatement `table:lobby` avec l'état actuel.

**Erreurs** :
- Émet `table:spectator:full { tableId, max: 20 }` si la table est déjà
  pleine de spectateurs.
- Émet `table:not-found` si la table n'existe pas.

#### `table:unsubscribe`

Quitte la room. **Payload** : `tableId: string`.

#### `table:bid`

Enchère durant la phase d'annonces.

**Payload** :
```ts
{
  tableId: string;
  bid: {
    action: 'bid' | 'pass' | 'coinche' | 'surcontree';
    value?: number;       // requis si action=bid
    trump?: 'H' | 'D' | 'C' | 'S' | 'TA' | 'SA';  // requis si action=bid
  }
}
```

**Effets** : le serveur applique l'enchère, broadcast un `table:game`
mis à jour à toute la room. Rejeté si ce n'est pas le tour du user.

#### `table:play`

Joue une carte.

**Payload** :
```ts
{
  tableId: string;
  card: { rank: '7'|'8'|'9'|'J'|'Q'|'K'|'T'|'A'; suit: 'H'|'D'|'C'|'S' };
}
```

**Effets** : le serveur applique la carte, broadcast un `table:game`.
Rejeté si la carte n'est pas légale ou pas le tour du user.

#### `table:signal`

Envoie une émote ou un signal visuel.

**Payload** : `{ tableId: string; kind: 'clap' | 'wave' | 'sigh'; data?: any }`

**Effets** : broadcast à toute la room.

### Serveur → Client

#### `table:lobby`

État du salon d'attente d'une table (avant démarrage).

**Payload** :
```ts
{
  tableId: string;
  seats: Array<{ seat: 0|1|2|3; userId: string | null; robotId: string | null; username?: string; robotName?: string }>;
  options: { manches: 1|2|4; target: number };
  status: 'waiting' | 'ready' | 'running' | 'finished';
  spectatorCount: number;
}
```

#### `table:game`

Snapshot complet de l'état du jeu à un instant t. Envoyé après chaque
action.

**Payload** :
```ts
{
  view: {
    phase: 'donne_start' | 'annonces' | 'jeu' | 'donne_end' | 'manche_end' | 'partie_end' | 'surcontre';
    turn: 0|1|2|3 | null;
    trump: string | null;
    contract: { value: number; trump: string; team: 'A'|'B'; coinched?: boolean } | null;
    scores: { A: number; B: number };
    manches: Array<{ scores: {A:number,B:number}; cumulative: {A:number,B:number} }>;
    trick: Array<{ seat: 0|1|2|3; card: {rank,suit} }>;
    trickCount: number;
    awaitingCollect: boolean;
    surcontreSeats?: Array<0|1|2|3>;
    // ... autres champs de la vue moteur
  };
  summary: { message: string; team?: 'A' | 'B' } | null;
  myHand?: Array<{ rank, suit }>;      // seulement si le user est joueur
  legal?: Array<{ rank, suit }>;       // seulement si c'est son tour
  mySeat?: 0|1|2|3;                     // siège du user
  watcher?: boolean;                    // true si spectateur
  logs: Array<{ time: string; kind: string; message: string }>;
}
```

#### `table:spectators`

Nombre de spectateurs de la table. **Payload** : `{ count: number }`.

#### `table:signal`

Signal émis par un autre joueur.

**Payload** : `{ userId, kind, data?, seat }`.

#### `table:finished`

Partie terminée.

**Payload** :
```ts
{
  gameId: string;         // ref pour replay
  winner: 'A' | 'B' | null;
  scoreA: number;
  scoreB: number;
}
```

#### `table:surcontre`

Fenêtre de surcontre ouverte pour certains sièges.

**Payload** : `{ seats: Array<0|1|2|3>; windowMs: number }`.

#### `table:substitute`

Un siège humain absent est temporairement joué par son robot.

**Payload** : `{ seat: 0|1|2|3 }`.

#### `table:spectator:full`

Rejet parce que la table a déjà `MAX_SPECTATORS = 20` spectateurs.

**Payload** : `{ tableId: string; max: 20 }`.

---

## Événements — Matchs (compétition immédiate)

Namespace : événements préfixés `match:`. Concerne les matchs créés par le
matchmaking (v14.0+) et les matchs d'un tournoi (v14.1+).

### Client → Serveur

#### `match:spectate`

Rejoint la room `match:<id>` comme spectateur.

**Payload** : `{ matchId: string }`

**Ack** : `{ ok: boolean; error?: string }`

**Erreurs possibles** :
- « Ce format est purement en coulisses. » — pour un `DUO_STEEL` (spec :
  aucun spectateur, la partie tourne trop vite en synchrone côté serveur).
- « Table pleine (10 spectateurs max). » — `MAX_SPECTATORS_PER_MATCH = 10`.
- « Match introuvable. »

#### `match:leave-spectate`

Quitte la room. **Payload** : `{ matchId: string }`.

### Serveur → Client

#### `match:spectator-count`

Nombre courant de spectateurs du match (0..10).

**Payload** : `{ matchId: string; count: number }`

Émis à chaque entrée / sortie de spectateur.

---

## Événements — Panneau de compétitions

### `competitions:subscribe` / `competitions:unsubscribe`

Rejoint / quitte la room `competitions`. Le serveur y broadcast des mises
à jour globales (nouveaux tournois publiés, statuts changés). Événement
utilisé par la vitrine du hub compétitions pour se rafraîchir en direct
sans polling agressif.

**Aucun payload.**

---

## Événements — Monitoring (admin/back office)

### `monitor:subscribe`

Réservé aux comptes admin. Rejoint la room `monitor` pour recevoir des
snapshots temps réel du serveur.

**Serveur → Client** :
- `monitor:snapshot { at, users, tables, matches, tournaments, house }` — à
  la connexion.
- `monitor:log { at, level, message, meta }` — chaque log serveur.
- `monitor:sessions { at, sessions: Array<{ tableId, players, phase, ... }> }`
  — toutes les 2s.

Utilisé par le back office pour :
- Voir le nombre de connectés.
- Suivre les matchs et tournois en cours.
- Auditer les logs sans SSH.

---

## Scénarios types

### 1. Match rapide « Duo d'acier » — flux complet

```
CLIENT                                  SERVEUR
  |                                       |
  | POST /matches/enqueue                 |
  |-------------------------------------> |
  |                                       | matchmakingService.enqueue()
  |                                       |   - stake(200)
  |                                       |   - queue.push(ticket)
  |                                       |   - tryMatch → si 2 tickets:
  |                                       |     * MatchModel.create(PAIRING)
  |                                       |     * runHeadless en background
  | <------ 200 { status: "matched" }     |
  |                                       |
  | (client navigue vers                  |
  |  /matchmaking?format=duo_steel)       |
  |                                       |
  | GET /matches/mine   (poll 2s)         |
  |-------------------------------------> |
  | <------ { match: { status:running } } |
  | (affiche vue LIVE avec 4 robots)      |
  |                                       |
  | GET /matches/mine   (poll 2s)         |
  |-------------------------------------> |
  | <------ { match: { status:finished,   |
  |            winnerTeam:"A", ... } }    |
  | (affiche vue FINISHED avec 🏆)        |
```

### 2. Table libre — session temps réel

```
CLIENT                                  SERVEUR
  |                                       |
  | socket.emit('table:subscribe', id)    |
  |-------------------------------------> |
  |                                       | join room table:<id>
  | <-- 'table:lobby' { seats, ... }      |
  | <-- 'table:game'  { view, myHand }    |
  |                                       |
  | (joueur enchérit)                     |
  | socket.emit('table:bid', {...})       |
  |-------------------------------------> |
  |                                       | applyBid → broadcast
  | <-- 'table:game' (nouveau snapshot)   |
  |                                       |
  | (joueur pose une carte)               |
  | socket.emit('table:play', {card})     |
  |-------------------------------------> |
  | <-- 'table:game' × N                  |
  |                                       |
  | (partie finie)                        |
  | <-- 'table:finished' { gameId, ...}   |
```

### 3. Tournoi en cours — spectateur

```
CLIENT                                  SERVEUR
  |                                       |
  | (le joueur ouvre TournamentScreen     |
  |  et voit le bracket LIVE)             |
  |                                       |
  | (clique sur un match en cours)        |
  | socket.emit('match:spectate', {id})   |
  |-------------------------------------> |
  |                                       | join room match:<id>
  |                                       | broadcast spectator-count
  | <-- ack { ok: true }                  |
  | <-- 'match:spectator-count' {c:3}     |
  |                                       |
  |    ... (voit le match live) ...       |
  |                                       |
  | (quitte)                              |
  | socket.emit('match:leave-spectate')   |
  |-------------------------------------> |
```

---

## Gestion de la déconnexion

### Reconnexion automatique

Le client Socket.IO par défaut retente 5 fois avec un backoff. En cas
d'échec définitif, le mobile revient sur l'écran de login (re-auth).

### Comportement pendant un match

Si un **joueur humain se déconnecte** pendant un match en cours (Alliance
hybride ou Carrée royale) :

1. Après un délai de grâce (5s), le serveur émet `table:substitute { seat }`.
2. Le **robot principal** du joueur prend les commandes de son siège.
3. Si le joueur revient, il émet `table:subscribe` avec le même `tableId` :
   le serveur le remet en place et le robot cède la main aux prochains tours.

Pour les tournois : la même logique s'applique à chaque match d'un round.

---

## Sécurité et rate limiting

- Chaque socket authentifié est associé à un `userId`. Le serveur refuse
  les événements sans authentification.
- Les rooms `monitor:*` ne sont accessibles qu'aux comptes admin.
- Rate limit : 60 événements/seconde par socket. Au-delà : disconnect.
- Le CORS Socket.IO respecte la liste `CORS_ORIGIN` de l'environnement
  serveur.

---

## Tester en local

```js
// test.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: '<votre-jwt>' },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('OK, socket:', socket.id);

  // Test spectate d'un match
  socket.emit('match:spectate', { matchId: '65f...' }, (ack) => {
    console.log('spectate ack:', ack);
  });
});

socket.on('match:spectator-count', (data) => {
  console.log('spectator count:', data.count);
});

socket.on('disconnect', (reason) => console.log('disconnect:', reason));
```
