# Kýdos Belote — Base de connaissance pour IA / développeurs

Ce document est **la référence unique** pour comprendre le projet.
Il s'adresse à une IA (Claude, Copilot, etc.) OU un développeur reprenant le code.

## 1. Vision produit

Kýdos Belote est un jeu de **belote contrée** haut de gamme orienté robots (IA
personnalisables) et jeu en ligne humain vs robot. Édité par **Cephalo Sophie**,
créateur de la plateforme no-code **KANTO APLO**.

- Site officiel du jeu : https://kydosbelote.com
- Éditeur : https://cephalosophie.com
- Plateforme mère : https://kantoaplo.com
- Contact : contact@cephalosophie.com

Équipe fondatrice :

| Nom | Rôle | Email |
| --- | --- | --- |
| Ameur Hamdouni | CEO & Founder & Architect | ameur.hamdouni@cephalosophie.com |
| Abdelhamid Sghaier | Co-fondateur & CTO · expert mobile | abdelhamid.sghaier@cephalosophie.com |

Clients de l'entreprise : IFPEN, La Poste, LeadsHook, Docaposte, Softia,
JCDecaux, Allianz, Genybet.

## 2. Vue d'ensemble du monorepo

```
belote/
├── packages/
│   ├── core/           # belote-core — moteur de jeu pur (règles, robots, scoring)
│   ├── application/    # cas d'usage transverses (sessions de table)
│   └── belote-table/   # table réutilisable (@kanto-aplo/belote-table)
├── server/             # belote-server — API Express + Mongo + Socket.IO
├── web/                # belote-web — application WEB (React + Vite)
│   └── src/table-pixi/ # composant TABLE Pixi (réutilisable par web ET mobile)
├── mobile/             # belote-mobile — application MOBILE (Vite + Capacitor)
├── docs/               # documentation (dont ai/ pour les IA)
└── CHANGELOG.md
```

Web et mobile sont **deux applications totalement séparées** qui partagent :
- `belote-core` (le moteur de jeu — le comportement des robots) ;
- `web/src/table-pixi/` (la table Pixi, importée dans mobile via alias `@table-pixi`).

## 3. Couches et architecture

### 3.1 belote-core (moteur — packages/core)

Moteur PUR du jeu de contrée. Aucun DOM, aucun réseau, aucune persistance.
Il est le contrat stable de tout l'écosystème (SemVer strict).

Modules clés :
- `domain/cards.ts`, `domain/types.ts` — types (Card, Seat, Suit…).
- `rules/ContreeRules.ts` — règles de contrée (obligations, atout maître…).
- `engine/GameEngine.ts` — MOTEUR : gère une partie complète (annonces →
  jeu → scores). API publique : `submitBid`, `playCard`, `collectTrick`,
  `nextDonne`, `nextManche`, `setBeloteAnnounce`, `view()`, `handOf()`,
  `legalCards()`, `toReplay()`.
- `engine/RobotDriver.ts` — `robotAct(engine, seat, algo)` : décide la
  prochaine action d'un robot (annonce/carte + temps de réflexion réaliste).
- `robot/RobotBrain.ts` — la « fiche » robot (personnalité 1–10 +
  configuration algorithmique).
- `robot/algorithm/*` — algorithmes de décision (interface pluggable).

**Contrainte critique** : le comportement des robots est piloté par
`personality: { aggressiveness, concentration, velocity }` sur une échelle
**1–10**. Toute UI qui expose une édition de robot DOIT préserver cette
sémantique.

### 3.2 belote-server (packages/server)

- Express + MongoDB (Mongoose) + Socket.IO.
- Auth JWT (endpoints `/auth/register`, `/auth/login`, `/auth/me`).
- Modules : `auth`, `user`, `robot`, `brain`, `game`, `team`, `invitation`,
  `analytics`, `competition`, `table`.
- Chaque module suit le patron `routes.ts` → `controller.ts` → `service.ts`
  → `model.ts`.

Endpoints consommés par le mobile :
- `POST /auth/login`, `POST /auth/register` → `{ token, user }`
- `GET /auth/me` → `{ user }`
- `GET /robots` → `{ robots: ServerRobot[] }`
- `POST /robots` → `{ robot: { id, name } }`
- `DELETE /robots/:id` → `{ ok: true }`
- `GET /games` → `{ games: ServerGame[] }`
- `GET /games/:id` → `{ game: ServerGame }` (avec `replay` pour le rejeu)
- `POST /games` → `{ id }`
- `GET /analytics/me` → `{ stats }`

Le modèle robot expose un champ `mobile` (`Mixed`) contenant l'avatar et les
curseurs de l'éditeur mobile — **purement présentationnel** (voir MOBILE.md).

### 3.3 belote-web (web/)

Application WEB React. Contient :
- pages : Auth, Training, TrainingV2, Tables, Robots, Team, Settings, Replay…
- `src/table-pixi/` : **composant table Pixi réutilisable** (design system table).
- `src/table/` : ancienne table DOM (référence).

### 3.4 belote-mobile (mobile/)

Application MOBILE **séparée**. Voir `docs/ai/MOBILE.md` pour l'architecture
détaillée. En résumé :
- Clean architecture stricte : `core/` → `data/` → `domain/` → `presentation/`.
- Design system Kýdos (CSS copié verbatim depuis le handoff).
- Table Pixi réutilisée via alias `@table-pixi` (mount dans `#game-table-mount`).
- Emballage Capacitor pour Android/iOS, **paysage forcé**.

## 4. Commandes essentielles

```bash
npm install
npm test                                       # tous les tests
npm --workspace belote-core   run demo         # démo moteur (Vainqueur A)
npm --workspace belote-web    run build
npm --workspace belote-web    run build:lib    # bundle table-pixi standalone
npm --workspace belote-mobile run dev          # dev server mobile (Vite)
npm --workspace belote-mobile run build        # → mobile/dist/
npm --workspace belote-mobile run cap:android
```

## 5. Conventions

- **Tests** : commentés en ANGLAIS (français partout ailleurs).
- **Versions** : bump synchronisé de tous les `package.json` + `version.ts`
  + `CHANGELOG.md`, une entrée par version dans le format existant.
- **Documentation** : mise à jour à chaque changement fonctionnel. Chaque
  fichier de code décrit son rôle en tête (bloc `/* ==== */`).
- **Aucun stub** : chaque livraison est verte (typecheck × 4 + tests + build).
- **Séparation web/mobile** : ne JAMAIS importer un composant web dans mobile
  ni l'inverse — sauf `belote-core` et `@table-pixi` (partagés explicitement).

## 6. État courant (v10.3.0)

- Application mobile complète (login réel, écurie, éditeur robot, table Pixi
  mountée, rejeu, historique, classements, compétitions vitrine, à propos).
- **Dialogue de configuration de partie** (même style que « Robot créé ! ») :
  emplacement de chaque siège (Moi / Auto / mes robots), visibilité des
  cartes (Personne / Mes robots / Tout le monde), nombre de manches
  (1 / 2 / 4 — union stricte du moteur).
- Table Pixi partagée fonctionnelle (thèmes local/vip/compétition, belote
  optionnelle, animations, bulles d'annonces par siège, feuille cahier).
- 169 tests unitaires (32 core + 63 web + 23 server + 51 mobile) + tests d'intégration Mongo (opt-in).
- Capacitor prêt (paysage forcé Android/iOS).

## 7. Tranches restantes

- **T2 (online)** : humain/robot vs humain/robot temps réel, verrou
  « une seule partie à la fois », pending/annulation, reprise par un robot
  au départ d'un joueur.
- **T3 (équipes)** : owner / super admin / admin / user, 40 membres max,
  spectateurs 5 max avec vue filtrée (jamais les cartes des autres).
- **T4 (économie)** : jetons quotidiens serveur, prélèvements 100 humain /
  50 robot, gains 150 (H×4), 225 (H×2+R×2), 150 (R×4). Replays enrichis
  (collection indépendante : events, smileys, réflexions, temps réels,
  replays publics par nom).

## 8. Référentiel de tâches (obligatoire)

`board/tasks.json` est la **base de vérité des tâches** : diagnostic
serveur/mobile, tâches faites, manquantes, bugs, priorités, versions,
estimations, historique et journaux.

- `board/BACKLOG.md` — lecture humaine du diagnostic.
- `board/board.html` — tableau interactif (recherche, filtres, détail avec
  historique et journaux). `npx serve board` puis ouvrir `board.html`.

**Toute session de travail DOIT** : lire `tasks.json`, rapprocher chaque
demande d'une tâche existante (enrichir ses `instructions`) ou en créer une,
mettre à jour `status` / `updatedAt` / `history`, puis travailler par priorité.
La mise à jour des documents est elle-même une tâche (**KB-121**).
