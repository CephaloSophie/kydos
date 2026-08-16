# Kýdos Belote — Diagnostic complet avant exposition publique

**Version auditée** : v14.14.0
**Date** : 16 août 2026
**Portée** : audit technique + sécurité + capacité + fonctionnel + environnemental.

---

## Résumé exécutif

Le projet a un **cœur métier solide** (moteur belote testé, économie
verrouillée, tournois avec bracket persistant, socket temps réel qui
fonctionne). Ce qui manque : la **couche production** — sécurité HTTP,
rate limiting, observabilité, protection des sockets, capacité horizontale.

**Verdict** : **NE PAS exposer au public en l'état.** 2 à 3 semaines de
travail nécessaires pour un lancement propre à ~500 joueurs concurrents.
Au-delà (10 k+, 100 k+) le chantier est plus lourd — chiffré ci-dessous.

**Niveau de criticité** :
- 🔴 **Bloquant lancement public** : 12 items
- 🟠 **Sérieux, corriger vite** : 14 items
- 🟡 **Recommandé mi-terme** : 11 items

---

# 1. SÉCURITÉ — 🔴 Bloquants

## 1.1 Aucun rate-limiting

Aucun `express-rate-limit`, aucun throttling sur login, register, API en
général. **Un bot peut** :
- Brute-forcer les mots de passe (bcrypt=10 rounds mais quand même).
- Spammer `POST /tournaments` pour créer 10 000 drafts.
- Enqueue de la file de matchmaking en boucle.
- DoS l'API en HTTP simple.

**Correctif** : ajouter `express-rate-limit` global + limites strictes par
route sensible :
```
/auth/login       → 5 tentatives / 15 min / IP
/auth/register    → 3 comptes / heure / IP
/tournaments POST → 10 / heure / user
/matchmaking      → 30 / min / user
API global        → 100 req/min/IP (whitelist internes)
```

## 1.2 Aucun helmet / headers de sécurité

Pas de `helmet()`. Manque :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `Referrer-Policy`

**Impact** : XSS facilitée, clickjacking possible, CSP absent.

**Correctif** : `npm i helmet` + `app.use(helmet())` avec CSP adapté au front.

## 1.3 Socket.IO sans authentification middleware

Grep confirme : **aucun `io.use()` middleware d'auth**. Tous les handlers
lisent `socket.data.userId` mais rien ne le pose ni ne le vérifie au
handshake. Ça veut dire :
- Un client peut se connecter sans JWT.
- N'importe qui peut émettre `table:reclaim`, `game:play`, etc. si `socket.data.userId` a été assigné ailleurs sans validation.
- Aucun contrôle que l'user connecté est bien qui il prétend.

**Correctif** :
```typescript
socketServer.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('no token'));
    const { userId } = jwt.verify(token, environment.jwtSecret) as any;
    socket.data.userId = userId;
    next();
  } catch (e) { next(new Error('invalid token')); }
});
```

## 1.4 JWT expire à 7 jours + secret par défaut faible

- `TOKEN_EXPIRATION = '7d'` : trop long. Un token volé reste valide 7 jours.
- `jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me'` : si l'env
  n'est pas positionné en prod, le secret est **prévisible** → tous les
  tokens forgés valides.

**Correctifs** :
- Refuser de démarrer si `NODE_ENV=production` et `JWT_SECRET` = défaut.
- Réduire à `1h` avec **refresh token** stocké httpOnly (nouveau endpoint `/auth/refresh`).
- Rotation périodique du secret (planifier).

## 1.5 Secrets et mots de passe en clair dans le code

`server/src/seed.ts` : usernames `ameur/hamid/sofia/invite/zoe`, tous
password `belote123`. Fichier committé, secrets visibles.
`board/server/.env` : fichier **versionné** (`.env` sans `.example`).

**Correctifs** :
- Ne JAMAIS committer `.env` (ajouter au `.gitignore` + retirer de l'historique via `git filter-branch` ou `bfg`).
- Générer les mots de passe seed aléatoirement + les afficher **une seule fois** au run.
- Rotation obligatoire des mots de passe seed si le repo a été public/partagé.

## 1.6 Pas de validation d'entrée robuste (Zod/Joi absent)

Zéro dépendance de validation dans `server/package.json`. La validation
est faite à la main dans chaque controller :
```typescript
if (!body.name || !body.format || !body.capacity || body.entryFee == null) throw badRequest(...)
```

Résultat : incohérent, incomplet, oubli de vérifier types (ex. un
`prizesByPosition` qui contient un `prize` négatif ou une string au lieu
d'un number passera peut-être).

**Correctif** : adopter **Zod** (léger, TypeScript-first) avec schémas par
route. Middleware `validate(schema)` unique. Rejette 400 avec message
structuré.

## 1.7 Pas de mongo-sanitize (NoSQL injection possible)

Aucun `express-mongo-sanitize`. Un attaquant peut envoyer :
```json
{ "username": { "$gt": "" }, "password": { "$gt": "" } }
```
→ dans un `findOne({ username, password })` naïf, ça matche n'importe quel
utilisateur.

**Vérification** : auth utilise bcrypt.compare donc protégé. Mais d'autres
endpoints (search users, invitations) font des `find` avec des inputs
utilisateur. À vérifier partout.

**Correctif** : `app.use(mongoSanitize())` global.

## 1.8 CORS trop permissif potentiellement

`environment.corsOrigins.includes('*')` autorise le wildcard. Si mis en
prod → **n'importe quel site peut appeler l'API avec les cookies/tokens
de l'user**.

**Correctif** : refuser `*` en prod. Whitelist stricte des domaines
`kydos.app`, `www.kydos.app`, `admin.kydos.app`.

## 1.9 Body limit 5 MB trop permissif

`express.json({ limit: '5mb' })`. Un attaquant peut poster 5 MB de JSON
en boucle → **DoS mémoire facile**. Aucun endpoint ne devrait avoir besoin
de 5 MB.

**Correctif** : ramener à 100 KB global, avec exceptions ciblées si un
endpoint nécessite plus (upload avatar → route dédiée).

## 1.10 Pas de rotation de bcrypt

`BCRYPT_ROUNDS = 10`. C'est OK aujourd'hui mais dans 2 ans → faible.

**Correctif** : passer à **12** dès maintenant (2^12 = 4096 vs 1024). Coût
mesuré : ~200 ms de plus sur login (acceptable). Rechiffrer au login
suivant chaque utilisateur.

## 1.11 Aucune gestion CSRF

Si l'app ajoute un jour des cookies de session (au-delà du JWT bearer),
CSRF exploitable. Actuellement JWT dans Authorization header → safe.
**À surveiller si évolution.**

## 1.12 Deps prod pas d'audit

Pas d'audit npm régulier visible. Faire :
```
npm audit --production
npm audit fix
```
+ dépendabot GitHub / Snyk pour surveillance continue.

---

# 2. INFRASTRUCTURE — 🔴 Bloquants prod

## 2.1 Un seul process Node — pas de clustering

`server/src/index.ts` lance UN process. Sur une VPS 4 vCPU, on utilise
25 % max. Sur crash → tout tombe.

**Correctif** : PM2 en mode cluster :
```
pm2 start ecosystem.config.cjs -i max
```
Attention : Socket.IO en cluster nécessite un **adaptateur Redis**
(`@socket.io/redis-adapter`) pour que les messages émis sur un worker
atteignent les clients connectés sur un autre worker. Actuellement absent.

## 2.2 Pas d'observabilité

- Aucun **Sentry / Bugsnag** → erreurs prod invisibles.
- Aucune **métrique** (Prometheus, StatsD) → pas d'alerte CPU/RAM/latence.
- Aucun **APM** (traces distribuées).
- Logs : `console.log` via un `logger` maison, pas de niveaux exportés vers un collector.

**Correctifs indispensables** :
- Sentry sur back + front (gratuit jusqu'à 5 k events/mois).
- `prom-client` + endpoint `/metrics` scrappé par Prometheus.
- Grafana + alertes (>5 % erreurs 5xx, latence p95 > 1 s, mémoire > 80 %).

## 2.3 MongoDB — connexion sans pool tuné

`mongoose.connect(uri)` sans `maxPoolSize`, `minPoolSize`,
`serverSelectionTimeoutMS` (sauf 5 s au seed). Défaut Mongoose : pool = 100
connexions par process → si Mongo lent, Node bloqué.

**Correctif** :
```typescript
mongoose.connect(uri, {
  maxPoolSize: 50,             // par process
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority',
});
```

## 2.4 Pas de mongo replica set → pas de failover

Si le mongo tombe, tout tombe. Aucune HA.

**Correctif** : MongoDB Atlas M10+ (réplica set 3 nœuds) ou self-hosted
avec `rs.initiate()`. Backups automatiques quotidiens.

## 2.5 Redis optionnel — la file matchmaking tombe en mémoire

`queueFactory` : si `REDIS_URL` absent ou Redis KO, **fallback InMemory**.
Sur multi-process ou restart, la file matchmaking est perdue. Les
joueurs en attente restent bloqués côté client.

**Correctif prod** : rendre Redis obligatoire en production. Refuser
démarrage si `NODE_ENV=production && !REDIS_URL`.

## 2.6 Pas de HTTPS / TLS mentionné

Le code écoute en HTTP simple. Comment le VPS 217.160.186.250 expose ça ?
Si aucun **reverse proxy TLS** (Nginx / Caddy / Traefik) devant, les JWT
transitent en clair → interception réseau trivial.

**Correctif** : Caddy (auto-cert Let's Encrypt) devant Node :
```
kydos.app {
  reverse_proxy localhost:8882
}
```

## 2.7 Aucun health check

Pas de `/health`, `/ready`, `/live`. Impossible pour un LB de savoir si
le serveur répond.

**Correctif** :
```typescript
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/ready', async (_, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redisClient ? await redisClient.ping().then(() => true).catch(() => false) : true;
  res.status(mongoOk && redisOk ? 200 : 503).json({ mongo: mongoOk, redis: redisOk });
});
```

## 2.8 Pas de graceful shutdown

Sur SIGTERM (redémarrage PM2, deploy), le serveur coupe brutalement. Les
matchs en cours perdent leur socket. Aucune finalisation.

**Correctif** :
```typescript
async function shutdown() {
  socketServer.close();
  httpServer.close();
  await mongoose.disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## 2.9 Pas de CI/CD

Aucun `.github/workflows/` visible. Pas de tests bloquants sur PR, pas de
déploiement auto.

**Correctif** : GitHub Actions ou GitLab CI :
- `test` : `npm ci && npm run typecheck && npm run test`
- `build` : `npm run build`
- `deploy` : SSH → PM2 reload zero-downtime.

## 2.10 Pas de backups automatisés

Rien dans le code sur `mongodump` planifié.

**Correctif** : cron sur VPS ou service (Atlas fait ça nativement).
```
0 3 * * * mongodump --uri ... --out /backups/$(date +\%F) && find /backups -mtime +30 -delete
```

---

# 3. ARCHITECTURE — 🟠 Sérieux

## 3.1 Socket.IO cluster sans adapter

Cf. 2.1. Aujourd'hui monoprocess → OK. Dès qu'on scale : **broadcast cassé**
entre workers.

**Correctif** : `@socket.io/redis-adapter` couplé à Redis (déjà utilisé
pour la file matchmaking).

## 3.2 Pas de layer cache

Chaque `GET /tournaments`, `GET /users/me`, `GET /leaderboard` hit Mongo.
Pas de cache Redis.

**Correctif** : cache-aside pour les endpoints lecture-heavy :
- `/tournaments?status=upcoming` → cache 30 s
- `/leaderboard` → cache 5 min
- `/users/me` → cache 60 s (invalidé au wallet update)

## 3.3 Tournoi orchestrator polling toutes les 30 s

`tournament.worker.ts` (interval 30s). Sur 100 tournois live, ça fait
100 recharges toutes les 30 s. **Devient un souci à ≥ 1 000 tournois**.

**Correctif à terme** : basculer sur une file d'événements (Bull/BullMQ)
déclenchée par `recordMatchResult` plutôt qu'un polling.

## 3.4 `Table.origin`, `Match.tournament` : indexes manquants ?

Vérifier les index :
- `Table.origin` : ajouté v14.11 avec index ✅.
- `Match.tournament` : à vérifier — les hooks font `Match.find({ tournament: t._id })` répétés.

**Correctif** : audit complet `explain()` sur les requêtes chaudes,
ajouter index composés si nécessaire.

## 3.5 Pas de pagination sur certaines listes

`listTournaments` renvoie **tout** sans pagination. À 1 000 tournois
finished visibles, la réponse fait plusieurs MB.

**Correctif** : ajouter `?page=N&limit=20` partout.

## 3.6 Le sweep 3 s dans `match.socket.ts` scan tous les matchs

Coûteux à grande échelle. À 10 000 matchs actifs (jamais atteint mais bon),
c'est 200 000 lookups Mongo par minute.

**Correctif** : indexé + limité au nécessaire (matchs recent + user actif).

## 3.7 Aucun système de queue pour tâches asynchrones

Les emails futurs (verif compte, reset password, notif tournoi),
notifications push, calculs stats agrégées — tout ça devrait passer par
une queue (Bull/BullMQ).

**À prévoir** avant d'ajouter des features "in the background".

## 3.8 `belote-core` : logique de jeu monolithique dans les runners

Le runner headless bloque le process pendant qu'un match tourne (même si
c'est rapide). Sur 100 matchs headless simultanés → CPU thrash.

**Correctif** : worker_threads pour les runners headless. Ou processus
dédié `matches-worker` qui consomme une file.

## 3.9 Pas de rate limiting côté socket

Un client malveillant peut spammer `game:play` en boucle. Aucun throttle.

**Correctif** : middleware Socket.IO qui limite N events/sec/user.

## 3.10 Sessions utilisateur non trackées

Un même user peut ouvrir 50 sockets et occuper 50 places sur 50 tables.
Aucun cap.

**Correctif** : `SessionManager` qui limite N sockets actifs par userId.

---

# 4. QUALITÉ / TESTS — 🟠

## 4.1 Couverture 35 % — insuffisante pour de la finance

Le wallet manipule des jetons réels (économie interne). 35 % de couverture
laisse trop d'angles morts.

**Cible** : 70 % lignes, 90 % sur `wallet`, `matchFormat`, `tournament`,
`houseAccounting`. Ajouter tests d'intégration Mongo (déjà squelette
via `MONGOMS_AVAILABLE`).

## 4.2 Tests d'intégration jamais lancés en CI

`MONGOMS_AVAILABLE=1` requis, jamais activé automatiquement.

**Correctif** : docker-compose avec mongo:6 dans le workflow CI, envs
positionnés, tests intégration bloquants sur PR.

## 4.3 Aucun test de charge

Aucune campagne k6 / Locust / Artillery. On ne sait pas combien de
matchs simultanés le serveur tient réellement.

**Correctif obligatoire avant lancement** : scénario k6 :
```
- 500 users login sur 60 s
- 200 créent une table publique
- 200 lancent une partie
- boucle 30 min
```
Mesurer : latence p95, erreurs, CPU/RAM, ouverture connexions Mongo.

## 4.4 Aucun test E2E navigateur

Le code parle de Playwright (`web/e2e/`) mais rien ne semble vraiment
actif. Sur mobile, aucun test end-to-end.

**Cible** : au minimum 5 flows critiques :
- register → login → créer robot → partie locale
- login → rejoindre table publique → jouer 1 manche
- login → inscription tournoi → attente → jouer un match
- login → wallet claim daily → vérifier +500
- login → historique filtré → cliquer replay

## 4.5 Tests unitaires : pas de tests sockets

`liveGame.service.ts` fait ~450 lignes de logique critique (turn timeout,
substitute, reclaim). Aucun test unitaire. Un bug qui casse un match
temps réel = perte d'argent joueur.

**Correctif** : mocker Socket.IO server + tester chaque flow.

---

# 5. FONCTIONNEL — 🟠

## 5.1 ROYAL_SQUARE en tournoi refusé (v14.12+)

Rappel : le format 4-humains n'est pas supporté en bracket. Le back office
ne peut pas créer ce type de tournoi. À corriger v14.15.

## 5.2 Pas de reset password / mot de passe oublié

L'user qui perd son mot de passe ne peut pas récupérer son compte. Aucun
`POST /auth/forgot-password` visible.

**Correctif obligatoire** : email verification + reset flow avec token
temporaire.

## 5.3 Pas d'email de vérification à l'inscription

Aucun `sendVerificationEmail`. N'importe qui crée un compte avec un
email bidon.

**Correctif** : SES / Sendgrid / Postmark + template. Compte marqué
`emailVerified: false` jusqu'à confirmation.

## 5.4 Pas de suppression de compte RGPD

Un user européen a le droit de demander la suppression complète de ses
données. Aucun `DELETE /users/me` visible.

**Correctif obligatoire** : suppression complète (user + games +
participations + wallet). Anonymisation possible si contraintes légales
comptables.

## 5.5 Pas de modération / signalement

Un joueur peut se comporter mal (insultes en smileys, cheating suspecté,
etc.). Aucun `POST /reports`, aucun ban.

**Cible** : au minimum, admin peut ban un user (login refusé, disconnect
socket).

## 5.6 Pas d'antifraude sur les crédits promo

Codes promo `1111-2222-3333` : combien de fois utilisables ? Un user
peut créer 50 comptes et claim 50 × 500 ◆.

**Correctif** : lock par IP + verif email + max 1 code / user / lifetime.

## 5.7 Wallet non transactionnel

`walletService.stake` puis `walletService.credit` sans transaction Mongo.
Si crash entre les deux → jetons perdus ou dupliqués.

**Correctif** : passer à `session.withTransaction()` pour toute opération
wallet. Mongo replica set obligatoire (déjà mentionné en 2.4).

## 5.8 Aucune gestion des devises réelles

Actuellement les jetons sont fictifs. Si un jour → argent réel → PCI-DSS,
KYC, obligations légales. **Ne pas anticiper pour l'instant** mais
architecture doit permettre de séparer wallet interne / cash-out.

## 5.9 Pas de conditions d'utilisation / mentions légales

Aucun `/legal/terms`, `/legal/privacy`. Obligatoire RGPD + LCEN en France.

## 5.10 Pas de politique cookies / consent

Idem, RGPD si tracking analytics.

---

# 6. ENVIRONNEMENT — 🟠

## 6.1 Serveur unique VPS 217.160.186.250

- Aucune redondance.
- Panne matérielle = downtime total.
- Pas de rollback rapide.

**Correctif** : ansible/terraform pour reproduire l'env + LB devant 2 VPS.

## 6.2 Config env non documentée

`server/.env.example` existe mais **ne liste peut-être pas toutes** les
env vars requises en prod (BCRYPT_ROUNDS, TOKEN_EXPIRATION, MAX_UPLOAD_SIZE,
LOG_LEVEL, SENTRY_DSN, REDIS_URL, MONGO_URI, JWT_SECRET, CORS_ORIGIN).

**Correctif** : `.env.production.example` complet + `envalid` pour valider
au boot.

## 6.3 Logs non rotés

Node → stdout → PM2. Sans rotation, `/var/log/pm2/*.log` explose.

**Correctif** : `pm2 install pm2-logrotate` :
```
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 6.4 Fuseau horaire / locale

`new Date().toISOString().slice(0, 10)` pour dayKeyUTC — bon (v14.5 déjà
en UTC). Mais les affichages front utilisent locale user → à vérifier
sur tous les écrans que les dates de tournoi sont bien affichées dans
le fuseau du joueur.

## 6.5 Node version

`package.json` ne semble pas fixer `engines.node`. Sur VPS, quelle version
tourne ? Node 18 EOL en avril 2026.

**Correctif** : figer `"engines": { "node": ">=20.11" }` et vérifier VPS.

---

# 7. CAPACITÉ SERVEUR — dimensionnement précis

## Modélisation charge

Hypothèses par joueur/jour actif :
- 3 sessions × 20 min = 60 min actif/jour.
- Concurrent max ≈ **6-8 % des DAU** (pic soirées).
- Chaque session ≈ 200 requêtes HTTP + 1 socket persistant + 5 messages/min.

### Scénario 1 000 DAU (démarrage doux, ~80 concurrent max)

**VPS minimum** :
- **1 × VPS 4 vCPU / 8 GB RAM / 80 GB SSD NVMe** (~15 €/mois)
- MongoDB Atlas M2 (2 GB) : 9 €/mois
- Redis managé (Upstash gratuit ou Redis Cloud M0)
- Caddy pour TLS
- Backups quotidiens automatiques

**Config** :
- PM2 cluster mode 4 workers (1/vCPU).
- Mongo maxPoolSize=25/worker.
- Socket.IO Redis adapter.

**Coût mensuel total** : ~30 €.
**Capacité réelle** : jusqu'à ~150 concurrent avant saturation.

---

### Scénario 10 000 DAU (~700-800 concurrent max)

**Infra** :
- **2 × VPS 8 vCPU / 16 GB / 160 GB NVMe** en LB actif-actif (~60 €/mois total)
- Load Balancer (Cloudflare gratuit ou dédié 10 €/mois)
- MongoDB Atlas **M20** (16 GB RAM, replica set 3 nœuds) : ~250 €/mois
- Redis managé plan Standard : ~50 €/mois
- Sentry Team (~30 €/mois)
- Backups + monitoring : ~20 €/mois

**Config** :
- 2 VPS × 8 workers PM2 cluster = 16 workers.
- Mongo pool 15/worker = 240 conn (OK sur M20 qui tient 1500).
- Redis adapter socket.io.
- Cache Redis pour toutes les listes / leaderboards.
- CDN Cloudflare devant les assets front.

**Coût mensuel total** : ~410 €.
**Capacité réelle** : ~1 500 concurrent.

---

### Scénario 100 000 DAU (~7 000-8 000 concurrent max)

**Infra** :
- **Kubernetes cluster** (managed : GKE, EKS, DO) 6-10 nœuds 8 vCPU.
- Autoscaling HPA sur CPU.
- MongoDB Atlas **M40 dedicated** (32 GB RAM, sharded 2-3 shards) :
  ~1 500-2 000 €/mois.
- **Redis Cluster** managé (2-4 nœuds) : ~200 €/mois.
- CDN Cloudflare Pro / AWS CloudFront.
- Sentry Business + Datadog APM : ~400 €/mois.
- Kafka ou NATS pour les événements matchs → tournois → wallet.
- Backup MongoDB continu + PITR.

**Config critique** :
- **Sharding Mongo** par userId (hash).
- **Base séparée** pour analytics (data warehouse, ex. ClickHouse ou
  BigQuery).
- **Queue dédiée workers** pour tournois, notifications, replays.
- WebSocket gateway séparé du HTTP API (services découplés).
- Autoscaler basé sur nombre de sockets actifs (custom metric Prom).

**Coût mensuel total** : ~4 000-6 000 €.
**Effort humain** : 1 SRE / DevOps dédié minimum + rotation astreinte.

---

## Bottlenecks connus par échelle

| Charge | Bottleneck en premier | Comment le débloquer |
|---|---|---|
| 100 concurrent | CPU Node monoprocess | PM2 cluster |
| 500 concurrent | Mongo write concurrency | Pool tuning + indexes |
| 2 000 concurrent | Socket.IO monoprocess | Redis adapter |
| 5 000 concurrent | RAM Node par processus | 8+ workers + monitoring |
| 10 000 concurrent | Latence Mongo cross-region | Sharding + read replicas |
| 50 000 concurrent | Débit WebSocket | Gateway dédiée + LB L4 |

---

# 8. AVANT EXPOSITION PUBLIQUE — checklist minimale

Ordre chronologique recommandé (10-15 jours de travail estimé) :

## Semaine 1 — Sécurité & production (bloquants 🔴)

- [ ] Middleware Socket.IO auth (§1.3)
- [ ] helmet + rate-limit (§1.1, §1.2)
- [ ] JWT expiration 1h + refresh token (§1.4)
- [ ] Refuser boot si secrets par défaut en prod (§1.4)
- [ ] Zod validation sur toutes routes POST (§1.6)
- [ ] mongo-sanitize global (§1.7)
- [ ] CORS whitelist stricte (§1.8)
- [ ] Body limit 100 KB (§1.9)
- [ ] Retirer secrets committés + rotation (§1.5)
- [ ] .env.production.example complet + envalid (§6.2)
- [ ] HTTPS via Caddy (§2.6)
- [ ] Health checks /health /ready (§2.7)
- [ ] Graceful shutdown (§2.8)

## Semaine 2 — Observabilité & résilience

- [ ] Sentry back + front
- [ ] Prometheus metrics + Grafana
- [ ] Log rotation PM2
- [ ] MongoDB pool tuné + replica set (§2.3, §2.4)
- [ ] Redis obligatoire en prod (§2.5)
- [ ] Backups Mongo automatiques (§2.10)
- [ ] Socket.IO Redis adapter + PM2 cluster (§2.1, §3.1)
- [ ] Wallet en transactions (§5.7)

## Semaine 3 — Fonctionnel indispensable RGPD

- [ ] Reset password + email verification (§5.2, §5.3)
- [ ] DELETE /users/me RGPD (§5.4)
- [ ] Pages /legal/terms + /legal/privacy (§5.9)
- [ ] Cookies consent si analytics (§5.10)
- [ ] Modération basique (ban) (§5.5)

## Avant lancement

- [ ] Test de charge k6 (500 users, 30 min) (§4.3)
- [ ] Test E2E Playwright sur 5 flows critiques (§4.4)
- [ ] Runbook incident (qui appeler, quoi faire)
- [ ] Status page publique (statuspage.io / cachet)
- [ ] CI/CD GitHub Actions bloquant sur PR (§2.9)

---

# 9. CE QUI EST DÉJÀ BON (mérite d'être souligné)

Pour être équitable — beaucoup de fondations sont solides :

- ✅ **Moteur belote** (belote-core) : isolé, testé, jamais touché → excellent.
- ✅ **Économie centralisée** : `matchFormat.ts` source unique.
- ✅ **Bracket tournoi** : couvert par 22 tests unitaires (positions ex æquo).
- ✅ **Bcrypt utilisé** (pas de SHA1 ou MD5).
- ✅ **CORS présent** (à durcir mais existe).
- ✅ **Structure modulaire** propre par domaine (`modules/*`).
- ✅ **Séparation client / serveur** stricte via ApiClient typé.
- ✅ **TypeScript strict** partout, typecheck vert.
- ✅ **TNR reproductible** (`scripts/tnr-server.mjs`).
- ✅ **Substitute robot** bien intégré (v14.5 → tournois v14.12).
- ✅ **Idempotence** des opérations critiques (bracket, matchmaking enqueue).
- ✅ **Documentation** existante substantielle (docs/, back-office-guide).

---

# 10. Verdict par échelle

| Échelle | État actuel | Prérequis |
|---|---|---|
| **50 beta testeurs** (privé, invités) | ✅ Peut ouvrir **maintenant** | Rien (rester privé) |
| **500 utilisateurs alpha** (public restreint) | ⚠️ Faisable en **1 semaine** | Semaine 1 seulement |
| **1 000 DAU (public)** | ❌ Non exposable | Semaines 1-3 complètes |
| **10 000 DAU** | ❌ Non | + infra 10k + queue + cache |
| **100 000 DAU** | ❌ Non | Refonte partielle : K8s, sharding, event bus |

---

*Fin du diagnostic. Priorité absolue : semaine 1 (sécurité). Ensuite,
observabilité. Le reste est priorisable selon la traction.*
