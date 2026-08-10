# API Reference — Kýdos Belote v14

> **Public** : développeurs mobile, développeurs back office, intégrateurs.
> Décrit chaque endpoint HTTP exposé par le serveur, avec les schémas
> request/response, les codes d'erreur, et des exemples curl.

## Base URL et authentification

- **Base URL en production** : `http://217.160.186.250:8882/api`
- **Base URL en dev local** : `http://localhost:4000/api`

Tous les endpoints (sauf `/auth/register` et `/auth/login`) exigent un
**JWT Bearer token** dans l'en-tête `Authorization` :

```
Authorization: Bearer <token>
```

Le token est obtenu via `POST /auth/login` et reste valide **30 jours** par
défaut.

## Format des réponses

**Succès** : HTTP 2xx avec un corps JSON.
**Erreur** : HTTP 4xx/5xx avec `{ "error": "message lisible" }`.

Erreurs courantes :

| Code | Cas | Message type |
|---|---|---|
| 400 | Requête invalide | « Champ X requis » |
| 401 | Token manquant/expiré | « Non authentifié » |
| 403 | Action interdite | « Accès refusé » |
| 404 | Ressource introuvable | « Match introuvable » |
| 409 | Conflit | « Vous êtes déjà inscrit » |
| 500 | Erreur serveur | « Erreur interne » |

---

## `/auth` — Authentification

### `POST /auth/register`

Crée un compte utilisateur.

**Request** :
```json
{
  "username": "ameur",
  "password": "belote123",
  "email": "ameur@example.com"
}
```

**Response 200** :
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "65f...",
    "username": "ameur",
    "email": "ameur@example.com",
    "rewardPoints": 500,
    "vipUntil": null
  }
}
```

### `POST /auth/login`

Connexion.

**Request** :
```json
{ "username": "ameur", "password": "belote123" }
```

**Response 200** : identique à `register`.

### `GET /auth/me`

Retourne le profil de l'utilisateur connecté.

**Response 200** :
```json
{
  "user": {
    "id": "65f...",
    "username": "ameur",
    "email": "ameur@example.com",
    "rewardPoints": 5000,
    "vipUntil": "2026-12-31T00:00:00.000Z",
    "activeSession": null,
    "gamesPlayed": 42,
    "team": "65f..."
  }
}
```

---

## `/wallet` — Porte-monnaie et VIP

### `GET /wallet`

Solde et statut VIP courants.

**Response 200** :
```json
{
  "balance": 5000,
  "vipUntil": "2026-12-31T00:00:00.000Z",
  "isVip": true
}
```

### `POST /wallet/claim-daily`

Réclame la récompense quotidienne (50 ◆ / jour).

**Response 200** :
```json
{ "credited": 50, "newBalance": 5050 }
```

**Response 409** : « Récompense déjà réclamée aujourd'hui. »

### `POST /wallet/redeem-promo`

Utilise un code promo.

**Request** : `{ "code": "1111-2222-3333" }`

**Response 200** : `{ "credited": 500, "newBalance": 5550 }`

### `POST /wallet/vip/purchase`

Achète un abonnement VIP (30 j / 90 j / 365 j).

**Request** : `{ "durationDays": 30 }`

**Response 200** :
```json
{ "vipUntil": "2027-01-08T...", "spent": 500 }
```

---

## `/robots` — Écurie de robots

### `GET /robots`

Liste des robots de l'utilisateur.

**Response 200** :
```json
{
  "robots": [
    {
      "id": "65f...",
      "name": "Athéna",
      "avatarId": "athena",
      "mobile": { "avatarId": "athena", "strategy": { "aggro": 62, "risk": 38, "bluff": 45, "memoire": 78 } },
      "elo": 1200,
      "representativeSlot": 1
    }
  ]
}
```

### `POST /robots`

Crée un robot.

**Request** :
```json
{
  "name": "Borée",
  "avatarId": "boree",
  "strategy": { "aggro": 50, "risk": 50, "bluff": 50, "memoire": 50 }
}
```

**Response 200** : `{ "robot": { "id": "65f...", "name": "Borée" } }`

### `PUT /robots/:id`

Met à jour un robot. Même corps que `POST`.

### `DELETE /robots/:id`

Supprime un robot.

**Response 200** : `{ "ok": true }`

---

## `/tables` — Tables de jeu libres

### `GET /tables`

Liste des tables publiques ouvertes.

**Response 200** :
```json
{
  "tables": [
    {
      "id": "65f...",
      "name": "Table de nuit",
      "owner": { "id": "65f...", "username": "ameur" },
      "visibility": "public",
      "capacity": 4,
      "occupied": 2,
      "createdAt": "2026-08-09T..."
    }
  ]
}
```

### `POST /tables`

Crée une table.

**Request** :
```json
{
  "name": "Ma table",
  "visibility": "public",
  "options": { "manches": 2, "target": 1000 }
}
```

### `POST /tables/:id/join`

Rejoint une table.

**Request** : `{ "seat": 0 }`

---

## `/games` — Historique et replay

### `GET /games?page=1&pageSize=15`

Historique paginé des parties de l'utilisateur.

**Response 200** :
```json
{
  "games": [...],
  "page": 1,
  "pageSize": 15,
  "total": 42,
  "totalPages": 3
}
```

### `GET /games/:id`

Détail complet d'une partie avec replay intégré (utilisé par ReplayScreen).

---

## `/matches` — Matchmaking (v14.0+)

### `POST /matches/enqueue`

Inscrit le joueur en file d'attente pour un format.

**Request** :
```json
{
  "format": "duo_steel",
  "robotIds": ["65f...", "65f..."]
}
```

Le nombre de `robotIds` doit correspondre au format :
- `duo_steel` : **2 robots**.
- `hybrid_alliance` : **1 robot**.
- `royal_square` : **0 robot** (tableau vide).

**Response 200** — 2 formes possibles :
```json
// Match trouvé immédiatement (file complète après enqueue) :
{ "status": "matched", "matchId": "65f..." }

// En attente d'autres joueurs :
{ "status": "queued", "queuePosition": 1 }
```

**Response 400** :
- « Solde insuffisant pour ce buy-in. »
- « Il vous faut N robot(s) dans votre écurie. »
- « Un robot au moins ne vous appartient pas. »
- « Vous êtes déjà en file pour ce format. »

### `POST /matches/cancel`

Annule l'inscription en file (remboursement).

**Request** : `{ "format": "duo_steel" }`

**Response 200** : `{ "refunded": 200 }`

**Response 404** : « Aucune inscription en file pour ce format. »

### `GET /matches/queues`

Tailles des 3 files d'attente.

**Response 200** :
```json
{
  "sizes": {
    "duo_steel": 3,
    "hybrid_alliance": 1,
    "royal_square": 0
  }
}
```

### `GET /matches/mine`

Retourne le match le plus récent où l'utilisateur figure. **Utilisé par le
mobile pour poller après matching** (toutes les 2 secondes) et détecter
le passage `queued` → `running` → `finished`.

**Response 200** :
```json
{
  "match": {
    "_id": "65f...",
    "format": "duo_steel",
    "status": "finished",
    "participants": [
      {
        "seat": 0,
        "team": "A",
        "isHuman": false,
        "userId": "65f...",
        "robotId": { "_id": "65f...", "name": "Athéna", "mobile": {...} }
      }
    ],
    "winnerTeam": "A",
    "scoreTeamA": 1520,
    "scoreTeamB": 980,
    "game": "65f...",
    "createdAt": "2026-08-09T...",
    "finishedAt": "2026-08-09T..."
  }
}
```

Renvoie `{ "match": null }` si l'utilisateur n'a jamais joué.

### `GET /matches/:id`

Détail complet d'un match (avec robots et usernames populés).

**Response 200** : identique à `/matches/mine`.

**Response 404** : « Match introuvable. »

### `POST /matches/:id/live-table`

**v14.4.** Récupère (ou crée) la Table éphémère associée à un match
non-headless (HYBRID_ALLIANCE ou ROYAL_SQUARE). Utilisé par le mobile
après matching pour naviguer vers l'écran table classique.

**Response 200** :
```json
{ "tableId": "65f..." }
```

**Response 400** :
- « Ce format est headless (pas de table). » — pour DUO_STEEL.
- « Match dans un statut incompatible : finished/cancelled. »

Idempotent : plusieurs appels renvoient la même `tableId`.

### `POST /matches/:id/run`

Déclenche manuellement l'exécution headless d'un match `duo_steel` en
`PAIRING`. En production, ce déclenchement est **automatique** au moment
du matching. L'endpoint reste disponible pour exploitation et rejeu.

**Request** : `{ "manches": 2 }` (1, 2 ou 4).

**Response 200** :
```json
{
  "gameId": "65f...",
  "winnerTeam": "A",
  "scoreTeamA": 1520,
  "scoreTeamB": 980
}
```

---

## `/tournaments` — Tournois (v14.1+)

### `GET /tournaments?status=upcoming|live|finished`

Liste des tournois visibles (draft **jamais** listé aux joueurs).
Sans `status` : renvoie tous les statuts sauf draft.

**Response 200** :
```json
{
  "tournaments": [
    {
      "_id": "65f...",
      "name": "Coupe Contrée",
      "format": "hybrid_alliance",
      "status": "upcoming",
      "capacity": 16,
      "entryFee": 1000,
      "minLevel": 0,
      "rounds": [
        { "round": 1, "prize": 0 },
        { "round": 2, "prize": 300 },
        { "round": 3, "prize": 400 },
        { "round": 4, "prize": 500 },
        { "round": 5, "prize": 1500 }
      ],
      "startAt": "2026-08-09T14:00:00.000Z",
      "participants": [...],
      "createdBy": "65f..."
    }
  ]
}
```

### `GET /tournaments/:id`

Détail complet d'un tournoi (bracket, participants, gains).

**Response 200** : `{ "tournament": {...} }`

**Response 404** :
- « Tournoi introuvable. » (aussi renvoyé si le tournoi est `draft` et
  que le requester n'est pas le créateur).

### `POST /tournaments/:id/join`

Inscription au tournoi.

**Request** : `{ "robotIds": ["65f..."] }`

Nombre de robots requis selon le format (voir `/matches/enqueue`).

**Response 200** : `{ "joined": true }`

**Response 400** :
- « Les inscriptions sont fermées. » (tournoi non-upcoming)
- « Tournoi complet. »
- « Un de vos robots est déjà engagé dans un tournoi ce jour-là. »
- « Vous êtes déjà inscrit. »

### `POST /tournaments/:id/leave`

Désinscription (autorisée seulement en statut `upcoming`).

**Response 200** : `{ "refunded": 1000 }`

**Response 400** : « Impossible de quitter un tournoi démarré. »

### `POST /tournaments/preview-economics`

Aperçu de rentabilité pour un tournoi (utilisé par le back office pendant
la saisie). **Ne modifie rien en base.**

**Request** :
```json
{
  "capacity": 16,
  "entryFee": 1000,
  "rounds": [
    { "round": 1, "prize": 0 },
    { "round": 2, "prize": 300 },
    { "round": 3, "prize": 400 },
    { "round": 4, "prize": 500 },
    { "round": 5, "prize": 1500 }
  ]
}
```

**Response 200** :
```json
{
  "economics": {
    "totalCollected": 16000,
    "totalPaid": 6500,
    "houseNet": 9500,
    "breakdown": [
      { "round": 1, "survivors": 16, "prizePerSurvivor": 0, "totalPaidThisRound": 0 },
      { "round": 2, "survivors": 8, "prizePerSurvivor": 300, "totalPaidThisRound": 2400 },
      { "round": 3, "survivors": 4, "prizePerSurvivor": 400, "totalPaidThisRound": 1600 },
      { "round": 4, "survivors": 2, "prizePerSurvivor": 500, "totalPaidThisRound": 1000 },
      { "round": 5, "survivors": 1, "prizePerSurvivor": 1500, "totalPaidThisRound": 1500 }
    ]
  }
}
```

Si `houseNet` est **négatif**, le back office doit afficher une alerte
avant publication.

---

## `/teams` — Équipes de joueurs

### `GET /teams/mine`

Équipe de l'utilisateur (ou `null` s'il est solo).

### `POST /teams`

Crée une équipe.

**Request** : `{ "name": "Les Ténors", "description": "..." }`

### `POST /teams/:id/join` / `POST /teams/:id/leave`

Rejoint / quitte une équipe.

---

## `/invitations`

### `GET /invitations`

Invitations pour rejoindre une équipe.

### `POST /invitations/:id/accept` / `POST /invitations/:id/decline`

---

## Codes d'erreur canoniques

Tous les endpoints suivent la même convention. Le mobile affiche
`error` tel quel à l'utilisateur — les messages doivent donc être lisibles.

## Exemples curl

```bash
# Login
curl -X POST http://217.160.186.250:8882/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ameur","password":"belote123"}'

# S'inscrire à un Duo d'acier
TOKEN="eyJ..."
curl -X POST http://217.160.186.250:8882/api/matches/enqueue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"duo_steel","robotIds":["65f...","65f..."]}'

# Voir la file d'attente
curl http://217.160.186.250:8882/api/matches/queues \
  -H "Authorization: Bearer $TOKEN"

# Preview économie tournoi
curl -X POST http://217.160.186.250:8882/api/tournaments/preview-economics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capacity":16,"entryFee":1000,"rounds":[{"round":5,"prize":1500}]}'
```
