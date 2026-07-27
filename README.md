# Belote Contrée — plateforme full-stack

Monorepo : **moteur partagé** (TypeScript) + **couche application** + **backend Node/MongoDB modulaire** + **frontend React** + **app mobile (Vite + Capacitor)**.
Auth, robots paramétrables, entraînement local, tables en ligne temps réel, **compétitions de robots jouées en backend**, historique et rejeu, analytique des robots.

> **État courant : v11.8.0.** Le jeu en ligne temps réel est natif côté **mobile**.
> Source de vérité produit : `docs/ai/SPEC.md` · Trajectoire : `docs/ROADMAP.md` ·
> Audit croisé & défaillances : `docs/AUDIT-3AGENTS.md` · Historique : `CHANGELOG.md`.

## Structure

```
belote/
├─ packages/core/         Moteur PARTAGÉ : règles (contrée), conventions d'enchères,
│                         scoring (carte + récompense + STATS de partie), cerveau des
│                         robots, GameEngine, et la FABRIQUE `robotFromFiche`.
├─ packages/table-pixi/   Table de jeu PixiJS PARTAGÉE (web + mobile), thèmes, rendu.
├─ packages/application/  Couche application (clean/hexagonale) au-dessus du moteur.
├─ server/                Backend MODULAIRE par domaine (Express + Mongoose + Socket.IO + JWT).
├─ web/                   React + Vite. La table de jeu est un MODULE réutilisable.
├─ mobile/                App MOBILE autonome (Vite + Capacitor), design system propre,
│                         paysage uniquement. Empaquetée avec CAPACITOR (voir mobile/capacitor/).
├─ wslogs/                Moniteur temps réel (dev) : sessions actives, logs web services
│                         et WebSockets. HTML autonome + endpoint serveur /api/monitor.
├─ docs/                  Documentation (docs/ai/*) + référentiel de tâches (docs/tasks/).
└─ docker-compose.yml     MongoDB
```

**web et mobile sont totalement séparés** : aucun ne dépend de l'autre. Ils
partagent uniquement `packages/core` (moteur pur) et `packages/table-pixi`
(table PixiJS).

Le paquet `packages/core` est consommé **à l'identique** par le front et le back
(npm workspaces, alias `belote-core`). Toutes les règles vivent là, modifiables au même endroit.

## Installation & lancement

### Prérequis
- **Node.js ≥ 20** et **npm ≥ 10**
- **MongoDB** (local, Docker, ou Atlas) — ou base **en mémoire** pour tester sans Mongo
- Optionnel (prod/VPS) : **PM2** (`npm i -g pm2`), **Nginx** (reverse proxy + TLS)

### 1. Installation locale (développement)

```bash
# 1. Cloner et installer (npm workspaces : une seule commande à la racine)
git clone <repo> belote && cd belote
npm install

# 2. Configurer le backend
cp server/.env.example server/.env
#    éditer server/.env si besoin (MONGO_URI, JWT_SECRET, CORS_ORIGIN…)
#    Pour démarrer SANS Mongo : mettre USE_MEMORY_DB=true dans server/.env

# 3. Démarrer MongoDB (si non « memory »)
docker compose up -d           # lance MongoDB via docker-compose.yml
#    (ou utiliser un MongoDB déjà installé / Atlas)

# 4. (Optionnel) Données de démo
npm --workspace belote-server run seed

# 5. Lancer en mode dev (2 terminaux)
npm --workspace belote-server run dev    # API + WebSocket  → http://localhost:4000
npm --workspace belote-web run dev       # front (HMR)       → http://localhost:5173
```

Ouvrir **http://localhost:5173**.

### 2. Build de production

```bash
npm --workspace belote-web run build      # front → web/dist (statique)
# le backend tourne en TypeScript via tsx (pas de build nécessaire)
```

### 3. Déploiement sur VPS (avec PM2)

```bash
# Sur le VPS, après git pull + npm install + cp server/.env.example server/.env (édité) :
npm --workspace belote-web run build
mkdir -p logs

# Démarrer backend (prod) + frontend (preview du build)
pm2 start ecosystem.config.cjs --only belote-api
pm2 start ecosystem.config.cjs --only belote-web

# Mode debug du backend (inspector sur :9229, logs niveau debug)
pm2 start ecosystem.config.cjs --only belote-api-debug

# Gérer
pm2 logs belote-api            # voir les logs
pm2 restart belote-api         # redémarrer après un pull
pm2 status                     # état des process
pm2 save && pm2 startup        # relancer automatiquement au reboot du VPS
```

**Reverse proxy Nginx** (recommandé) : servir `web/dist` en statique et proxypasser `/api` + le WebSocket
vers `http://127.0.0.1:4000`. Penser à régler `CORS_ORIGIN` (server/.env) sur l'URL publique du front.

### 4. Variables d'environnement (server/.env)

| Variable | Défaut | Rôle |
|----------|--------|------|
| `PORT` | `4000` | Port API + WebSocket |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/belote` | URI MongoDB (`memory` pour base en mémoire) |
| `USE_MEMORY_DB` | `false` | `true` → base en mémoire (tester sans Mongo) |
| `JWT_SECRET` | `dev-secret-change-me` | Secret JWT (**à changer en prod**) |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine autorisée (URL du front) |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

Voir `server/.env.example`.

### 5. Tester l'API (TNR)

Le dossier **`server/tnr/`** contient une collection **Postman** complète, deux **environnements**
(local + VPS), et une spec **OpenAPI** à visualiser dans Swagger/Redoc. Voir `server/tnr/README.md`.

```bash
# en ligne de commande (Newman)
newman run server/tnr/belote-api.postman_collection.json -e server/tnr/env.local.postman_environment.json
```



Chaque module (`server/src/modules/<nom>`) contient son modèle, son service, son controller,
ses routes (et ses sockets si besoin), et s'enregistre en **une ligne** dans `modules/index.ts`.

```
modules/  auth · user · team · invitation · robot · table · game · analytics · competition
core/     AppModule (contrat) · environment · database · logger · HttpError · asyncHandler
          eventBus (événements de domaine) · jobQueue (file de jobs)
shared/   authentication (JWT) · socketAuthentication · levels
```

REST et WebSocket sont séparés. Ajouter/retirer un domaine n'impacte pas les autres.

## Application mobile (Capacitor)

L'app mobile (`mobile/`) est un projet **autonome** : Vite + React, son propre
design system, orientation **paysage** uniquement. Elle est empaquetée en natif
avec **Capacitor** (successeur de Cordova), qui enveloppe le build web dans un
projet Android/iOS ouvert dans Android Studio / Xcode.

```bash
# Construire l'app mobile (build web)
npm --workspace belote-mobile run build          # → mobile/dist/

# Ajouter les plateformes natives (première fois)
cd mobile
npx cap add android      # → mobile/android/
npx cap add ios          # → mobile/ios/ (macOS)
npx cap sync             # copie dist → projets natifs

# Cycle de dev
npm --workspace belote-mobile run cap:android    # build + sync + run Android
npm --workspace belote-mobile run cap:ios        # build + sync + run iOS
```

Détails complets, verrouillage de l'orientation paysage et build de production :
voir **`mobile/capacitor/README.md`**. Les dossiers natifs `mobile/android/` et
`mobile/ios/` sont générés (non versionnés) — on les recrée avec `npx cap add`.

## Moniteur temps réel (wslogs, mode dev)

Le dossier `wslogs/` contient un tableau HTML autonome d'observabilité : toutes
les sessions de jeu actives (par table, par joueur connecté), les scores, et le
flux de logs (info/warn/error) des web services et des WebSockets. Il consomme
`GET /api/monitor/snapshot` et le namespace socket `/monitor` (désactivable via
`MONITOR_ENABLED=false`). Ouvrir `wslogs/index.html`, saisir l'URL du serveur,
se connecter.

## Robots : un seul cerveau, partout

Les robots utilisent le **même moteur de décision** (`createAlgorithm`/`robotAct`, dans `packages/core`)
en entraînement (front), en partie en ligne et en compétition (back).

Pour garantir qu'un robot pense **exactement de la même façon** quel que soit l'endroit, sa fiche
stockée (personnalité **et** `algoSpec`) est transformée en robot prêt à jouer par une **fabrique unique** :
`robotFromFiche(fiche)` (dans `packages/core`). Le front (`Training`) comme le back
(`competition.runner`, `liveGame.service`) passent par cette même fonction. L'API renvoie la fiche
complète (pas seulement `id`/`name`).

À noter : à **mains identiques**, un robot joue le coup identique partout. En revanche chaque partie
distribue des cartes au hasard, donc deux parties (même en entraînement) ne se déroulent jamais pareil —
c'est voulu. Il n'y a pas (encore) de seed RNG partagé pour rejouer une partie à l'identique.

## Persistance des parties (idiome MongoDB + CQRS)

- **`Game`** = agrégat en **un seul document** : métadonnées + `participants[]` + `manches[]` (résumé).
  Petit et rapide à lister/charger.
- **`GameReplay`** = collection **froide** (même `_id`) contenant le replay rejouable + logs ;
  chargée seulement au rejeu. Écrit avant l'agrégat (le Game qui existe a forcément son replay).
- **`ParticipationFact`** = modèle de **lecture dénormalisé** (CQRS) pour l'analyse/prédiction, projeté
  depuis l'agrégat **hors chemin critique** via le bus d'événements (`game.finished`). Statut de
  projection suivi sur le Game (`pending`/`done`/`failed`) → **reconstructible** (`POST /api/analytics/rebuild`).

## Compétition de robots (100% backend)

Module `competition` : un joueur crée une table publique (max 2 actives) avec 2 robots ; un autre joueur
la rejoint avec ses 2 robots ; le match est mis en **file** et **joué entièrement côté serveur** (sans délai,
sans interaction). L'utilisateur consulte seulement le statut (en attente / en cours / terminée) puis le
résultat. Reprise au démarrage des matches interrompus. La file in-process est prête à passer en BullMQ (v7,
passage en micro-service).

## Tests & indépendance des modules

Le projet vise des **modules indépendants** (testables isolément) et des **tests unitaires autonomes** (sans réseau, sans backend, chacun se suffit à lui-même). Lancer tous les tests :

```bash
npm test                              # core + web
npm --workspace belote-core run test  # moteur : scoring + enchères/surcontre
npm --workspace belote-web run test   # front : BeloteTableClient (socket mocké)
```

- **Scoring** (`packages/core/src/scoring`) : module pur et isolé (valeur des cartes, score de donne, arrondi, contrat, capot, contre, belote), couvert par des tests.
- **Moteur** : signaux d'enchère (réflexion / répéter) et micro-phase surcontre couverts par des tests de scénario.
- **Contrôleur front** (`BeloteTableClient`) : testé avec un **socket entièrement mocké** — aucun réseau, chaque test indépendant.

Indépendance vérifiée : aucun module serveur n'importe le *service* d'un autre (uniquement des modèles, couplage de données normal) ; le couplage de comportement `game → analytics` passe par le **bus d'évènements** ; le module table front ne dépend que du design system + `belote-core`.

## Vocabulaire du projet (termes figés)

Pour éviter toute ambiguïté (un même mot a parfois deux sens en belote), ces termes sont **définis une fois** et utilisés tels quels dans le code et l'UI :

- **Donneur** : distribue les cartes ; fixe pour toute la donne.
- **Entame** : joue la première carte de la donne ; fixe ; c'est le joueur juste après le Donneur (`firstBidderSeat`) ; il deviendra Donneur à la donne suivante.
- **Meneur** : le joueur dont c'est le tour à cet instant (triangle vert) ; mobile, change à chaque pli.
- **Donne** : une distribution complète, de la donne jusqu'au dernier pli.
- **Pli** : un tour de quatre cartes.
- **Manche** : suite de donnes jusqu'à l'objectif de points.
- **Partie** : l'ensemble des manches.
- **Demande** : l'annonce d'un joueur (valeur + couleur éventuelle + signaux).
- **Réflexion** / **Répéter** : les deux signaux portés par une Demande (voir « Robots : un seul cerveau, partout »).

Les composants visuels d'un siège suivent ce vocabulaire : `LogoEspaceInfo` (logo + nom), `JetonAnnonce` (jetons Donneur/Entame + triangle Meneur), `AnnonceAnnonce` (Demande + contré/surcontré par joueur), `ContreeIcon` (bouton contré/surcontré du joueur).

## Module table publiable (`@kanto-aplo/belote-table`)

La table de jeu est aussi un **module autonome, responsive et publiable sur npm** (`packages/belote-table`), pilotable par un contrôleur `BeloteTableClient({ socketUrl, token, tableId })` : on s'abonne à une table, on lit le contexte/les events/les logs, on envoie les actions. Vue responsive (mise à l'échelle, plein écran), montage en une ligne (`mountBeloteTable`), et un mode autonome jouable sans backend (`StandaloneBeloteTable`, route de démo `/table-demo`). Build : `npm --workspace belote-web run build:lib`. Documentation complète : `packages/belote-table/README.md`.

## Démarrage

Pré-requis : Node 18+, MongoDB (Docker ou local).

```bash
npm install                       # workspaces
docker compose up -d mongo        # ou MongoDB local ; sinon MONGO_URI=memory (auto-seed)
npm run dev                       # API+WS :4000, Front :5173
```

Séparément : `npm run dev:server` / `npm run dev:web`. Seed : `npm --workspace belote-server run seed`.
Typecheck complet : `npm run typecheck`. Démo moteur : `npm --workspace belote-core run demo`.

## Limites connues (honnêteté)

- **MongoDB non testé en live dans l'environnement de build** : tout passe le typecheck strict + la démo
  moteur ; le premier run local avec Mongo est le juge de paix.
- **Bus d'événements et file de jobs sont in-process** : sur crash, la projection reste `pending`
  (rattrapable via rebuild) et les matches `running` sont repris au démarrage — mais pas de durabilité
  ni de parallélisme inter-instances tant que BullMQ/Redis n'est pas branché (v7).
- **Récompenses** : crédit par joueur en updates séparés (non atomiques) et calcul encore partiel
  (capots/contrées comptés à zéro). À durcir avant toute vraie compétition classée.
- Le **multijoueur en ligne** reste le chemin le moins éprouvé en conditions réelles.
