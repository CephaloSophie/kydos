# Kydos Back-Office

Panel d'administration pour la plateforme Kydos Belote. Angular 19 (frontend) + Express (API), connecté à la même base MongoDB que le serveur de jeu.

## Prérequis

- **Node.js** >= 18
- **MongoDB** en cours d'exécution (même instance que le serveur de jeu)
- **npm** >= 9

## Installation rapide

```bash
# 1. Installer les dépendances frontend
cd back-office
npm install

# 2. Installer les dépendances backend
cd server
npm install
cd ..
```

## Variables d'environnement

| Variable      | Défaut                                      | Description                        |
|---------------|---------------------------------------------|------------------------------------|
| `MONGO_URI`   | `mongodb://localhost:27017/beloteKydosV14`   | URI de connexion MongoDB           |
| `ADMIN_PORT`  | `3001`                                       | Port de l'API back-office          |
| `JWT_SECRET`  | `admin-secret-change-me`                     | Secret JWT (changer en production) |

## Lancement en développement

```bash
# Terminal 1 — API backend
cd back-office/server
npm run dev
# → http://localhost:3001

# Terminal 2 — Frontend Angular
cd back-office
npx ng serve --proxy-config proxy.conf.json
# → http://localhost:4200
```

Le proxy Angular redirige `/api/*` vers `http://localhost:3001` (le préfixe `/api` est retiré).

## Build de production

```bash
cd back-office
npx ng build
# Artifacts dans dist/back-office/
```

Les fichiers statiques générés peuvent être servis par nginx, Apache ou tout serveur HTTP.

## Créer un compte admin

Il n'y a pas de formulaire d'inscription admin. Définir le rôle manuellement dans MongoDB :

```js
db.users.updateOne(
  { username: "votre_username" },
  { $set: { role: "admin" } }
)
```

Puis se connecter via l'interface `/login` avec les identifiants habituels.

## PM2 (production)

Un fichier `ecosystem.config.cjs` est fourni à la racine de `back-office/` :

```bash
cd back-office
pm2 start ecosystem.config.cjs
pm2 save
```

Voir `docs/backoffice/technique.md` pour la configuration PM2 complète.

## Structure

```
back-office/
├── server/                  # API Express
│   ├── src/
│   │   ├── index.ts         # Point d'entrée, montage des routes
│   │   ├── middleware/
│   │   │   ├── auth.ts      # JWT + requireAdmin
│   │   │   └── auditLog.ts  # Modèle + helper logAudit()
│   │   └── routes/
│   │       ├── auth.ts      # POST /admin/auth/login
│   │       ├── tournaments.ts
│   │       ├── users.ts
│   │       ├── accounting.ts
│   │       ├── promos.ts
│   │       ├── monitor.ts
│   │       └── audit.ts
│   ├── package.json
│   └── tsconfig.json
├── src/                     # Frontend Angular
│   ├── app/
│   │   ├── components/      # sidebar, header
│   │   ├── guards/          # auth.guard
│   │   ├── interceptors/    # auth.interceptor (JWT + 401)
│   │   ├── models/          # interfaces TypeScript
│   │   ├── pages/           # composants de pages
│   │   └── services/        # services HTTP
│   ├── styles.scss          # thème global (dark)
│   └── main.ts
├── proxy.conf.json          # proxy dev /api → :3001
├── ecosystem.config.cjs     # config PM2
└── angular.json
```

## Documentation

- `docs/backoffice/technique.md` — Manuel technique (architecture, API, sécurité)
- `docs/backoffice/fonctionnel.md` — Manuel fonctionnel (guide utilisateur)
- `docs/backoffice/ai-changelog.md` — Journal AI des modifications par commit
