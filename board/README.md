# Bord — Backoffice de tâches (Kýdos Belote)

Outil de gestion de tâches interne : liste, édition, historique versionné.
Deux comptes seed (**ameur** + **hamido**, mot de passe `@kantoA123`).

Chaque modification de tâche est **archivée automatiquement** : snapshot complet
AVANT modif + delta champ par champ + auteur + horodatage. Rien n'est jamais
perdu — l'onglet **Historique** de chaque tâche répond à « qui a changé quoi et
quand ».

---

## Architecture

```
board/
├── ecosystem.config.cjs        ← config PM2 (2 processus)
├── tasks.json                  ← référentiel snapshot (versionné dans Git)
├── BACKLOG.md · board.html     ← exports générés
│
├── server/                     ← API Express + Mongo (port 4100)
│   ├── src/
│   │   ├── core/               ← env, HttpError, mongo, asyncHandler
│   │   ├── shared/authentication.ts   ← JWT + middleware
│   │   └── modules/
│   │       ├── auth/           ← login (2 comptes seed)
│   │       ├── users/          ← BordUser (Mongo)
│   │       ├── tasks/          ← CRUD + archivage automatique
│   │       └── archive/        ← consultation historique
│   ├── scripts/import-tasks.ts ← seed idempotent (comptes + import JSON)
│   ├── .env                    ← MONGO_URI, JWT_SECRET, CORS_ORIGIN
│   └── package.json
│
└── web/                        ← SPA Vite + TS (port 4200)
    ├── src/
    │   ├── main.ts             ← router hash
    │   ├── core/               ← api, dom, theme
    │   ├── components/         ← TopBar, ThemePicker
    │   ├── views/              ← LoginView, BoardView, TaskModal
    │   └── styles/             ← global.css + themes.css (4 thèmes)
    ├── public/favicon.svg
    └── index.html
```

**Base Mongo** : `bordjira` (séparée de la base `belote` du jeu).

---

## Prérequis

- **MongoDB** en écoute sur `mongodb://root:toor@127.0.0.1:27017`
  (utilisateur `root`, mot de passe `toor`, base `bordjira`, authSource `admin`).
- **Node.js** ≥ 20.
- **PM2** installé globalement : `npm install -g pm2`.

---

## Installation & premier lancement

```bash
cd board

# 1) dépendances
npm --prefix server install
npm --prefix web install

# 2) créer les 2 comptes + importer tasks.json dans Mongo
npm --prefix server run seed
#   ✓ ameur (admin)
#   ✓ hamido (admin)
#   ✓ N tâches importées depuis ../tasks.json

# 3) construire le front (obligatoire avant PM2 : vite preview sert le build)
VITE_API_URL=http://localhost:4100/api npm --prefix web run build

# 4) lancer les deux processus PM2
pm2 start ecosystem.config.cjs

# 5) suivre les logs
pm2 logs                        # tous
pm2 logs bord-api               # API seule
pm2 logs bord-web               # web seul

# 6) démarrage automatique au boot (optionnel)
pm2 save
pm2 startup                     # suivre l'instruction affichée
```

L'application est ensuite accessible sur :

- **Front** : http://localhost:4200
- **API** : http://localhost:4100/api/health

---

## Commandes PM2 utiles

```bash
pm2 status                      # tableau des processus
pm2 restart bord-api            # redémarrer un seul
pm2 stop all                    # tout arrêter
pm2 delete all                  # tout supprimer (arrêt + oubli)
pm2 reload ecosystem.config.cjs # zero-downtime restart
pm2 flush                       # vider les logs
```

Les logs sont écrits dans `board/server/logs/` et `board/web/logs/`
(créés automatiquement au premier démarrage).

---

## Comptes seed

| Identifiant | Mot de passe | Rôle |
| --- | --- | --- |
| `ameur` | `@kantoA123` | admin |
| `hamido` | `@kantoA123` | admin |

Les mots de passe sont hashés en bcrypt côté Mongo. Pour les changer,
relance le seed après avoir modifié `scripts/import-tasks.ts`.

---

## API

Tous les endpoints (sauf `/health` et `/auth/login`) exigent
`Authorization: Bearer <token>`. Le token est délivré par `POST /auth/login`
et valide 12 h.

### Auth

| Méthode | Chemin | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Corps `{ username, password }` → `{ token, user }` |
| `GET` | `/api/auth/me` | Utilisateur courant |

### Tasks

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/tasks` | Liste (filtres : `status`, `priority`, `version`, `area`) |
| `GET` | `/api/tasks/:taskId` | Détail |
| `POST` | `/api/tasks` | Créer (corps = fields + `taskId` unique) |
| `PATCH` | `/api/tasks/:taskId` | Modifier (corps = fields + `note?` optionnelle) |
| `DELETE` | `/api/tasks/:taskId` | Supprimer (archivage final) |
| `GET` | `/api/tasks/:taskId/archive` | Historique de la tâche (récent → ancien) |

### Archive globale

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/archive/recent?limit=100` | Fil d'activité (tous auteurs) |
| `GET` | `/api/archive/by/:username` | Modifications d'un utilisateur |

---

## Contrat d'archivage

À chaque `PATCH /tasks/:id` réussi ET impliquant un vrai changement :

1. Un document `TaskArchive` est créé avec :
   - `snapshot` : état COMPLET de la tâche AVANT modification
   - `diff[]` : tableau `{ field, before, after }` des champs qui ont changé
   - `modifiedBy` : username (extrait du JWT)
   - `modifiedAt` : horodatage serveur
   - `note?` : commentaire optionnel envoyé dans le corps de la requête
   - `revision` : révision AVANT modification
2. La tâche est mise à jour, son compteur `revision` est incrémenté, et
   son champ `lastModifiedBy` est renseigné.
3. Une entrée légère est aussi ajoutée à `task.history[]` (survol rapide).

Une suppression (`DELETE /tasks/:id`) archive un dernier snapshot avec la
note `« suppression »` avant l'effacement.

---

## Développement

```bash
# API en watch (redémarre à chaque save)
npm --prefix server run dev

# Front en hot-reload (proxy /api → :4100)
npm --prefix web run dev

# Tests unitaires
npm --prefix server run test
```

En dev, `web` proxifie `/api` vers `http://127.0.0.1:4100` (voir
`web/vite.config.ts`) donc pas besoin de `VITE_API_URL`.

En prod (PM2 + `vite preview`), le proxy n'existe pas → build avec
`VITE_API_URL=http://localhost:4100/api` (ou l'URL publique de l'API).

---

## Thèmes

4 thèmes disponibles, changeables en un clic depuis la barre supérieure :

- **Ubuntu sombre** (défaut) — orange `#e95420` + aubergine `#77216f`
- **Ubuntu clair** — même palette, fond crème
- **Mac sombre** — bleu système `#0a84ff` + gris neutres
- **Mac clair** — variante claire équivalente

Le choix est persisté dans `localStorage` (`bord.theme`).
