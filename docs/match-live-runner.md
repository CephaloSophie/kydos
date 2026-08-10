# Runner temps-réel HYBRID / ROYAL & Infrastructure

> **v14.4**. Documentation technique de trois chantiers menés ensemble :
> - Runner temps-réel pour les formats non-headless.
> - Fiabilisation du client Redis pour la queue de matchmaking.
> - Optimisation de performance (peek natif au lieu de pop+repush).

## 1. Runner temps-réel (HYBRID_ALLIANCE, ROYAL_SQUARE)

### Le problème

Jusqu'à v14.3, seul `DUO_STEEL` (headless) tournait vraiment. Les deux autres
formats créaient bien un `Match` en `PAIRING`, mais aucun code ne branchait
le moteur belote sur les joueurs humains. Résultat : les parties HYBRID et
ROYAL ne démarraient pas.

### La solution — réutilisation totale de `liveGameService`

Plutôt que dupliquer la boucle temps-réel (moteur belote, gestion des tours,
substitution robot, persistence en fin de partie), on **convertit un
`Match` en `Table` éphémère** et on laisse `liveGameService` faire son
travail habituel. Une seule implémentation du temps-réel, testée depuis des
mois sur les tables libres.

**Correspondance formats → kinds :**

| MatchFormat | Table.kind |
|---|---|
| `DUO_STEEL` | `acier` |
| `HYBRID_ALLIANCE` | `hybride` |
| `ROYAL_SQUARE` | `royal` |

### Cycle de vie complet

```
1. matchmakingService.enqueue()
     └── tryMatch() : quand la file est complète
           ├── crée Match { format, status: PAIRING, participants[] }
           ├── si isHeadless (DUO_STEEL) :
           │     └── matchHeadlessRunner.run() en background
           └── sinon (HYBRID / ROYAL) :
                 ├── matchLiveService.provision(matchId)
                 │     ├── crée Table { kind, seats: [...] } avec les
                 │     │   4 sièges pré-remplis depuis participants
                 │     └── Match.liveTableId ← table._id
                 └── Match.status ← RUNNING

2. Mobile : polling /matches/mine
     └── détecte match.status = 'running' + format ≠ 'duo_steel'
           └── POST /matches/:id/live-table → { tableId }
                 └── navigue vers `table?id=<tableId>`

3. Écran table classique (déjà existant)
     ├── socket.emit('table:subscribe', tableId)
     └── liveGameService.launch(server, tableId) démarre le moteur

4. Fin de partie
     ├── liveGameService persiste la Game (pipeline standard)
     ├── émet 'table:finished' { gameId, winner }
     └── matchLiveService.settle() (déclenché par sweep 3s)
           ├── copie le résultat vers le Match (score, winnerTeam, gameId)
           ├── crédite les vainqueurs (walletService.credit)
           ├── enregistre le rake maison (houseAccountingService)
           └── Match.status ← FINISHED
```

### Le fichier

`server/src/modules/matches/match.liveRunner.ts`, classe `MatchLiveService` :

- **`provision(matchId)`** — crée (ou retrouve) la Table éphémère. Cache
  interne `matchId → tableId` pour éviter les créations doublons. Idempotent.
- **`settle(server, tableId, matchId)`** — copie le résultat depuis la Game
  archivée vers le Match, verse les gains, enregistre le rake. Idempotent
  (skip si déjà FINISHED).
- **`sweepFinishedMatches(server)`** — scanne toutes les 3 s les matchs en
  RUNNING non-headless et fait le settle si la Table associée est
  finie. Résilient aux erreurs.

Le sweep est démarré par le module socket au boot (`MatchSocket.attachTo` →
`setInterval` 3s → import dynamique de `matchLiveService.sweepFinishedMatches`).

### Comptabilité

Cohérence complète avec le pipeline existant :

- **`HYBRID_ALLIANCE`** — 1 vainqueur humain crédité de 225 ◆, rake maison
  75 ◆.
- **`ROYAL_SQUARE`** — 2 humains vainqueurs crédités de 150 ◆ chacun, rake
  maison 100 ◆.

Le crédit se fait via `walletService.credit(userId, prize, gameId,
'game_win')` — même méthode que les tables libres. L'historique et le
solde sont donc **entièrement compatibles**.

### Détection des humains absents

Un humain qui ferme l'app pendant un match : le mécanisme existant de
`liveGameService` (substitution par robot après un timeout) prend le
relais **sans code additionnel**. Quand le joueur revient, il reprend son
siège.

Pour le tournoi : chaque match d'un round est un `Match` distinct avec sa
Table éphémère. Un joueur peut donc traverser tout un bracket depuis
plusieurs devices sans perte de progression.

### Ce qui reste à voir en production

- Le comportement sous forte charge (nombreuses tables live en parallèle).
  `liveGameService` a été testé sur les tables libres avec plusieurs
  parties simultanées ; les matchs de tournoi ne changent rien à sa
  complexité.
- L'intégration au `tournamentOrchestrator` : celui-ci crée déjà les
  Match du round courant et attend qu'ils passent en FINISHED avant de
  générer le round suivant. Le settle asynchrone marche parfaitement avec
  cette logique.

## 2. Redis — fiabilisation

### Le problème

L'ancien `queueFactory` importait ioredis via `require('ioredis')` sans
la moindre gestion d'erreur. Si Redis était indisponible au boot, le
serveur plantait dur. Aucune reconnexion, aucun log.

### La solution

`server/src/modules/matchmaking/queueFactory.ts` avec les options
ioredis suivantes :

```ts
new Redis(url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 3000),
  enableReadyCheck: true,
  lazyConnect: false,
});
```

Événements écoutés et logués via `createLogger('queue')` :

- **`ready`** — Redis prêt à servir. Le mot de passe est masqué dans l'URL.
- **`error`** — erreur de connexion (log niveau `warn` — n'arrête pas le
  serveur).
- **`reconnecting`** — tentative de reconnexion en cours.

Si `require('ioredis')` échoue (dépendance absente) ou si l'URL est
invalide, `queueFactory` **retombe automatiquement sur `InMemoryQueue`**.
L'application reste utilisable, un log niveau `error` alerte l'ops.

### Dépendance

`ioredis@^5.4.1` ajouté à `server/package.json`. À installer sur le VPS
via `npm install`.

### Variable d'environnement

```dotenv
# server/.env
REDIS_URL=redis://:motdepasse@127.0.0.1:6379
```

**Vide ou absente** → mode InMemory. Utile en dev et pour désactiver Redis
temporairement.

## 3. Performance — peek natif

### Le problème

L'ancien `matchmakingService.#peekAll` faisait :

```ts
// Ancien code — INEFFICACE en Redis
const size = await queue.size(format);         // 1 appel Redis
const items = await queue.pop(format, size);   // 1 appel Redis
for (const t of items) await queue.push(format, t);  // N appels Redis
```

**Coût pour une file de 10 tickets** : 12 aller-retours Redis à chaque
vérification « est-ce que ce user est déjà en file ? ». Sur une queue
partagée avec 100 utilisateurs qui poussent en même temps, ça devient
critique.

### La solution — méthode `peek` sur l'interface

`MatchmakingQueue.peek(key, limit?)` — implémentation native FIFO :

- **InMemoryQueue** : `array.slice(0, limit)` — O(1).
- **RedisQueue** : `LRANGE(key, 0, -1)` puis `.reverse()` — **1 seul
  appel Redis**.

L'ordre chronologique FIFO est préservé (LPUSH insère en tête, RPOP
sort de la queue → chronologiquement, la queue Redis est parcourue de la
fin vers le début, d'où le `.reverse()` sur le résultat de LRANGE).

### Résultat

`matchmakingService.enqueue()` fait maintenant **1 seul appel Redis** au
lieu de N+2 pour vérifier qu'un user n'est pas déjà en file. Tests
`queue.test.ts` étendus avec un fake Redis client validant la parité FIFO
entre InMemory et Redis.

## 4. Vérification

- Typecheck 3 workspaces : ✓
- **130 tests serveur** (+5 sur queue.test.ts : RedisQueue + peek).
- **188 tests mobile** (inchangés).
- **TNR 14/14 · 451 tests verts.** Zéro régression.

## 5. Endpoints exposés (mise à jour)

Ajout à l'API référence :

- **`POST /api/matches/:id/live-table`** — récupère ou crée la Table
  éphémère associée à un match non-headless. Renvoie `{ tableId }`. Le
  mobile ouvre ensuite l'écran table classique.
