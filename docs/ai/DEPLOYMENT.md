# Déploiement & exploitation — Kýdos Belote

## 1. Prérequis

Node 20+, MongoDB 6+. Redis **optionnel** (matchmaking — repli InMemory sinon).
Pour le mobile : Android Studio (SDK 34, JDK 17) ou Xcode 15+.

## 2. Développement local

```bash
npm install
npm run seed                       # jeu de données de démo
npm run dev                        # serveur (:4000) + mobile (:5180) en parallèle

# ou séparément
npm --workspace belote-server run dev
npm --workspace belote-mobile run dev
```

Comptes créés par le seed (mot de passe `belote123`) :

| Compte | Rôle dans « Les Atouts » | Jetons |
| --- | --- | --- |
| `ameur` | propriétaire | 5000 |
| `hamid` | super administrateur | 3200 |
| `sofia` | administrateur | 2100 |
| `invite` | membre | 900 |
| `zoe` | hors équipe (invitation en attente) | 500 |

Le seed crée aussi équipes, robots, tables de lobby, tournois de démo (un par
statut), variantes de match rapide, thèmes de table, avatars et **3 codes promo**
(`1111-2222-3333` 500 ◆, `4444-5555-6666` 2 000 ◆, `9999-8888-7777` 10 000 ◆).

### Back-office (hors workspaces)

```bash
cd back-office && npx ng serve                  # SPA Angular  → :4200
cd back-office/server && npx tsx src/index.ts   # API admin    → :3001, routes /admin/*
cd back-office/server && npm run seed:admin     # crée/promeut un compte admin
```

`back-office/proxy.conf.json` redirige `/api/*` → `http://localhost:3001` en dev.
Le back-office attaque **la même base MongoDB** que le serveur de jeu.

## 3. Variables d'environnement (serveur de jeu)

Lues par `server/src/core/environment.ts` (via `dotenv`, fichier `server/.env`) :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `4000` | Port HTTP / WebSocket. |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/belote` | Base. La valeur `memory` (ou `USE_MEMORY_DB=1`) démarre un Mongo en mémoire — **dev uniquement**. |
| `JWT_SECRET` | `dev-secret-change-me` | ⚠️ **à changer impérativement en production.** |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5180` | Origines autorisées, **plusieurs séparées par des virgules**, appliquées au REST **et** aux WebSockets. `*` = tout (dev seulement). |
| `REDIS_URL` | *(vide)* | File de matchmaking Redis. Vide ou injoignable → repli `InMemoryQueue` transparent, avec log. |

Back-office : `ADMIN_PORT` (3001), `MONGO_URI`, `JWT_SECRET`.

## 4. Production

```bash
npm run tnr        # doit être vert avant tout déploiement
npm run build:mobile
```

- **Serveur** : `npm --workspace belote-server run start` derrière un reverse proxy
  (HTTPS obligatoire pour les WebSockets depuis une app native).
- **Mobile web** : servir `mobile/dist/` en statique, ou `vite preview`.
- **Mobile natif** : `mobile/dist/` embarqué par Capacitor (§5).
- **Back-office** : `npx ng build` → statique servi par nginx ; l'API tourne sous PM2.

### PM2 — état actuel des fichiers ⚠️

Le dépôt contient **deux** configurations PM2 racine qui ne décrivent pas le même
déploiement, plus celle du back-office :

| Fichier | Contenu | État |
| --- | --- | --- |
| `ecosystem.config.js` | `kydos-api` (:8881) + `kydos-mobile` (:8882), secrets en dur | Le plus récent. **Attention** : la racine est en `"type": "module"`, un `.js` en `module.exports` n'est pas chargeable tel quel. |
| `ecosystem.config.cjs` | `belote-api`, `belote-api-debug`, `belote-web`, `belote-web-dev` | Antérieur. Les deux apps `belote-web*` pointent le **workspace `web/` supprimé en v16** — inutilisables. |
| `back-office/ecosystem.config.cjs` | `kydos-backoffice-api` (:3001) | Fonctionnel. Secrets Mongo/JWT **en dur dans le fichier**. |

À trancher : garder un seul fichier racine, retirer les apps `web`, et sortir les
secrets vers `.env`. Tant que ce n'est pas fait, vérifier quel fichier est réellement
utilisé sur le VPS avant tout `pm2 reload`.

### nginx (exemple back-office)

```nginx
server {
    listen 80;
    server_name admin.kydosbelote.com;

    location / {
        root /var/www/kydos-backoffice/dist/back-office/browser;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 5. Application mobile (Capacitor)

Le `Makefile` racine enveloppe tout le cycle natif :

```bash
make check              # diagnostic mobile ↔ serveur (7 vérifications)
make ip                 # IP LAN à utiliser depuis un device physique
make android-device     # device Android branché (Wi-Fi + USB)
make android-emulator   # AVD (utilise 10.0.2.2 automatiquement)
make ios-sim            # simulateur iOS (macOS)
make cap-sync           # build web + copie dans les projets natifs
make remote REMOTE=https://api.kydosbelote.com   # cible serveur distant
make logs-android       # adb logcat filtré
```

`VITE_API_URL` doit pointer vers l'IP de la machine hôte (jamais `localhost`) pour un
device physique. Guide complet et dépannage : [`../mobile-connection.md`](../mobile-connection.md).

## 6. Intégration continue

`.github/workflows/ci.yml` — 4 jobs : `typecheck` (4 workspaces), `coverage`
(seuils bloquants), `tnr`, `tnr-server` (avec `MONGOMS_AVAILABLE=1`, donc Mongo
réel). Détail : [`TESTING.md`](./TESTING.md).

## 7. Exploitation

- `GET /health` → sonde de disponibilité.
- **Moniteur** `wslogs/` : tableau HTML autonome (sessions actives, scores, flux de
  logs services + WebSockets). Consomme `GET /api/monitor/snapshot` et le namespace
  socket `/monitor`. Désactivable par `MONITOR_ENABLED=false`.
- Le back-office a sa propre page **Monitor** (`/admin/monitor/snapshot`).
- **Verrou** `User.activeSession` : empêche deux parties simultanées, libéré à la
  persistance de fin de partie. Un verrou bloqué se voit dans la collection `users`.
- **Économie** : mises prélevées au lancement (tout ou rien, remboursement si un débit
  échoue), gains crédités en fin de partie, rake maison dans `HouseTransaction`.

## 8. ⚠️ Avant toute exposition publique

L'audit [`../DIAGNOSTIC-v14.14-production-readiness.md`](../DIAGNOSTIC-v14.14-production-readiness.md)
conclut **« ne pas exposer au public en l'état »**, et ses bloquants côté serveur de
jeu sont **toujours ouverts** :

- pas de `helmet` (aucun header de sécurité) ;
- pas de rate-limiting ;
- pas de `mongo-sanitize` (injection NoSQL possible) ;
- pas de validation d'entrée (Zod/Joi absent) ;
- JWT à **7 jours** (`server/src/shared/authentication.ts`) et secret par défaut faible.

Un point du diagnostic est en revanche **corrigé depuis** : les sockets **sont**
authentifiés (`shared/socketAuthentication.ts`, branché dans `index.ts` — JWT du
handshake vérifié, `socket.data.userId` posé, connexion refusée sinon).

Le back-office, lui, a rate limit (30 req/min/IP), audit log de toute écriture et
JWT 4 h. Ne pas présenter le serveur de jeu comme durci.

Checklist minimale avant mise en ligne : `JWT_SECRET` fort (≥ 32 caractères),
`CORS_ORIGIN` restreint aux vrais domaines, HTTPS, MongoDB authentifié et pare-feu
sur les ports 3001 / 27017, secrets sortis des fichiers PM2.
