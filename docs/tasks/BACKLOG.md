# Kýdos Belote — Diagnostic & référentiel de tâches

> **Source de vérité : `docs/tasks/tasks.json`.**
> Ce markdown en est la lecture humaine. Le tableau interactif est
> `docs/tasks/board.html` (recherche, filtres, historique, journaux).
>
> **Règle de travail (demandée par Ameur)** — à chaque session :
> 1. lire `tasks.json` ;
> 2. rapprocher chaque nouvelle demande d'une tâche existante — enrichir ses
>    `instructions` si c'est la même chose, créer une tâche sinon ;
> 3. estimer la priorité, mettre à jour `status`, `updatedAt` et `history` ;
> 4. travailler par ordre de priorité (P0 d'abord) ;
> 5. la mise à jour des documents est elle-même une tâche (**KB-121**).

Ouvrir le tableau : `npx serve docs/tasks` puis `board.html`
(ou l'ouvrir directement et sélectionner `tasks.json` quand il le demande).

---

## 1. Diagnostic serveur — ce qui EXISTE

Routes réellement montées (relevé automatique, 56 routes) :

| Module | Routes | État |
| --- | --- | --- |
| **auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /settings` | ✅ complet |
| **robot** | `GET/POST /robots`, `GET/PUT/DELETE /robots/:id` | ✅ complet |
| **game** | `GET/POST /games`, `GET /games/:id`, `GET /games/public?q=` | ✅ complet |
| **table** | `GET/POST /tables`, `GET /tables/:id`, `POST /tables/:id/seat\|start\|leave\|cancel` | ✅ complet |
| **team** | `GET/POST /teams`, `GET /teams/mine`, `GET/PUT /teams/:id`, `POST /teams/:id/join\|leave\|invite`, `GET /teams/:id/invitations`, `DELETE /teams/:id/members/:userId`, `PUT /teams/:id/members/:userId/role` | ✅ complet |
| **invitation** | `GET /invitations`, `POST /invitations/:id/accept\|decline` | ✅ complet |
| **competition** | `GET /competitions`, `GET /competitions/mine`, `GET /competitions/:id`, `POST /competitions`, `POST /competitions/:id/join\|cancel` | ✅ complet (moteur de match automatique) |
| **wallet** | `GET /wallet`, `POST /wallet/claim` | ✅ complet |
| **user** | `GET /users/search`, `GET /users/:id/profile` | ✅ complet |
| **brain** | `GET/POST /brains`, versions, clone, activation | ✅ complet |
| **analytics** | `GET /analytics/me`, `GET /analytics/robots/:id`, `POST /analytics/rebuild` | ✅ complet |
| **sockets** | `table:subscribe\|unsubscribe\|bid\|play\|signal`, diffusion filtrée spectateurs (max 5) | ✅ complet |

## 2. Diagnostic serveur — ce qui MANQUE

| Manque | Tâche | Priorité |
| --- | --- | --- |
| Les **mises ne sont jamais prélevées** : `walletService.stake()` n'a aucun appelant en production (seuls les gains sont versés) | **KB-071** | P1 |
| Aucun endpoint pour définir le **robot favori** (`User.favoriteRobot` existe et est sérialisé, mais rien ne l'écrit) | **KB-063** | P1 |
| Aucun **classement de robots** (ELO / victoires) — l'écran mobile affiche donc un podium codé en dur | **KB-151** | P2 |

## 3. Diagnostic mobile — ce qui EXISTE

13 écrans : Connexion, Accueil, Table, Mes robots, Créer un robot, Classements,
Compétitions, Historique, À propos, Rejeu, Porte-monnaie, Équipes, Mon équipe,
Jouer en ligne. Endpoints consommés : `auth/*`, `robots`, `games`,
`games/public`, `tables/*`, `teams/*`, `wallet/*`, `analytics/me`.

Fonctionnalités livrées : mapping curseurs↔moteur sans perte, dialogue de
configuration de partie (sièges tactiles, visibilité, manches 1/2/4), overlay de
logs, bannière « Partie en cours », porte-monnaie serveur-premier, gestion
d'équipe avec rôles, lobby en ligne, table Pixi partagée.

## 4. Diagnostic mobile — ce qui MANQUE

Classé par priorité. **Le point commun : plusieurs API serveur complètes ne sont
pas exploitées côté mobile.**

| Manque | Tâche | Priorité |
| --- | --- | --- |
| **Menus de l'accueil** : équipes, invitations, en ligne, compétitions et jetons ne sont accessibles que par l'éventail | **KB-100** | P0 |
| **Invitations d'équipe** : 5 endpoints serveur (`/invitations`, accept, decline, invite, liste) totalement inutilisés | **KB-042** | P0 |
| **Compétitions réelles** : l'écran est une vitrine statique alors que le moteur de compétition serveur est complet | **KB-050** | P0 |
| **Démarrer une table** en ligne (`POST /tables/:id/start` jamais appelé) | **KB-051** | P0 |
| **Client socket** pour jouer réellement en ligne depuis le mobile | **KB-052** | P0 |
| **Recherche d'utilisateurs** et profil public (prérequis des invitations) | **KB-043** | P1 |
| **Modifier / supprimer** un robot (API présente, aucun écran) | **KB-004** | P1 |
| **Robot favori** sélectionnable | **KB-063** | P1 |
| **Recherche de replays publics** (`publicReplays()` écrit, jamais utilisé) | **KB-091** | P2 |
| **Écran spectateur** | **KB-081** | P2 |
| **Classements réels** au lieu du podium de démonstration | **KB-150** | P2 |
| **Réglages** utilisateur (`PUT /settings`) | **KB-140** | P3 |
| **Statistiques de robot** (`/analytics/robots/:id`) | **KB-141** | P3 |
| **Cerveaux (brains)** — arbitrage produit nécessaire | **KB-142** | P3 |

## 5. Bugs traités

| Bug | Cause réelle | Tâche | État |
| --- | --- | --- | --- |
| 404 sur `/auth/me` et `/wallet` | **Aucun middleware d'erreurs** dans `app.ts` ; les services levaient `notFound()` quand le compte du jeton n'existait plus | **KB-030** | corrigé, testé |
| Table Pixi vide, HUD collé en haut-gauche | La taille était déléguée au ResizePlugin de Pixi, qui n'observe **que la fenêtre** — le renderer restait 0×0 | **KB-020** | corrigé, testé |
| « Rejeu introuvable » systématique | `ReplayScreen` lisait `replay.donnes` alors que le moteur renvoie `manches[].donnes[]` | **KB-031** | corrigé, testé |
| Spectateurs voyaient toutes les mains | `broadcastState` envoyait `allHands` aux non-assis | **KB-080** | corrigé |
| Cartes à paliers fixes, débordements | Tailles non proportionnelles au feutre | **KB-021** | corrigé, testé |

## 6. Contraintes d'environnement (pas des défauts de code)

| Contrainte | Conséquence | Tâche |
| --- | --- | --- |
| `cdn.playwright.dev` bloqué (HTTP 403) | Aucune capture d'écran ni test navigateur possible ici ; validation faite en **DOM réel (happy-dom) + faux serveur** | **KB-112** |
| `fastdl.mongodb.org` bloqué | Les tests d'intégration Mongo sont écrits mais non exécutables ici (`MONGOMS_AVAILABLE=1` en local) | **KB-113** |

## 7. Couverture de tests

| Workspace | Tests |
| --- | --- |
| `belote-core` | 53 (dont 21 scénarios de jeu : belote, réflexion, contre, donne complète, replay) |
| `belote-web` | 67 |
| `belote-server` | 23 purs + intégration écrite (opt-in Mongo) |
| `belote-mobile` | 78 (dont 27 E2E sur les 12 écrans avec faux serveur) |
| **Total** | **221** |

## 8. Prochaine session — ordre imposé par la priorité

1. **KB-100** menus de l'accueil *(en cours)*
2. **KB-042** invitations d'équipe + **KB-043** recherche d'utilisateurs
3. **KB-050** compétitions réelles
4. **KB-051** démarrer une table, puis **KB-052** client socket
5. **KB-071** prélèvement des mises, **KB-063** robot favori
