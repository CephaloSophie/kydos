# API backend — contrat consommé par le mobile

Base URL par défaut : `http://localhost:4000/api` (paramétrable via
`VITE_API_URL` au build de `belote-mobile`).

Toutes les routes protégées attendent l'en-tête :

```
Authorization: Bearer <token>
```

## Auth

### POST /auth/register
Body : `{ username, password, email? }`
Retour : `{ token, user: { id, username, email? } }`

### POST /auth/login
Body : `{ username, password }`
Retour : `{ token, user }`

### GET /auth/me
Retour : `{ user }` (profil courant)

## Robots

### GET /robots
Retour : `{ robots: ServerRobot[] }`

```ts
interface ServerRobot {
  id: string;
  name: string;
  personality: { aggressiveness: 1..10, concentration: 1..10, velocity: 1..10 };
  responseTimeMs: number;      // temps de réponse en jeu
  maxPlayTimeMs: number;
  algoSpec: unknown;
  offlineEnabled: boolean;
  representativeSlot: number;
  /**
   * Métadonnées AFFICHAGE mobile (avatar + curseurs bruts).
   * Purement présentationnel : sans effet moteur.
   */
  mobile: {
    avatarId: 'atne' | 'bato' | 'celi' | 'doxa' | 'eris';
    strategy: { aggro: 0..100, risk: 0..100, bluff: 0..100, memoire: 0..100 };
  } | null;
}
```

### POST /robots
Body :

```json
{
  "name": "Atné",
  "personality": { "aggressiveness": 6, "concentration": 8, "velocity": 4 },
  "mobile": {
    "avatarId": "atne",
    "strategy": { "aggro": 62, "risk": 38, "bluff": 45, "memoire": 78 }
  }
}
```

Retour : `{ robot: { id, name } }`

Le champ `bidResponseMs` est **ignoré** par le serveur (fixé à 700 ms
côté moteur).

### DELETE /robots/:id
Retour : `{ ok: true }`

## Games / replays

### GET /games
Retour : `{ games: ServerGame[] }` (parties de l'utilisateur, tri par date).

```ts
interface ServerGame {
  _id: string;
  mode: 'local' | 'online' | 'competition';
  winner: 'A' | 'B' | null;
  createdAt: string;      // ISO 8601
  players?: { name?: string }[];
}
```

### GET /games/:id
Retour : `{ game: ServerGame & { replay: ReplayRecord } }`.
Le `replay` est un objet `belote-core` (`toReplay()`) qui contient les
donnes, mains initiales et opérations pour rejouer la partie exactement.

### POST /games
Body :

```json
{
  "replay": { "donnes": [...] },
  "logs": [],
  "mode": "local",
  "winner": "A"
}
```

Retour : `{ id }` — utilisable ensuite via `/games/:id` pour le rejeu.

## Analytics

### GET /analytics/me
Retour : `{ stats }` (statistiques agrégées de l'utilisateur).

## Collection Postman

Un fichier prêt à l'emploi est fourni :
`docs/api/kydos-mobile.postman_collection.json`
Variables à définir : `baseUrl` (défaut `http://localhost:4000/api`) et
`token` (rempli après un login).


---

## Endpoints v10.3.0 (équipes rôlées + porte-monnaie serveur)

### Teams — rôles owner/super/admin/user (SPEC §3.5)

```ts
type TeamRole = 'owner' | 'super' | 'admin' | 'user';
```

| Route | Méthode | Description |
| --- | --- | --- |
| `/teams` | GET | Liste des équipes (nom, points, nb membres, visibilité) |
| `/teams/mine` | GET | Mon équipe possédée sinon la première rejointe (avec `myRole`) |
| `/teams` | POST | Crée MON équipe (unicité par owner). Body `{ name, visibility }` |
| `/teams/:id` | GET | Détail (membres avec rôles + niveaux) |
| `/teams/:id` | PUT | Rename (owner/super) ou visibilité (owner). Body `{ name?, visibility? }` |
| `/teams/:id/join` | POST | Rejoint une équipe publique (rôle `user`) |
| `/teams/:id/leave` | POST | Quitte l'équipe (owner refusé — dissolution requise) |
| `/teams/:id/members/:userId` | DELETE | Exclut un membre (autorité requise) |
| `/teams/:id/members/:userId/role` | PUT | Change le rôle (autorité + assignation vérifiées) |

**Règles serveur (permissions)** :
- Autorité : `owner > super > admin > user`.
- Un acteur ne peut agir QUE sur des rôles strictement inférieurs.
- Le rôle `owner` est protégé : impossible à assigner via `PUT /role`.
- 40 membres maximum par équipe (SPEC §3.5).
- Un utilisateur ne peut posséder qu'UNE seule équipe (index unique).

### Wallet — économie serveur (SPEC §3.9)

| Route | Méthode | Description |
| --- | --- | --- |
| `/wallet` | GET | Solde + capacité de réclamation + 50 dernières transactions |
| `/wallet/claim` | POST | Débloque 500 ◆ (idempotent par jour) |

Le service `walletService.credit` est appelé automatiquement en fin de partie
selon le mode :

- **4H** : 150 ◆ par humain gagnant.
- **2H + 2R** : 225 ◆ pour l'humain gagnant.
- **4R** : 150 ◆ par robot gagnant → au propriétaire du robot.
- **Local** : gratuit (aucun débit, aucun gain).

### Single-game lock (SPEC §3.8)

Chaque utilisateur porte un champ `User.activeSession`. Le service
`singleGameLockService` gère `acquire` / `release` / `releaseAllOf`. Il est
appelé automatiquement :
- à l'assignation d'un siège via `POST /tables/:id/seat` ;
- à la persistance de fin de partie (libération pour toute la session).

### Spectateurs (SPEC §3.7)

Le canal socket `table:{id}` accepte jusqu'à **5 spectateurs simultanés**.
Au-delà, l'événement `table:spectator:full` est renvoyé et l'abonnement est
refusé. Les spectateurs ne reçoivent JAMAIS `myHand` ni `hands` — uniquement
`view`, `summary` et `logs`.

Événements enrichis :
- `table:signal` (émis par un joueur assis, rebroadcasté à tout le canal) :
  `{ kind: 'smiley' | 'reflexion' | 'note', data }`. Alimente la piste
  enrichie du replay (`GameReplay.events`).


---

## Endpoints v10.4.0

| Route | Méthode | Description |
| --- | --- | --- |
| `/games/public?q=nom` | GET | Recherche PUBLIQUE de replays par nom de joueur/robot (insensible à la casse, visibilité `public` uniquement) |
| `/tables/:id/cancel` | POST | Annule une table EN ATTENTE (créateur requis ; refusé dès que les 4 sièges sont pris) — libère les verrous |

Autres changements API :
- `serializePublicUser` expose désormais `activeSession` (bannière « Partie en
  cours ») et `favoriteRobot`.
- Les parties listées par `GET /games` utilisent le champ **`id`** (pas `_id`).
- `GameReplay.publicNames` contient les VRAIS noms lisibles (username /
  nom de robot), remplis à la persistance.
- Socket `table:subscribe` déclenche `resumeSeat` : un joueur de retour dans
  une partie où son robot le remplaçait REPREND LA MAIN immédiatement.


---

## Correctifs v10.5.0 — la cause des 404

Le serveur n'avait **aucun middleware de gestion d'erreurs**. Les `HttpError`
levées par les services remontaient au handler par défaut d'Express, qui
répondait avec le statut brut et un corps HTML. Conséquence observée :

- `GET /api/auth/me` et `GET /api/wallet` renvoyaient **404** lorsqu'un jeton
  JWT valide désignait un utilisateur absent de la base (base réinitialisée,
  compte supprimé) — car les deux services levaient `notFound()`.
- `GET /api/robots` continuait de répondre 200 (il renvoie une liste vide),
  ce qui donnait une application « à moitié connectée » et illisible.

Corrections :

1. **Middleware d'erreurs central** dans `app.ts` : toute erreur est
   sérialisée en `{ error: message }` avec le bon statut.
2. **404 JSON explicite** pour toute route `/api` inconnue.
3. `auth.getCurrentUser` et `wallet.getMyWallet` lèvent désormais
   **401 « session expirée »** (et non 404) quand le compte n'existe plus.
4. Côté mobile, `ApiClient` intercepte tout **401** : purge du jeton et
   retour automatique à l'écran de connexion.

---

## Jeu en ligne temps réel (v11.1.0)

### Types de partie
`POST /tables` accepte `{ kind, robotIds, visibility, forTeam }` :
- `kind` : `hybride` | `acier` | `royal` (défaut `hybride`).
- `robotIds` : robots du créateur à pré-placer (1 pour hybride, 2 pour acier, 0 pour royal).
- Règle : les deux robots d'une même personne sont placés dans la MÊME équipe.

`POST /tables/:id/start` — lance la partie quand les 4 sièges sont pris
(créateur requis) ; démarre le moteur live côté serveur.

### Événements Socket.IO (canal `table:{id}`)
Émis par le serveur :
- `table:update` — table sérialisée (lobby) à chaque changement de siège.
- `table:game` — état de partie : `{ view (+ handCounts, playerNames), summary, mySeat?, myHand?, legal?, watcher?, logs }`. Les mains des autres ne sont JAMAIS envoyées.
- `table:finished` — `{ winner, gameId }`.
- `table:spectator:full`, `table:substitute`, `table:surcontre`, `table:signal`.

Émis par le client :
- `table:subscribe` / `table:unsubscribe` — le subscribe déclenche `resumeSeat`
  (le joueur de retour reprend la main de son robot substitut).
- `table:bid` `{ tableId, bid }`, `table:play` `{ tableId, card }`, `table:signal`.

### Historique
`GET /games?scope=mine|public` — parties de l'utilisateur ou publiques.
Chaque partie porte `kind` (hybride/acier/royal/local) pour les filtres.
Les parties privées ne sont accessibles qu'aux membres de l'équipe.

---

## Départ automatique, spectateurs, reprise (v11.2.0)

### Évènements socket ajoutés (canal `table:{id}`)
- `table:countdown` — `{ tableId, startsInMs }` : émis quand les 4 sièges sont
  pris ; les clients rejoignent la table à l'issue du compte à rebours (5 s).
- `table:spectators` — `{ count }` : nombre de spectateurs (abonnés non assis).

### Comportements serveur
- **Auto-départ** : `changeSeat` diffuse `table:countdown` au remplissage ; plus
  besoin de `POST /tables/:id/start` côté client (la route reste disponible).
- **Anti-blocage** : un siège robot esseulé (duo incomplet en hybride/acier) est
  libéré après 10 s si des sièges vides subsistent.
- **Départ/retour** : au `table:unsubscribe` ou à la déconnexion, le siège du
  joueur passe en substitution robot immédiatement (`markSeatLeft`) ; au
  `table:subscribe`, `resumeSeat` lui rend la main.

## Moniteur (mode développement)

- `GET /api/monitor/snapshot` → `{ at, sessions[], logs[] }`. Désactivable via
  `MONITOR_ENABLED=false`.
- Namespace socket `/monitor` : `monitor:snapshot` (à la connexion),
  `monitor:log` (chaque nouveau log), `monitor:sessions` (toutes les 2 s).
- Aucune main de joueur n'est exposée (métadonnées seulement).
