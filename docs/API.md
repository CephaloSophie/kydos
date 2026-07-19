# API — Belote Contrée

Base REST : `http://localhost:4000/api` · WebSocket : `http://localhost:4000` (Socket.IO).
Authentification : JWT (Bearer) pour le REST, `auth.token` au handshake pour le socket.

## REST

### Auth
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/register` | `{ username, password }` | `{ token, user }` |
| POST | `/auth/login` | `{ username, password }` | `{ token, user }` |
| GET | `/auth/me` | — (Bearer) | `{ user }` |

`user = { id, username, settings:{responseTimeMs,maxPlayTimeMs,defaultManches}, rewardPoints }`

### Paramètres
| PUT | `/settings` | `{ responseTimeMs, maxPlayTimeMs, defaultManches }` | `{ settings }` |

### Robots
| GET | `/robots` | — | `{ robots[] }` |
| POST | `/robots` | `{ name, personality:{aggressiveness,concentration,velocity}, responseTimeMs, maxPlayTimeMs, conventionConfig }` | `{ robot }` |
| PUT | `/robots/:id` | champs partiels | `{ robot }` |
| DELETE | `/robots/:id` | — | `{ ok }` |

### Parties (rejeu)
| GET | `/games` | — | `{ games[] }` (sans `replay`) |
| GET | `/games/:id` | — | `{ game }` (avec `replay` complet) |
| POST | `/games` | `{ replay, logs, mode, winner }` | `{ id }` |

`replay` = `ReplayRecord` du moteur : `{ config, players, manches:[{donnes:[{hands, operations[], donneScore}]}], manchesWon, winner }`.
Chaque opération (`deal|bid|play|trick|donne_score|manche_end|partie_end`) est enregistrée → rejeu fidèle.

## WebSocket (Socket.IO)

Connexion : `io(url, { auth: { token } })`. Les callbacks d'accusé suivent la forme `(payload, cb) => cb({ ok, ... })`.

### Émis par le client
| Événement | Payload | Ack |
|---|---|---|
| `table:create` | `{ visibility:'public'\|'private', config:{manches} }` | `{ ok, tableId }` |
| `table:list` | `{}` | `{ ok, tables[] }` |
| `table:join` | `{ tableId, as:'player'\|'watcher', seat? }` | `{ ok }` |
| `table:invite` | `{ tableId, username, as }` | `{ ok }` |
| `table:addRobot` | `{ tableId, seat, robotId }` | `{ ok }` |
| `table:start` | `{ tableId }` | `{ ok }` |
| `game:bid` | `{ tableId, bid:{action,value?,suit?,saidSuit?} }` | — |
| `game:play` | `{ tableId, card:{rank,suit} }` | — |

### Émis par le serveur
| Événement | Payload |
|---|---|
| `table:state` | `{ id, owner, visibility, started, seats:[{type,name,vacant}] }` |
| `game:state` | joueur : `{ view, myHand, mySeat, logs }` · observateur : `{ view, hands, watcher, logs }` |
| `invitation` | `{ tableId, owner, as }` |

`view` = `EngineView` : `{ phase, turn, trump, bidderSeat, currentBidValue, contre, currentTrick, manchesWon, cumulative, target, mancheIndex, isLabel, labelKind }`.

### Autorité & vérification
Le serveur détient le `GameEngine` faisant foi : il rejette tout coup hors‑tour ou illégal. Le **front pré‑valide** avec les mêmes règles (`ContreeRules.legalMoves`) pour surligner les cartes jouables. En table en ligne, les robots sont pilotés par le serveur ; en **entraînement local, l'algorithme des robots tourne dans le navigateur** (aucun websocket), conformément à la spec.

## Couche fonctionnelle étendue (équipes, visibilité, robots abstraits)

### Équipes
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/teams` | — | `{ teams[] }` classées par points puis nb de membres |
| GET | `/teams/mine` | — | `{ team, members[] }` |
| POST | `/teams` | `{ name }` | `{ team }` (crée + rejoint) |
| POST | `/teams/:id/join` | — | `{ ok, team }` |
| POST | `/teams/leave` | — | `{ ok }` |

Chaque utilisateur appartient à **une** équipe (`user.team`). Création/adhésion libres.

### Recherche de joueurs (typeahead)
`GET /users/search?q=<préfixe>` → `{ users:[{id,username}] }` (8 max, insensible à la casse).

### Robots (champs ajoutés)
`algoSpec` (JSON de l'algorithme), `offlineEnabled` (bool : jouable sans autorisation),
`representativeSlot` (0..4 ; un seul robot par siège, unicité garantie côté serveur).

### Parties — visibilité & historique
`GET /games?scope=mine|public|team` :
- `mine` : parties dont je suis propriétaire ou participant
- `public` : toutes les parties publiques
- `team` : parties `visibility:'team'` de mon équipe (semi‑privé)

`GET /games/:id` applique les permissions : public, ou participant/propriétaire,
ou même équipe si `visibility:'team'` (sinon 403).
`POST /games` accepte `visibility` (`public|private|team`), `players[]`, `target`.

## AlgoSpec — algorithme de robot abstrait (JSON)

Chaque robot **pointe vers une AlgoSpec** : un JSON versionné que le cœur (`belote-core`)
interprète via `algoToRuntime()`. Le robot ne contient aucun code.

```jsonc
{
  "version": 1,
  "name": "Agressif",
  "personality": { "aggressiveness": 9, "concentration": 6, "velocity": 8 },
  "bidding": { "weakOpenMinTrump": 3, "acePoints": 15 },   // surcharge de la convention
  "contre": { "enabled": true, "minOpponentRiskToContre": 0.5, "minOwnStrengthToSurcontre": 0.7 },
  "play":   { "aggressiveness": 9 }
}
```

Le **contexte** fourni au robot (en lecture seule) expose : coups légaux, demandeur et
son équipe, atout, nb d'atouts joués/restants, atouts non vus, cartes jouées, pli courant,
enchères, contre/surcontre. Le cœur est **framework‑agnostic** : importable tel quel par le
front web (React) comme par un futur front mobile (HTML/TS), sans réécriture du métier.

### Cerveaux (Brains) — éditeur de cerveau
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/brains` | — (Bearer) | `{ projects:[résumés] }` |
| POST | `/brains` | `{ title, brainName, functions[], generatedCode, previewSettings }` | `{ project }` (V-1.0.0) |
| GET | `/brains/:id` | — | `{ project }` (toutes versions) |
| PUT | `/brains/:id/versions/:v` | `{ brainName?, functions?, generatedCode?, previewSettings? }` | `{ project }` |
| POST | `/brains/:id/versions` | `{}` | `{ project }` (nouvelle version V-1.x.0) |
| PUT | `/brains/:id/active/:v` | — | `{ project }` (change la version active) |
| POST | `/brains/:id/clone` | `{}` | `{ project }` (copie) |
| DELETE | `/brains/:id` | — | `{ ok:true }` |

Un **projet de cerveau** contient plusieurs **versions** ; chaque version porte le nom du cerveau,
les fonctions (`decideBid`/`decideCard`/`shouldContre`/`shouldSurcontre` + custom) et le code généré.

> **Tests & visualisation** : voir `server/tnr/` — collection Postman (toutes les API), environnements
> (local + VPS) et spec **OpenAPI** (`server/tnr/openapi.json`) pour Swagger/Redoc.

### Contraintes de salle (serveur, temps réel)
- Un robot ne peut pas jouer dans **deux tables** simultanément.
- **Deux robots d'un même propriétaire** ne peuvent pas être **adversaires** : uniquement
  dans la **même équipe** (sièges 0/2 = équipe A, 1/3 = équipe B).
- Un spectateur ne voit **que le score et les cartes jouées**, jamais les mains.
