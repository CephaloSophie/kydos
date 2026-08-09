# Matchs & Tournois — architecture v14

## Vocabulaire

Le mot « compétition » (ambigu) a disparu. Deux concepts distincts :

- **Match** — partie compétitive immédiate (1 partie de belote). L'un des 3 formats fixes ; le serveur regroupe les joueurs par matchmaking.
- **Tournament** — bracket planifié à élimination directe (4 à 128 participants). Enchaîne plusieurs Matchs (les rounds).

## Les 3 formats de match

Source unique : `server/src/modules/matches/matchFormat.ts` (enum + catalog immuable).

| Format | Effectif | Buy-in / joueur | Gain vainqueur | Rake kydos | Headless |
|---|---|---|---|---|---|
| `DUO_STEEL` (Duo d'acier) | 2 robots × 2 joueurs | 200 ◆ (100 × 2 robots) | 150 ◆ | 50 ◆ | ✅ |
| `HYBRID_ALLIANCE` (Alliance hybride) | 1 humain + 1 robot × 2 | 150 ◆ | 225 ◆ | 75 ◆ | ❌ |
| `ROYAL_SQUARE` (Carrée royale) | 4 humains | 100 ◆ | 150 ◆ × 2 vainqueurs | 100 ◆ | ❌ |

**Pour ajuster un prix ou ajouter un 4ᵉ format** : on ne touche QUE `matchFormat.ts`. `verifyEconomics()` valide la cohérence économique en test.

## Queue de matchmaking

`server/src/modules/matchmaking/queue.ts` — interface `MatchmakingQueue` (FIFO) avec deux implémentations :

- `InMemoryQueue` — dev et tests, aucune dépendance.
- `RedisQueue` — production, `LPUSH` / `RPOP` (FIFO strict).

Le choix est fait dans `queueFactory.ts` selon la variable d'environnement `REDIS_URL`. **Point d'extension unique** : pour passer d'un matchmaking FIFO à un matchmaking par ELO plus tard, on remplace UNIQUEMENT l'implémentation ; le reste du code ne change pas.

### Cycle d'un match

```
enqueue(userId, format, robotIds)
  ↓
[Vérif éligibilité : nb robots, ownership, pas déjà en file]
  ↓
[walletService.stake(buy-in) — débit atomique]
  ↓
push(ticket) dans la file du format
  ↓
tryMatch : si (size >= humansPerMatch) → pop(humansPerMatch)
                                       → create Match(participants, PAIRING)
                                       → renvoyer matchId
```

Le match en `PAIRING` est ensuite :
- **DUO_STEEL** → `matchHeadlessRunner.run(matchId)` : partie jouée en synchrone, aucun délai, aucun broadcast, replay archivé. Crédit du vainqueur, écriture `HouseTransaction(kind=MATCH_RAKE)`.
- **HYBRID_ALLIANCE / ROYAL_SQUARE** → passage en `RUNNING`, les joueurs se connectent via socket. **Runner temps-réel branché sur socket table à venir en v14.3.**

## Tournois

`server/src/modules/tournaments/tournament.model.ts` — modèle Mongoose complet.

### Statuts

Enum `TournamentStatus` :

- **`DRAFT`** — préparé par kydos, invisible aux joueurs.
- **`UPCOMING`** — publié, inscriptions ouvertes/désinscription possible.
- **`LIVE`** — démarré à `startAt` par le worker. Plus d'inscription. Bracket figé (seed FIFO).
- **`FINISHED`** — terminé. Écran résumé consultable, replays disponibles.

### Contrainte 1 tournoi / robot / jour

Collection dédiée `TournamentRobotDayLock` avec index unique `{robotId, dayKey}`. Un `insertMany` avec `ordered: true` échoue si le robot est déjà engagé ce jour-là (UTC) → l'inscription est refusée. Rollback des locks si le débit du buy-in échoue.

### Rentabilité (fonction pure)

`tournaments/economics.ts` — `tournamentEconomics()` calcule :

- `totalCollected` = `capacity × entryFee`
- `totalPaid` = `Σ (survivants_round × prize_round)`
- `houseNet` = `totalCollected − totalPaid` (signé)
- `breakdown[]` — détail par round

Exemple validé en test (16 participants, 1000 ◆ buy-in, gains 300/400/500/1500) → **houseNet = 9500 ◆**. Le back office pourra afficher cet aperçu en temps réel pendant la saisie.

### Orchestrateur

`tournament.orchestrator.ts::run(tournamentId)` — idempotent :

1. Charge le tournoi LIVE et reconstruit l'état bracket.
2. Pour chaque round non complet : crée les Match manquants (2 par 2 pour DUO/HYBRID, 4 par 4 pour ROYAL).
3. Lance headless pour DUO_STEEL ; laisse RUNNING pour les autres (le socket flow finira).
4. Marque les perdants éliminés, crédite le gain du round aux survivants, écrit `HouseTransaction`.
5. Passe au round suivant ou marque `FINISHED`.

### Worker cron interne

`tournament.worker.ts` — `setInterval` 30 s :
- Passe UPCOMING → LIVE dès `startAt` atteint (via `tournamentService.startNow`).
- Progresse chaque tournoi LIVE via `tournamentOrchestrator.run`.

**Aucun scheduler externe requis**. Résilient : ne plante jamais, retente au tick suivant.

## Comptabilité kydos

Collection `HouseTransaction`, enum `HouseTransactionKind` :

- `MATCH_RAKE` — rake d'un match terminé (positif).
- `TOURNAMENT_ENTRY` — buy-in collecté à l'inscription (positif) ou remboursé (négatif si désinscription).
- `TOURNAMENT_PRIZE` — gain versé à un joueur (négatif du point de vue kydos).

Reporting via agrégat MongoDB :

```js
houseTransactionModel.aggregate([
  { $group: { _id: '$kind', total: { $sum: '$amount' } } }
])
```

## Spectateurs

`server/src/modules/matches/match.socket.ts` — 10 spectateurs max par match (`MAX_SPECTATORS_PER_MATCH`). DUO_STEEL refuse (purement backend, spec). Compte broadcasté à chaque entrée/sortie de la room `match:<id>`. Cleanup automatique à `disconnect`.

## Écrans mobiles

### `CompetScreen`

Le hub des compétitions :
- 3 tuiles pour les 3 formats de match (S'inscrire / Annuler).
- Liste des tournois avec filtres **À venir / En cours / Terminés**.
- Chaque ligne tournoi est cliquable → `TournamentScreen`.

### `TournamentScreen`

Vue détaillée avec 4 rendus selon le statut :

- **UPCOMING** — bandeau doré compte à rebours + bouton S'inscrire / Se désinscrire + gains par tour.
- **LIVE** — bracket visuel en colonnes (une par round) + matchs terminés cliquables.
- **FINISHED** — podium 🏆 « coupe du monde » + récap gains par round + boutons **Rejouer** pour chaque match.
- **DRAFT** — refusé côté serveur (non affiché aux joueurs).

### `ReplayScreen`

Rejeu d'une partie archivée avec **vitesses 0.5× / 1× / 2× / 4×**, **pause/reprise**, **stop** (reset au début). Cleanup complet du timer + React root au démontage.

## API HTTP

### Matchs

- `POST /api/matches/enqueue` — inscription en file `{format, robotIds}`
- `POST /api/matches/cancel` — désinscription avec remboursement
- `GET /api/matches/queues` — tailles des 3 files
- `POST /api/matches/:id/run` — déclenche le runner headless (DUO_STEEL)

### Tournois

- `GET /api/tournaments?status=upcoming|live|finished` — liste (draft caché)
- `GET /api/tournaments/:id` — détail (draft visible seulement au créateur)
- `POST /api/tournaments/:id/join` — inscription `{robotIds}`
- `POST /api/tournaments/:id/leave` — désinscription (remboursement)
- `POST /api/tournaments/preview-economics` — aperçu rentabilité (aucune modif base)

### Sockets

- `match:spectate {matchId}` → rejoint la room, ack `{ok}` (max 10, DUO_STEEL refusé)
- `match:leave-spectate {matchId}` → quitte la room
- Broadcast serveur : `match:spectator-count {matchId, count}`

## Ce qui n'est pas dans le périmètre v14

Comme demandé, **le back office admin** (création/publication/annulation de tournois) est hors périmètre v14. Le seed inclut 4 tournois de démo (1 par statut) pour valider tous les écrans immédiatement. Le back office pourra être branché sur les endpoints existants et un futur `admin.controller.ts` sans refactoring.

Le **runner temps-réel HYBRID/ROYAL** (partie belote jouée sur socket table pour ces 2 formats) est également reporté à v14.3 — le socket handler des spectateurs est déjà en place.
