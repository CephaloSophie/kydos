# Back-Office Kydos — Manuel Technique

## 1. Vue d'ensemble

Le back-office est une application web séparée du serveur de jeu, composée de :

- **API Express** (port 3001) — sert les données via des endpoints REST sous `/admin/*`
- **Frontend Angular 19** (port 4200 en dev) — SPA avec routing côté client, thème sombre
- **MongoDB partagée** — même base `beloteKydosV14` que le serveur de jeu, via Mongoose

Les deux applications (API + frontend) sont déployées indépendamment. En production, Angular est buildé en fichiers statiques servis par un reverse proxy (nginx), et l'API tourne via PM2.

---

## 2. Architecture backend

### 2.1 Point d'entrée (`server/src/index.ts`)

L'API Express :
1. Importe tous les modèles Mongoose du serveur de jeu (`../../server/src/modules/...`)
2. Applique CORS + JSON parsing
3. Applique le rate limiter (30 req/min par IP sur `/admin`)
4. Monte les routes sous `/admin/*` avec le middleware `requireAdmin`
5. Se connecte à MongoDB et démarre l'écoute

### 2.2 Authentification (`server/src/middleware/auth.ts`)

| Élément         | Détail                                                    |
|-----------------|-----------------------------------------------------------|
| Algorithme      | JWT signé avec `HS256`                                    |
| Durée du token  | 4 heures                                                  |
| Secret          | Variable `JWT_SECRET` (défaut: `admin-secret-change-me`)  |
| Vérification    | Middleware `requireAdmin` vérifie le JWT puis `user.role === 'admin'` en BDD |

Le middleware injecte `req.adminId` (l'ObjectId de l'admin) dans la requête.

### 2.3 Rate Limiting

`express-rate-limit` appliqué sur `/admin` :
- **Fenêtre** : 60 secondes
- **Max requêtes** : 30 par IP
- **Headers** : `RateLimit-*` standards activés
- **Message** : `Trop de requêtes. Réessayez dans une minute.`

### 2.4 Audit Log (`server/src/middleware/auditLog.ts`)

Chaque action d'écriture (création, modification, suppression) est enregistrée dans la collection `adminauditlogs` :

| Champ      | Type       | Description                           |
|------------|------------|---------------------------------------|
| `adminId`  | ObjectId   | L'admin qui a effectué l'action       |
| `action`   | String     | Clé de l'action (ex: `tournament.create`) |
| `targetId` | String     | ID de l'objet impacté                 |
| `before`   | Mixed      | État avant modification               |
| `after`    | Mixed      | État après modification               |
| `meta`     | Mixed      | Données supplémentaires               |
| `at`       | Date       | Timestamp de l'action                 |

**Actions auditées** :
- `tournament.create`, `tournament.update`, `tournament.publish`, `tournament.cancel`, `tournament.delete`
- `user.credit`, `user.ban`
- `promo.create`, `promo.update`, `promo.delete`

---

## 3. Endpoints API

Tous les endpoints sont sous le préfixe `/admin`. Sauf `/admin/auth/login` et `/admin/health`, tous requièrent un header `Authorization: Bearer <token>`.

### 3.1 Authentification

| Méthode | Route                | Description       |
|---------|----------------------|-------------------|
| POST    | `/admin/auth/login`  | Login admin       |

**Body** : `{ username, password }`
**Réponse** : `{ token, admin: { id, username } }`

### 3.2 Tournois

| Méthode | Route                          | Description                     |
|---------|--------------------------------|---------------------------------|
| GET     | `/admin/tournaments`           | Liste (filtre `?status=`)       |
| GET     | `/admin/tournaments/:id`       | Détail d'un tournoi             |
| POST    | `/admin/tournaments`           | Créer un tournoi                |
| PUT     | `/admin/tournaments/:id`       | Modifier (draft: tout, finished: nom seul) |
| POST    | `/admin/tournaments/:id/publish` | Publier (draft → upcoming)    |
| POST    | `/admin/tournaments/:id/cancel`  | Annuler (upcoming → cancelled, rembourse) |
| DELETE  | `/admin/tournaments/:id`       | Supprimer (draft uniquement)    |
| POST    | `/admin/tournaments/preview-economics` | Simuler l'économie d'un tournoi |

**Règles de modification par statut** :
- `draft` — tous les champs modifiables
- `upcoming` / `live` — aucune modification autorisée (sauf annulation upcoming)
- `finished` — seul le `name` peut être édité (clarté historique)
- `cancelled` — aucune modification

**Économie** : `computeEconomics()` calcule `totalCollected`, `totalPaid`, `houseNet` via `occupantsAtPosition()`. Si `houseNet < 0`, le champ `acceptLoss: true` est requis.

### 3.3 Utilisateurs

| Méthode | Route                        | Description                |
|---------|------------------------------|----------------------------|
| GET     | `/admin/users`               | Liste paginée (search, vip, active, minBalance) |
| GET     | `/admin/users/:id`           | Détail + robots + parties  |
| POST    | `/admin/users/:id/credit`    | Crédit manuel de tokens    |
| POST    | `/admin/users/:id/ban`       | Bannir un utilisateur      |

### 3.4 Comptabilité

| Méthode | Route                           | Description                    |
|---------|---------------------------------|--------------------------------|
| GET     | `/admin/accounting/summary`     | Résumé par période (from, to)  |
| GET     | `/admin/accounting/transactions` | Liste paginée des transactions |

### 3.5 Codes Promo

| Méthode | Route                  | Description              |
|---------|------------------------|--------------------------|
| GET     | `/admin/promos`        | Liste de tous les codes  |
| POST    | `/admin/promos`        | Créer (code 12 chiffres) |
| PUT     | `/admin/promos/:id`    | Modifier                 |
| DELETE  | `/admin/promos/:id`    | Supprimer                |

### 3.6 Monitoring

| Méthode | Route                      | Description                    |
|---------|----------------------------|--------------------------------|
| GET     | `/admin/monitor/snapshot`  | Métriques temps réel           |
| GET     | `/admin/monitor/matches`   | Parties actives                |

### 3.7 Audit

| Méthode | Route            | Description                              |
|---------|------------------|------------------------------------------|
| GET     | `/admin/audit`   | Journal d'audit (page, limit, action, adminId) |

### 3.8 Health

| Méthode | Route            | Description          |
|---------|------------------|----------------------|
| GET     | `/admin/health`  | Status + état MongoDB |

---

## 4. Architecture frontend

### 4.1 Stack

- **Angular 19** avec composants standalone
- **Routing** : lazy-loaded via `loadComponent`
- **Auth** : `AuthGuard` (CanActivate) + `authInterceptor` (HttpInterceptorFn)
- **Thème** : CSS custom properties, dark theme par défaut

### 4.2 Routes

| Route                     | Composant                | Guard |
|---------------------------|--------------------------|-------|
| `/login`                  | LoginComponent           | Non   |
| `/dashboard`              | DashboardComponent       | Oui   |
| `/tournaments`            | TournamentsComponent     | Oui   |
| `/tournaments/new`        | TournamentFormComponent  | Oui   |
| `/tournaments/:id/edit`   | TournamentFormComponent  | Oui   |
| `/tournaments/:id`        | TournamentDetailComponent| Oui   |
| `/users`                  | UsersComponent           | Oui   |
| `/users/:id`              | UserDetailComponent      | Oui   |
| `/promos`                 | PromosComponent          | Oui   |
| `/accounting`             | AccountingComponent      | Oui   |
| `/monitor`                | MonitorComponent         | Oui   |

### 4.3 Services

Chaque service Angular correspond à un groupe d'endpoints API :

| Service               | Fichier                        | Endpoints couverts         |
|-----------------------|--------------------------------|----------------------------|
| `AuthService`         | `services/auth.service.ts`     | Login, logout, token mgmt  |
| `TournamentService`   | `services/tournament.service.ts`| CRUD + publish/cancel/economics |
| `UserService`         | `services/user.service.ts`     | Liste, détail, credit, ban |
| `AccountingService`   | `services/accounting.service.ts`| Summary, transactions     |
| `PromoService`        | `services/promo.service.ts`    | CRUD promos               |
| `MonitorService`      | `services/monitor.service.ts`  | Snapshot, matches actives |

### 4.4 Intercepteur HTTP

`auth.interceptor.ts` :
1. Ajoute `Authorization: Bearer <token>` à chaque requête si connecté
2. Sur réponse 401, déconnexte et redirige vers `/login`

### 4.5 Proxy de développement

`proxy.conf.json` redirige `/api/*` → `http://localhost:3001` en retirant le préfixe `/api`.

---

## 5. Déploiement production

### 5.1 PM2

Fichier `back-office/ecosystem.config.cjs` :

```bash
cd back-office
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # configurer le démarrage automatique
```

L'API backend tourne sous PM2 avec `tsx` pour le support TypeScript.

### 5.2 Nginx (exemple)

```nginx
server {
    listen 80;
    server_name admin.kydos.example.com;

    # Frontend Angular (fichiers statiques)
    location / {
        root /var/www/kydos-backoffice/dist/back-office/browser;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 5.3 Variables d'environnement

En production, définir impérativement :

```bash
export JWT_SECRET="un-secret-long-et-aleatoire-en-production"
export MONGO_URI="mongodb://user:pass@host:27017/beloteKydosV14?authSource=admin"
export ADMIN_PORT=3001
```

---

## 6. Sécurité

| Mesure                 | Implémentation                                         |
|------------------------|--------------------------------------------------------|
| Authentification       | JWT 4h, vérification role admin en BDD à chaque requête |
| Rate limiting          | 30 req/min par IP sur `/admin`                         |
| Audit logging          | Toutes les actions d'écriture tracées                   |
| CORS                   | Activé (à restreindre en production)                    |
| Mot de passe           | Hashé avec bcrypt dans le modèle User                   |
| Token stockage client  | localStorage (à considérer httpOnly cookie pour plus de sécurité) |

### Recommandations production

1. Changer `JWT_SECRET` avec une valeur aléatoire forte (>= 32 caractères)
2. Restreindre CORS aux domaines autorisés
3. Activer HTTPS (via nginx / Let's Encrypt)
4. Sécuriser MongoDB avec authentification
5. Configurer un firewall pour limiter l'accès au port 3001
