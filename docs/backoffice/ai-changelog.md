# Back-Office Kydos — AI Changelog

Journal de suivi des modifications effectuées par l'assistant AI (Claude), commit par commit. Ce document sert de référence pour comprendre l'historique complet de ce qui a été réalisé, pourquoi, et comment.

---

## Commit `<progression live + scores>` — fix: progression des tournois live + scores en direct

**Branche** : `claude/back-office-angular-mhtcd8`
**Demande utilisateur** : Le tournoi Alliance hybride ne passe pas en finale ; perdants toujours notifiés « Rejoindre » ; arbre et scores non mis à jour ; vouloir des scores en direct (back-office + joueurs) ; pastille LIVE globale.

### Bug critique corrigé — le tournoi n'avançait pas (matchs live)

Cause racine : l'orchestrateur créait les matchs de tournoi en `PAIRING` mais ne les passait jamais en `RUNNING`. Or `sweepFinishedMatches` (qui règle les matchs terminés) ne balaie **que** les matchs `RUNNING`. Résultat : `recordMatchResult` n'était jamais appelé pour les matchs live (Alliance hybride / Carrée royale) → arbre, scores et éliminations figés, round suivant (finale) jamais créé, et perdants voyant toujours « Rejoindre » (leur match restait `PAIRING`). Les Duo d'acier (headless) n'étaient pas touchés car leur runner passe bien en RUNNING→FINISHED.

Correctifs (`server/src/modules/tournaments`, `matches`) :
- `tournament.orchestrator.ts` : après provision de la table live, passage du match en `RUNNING` (updateOne atomique, préserve `liveTableId`).
- `tournament.service.recordMatchResult` : dès qu'un round est complet, exécution immédiate de l'orchestrateur → les gagnants voient leur match suivant en quelques secondes (au lieu d'attendre le tick worker 30 s).
- `join()` : message d'erreur nommant le(s) robot(s) déjà engagé(s) ce jour-là (diagnostic).

### Scores en direct (back-office + joueurs) sans Redis

Le back-office étant un process séparé du serveur de jeu, la mémoire live n'est pas partagée. Solution : le serveur de jeu **recopie le score des matchs en cours dans le bracket (MongoDB)** toutes les ~3 s → consultable en direct des deux côtés, sans infra Redis supplémentaire.
- `match.liveRunner.syncTournamentLiveScores()` + appel dans le sweep socket (3 s).
- `tournament.service.updateLiveScore()` : écrit `scoreA/scoreB` dans le nœud bracket (no-op si terminé/inchangé).
- Mobile : `TournamentBracketScreen` se rafraîchit automatiquement (4 s) tant que le tournoi est LIVE.
- Back-office : `tournament-detail` se rafraîchit automatiquement tant que le tournoi est LIVE.

### Pastille LIVE globale (mobile)

`LiveMatchIndicator` : pastille « LIVE » flottante (haut-gauche, premier plan) affichée sur toutes les pages dès qu'un match de compétition/tournoi est en cours (tous formats). Un tap rejoint la partie. Montée une fois au démarrage, masquée sur table/online/login.

### Reste à faire (signalé au joueur)
- Écran « attente » du gagnant (score en direct de l'autre demi-finale + lien spectateur) et spectateur d'un match précis : nécessitent une vérification sur appareil réel (UI temps-réel socket).

---

## Commit `<retours joueur>` — fix: sidebar icons + inscription tournoi avec choix des robots

**Branche** : `claude/back-office-angular-mhtcd8`
**Demande utilisateur** : Retours sur le back-office et l'app joueur (compétitions/tournois).

### Ce qui a été fait

1. **Back-office — icônes du menu latéral** (`back-office/.../sidebar/sidebar.component.ts`)
   - Les icônes étaient des entités HTML (`&#9881;`) rendues via interpolation Angular `{{ }}`, donc échappées et affichées en texte brut. Remplacées par de vrais emoji (📊 🏆 👤 🎟️ 💰 📡).

2. **App joueur (mobile) — choix des robots à l'inscription tournoi** (nouveau `TournamentEnrollScreen.ts`)
   - Avant : l'inscription auto-sélectionnait les N premiers robots (`pickRobots`), et le compte de robots ignorait le remplaçant → Alliance hybride et Carrée royale échouaient (mauvais nombre de robots envoyés).
   - Nouveau : écran de sélection des robots par rôle, calqué EXACTEMENT sur `MatchEnrollScreen` (compétition normale) :
     - Duo d'acier → 2 coéquipiers, pas de remplaçant.
     - Alliance hybride → 1 coéquipier + 1 remplaçant.
     - Carrée royale → 1 remplaçant.
   - Convention d'envoi identique au serveur : `[coéquipier(s)…, remplaçant?]`.
   - Route `tournament-enroll?id=X` enregistrée dans `main.tsx`.

3. **App joueur — inscription/désinscription sur les cartes** (`RankingCompetScreens.ts`)
   - La carte tournoi route désormais vers l'écran de choix des robots (au lieu d'auto-sélectionner).
   - Si le joueur est déjà inscrit, un bouton **Se désinscrire** s'affiche à la place de **S'inscrire** (remboursement du buy-in).

4. **App joueur — données & bracket dans le détail tournoi** (`TournamentScreen.ts`)
   - Les vues UPCOMING/FINISHED utilisaient l'ancien champ `rounds` (vide) → remplacé par `prizesByPosition` (données réelles, comme le back-office).
   - Vue FINISHED : ajout d'un **classement final** (position réelle + gains versés par participant) à partir de `participants`.
   - Le bouton « Voir l'arbre » pointe vers `TournamentBracketScreen` (déjà fonctionnel, lit `bracketTree`).
   - L'inscription route vers `tournament-enroll` au lieu d'auto-sélectionner les robots.

### Note
- Le format **Carrée royale en tournoi** était encore bloqué à ce stade — débloqué au commit suivant.

---

## Commit `<carrée royale + guide>` — feat: Carrée royale en tournoi + guide back-office

**Branche** : `claude/back-office-angular-mhtcd8`
**Demande utilisateur** : Faire fonctionner la Carrée royale en tournoi, mettre à jour la doc, ajouter les instructions seed/admin, et ajouter au back-office l'info utile pour chaque controller.

### Carrée royale en tournoi (bracket par équipes de 2)

Modèle retenu (conforme au spec joueur) : les 4 humains d'un match royal forment 2 équipes de 2. Comme le bracket est en 1 vs 1, **chaque feuille du bracket = une équipe de 2 humains**, formée aléatoirement au démarrage et fixe jusqu'à la fin. Le bracket se joue donc sur `capacity / 2` feuilles.

Serveur (`server/src/modules/tournaments`, `matches`) :
- `bracket.ts` : slot de bracket étendu (`userId2`/`displayName2`) ; `buildInitialBracket(leafCount, seeds)` générique ; propagation et `computeFinalPositions` attribuent le rang aux 2 coéquipiers ; nouvelle fonction pure `formTeamSeeds`.
- `economics.ts` : `tournamentEconomicsByPosition` accepte `leaves` + `teamSize` (royal : `leaves = capacity/2`, `teamSize = 2`) → chaque rang paie 2 humains par équipe.
- `tournament.model.ts` : `BracketSlotSchema` porte `userId2`/`displayName2`.
- `tournament.service.ts` : création royale débloquée (min. 4 joueurs) ; `startNow` mélange et forme les équipes ; `recordMatchResult` détecte le vainqueur sur les 2 coéquipiers ; finalisation calcule les rangs sur les équipes.
- `tournament.orchestrator.ts` : branche royale de `#buildParticipants` (4 humains, 2 par équipe, robot remplaçant par joueur) ; provisionne une table live pour royal comme pour hybrid.
- Tests : `royal-bracket.test.ts` (6 tests) — formation d'équipes, bracket, avance, rangs ex æquo, économie. **150 tests serveur au vert.**

Mobile :
- `TournamentBracketScreen.ts` : un slot affiche les 2 coéquipiers (`Nom & Nom`).
- L'écran d'inscription (`TournamentEnrollScreen`) gère déjà le remplaçant royal.

Back-office (économie admin correcte pour royal) :
- `routes/tournaments.ts` : `computeEconomics(..., format)` applique `leaves`/`teamSize` pour royal ; `format` passé à la création et à `preview-economics`.
- Angular : `previewEconomics(..., format)` envoie le format.

### Guide back-office + seed

- Nouvelle page **Guide** (`pages/help`, route `/help`, menu latéral) documentant chaque section (controller) : tournois, utilisateurs, promos, comptabilité, monitoring, sécurité/audit — avec règles, actions et endpoints — plus les instructions **seed admin** et de lancement.
- `README.md` : ajout de la méthode `npm run seed:admin`.

---

## Commit `9a7a5ec` — feat: add Angular back-office admin panel with Express API

**Date** : Session initiale
**Branche** : `claude/back-office-angular-mhtcd8`
**Demande utilisateur** : Analyser le spec `docs/back-office-guide.md` et réaliser le back-office complet avec Angular.

### Ce qui a été fait

#### Backend Express (nouveau : `back-office/server/`)

1. **Point d'entrée** (`server/src/index.ts`)
   - Serveur Express sur port 3001
   - Import de tous les modèles Mongoose du serveur de jeu via imports relatifs (`../../server/src/modules/...`)
   - CORS activé, parsing JSON
   - Montage de toutes les routes sous `/admin/*`

2. **Authentification** (`server/src/middleware/auth.ts`)
   - `signAdminToken()` : génère un JWT (HS256, 4h d'expiry)
   - `verifyAdminToken()` : vérifie et décode le JWT
   - `requireAdmin` middleware : vérifie le token + rôle `admin` en BDD
   - Interface `AdminRequest` étendant `Request` avec `adminId`

3. **Route auth** (`server/src/routes/auth.ts`)
   - `POST /admin/auth/login` : vérifie username/password via bcrypt, retourne JWT

4. **Routes tournois** (`server/src/routes/tournaments.ts`)
   - `GET /` : liste avec filtre par statut
   - `GET /:id` : détail
   - `POST /` : création avec validation complète (nom, format, capacité, frais, date future)
   - `PUT /:id` : modification (draft uniquement à ce stade)
   - `POST /:id/publish` : draft → upcoming
   - `POST /:id/cancel` : upcoming → draft (corrigé plus tard), rembourse les participants
   - `DELETE /:id` : suppression (draft uniquement)
   - `POST /preview-economics` : simulation économique
   - Fonctions pures `occupantsAtPosition()` et `computeEconomics()` pour le calcul des prix

5. **Routes utilisateurs** (`server/src/routes/users.ts`)
   - `GET /` : liste paginée avec filtres (search, vip, active, minBalance)
   - `GET /:id` : détail avec robots et 20 dernières parties
   - `POST /:id/credit` : crédit manuel de tokens
   - `POST /:id/ban` : passage du rôle à `banned`

6. **Routes comptabilité** (`server/src/routes/accounting.ts`)
   - `GET /summary` : agrégation par kind avec ventilation journalière
   - `GET /transactions` : liste paginée avec filtres kind/date

7. **Routes promos** (`server/src/routes/promos.ts`)
   - CRUD complet, validation du format 12 chiffres, détection doublon (code 11000)

8. **Routes monitoring** (`server/src/routes/monitor.ts`)
   - `GET /snapshot` : métriques (totalUsers, activeUsers, activeMatches, liveTournaments, queueSizes)
   - `GET /matches` : liste des parties actives

#### Frontend Angular 19 (nouveau : `back-office/src/`)

9. **Configuration**
   - `angular.json` : config avec proxy dev
   - `proxy.conf.json` : `/api` → `http://localhost:3001` avec rewrite
   - `tsconfig.json`, `tsconfig.app.json`

10. **Modèles TypeScript** (`src/app/models/index.ts`)
    - Interfaces : Tournament, User, Robot, Game, HouseTransaction, AccountingSummary, PromoCode, MonitorSnapshot, EconomicsResult
    - Types : TournamentStatus, TournamentCapacity, MatchFormat
    - Constantes : TOURNAMENT_CAPACITIES, MATCH_FORMATS

11. **Services** (`src/app/services/`)
    - `AuthService` : login/logout, gestion JWT localStorage, BehaviorSubject admin
    - `TournamentService` : CRUD + publish/cancel/previewEconomics
    - `UserService` : list/getById/credit/ban
    - `AccountingService` : summary/transactions
    - `PromoService` : CRUD
    - `MonitorService` : snapshot/activeMatches

12. **Auth** (`src/app/guards/` + `src/app/interceptors/`)
    - `authGuard` : CanActivateFn, redirige vers `/login` si non connecté
    - `authInterceptor` : HttpInterceptorFn, ajoute Bearer token, gère 401

13. **Pages**
    - `LoginComponent` : formulaire username/password
    - `DashboardComponent` : 4 stat cards, files d'attente, graphique économie 30j, tournois à venir
    - `TournamentsComponent` : liste filtrable par statut, boutons d'action contextuels
    - `TournamentFormComponent` : formulaire complet avec grille de prix dynamique et aperçu économique en temps réel
    - `TournamentDetailComponent` : infos, prix, participants, visualisation bracket
    - `UsersComponent` : liste paginée avec filtres
    - `UserDetailComponent` : stats, actions admin, robots, parties, historique wallet
    - `PromosComponent` : CRUD inline, formatage code 1111-2222-3333
    - `AccountingComponent` : période, cartes stats, ventilation journalière, transactions, export CSV
    - `MonitorComponent` : auto-refresh 5s, métriques, parties actives

14. **Layout**
    - `SidebarComponent` : navigation 6 items, thème or/sombre
    - `HeaderComponent` : nom admin + logout
    - `AppComponent` : layout conditionnel (sidebar si connecté)

15. **Styles** (`src/styles.scss`)
    - Thème sombre avec variables CSS (--primary: #e6c46a, --bg-primary: #1a1a2e)
    - Classes utilitaires : .btn, .card, .stat-card, .badge, .pagination, .form-group, etc.

#### Modification du serveur de jeu

16. **Modèle User** (`server/src/modules/user/user.model.ts`)
    - Ajout du champ `role: { type: String, enum: ['user', 'admin', 'banned'], default: 'user', index: true }`
    - Nécessaire car le spec exige `role === 'admin'` mais le champ n'existait pas

### Fichiers créés : 40+
### Fichiers modifiés : 1 (user.model.ts)

---

## Commit `ec94985` — feat: add audit logging, rate limiting, and tournament lifecycle fixes

**Date** : Session de continuation
**Branche** : `claude/back-office-angular-mhtcd8`
**Demande utilisateur** : Continuer l'implémentation (suite automatique après interruption).

### Ce qui a été fait

#### 1. Audit logging complet

**Fichiers créés** :
- `server/src/middleware/auditLog.ts` : modèle Mongoose `AdminAuditLog` + helper `logAudit()`
- `server/src/routes/audit.ts` : endpoint `GET /admin/audit` avec pagination et filtres

**Fichiers modifiés** :
- `server/src/routes/tournaments.ts` : ajout de `logAudit()` après chaque opération d'écriture
  - `tournament.create` : log après création, enregistre name/format/capacity/entryFee/status
  - `tournament.update` : log avant/après avec les champs principaux
  - `tournament.publish` : log du changement de statut draft → upcoming
  - `tournament.cancel` : log avec meta (refundedCount, entryFee)
  - `tournament.delete` : log avant suppression avec name/format/capacity
- `server/src/routes/users.ts` : ajout de `logAudit()` pour credit et ban
  - `user.credit` : log avec amount, reason, newBalance
  - `user.ban` : log avec rôle après changement
- `server/src/routes/promos.ts` : ajout de `logAudit()` + typage `AdminRequest` pour create/update/delete
  - `promo.create` : log avec code, tokens, maxRedemptions
  - `promo.update` : log avec tokens, active, maxRedemptions
  - `promo.delete` : log avant suppression avec code et tokens

#### 2. Rate limiting

**Fichiers modifiés** :
- `server/package.json` : ajout dépendance `express-rate-limit@^8.6.2`
- `server/src/index.ts` : import et configuration du rate limiter (30 req/min, message FR)

#### 3. Correction du cycle de vie tournoi

**Correction : statut annulation** (`server/src/routes/tournaments.ts`)
- Avant : `cancel` remettait le statut à `draft` (incorrect)
- Après : `cancel` met le statut à `cancelled` (irréversible, plus fidèle au spec)
- Ajout de `'cancelled'` dans `VALID_STATUSES`

**Correction : édition tournoi terminé** (`server/src/routes/tournaments.ts`)
- Avant : seuls les brouillons pouvaient être modifiés
- Après : les tournois `finished` acceptent la modification du `name` uniquement (conformément au spec : "seul le nom peut être édité pour clarté d'historique")
- Refus avec message explicite si d'autres champs sont envoyés

#### 4. Support frontend du statut `cancelled`

**Fichiers modifiés** :
- `src/app/models/index.ts` : ajout `'cancelled'` au type `TournamentStatus`
- `src/app/pages/tournaments/tournaments.component.ts` : ajout filtre `Annulé`, label dans `statusLabel()`
- `src/app/pages/tournament-detail/tournament-detail.component.ts` : label `Annulé` dans `statusLabel()`
- `src/styles.scss` : badge `.cancelled` en rouge (`--danger`)

### Fichiers créés : 2
### Fichiers modifiés : 10

---

## Commit `<ce commit>` — docs: add back-office documentation, PM2 config, and AI changelog

**Date** : Session courante
**Branche** : `claude/back-office-angular-mhtcd8`
**Demande utilisateur** : Créer une documentation README claire, un manuel technique et fonctionnel dans `docs/backoffice/`, une config PM2, et un document de suivi AI par commit.

### Ce qui a été fait

1. **README** (`back-office/README.md`) — réécrit intégralement
   - Guide d'installation rapide
   - Variables d'environnement documentées
   - Instructions dev et production
   - Création compte admin
   - Structure du projet
   - Liens vers la documentation

2. **Manuel technique** (`docs/backoffice/technique.md`)
   - Architecture backend (auth, rate limit, audit)
   - Référence complète de tous les endpoints API
   - Architecture frontend (routes, services, intercepteur)
   - Guide de déploiement (PM2, nginx, variables env)
   - Mesures de sécurité et recommandations production

3. **Manuel fonctionnel** (`docs/backoffice/fonctionnel.md`)
   - Guide utilisateur pour chaque section du back-office
   - Tableaux des champs, statuts, actions disponibles
   - Explication des règles métier (économie tournoi, modification par statut)

4. **Config PM2** (`back-office/ecosystem.config.cjs`)
   - Configuration pour l'API backend avec tsx
   - Variables d'environnement, logs, auto-restart

5. **AI Changelog** (`docs/backoffice/ai-changelog.md`) — ce fichier
   - Suivi détaillé de chaque commit avec contexte, fichiers et raisons

### Fichiers créés : 5
### Fichiers modifiés : 1 (README.md)
