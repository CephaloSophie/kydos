# Kýdos Belote — contexte projet

Monorepo du jeu de belote contrée Kýdos. Ce fichier est chargé automatiquement par
Claude Code : il contient ce qu'il faut savoir AVANT de toucher au code.

**Langue** : code, commentaires, commits et documentation en **français**
(exception historique : les commentaires de tests sont en anglais).

**Version courante** : `16.0.0` dans tous les `package.json`. Les documents parlent
souvent de « v17 », « v18 », « v19 » : ce sont des **jalons de conception**, pas des
versions npm — le bump de version a décroché depuis v16.

## Structure

| Espace | Rôle |
|---|---|
| `packages/core` (`belote-core`) | Moteur de jeu PUR : règles, robots, scoring, orchestration donnes→manches→partie. Aucune I/O. |
| `packages/table-pixi` (`@kydos/table-pixi`) | La table de jeu comme UN composant PixiJS + HUD. |
| `server` (`belote-server`) | API + WebSocket (Express, Mongoose, Socket.io). Modules par domaine. |
| `mobile` (`belote-mobile`) | App joueur (TypeScript + DOM, Vite + Capacitor). Pas de framework UI. |
| `back-office/` | **Hors workspaces npm** : app Angular 19 + son propre serveur Express (`back-office/server`). |

**Legacy à ne pas alimenter** :

- `packages/application` et `packages/belote-table` sont encore versionnés et pris par
  le glob `packages/*` des workspaces, mais **plus aucun code ne les importe** et ils
  ne sont ni typecheckés ni testés par `*:all`. Ne rien y ajouter.
- `web/` (ancienne app React) a été **supprimée du dépôt en v16**. Ce qui reste sur le
  disque (`web/dist`, `web/src`, `node_modules`) n'est **pas suivi par git** : l'ignorer.
  Toute doc qui décrit `web/` décrit un monde disparu.
- Le **front** de l'éditeur de cerveau (`/brain-editor`) vivait dans `web/` : il est parti
  avec elle. Seul le module serveur `server/src/modules/brain` (API REST de versionnage)
  subsiste. `docs/brain-editor/` documente donc une UI qui n'existe plus.

## Commandes

```bash
npm run typecheck:all          # core + table-pixi + server + mobile
npm run test:all               # idem, tests
npm --workspace belote-server run test
npm --workspace belote-mobile run test
npm run seed                   # jeux de données de démo
npm run tnr                    # non-régression globale → reports/tnr-latest.json
npm run tnr:server             # TNR serveur (intégration Mongo si MONGOMS_AVAILABLE=1)
npm run coverage               # couverture consolidée (seuils par workspace, effet cliquet)

# back-office (hors workspaces : se lancer depuis son dossier)
cd back-office && npx ng build          # SPA Angular (dev : ng serve, port 4200)
cd back-office/server && npx tsc --noEmit && npx vitest run   # API admin (port 3001)
cd back-office/server && npm run seed:admin                    # crée/promeut un compte admin
```

`Makefile` (racine) enveloppe le cycle mobile natif : `make check` (diagnostic
mobile↔serveur, 7 vérifications), `make ip`, `make android-device`,
`make android-emulator`, `make ios-sim`, `make cap-sync`, `make remote REMOTE=…`,
`make logs-android`. Détail : `docs/mobile-connection.md`.

## Principes d'architecture

- **Clean architecture** : le domaine ne dépend jamais de l'infrastructure. Côté mobile,
  les couches vont `core → data → domain → presentation` ; la présentation résout ses
  dépendances via le contexte injecté (`mobile/src/presentation/context.ts`) et
  `main.tsx` est la **seule** composition root.
- **Logique métier = fonctions PURES**, isolées dans leur module et testées seules
  (aucune I/O). C'est le patron dominant du dépôt — le suivre.
- **Un point unique par décision** : voir les modules centraux ci-dessous. Ne jamais
  recalculer en dur ailleurs ce qu'un module central résout déjà.
- **Corriger la racine, pas le symptôme** : règle explicitement posée par le CEO et
  appliquée à toutes les refontes récentes (config de table, thèmes, score).
- Chaque module serveur est autonome : `model → service → controller → routes`,
  enregistré en une ligne dans `server/src/modules/index.ts`.

## Modules centraux (source unique de vérité)

| Sujet | Module | Règle |
|---|---|---|
| Configuration d'une table | `packages/core/src/engine/tableConfig.ts` → `resolveTableConfig()` | Traduit les options métier (enchère d'ouverture, belote comptée, sens du jeu, manches, cibles) en `RulesConfig` + `PartieConfig`. **Aucun runner ne fabrique ces objets à la main.** |
| Score de carte d'une donne | `packages/core/src/scoring/donneScoring.ts` | Base 162, arrondi par équipe, belote, contre/surcontre, capot. |
| **Score & niveau Kýdos** | `packages/core/src/scoring/scoreKydos.ts` | Modèle **UNIQUE** : barème de gain, échelle de niveaux, bonus VIP, diagnostic. Voir ci-dessous. |
| Cerveau d'un robot | `packages/core/src/robot/AlgoSpec.ts` + `engine/RobotDriver.ts` | Génome JSON → cerveau → décision. **Un seul chemin pour tous les pilotes.** Voir « Robots ». |
| Formats de match rapide | `server/src/modules/matches/matchFormat.ts` | Enum + catalogue immuable (effectif, buy-in, gain, rake, headless). Ajuster un prix ou ajouter un format ⇒ on ne touche QUE ce fichier ; `verifyEconomics()` valide en test. |
| Surcharges de format | `server/src/modules/matches/matchFormatConfig` → `getEffective()` | Fusionne structure catalogue + config éditée au back-office. Le rake effectif = rake catalogue + delta. |
| File de matchmaking | `server/src/modules/matchmaking/queue.ts` + `queueFactory.ts` | Interface FIFO `MatchmakingQueue`, implémentations InMemory / Redis choisies par `REDIS_URL`. **Point d'extension unique** pour passer un jour à un appariement par ELO. |
| Rentabilité d'un tournoi | `server/src/modules/tournaments/economics.ts` | `tournamentEconomics()` pur : collecté, distribué, `houseNet`, détail par round. |
| Thème de table | `server/src/modules/tableTheme/tableTheme.colors.ts` → `resolveThemeColors()` | Dérive feutre, rail, accents et **dos des cartes** depuis un `TableTheme` réutilisable. |
| Avatars (rendu) | `packages/table-pixi/robotMascot.ts` → `mascotSvg()` | Mascotte paramétrique, **deux familles** : `robot` et `human`. |
| Sons de la table | `mobile/src/services/sound/soundConfig.ts` | **LE** fichier à éditer : événement → fichier, type de table → mélodie, volumes par défaut. |
| Publicité | `mobile/src/services/ads/adConfig.ts` | **LE** fichier à éditer : réseau actif, unit IDs, `TEST_MODE`, fréquences. |
| Session mobile | `mobile/src/data/SessionCache.ts` + `data/bootstrap.ts` | Profil, wallet, VIP, robots chargés **une seule fois** au boot. Les écrans lisent le cache en synchrone ; ils ne refetchent jamais au montage. |

### Score & niveau (`scoreKydos`)

Tout le score de l'application passe par là, joueurs **et** robots.

```
gain = base(joueur|robot) × coefPartie × coefTypeJeu + tokenScorePercent % des jetons
       puis +vipRate % si le gagnant est VIP
```

- Échelle de niveaux **géométrique** : `firstLevelThreshold × (1 + levelUpPercent/100)^(n-1)`.
  Défaut 500 pts, +8 %/niveau (niveau 2 à 500, niveau 3 à 1040), surcharges manuelles possibles.
- `levelForScore()` est la **seule** façon de calculer un niveau, et rend aussi
  `pointsInLevel`. L'ancien `1 + floor(score/100)` n'existe plus.
- Configuration éditée au back-office (singleton `ScoreConfig`, page « Score & niveaux »),
  lue par le serveur. `diagnoseScoreKydos()` détecte les incohérences (échelle non
  croissante, pourcentages irréalistes, coefficients ≤ 0, surcharges hors bornes…) ;
  la sauvegarde est refusée tant qu'il reste une erreur.
- **Unique point d'attribution** : `gamePersistence.awardKydosScores()`. Ne pas créditer
  de score ailleurs. Champs persistés : `User.rewardPoints/level/scoreInLevel`,
  `Robot.score/level/scoreInLevel`.
- `scoreCoefficient` (défaut 1) porté par la table, le tournoi et la variante de match rapide.
- Dette connue : `rewardScoring.computeReward` (ancienne formule) neutralise son volet
  « bonus D » (dedans, capots, contrées) alors que `Game.stats` porte l'information.

## Robots — le contrat de parité

Chaîne unique, décrite en détail dans `docs/architecture-robots.md` :

```
AlgoSpec (génome JSON, versionné)  →  normalizeAlgo  →  createBrain / resolveAlgorithm
   →  RobotAlgorithm (decideBid, decideCard, shouldContre, shouldSurcontre)
   →  robotAct(engine, seat, algo) via buildRobotContext  →  action + thinkMs
```

- `resolveAlgorithm` essaie dans l'ordre : **registre** (`registerAlgorithm(name, …)`),
  **workflow JSON** (`spec.workflow`), puis `SpecAlgorithm` (défaut).
- Toutes les décisions sont **pures** : même contexte → même résultat. Le cerveau ne
  connaît jamais le moteur, seulement un `RobotContext` en lecture seule.
- **Les pilotes appellent tous le même code** : `mobile/src/services/localGame.ts` +
  `gameLoop.ts` (entraînement), `server/.../competition.runner.ts` (headless),
  `server/.../liveGame.service.ts` (en ligne), `packages/core/demo/partie.ts`.
  Un robot au même `algoSpec` doit décider pareil partout — garanti par
  `mobile/src/services/localGame.parity.test.ts`. **Ne jamais dupliquer une heuristique
  dans un pilote.**
- Modifier un comportement d'enchère/jeu se fait d'abord **par la donnée**
  (`AlgoSpec.bidding`, `contre`, `play`) ; guide pratique : `docs/robot-cerveau-config.md`.
- `shouldSurcontrer` (RobotDriver) est un point d'extension câblé dans les pilotes,
  pas dans `robotAct`, et renvoie `false` par défaut.

## Compétitions — vocabulaire et cycle

Le mot « compétition » est **abandonné** ; deux concepts distincts (`docs/matches-tournaments.md`) :

- **Match** — une partie compétitive immédiate, dans l'un des 3 formats fixes.
- **Tournament** — bracket à élimination directe (4→128), enchaîne des Matchs.

| Format | Effectif | Buy-in / joueur | Gain | Rake | Headless |
|---|---|---|---|---|---|
| `DUO_STEEL` | 2 robots × 2 joueurs | 200 ◆ | 150 ◆ | 50 ◆ | ✅ |
| `HYBRID_ALLIANCE` | 1 humain + 1 robot × 2 | 150 ◆ | 225 ◆ | 75 ◆ | ❌ |
| `ROYAL_SQUARE` | 4 humains | 100 ◆ | 150 ◆ × 2 | 100 ◆ | ❌ |

- Non-headless : **aucune boucle temps réel dupliquée**. `matchLiveService.provision()`
  convertit le Match en **Table éphémère** (`Table.origin = 'match' | 'tournament'`,
  `kind` = `acier`/`hybride`/`royal`) et délègue tout à `liveGameService` ; un sweep
  3 s fait le `settle()` (score → Match, gains, rake). `provision` et `settle` sont
  **idempotents**.
- Tournois : worker interne (`tournament.worker.ts`, `setInterval` 30 s) — aucun
  scheduler externe. `tournament.orchestrator.run()` est **idempotent** et reconstruit
  l'état du bracket à chaque passage.
- Contrainte **1 tournoi / robot / jour** via l'index unique
  `TournamentRobotDayLock {robotId, dayKey}` ; rollback des locks si le débit échoue.
- Le score affiché d'un match en cours est le nombre de **manches gagnées**
  (monotone), jamais le cumul de points de manche — celui-ci repart à zéro à chaque
  manche et affichait un « 0 » trompeur.
- **Carrée royale en tournoi** : équipes de 2 humains formées aléatoirement au
  démarrage, bracket sur `capacity/2` feuilles, chaque rang payé à 2 joueurs.

## Économie (jetons ◆)

- Solde et journal sur `user.wallet` ; transactions `daily`, `game_stake`, `game_win`,
  `refund`, `promo`, `vip`. Comptabilité maison : `HouseTransaction`
  (`MATCH_RAKE`, `TOURNAMENT_ENTRY`, `TOURNAMENT_PRIZE`).
- **Prélèvement au lancement** (`walletService.stakeGame`) : tout ou rien — si un joueur
  ne peut pas payer, la partie ne démarre pas ; un débit partiel est remboursé (`refund`).
  L'entraînement local reste gratuit.
- Récompense quotidienne 500 ◆, idempotente par jour UTC, réclamée depuis la page
  **porte-monnaie** (la pastille ◆ ouvre la page, elle ne crédite plus au clic).
- **Codes promo** : 12 chiffres, `expiresAt`, `maxRedemptions`, `redeemedBy`
  (une fois par personne). `POST /api/promo/redeem`. Détail : `docs/WALLET.md`.
- **VIP** : acheté en jetons (`vipExpiresAt` sur `User`, plans 600/4 500/30 000 ◆ pour
  1/10/30 jours, prolongation cumulative). Avantages : **aucune publicité**
  (`AdManager` renvoie `reason: 'vip'`), **cadre doré** autour de l'avatar (badge +
  profil), et **bonus de score `vipRate`** (défaut 3 %) appliqué dans `computeScoreGain`.

## Avatars

Deux catalogues **indépendants**, gérés au back-office, jamais codés en dur côté mobile :

- **Avatars robots** (`RobotAvatar`) — débloqués par plage de niveau joueur (`minLevel`/`maxLevel`).
- **Avatars joueurs** (`PlayerAvatar`) — choix libre, pour le profil humain.

Traits communs configurables : couleurs (accent/corps/contour), **antennes ou mèches (1..5)**,
**état des yeux** (ouverts, grands, fermés, clin/fermé/grand gauche ou droite), **état de la
bouche** (sourire, rictus, neutre, triste, colère, surpris). La famille (`kind`) décide du
rendu : antennes + visière pour le robot, cheveux + tête ronde pour l'humain.

Le mobile lit les catalogues via `data/AvatarCatalog.ts` (`avatarFace` → famille robot) et
`data/PlayerAvatarCatalog.ts` (`playerFace` → famille humaine), avec repli hors-ligne.

## Mobile — session, hors-ligne, design system

- `runBootstrap()` charge tout (profil, wallet, VIP, robots) + précharge les sons,
  derrière l'écran d'attente `#boot` (4 robots qui dansent, réutilisable via
  `Waiting` / `showWaitingOverlay`). Rafraîchissements **ciblés** uniquement quand une
  donnée change réellement ; chaque mise à jour émet `session:wallet|vip|profile|robots`.
  Le serveur reste l'autorité : le cache ne valide jamais une transaction.
- **Jouable hors-ligne** : entraînement solo, écurie, solde/VIP (dernières valeurs).
  **Pas hors-ligne** : création de robot, jeu en ligne.
- Design system autonome (`mobile/src/design-system/`) : **aucune valeur en dur** dans
  les écrans (toujours `var(--c-…)`, `var(--r-…)`, `var(--fs-…)`), **paysage uniquement**,
  **jamais de `<select>` natif** (pastilles tactiles à la place). Équipe A = sièges A+C
  (« NOUS », vert), équipe B = B+D (« EUX », rouge), constant partout.
- Route `#/styleguide` : aperçu vivant de tous les composants. Un nouveau composant s'y
  ajoute avec toutes ses variantes, et son test E2E est étendu.
- Sons : Web Audio natif, deux bus de gain (mélodie / effets), volumes persistés
  (`kydos.sound.melodyVolume` 35, `kydos.sound.sfxVolume` 70), déblocage autoplay au
  premier tap. Détection d'événements **pure** par diff de deux vues moteur.

## Back-office

App Angular 19 (standalone + lazy `loadComponent`) + API Express **séparée** sur le port
3001, montée sous `/admin/*`, sur **la même base MongoDB** que le serveur de jeu.

- Auth : JWT HS256 **4 h**, middleware `requireAdmin` qui revérifie `user.role === 'admin'`
  en base à chaque requête. Pas d'inscription : `npm run seed:admin` promeut/crée un compte.
- Rate limit 30 req/min par IP sur `/admin` ; **audit log** de toute écriture dans
  `adminauditlogs` (`adminId`, `action`, `targetId`, `before`, `after`).
- Pages : dashboard, tournois (+ formulaire/détail), match rapide (formats & variantes),
  thèmes de table, avatars robots, avatars joueurs, score & niveaux, utilisateurs,
  promos, comptabilité, monitor, aide (`/help`).
- Règles d'édition d'un tournoi par statut : `draft` = tout, `upcoming`/`live` = rien
  (sauf annulation d'un `upcoming`, qui rembourse), `finished` = le nom seul,
  `cancelled` = rien. `houseNet < 0` exige `acceptLoss: true`.

## ⚠️ Miroirs à garder synchronisés

Le back-office et son serveur ne dépendent **pas** de `belote-core` ni de `table-pixi`.
Certaines logiques pures y sont donc **recopiées à l'identique**. Toute modification de
l'original doit être répercutée :

| Original | Miroirs |
|---|---|
| `packages/core/src/scoring/scoreKydos.ts` | `back-office/server/src/scoreKydos.ts` |
| `packages/table-pixi/robotMascot.ts` | `mobile/src/presentation/components/RobotMascot.ts`, `back-office/src/app/shared/robot-mascot.ts` |
| `server/src/modules/tableTheme/tableTheme.colors.ts` | `back-office/server/src/tableThemeColors.ts` |

> Le miroir mobile de la mascotte est **volontaire** : importer `@kydos/table-pixi`
> tire Pixi/React dans l'environnement de test mobile et casse les tests d'écrans.

## Contrats à ne jamais casser

1. **Personnalité moteur** `{ aggressiveness, concentration, velocity }` sur **1–10**.
   Les curseurs mobiles 0–100 y sont mappés sans perte ; `bluff` est présentationnel et
   n'est **jamais** injecté dans le moteur.
2. **Manches** : le moteur n'accepte que `1 | 2 | 4`.
3. **Coéquipier caché** : jamais visible, même en mode « cartes visibles ».
4. **Spectateurs** : ne reçoivent **jamais** `hands`. Max 5 par table libre,
   10 par match (`MAX_SPECTATORS_PER_MATCH`) ; `DUO_STEEL` les refuse.
5. **Replay** : structure `manches[].donnes[].operations[]` (lecture par `op.seat`).
6. **Verrou une-partie-à-la-fois** : `User.activeSession`, libéré à la persistance de fin.

## Tests — état et pièges connus

Compté sur cet arbre : **core 100** · **table-pixi 73** · **serveur 216** (liste blanche
pure) · **mobile 185 verts / 3 échecs** · **back-office server 54**.

- `mongodb-memory-server` **ne peut pas télécharger son binaire** dans les environnements
  sans réseau sortant. `server/vitest.config.ts` maintient donc une **liste blanche de tests
  purs** par défaut ; la suite complète ne tourne qu'avec `MONGOMS_AVAILABLE=1`.
  **Conséquence : un nouveau test pur doit être ajouté à cette liste pour être exécuté.**
- 3 tests d'accueil de `mobile/src/test/screens.e2e.test.ts` échouent **avant toute
  modification** (l'écran a 4 cartes, le test en attend 3 ; menu « Jouer en ligne »).
  Échec **pré-existant et connu** — ne pas tenter de le « corriger » par accident.
- E2E mobile : `mobile/src/test/fakeServer.ts` intercepte `fetch` et répond comme le vrai
  serveur, donc la vraie couche `ApiClient` est exercée ; `calls[]` permet d'asserter les
  endpoints appelés. La table Pixi (WebGL) est remplacée par un composant inerte.
- L'E2E Playwright web n'existe plus (le workspace `web/` a été supprimé) : la doc
  `docs/ai/TESTING.md` §6 et le job CI `e2e-web` sont **caducs**.
- Tout bug corrigé s'accompagne d'un test qui échouait avant le correctif. Les seuils de
  couverture (`vitest.config.ts` de chaque workspace) ne doivent jamais baisser.

## Sécurité — dette ouverte (vérifiée sur cet arbre)

`docs/DIAGNOSTIC-v14.14-production-readiness.md` conclut **« ne pas exposer au public en
l'état »**. Les bloquants côté **serveur de jeu** sont toujours ouverts : pas de `helmet`,
pas de rate-limiting, pas de `mongo-sanitize`, pas de validation d'entrée (Zod/Joi),
JWT à **7 jours** (`server/src/shared/authentication.ts`). En revanche les **sockets
SONT authentifiés** — `shared/socketAuthentication.ts`, branché dans `index.ts` : le JWT
du handshake est vérifié et `socket.data.userId` posé (le diagnostic v14.14 est périmé
sur ce point). Le back-office a rate limit + audit + JWT 4 h.
Ne pas présenter le serveur comme durci ; toucher à ces sujets = les corriger vraiment.

## Carte de la documentation

À jour et fiables :

| Document | Sujet |
|---|---|
| `docs/architecture-robots.md`, `docs/robot-cerveau-config.md` | Chaîne AlgoSpec → cerveau → décision ; où régler chaque comportement. |
| `docs/matches-tournaments.md`, `docs/match-live-runner.md`, `docs/competitions-fonctionnel.md` | Matchs, tournois, table éphémère, Redis, spectateurs. |
| `docs/WALLET.md`, `docs/ADS.md` | Jetons, promos, VIP ; publicité (mode test AdMob pas à pas). |
| `docs/session-cache.md` | Bootstrap mobile, cache de session, règles hors-ligne. |
| `docs/SOUNDS.md` | Sons et mélodies de la table. |
| `docs/backoffice/technique.md`, `docs/backoffice/fonctionnel.md`, `docs/backoffice/ai-changelog.md` | Back-office : API, écrans, journal des jalons v16→v18. |
| `docs/mobile-connection.md` | Device/émulateur Android & iOS, debug, HTTPS, dépannage. |
| `docs/ai/HISTORIQUE-v18-v19.md` | **Pourquoi** le code est ainsi (thèmes, avatars, score, VIP). |
| `docs/ai/README.md` | Porte d'entrée : identité produit, monorepo réel, où aller ensuite. |
| `docs/ai/ARCHITECTURE.md` | Dépendances entre espaces, couches, modules serveur, flux d'une partie. |
| `docs/ai/TESTING.md`, `docs/ai/DEPLOYMENT.md` | Suites et pièges de test ; env, PM2, CI, checklist sécurité. |
| `docs/api-reference.md`, `docs/websocket-reference.md` | Contrats HTTP et Socket.IO. |
| `docs/DIAGNOSTIC-v14.14-production-readiness.md`, `docs/DIAGNOSTIC-scores-cumul.md` | Audits ; le second explique la genèse de `scoreKydos`. |

**Datées mais utiles — un encadré en tête dit ce qui a changé** : `docs/ai/SPEC.md` et
`docs/ROADMAP.md` (vision produit gelée vers v11.8), `docs/ai/MOBILE.md` (accrétion
arrêtée à v11.11), `docs/table-pixi/README.md` (chemins d'avant la promotion en
package), `docs/DEPLOYMENT.md` (VPS d'avant v16), `docs/back-office-guide.md` et
`docs/SPEC-BACKOFFICE-KYDOS.md` (specs de construction, l'outil existe depuis),
`docs/brain-editor/*` (UI supprimée avec `web/`), `CHANGELOG.md` (arrêté à v14.4).
**Ne pas s'y fier sans vérifier le code.** `board/tasks.json` n'est plus tenu à jour.

## Git

Commits conventionnels en français : `feat(score): …`, `fix(queue): …`, `docs: …`.
Ne jamais pousser sur `main` directement ; travailler sur une branche dédiée.
