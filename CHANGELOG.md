# Journal des versions — Belote Contrée

Chaque génération a un numéro. La version actuelle est affichée en haut à droite de l'app.

## v13.0.1 — Édition de robot bout-en-bout (KB-301 résolue) (version actuelle)

Complétion d'une défaillance de fond ouverte depuis plusieurs versions : le
serveur exposait déjà `PUT /robots/:id` mais le mobile ne permettait pas
d'éditer un robot. C'est désormais complet.

### Ce qui est ajouté (KB-431 / KB-301)
- **ApiClient.updateRobot(id, body)** → `PUT /robots/:id`.
- **RobotRepository.update** + interface `IRobotRepository.update`.
- **RobotService.update** (émet `robots:changed`).
- **CreateRobotScreen** bascule en **mode édition** quand le hash porte `?id=` :
  pré-remplit le brouillon depuis le cache de session (nom, avatar, curseurs),
  titre et bouton adaptés (« Modifier un robot » / « Enregistrer les
  modifications »).
- **RobotsScreen** : bouton **Modifier** sur chaque carte → `create?id=<id>`.
- **Refresh du cache session** après édition (l'écurie et la table solo voient
  le robot mis à jour immédiatement).
- Création ET édition **bloquent proprement hors-ligne** (le serveur persiste
  la fiche) avec un message clair.

### Vérification
- **188 tests mobiles verts** (+1 : édition via PUT /robots/:id).
- **TNR 14/14 · 428 tests verts.** Typecheck 3 workspaces OK.
- fakeServer étendu (PUT + DELETE /robots/:id).

## v13.0.0 — Cache de session : chargement unique, mode hors-ligne, page waiting

Refonte structurante du chargement des données. L'app charge profil + wallet +
VIP + robots UNE SEULE FOIS au lancement, les garde en mémoire et les persiste.
Les écrans lisent depuis le cache (aucun aller-retour serveur au clic), et le
mode solo devient jouable hors-ligne.

### SessionCache — le cœur (KB-425)
`data/SessionCache.ts` : le serveur reste l'AUTORITÉ, le cache est un miroir
accéléré.
- **Getters synchrones** : profil, wallet, VIP, robots, isVip, canPlayOffline —
  zéro appel réseau.
- **loadAll()** au bootstrap ; **refresh ciblés** (refreshWallet/Vip/Profile/
  Robots) appelés SEULEMENT quand une donnée change réellement.
- **Résilience hors-ligne** : si un refresh échoue, on garde la dernière valeur
  connue persistée → le mode solo continue.
- **Événements bus** (session:wallet/vip/profile/robots) : les abonnés (TopBar)
  se mettent à jour sans polling.

### persistentStorage — cross-platform (KB-426)
`data/persistentStorage.ts` : abstraction sur localStorage, identique web +
WebView Capacitor APK (localStorage y est persistant). Enveloppe versionnée
`{v,at,data}` : ignore un schéma incompatible, TTL possible, namespace
`kydos.cache.*`. `clear()` n'efface que le cache, jamais le jeton. Point
d'abstraction unique pour un futur stockage chiffré natif.

### Bootstrap + preload sons (KB-427)
`data/bootstrap.ts` : charge session + tous les sons pendant la page waiting,
tolérant à l'échec réseau. `SoundService.preloadAll()` précharge effets + toutes
les mélodies en une passe. `main.tsx` : séquence `boot()` (waiting visible →
chargement → router). Login : charge la session derrière un waiting overlay.

### Waiting réutilisable (KB-428)
`components/Waiting.ts` : les 4 robots dansants de #boot extraits en composant.
`Waiting({label,overlay})` + `showWaitingOverlay()`. Écran de chargement par
défaut de toute l'application.

### TopBar + écrans branchés sur le cache (KB-429)
- **TopBar réécrit** : lit tout depuis le cache (synchrone), s'abonne à
  session:*, ZÉRO appel réseau au montage/clic. Live-chip depuis
  session.profile.activeSession.
- **WalletScreen** : synchronise le cache (applyWallet) + refresh ciblés.
- **RobotsScreen** : affiche depuis session.robots (instantané + hors-ligne),
  rafraîchit en fond.
- **TableScreen** : jeu solo depuis session.robots — HORS-LIGNE OK.
- **CreateRobotScreen** : bloque proprement hors-ligne + refreshRobots après
  création.

### Règles hors-ligne
| Fonctionnalité | Hors-ligne |
|---|---|
| Jouer en solo / entraînement | ✅ |
| Voir écurie / solde / VIP | ✅ |
| Créer un robot | ❌ (serveur requis) |
| Jouer en ligne | ❌ (serveur requis) |

### Tests & vérification (KB-430)
- **15 nouveaux tests** : SessionCache (9), persistentStorage (6).
- **3 tests e2e adaptés** (mount hydrate la session comme le bootstrap réel).
- **187 tests mobiles verts**, **TNR 14/14 · 427 tests verts**, build mobile OK,
  typecheck 3 workspaces OK. **Zéro régression.**
- `docs/session-cache.md` : architecture complète.

### Sécurité
Le cache ne contient que des données déjà connues du serveur. Aucune décision
sensible (débit, achat) ne s'appuie sur le cache : le serveur reste l'autorité,
toute erreur remonte. Le jeton garde sa clé propre, hors du namespace cache.

## v12.4.4 — Déduplication in-flight des GET + optim WalletScreen/RobotsScreen

Suite du travail de fond sur les appels API superflus. Fix ARCHITECTURAL au
niveau de l'ApiClient : impact système sur toute l'app.

### Déduplication in-flight par path (KB-424)

Cœur du fix : `ApiClient.call()` maintient une `Map<path, Promise>` des
requêtes GET en cours. Un second appel au même endpoint alors qu'une réponse
n'est pas encore arrivée ne déclenche PAS un second fetch — il partage la
Promise existante. Uniquement pour les GET (idempotents) ; jamais pour
POST/PATCH/DELETE.

**Conséquence** : deux endroits différents de l'app (TopBar + un écran, par
exemple) qui demandent la même donnée en parallèle = UN SEUL request HTTP.
La même logique de dédup est appliquée au niveau des services `readWallet()`
et `VipService.status()` pour blinder encore.

### Optims ciblées

**WalletScreen** — `refresh()` faisait DEUX appels séquentiels à `/wallet` :
un via `readWallet()`, un via `api.wallet()` pour les transactions. Réduit
à un seul appel (les transactions viennent dans la même réponse).

**RobotsScreen** — la liste des robots était refetchée à l'ouverture du
dialogue « match entre robots » alors qu'on venait de la charger. Cache
local au niveau de la screen : 1 seul call par visite.

**OnlineScreen** — plusieurs tables peuvent finir simultanément et déclencher
chacune un `reload()`. Debounce 200 ms : un seul reload au lieu de N.

### Récap cumulé des optims réseau (v12.4.2 → v12.4.4)

| Symptôme | Fix | Version |
|---|---|---|
| TopBar `window.focus` fuité → 5×paint après 5 A/R | Cleanup listener | 12.4.2 |
| Clic avatar → 1 call /wallet/vip inutile | Cache vipCache | 12.4.2 |
| VIP purchase erreur serveur → fallback local silencieux | Serveur autoritaire | 12.4.2 |
| Sockets zombies OnlineScreen | _cleanup complet | 12.4.3 |
| Socket/loop/reactRoot TableScreen non fermés | _cleanup complet | 12.4.3 |
| Timer ReplayScreen non annulé | _cleanup complet | 12.4.3 |
| **2 appels concurrents = 2 HTTP requests** | **Dédup in-flight** | **12.4.4** |
| WalletScreen : 2 calls /wallet séquentiels | 1 seul call | 12.4.4 |
| RobotsScreen : list() refetch au dialogue | Cache screen | 12.4.4 |
| OnlineScreen : reload en cascade | Debounce | 12.4.4 |

### Vérification
- Typecheck mobile/pixi/server : ✓
- Tests services (11 fichiers) : 84/84 ✓
- TNR global : NON relancé (patch strictement circonscrit).

## v12.4.3 — Audit systématique : cleanup complet au démontage des screens

Suite du fix v12.4.2 : audit exhaustif des 14 screens pour trouver TOUTES les
fuites (sockets, timers, React roots) qui survivaient à la navigation.

### 4 screens patchés (KB-423)

**`OnlineScreen`** — un socket `TableSocket` était ouvert PAR TABLE listée
(potentiellement 20+ par visite). `cleanupSockets()` n'était appelé que sur
le bouton « Accueil » et à `onCountdown` — jamais au démontage automatique
(clic dans le fan, changement de hash…). **Fix** : `_cleanup` posé sur root
→ toutes les sockets fermées à la sortie de l'écran.

**`TableScreen`** — le `_cleanup` existant faisait uniquement
`soundService.stopMelody()`. Le `TableSocket` de partie en ligne, la
`GameLoop` locale et le `reactRoot` de PixiTable restaient ouverts.
**Fix** : `_cleanup` étendu :
```
loop.dispose() + onlineSocket.disconnect() + reactRoot.unmount()
```

**`ReplayScreen`** — `setTimeout` du tick de replay et `reactRoot` n'étaient
coupés QUE sur le bouton « Quitter ». Une navigation via le fan laissait le
timer en boucle infinie. **Fix** : `_cleanup` → `clearTimeout(timer)` +
`reactRoot.unmount()`.

**`InvitationsScreen`** — le debounce timer de recherche d'invitations
n'était pas coupé au démontage (mineur, max 300 ms). **Fix** : ref
partagée + `clearTimeout` chaîné dans le `_cleanup` existant.

### Vérification
- Typecheck mobile/pixi/server : ✓
- Tests VipService (12), AdManager (13), localGame (11), gameLoop (7) : 43/43 ✓
- TNR global : NON relancé (patch strictement circonscrit aux screens).

### Récap complet des fuites corrigées (v12.4.2 + v12.4.3)

| Screen | Fuite | Statut |
|---|---|---|
| `TopBar` | `window.focus` listener accumulé + calls API superflus au clic | v12.4.2 ✓ |
| `HomeScreen` | Cleanup TopBar non chaîné | v12.4.2 ✓ |
| `OnlineScreen` | Sockets lobby non fermés | v12.4.3 ✓ |
| `TableScreen` | Socket + loop + React root non fermés | v12.4.3 ✓ |
| `ReplayScreen` | Timer + React root non fermés | v12.4.3 ✓ |
| `InvitationsScreen` | Debounce timer non annulé | v12.4.3 ✓ |
| `VipService.purchase` | Fallback local silencieux masquant erreurs serveur | v12.4.2 ✓ |

Le TopBar ne fait plus **aucun appel réseau** pour ouvrir le menu profil.
Chaque écran nettoie exhaustivement ses ressources au démontage.

## v12.4.2 — Fix racine : TopBar spamait les API + VIP autoritaire serveur

Deux bugs racines corrigés à la source.

### Bug 1 — TopBar accumulait des listeners `window.focus`
`TopBar.ts` posait `window.addEventListener('focus', ...)` **sans jamais le
retirer**. Chaque montage de `HomeScreen` (accueil → Mes robots → accueil…)
créait un TopBar de plus, donc un listener de plus. Après 5 aller-retours,
5 listeners actifs — un simple focus (retour de fenêtre, ouverture d'un
dialogue) déclenchait **5×`paintVip()` + 5×`paint()`** = 10 calls d'un coup.

**Fix propre** :
- Le TopBar expose désormais un `_cleanup` sur l'élément retourné (via
  `bar._cleanup = () => { removeEventListener(...) }`).
- `HomeScreen` chaîne son `root._cleanup` sur celui du TopBar.
- Le router (`main.tsx`) appelle déjà `outgoing._cleanup?.()` avant de
  remplacer l'écran → aucun listener ne fuit.
- Le mécanisme est extensible : le TopBar écoute désormais les événements
  ciblés `kb:wallet-changed` et `kb:vip-changed`, émis UNIQUEMENT par les
  écrans qui modifient réellement le solde ou le VIP (achat, code promo,
  récompense, claim daily). Zéro polling, zéro focus, zéro re-fetch au clic.

### Bug 2 — Clic sur l'avatar déclenchait un call `/wallet/vip`
`profileCluster.click` faisait `await vipLocal.status()` **juste pour
afficher le menu** (3 items). Ce call réseau pour ouvrir un menu était
absurde.

**Fix propre** : le TopBar tient un `vipCache` et un `meCache` peuplés
UNE seule fois au montage. Le clic ouvre le menu à partir du cache — aucun
call API. Idem pour `me` (utilisateur courant, live-chip).

### Bug 3 — `purchase()` VIP retombait en local si le serveur échouait
Le fallback était masqué par un `catch { /* retombe en local */ }` : quand
le serveur renvoyait une erreur (solde insuffisant, réseau, 500), le
mobile faisait un débit local `spendTokens()` sur `localStorage` — le
serveur restait la source de vérité pour le solde, mais le mobile croyait
avoir du VIP. Résultat : divergence + solde affiché faux.

**Fix propre** : quand l'utilisateur est authentifié, le serveur est la
SEULE autorité. Toute erreur remonte au caller. `WalletScreen.onBuyVip`
attrape l'erreur et affiche un toast clair (« Solde insuffisant » si le
message serveur le mentionne). Le fallback local est strictement réservé
au mode démo hors-ligne (jamais utilisé quand un utilisateur est connecté).

### Récap des appels /wallet + /wallet/vip + /me au montage
- **Avant** : imprévisible, jusqu'à 10×3 = 30 calls après 5 A/R + un focus.
- **Après** : exactement 3 calls (wallet + vip + me) au montage du TopBar,
  1 seul TopBar à la fois (cleanup à chaque démontage), rafraîchissements
  uniquement sur événement métier explicite.

### Vérification
- Typecheck mobile/pixi/server : ✓
- Tests VipService (12) : ✓
- Tests AdManager (13) : ✓
- TNR global : NON relancé (comme demandé, patch strictement ciblé).

### Fichiers touchés
- `mobile/src/presentation/components/TopBar.ts` — réécrit sans fuite
- `mobile/src/presentation/screens/HomeScreen.ts` — cleanup chaîné
- `mobile/src/presentation/screens/WalletScreen.ts` — notifieurs +
  catch d'erreur VIP
- `mobile/src/services/ads/VipService.ts` — serveur autoritaire, plus de
  fallback silencieux quand authentifié

## v12.4.1 — Bord seed : normalisation défensive des tâches malformées

Correctif ciblé : le seed initial (`npm --prefix server run seed`) plantait
sur 6 tâches héritées (KB-390 à KB-395) au format cassé — `complexity`
contenant une string `"1 h"`, `description` étant un tableau, `acceptance`
une string, `type` un nombre. Dérive causée par un bug de génération dans
une session antérieure.

### Fix (KB-421)
Nouvelle fonction `normalizeTask()` dans `board/server/scripts/normalize.ts` qui
coerce chaque champ vers le type attendu par le schéma Mongo, sans perdre
d'information :

- `description` en tableau → jointure lisible (`. `-séparée).
- `complexity: "1 h"` → extraction du nombre (1) via regex, string originale
  loguée en warning.
- `acceptance` en string → tableau à un élément.
- `type` en nombre → converti en string.
- `instructions`/`acceptance` null → tableaux vides (jamais null en DB).
- `history` mal formée → filtrage des entrées invalides.

Le seed loge chaque correction (`⚠ KB-390 corrigé : description était un
tableau, complexity="1 h" → 1, …`) et ne plante JAMAIS sur des données
douteuses. Import complet + auteur `seed` traçable.

### Vérification (dry-run sur le vrai tasks.json)
```
Total: 150  OK: 150  Corrigées: 6  Rejets: 0
  KB-390: description était un tableau, complexity="1 h" → 1, acceptance était une string, type=2 converti en string
  KB-391: description était un tableau, complexity="0.5 h" → 0.5, …
  KB-392: description était un tableau, complexity="2 h" → 2, …
  KB-393: description était un tableau, complexity="4 h" → 4, …
  KB-394: description était un tableau, complexity="4 h" → 4, …
  KB-395: description était un tableau, complexity="2 h" → 2, …
```

### Tests
- **12 nouveaux tests** dans `board/server/scripts/normalize.test.ts` :
  cas réel KB-390, tâches saines (aucun warning), cas dégénérés (id manquant,
  complexity absente, description objet, null-safe, history mal formée…).
- Total tests board : **17** (12 nouveaux + 5 existants sur `computeDiff`).
- TNR Belote **NON relancé** (aucun impact sur le jeu, patch strictement
  circonscrit à `board/`).

### Fichiers touchés
- `board/server/scripts/normalize.ts` (nouveau)
- `board/server/scripts/normalize.test.ts` (nouveau, 12 tests)
- `board/server/scripts/import-tasks.ts` (import + log des warnings)
- `board/server/vitest.config.ts` (scan aussi `scripts/**`)
- `board/server/package.json` v1.0.1 · `board/web/package.json` v1.0.1

## v12.4.0 — Bord : backoffice complet de gestion des tâches

Nouveau module autonome `board/` : backoffice web + API pour gérer le
référentiel des tâches. Deux comptes (ameur + hamido), thèmes Ubuntu/Mac
clair/sombre, historique versionné de chaque modification.

### Backend Bord (KB-416, KB-417, KB-418)
- **API Express + Mongoose** sur base Mongo dédiée `bordjira` (séparée du jeu).
  Modèles `BordUser` (bcrypt) et `Task` (miroir enrichi du JSON avec `taskId`
  humain, `revision`, `lastModifiedBy`, `updatedAt` auto).
- **Auth JWT 12 h** + middleware `requireAuthentication`. Deux comptes seed
  `ameur` et `hamido` (mot de passe `@kantoA123`, rôle admin).
- **Endpoints** : `GET/POST/PATCH/DELETE /api/tasks`, `GET /api/tasks/:id/archive`,
  `GET /api/archive/recent`, `GET /api/archive/by/:username`, `POST /api/auth/login`,
  `GET /api/auth/me`.
- **Archivage automatique versionné** : chaque `PATCH` réussi écrit un
  `TaskArchive` avec snapshot COMPLET AVANT modif + diff champ par champ +
  auteur + horodatage + note optionnelle. Les suppressions archivent aussi.
  **Aucune modification n'est jamais perdue** — l'API `/tasks/:id/archive`
  restitue tout l'historique de chaque tâche.
- **Seed idempotent** (`npm run seed`) : crée les 2 comptes + importe les 150
  tâches du `tasks.json` existant vers Mongo (si vide).

### Frontend Bord (KB-419)
SPA vanilla-TS (~14 KB gzip), zéro framework lourd :
- **Vue Login** avec gestion d'erreur.
- **Vue Board** : stats (P1 ouvertes / en attente / terminées), filtres
  (statut/priorité/version/domaine), tri intelligent, table dense avec badges
  colorés, dates relatives.
- **Modal d'édition** avec onglet **Historique** — rendu diff visuel : avant
  en rouge barré, flèche `→`, après en vert, auteur + date + numéro de
  révision. Note optionnelle sur chaque modification.
- **4 thèmes basculables en 1 clic** : `ubuntu-dark` (défaut, orange + aubergine
  + typo Ubuntu), `ubuntu-light`, `mac-dark` (bleu système + typo SF),
  `mac-light`. Persistance `localStorage`.

### Déploiement PM2 (KB-420)
`board/ecosystem.config.cjs` : 2 processus (`bord-api` sur `:4100`, `bord-web`
sur `:4200`), logs séparés dans `board/{server,web}/logs/`, restart auto,
`max_memory_restart`, env intégrée.

**Mise en route** :
```bash
cd board
npm --prefix server install
npm --prefix web install
npm --prefix server run seed
VITE_API_URL=http://localhost:4100/api npm --prefix web run build
pm2 start ecosystem.config.cjs
```

### Vérification
```
Belote  : TNR 14/14 · 412 tests (inchangé)
Bord    : 5 tests unitaires sur la logique de diff
Server  : typecheck strict ✓  Web : typecheck strict ✓  Build web : 302 ms
```

### Fichiers créés (v12.4.0)
- `board/server/` — API complète (Express + Mongoose + JWT)
- `board/web/` — SPA (Vite + TS + 4 thèmes)
- `board/ecosystem.config.cjs` — PM2 2 process
- `board/README.md` — mode d'emploi complet
- `board/.gitignore`

## v12.3.0 — Parité formelle des cerveaux mobile ↔ core

Refonte majeure du pilote mobile pour garantir qu'un robot **pense exactement
la même chose** en local mobile, front web, compétition et partie en ligne.

### Fabrique unifiée `buildLocalGame` (KB-411)
Nouveau module `mobile/src/services/localGame.ts` — fonction PURE :
```ts
buildLocalGame(setup, userRobots) → { engine, players, robots, brains, mySeat }
```
Utilise **exactement les mêmes primitives** que le web (`LocalTableEngine`) et
le serveur (`liveGame.service`) :
- `robotFicheFromServer(ServerRobot)` → `RobotFiche` (helper typé, plus de
  `as never` dans TableScreen).
- `robotFromFiche(fiche, fallback)` pour les robots CHOISIS par l'utilisateur
  (leur `algoSpec` complet est passé au cerveau).
- `makeRobot({...})` pour les sièges « auto » (personnalité paramétrée).
- `createAlgorithm(robot, rules, onLog)` pour le cerveau exécutable.

### Surcoinche gérée dans `GameLoop.plan()` (KB-412)
Parité stricte avec `LocalTableEngine.planNextStep` et `liveGame.service.advance` :
- Lecture de `view().surcontreSeats`.
- Sélection du premier robot pending.
- Appel de `shouldSurcontrer(fiche, view, seat)` avec la fiche complète.
- Champ `robots: (RobotConfig | null)[]` (optionnel, rétrocompat) ajouté à
  `GameLoopOptions`.

### `TableScreen.buildAndStart` refondu (KB-414)
De 40 lignes inline (avec cast `as never`) à un simple appel :
```ts
const built = buildLocalGame(setup, robots);
mySeat = built.mySeat;
loop = new GameLoop(engine, { brains, robots: robotConfigs, onTick, onEnd });
```
Imports inutilisés retirés : `ContreeRules`, `DEFAULT_PARTIE`, `createAlgorithm`,
`makeRobot`, `robotFromFiche`, `EnginePlayer`, `mySeatFromSetup`, `GREEK`, `rules`.

### Tests de parité (KB-413)
**Le vrai enjeu de la demande.** Nouveau fichier `localGame.parity.test.ts` (4
tests) qui **garantit mathématiquement** que le même `algoSpec` produit la
même décision entre mobile et core :

1. **Idempotence** — le cerveau est une fonction pure : même contexte → même
   résultat.
2. **Même moteur, même spec = même décision** — un cerveau construit via
   `buildLocalGame` et un cerveau construit via l'appel core direct, tous deux
   avec `ALGO_CLASSIQUE`, produisent EXACTEMENT le même `{kind, bid|card, thinkMs}`
   sur le même moteur.
3. **Personnalité serveur transitée** — un robot avec `algoSpec: ALGO_AGRESSIF`
   porte bien `personality.aggressiveness = 9` (pas la défaut 5) → la spec
   traverse bien serveur → mobile → cerveau.
4. **Partie complète 4 robots** — s'exécute jusqu'à `partie_end` sans erreur
   (validation d'intégration, ~5 000 itérations).

Plus 7 tests unitaires sur `buildLocalGame` (placement humain, robot choisi vs
auto, fallback si id inconnu, tous-robots, manches transmis) et 2 tests
supplémentaires sur `GameLoop` (surcontre, rétrocompat robots optionnels).

### Documentation (KB-415)
Section « 2. Mobile — entraînement local » ajoutée à `docs/architecture-robots.md`
au même niveau que les 3 autres pilotes. Table des fichiers de référence
enrichie. Section Tests mise à jour.

### Vérification
```
TNR : 14/14 · 412 tests (+17 tests parité + fabrique + surcoinche)
```

### Contrat désormais garanti par la CI
> Un robot avec le même `algoSpec` prend LA MÊME décision quel que soit
> l'endroit où il joue : mobile local, front web, compétition ou partie en
> ligne.

Vérifié par 4 tests de parité qui échoueront si un pilote diverge de belote-core.

## v12.2.2 — Fix racine 'plugin AdMob not installed' + débit VIP serveur

Correction des deux bugs restants après diagnostic à froid.

### AdMob : chargement via le pont Capacitor (KB-407)
**Cause racine du faux positif « plugin not installed »** : le code utilisait
`await import('@capacitor-community/admob')` avec `/* @vite-ignore */`. Dans la
WebView Capacitor, cet import tente une résolution URL du module — qui échoue
systématiquement — d'où le `catch` qui renvoie `null` puis le message trompeur.

**Fix** : lire directement `window.Capacitor.Plugins.AdMob` (pont Capacitor
global). C'est **le pattern recommandé** pour tous les plugins Capacitor en
dépendance douce :

- Aucun `import()` dynamique — aucun risque de casse WebView.
- Aucun paquet npm requis à la compilation — le build passe sans le plugin.
- Le plugin est détecté dès que `npx cap sync android` a copié le code natif.

Un log de diagnostic apparaît dans la console si le pont Capacitor ne trouve
vraiment pas `AdMob` — pour distinguer un vrai « pas installé » d'un simple
« pas sync ».

### VIP : débit côté serveur (KB-408)
**Cause du solde qui ne bougeait pas après achat VIP** : `spendTokens` ne
débitait qu'en local (`localStorage`), mais `readWallet` lisait le solde
**serveur** (qui ne savait rien du débit). Le décrément était silencieusement
perdu à l'affichage.

**Fix** : ajout d'un flux VIP serveur-premier complet :

- **`GET /api/wallet/vip`** — statut VIP courant (`expiresAt`).
- **`POST /api/wallet/vip`** — corps `{ planId: 'day' | 'days10' | 'days30' }`.
  Débit atomique du wallet + prolongation cumulative.
- Champ `vipExpiresAt` (Date, indexé) sur le user.
- Kind `'vip'` ajouté aux transactions.

Le débit est maintenant **réellement persisté** sur le user et se voit
immédiatement dans le solde affiché.

**Tests intégration** : 4 nouveaux (débit + expiration, refus solde
insuffisant, cumul 2×1j=2j, getVipStatus null par défaut).

### Bonus (KB-409, KB-410)
- **`admobTestDeviceIds`** dans `AD_SETTINGS` : ajouter TON device pour recevoir
  des pubs de test même hors `TEST_MODE`.
- **`debugGeography: EEA`** forcée en test → reproduction du flux consentement
  RGPD depuis n'importe où.
- **Section dépannage docs/ADS.md refondue** : sous-section dédiée « Plugin
  AdMob not installed alors qu'il est installé » (3 causes possibles + check
  live via `chrome://inspect`), correction commande `adb logcat` pour **zsh**
  (`no matches found: *:E` → quoter `'*:E'`), guide `testDeviceIds`.

### Vérification
```
TNR : 14/14 · 399 tests (+4 tests intégration VIP serveur)
```

## v12.2.1 — Correctifs AdMob v6 + VIP débit/cumul + training visible + doc refondue

Grosse tranche de correctifs suite au retour terrain de la tablette Samsung.

### AdMob : passage à l'API v6+ (KB-400)
Refonte du fournisseur AdMob pour la **version v6 du plugin** (celle installée) :
- **App Open** utilise maintenant `loadAppOpen` / `isAppOpenLoaded` / `showAppOpen`
  (les méthodes v5 n'existent plus, ça expliquait pourquoi elle ne s'affichait
  jamais).
- **Consentement RGPD** géré automatiquement (`requestConsentInfo` + `showConsentForm`).
  **C'était le vrai blocage sur les pubs en France** : sans consentement, le SDK
  refuse de charger les pubs silencieusement.
- Préchargement systématique avant chaque affichage récompensé.
- Chaque échec renvoie une **raison** exploitable (plugin-missing, unavailable,
  cancelled, error).

### VIP débite et cumule (KB-401)
`VipService.purchase()` **débite maintenant les jetons** via un callback
`spendTokens` injecté. Atomique : solde insuffisant → erreur, rien n'est prolongé.
Le cumul (2 × 1 jour = 2 jours) est vérifié par un test dédié.

### VIP visible partout (KB-402)
- **Couronne dorée ⭐** sur le petit robot avatar de la barre supérieure.
- **Bandeau doré** dans « Mon profil » (onglet Infos) avec la date d'expiration.
- Rafraîchi automatiquement au focus de la fenêtre.

### Message clair pour la pub récompensée (KB-404)
Fini le générique « Pub non terminée — aucune récompense ». Selon la raison
réelle :
- « Plugin AdMob non installé sur ce device »
- « Pub indisponible — réessayez dans quelques secondes »
- « Pub interrompue — regardez-la entièrement pour la récompense »
- « Impossible de charger la pub — vérifiez votre connexion »

### Training : cartes visibles respecte le choix (KB-405)
L'option de visibilité du dialogue d'entraînement était **ignorée** (dos codé
en dur). Maintenant :
- **`none`** → dos (comportement normal)
- **`robots`** → cartes des robots visibles
- **`all`** → tout visible, y compris le coéquipier (via `partnerFaceDown`
  désormais paramétrable dans PixiTable)

### Version de l'app dans À propos (KB-403)
`mobile/src/version.ts` créé comme source de vérité. Carte version en bas de
l'écran À propos : « Kýdos Belote v12.2.1 ».

### Documentation ADS refondue (KB-406)
`docs/ADS.md` restructuré en deux sections indépendantes :
- **🚀 MODE TEST** (6 étapes) : voir des pubs de test sur ton device en 15 min,
  sans compte AdMob, avec le **piège RGPD explicitement documenté**.
- **🚀 MODE PRODUCTION** (7 étapes) : inscription AdMob, unit IDs, passage aux
  vraies pubs.
- **Section dépannage** avec logcat, codes d'erreur AdMob, checklist de reset.
- Message clair d'entrée : **pas besoin d'être publié sur le Play Store pour
  tester**.

### Vérification
```
TNR : 14/14 · 395 tests · +3 tests VIP (débit, cumul 2x1j, solde insuffisant)
```

## v12.2.0 — Table épurée, icônes SVG, VIP en jeu, menu profil

Finitions d'interface : table agrandie, annonce repositionnée, icônes SVG,
signalement VIP à la table, menu profil ergonomique, doc ADS clarifiée.

### Table de jeu (KB-390, KB-391)
- **Deux bannières pub retirées** du bas de la table (la bannière unique app-wide
  est gérée ailleurs) -> le feutre **gagne en hauteur** (bas 64px -> 8px).
- **Popup d'annonce** déplacé du haut vers le **bas, juste au-dessus des cartes**
  du joueur (plus esthétique, à portée de pouce).

### Icônes SVG (KB-392)
Le menu de gauche (quitter, spectateurs, son, réactions, pause, vitesse) utilise
désormais des **icônes SVG épurées** (trait, colorables) au lieu d'emojis. Fini
l'emoji « porte » pour quitter.

### VIP visible en jeu (KB-393)
Un joueur VIP est signalé à la table par un **halo doré** autour de son logo,
visible par tous. Le halo de ton siège est câblé ; le VIP des joueurs distants
nécessitera un champ serveur (suite prévue).

### Menu profil (KB-394)
Clic sur le bloc **niveau/avatar** en haut -> **feuille déroulante** mobile :
Mon profil, Mon porte-monnaie, Déconnexion. Conçue pour être **simple à étendre**
et ergonomique au pouce.

### Documentation ADS (KB-395)
Nouveau **« Démarrage express »** dans docs/ADS.md : voir des pubs de test sur
device en ~10 min (plugin, App ID de test Google fourni, config déjà prête, où
voir chaque type de pub, pièges à éviter).

### Vérification
```
TNR : 14/14 · 392 tests
```

## v12.1.3 — .env.sample : valeurs par défaut (IP LAN, Mongo auth, CORS)

Valeurs par défaut des exemples d'environnement : `VITE_API_URL` sur l'IP LAN de
dev, `MONGO_URI` avec authentification, `CORS_ORIGIN` multi-origines.

## v12.1.2 — README enrichi (cap sync expliqué) + board/ à la racine

- **`npx cap sync android` expliqué** : ce que la commande fait concrètement
  (copie du bundle, mise à jour des plugins natifs, sérialisation de la config),
  et la différence avec `cap run` et `cap open`.
- **Référentiel déplacé** : `docs/tasks/` → **`board/`** à la racine du projet
  (`board/tasks.json`, `board/board.html`, `board/BACKLOG.md`). Toutes les
  références mises à jour (README, CONTRIBUTING, SPEC, CHANGELOG, ROADMAP, board
  lui-même).

## v12.1.1 — README : guide device & debug (Ubuntu + macOS)

Documentation développeur enrichie dans le README (aucun changement de code) :
- **Activer le mode développeur** sur une tablette/téléphone Android (7 clics sur
  le numéro de build, débogage USB).
- **Connexion USB** avec `adb devices` — sections **Ubuntu** (plugdev, install
  adb) et **macOS** (platform-tools via brew).
- **Ouvrir Android Studio** avec Capacitor (`npx cap open android`).
- **Resynchroniser après une modification** (rebuild + `cap sync`, raccourcis
  `cap:android`/Makefile, purge du cache).
- **Inspecter depuis Chrome** (`chrome://inspect`) une device connectée :
  console, réseau, éléments.
- **Voir les logs natifs** (`adb logcat`, `make logs-android`).
- **Débugguer dans Android Studio** (Logcat, points d'arrêt natifs) + note iOS
  (Safari Web Inspector, logs Xcode).

## v12.1.0 — Économie de jetons complète : prélèvement au lancement + codes promo

Le système de jetons fonctionne de bout en bout : mise prélevée **au démarrage**
de la partie, rechargement par **code promo**, accès porte-monnaie au clic.
Documentation : **docs/WALLET.md** + section AdMob test/prod dans **docs/ADS.md**.

### Prélèvement des mises au lancement (KB-380 / corrige KB-300)
`walletService.stakeGame()` débite la mise de chaque joueur au démarrage de la
table (100 ◆ humain, 50 ◆ robot ; entraînement local gratuit). **Tout ou rien** :
tous les soldes sont vérifiés d'abord ; si un débit échoue, les débits déjà faits
sont **remboursés** (transaction `refund`). La partie est refusée si un joueur
n'a pas de quoi payer. Corrige l'asymétrie historique (gains versés sans mise).

### Codes promo de rechargement (KB-381)
- Modèle Mongo `PromoCode` : **code 12 chiffres**, valeur en jetons, **date de
  validité** (1 semaine, 1 mois…), quota d'utilisations, **anti-rejeu par
  personne**, activation/désactivation, libellé.
- Endpoint `POST /api/promo/redeem` (normalise les tirets), erreurs explicites
  (inconnu, expiré, épuisé, déjà utilisé).
- **Seed** : 3 codes de démo (`1111-2222-3333` 500 ◆/7 j, `4444-5555-6666`
  2 000 ◆/30 j, `9999-8888-7777` 10 000 ◆/30 j).
- Mobile : carte « Recharger avec un code » dans le porte-monnaie, champ affichant
  un **tiret tous les 4 chiffres** (valeur envoyée = chiffres seuls).

### Accès porte-monnaie + doc (KB-382)
- La pastille ◆ en haut **ouvre la page Mon porte-monnaie** (quotidien, promo,
  VIP, pub récompensée regroupés) au lieu de débloquer directement.
- **docs/ADS.md** : section AdMob mode TEST (inscription, pubs de test visibles
  sur device) et passage en PRODUCTION, pas à pas.
- **docs/WALLET.md** : économie, prélèvement, codes promo, VIP.

### Vérification
```
TNR : 14/14 · 392 tests (+8 : promo serveur + promoCode mobile + contrat)
TNR serveur : 4/4 · 206 tests
```

### Note d'intégration
Le prélèvement au lancement et la redemption réelle des codes touchent MongoDB :
leur exécution complète est couverte par le job CI `tnr-server`
(`MONGOMS_AVAILABLE=1`). La logique pure (format promo, balance) est testée
partout.

## v12.0.0 — Publicité multi-fournisseurs + VIP sans publicité

Monétisation complète de l'application mobile : bannière, interstitiels, App
Open, pubs récompensées, et statut VIP. Architecture modulaire — change de
réseau en une ligne. Documentation : **docs/ADS.md**.

### Architecture multi-fournisseurs (KB-370)
Module `mobile/src/services/ads/` en couches nettes : interface `AdProvider`,
**4 fournisseurs** (Google **AdMob** par défaut, AppLovin MAX, Unity Ads, Meta
Audience Network) + fournisseur nul (web/dev). Registre/fabrique piloté par
`adConfig.ACTIVE_NETWORK` : **changer de réseau = une ligne**. Chaque plugin
natif est en **dépendance douce** (import dynamique) : l'app compile et tourne
même sans le plugin installé.

### AdManager — orchestration (KB-371)
Point d'entrée unique appelé par EMPLACEMENT :
- **Interstitiels** : après chaque partie, avant de créer une table, avant de
  lancer une partie sauvegardée (avec anti-spam entre deux).
- **App Open** : avant une partie d'entraînement, et après **3 min** de
  navigation hors table (au prochain accès à un écran éligible).
- **Bannière adaptive** : bas de l'écran hors table, **rafraîchie toutes les
  60 s**, emplacement unique.
- **Récompensées** : récompense quotidienne, ou **+100 ◆** par visionnage.

### VIP — sans publicité (KB-372)
Un VIP ne voit **aucune** publicité. Barème en jetons : **600 ◆ / 1 jour**,
**4 500 ◆ / 10 jours**, **30 000 ◆ / 30 jours**. Un achat pendant une période
active **prolonge** (cumule). Serveur-premier avec fallback local. UI d'achat +
statut dans le porte-monnaie.

### Récompensées, bannière & doc (KB-373)
Bouton pub récompensée dans le wallet, bannière branchée sur le routeur,
**docs/ADS.md** (architecture, installation SDK par réseau, changement de
fournisseur, VIP, emplacements, réglages).

### Vérification
```
TNR : 14/14 · 384 tests (+22 : VipService + AdManager)
```

### Note d'intégration
Les vraies pubs s'affichent uniquement sur device natif après installation du
plugin (`npm i @capacitor-community/admob && npx cap sync` pour AdMob) et
renseignement de vos unit IDs. En web/dev, aucune pub (fournisseur nul). Détails
dans docs/ADS.md.

## v11.13.0 — Menu d'icônes à gauche + table Pixi au maximum

Table encore plus grande et interface épurée : tous les contrôles regroupés dans
un menu vertical d'icônes à gauche, barre du haut supprimée.

### Menu vertical d'icônes à gauche (KB-360)
Tous les contrôles de la table réunis en **icônes** dans une colonne à gauche :
- 🚪 **Quitter** la table
- 👁 **Spectateurs** (avec badge compteur)
- pastille verte **en ligne** (pulsée, sans texte)
- 🔊 **Volume** (ouvre le modal mélodie/effets)
- 🙂 **Smileys** (ouvre un picker de réactions, émission câblée)
- en local : ⏩ **Vitesse** (badge ×) et ⏸/▶ **Pause**

La liste de smileys du dock HUD est désactivée : **une seule** liste, dans le
menu, plus de doublon.

### Table Pixi agrandie au maximum (KB-361)
- **Bouton Quitter du haut supprimé** → la barre du haut disparaît.
- Le feutre **monte à 6px du bord supérieur** (contre 42px) : hauteur de jeu
  maximale. Gauche 60px pour le menu, bas 64px pour les bannières pub.

### Dernier pli aligné (KB-362)
Le panneau « Dernier pli » monte **au niveau du haut de la feuille de score**.

### Vérification
```
TNR : 14/14 · 362 tests · builds web + table + mobile OK
```

## v11.12.0 — Refonte ergonomique de la table de jeu

Table plus grande et plus lisible, moins d'éléments qui encombrent, cartes du
milieu dont les valeurs ne sont jamais cachées, et popup d'annonce qui ne cache
plus vos cartes. Suite aux retours sur captures.

### La table respire (KB-350 à KB-352)
- **Table agrandie** — surtout en hauteur (haut réduit, côtés resserrés).
- **Deux emplacements de bannière publicitaire** réservés en bas (gauche + droite).
- **Haut épuré** : retrait du score NOUS/EUX (déjà dans la feuille de score), de
  l'atout, et de la barre de noms (les noms restent à chaque siège).
- **Rail gauche** : spectateurs, statut en ligne (simple **pastille verte**, sans
  le mot « online »), et volume 🔊 regroupés à gauche.

### Cartes jouées — valeurs jamais cachées (KB-353)
Nouveau placement du pli : chaque carte se décale vers le **siège de son joueur**
(quatre secteurs distincts autour du centre), inclinaison perpendiculaire ±14°.
Les **coins (rang + couleur) restent dégagés** — plus aucun risque de masquer la
valeur d'une carte dessous, tout en gardant une superposition naturelle.

### Plus d'espace au centre (KB-354, KB-355)
- Mains du joueur (bas) et du partenaire (haut) **collées aux extrémités**.
- Panneau **« Dernier pli » remonté** tout en haut à gauche.

### Popup d'annonce repensé (KB-356)
- **Ancré en haut-centre** : ne couvre plus votre main — vous voyez vos cartes en
  annonçant.
- **Textes retirés** (titre et consigne), **input de valeur réduit**.
- **Passe / Suivre / Demande** sur une ligne compacte avec le sélecteur de valeur.

### Étiquettes compactes (KB-357)
Logo + nom de chaque joueur/robot réduits (logo 32→24, nom 13→11px).

### Vérification
```
TNR : 14/14 · 362 tests · builds web + table + mobile OK
```

## v11.11.0 — Infrastructure de connexion mobile↔serveur : healthcheck + Makefile + doc

Chantier complet de fiabilisation de la connexion mobile↔serveur (KB-340). Doc
de référence : **`docs/mobile-connection.md`**.

### Choix produit assumé — HTTP en dev
`mobile/capacitor.config.ts` bascule en `androidScheme: 'http'` + `cleartext:
true`. HTTPS uniquement en production, via reverse-proxy Caddy ou tunnel
Cloudflare (documenté §7).

### `scripts/healthcheck.mjs` — 7 vérifications automatiques
`make check` diagnostique en 3 s : IP LAN détectée, serveur écoute sur le port,
`/api/health` répond en local, `/api/health` accessible depuis le réseau, CORS
accepte `capacitor://localhost`, `mobile/.env` cohérent avec la cible (device /
emulator / ios-sim / remote), Socket.IO répond, Capacitor configuré HTTP. Chaque
KO indique la commande exacte pour corriger.

### `Makefile` — workflows unifiés
- `make help` — liste toutes les cibles regroupées par section.
- `make check` — le healthcheck.
- `make dev` — serveur permissif + web en parallèle.
- **4 cibles mobile** en une commande : `make android-device`,
  `make android-emulator`, `make ios-sim`, `make ios-device`, `make remote
  REMOTE=…`. Configure `mobile/.env`, fait `cap sync`, lance l'app.
- Debug : `make inspect-android` (rappel `chrome://inspect`),
  `make inspect-ios` (Web Inspector Safari), `make logs-android`
  (`adb logcat`), `make logs-ios`.
- Prod : `make prod`, `make build`, `make tnr`, `make coverage`, `make e2e-web`.

### `docs/mobile-connection.md` — guide complet
9 sections : concepts, prérequis **Mac + Ubuntu**, les 4 cibles pas à pas,
dev vs prod (variables d'env), debug (inspection, logs), structure du projet,
production HTTPS (Caddy, Cloudflare), troubleshooting exhaustif, résumé
5 commandes.

### Divers
- `set-dev-ip.mjs` : commentaire du `.env` adapté à la cible détectée (device
  physique / émulateur Android / simulateur iOS).
- Tests unitaires du healthcheck (`detectLanIp`, URLs par cible) : +7 tests.

### Vérification
```
TNR : 14/14 · 359 tests (+7)
Healthcheck : 3/7 KO sans serveur, 6/7 OK avec serveur mock, tous les KO
              guident vers la correction.
```

## v11.10.0 — Sons de la table : effets, mélodies par table, volumes

Système audio complet de la table de jeu mobile (KB-330). Doc : `docs/SOUNDS.md`.

### Technique retenue
**Web Audio API native, zéro dépendance** : compatible WebView Capacitor et
navigateur, latence faible, et deux bus de volume indépendants (mélodie /
effets) via des `GainNode`.

### Effets sonores (10)
Ma carte, carte d'un autre joueur/robot, émoji, annonce de belote (et rebelote),
passe, hausse d'annonce, hausse APRÈS réflexion 💭, contré, surcontré, ramassage
du pli. Déclenchés par un détecteur PUR de diff de vues moteur
(`soundEvents.ts`, testé) — le même en local et en ligne ; les émotes sonnent au
signal socket. Rejoindre une partie en cours ne déclenche pas de rafale.

### Mélodies d'ambiance — une par TYPE de table
En boucle, sur leur propre volume : `default` = **Ode à la joie**, `local`
(entraînement) = **Für Elise**, `hybride` (équipe) = valse originale,
`acier`/`competition` = motif de la **5e symphonie**, `royal`/`vip` = arpèges
façon **Clair de lune**. Compositions du **domaine public** (Beethoven)
**synthétisées** par `mobile/scripts/generate-sounds.py` (conservé dans le
repo) : aucun droit d'auteur. La mélodie suit le kind reçu du lobby en ligne et
se coupe à la sortie d'écran.

### Remplacement facile
Fichiers à **noms fixes** dans `mobile/public/sounds/` : remplacer un son =
déposer un fichier du même nom. Mappings centralisés dans `soundConfig.ts`
(ajouter une mélodie de table = 1 fichier + 1 ligne).

### Réglage des volumes
Chip 🔊 sur la table → modal du design system avec deux curseurs (mélodie /
effets, son témoin au réglage), **persistés sur l'appareil** (localStorage).
Déblocage autoplay au premier geste.

### Vérification
```
TNR : 14/14 · 352 tests (+17 : détecteur d'événements + service + config)
Build mobile : 15 fichiers audio copiés dans dist/sounds/
```

## v11.9.1 — Connexion mobile au serveur : URL configurable pour device

Correctif du « serveur injoignable » à la connexion sur téléphone physique.

### Cause
Sur un device Android/iOS physique, `localhost` désigne le TÉLÉPHONE, pas la
machine de dev. L'URL par défaut `http://localhost:4000/api` ne peut donc pas
joindre le serveur : il faut l'IP de la machine sur le réseau Wi-Fi local.

### Corrigé / ajouté
- **`mobile/.env.example`** documenté (device Wi-Fi, émulateur AVD `10.0.2.2`,
  simulateur iOS, prod).
- **`mobile/scripts/set-dev-ip.mjs`** (`npm --workspace belote-mobile run
  set-dev-ip`) : détecte l'IP LAN et génère `mobile/.env` automatiquement.
- **Message d'erreur réseau explicite** : affiche l'URL réellement contactée et,
  si c'est localhost, guide vers l'IP de la machine (`API_BASE_URL` exposée).
- **CORS serveur** : accepte les origines natives Capacitor
  (`capacitor://localhost`, `ionic://localhost`, `http://localhost`).
- **Alias `/api/health`** : testable depuis le navigateur du téléphone
  (`http://<ip>:4000/api/health` → `{"ok":true}`).
- **Docs** : MOBILE.md §32 (marche à suivre + table des URL), note dev dans
  `server/.env.example`.

### Vérification
```
TNR global : 14/14 · 335 tests (serveur 84→99 : +/api/health, +origine Capacitor)
```

## v11.9.0 — Fiabilisation : couverture, TNR serveur, E2E web, CI automatisée

Blindage du code mobile et serveur par des tests avec rapports de couverture,
E2E web, TNR serveur dédié, le tout automatisé en CI et documenté.

### Couverture de code (rapports + seuils)
- Couverture **Vitest + provider v8** sur les 5 workspaces : rapports
  `text-summary`, `html`, `lcov`, `json-summary` dans `coverage/`.
- **Seuils par workspace** (dans chaque `vitest.config.ts`) : la CI échoue sous
  le plancher (approche « cliquet »).
- **`scripts/coverage.mjs`** : runner consolidé (tableau + `reports/coverage-latest.json`).
- Script `test:coverage` sur chaque workspace ; `npm run coverage` à la racine.

### Code blindé — serveur & mobile
- **Serveur 84 → 97 tests** : helpers de profil (niveau, ELO, rang) + suite de
  **balance économique** verrouillant KB-300 (mises vs gains).
- **Mobile 95 → 106 tests**, couverture **74 % → 82 %** : E2E des écrans
  Statistiques et Rejeu (étaient à 0 %), suite unitaire complète de `TeamService`.
- **TNR global : 309 → 333 tests, 14/14 vert.**

### TNR serveur dédié
- **`scripts/tnr-server.mjs`** : typecheck + tests purs + couverture (seuils) +
  intégration Mongo (active si `MONGOMS_AVAILABLE=1`, sinon SKIP propre).
  `npm run tnr:server` → 4/4 étapes.

### E2E web (Playwright)
- **`web/playwright.config.ts`** : build + preview auto-lancés, Chromium réel,
  traces/captures/vidéos à l'échec, reporter GitHub en CI.
- **`web/e2e/smoke.spec.ts`** : chargement sans erreur, écran d'auth, saisie,
  résilience (reload, route inconnue).
- Scripts `e2e`, `e2e:ui`, `e2e:install`, `e2e:report`.
- ⚠️ Le navigateur se télécharge en CI (bloqué en sandbox, cf. KB-112) ; le filet
  E2E exécutable en sandbox reste la suite DOM mobile.

### Automatisation — CI
- `.github/workflows/ci.yml` étendu en **5 jobs** : `typecheck`, `coverage`,
  `tnr`, `tnr-server` (**Mongo actif**, `MONGOMS_AVAILABLE=1`), `e2e-web`
  (Chromium). Chaque job publie ses rapports en artefacts.

### Documentation
- **`docs/ai/TESTING.md`** refondu : pyramide, couverture, faux serveur, Mongo,
  Playwright, CI, règle de non-régression.
- Tâches resynchronisées : KB-112 / KB-113 / KB-305 passées « en cours »
  (configuration + automatisation livrées, exécution navigateur/Mongo tributaire
  du runner CI) ; nouvelle tâche KB-310.

## v11.8.1 — Audit croisé « 3 agents », resynchronisation docs + roadmap

Livraison de **documentation et d'analyse** (aucun changement de code applicatif).

### Audit croisé par trois revues indépendantes
Trois analyses indépendantes du projet (réalité du code · intention produit &
docs · QA & défaillances), confrontées ensuite pour ne garder que ce qui résiste
au croisement. Rapport complet : `docs/AUDIT-3AGENTS.md`.

Principales convergences (défauts de fond) :
- **Économie asymétrique** : les gains sont versés en fin de partie mais la mise
  n'est jamais prélevée au lancement (`walletService.stake()` = code mort). →
  tâche **KB-300** (P1).
- **Docs/tasks mentant sur l'existant** : SPEC gelée à v10.4 (affirmait « online
  mobile via le web », faux depuis v11) ; tâches « MANQUANT » en réalité faites.

### Documents mis à jour
- **SPEC.md** resynchronisée : §3.3 (online mobile natif), §3.9 (économie
  asymétrique signalée), en-tête de version ; nouvelles sections « Livré depuis
  v10.4 » et « Défaillances connues & priorités ».
- **README.md** : bandeau d'état v11.8 + pointeurs (SPEC, ROADMAP, audit, changelog).

### Documents créés
- **docs/AUDIT-3AGENTS.md** : le rapport d'audit croisé (méthode, convergences,
  constats arbitrés, faux positifs rejetés).
- **docs/ROADMAP.md** : trajectoire priorisée post-v11.8 (économie, édition robot,
  ELO réel, parité web, CI visuelle/DB, tournois, fédération).

### Référentiel de tâches resynchronisé
- Tâches « MANQUANT » corrigées : KB-043 (recherche+profil → fait), KB-063
  (favori → champ présent, reprise non câblée), KB-004 (delete fait, édition
  fusionnée dans KB-301).
- Nouvelles tâches de défaillance : KB-300 (mise prélevée, P1), KB-301 (édition
  robot, P1), KB-302 (favori câblé, P2), KB-303 (ELO réel, P2), KB-304 (décision
  parité web, P2), KB-305 (CI Mongo+Playwright, P2).

## v11.8.0 — Émotes reçues par tous, cartes du pli réalistes, score Nous/Eux

Finitions de la table de jeu demandées : émojis visibles par tous, disposition
réaliste des cartes jouées, feuille de score significative, cartes des autres
joueurs réduites.

### BUG — émojis non reçus par les autres joueurs (KB-290)
Le serveur diffusait le signal avec la clé `type` alors que le client lit
`kind` : la condition `info.kind === 'smiley'` était toujours fausse, donc
l'émote ne s'affichait que pour l'émetteur. Le broadcast envoie désormais `kind`
(le `type` reste pour les évènements persistés). Les réactions sont enfin
visibles par **tous** les joueurs et spectateurs.

### Cartes jouées superposées, réalistes (KB-291)
Refonte du rendu du pli (front) : chaque carte est jetée vers le **centre** avec
- un **décalage aléatoire borné** — le centre de la carte reste à ≤ 40% de sa
  taille du centre de la table,
- une **inclinaison perpendiculaire au joueur ±30°** (soit 60°..120° par rapport
  à lui),
- un **empilement par ordre de jeu** : la dernière carte jouée passe au premier
  plan.
Le placement est déterministe et stable par carte (helper pur testé).

### Feuille de score « Nous / Eux » significative (KB-292)
Le score n'indiquait pas qui était A/B ni nous/eux. Désormais les colonnes sont
**ordonnées selon le camp du spectateur** (Nous = son équipe, à gauche) et
**colorées vert (Nous) / rouge (Eux)** — dans la mini-feuille, la feuille
détaillée, les compteurs en haut et l'écran de fin. Cohérent quel que soit le
siège occupé.

### Cartes des autres joueurs réduites de 30% (KB-293)
Les cartes des trois autres joueurs (gauche, haut, droite) sont affichées à 70%
de la taille de la main du joueur courant, pour hiérarchiser la lecture.

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 55 · table-pixi 55 · server 84 · web 20 · mobile 95
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 309 tests
```

### Reste ouvert
Plus aucune tâche fonctionnelle P0 (seule subsiste KB-122, la tâche méta du
référentiel de tâches).

## v11.7.0 — Émotes unifiées et visibles par tous, réflexion, indicateur LIVE

Correctifs et finitions demandés sur les smileys, la réflexion, le menu
Invitations et l'affichage « partie en cours ».

### Émotes : une seule liste, visibles par TOUS (KB-280, KB-281)
- Il existait deux listes de smileys (l'ancienne barre du HUD + celle ajoutée
  côté écran) : désormais **une seule**.
- L'émote cliquée ne s'affichait que pour l'émetteur : elle est maintenant
  **diffusée** et visible par tous les joueurs **et les spectateurs**. `PixiTable`
  reçoit deux props — `onEmote` (l'hôte diffuse) et `emoteSignal` (émote distante
  à afficher, rejouée au changement de `nonce`).
- Les réactions sont regroupées dans un **dock minimisé en bas-gauche** du
  tapis : un bouton rond 🙂 ouvre la liste au clic, refermé après envoi.

### Réflexion 💭 visible pour tous (KB-282)
Dans le récapitulatif des annonces, la réflexion dépendait d'un minuteur local
et n'apparaissait donc pas pour un joueur/spectateur dont l'état avait été
renvoyé après coup. La réflexion étant une propriété **permanente** de l'enchère
(diffusée via `view.bids`), le 💭 s'affiche désormais toujours pour une enchère
réfléchie.

### BUG — menu Invitations → page d'authentification (KB-283)
La route `invitations` n'était plus enregistrée dans le routeur (perdue lors
d'une régénération) : la navigation retombait sur le login. Route réenregistrée.

### Indicateur « partie en cours » — pastille LIVE (KB-284)
La bannière de l'accueil est remplacée par une **pastille LIVE animée** (style
enregistrement, point rouge pulsé) affichée en haut **à côté du logo Kýdos**,
cliquable pour reprendre la partie.

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 55 · table-pixi 51 · server 84 · web 20 · mobile 95
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 305 tests
```

### Reste ouvert
Plus aucune tâche fonctionnelle P0 (seule subsiste KB-122, la tâche méta du
référentiel de tâches).

## v11.6.0 — Retour de partie fiable, smileys, rejeu corrigé, profil joueur

### BUG — retour de partie : mauvais compteur, blocage (KB-270)
En quittant puis revenant, le nombre de joueurs était faux (spectateurs jamais
recomptés au départ) et on pouvait rester bloqué. Correctif : recompte robuste
des spectateurs diffusé à chaque abonnement / désabonnement / déconnexion (en
excluant le socket sortant) ; au retour, si la partie s'est terminée pendant
l'absence, le client reçoit directement l'écran de fin au lieu d'attendre.
Reprise de siège et mode spectateur restent gérés à l'identique.

### Smileys en ligne (KB-271)
Le serveur diffusait déjà les signaux, mais le mobile ne les affichait pas et
n'offrait aucun moyen d'en envoyer. Ajout d'une **barre de 8 smileys** (visible
quand on est assis) et d'un **calque de bulles flottantes** qui apparaissent
près du siège de l'émetteur, avec animation. On voit désormais les réactions des
autres joueurs.

### BUG — rejeu : les cartes ne se jouaient pas (KB-272)
Seul le score bougeait. Cause : `applyOp` lisait `op.data.seat` alors que le
moteur porte le siège sur `op.seat` (niveau supérieur) — la condition était
toujours fausse, donc aucune carte n'était posée dans le pli. Corrigé, avec un
test de non-régression verrouillant le format du replay.

### Profil joueur — popup à onglets (KB-273)
Les noms de joueurs (table en ligne et écran de statistiques) sont désormais
**cliquables** et ouvrent une popup de profil à trois onglets :
- **Infos** — niveau, rang, jetons, équipe.
- **Robots** — les fiches robots du joueur (nom + ELO).
- **Stats** — parties jouées / gagnées / perdues, taux de victoire, robots.

Côté serveur, `/users/:id/profile` est enrichi (rang, bilan victoires/défaites
réel calculé depuis les parties, liste des robots). Le broadcast live inclut
maintenant les joueurs par siège (nom / type / userId) et les participants
d'historique exposent leur `userId`.

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 55 · table-pixi 51 · server 84 · web 20 · mobile 95
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 305 tests
```

### Reste ouvert
Plus aucune tâche fonctionnelle P0 (seule subsiste KB-122, la tâche méta du
référentiel de tâches).

## v11.5.0 — Invitations d'équipe complètes (envoyer, recevoir, accepter, refuser, annuler)

Finalisation de KB-042 : le flux d'invitation d'équipe est désormais complet et
fluide, de bout en bout, côté serveur ET mobile.

### Serveur (KB-260)
- **Annuler** : `POST /invitations/:id/cancel` — le propriétaire révoque une
  invitation qu'il a envoyée (nouveau statut `cancelled`).
- **Compter** : `GET /invitations/count` — nombre d'invitations reçues (badge).
- **accept() renforcé** : vérifie la borne de 40 membres, **ajoute réellement**
  le joueur au tableau `members` de l'équipe (corrige un bug : avant, seul
  `user.team` était posé), refuse si l'utilisateur est déjà dans une autre
  équipe, et gère le cas d'une équipe disparue.

### Mobile (KB-261)
- Nouvel **écran Invitations** (route `invitations`) avec deux onglets :
  **Reçues** (accepter / refuser) et **Envoyées** (annuler, réservé au
  propriétaire).
- **Formulaire d'invitation** : recherche d'un joueur par pseudo (anti-rebond)
  puis envoi en un geste.
- **Badge de notification** rouge sur la tuile « Invitations » de l'accueil
  (nombre reçu), et bouton **✉ Inviter** dans « Mon équipe ».
- Méthodes ApiClient + TeamService (invite / received / sent / accept / decline
  / cancel / count / search).
- Écran **réactif** (évènement `invitations:changed`) ; aucune boîte native
  (toasts + dialogues du design system).
- Le Router appelle `_cleanup` à chaque changement d'écran (évite les fuites
  d'abonnements).

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 54 · table-pixi 51 · server 84 · web 20 · mobile 93
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 302 tests
```

### Pour tester
Le seed crée une invitation en attente ameur → zoe. Se connecter en **zoe**
(mot de passe `belote123`) pour recevoir/accepter/refuser, ou en **ameur** pour
voir l'invitation envoyée et l'annuler.

### Reste ouvert
Plus aucune tâche fonctionnelle P0 (seule subsiste KB-122, la tâche méta du
référentiel de tâches).

## v11.4.0 — Migration Cordova → Capacitor + board Agile complet

### Cordova remplacé par Capacitor (KB-250)
L'empaquetage mobile passe de Cordova à **Capacitor** (successeur moderne :
projets natifs de première classe ouverts dans Android Studio / Xcode, API de
plugins récente, meilleure prise en charge des WebViews).

- Suppression de `mobile/cordova/` (config.xml, sync-www.mjs).
- Ajout de `mobile/capacitor.config.ts` (`appId`, `appName`, `webDir: dist`,
  couleur de fond, réglages Android/iOS).
- Nouveaux scripts npm : `cap:sync`, `cap:add:android|ios`, `cap:android|ios`,
  `cap:open:android|ios`.
- Dépendances `@capacitor/core|cli|android|ios`.
- Nouveau **`mobile/capacitor/README.md`** (mise en place, verrouillage paysage,
  build de production).
- README principal + docs (MOBILE, DEPLOYMENT, ARCHITECTURE, DESIGN-SYSTEM) mis
  à jour. Plus aucune référence à Cordova.

L'application web est **inchangée** : seul l'enrobage natif diffère.

### Board Agile complet (KB-251)
Le référentiel `board/` devient un vrai board Agile.

- `tasks.json` enrichi de nouvelles dimensions par tâche : **techno**,
  **catégorie** Agile fine (Mobile, Serveur, Tests, TNR, Test E2E,
  Documentation, Refactoring, IHM, Design, Observabilité, CI/CD…),
  **complexité** en points de story (Fibonacci 1/2/3/5/8/13) et **durée**
  normalisée.
- `board.html` refondu : regroupement au choix (statut en colonnes, ou par
  version / catégorie / techno / type / priorité / domaine), **filtres
  cumulables** sur toutes les dimensions, recherche plein-texte, métriques
  globales (terminées / en cours / à faire / bugs / P0 ouvertes / points totaux
  / durée totale), et fiche détaillée par tâche (description, instructions,
  critères, historique).
- `BACKLOG.md` régénéré : synthèse, répartitions (statut, priorité, type,
  catégorie, techno, version) avec points et durées, puis le détail par version.

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 54 · table-pixi 51 · server 82 · web 20 · mobile 89
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 296 tests
```

### Reste ouvert — 1 tâche P0
KB-042 invitations d'équipe mobile.

## v11.3.0 — Fin de partie corrigée, historique détaillé + statistiques, parties robots serveur, rejeu local

Réponse à une série de retours d'Ameur sur la fin de partie, l'historique, les
statistiques, les parties entre robots et le rejeu.

### BUG — robots occupés + bannière persistante après la fin (KB-240)
Cause racine : à la fin d'une partie, le serveur persistait bien le résultat
mais **ne libérait jamais le verrou `activeSession`** des joueurs. La bannière
« Partie en cours » restait affichée et les robots étaient vus comme occupés.
Correctif : `releaseAllOf(tableId)` à la persistance (le verrou stocke l'ID de
table).

### Écran de fin de partie soigné (KB-241)
La fin n'affichait qu'un toast. Nouvel overlay thématisé : trophée, résultat
NOUS/EUX, **score final géant**, et actions claires (Statistiques, Rejouer,
Quitter la table).

### Tableau de statistiques détaillées par partie (KB-242)
Nouveau calculateur pur `computeGameStats` (belote-core) dérivé du replay :
plis par équipe, contrées et surcontrées et leur réussite, capots réalisés,
capots annoncés, belotes, score. Ces stats sont **stockées dans le document
Game** à la persistance. Nouvel écran `GameStatsScreen` (distinct du rejeu) :
résultat, compositions des deux camps, tuiles de synthèse, barres comparatives
et détail manche par manche.

### Historique filtré et paginé (KB-244)
Portées : **Mes parties** (créées ou où je joue), **Mes robots** (une de mes
fiches a joué), **Mon équipe**, **Publiques**. Filtres par type de partie.
**Pagination 15 par page** (servie par le serveur). Chaque ligne montre le
résultat, le score et les joueurs des deux camps.

### Parties en ligne visibles « en cours » (KB-243)
Les parties lancées restent listées avec le statut **« En jeu »** et un bouton
**Regarder**. Onglets de portée (Toutes / Mon équipe / Publiques) et
**pagination 15**. Côté serveur, `listOpenTables` inclut désormais `lobby` ET
`playing`.

### Parties 100% robots sur le serveur (KB-245)
Quand 4 robots s'affrontent, la partie est jouée **d'un trait côté serveur**
(aucune WebSocket, aucune session live, absente de la liste des parties en
cours) puis archivée dans l'historique, avec résultat et rejeu. Service
`robotMatch.simulate` + route `POST /games/robots`. Côté mobile, « Match entre
robots » choisit 4 fiches et lance la simulation, puis ouvre ses statistiques.

### Rejeu 100% local (KB-246)
Le rejeu récupère le JSON **une seule fois** puis rejoue tout en local (aucune
socket, aucune session) : mêmes actions dans l'ordre, avec un **minimum de 2
secondes** entre chacune (annonce, mise de l'annonce, jeu de carte, ramassage).
Vitesse **x1 / x2 / x4 / x8**.

### Indépendance des données par session (KB-247)
Audit : chaque table a son propre `GameEngine` (Map par `tableId`), toutes les
méthodes résolvent par `tableId`, aucun état mutable au niveau module, et la
simulation robots crée son moteur en variable locale. Les règles partagées sont
pures.

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 54 · table-pixi 51 · server 82 · web 20 · mobile 89
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 296 tests · 105 s
```

### Reste ouvert — 1 tâche P0
KB-042 invitations d'équipe mobile.

## v11.2.0 — Multijoueur blindé : départ auto, reprise instantanée, moniteur temps réel, écran d'init thématisé

Réponse à une série de retours d'Ameur sur le jeu en ligne, avec l'exigence
« que le multijoueur ne manque rien, qu'il soit bien blindé, solide et complet ».

### BUG — le bouton Quitter plantait en ligne (KB-230)
En ligne, il n'y a pas de boucle de jeu locale : le clic sur Quitter appelait
`loop.dispose()` sur `undefined` (« Cannot read properties of undefined (reading
'dispose') »). Sortie unifiée `leaveTable()` : coupe la boucle locale si elle
existe, sinon la connexion socket, puis démonte proprement.

### Départ automatique synchronisé, sans bouton Lancer (KB-231)
Dès que les 4 sièges sont pris, le serveur diffuse `table:countdown` et **tous
les joueurs basculent vers la table au même moment** (5 s). Le bouton « Lancer »
est supprimé.

### Anti-blocage des sièges robots (KB-232)
En Alliance Hybride / Duo d'Acier, si un joueur place un robot mais laisse le
siège partenaire vide plus de 10 s, ses robots sont libérés pour que d'autres
prennent les deux places. Pas en Carré Royal (aucun robot).

### En ligne : logs et pause/vitesse masqués, spectateurs affichés (KB-233)
Les logs et les contrôles Pause/Vitesse n'apparaissent plus qu'en rejeu/local.
En ligne, un badge **👁 N** montre le nombre de spectateurs, diffusé en direct
par le serveur (`table:spectators`).

### Reprise immédiate de siège (KB-234)
En quittant une table puis en revenant, le joueur était considéré comme un
nouveau spectateur. Désormais, au départ (Quitter ou déconnexion) son siège
passe **instantanément en substitution robot** ; à son retour, il **reprend la
main immédiatement**. Le changement est visible tout de suite quand quelqu'un
sort ou entre.

### Moniteur wslogs temps réel (KB-235)
Nouveau répertoire `wslogs/` (au niveau de `server/`, `web/`, `mobile/`) avec un
tableau HTML autonome affichant **en temps réel** toutes les sessions actives
(par table, par joueur connecté), les scores, et le flux de logs (info / warn /
error) des web services et WebSockets. Alimenté par `GET /api/monitor/snapshot`
et le namespace socket `/monitor`, avec un tampon de logs circulaire côté
serveur. Désactivable via `MONITOR_ENABLED=false`. Aucune main de joueur exposée.

### Écran d'initialisation au thème du jeu (KB-236)
La page d'initialisation apparaissait en **blanc** (avant chargement du bundle).
CSS critique **en ligne** dans `index.html` : fond sombre du jeu, « waiting », et
**4 robots animés** en pur CSS (rebond, clignement, antenne lumineuse). La garde
d'orientation portrait est thématisée elle aussi. `main.tsx` retire l'écran en
fondu dès que l'app est montée.

### Rejoindre une équipe publique (KB-237)
On voyait les équipes publiques mais sans moyen de les rejoindre. Bouton
**« Rejoindre »** ajouté sur chaque équipe publique (« Voir » pour les privées).

### CORS multi-domaines (KB-238)
`CORS_ORIGIN` accepte plusieurs domaines séparés par des virgules (REST +
WebSocket). `*` autorise toutes les origines (dev).

### Aucune alerte native
Rappel maintenu : tous les retours passent par des toasts et des dialogues du
design system.

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 53 · table-pixi 51 · server 80 · web 20 · mobile 89
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 293 tests · 114.8 s
```

### Reste ouvert — 2 tâches P0
KB-042 invitations d'équipe mobile · KB-071 prélèvement effectif des mises.

## v11.1.0 — Jeu en ligne temps réel sur serveur, 3 types de partie, reprise directe, rejeu et table corrigés

Session centrée sur le jeu en ligne, jugé « catastrophique » par Ameur. Cause
racine identifiée : le mobile n'avait AUCUN client socket. Le serveur faisait
déjà tout (moteur, robots, substitution, reprise, diffusion filtrée) mais le
mobile ne s'y connectait jamais.

### Client socket mobile (KB-220 / KB-052)
Nouveau `data/TableSocket.ts` : abonnement authentifié, réception de l'état de
partie, émission des enchères et cartes, alimentation de la table Pixi sans
jamais révéler les mains adverses. **Le jeu tourne sur le serveur, robots
inclus**, comme la version web.

### Trois types de partie (KB-222 / KB-050)
Dialogue de création guidé :
- **Alliance Hybride** — joueur + robot contre joueur + robot.
- **Duo d'Acier** — vos DEUX robots ensemble contre le duo d'un autre joueur.
- **Carré Royal** — 4 joueurs humains.

Champ `kind` sur la table, pré-placement des robots du créateur, règle « les
deux robots d'une personne jouent toujours ensemble » appliquée à la création
et à la prise de siège. Le `kind` est propagé jusqu'à l'historique.

### Lobby en temps réel (KB-221)
Un socket par table : dès qu'un joueur prend, quitte ou change un siège (ou un
robot), l'écran se met à jour immédiatement pour tout le monde, sans
rechargement. Bouton « Lancer » (créateur, 4 sièges pris → `POST
/tables/:id/start`) et « Rejoindre » (partie en cours).

### Reprise directe (KB-223 / KB-051)
La bannière « Partie en cours » de l'accueil menait vers un `?session=` qui
déclenchait le dialogue « nouvelle partie ». Comme `activeSession` est l'id de
la table, elle mène désormais vers `?online=<tableId>` : reprise DIRECTE, sans
popup. Le serveur rend la main au joueur de retour (son robot jouait à sa
place). Voile d'attente si la partie n'a pas encore démarré.

### Rejeu comme une partie en cours (KB-224)
Le rejeu montrait toutes les mains face visible et n'affichait pas les cartes
jouées dans le pli. Il est désormais rendu comme une partie EN COURS :
observation depuis le sud, cartes jouées dans le pli, adversaires en dos.

### Table Pixi — précisions d'Ameur (KB-225)
Les mains sont rapprochées des bords (le sud descend, le nord monte :
`handInset` réduit). Le panneau du dernier pli **monte** désormais (haut-gauche
+ animation de montée), au lieu de descendre.

### Historique — portée et filtres (KB-091)
Onglets Mes parties / Publiques + filtres par type de partie (Toutes /
Alliance Hybride / Duo d'Acier / Carré Royal). Parties privées visibles
uniquement par l'équipe, publiques par tous.

### Aucune alerte native
Rappel : tous les retours passent par des toasts et des dialogues du design
system (aucun `alert()` / `confirm()`).

### Vérification — TNR complet
```
typecheck ×5 ✓ · tests : core 53 · table-pixi 51 · server 76 · web 20 · mobile 89
builds ✓ · démo moteur ✓
Résultat : 14/14 étapes · 289 tests · 99 s
```

### Reste ouvert — 2 tâches P0
KB-042 invitations d'équipe mobile · KB-071 prélèvement effectif des mises.

## v11.0.1 — Correctif prise de siège en ligne, affichage et animations de la table

Session pilotée par deux captures d'Ameur : un 403 à la prise de siège, et la
table Pixi (cartes au mauvais endroit, animations à revoir).

### BUG — 403 « robot inconnu » à la prise de siège (KB-210)
`POST /tables/:id/seat` renvoyait 403 pour le joueur ET ses robots. Cause :
le mobile envoyait `{ index, assignment }` alors que le serveur lit
`{ index, as }`. Le champ arrivait `undefined`, le code tombait dans la
branche robot avec `findById(undefined)` → « robot inconnu ». Corrigé côté
client (contrat aligné) et durci côté serveur (message clair si assignation
absente). 3 tests ajoutés (2 mobile + 1 API).

### Table Pixi — affichage des mains (KB-211)
Règle rétablie et rendue constante : le **SUD** (joueur) est toujours face
visible et jouable, les **3 autres sièges toujours dos**, le **coéquipier
n'est JAMAIS révélé** — y compris en mode observation. `opponentCards` forcé
à `back` côté mobile. 4 tests unitaires verrouillent la règle.

### Table Pixi — animations (KB-212)
- Origines des cartes **alignées** entre la main et le pli (`handInset()`
  partagé) : les cartes jouées partent désormais exactement de la bonne main.
- Glissé de jeu adouci : 380 ms, arc vertical, fondu et légère montée
  d'échelle — mouvement posé plutôt que téléporté.
- **Dernier pli** repositionné en bas à gauche, avec une animation de montée
  rejouée à chaque nouveau pli.

### Retours sans boîte native (KB-213)
Plus aucun `alert()` / `confirm()` : nouveau `components/feedback.ts` avec
`toast()` (bandeau flottant erreur/succès/info) et `confirmDialog()`
(dialogue du design system). Tous les écrans concernés migrés.

### Vérification
TNR : 14/14 étapes · **283 tests** · builds verts · démo moteur OK.

## v11.0.0 — Refactoring d'architecture, design system mobile autonome, tests API, seed complet, TNR et infrastructure

Version MAJEURE : le couplage entre les deux applications est éliminé, le
design system mobile devient autonome, et la chaîne de validation complète
tient dans une seule commande.

### Refactoring — la table devient un package partagé (KB-200)
Le mobile importait `web/src/table-pixi` : les deux applications étaient
**couplées**, ce qui contredisait la règle de séparation stricte.

- Table promue en **`packages/table-pixi`** (`@kydos/table-pixi`).
- `StandalonePixiTable` rapatrié côté web (c'est un habillage de démo web).
- Alias `@kydos/table-pixi` dans les deux applications ; le mobile ne
  référence plus **aucun** fichier de `web/`.
- Le package a son propre runner : **47 tests** y sont désormais exécutés.

Nouvelle règle de dépendance, documentée dans `ARCHITECTURE.md` :
`belote-core` et `@kydos/table-pixi` sont les seuls éléments partagés.

### Design system mobile autonome (KB-201)
- CSS regroupés dans **`mobile/src/design-system/`** avec un point d'entrée
  unique et un ordre d'import documenté. Aucune référence hors du dossier.
- Nouvel écran **`#/styleguide`** : aperçu vivant de tous les composants
  (couleurs commentées, typographies, boutons, badges, mascottes, avatars,
  champs, curseurs, cartes, dialogue) — référence visuelle et détection de dérive.
- `DESIGN-SYSTEM.md` : règles (aucune valeur en dur, pas de liste déroulante
  native, couleurs d'équipe constantes) et procédure d'ajout d'un composant.

### Tests de contrat API (KB-202)
Nouvelle suite **supertest** sur l'application Express réelle, sans base :
existence des 21 routes protégées, refus de l'anonyme, jeton malformé,
schéma d'autorisation inconnu, 404 JSON sur route inconnue, CORS actif,
ordre de déclaration (`/games/public` non capturée par `/games/:id`),
forme des erreurs. Tests serveur : **23 → 75**.

### BUG révélé par ces tests (KB-203)
`POST /auth/login` avec un corps vide interrogeait MongoDB **avant** de
valider son entrée : 10 s de timeout puis 500, au lieu d'un 400 immédiat.
Validation ajoutée en amont de tout accès base.

### Seed complet (KB-204)
5 comptes couvrant **les 4 rôles d'équipe** plus un compte hors équipe
(`ameur` owner, `hamid` super, `sofia` admin, `invite` user, `zoe` externe),
portes-monnaie alimentés avec journal, deux équipes publiques, une invitation
en attente, une compétition ouverte entre robots, une table de lobby avec deux
sièges libres, et une partie terminée avec son rejeu. Toutes les permissions
sont testables sans manipulation manuelle.

### TNR et infrastructure (KB-205)
- **`npm run tnr`** : typecheck ×5, tests ×5, builds ×3, démo moteur — rapport
  lisible + `reports/tnr-latest.json`, code de sortie 1 à la moindre régression.
- **CI GitHub Actions** à deux jobs : non-régression complète, et tests
  d'intégration MongoDB (`MONGOMS_AVAILABLE=1`).
- `.env.example` documenté pour les trois applications, `.gitignore` complet.

### Documentation (KB-206)
Cinq nouveaux documents : **ARCHITECTURE.md** (diagramme de dépendances,
couches, contrats à ne jamais casser), **TESTING.md** (pyramide, faux serveur,
règle de non-régression), **DESIGN-SYSTEM.md**, **DEPLOYMENT.md** (comptes du
seed, production, Cordova, exploitation), **CONTRIBUTING.md** (règles non
négociables, procédure de livraison).

### Référentiel de tâches
51 tâches (44 → 51). Les 7 nouvelles couvrent ce refactoring et sont toutes
en statut `tested`.

### Vérification — TNR complet
```
typecheck  core ✓  table-pixi ✓  server ✓  web ✓  mobile ✓
tests      core 53 · table-pixi 47 · server 75 · web 20 · mobile 81
builds     web ✓  table-lib ✓  mobile ✓
smoke      moteur ✓
Résultat : 14/14 étapes · 276 tests · 103 s
```

**276 tests** (223 → 276, +53).

### Reste ouvert — 4 tâches P0
KB-042 invitations mobile · KB-050 compétitions réelles ·
KB-051 démarrer une table · KB-052 client socket mobile.

## v10.6.0 — Référentiel de tâches (JSON + markdown + tableau HTML) et menus de l'accueil

Session de DIAGNOSTIC demandée par Ameur : établir précisément ce qui est fait
et ce qui manque, côté serveur comme côté mobile, et en faire un référentiel
durable qui pilote toutes les sessions suivantes.

### Diagnostic (relevé automatique, pas d'estimation à vue)
- **56 routes serveur** listées par introspection réelle de l'application Express.
- **Endpoints consommés par le mobile** extraits de `ApiClient`.
- Croisement des deux → écarts identifiés.

**Écart principal : plusieurs API serveur COMPLÈTES ne sont pas exploitées
par le mobile** — invitations (5 endpoints), compétitions (moteur de match
automatique complet, l'écran mobile n'est qu'une vitrine), démarrage de table,
recherche d'utilisateurs, édition/suppression de robot, statistiques de robot,
réglages, cerveaux.

**Incohérence relevée côté serveur** : `walletService.stake()` n'a aucun
appelant en production — les gains sont versés mais les mises ne sont jamais
prélevées (tâche KB-071).

### Référentiel de tâches — `board/`
- **`tasks.json`** — base de vérité : 44 tâches avec identifiant, domaine,
  module, type, statut, priorité, version cible, estimation, spécification,
  instructions, critères d'acceptation, dates, **historique horodaté** et
  **journaux** (info / warn / error). Statuts : draft, pending, onprocess,
  needreview, tested, finished, needconfirmation, confirmed, bug, refused.
- **`BACKLOG.md`** — lecture humaine : ce qui existe / ce qui manque côté
  serveur et mobile, bugs traités avec leur cause réelle, contraintes
  d'environnement, couverture de tests, ordre de la prochaine session.
- **`board.html`** — tableau interactif autonome (aucune dépendance) :
  vue Kanban par statut et vue liste triable, recherche plein texte,
  filtres statut / priorité / domaine / type, compteurs, panneau de détail
  avec instructions, critères d'acceptation, frise d'historique et journaux.
  Lit `tasks.json` ; en ouverture `file://` il propose un sélecteur de fichier.

### Règle de travail inscrite dans la documentation
Toute session doit désormais : lire `tasks.json`, rapprocher chaque demande
d'une tâche existante (enrichir ses instructions) ou en créer une, mettre à
jour statut / horodatage / historique, puis travailler par priorité.
La mise à jour des documents est elle-même une tâche permanente (**KB-121**).

### KB-100 — menus de l'accueil
Ameur : « il manquait juste des menus dans l'accueil qui permettent la gestion
d'équipe ». Rangée de 8 tuiles ajoutée sous les 3 cartes principales :
Jouer en ligne · Mon équipe · Équipes · Compétitions · Porte-monnaie ·
Classements · Historique · À propos. Toutes les sections sont désormais
atteignables en un geste (elles n'étaient accessibles que par l'éventail).

### Tests — 221 → 223
+2 tests E2E vérifiant la présence de tous les menus de l'accueil.
Total : **223** (53 core + 67 web + 23 server + 80 mobile).

### Vérifs
- typecheck × 4 : verts · 223 tests verts · builds verts · démo moteur OK
- `tasks.json` validé syntaxiquement.

### Reste ouvert — 5 tâches P0 (par ordre)
KB-042 invitations · KB-050 compétitions réelles · KB-051 démarrer une table ·
KB-052 client socket mobile · (KB-100 clôturée dans cette version).

## v10.5.0 — Cause des 404 corrigée, table Pixi dimensionnée par son conteneur, E2E sur les 12 écrans

Session de diagnostic sur les captures d'Ameur (404 sur `/me` et `/wallet`,
table de jeu vide avec le HUD collé en haut-gauche). Les deux problèmes ont
été reproduits, expliqués et corrigés **à la racine** — pas de contournement.

### 404 — la vraie cause
Le serveur n'avait **aucun middleware de gestion d'erreurs**. Les `HttpError`
levées par les services remontaient au handler par défaut d'Express.
`GET /auth/me` et `GET /wallet` appellent tous deux `UserModel.findById` et
levaient `notFound()` : un jeton valide dont le compte n'existe plus (base
réinitialisée) produisait donc un **404**, tandis que `/robots` répondait 200
(liste vide) — d'où une application « à moitié connectée ».

- **Middleware d'erreurs central** dans `app.ts` → `{ error }` + bon statut.
- **404 JSON explicite** pour toute route `/api` inconnue (plus de HTML).
- `getCurrentUser` / `getMyWallet` lèvent **401 « session expirée »**.
- `ApiClient` intercepte tout **401** : purge du jeton et retour au login.

### Table Pixi — dimensionnement déterministe
La taille était déléguée au ResizePlugin de Pixi (`resizeTo: host`), qui
n'écoute que le resize de la **fenêtre**. Monté dans un slot dont la taille
se stabilise après le premier paint, le renderer restait en 0×0 : la scène
ne dessinait rien et les variables CSS du feutre valaient 0 — d'où le panneau
d'annonce cadré en haut-gauche et coupé.

- `resizeTo` retiré : la taille est **mesurée sur le conteneur**
  (`applySize()`) et appliquée au renderer PUIS à la scène.
- Boucle `requestAnimationFrame` jusqu'à obtenir une taille exploitable.
- `ResizeObserver` + listener fenêtre → re-mesure/relayout/redraw instantanés.
- `renderScene()` passe par `applySize()` (plus de calcul depuis
  `renderer.width`).
- Retrait du `calc()` fragile ajouté en v10.4.0 sur `.px-actions-slot`.

### Rejeu — bug réel révélé par les nouveaux tests
`GameEngine.toReplay()` renvoie `{ manches[].donnes[] }`, alors que
`ReplayScreen` lisait `replay.donnes` (clé inexistante) : tout rejeu
affichait « Rejeu introuvable ». Corrigé avec `flattenDonnes()`.

### Sélection des sièges — tactile
Le dialogue de configuration n'utilise plus de `<select>` (menu natif hors
design system, illisible sur mobile). Chaque siège affiche ses options en
pastilles simultanément (🤖 Auto · 👤 Moi · robots de l'écurie), avec
l'appartenance d'équipe NOUS/EUX et un seul « Moi » possible.

### Tests — 173 → 221
- **Moteur (+21)** : `GameScenarios.test.ts` — belote détectée/annoncée,
  refus de changer l'annonce après une carte jouée, siège sans belote,
  répéter la couleur du coéquipier, signal réflexion, signaux désactivés,
  contre autorisé/refusé selon l'équipe, légalité des cartes, ramassage de
  pli, donne complète, replay rejouable, partie jusqu'au vainqueur.
- **Mobile E2E (+27)** : `fakeServer.ts` (intercepteur `fetch` avec données
  réalistes) + `screens.e2e.test.ts` — **les 12 écrans** montés en DOM réel
  (happy-dom), endpoints vérifiés, connexion, réclamation quotidienne,
  permissions d'équipe, lobby en ligne, dialogue de configuration,
  régression du 401.
- **Web (+0, déjà 67)** dont les 4 tests de `responsiveCardW`.
- Total : **221 tests** (53 core + 67 web + 23 server + 78 mobile).

### Note d'honnêteté sur les captures d'écran
Playwright ne peut pas être installé ici (CDN navigateur bloqué, HTTP 403) et
MongoDB non plus (`fastdl.mongodb.org` bloqué). La vérification d'IHM est
donc faite en **DOM réel** avec un faux serveur, ce qui valide le rendu et
les parcours mais pas le pixel. Les mêmes fixtures sont réutilisables
directement dans un Playwright local pour produire des captures Android.

### Vérifs
- typecheck × 4 : verts · 221 tests verts · 3 builds verts · démo moteur OK.

## v10.4.0 — Table Pixi responsive, fix 404, replays publics, annulation pending, reprise robot, lobby en ligne

Session pilotée par les captures d'écran d'Ameur (table mobile cassée au
montage, débordements sur petit viewport) + audit complet des 404 + reliquats
du PRD, avec trois passes de revue (design, non-régression, exigences).

### Table Pixi — responsive et fluide (les 2 captures corrigées)
- **Cause du layout initial cassé** : le ResizePlugin Pixi ne réagit qu'aux
  resizes de la FENÊTRE ; sur mobile le slot `#game-table-mount` obtient sa
  taille APRÈS l'init → canvas mal dimensionné jusqu'à une interaction.
  **Fix : `ResizeObserver` sur le conteneur** (resize + relayout + redraw
  instantanés) + rattrapage `requestAnimationFrame` au premier paint.
- **Taille de carte CONTINUE** `responsiveCardW(feltW, feltH)` (pure, 4 tests)
  au lieu des paliers 52/68/84 — la table s'adapte à N'IMPORTE quel device.
- **Ancrage des mains proportionnel** (`INSET = cardH × 0.42 + 16`, fixe 62 avant).
- **CSS compact** : feuille de score scale .78/.62 et pile d'actions resserrée
  sous 560 px / 430 px de hauteur — plus aucun chevauchement avec la main est.

### Fix 404 (audit mobile ↔ serveur)
- `GET /games/undefined` : le serveur sérialise `id`, le mobile lisait `_id`
  → interface `ServerGame` alignée + `HistoryScreen` corrigé.
- `serializePublicUser` expose désormais `activeSession` (la bannière verte
  « Partie en cours » fonctionnait sur du vide) et `favoriteRobot`.

### SPEC §3.10 — replays publics par nom
- `publicNames` rempli avec les VRAIS noms lisibles (usernames + noms de
  robots, lookups à la persistance) — les participants embarqués gagnent
  aussi leur `name`.
- Nouveau `GET /games/public?q=` (insensible à la casse, `public` uniquement,
  50 max) — route déclarée AVANT `/games/:id`.

### SPEC §3.8 — annulation pending + reprise
- `POST /tables/:id/cancel` : créateur requis, refusé dès que les 4 sièges
  sont pris ; libère les verrous des joueurs assis, vide les sièges.
- `resumeSeat` : au retour d'un joueur (`table:subscribe`), son siège quitte
  les substituts → il REPREND LA MAIN sur son robot immédiatement (log + broadcast).

### Mobile — écran « Jouer en ligne » (lobby réel)
- Liste des tables publiques en attente (chips sièges A–D, libres cliquables),
  création, choix 👤 Moi / 🤖 mes robots par siège, changement de place tant
  que libre, annulation pending (créateur), statut « En jeu — suivez sur le
  web » quand la partie démarre. Route `online` dans l'éventail.
- Honnêteté : le JEU temps réel sur mobile (client socket) reste à câbler —
  le lobby, le verrou, la reprise et la persistance sont complets côté serveur.

### Tests (169 → 173)
- +4 web (`responsiveCardW`), tests d'intégration `publicAndCancel.test.ts`
  (annulation owner/non-owner/table-complète + recherche publique
  insensible/privée/vide) exécutés avec `MONGOMS_AVAILABLE=1`.

### Docs
- `API.md` (+ /games/public, /tables/:id/cancel, activeSession, resumeSeat),
  `SPEC.md` (§3.3 partiel lobby, §3.10 fait), `MOBILE.md` (§12 OnlineScreen,
  §13 table responsive), Postman +2 requêtes.

### Vérifs
- typecheck × 4 : verts · 173 tests verts · 3 builds verts · démo moteur OK.

## v10.3.0 — Équipes rôlées, économie serveur, spectateurs et verrou une-partie

Livraison intégrale des modules 3.5 (équipes), 3.7 (spectateurs), 3.8 (verrou
une-partie-à-la-fois) et 3.9 (économie serveur) du PRD (`docs/ai/SPEC.md`).
Chaque fonctionnalité est implémentée COMPLÈTEMENT — modèle Mongo, service
serveur, endpoints, écrans mobile, docs et tests.

### Backend — équipes rôlées (SPEC §3.5)
- Modèle `Team` étendu : membres embarqués, rôles `owner|super|admin|user`,
  limite 40 membres, index unique sur `owner`.
- Module `permissions.ts` (pur, testé) : `canAct`, `canAssign`,
  `canRenameTeam`, `canInvite`. Autorité `owner > super > admin > user`.
- `TeamService.addMember`, `kickMember`, `changeRole`, `getDetail` avec
  `myRole` — chaque action vérifie les permissions.
- Nouvelles routes : `PUT /teams/:id`, `POST /teams/:id/leave`,
  `DELETE /teams/:id/members/:userId`, `PUT /teams/:id/members/:userId/role`.

### Backend — porte-monnaie serveur (SPEC §3.9)
- `User.wallet` : solde, `lastClaimDay`, journal des transactions.
- `shared/gameEconomy.ts` (pur, testé) : constantes 100/50/500 et calculs
  `stakesByUser` + `payoutsByUser` (4H → 150, 2H+2R → 225, 4R → 150, local → 0).
- `WalletService.claimDaily` (idempotent), `stake`, `credit`.
- Endpoints `/wallet` (GET) et `/wallet/claim` (POST).
- Payouts VERSÉS AUTOMATIQUEMENT en fin de partie via
  `gamePersistenceService` (résolution des propriétaires de robots incluse).

### Backend — verrou une-partie-à-la-fois (SPEC §3.8)
- `User.activeSession` + `SingleGameLockService` (acquire idempotent,
  release, releaseAllOf).
- Acquis dès qu'un joueur s'assied à une table (`table.service.changeSeat`).
- Libéré pour tous les participants en fin de partie
  (`gamePersistenceService`).

### Backend — spectateurs et signaux (SPEC §3.7)
- **CORRECTIF DE SÉCURITÉ** : le broadcast `table:game` n'envoie PLUS
  `hands` aux spectateurs (bug antérieur : ils voyaient toutes les mains).
- Cap 5 spectateurs simultanés dans `table.socket.ts`, event
  `table:spectator:full` en cas de dépassement.
- `LiveGameService.hasSeat` et `pushSignal` publics ; canal
  `table:signal` pour smileys/réflexions/notes des joueurs assis.
- `GameReplay.events` (piste enrichie) + `publicNames` (recherche par nom).

### Mobile — écrans équipes, porte-monnaie, bannière et logs
- Entité `Team` avec permissions client-side MIROIR du serveur (pour
  masquer/afficher les actions inaccessibles).
- `TeamService` (mobile) enveloppant `ApiClient`.
- Écran `TeamsScreen` (liste des équipes publiques + accès mon équipe).
- Écran `MyTeamScreen` (détail avec rename, visibilité, kick, change role,
  quitter — actions filtrées par le rôle du viewer).
- Écran `WalletScreen` (solde, réclamation quotidienne, journal des
  transactions, rappel du barème économique).
- `TopBar` : passage SERVEUR-PREMIER via `services/wallet.ts` (fallback
  localStorage transparent hors-ligne).
- Bannière verte « Partie en cours… » sur l'accueil quand
  `User.activeSession` est non-null (cliquable pour reprendre).
- **Overlay de logs semi-transparent** en bas-gauche de la table
  (minimisable), alimenté par l'action moteur courante.
- Nouvelles routes `/wallet`, `/teams`, `/team` intégrées à l'éventail
  de navigation permanent.

### Tests
- **Server** : nouveau workspace `test` (vitest). 23 tests unitaires purs
  (permissions équipe, gameEconomy) + tests d'intégration Mongo écrits
  pour `TeamService`, `WalletService` et `SingleGameLockService` (exécutés
  quand `MONGOMS_AVAILABLE=1`, CI ou machine dev — sandbox restreint sans
  accès à fastdl.mongodb.org).
- **Mobile** : 14 nouveaux tests (permissions Team miroir + wallet
  serveur-premier avec fallback). Total mobile : 51.
- **Total projet : 169 tests unitaires** (32 core + 63 web + 23 server + 51 mobile).

### Documentation
- `docs/ai/SPEC.md` : statuts mis à jour (§3.5, §3.7, §3.8, §3.9 en v10.3.0).
- `docs/ai/API.md` : sections équipes/wallet/verrou/spectateurs ajoutées.
- `docs/ai/README.md` : état v10.3.0.
- `docs/api/kydos-mobile.postman_collection.json` : 10 nouvelles requêtes.

### Vérifs
- typecheck × 4 workspaces : verts.
- Tests : 169 verts.
- Builds : web + web:lib + mobile — verts.
- Démo moteur : `Vainqueur de la partie : A`.

### Ce qui n'est PAS encore livré (tranches ultérieures identifiées)
Certains points du prompt d'origine restent (honnêteté) :
- **Jeu en ligne humain/robot vs humain/robot** (SPEC §3.3) : la brique
  socket existe (liveGame.service.ts), le lock est en place — il reste à
  câbler l'écran mobile de matchmaking et le flux pending/annulation +
  la reprise par le robot favori au départ d'un joueur.
- **Endpoints publics de recherche de replays par nom** (SPEC §3.10) :
  `GameReplay.publicNames` est indexé mais l'endpoint `/games/public?q=...`
  reste à ajouter.
- **Modèle Pending Game** distinct : pour l'instant l'état lobby de Table
  fait office ; à isoler quand le matchmaking en ligne sera implémenté.

## v10.2.0 — Dialogue de configuration de partie contre robots

Ajout ciblé sur l'application mobile : quand l'utilisateur lance une partie
contre robots (`/table`), un dialogue s'ouvre — MÊME style que « Robot créé ! »
— pour choisir les paramètres.

### Nouveau composant `presentation/components/GameSetupDialog.ts`
- **Emplacement de chaque siège (A, B, C, D)** : 🤖 Auto, 👤 Moi, ou n'importe
  quel robot de l'écurie. Un seul « Moi » à la fois (le déplacer libère
  l'ancien siège automatiquement).
- **Visibilité des cartes** : Personne / Mes robots / Tout le monde. Le
  coéquipier reste TOUJOURS caché (règle de belote, appliquée par PixiTable
  via `partnerFaceDown`).
- **Nombre de manches** : 1, 2 ou 4 (union stricte du moteur `belote-core`).
- Mêmes tokens visuels que le dialogue Robot créé (fond dépoli, lueur dorée,
  actions Annuler / Lancer la partie).

### Logique pure `services/gameSetup.ts` (testée)
- `mySeatFromSetup(setup)` — résout le siège humain (ou null).
- `visibleSeatsFromSetup(setup, myRobotIds)` — sièges dont l'utilisateur voit
  les cartes.
- `isSetupValid(setup)` — vérifie un seul « moi » et manches > 0.

### Refactoring TableScreen
- Ouverture du dialogue au chargement (sauf mode `?watch=1` qui saute
  directement à 4 robots visibles, 2 manches).
- Construction du moteur PARAMÉTRÉE par le setup choisi (sièges + manches).
- `opponentCards` dynamique (`back` en mode Personne, `faceup` sinon).

### Tests
- `gameSetup.test.ts` : 11 nouveaux tests.
- Total mobile : 37 (26 → 37). Total projet : 132 tests (32 core + 63 web + 37 mobile).

### Docs
- `docs/ai/README.md` : état v10.2.0.
- `docs/ai/MOBILE.md` : nouvelle section « 10. Configuration d'une partie
  (dialogue) » avec les règles de résolution.

### Ce qui n'est PAS dans cette version (par honnêteté)
Les modules suivants du prompt d'origine demandent le serveur temps réel et
sont conservés pour les prochaines tranches : jeu en ligne humain/robot vs
humain/robot, verrou « une partie à la fois », reprise par un robot, pending,
équipes (owner/super/admin/user max 40), spectateurs max 5 vue filtrée,
économie de jetons SERVEUR (prélèvements 100 humain / 50 robot, gains
150 / 225 / 150), replay enrichi (collection indépendante avec smileys,
réflexions, temps réels, replays publics par nom). Ces tranches ne sont
PAS des fausses vitrines : le status vert « Partie en cours » et l'historique
correct viendront ENSEMBLE avec le serveur.

### Vérifs
- typecheck × 4 (core, server, web, mobile) : verts.
- Tests : 132 verts.
- Builds : web + web:lib + mobile — verts.
- Démo moteur : `Vainqueur de la partie : A`.

## v10.1.0 — Application mobile Kýdos Belote (design system fidèle, backend branché)

Version bâtie sur la base saine v9.4.0. Web et mobile sont désormais deux
applications TOTALEMENT SÉPARÉES ; elles partagent uniquement `belote-core`
(le moteur) et le composant table Pixi `web/src/table-pixi/` (importé côté
mobile via alias `@table-pixi`).

### Nouveau workspace `mobile/`
Clean architecture stricte (`core → data → domain → presentation`) et
composition root explicite (`main.tsx`). Les 3 CSS du design system Claude
Design sont copiés VERBATIM comme source de vérité visuelle.

- **Login** — carte de belote as de cœur (flip 3D). Connexion ET création de
  compte via `/auth/register` et `/auth/login` réels.
- **Accueil** — 3 grandes cartes-fonctionnalités (♥ Jouer, ♠ Mes robots,
  ♦ Créer un robot) + éventail permanent des écrans visités.
- **Barre supérieure** — Kýdos BELOTE + pastille ◆ CLIQUABLE (déblocage des
  500 jetons quotidiens avec dialogue de confirmation) + niveau + mascotte.
- **Mes robots** — écurie live depuis le VRAI backend (`GET /robots`).
  Robots créés par le web restent lisibles (curseurs reconstruits depuis
  la personnalité moteur par le mapping inverse).
- **Créer un robot** — éditeur du design system fonctionnel : mascotte
  flottante, 5 presets d'avatars, 4 curseurs (Agressivité / Prise de risque /
  Bluff / Mémoire), aperçu live, personnalité dérivée aux seuils EXACTS
  du DS. `POST /robots` avec `personality` moteur + `mobile` (avatar +
  curseurs bruts). **Comportement moteur PRÉSERVÉ** — mapping documenté,
  testé, réversible ; le bluff est purement présentationnel (ignoré du moteur).
- **Table** — layout du DS (Quitter · NOUS/EUX · atout · pause · vitesse ·
  statut vert) avec la TABLE PIXI MONTÉE dans l'emplacement réservé
  (`#game-table-mount`). Coéquipier caché même en cartes visibles.
  Sauvegarde automatique du replay en fin de partie.
- **Rejeu live** — `#/replay?id=…` rejoue chaque opération avec ses délais
  (annonce 700 ms, carte 900 ms, pli 1200 ms), pause, ×1/×2/×4.
- **Historique** — liste des parties (`GET /games`) avec « ▶ Rejouer ».
- **Classements** — SAISON 1 · ROBOTS (DS fidèle, complété par l'écurie).
- **Compétitions** — vitrine du DS (Grand Prix des IA · Coupe Contrée ·
  Ligue hebdo · Inviter des amis · Partager natif).
- **À propos** — Cephalo Sophie, liens cephalosophie.com / kantoaplo.com /
  kydosbelote.com, l'équipe (Ameur Hamdouni CEO & Founder & Architect ;
  Abdelhamid Sghaier Co-fondateur & CTO expert mobile) et les clients
  (IFPEN, La Poste, LeadsHook, Docaposte, Softia, JCDecaux, Unibet, Allianz).

### Boucle de jeu isolée (services/gameLoop.ts)
Contrôleur PUR autour de `belote-core` — plan de coup, pause, vitesse,
scheduler injectable. Testé unitairement.

### Backend adapté
- Champ `mobile` (`Mixed`) ajouté au modèle robot + serializer, sans effet
  moteur (comportement pris en compte dans les tests dédiés).
- Endpoints existants réutilisés (auth, robots, games, analytics) —
  aucun endpoint dupliqué, aucune régression.

### Cordova (mobile/cordova/)
Projet prêt : `config.xml` force le paysage sur Android et iOS, script
`sync-www.mjs` (mobile/dist → cordova/www), scripts npm dédiés.

### Documentation
- `docs/ai/README.md` — vue d'ensemble complète (destinée aux IA/devs).
- `docs/ai/MOBILE.md` — architecture détaillée de l'app mobile.
- `docs/ai/API.md` — contrat backend consommé.
- `docs/api/kydos-mobile.postman_collection.json` — collection Postman.

### Tests
- 26 tests mobile (Robot mapping/entité, dailyTokens, GameLoop planificateur).
- 63 tests web + 32 tests core inchangés.
- Total : **121 tests unitaires** verts.

### Vérifs
- typecheck × 4 (core, server, web, mobile) : verts.
- Tests × 3 workspaces : verts.
- Builds : web + web:lib + mobile — verts.
- Démo moteur : `Vainqueur de la partie : A`.

## v9.4.0 — Belote/Rebelote, annonces par siège animées, smileys, jetons sur les mains, fix resize

### Moteur (belote-core)
- **Belote / Rebelote avec annonce optionnelle.** Détection corrigée (le MÊME joueur détient Roi + Dame
  d'atout) ; nouveau `setBeloteAnnounce(seat, on)` (refusé dès que la première carte de belote est
  jouée) ; **sans annonce, les 20 points ne comptent pas** ; annonce par défaut = OUI (les robots
  annoncent automatiquement). La vue expose `belote: { seat, announcing, playedCount }`. Tests dédiés.

### Table
- **Fix resize/agrandissement** : la scène se redessinait avec les données du PREMIER rendu (cartes
  d'une ancienne manche, faux pli à 4 cartes). Le handler resize appelle désormais toujours le rendu
  le plus récent (ref), plus jamais une closure périmée.
- **Annonces par siège** : chaque joueur a sa bulle à DROITE de ses cartes, au niveau du haut de la
  dernière carte, **animée depuis son logo** (300 ms). Pendant les enchères : la dernière action de
  chacun, « Passe » inclus ; ensuite ne restent que le contrat du preneur (valeur + atout coloré),
  COINCHÉ et SURCOINCHÉ. L'icône 💭 rejoint la bulle pendant sa fenêtre de 2 s. L'ancien badge sous
  la pilule est supprimé. Logique pure announceBubbles.ts couverte de tests.
- **Belote ! / Rebelote !** : bulle dorée temporaire (2,5 s) sur le porteur au moment où il joue le
  Roi puis la Dame d'atout (uniquement s'il annonce), même animation depuis le logo.
- **Bouton Belote** : apparaît en bas à droite (zone Coincher) dès que j'ai Roi + Dame d'atout,
  présélectionné ✓, basculable à tout moment, **disparaît dès que la première des deux cartes est
  jouée**.
- **Smileys** : barre 😂 😊 😢 🥂 en bas à droite, désactivée pendant les enchères ; le smiley choisi
  s'affiche à côté du joueur (3 s) avec l'animation depuis le logo.
- **Jetons D et E déplacés au-dessus des cartes de chaque joueur** (ancrés à l'éventail via ses
  métriques), plus sur la pilule.

Vérifs : typecheck 4 paquets + 63 tests web + 32 core + build + lib + démo moteur OK.

## v9.3.0 — Annonces ×10, feuille de cahier, animations du pli, panneau d'enchères refondu, fixes

### Moteur (belote-core)
- **Les annonces sont désormais toujours des multiples de 10.** La convention d'enchères arrondit ses
  signaux (151 → 150) tout en restant une surenchère légale, et le moteur REJETTE toute valeur non
  multiple de 10 (défense en profondeur). Tests dédiés (rejet 151/162/95/101, +10 minimum imposé).

### Table
- **Feutre** : rendu en vraie texture canvas (vrais dégradés radiaux + rail en dégradé vertical) —
  disparition de l'ellipse « circulaire » héritée de l'ancienne table.
- **Animations du pli** : la carte jouée GLISSE depuis la main de son joueur jusqu'à son emplacement
  (320 ms) — on voit qui a joué ; au ramassage, les 4 cartes se REGROUPENT en pile au centre (220 ms)
  puis filent vers le siège du GAGNANT en rétrécissant (450 ms), après une pause de lecture du glow.
- **Badge de contrat** : le symbole d'atout garde SA couleur (♥♦ rouges, ♠♣ noirs) sur le fond doré ;
  la valeur affichée est arrondie à la dizaine par défense.
- **Dernier pli** : MA carte a une ombre bleue distinctive (is-mine), la carte gagnante son style or.
- **Partenaire à l'envers** : en mode « jouer », la main du partenaire reste DOS visible même si les
  cartes adverses sont affichées (on ne voit jamais le jeu de son coéquipier).
- **Crash au zoom corrigé** : le listener resize est retiré au démontage et garde contre l'app détruite.

### Feuille de score (façon cahier)
- Vraie page de cahier (lignes bleues, marge rouge, bord déchiré, écriture Caveat) avec les CUMULS
  successifs en dizaines (500 → « 50 »), cellule vide quand l'équipe ne marque pas, **trait incliné à
  chaque millier franchi** (1 trait à 1000, 2 à 2000…), chiffre des milliers omis (1010 → « 01 »),
  total des manches gagnées en bas. Modèle pur scoreSheetModel.ts couvert par des tests (dont la
  feuille de référence complète).

### Panneau d'enchères (refonte)
- **Stepper de valeur [−] 110 [+]** : démarre à dernière annonce +10, monte jusqu'à 180 puis CAPOT.
- **Icônes seules** : 💭 réflexion sans texte ; icône « ↩ + couleur du coéquipier » active seulement
  s'il a dit une couleur, vide sinon.
- **3 actions fixes : Passe / Suivre / Demande.** Suivre = +10 avec la couleur de mon camp (la mienne,
  sinon répéter celle du coéquipier), sans réflexion ; désactivé si mon camp n'a pas dit de couleur.
  Demande = soumet exactement la sélection (couleur ou répéter, réflexion, valeur ou capot).
- **Taille du popup FIXE** : message d'aide constant (hauteur figée), boutons toujours au même endroit.
- Logique pure bidMath.ts blindée de tests : après une annonce de 110, 90/100/110 indisponibles et
  120→180 + capot disponibles ; bornes du stepper ; règles de Suivre.

### Entraînement v2
- La console (DevDock) scrolle : colonne latérale bornée en hauteur et collante.

Vérifs : typecheck 4 paquets + 56 tests web + 29 core + build + lib + démo moteur OK.

## v9.2.0 — Entraînement v2 : layout table + console, notifications bas-gauche, réflexion 2 s

### Table (module table-pixi)
- **Notifications (toasts) déplacées en bas-gauche du feutre** — elles ne recouvrent plus la station
  nord ni sa main. Toast et récap d'annonces sont empilés dans un même bloc (.px-bl-stack, toast
  au-dessus du récap).
- **Réflexion (💭) affichée 2 secondes puis masquée** : le marqueur apparaît sur le badge du siège et
  dans le récap au moment de l'annonce réfléchie, puis disparaît automatiquement (chaîne
  TableHud → PixiTable → TableScene → buildSeatModels, paramètre showReflexion).

### Entraînement v2 (web/src/pages/TrainingV2.tsx)
- Plus de plein écran forcé : retour au layout de la v1 — la table à gauche, **console + logs
  (DevDock) à droite**, ControlBar sous la table, Recap en fin de partie.
- La table vit dans une **section dédiée (.tv2-wrap)** : marge haute 200 px et marge gauche 50 px
  réservées au futur HUD spécial, matérialisées par deux zones prêtes à recevoir du contenu
  (.tv2-hud-top et .tv2-hud-left). Le canvas est dans .tv2-stage (hauteur responsive, coins arrondis).
- Thème (locale/VIP/compétition) et visibilité des cartes adverses changeables EN COURS de partie.
- Boutons Relancer / Quitter / Sauvegarder le rejeu dans la barre du haut.

Vérifs : typecheck 4 paquets + 35 tests web + 27 core + build + démo moteur OK.

## v9.1.0 — Entraînement v2 : la nouvelle table (design system) branchée sur le moteur local

Nouvelle page « Entraînement v2 » (route /training-v2, lien dans la barre) pour tester la table Pixi v9
dans les conditions réelles de l'entraînement.

### Page TrainingV2 (web/src/pages/TrainingV2.tsx)
- MÊME moteur, mêmes robots, même boucle (planStep, vitesses, pauses donne/manche, sauvegarde
  automatique du rejeu) que l'entraînement v1 — seul le rendu change.
- Écran de configuration : mode (regarder 4 robots / jouer siège A), manches, sens du jeu,
  **thème de table (locale / VIP / compétition)** et **visibilité des cartes adverses (visibles / dos)**.
- Une fois lancé : table Pixi PLEIN ÉCRAN, ControlBar superposée en bas (pause, pas-à-pas, vitesse,
  délais), bandeau de fin de partie (vainqueur, rejeu, retour). Quitter via le menu ☰ de la table.
- Mode « regarder » : pas de panneau d'enchères (aucun humain) ; mode « jouer » : enchères + jeu au
  siège A avec cartes légales surlignées.

Vérifs : typecheck 4 paquets + 35 tests web + 27 core + build + démo moteur OK.

## v9.0.0 — Table Pixi : implémentation du design system officiel (thèmes local / VIP / compétition)

Implémentation fidèle du design system livré via Claude Design (handoff zip) : tokens, composants,
3 thèmes. Le design system devient la source de vérité visuelle de la table.

### Thèmes (theme.ts)
- 3 thèmes : **local** (vert chaud + acajou), **vip** (émeraude + or), **competition** (navy + argent).
- Tokens --table-* du DS exposés au HUD HTML (themeCssVars + data-theme). registerTheme/themeWith conservés.
- API : theme?: 'local'|'vip'|'competition' + themeOverrides (remplace template/theme).

### Cartes (cardAtlas.ts + CardSprite.ts)
- Spec DS : 68×96 r10, face blanche, coins Manrope 800 14/12, pip central Playfair Display 900 42px,
  dos indigo dégradé + rayures blanches 45° clippées, bordure blanche.
- Atlas UNIQUE 3× DPR (cartes invariantes par thème), polices chargées avant rasterisation.
- États DS : jouable (ring accent), non jouable (désaturée), hover (+14px), gagnante (ring + halo).

### Scène
- Éventails en arc (rot ±3°/carte, montée parabolique, overlap 32), groupes rotés par siège, inset 62px.
- Stations : pilule dégradée, logos d'équipe (bleu dégradé / jaune damier), chips D/E 20px au coin
  haut-droit, badge contrat sous la pilule, chip M du meneur.
- Feutre : rail dégradé + anneau, feutre radial + vignette, filigrane Playfair 240px + coins.
- Pli : boîte 220, cartes orientées, ramassage 140px.

### HUD (classes ky-* du DS)
- Feuille de score déchirée (Caveat) + menu ☰ en haut-droite sur le rail ; toast pilule ; dernier pli ;
  récap ; panneau d'enchères 340px ; ✕ Coincher ; popup Surcoincher ; popup fin de manche avec chrono.
- Vocabulaire DS : « coincher / surcoincher ».

### Démo
- Table plein page = UN composant (canvas + HUD intégré). Sélecteur de thème = seul élément externe.
- Raccourcis : b (popup enchère), o (adverses), r (redistribuer), t (atout).

Vérifs : typecheck 4 paquets + 35 tests web + 27 core + build app + lib + démo moteur OK.

## v8.4.0 — Table Pixi : cartes en SPRITES (atlas de textures 2D), rendu net, plein écran

Changement d'approche : les cartes deviennent de VRAIS sprites depuis un atlas de textures pré-rendues,
au lieu d'être dessinées à la main en primitives Pixi (cause du rendu « encre qui coule »).

### Atlas de cartes (scene/cardAtlas.ts)
- Les 32 cartes + le dos rendus UNE FOIS sur des canvases 2D nets (3× DPR) avec clip() arrondi — plus
  aucun débordement du motif hors de la carte. Convertis en Texture Pixi.
- Couleurs + police pilotées par le TEMPLATE (face/liseré/rouge/noir/dos/motif). Atlas reconstruit
  seulement au changement de template.

### Sprites (scene/CardSprite.ts)
- Chaque carte à l'écran = un Sprite de l'atlas : net à tout zoom, centré au pixel près. Surlignage
  jouable / lueur gagnante dessinés SOUS la carte (aucun contour sur l'illustration).

### Jetons (scene/tokenTexture.ts)
- D/E rendus comme de vraies textures de jetons de poker (disque cranté + anneau + lettre) — propres.

### Corrections
- Table PLEIN ÉCRAN : insets quasi nuls, le feutre remplit la page.
- Rotation ouest/est corrigée (clamp vertical) : les mains latérales ne débordent plus.
- Ancien CardView (dessin main) supprimé.

### Démo
- UN SEUL composant Pixi plein page ; le sélecteur de templates est le seul élément hors Pixi.
- Bascule adverses dos/face/cachées, atout, redistribuer.

Vérifs : typecheck 4 paquets + 43 tests web + 27 core + build app + lib + démo moteur OK.

## v8.3.0 — Table Pixi : design refait fidèle au DOM (parité exacte positions/tailles/tokens)

Refonte totale du design suite aux retours : relecture ligne par ligne du DOM (GameTable.tsx, belote-table.css,
design-tokens.css, PlayingCard.jsx, PlayerHand.tsx, TableChrome.tsx, JetonAnnonce.jsx).

### Parité exacte avec le DOM
- **Une seule taille de carte pour TOUTES les mains** (DOM : .pcard.sm 30×42) — adversaires et joueur
  utilisent la même taille, scalée par la hauteur du feutre. Fini la différence de taille.
- **Stations DANS le feutre** (DOM: bottom:8px/top:8px/left:10px/right:10px), plus à l'extérieur.
- **Stations ouest/est ROTÉES** ±90° (DOM: rotate(90deg)/-90deg) — le nom se lit verticalement.
- **Trick : DOM slot offsets exacts** (south: -50%,18px / north: -50%,-78px / west: -92px,-30px / east: 28px,-30px).
- **Surlignage jouable** = glow doré concentrique (DOM: box-shadow var(--glow-accent)) sans cadre.
- **Cartes atout** par template (felt.atoutColor) — même opacité que le DOM (0.09).
- **HUD CALÉ dans le feutre** via --px-felt-x/y/w/h (popup à top:40%, toast top-right, dernier pli
  top-left, annonces bottom-left, contre bottom-right, feuille de score top-right) — rien ne sort.
- **Rendu net** : devicePixelRatio réel, resynchronisé à chaque zoom.

### CSS restructuré (par fichier)
- styles/table.css, hud.css, panel.css, scoresheet.css, compact.css
- Toutes les overlays pointées via calc(var(--px-felt-*)).

### Démo
- Barre de démo EN BAS AU CENTRE (aucune collision avec la table).
- Sélecteur de templates, bascule adverses, popup, plein écran, redistribuer.

Vérifs : typecheck 4 paquets + 43 tests + build + lib + démo moteur OK.

## v8.2.0 — Table Pixi : design refait de zéro

Refonte design complète suite aux retours (contours jaunes, débordements, flou au zoom, traits parasites,
robots sur les cartes).

### Corrections structurantes
- **Stations HORS du feutre** (sud dessous, nord dessus, ouest/est à côté, ancrage borné à l'écran) :
  les robots/joueurs ne cachent PLUS JAMAIS les cartes.
- **HUD calé DANS le feutre** : PixiTable publie --px-felt-x/y/w/h en variables CSS ; popup d'enchère
  (centrée DANS le feutre, largeur bornée), feuille déchirée (haut-droite DU FEUTRE), dernier pli
  (haut-gauche DU FEUTRE), récap d'annonces et toast — plus rien ne sort de la table.
- **Netteté au zoom** : résolution Pixi = devicePixelRatio réel NON plafonné, resynchronisée à chaque
  resize/zoom — écriture et cartes nettes à tout zoom.
- **Contour jouable** : cadre jaune supprimé — liseré BLANC fin + halo doux (thémable card.highlight).
- **Jetons propres** : D bleu / E rouge plats (disque + anneau interne) — les traits rouges/bleus
  parasites (arcs pointillés) sont supprimés.
- **Tout proportionnel** : sceneScale(hauteur feutre) appliqué à toutes les tailles (pilules, polices,
  jetons, badges, filigranes, marges, pli) — helper exporté et testé.
- Filigrane d'atout par template (felt.atoutColor) pour la lisibilité sur chaque feutre.

### Vérifs
- 70 tests (27 core + 43 web), typecheck 4 paquets, builds app + lib, démo moteur OK.
- demo/table-pixi-demo.html régénérée : stations dehors, HUD calé feutre, DPR net, sélecteur de templates.

## v8.1.0 — Table Pixi : multi-templates, feuille déchirée, cartes redessinées, anti-débordement

Passe design profonde basée sur les captures de l'ancienne table (référence assumée : faire aussi bien, puis mieux).

### Multi-templates (nouveau système)
- `themes/` : templates NOMMÉS et COMPLETS — classic (feutre vert casino + rail bois), cosmos (bleu spatial),
  olympus (ardoise + rail doré) — le trio de la table DOM. Un template = theme Pixi complet + hudVars
  (variables CSS) pour que le HUD HTML suive le même thème. Registre extensible : registerTemplate()/
  getTemplate()/listTemplates(), testé. `<PixiTable template="cosmos" theme={{...}} />` : surcharges fines
  fusionnées PAR-DESSUS le template (mergeThemeOnto, section par section, testé).

### Styles structurés
- CSS découpé par domaine dans `styles/` : table.css, hud.css, cards.css, panels.css, scoresheet.css,
  compact.css — tous pilotés par les variables du template. Fini le CSS monolithique.

### Feuille de score « papier déchiré »
- La ScoreView du DOM (papier déchiré, manuscrit stylo bleu, cumuls belote) RÉUTILISÉE telle quelle dans le
  HUD Pixi, épinglée EN HAUT À DROITE comme sur la photo (prop showScoreSheet, défaut true). Feuille
  détaillée toujours via le menu.

### Cartes & sièges redessinés
- CardView : ombre portée, coins proportionnels (rang + enseigne, coin bas-droit INVERSÉ), grande enseigne
  centrale — typographie proportionnelle à la carte (nette à toute taille).
- Jetons façon JETONS DE POKER (D bleu / E rouge, anneau pointillé) comme le DealerToken DOM ; badge de
  contrat SOMBRE « 90 ♠ » à côté du preneur, comme la photo ; pilules de sièges arrondies.

### Anti-débordement (zoom / petites tailles)
- fitSpacing : chaque éventail garantit espacement×(n−1)+carte ≤ espace dispo — plus AUCUNE carte ne sort
  du cadre, quel que soit le zoom navigateur ou la taille d'écran. Cartes adverses et décalage du pli
  rescalés avec le feutre.

### Vérifs
- 69 tests (27 core + 42 web dont registre de templates + fusion), typecheck 4 paquets, builds app + lib,
  démo moteur OK. `demo/table-pixi-demo.html` régénérée avec SÉLECTEUR DE TEMPLATES (Classique/Cosmos/
  Olympe), nouvelles cartes, feuille déchirée, éventails bornés.

## v8.0.1 — Table Pixi v8 : parité complète avec la table DOM, architecture clean, mobile plein écran

Refonte MAJEURE du module table-pixi : comportement à PARITÉ avec l'ancienne table DOM (GameTable),
branché sur le même moteur/robots/cerveaux (belote-core intact), design fixé, téléphone en plein écran
paysage, architecture modulaire (un composant par fichier).

### Architecture (web/src/table-pixi/)
- `scene/` : couches Pixi sans logique de jeu — TableScene (orchestration), FeltLayer (rail + feutre +
  atout central ET coins), SeatsLayer (stations au bord intérieur du feutre), HandsLayer (4 mains DANS le
  feutre), TrickLayer (pli + ANIMATION DE RAMASSAGE vers le gagnant), CardView, LogoView.
- `hud/` : composants HTML séparés — TableHud (assembleur), BidPanel, ContreControls, AnnouncesList,
  LastTrickPanel, ScoreSheet, TableMessagePopup, MenuButton.
- `fullscreen.ts` (plein écran + orientation lock), `handSort.ts`, `layout.ts`, `theme.ts` (tout paramétrable).

### Parité de comportement avec la table DOM (analysée fichier par fichier)
- Sièges : logo d'ÉQUIPE identicon (paire de noms, comme le DOM), nom 4 lettres, jetons D/E fixes,
  ▲ meneur volatil (masqué pendant le ramassage), bulle de demande (couleur SEULEMENT si nommée),
  demande retenue du preneur pendant le jeu après 2 s (enseigne de l'atout), contre/surcontre PERSONNELS.
- Mains : sud triée (atout d'abord) cliquable avec cartes non jouables GRISÉES à ton tour ; nord
  horizontale ; ouest/est PIVOTÉES ±90° le long du feutre ; adverses en dos/face/cachées (configurable).
- Pli : lueur dorée sur la carte gagnante en attente + animation de ramassage (~550 ms) vers le gagnant.
- HUD : notification après chaque annonce (5 s), récap des 4 dernières annonces + contrat (jusqu'à la
  1re carte), dernier pli, popup enchère centrée (Répéter/Réflexion/paliers/Capot/Passe — payloads DOM),
  Contrer instantané + popup Surcontrer, popup inter-manche avec compte à rebours 5 s, popup fin de
  partie, feuille de score via le menu.
- buildSeatModels : la logique de parité extraite en fonction PURE, couverte par 6 tests.

### Téléphone
- Plein écran + verrouillage paysage (menu ☰ → Plein écran, bouton aussi sur l'écran de rotation).
- Styles compacts en paysage bas (≤480 px). Portrait : écran « tourne ton téléphone ».

### Vérifs
- 64 tests (27 core + 37 web, commentés en anglais), typecheck 4 paquets, build app + lib, démo moteur OK.
- `demo/table-pixi-demo.html` régénérée : layout v8 fidèle + bouton « Gagnant+ramasser » pour tester
  l'animation, bascule adverses, feuille de score, plein écran. S'ouvre seule sans serveur.

## v7.2.0 — Table Pixi : refonte design calée sur le tapis (cartes, adversaires, jetons, score)

Passe design majeure du module table-pixi, basée sur l'analyse de l'ancienne table DOM.

### Mise en page calée sur le tapis (corrige les collisions)
- Tout est positionné PAR RAPPORT au rectangle du tapis (tableRect), plus aux bords de l'écran : stations
  joueurs (logo + nom + jetons) HORS du rail, éventails de cartes JUSTE à l'intérieur du feutre, pli au
  centre. Fini les collisions et la main collée en bas de l'écran.

### Cartes
- Taille RÉDUITE et configurable (proche de l'ancien .pcard.sm) : card.width/height plus petits, bornes
  responsive minWidth/maxWidth, opponentWidth dédié — tout paramétrable à l'init via le thème.
- Main du joueur TRIÉE (atout d'abord puis couleurs alternées) via displaySort (porté du DOM).

### Cartes adverses (configurable)
- `opponentCards: 'hidden' | 'back' | 'faceup'` — prop <PixiTable opponentCards=...> ou theme.opponentCards.
  back = dos + compte ; faceup = vraies cartes (mode entraînement robot) ; hidden = rien.
  StandalonePixiTable passe désormais TOUTES les mains et accepte opponentCards (défaut back).

### Jetons & feuille de score
- Jetons D (donneur), E (entame) et ▲ MENEUR (vert) sur le joueur dont c'est le tour (manquait avant).
- Feuille de score accessible via le menu (☰ → Feuille de score).

### Popup d'enchère
- Modale CENTRÉE au milieu avec fond estompé (.px-modal-backdrop) — plus aucune collision visuelle.

### Code, tests, démo
- Nouveaux helpers PURS testés (commentés en anglais) : handSort.ts (suitOrder/displaySort) + handSort.test.
- theme.ts enrichi (opponentWidth, opponentCards, tailles réduites). TableScene réécrit (couches calées tapis
  + OpponentsLayer). Total : 58 tests (27 core + 31 web).
- demo/table-pixi-demo.html RÉGÉNÉRÉE : reflète la nouvelle mise en page, avec bascule Adverses (dos/face/cachées),
  feuille de score, popup modale. S'ouvre seule dans un navigateur (Pixi via CDN), sans relancer l'app.

Vérifs : typecheck (4 paquets) + 58 tests + build app + build lib + démo (vainqueur A) OK ; syntaxe démo validée.

## v7.1.0 — Table Pixi : design retravaillé (table rectangulaire, logos, cartes responsive) + démo HTML

Passe design du module table-pixi + démo autonome.

### Design
- **Popup d'enchère centrée** au MILIEU de l'écran (modal), au lieu d'être collée en bas.
- **Table rectangulaire arrondie** (façon vraie table de cartes, comme l'ancienne table DOM) au lieu d'un
  ovale : rail (bois) + feutre + halo central doux. Helper `tableRect` (rectangle arrondi centré, inset, coins).
- **Logos des joueurs** : nouveau `LogoView` — identicon algorithmique (hash du nom → couleur HSL → identicon
  5×5 symétrique), identique au TeamBadge du DOM, dessiné en Pixi. Affiché au-dessus de chaque siège.
- **Cartes responsive** : `responsiveCardWidth` calcule la largeur des cartes selon la place dispo (bornes
  min/max), recalculée à chaque rendu/resize ; main et pli utilisent ces dimensions.

### Code & paramétrage
- `layout.ts` : helpers PURS (hashName, teamHsl, hslToHex, teamColorHex, responsiveCardWidth, tableRect),
  commentés en anglais, testés.
- `theme.ts` enrichi : felt (rectangle arrondi : insets, coins, rail, halo), card (bornes responsive
  minWidth/maxWidth), seat (avatarSize). Tout reste paramétrable via `<PixiTable theme={...} />`.
- Couches mises à jour (FeltLayer rectangulaire, SeatsLayer avec logo, Trick/Hand avec cartes responsive).

### Tests (commentés en anglais)
- `layout.test.ts` (7) : déterminisme du hash, conversion HSL→hex, bornes responsive, géométrie de la table.
- `theme.test.ts` (3) conservés. Total : 56 tests (27 core + 29 web).

### Démo autonome
- `demo/table-pixi-demo.html` : page HTML AUTONOME (Pixi via CDN) qui reproduit fidèlement le rendu du module
  (CardView, couches, LogoView) + le HUD (même CSS) sur un état de jeu représentatif. S'ouvre seule dans un
  navigateur, sans relancer l'app. Barre de contrôle : redistribuer, atout, popup, vider le pli.

Vérifs : typecheck (4 paquets) + 56 tests + build app + démo (vainqueur A) OK ; syntaxe de la démo HTML validée.

## v7.0.2 — Table Pixi : correction du crash removeChildren + thème entièrement paramétrable

### Correction
- **RangeError « removeChildren: numeric values are outside the acceptable range »** : CardView n'utilise
  plus removeChildren(index) (hors plage quand seuls le halo + le corps existaient). Les textes/symboles
  vivent dans un conteneur dédié vidé proprement (`content.removeChildren()`), sûr même vide.

### Tout est configurable par paramètres (thème)
- Nouveau module `theme.ts` : `PixiTableTheme` couvre TOUT le visuel — background de la table, police, tapis
  (couleur, bordure, rayons, opacité/affichage de l'atout), cartes (face/dos/bordures, rouge/noir,
  surbrillance, dimensions), sièges (couleurs d'équipe, surbrillance du meneur, marge), bulles d'enchère
  (normales et contrées), décalage du pli. `defaultTheme()` + `mergeTheme()` (fusion profonde).
- `<PixiTable theme={...} showMenu forceLandscape />` : le thème est fusionné avec les défauts (tout champ
  omis prend sa valeur par défaut) ; le `background` est appliqué au conteneur ; CardView, FeltLayer,
  SeatsLayer, AnnouncesLayer, TrickLayer, HandLayer consomment le thème (plus aucune couleur en dur).
- `StandalonePixiTable` propage `theme` / `showMenu` / `forceLandscape`.
- Tests : `theme.test` (3, fusion profonde). Total : 50 tests (27 core + 23 web). Doc thème ajoutée.

Vérifs : typecheck (4 paquets) + 50 tests + build app + démo (vainqueur A) OK.

## v7.0.1 — Table de jeu migrée vers PixiJS v8 (rendu canvas), module autonome

Migration de la TABLE DE JEU vers un rendu canvas PixiJS v8, à COMPORTEMENT IDENTIQUE.
Le moteur, les robots, le RobotContext, les actions et l'EngineView (partagés via belote-core) sont
INCHANGÉS — seul le rendu change. Nouveau module autonome `web/src/table-pixi/` (code + styles).

### Rendu
- Plateau en Pixi (canvas/WebGL), dessin 100% vectoriel (aucune image) : tapis + glyphe d'atout, sièges
  (nom + jetons donneur/entame, surbrillance du meneur), pli courant, bulles d'enchère, main en éventail
  avec cartes cliquables (halo de jouabilité).
- Scène décomposée en couches AUTONOMES (FeltLayer, SeatsLayer, TrickLayer, AnnouncesLayer, HandLayer) —
  séparation stricte, aucune logique de jeu dans le rendu.
- CardView : carte (face/dos) en Graphics + Text.

### Contrôles (surcouche HTML sur le canvas)
- TableHud : popup d'enchère (couleurs, répéter la couleur du partenaire, réflexion, paliers 90→180, capot,
  passe), bouton Contrer, popup Surcontrer, NOTIFICATION après chaque demande, popup ENTRE DEUX MANCHES,
  FEUILLE DE SCORE, et une ICÔNE MENU (quitter la table + extensible pour de futures actions).
- Mêmes payloads onBid/onPlay que la table DOM : comportement identique.

### Responsive & rotation forcée
- Canvas auto-redimensionné, scène relayoutée au resize. PC / tablette : pleine surface.
- Téléphone en PORTRAIT : HUD masqué + écran « Tourne ton téléphone à l'horizontale pour jouer » —
  l'utilisateur doit passer en paysage. Styles compacts sous 460px de hauteur.

### Intégration
- PixiTable = drop-in : mêmes props que GameTable (+ onLeave pour le menu). StandalonePixiTable branche le
  MÊME LocalTableEngine. Nouvelle route /table-pixi (la table DOM reste sur /table-demo, rien cassé).
- Dépendance : pixi.js ^8. Doc : docs/table-pixi/README.md.

Vérifs : typecheck (4 paquets) + 47 tests + build app + démo (vainqueur A) OK.
Note : les composants Pixi exigent un canvas/WebGL (navigateur), donc non couverts par des tests unitaires node.

## v6.2.0 — Éditeur de cerveau : bugs corrigés, helpers via this, décomposition + JSON

Corrections de fond + architecture de l'éditeur de cerveau.

### Bugs corrigés
- **`Identifier 'bid' has already been declared`** : les helpers (bid/play/log/helpers) ne sont plus injectés
  comme PARAMÈTRES mais exposés via `this`. Plus aucune collision : le scripteur peut déclarer `const bid`.
  Le bac à sample lie `this` (helpers + appels croisés this.maFonction(ctx)).
- **Code généré non exécutable** : la classe générée définit désormais elle-même ses helpers (bloc helpers
  inséré). Le `.ts` téléchargé est AUTONOME et tourne tel quel dans le moteur (registerAlgorithm).
- **Constantes mutées** : les corps par défaut clonent avant tri — `[...legal].sort(...)` — donc plus de
  mutation de ctx.legalCards. HELPERS_REFERENCE et SNIPPETS préfixés `this.`.
- **Insertion à la fin** : cliquer un élément de la toolbox insère AU CURSEUR du panneau principal
  (dispatch CodeMirror sur la sélection), repli sur l'ajout en fin si pas de focus.

### Architecture — décomposition + tout en JSON (norme KANTO APLO)
- `editorDescriptor.ts` : l'éditeur décrit PAR DES DONNÉES — EDITOR_LAYOUT (panneaux), TOOLBOX_DESCRIPTOR
  (sections), RETURN_COLORS (couleur par type mappée sur Hermès/Synergos/Logos/Mantis), describeBrain,
  describeProject, describeEditor (snapshot complet sérialisable `kanto-aplo/brain-editor@1`).
- Composants autonomes sous `components/` : `ConsolePanel` (présentationnel, sans état, props uniquement),
  barrel `index.ts`. La page devient un assembleur.
- Tests : `editorDescriptor.test` (3). Total : 47 tests (27 core + 20 web).

### Documentation
- `docs/brain-editor/05-editeur-interne.md` : helpers via this, insertion au curseur, décomposition,
  descripteur JSON, invariants. README de la doc éditeur mis à jour.

Vérifs : typecheck (4 paquets) + 47 tests + build app + build librairie + démo (vainqueur A) OK.

## v6.1.0 — Outillage serveur : PM2, TNR (Postman + OpenAPI), README d'installation

Tout pour installer, lancer et tester le serveur proprement.

### PM2 (lancement pro)
- `ecosystem.config.cjs` à la racine : 4 process — `belote-api` (backend prod), `belote-api-debug`
  (inspector :9229 + watch + logs debug), `belote-web` (preview du build), `belote-web-dev` (HMR).
  Logs dans `logs/`, autorestart, max_memory_restart, prêt pour `pm2 save && pm2 startup`.

### TNR — dossier server/tnr/
- `belote-api.postman_collection.json` : collection Postman complète (49 requêtes, 10 dossiers) couvrant
  TOUTES les API. Login enregistre {{token}} automatiquement ; les créations enregistrent les IDs réutilisés.
- `env.local.…` / `env.vps.…` : deux environnements Postman (local + VPS) avec toutes les variables.
- `openapi.json` : spec OpenAPI 3 (39 chemins, 49 opérations) à visualiser dans Swagger UI / Redoc.
- `tnr/README.md` : mode d'emploi (Postman, Newman, Swagger, Redoc).

### Configuration & documentation
- `server/.env.example` : toutes les variables réelles documentées (PORT, MONGO_URI, USE_MEMORY_DB,
  JWT_SECRET, CORS_ORIGIN, LOG_LEVEL).
- README racine : nouvelle section « Installation & lancement » (prérequis, local pas-à-pas, build prod,
  déploiement VPS avec PM2, tableau des variables d'env, TNR).
- `docs/DEPLOYMENT.md` : guide de déploiement complet (PM2, exemple Nginx reverse proxy + WebSocket, TLS
  certbot, mise à jour, dépannage).
- `docs/API.md` : ajout du module Cerveaux (Brains) + renvoi vers le dossier tnr/.

Aucun changement du code applicatif (outillage + docs). Vérifs : typecheck (4 paquets) + 44 tests + démo OK ;
les 4 fichiers JSON du TNR sont validés.

## v6.0.0 — Version majeure : contrat stable, design Cosmos, table modulaire

Version majeure consolidant les trois axes — architecture, design, qualité.

### Architecture — contrat public figé
- `belote-core` expose désormais une SURFACE PUBLIQUE STABLE (SemVer) : `PUBLIC_CONTRACT.md` liste les
  symboles garantis (moteur, règles, score, AlgoSpec, Agent, RobotAlgorithm, registre, conventions).
  Tout retrait/changement de signature ⇒ version majeure. Le point d'entrée core est annoté en conséquence.
- Garanties actées : pureté (pas de réseau/DOM/stockage), portabilité local↔serveur identique, extensibilité
  par `registerAlgorithm` (cerveau custom branché par `AlgoSpec.name`).

### Design — identité Cosmos (galaxie)
- Nouvelle couche visuelle `styles/cosmos.css` (additive, sans réécrire les composants) : fond spatial global
  (nébuleuses gold/violet/bleu rappelant l'écosystème + champ d'étoiles animé, respect de prefers-reduced-motion),
  barre de navigation en verre dépoli avec filet et halo gold, onglet actif marqué d'une étoile, version-badge.
- Cohérent avec la métaphore solaire de KANTO APLO (étoile + planètes-éditeurs).

### Qualité — table modulaire (refacto étape 2/2) + tests
- Décomposition de GameTable poursuivie : nouveaux composants AUTONOMES sous `table/parts/` —
  `FeltBackdrop` (décor/atout du tapis), `TableToast` (notification), `PlayerSeat` (siège présentationnel :
  jeton + logo + annonce). GameTable passe sous 382 lignes, devient un assembleur.
- Composants réexportés par le module table (réutilisables via @kanto-aplo/belote-table).
- Tests : `TableChrome.test` (5) ; pattern vitest élargi aux .tsx. Total : 44 tests (27 core + 17 web).

Vérifs : typecheck (4 paquets) + 44 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.24.0 — Documentation de l'éditeur de cerveau (module, fonctionnel, archi, conception, README)

Suite documentaire complète de l'éditeur de cerveau, dans `docs/brain-editor/` :

- README.md — présentation, démarrage rapide, principe clé, index des documents.
- 01-module.md — document MODULE : chaque fichier (front + serveur), son rôle, ses exports, ses dépendances,
  graphe de dépendances.
- 02-fonctionnel.md — document FONCTIONNEL : disposition de l'écran, fonctionnalités par zone, 6 cas d'usage,
  règles de comportement.
- 03-architecture.md — document ARCHITECTURE : vue en couches, flux (test, contexte, génération, persistance),
  modèle de données, API REST, intégration au système de robots, schémas ASCII.
- 04-conception.md — document CONCEPTION : 7 décisions structurantes (avec alternatives écartées), modèles de
  données, conventions de génération, limites assumées, évolutions possibles.

Aucun changement de code applicatif (documentation seule). Vérifs : typecheck (4 paquets) + 39 tests + build + démo OK.

## v5.23.0 — Éditeur de cerveau : console par fonction, contexte+AlgoSpec en JSON éditable

Affinages de l'IDE selon les retours :

### Console PRIVÉE à chaque fonction
- Les logs et le résultat sont désormais indexés PAR fonction (chaque fonction a sa propre console),
  avec un sélecteur de fonction dans la barre de la console. « Vider » ne vide que la console de la fonction visée.
- Console MINIMISÉE par défaut. Actions en ICÔNES : 🗑 (vider cette console), ▾/▴ (réduire/ouvrir).
- La console ne couvre plus la toolbox : nouvelle structure (toolbox pleine hauteur à gauche, colonne
  principale à droite = éditeurs + contexte PUIS console en dessous, uniquement sous cette zone).

### Contexte complet + AlgoSpec en JSON éditable
- Nouveau panneau « Contexte complet (JSON) » (CodeMirror, coloré) : affiche le contexte d'aperçu COMPLET
  (main, personnalité, AlgoSpec, table, annonces, légalité) beautifié.
- Éditable : bouton « ✓ Appliquer » → le JSON modifié impacte DIRECTEMENT tout l'existant (cartes affichées,
  réglages, personnalité, et l'AlgoSpec utilisée par l'aperçu). Boutons « ↻ recharger » et « défaut ».
- L'AlgoSpec par défaut (génome) est désormais portée par le contexte et modifiable ; on peut utiliser celle
  par défaut ou la sienne. Module previewContext enrichi (defaultSpec, contextToJson, applyContextJson).

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.22.0 — Éditeur de cerveau : projets versionnés, persistance serveur + localStorage

Persistance complète de l'éditeur de cerveau + refacto en couches dédiées.

### Backend — module brain (collection MongoDB)
- Nouveau module serveur `server/src/modules/brain/` (model + service + controller + routes + index), monté en une
  ligne dans le registre, structuré comme les autres domaines.
- Modèle BrainProject : un projet = un titre + PLUSIEURS versions. Chaque version porte le nom du cerveau, les
  fonctions (clé/params/retour/corps/custom), le CODE généré en TEXTE, et les réglages d'aperçu.
- API REST : liste, get, create (avec V-1.0.0 par défaut), updateVersion, addVersion (incrémente V-1.x.0,
  copie l'active), switchVersion (version active), clone (projet entier), delete. Toutes sous authentification.

### Frontend — persistance + refacto
- `brainStore.ts` : types, (dé)sérialisation modèle↔version, client API (repli silencieux hors-ligne),
  et localStorage (brouillon courant anti-perte).
- `useBrainProjects.ts` : hook qui orchestre la liste de projets, les versions, l'autosave LOCAL (source de
  vérité dans le navigateur) et la SYNC serveur best-effort. Local-first : tout marche hors-ligne.
- Barre de projets : sélecteur de projet, nouveau / cloner / supprimer ; sélecteur de VERSION + « ＋ version » ;
  « 💾 Sauvegarder serveur », « ↻ liste serveur », chargement depuis le serveur ; indicateur de sync
  (● local / ⏳ / ✓ serveur / ⚠ hors-ligne).
- Autosave localStorage (débounce 500 ms) : on ne perd pas le travail en quittant. Au montage, un projet
  « Cerveau 1 » en V-1.0.0 est créé si aucun n'existe. Changer de version recharge l'éditeur sans écraser la saisie.

Vérifs : typecheck (4 paquets) + 39 tests + build app + build librairie + démo (vainqueur A) OK.
Note : MongoDB non joignable dans le sandbox — module serveur validé par typecheck strict ; le front fonctionne
en local (localStorage) et bascule sur l'API quand le serveur tourne.

## v5.21.0 — Éditeur de cerveau : édition du nom et des paramètres des fonctions custom

Suite de l'IDE : on peut désormais RENOMMER une fonction personnalisée et changer sa SIGNATURE.

- Bouton ✎ sur chaque fonction custom → formulaire inline : nom, paramètres (ex. « ctx, card »),
  type de retour (any / boolean / number / BidDecision / CardDecision).
- Renommage propre : le corps suit le nouveau nom, les panneaux gauche/droite et le code généré sont
  mis à jour automatiquement ; collisions de noms évitées (suffixe _).
- Les paramètres déclarés sont respectés dans le code généré ET dans le bac à sable (les noms réservés
  ctx/log/bid/play/helpers sont filtrés pour éviter les doublons de paramètres).

Ainsi une fonction custom peut prendre de vrais arguments et être appelée depuis une autre :
this.scoreCarte(ctx, carte) → number, etc.

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.20.0 — Éditeur de cerveau → IDE (console, split, fonctions custom, thème noir)

L'éditeur de cerveau (/brain-editor) devient un mini-IDE inspiré d'IntelliJ/VS Code.

### Console en bas (style inspecteur Chrome)
- Onglets Logs / Info / Erreurs / Objet, avec compteurs ; minimisable (▾ réduire / ▴ ouvrir) ; bouton vider.
- Les logs sont structurés (niveau + catégorie + message + données objet dépliées en JSON).
- L'onglet « Objet » affiche le retour de la dernière exécution (la décision) ; « Erreurs » isole les erreurs runtime.

### Fonctions personnalisables
- Bouton « ＋ ajouter » : crée une fonction custom (nom unique auto), elle apparaît dans la toolbox « Fonctions ».
- Chaque fonction se teste SEULE (▶) et est appelable depuis les autres via this.maFonction(ctx, ...) — le bac à
  sable lie correctement « this » pour les appels croisés (validé : decideBid appelant une fonction custom).
- Le code généré déclare les fonctions custom comme méthodes de la classe (paramètres respectés).

### Deux panneaux côte à côte (split)
- Bascule 1 panneau / 2 panneaux. En split : panneau de DROITE = principal (reçoit les insertions depuis la
  toolbox), badge « principal ◀ insertions ». Bouton ⇄ pour échanger gauche/droite. Sélection de la fonction de
  chaque panneau via la toolbox (◧ = ouvrir à gauche).

### Thème + recherche
- Sélecteur de thème ; nouveau thème « Noir » par défaut (fond vraiment noir #000, interface comprise) avec
  coloration syntaxique dédiée. One Dark conservé.
- Champ de recherche compact en haut de la toolbox : filtre le contexte et les helpers, prend peu de place.

### Technique
- Modules : themes.ts (thème noir custom via EditorView.theme + HighlightStyle), codegen.ts enrichi (CustomFn,
  logs structurés LogLine, appels croisés via this), previewContext.ts (donne éditable/redistribuable).

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.19.0 — Éditeur de cerveau : contexte éditable + redistribuable, onglets refaits

Deux améliorations majeures de l'éditeur de cerveau (/brain-editor), suite aux retours :

### Contexte d'aperçu ÉDITABLE et REDISTRIBUABLE (colonne droite)
- Le contexte d'exemple n'est plus figé : un vrai panneau éditable, à droite, avec :
  - **Ma main** : 8 cartes affichées en chips (rang + symbole couleur, rouge/noir). Clic = rang suivant,
    clic droit = couleur suivante. Bouton **🎲 Redistribuer** = nouvelle donne aléatoire de 8 cartes distinctes
    (jeu de 32), exactement comme une vraie donne du jeu.
  - **Réglages** : atout, phase (enchère/jeu), agressivité + concentration (sliders), annonce partenaire,
    annonce courante, peut contrer / peut surcontrer.
- Le bouton **▶ Tester** exécute la fonction sur CE contexte (construit en live via buildPreviewContext),
  et affiche le retour (décision) + les logs. On modifie la main, on re-teste : itération immédiate.
- Module `previewContext.ts` : dealHand() (donne aléatoire), CtxSettings (réglages), buildPreviewContext().

### Onglets de fonctions refaits (l'IHM qui s'affichait mal)
- Les onglets decideBid / decideCard / shouldContre / shouldSurcontre sont maintenant de grosses cartes
  lisibles, avec une pastille de couleur + le type de retour, et un état actif net (couleur par type :
  BidDecision orange, CardDecision vert, boolean bleu). Plus de superposition illisible.

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.18.0 — Éditeur de cerveau : codage JS des 5 fonctions RobotAlgorithm

Nouvel éditeur dédié au CŒUR du cerveau d'un robot (route /brain-editor). Remplace l'ancien éditeur à nœuds
(supprimé). On code directement les fonctions du contrat RobotAlgorithm, en JavaScript, avec coloration.

### Concept
- Un onglet par fonction du cerveau : decideBid, decideCard, shouldContre, shouldSurcontre (extensible : « + fonction »).
- Pour chaque fonction : éditeur de code JS coloré (CodeMirror + thème One Dark), corps pré-rempli pédagogique.
- Le code généré assemble les 5 corps en une classe RobotAlgorithm complète + son enregistrement registerAlgorithm,
  téléchargeable en .ts (à déposer dans le projet — résolu par AlgoSpec.name).

### Accès au contexte (palette cliquable)
- Colonne de gauche : tout le RobotContext + l'AlgoSpec accessibles, groupés (Identité, Ma main, Personnalité/Génome,
  Table, Légalité), chaque entrée typée et documentée — clic = insère le chemin (ctx.personality.aggressiveness...).
- Helpers injectés : log.info/debug/warn (module logger), bid(), play(), helpers.strength/value/wouldWin/countSuit.
- Extraits insérables (compter les As, proba par agressivité, annonce partenaire, annoncer capot, monter de N...).

### Aperçu (bac à sable)
- Bouton « Tester » : exécute la fonction sur un contexte d'exemple, affiche le RETOUR (décision) + les LOGS,
  ou l'erreur. Permet d'itérer sans lancer une partie. Probabilité via ctx.personality.aggressiveness supportée.

### Technique
- Dépendances : @uiw/react-codemirror, @codemirror/lang-javascript, @codemirror/theme-one-dark.
- Sandbox d'exécution via new Function avec log/bid/play/helpers injectés (aperçu uniquement).
- Style Héphaïstos (sombre, dense, pro). Page React pure, lien « Éditeur cerveau » dans la nav.

Vérifs : typecheck (4 paquets) + 39 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.17.0 — Éditeur visuel de cerveaux de robots (nœuds, connexions, AlgoSpec)

Nouvel éditeur visuel de cerveaux de robots (`/robot-editor`), style VS Code dark :

### Interface
- **Barre d'onglets** : un robot par onglet, presets (Classique / Agressif / Par défaut),
  bouton Cloner (⧉), fermer (✕). Plusieurs robots ouverts simultanément.
- **Layout 3 colonnes** : Toolbox (gauche) | Canvas de nœuds (centre) | Spec + JSON (droite).

### Toolbox — bibliothèque de blocs drag & drop
- **Conditions** (10) : J'ai N+ atouts, J'ai le Valet/9 d'atout, J'ai N+ As hors-atout,
  Adversaire/Partenaire a annoncé, Contrat ≥ N, Je suis/Partenaire est demandeur, Atout = couleur.
- **Actions enchère** (7) : Passer, Annoncer N couleur, Capot, Contrer, Surcoincher,
  Réflexion (signal), Répéter couleur.
- **Actions carte** (4) : Jouer la plus forte, Défausser (faible), Couper (atout), Jouer un As.
- **Flux** (4) : Si/Sinon, ET, OU, Séquence.

### Canvas
- Glisser-déposer des blocs depuis la toolbox ; nœuds déplaçables à la souris.
- Chaque nœud : en-tête coloré (par catégorie), paramètres éditables (nombre, couleur),
  ports de sortie cliquables (oui/non).
- Connexions SVG (courbes de Bézier) entre ports, avec flèche directionnelle.
- Sélection, suppression (✕) de nœuds ; les connexions suivent le déplacement.

### Panneau droit
- **Spec** : sliders pour personnalité (agressivité/concentration/vélocité 0–10),
  seuils de contre/surcontre (0.00–1.00).
- **JSON** : aperçu live de l'AlgoSpec résultante + le workflow issu du canvas.

### Technique
- Page React pure, intégrée au projet (route /robot-editor, lien « Éditeur IA » dans la nav).
- Pas de dépendance externe (SVG natif pour les connexions, drag & drop navigateur).
- Les presets importent directement ALGO_CLASSIQUE / ALGO_AGRESSIF / DEFAULT_ALGO de belote-core.

### Architecture
- Document technique `docs/architecture-robots.md` (608 lignes) : schémas ASCII du flux
  AlgoSpec → RobotAlgorithm → Agent, couches 1 à 4, les 4 pilotes, extensibilité, fichiers de référence.

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.16.0 — Robot = individu autonome : façade Agent instanciable depuis une spec seule

Formalisation du robot comme INDIVIDU abstrait et portable, sans casser les 4 chemins (entraînement, compétition, live, démo).

- `Agent` (`packages/core/src/robot/Agent.ts`) : le robot vu comme un individu autonome. Encapsule son GÉNOME
  (AlgoSpec : données pures, versionné) + son CERVEAU résolu (RobotAlgorithm : fonction pure contexte→décision).
- `createAgent({ spec })` : point d'entrée UNIQUE. On instancie un individu depuis une spec SEULE — aucun moteur,
  aucun réseau. Le même Agent fonctionne à l'identique en LOCAL (front) et NON-LOCAL (back) : il ne dépend que du
  RobotContext (lecture seule), jamais d'une implémentation de jeu. Délègue les 4 décisions (bid/card/contre/surcontre).
- Architecture clarifiée : AlgoSpec (génome JSON) → createAgent → Agent (individu) → RobotAlgorithm (contrat
  observation→décision, déjà sans couplage moteur/réseau). Le registre d'algorithmes reste le point d'extension.
- Exporté depuis belote-core ; presets ALGO_CLASSIQUE / ALGO_AGRESSIF réutilisables.

Tests (5, autonomes — aucun moteur) : résolution du génome (preset), fusion défensive d'une spec partielle,
deux specs → deux individus distincts, DÉCISION d'enchère en isolation, DÉCISION de carte (renvoie une carte légale).
Total core : 27 tests. Vérifs : typecheck (4 paquets) + 39 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.15.0 — Refacto modulaire de la table (étape 1/2) : composants UI autonomes

Décomposition de GameTable (monolithe ~450 lignes) en composants INDÉPENDANTS, chacun dans son module
sous `web/src/table/parts/`, piloté par des props explicites (instanciable et testable seul) — sans changement visuel.

- `PlayerHand` : main d'un joueur (4 orientations, tri atout+couleurs alternées intégré, face visible/cachée,
  cartes jouables). Props : dir, cards, count, trump, faceDown, playableSet, interactive, overlap, onPlay.
- `TrickArea` : pli central + animation de ramassage vers le gagnant. Props : plays, south, winnerSeat, collectDir.
- `LastTrickPanel` : mini-récap « Dernier pli » (carte gagnante surlignée). Props : lastTrick.
- Baril `parts/index.ts` ; composants réexportés par le module table (réutilisables via @kanto-aplo/belote-table).
- GameTable devient un assembleur plus mince (452 → 397 lignes) ; helpers de tri déplacés dans PlayerHand.

Tests : `displaySort` (3 tests : atout en tête, couleurs alternées, ordre par défaut). Total front : 12 tests.
Vérifs : typecheck (4 paquets) + 34 tests + build app + build librairie + démo (vainqueur A) OK. Rendu identique.

À VENIR (étape 2/2) : extraction de PlayerSeat, BidPanel (enchère + signaux), ContreControls (contrer/surcontrer),
FeltSurface (tapis + atout), BidHistory (4 dernières annonces), TableToast — pour un GameTable purement assembleur.

## v5.14.0 — Mains de la table : calage stable (plus de dérive au fil des plis)

Correction d'affichage (CSS pur, aucun impact moteur/valeurs) :

- Les mains GAUCHE/DROITE étaient ancrées par leur BORD (left/right) puis tournées de 90°. Comme la rotation
  se fait autour du centre de la main, retirer des cartes faisait rétrécir la main ET glisser son centre vers
  le bord (« les cartes se rapprochent du bord » à chaque pli).
- Désormais les quatre mains sont ancrées par leur CENTRE (translate -50% sur l'axe concerné), donc elles
  restent CENTRÉES sur leur côté quelle que soit le nombre de cartes — aucune dérive, aucun déplacement.
- Taille des cartes inchangée (déjà fixe : 44×62, flex:0 0 auto). La responsivité reste assurée par la mise à
  l'échelle globale (TableStage), pas par la déformation des cartes.

Vérifs : typecheck (4 paquets) + 31 tests + build app OK.

Note : si une véritable DIMINUTION de taille de carte persiste (et pas seulement la dérive corrigée ici),
elle proviendrait d'un conteneur parent mis à l'échelle ou d'un build en cache — à confirmer avec une capture.

## v5.13.0 — Feuille de score : affichage corrigé (manche courante détaillée) + règles manuscrites

Refonte du composant d'affichage `ScoreView` (feuille « papier déchiré »), purement visuel :

- BUG CORRIGÉ : l'ancien mode « compact » global réduisait toutes les manches au dernier score dès qu'on
  dépassait 11 lignes (donc après la manche 1). Désormais : les manches TERMINÉES sont condensées à leur
  dernière ligne ; la manche EN COURS affiche TOUTES ses donnes (cumul ligne par ligne), pour chaque manche.
- Décompte de manches gagnées (ex. 1 – 1) affiché APRÈS CHAQUE manche terminée (calcul au fil de l'eau), pas
  seulement à la fin.
- Cellule VIDE quand une équipe ne marque rien sur une donne (style manuscrit) — on ne répète pas le cumul.
- Franchissement d'un millier : un TRAIT manuscrit dans la colonne au passage + une APOSTROPHE par millier sur
  toutes les lignes suivantes (1040 -> « 04' », 2040 -> « 04'' »). Les milliers ne sont plus écrits en clair.
- Affichage en dizaines conservé (950 -> « 95 »).

Tests : `fmtCumul` (3 tests, l'affichage milliers/apostrophes verrouillé). Front : 9 tests. Total projet : 31 tests.
Vérifs : typecheck (4 paquets) + 31 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.12.0 — Règles de score CORRIGÉES (vraies règles confirmées) + tests de référence

Le calcul de score (module pur `scoring/donneScoring.ts`) applique désormais les règles RÉELLES confirmées :

- Base 162 (152 cartes + 10 de der, der ajouté à l'équipe du dernier pli avant arrondi).
- Arrondi par équipe, 5 qui monte → total 160 OU 170 (« casse » = score finissant par 5/6/7).
- Belote (+20) UNIQUEMENT si annoncée ; compte pour valider le contrat ; si le camp qui l'a annoncée
  PERD (chute simple ou contre), les 20 passent à l'adversaire ; sinon personne ne les prend.
- SANS contre : contrat réussi → chaque équipe marque ses points arrondis ; contrat chuté → défense 160 FIXE, preneur 0.
- AVEC contre : camp gagnant 320 FIXE ; surcontre → 640 FIXE ; l'autre 0. La belote finit toujours chez le gagnant.
- Config : ajout de `contreWin: 320` et `surcontreWin: 640` (forfaits fixes).

Tests de référence (14, tous les exemples chiffrés confirmés) : 85/77→90/80 (casse), 94/68→90/70,
contrat exact (85 valide 90), 65+belote→90 vs 100, validation par belote, chute→160 fixe,
chute+belote→180, contre A réussit→320, contre A chute→320 défense, cas tordu (A+belote contré chute → B 340),
surcontre 640 (+20 belote → 660). Total moteur : 22 tests. Front : 6 tests. Tous verts.

Vérifs : typecheck (4 paquets) + 28 tests + build app + build librairie + démo (vainqueur A) OK.

À FAIRE (prochaine étape, décrite par Ameur, NON encore construite) : ICÔNE D'ANNONCE de la belote/rebelote
(annoncer ou non avant de jouer la carte, affichée à tous au même endroit que l'icône réflexion ; pas
d'annonce = pas de 20 ; belote annoncée → rebelote auto sur la 2e carte). Aujourd'hui le moteur détermine
encore `beloteTeam` par DÉTENTION (R+D d'atout joués), pas par ANNONCE — le module scoring est déjà prêt pour
le basculement vers l'annonce.

## v5.11.0 — Qualité : indépendance des modules + tests unitaires autonomes

### Tests unitaires indépendants (Vitest)
- Vitest installé + configuré (`packages/core/vitest.config.ts`, `web/vitest.config.ts`) ; scripts `test`
  par paquet et à la racine (`npm test`). Chaque test est autonome : aucun réseau, aucun backend.
- **Scoring** (`scoring/scoring.test.ts`, 11 tests) : barème atout/hors-atout, total 152, arrondi par équipe
  (5 qui monte, total 160 OU 170), contrat réussi/dedans, capot déclaré/non, contre ×2 / surcontre ×4, belote +20.
- **Moteur** (`engine/GameEngine.test.ts`, 8 tests) : signaux d'enchère (refus sans couleur ni répétition,
  couleur explicite affichée, réflexion refusée sur pass, répéter = couleur effective non affichée) et
  micro-phase surcontre (popup au seul camp preneur, partenaire du contreur sorti, 2 pass → contré joué,
  surcontre → clôt pour les deux).
- **Front** (`table/client/BeloteTableClient.test.ts`, 6 tests) : contrôleur testé avec un socket ENTIÈREMENT
  mocké — connexion, mises à jour de contexte, flux d'évènements + désabonnement, actions bid/play, journal
  borné, déconnexion. Zéro réseau.
- Total : 25 tests, tous verts.

### Indépendance des modules (audit + garanties)
- Audit serveur : AUCUN module n'importe le *service* d'un autre — uniquement des modèles (couplage de
  données normal) ; le couplage de comportement `game → analytics` passe par le bus d'évènements.
- Module table front : ne dépend que du design system + `belote-core` (vérifié).
- Scoring : isolé dans son module pur (v5.10), désormais couvert par des tests.

### Vérifs
- 25 tests OK ; typecheck (4 paquets) + build app + build librairie + démo (vainqueur A) OK.
- README : section « Tests & indépendance des modules ».

## v5.10.0 — Calcul du score isolé dans un module indépendant (extraction sûre)

But : rendre le calcul du score INDÉPENDANT et corrigible à un seul endroit, SANS changer les valeurs
(la correction des règles d'arrondi/contrat se fera ensemble, à tête reposée).

- Nouveau module pur `packages/core/src/scoring/` :
  - `donneScoring.ts` : `roundPoints(raw, roundTo)` et `scoreManche(input, config)` — fonctions PURES
    (entrée + barème -> résultat), extraites verbatim de ContreeRules (mêmes valeurs).
  - `index.ts` : point d'entrée unique du scoring — réexporte `cardValue`/`cardStrength` (barème cartes),
    `scoreManche`/`roundPoints` (donne), `computeReward` (récompenses), + les types d'E/S.
- `ContreeRules.roundPoints` et `ContreeRules.scoreManche` DÉLÈGUENT désormais au module pur
  (un seul endroit de vérité ; aucune logique dupliquée).
- `belote-core` exporte le module via `export * from './scoring'`.

Barème confirmé (inchangé) — atout : V20 9‑14 A11 10‑10 R4 D3 8/7‑0 ; hors‑atout : A11 10‑10 R4 D3 V2 9/8/7‑0 ;
cartes 152 + 10 de der = 162. Arrondi par équipe, 5 qui monte (total naturel 160 ou 170, jamais forcé).

Vérifs : barème + arrondi + une donne testés via le module isolé ; tous les typechecks (4 paquets)
+ build + démo (vainqueur A) OK — comportement identique à v5.9.0.

À FAIRE ENSEMBLE (noté, non traité) : confirmer/corriger les règles exactes (contrat réussi = points +
contrat ? dedans = 160 + contrat ? belote dans le contrat ? capot annoncé/non) — désormais à un seul endroit.

## v5.9.0 — Contre réflexe + micro-phase Surcontre (popup à deux, timer, hook robot)

### Moteur (belote-core) — nouvelle micro-phase `surcontre`
- Le CONTRE reste un réflexe hors-tour : le PREMIER adversaire qui contre VERROUILLE l'enchère ;
  son partenaire perd la main (et toute saisie en cours) et sort de la donne.
- Après un contre, on entre dans la phase `surcontre` : SEUL le camp preneur (les 2 sièges) décide
  Passer / Surcoincher ; le reste est figé. Deux pass → on joue le contré ; un surcontre → clôt pour les
  deux. Après surcontre, enchère close et l'Entame (firstBidderSeat) commence. Pas de « sur-surcontre ».
- `canSurcontre` refait (vrai uniquement en phase surcontre, pour un siège preneur en attente) ;
  reset propre par donne ; `EnginePhase` gagne `surcontre`.
- Hook robot `shouldSurcontrer(robot, view?, seat?)` : retourne `false` par défaut (point d'extension
  pour brancher une logique ou lire une règle depuis l'algoSpec). `robotAct` passe par défaut en surcontre.

### Pilotes — gestion de la phase surcontre
- Entraînement (`LocalTableEngine`), compétition (`competition.runner`), live (`liveGame`) : les robots du
  camp preneur décident via le hook (pass par défaut), les humains attendent.
- Live : timer de surcontre = `turnTimeoutMs` (démarré ensemble pour les deux sièges) → pass auto à
  l'expiration ; un surcontre clôt pour les deux. Ancienne « fenêtre surcoinche » supprimée.

### UI
- CONTRER : icône instantanée en bas du tapis à droite du joueur (pendant l'enchère) ; disparaît dès qu'on
  passe/monte ou qu'un adversaire a contré.
- SURCONTRER : popup dédiée Passer / Surcoincher pour le camp preneur, persistante tant que le joueur n'a
  pas tranché. Libellés de phase ajoutés (ScoreBoard, DevDock).

### Vérifs
- Scénario A/B/C/D validé bout en bout (contre de D → B sort → popup A&C → pass/pass ou surcontre).
- Régression de démo corrigée (robotAct gérait mal la nouvelle phase). Tous les typechecks (4 paquets)
  + build app + build librairie + démo (vainqueur A) OK.

## v5.8.0 — Module table autonome, responsive et publiable npm (refactoring MVC)

### Contrôleur (MVC) — toute la plomberie réseau encapsulée
- `BeloteTableClient({ socketUrl, apiUrl?, token?, tableId? })` : Socket.IO + REST derrière une interface propre,
  sans dépendance à window/localStorage/import.meta (réutilisable hors de l'app, en WebView, en test).
  - `getContext()` (statut, table, état de jeu, résultat), `on()` (flux d'évènements), `getLogs()` (journal borné),
    actions `bid()`/`play()`, cycle `connect`/`subscribe`/`unsubscribe`/`disconnect`.
  - Émet table:subscribe/unsubscribe/bid/play ; écoute tables:changed/table:update/table:game/table:finished.
- `Tables.tsx` REFACTORÉ pour consommer ce contrôleur (plus de plomberie socket inline dans la page).

### Vue autonome + responsive
- `BeloteTable` : vue connectée complète, rendue dans un `TableStage`.
- `TableStage` : taille de référence fixe mise à l'ÉCHELLE (transform: scale) → design préservé au pixel près,
  jamais réorganisé ; plein écran via la Fullscreen API.
- `StandaloneBeloteTable` : table jouable SANS backend (pilotée par LocalTableEngine) — test/démo.
  Route de démonstration ajoutée : /table-demo.
- `mountBeloteTable` / `mountStandaloneBeloteTable` : montage DOM en une ligne (+ unmount).

### Paquet npm `@kanto-aplo/belote-table`
- `packages/belote-table/` : package.json (exports + types + peerDeps react/react-dom + dep socket.io-client),
  déclarations `types.d.ts` auto-suffisantes, README technique complet.
- Build librairie : `npm --workspace belote-web run build:lib` (Vite lib mode) → dist/belote-table.js (ESM,
  React externe, core + design system inclus) + dist/belote-table.css. Feuille de styles importable séparément.

### Documentation
- `packages/belote-table/README.md` : installation, init par config, lecture du contexte, évènements, logs,
  actions + modèle d'annonce, responsivité/plein écran, build & publication, API exportée, contrat socket.

### Vérifs
- Le module ne dépend que du design system + belote-core (aucune dépendance « page »).
- Tous les typechecks (4 paquets) + build app + build librairie + démo moteur OK.

## v5.7.0 — Décomposition de la table en composants + couleurs d'enseigne + vocabulaire

### Table décomposée en composants autonomes (initialisables simplement)
- `LogoEspaceInfo` : contour = logo + 4 premières lettres du nom (joueur/robot).
- `JetonAnnonce` (HORS du contour) : jeton Donneur + jeton Entame (fixes la donne) + triangle vert Meneur
  (mobile, disparaît/bouge en premier). Position : à gauche du logo (haut/bas), au-dessus (gauche/droite).
- `AnnonceAnnonce` (HORS du contour) : Demande retenue + contré/surcontré PAR JOUEUR (icônes, jamais par équipe).
  Position : à droite du logo (haut/bas), en haut à droite (gauche/droite). Apparaît 2 s après le début du jeu
  (config `annonceDelayMs`, défaut 2000).
- `ContreeIcon` : bouton contré/surcontré du joueur, en bas du tapis à droite de son siège (remplace l'ancien bouton).
- La Console (`DevDock`) reste un composant indépendant, initialisé par `{ view, names, logs }` en entraînement.

### Couleurs d'enseigne — fondamental, partout
- ♥ ♦ en ROUGE, ♣ ♠ en NOIR (fini le monochrome/orange) dans la Demande, le panneau des annonces, l'atout.
- Une Demande montée sans renommer la couleur affiche l'enseigne de l'ATOUT (couleur effective) en vraie couleur.

### Popup d'annonce
- Nettement réduite (largeur ~−40%, hauteur très compacte) et remontée pour ne plus cacher les cartes.

### Vocabulaire figé (README)
- Donneur, Entame (= firstBidderSeat, devient Donneur la donne suivante), Meneur (triangle vert mobile),
  Donne, Pli, Manche, Partie, Demande, Réflexion/Répéter.

### Nettoyage
- Suppression du CSS et des composants morts (gt-chip/gt-dealer/gt-flags/gt-bid/gt-think, anciens boutons contre).
- Tous les typechecks (4 paquets) + build + démo OK.

## v5.6.0 — Signaux d'enchère : réflexion + répéter la couleur (propriétés du Bid)

### Modèle d'annonce (core)
- `Bid` gagne deux propriétés-signal : `reflexion` et `repeatPartnerSuit`.
- `PartieConfig.signals { reflexion, repeatSuit }` : signaux INITIALISÉS à la création de la table,
  transportés dans le contexte ; un signal désactivé est ignoré par le moteur. Lisibles par les robots
  (présents dans `view.bids`) pour servir d'indices configurables.

### Règles de validité (moteur) — « pas de signal sans monter la mise »
- Réfléchir ou répéter sur un PASS → refusé (influence interdite).
- Résolution de couleur (option A) : couleur explicitement nommée → affichée ; drapeau « répéter le
  coéquipier » → couleur du partenaire NON affichée (refusé s'il n'a pas encore nommé de couleur) ;
  ni l'un ni l'autre → refusé (le joueur doit choisir).
- Toute annonce doit rester strictement supérieure à l'enchère courante.

### Affichage (table)
- La couleur n'est affichée que si elle a été explicitement nommée (`saidSuit`) ; sinon seul le chiffre.
- 💭 affiché à côté de l'annonce uniquement APRÈS confirmation (plus jamais au simple clic sur l'icône).
- Notifications et panneau des 4 dernières annonces alignés sur ces règles.

### UI d'annonce
- Couleur optionnelle (plus de couleur par défaut) ; bascule « Répéter ♠ (coéquipier) » proposée seulement
  si le partenaire a déjà nommé une couleur ; bascule « 💭 Réflexion ».
- Confirmer = cliquer une valeur (désactivée tant qu'aucune couleur n'est choisie/répétée).
- Suppression de l'ancienne émote 💭 temps réel (et de son plomberie socket `table:think` côté serveur),
  remplacée par le signal porté par l'annonce.

### Plomberie
- Signaux passés à l'instanciation : front (TableConfig + LocalTableEngine), serveur (table.config + liveGame).
- Tous les typechecks (4 paquets) + build + démo OK ; scénario aa/bb vs cc/dd validé bout en bout.

## v5.5.0 — Fabrique de robot partagée (front = back) + README à jour

### Cohérence des robots front/back
- `packages/core` expose `robotFromFiche(fiche)` : FABRIQUE UNIQUE qui construit un robot prêt à jouer
  depuis sa fiche stockée (personnalité + algoSpec + temps). Déterministe.
- Le back (`competition.runner`, `liveGame.service`) ET le front (`Training`) passent désormais par cette
  même fabrique → un robot pense exactement de la même façon partout.
- Correction du défaut : l'entraînement (front) ignorait l'`algoSpec` (il ne passait que la personnalité) ;
  `RobotApiService.listMine()` ne renvoyait que `{id,name}`. L'API renvoie maintenant la FICHE COMPLÈTE
  (personnalité, responseTimeMs, maxPlayTimeMs, algoSpec) via le type `RobotListItem`.
- Rappel documenté : à mains identiques, jeu identique ; mais le RNG de distribution n'est pas seedé,
  donc les parties diffèrent (voulu).

### README
- Réécrit pour refléter l'architecture réelle : backend modulaire par domaine, fabrique de robot partagée,
  agrégat Game + replay froid + CQRS (ParticipationFact, rebuild), module compétition, file de jobs.
- Limites connues mises à jour (in-process bus/queue → BullMQ v7, récompenses non atomiques/partielles).

## v5.4.0 — Module Compétition de robots (jeu 100% backend, file de jobs)

### Nouveau module autonome `competition` (futur micro-service v7)
Affrontements robots-vs-robots joués entièrement côté serveur ; l'utilisateur ne fait que consulter.
- `competition.model` : CompetitionTable, cycle open → running → finished (ou cancelled).
  Équipe A = 2 robots du créateur (sièges 0,2) ; équipe B = 2 robots du challenger (sièges 1,3).
- `competition.runner` : runner HEADLESS — joue la partie à fond sans délai ni humain, puis persiste
  via le pipeline standard (agrégat Game + replay froid + projection analytique des robots).
- `competition.service` : create / listOpen / listMine / getById / join / cancel + worker de file + reprise.
  - Règles : max 2 tables actives par utilisateur ; robots possédés et distincts ; publique par défaut.
  - join() met le match en FILE et rend la main immédiatement ; le jeu tourne en arrière-plan.
- `core/jobQueue` : file in-process à concurrence bornée, non bloquante, prête à passer en BullMQ (v7).
- Reprise au démarrage : les matches `running` sans partie sont ré-enfilés (pas de perte sur crash).
- Endpoints : POST /api/competitions, GET /api/competitions, GET /api/competitions/mine,
  GET /api/competitions/:id, POST /api/competitions/:id/join, POST /api/competitions/:id/cancel.
- Socket : `competitions:changed` pour rafraîchir la liste sans polling.

### Frontend
- Page Compétition : créer une table (2 robots, publique), rejoindre une table ouverte (2 robots),
  suivre « Mes compétitions » (statut En attente / En cours / Terminée + score & vainqueur).
- CompetitionApiService ; route /competitions + entrée de navigation.

### Divers
- Game.mode accepte `competition` ; persistFinishedGame accepte tableId null (partie sans table live).
- Démarrage serveur : base connectée AVANT les tâches de fond (reprise fiable).
- Tous les typechecks (4 paquets) + build + démo OK.

## v5.3.0 — Replay froid séparé, projection asynchrone découplée, rebuild réel

Corrige les défauts 1, 2 et 3 signalés, en gardant le Game en UN SEUL document.

### (3) Document Game borné — replay sorti dans une collection froide
- `GameReplay` : collection 1:1 (même `_id` que le Game) contenant le gros `replay` + `logs`.
- L'agrégat Game ne contient plus que métadonnées + participants[] + manches[] (résumé) → petit, rapide à lister/charger.
- Ordre d'écriture : replay FROID d'abord, agrégat Game ensuite = POINT DE COMMIT (un Game ⇒ son replay existe ; un replay orphelin est inoffensif).
- Rejeu : le replay est chargé à la demande et rattaché par getById (compat client inchangée).

### (1) Projection vraiment asynchrone et découplée
- `core/eventBus` : bus d'événements de domaine in-process, distribution non bloquante (setImmediate), contrat prêt à être remplacé par BullMQ sans toucher aux modules.
- La persistance publie `game.finished` au lieu d'appeler la projection → `game` ne dépend plus d'`analytics` (vrai découplage).
- Le module `analytics` s'abonne via startBackgroundTasks ; la projection s'exécute hors chemin critique.

### (2) Source de vérité unique + rebuild réel
- `Game.projection { status: pending|done|failed, version, at }` → dérive détectable.
- `gameProjectionService.projectGame(gameId)` lit Game + GameReplay : MÊME code pour le live ET le rebuild → « reconstructible » devient réel.
- `rebuildOutdated()` reconstruit les projections manquantes/obsolètes ; endpoint POST /api/analytics/rebuild.
- L'échec de projection marque le statut et n'altère jamais la source de vérité.

### Effet
- Le document Game ne grossit plus avec le déroulé ; les listes ne chargent plus le replay.
- Fin de partie : la réponse ne dépend plus de la projection (publiée, traitée au tick suivant).
- Cohérence analytique vérifiable et rejouable à tout moment.
- Tous les typechecks (4 paquets) + build + démo OK ; bus d'événements validé non bloquant.

## v5.2.0 — Persistance idiomatique MongoDB : agrégat + CQRS

### Correction architecturale majeure
Le modèle « relationnel sur base documentaire » (collections Manche / MancheParticipant /
GameParticipant + jointures manuelles + ~14 écritures par partie) est remplacé par l'idiome
MongoDB correct, sans rien sacrifier au besoin d'analyse :

**Opérationnel (source de vérité) — l'agrégat Game**
- Game devient un AGRÉGAT : `participants[]` et `manches[]` EMBARQUÉS + `replay`.
- Persistance en UNE écriture atomique (single-document) → pas de transaction, zéro orphelin.
- Rejeu = UNE lecture. `Session` et `Table` restent des RÉFÉRENCES (cycle de vie indépendant).
- Collections supprimées : Manche, MancheParticipant, GameParticipant (désormais embarquées).

**Analytique (lecture) — module `analytics` (CQRS)**
- `ParticipationFact` : modèle de LECTURE plat et dénormalisé (granularité donne × siège),
  append-only, indexé pour l'agrégation (par robot/joueur, par preneur). Aucune jointure.
- `gameProjectionService` : projette l'agrégat Game en faits (idempotent, rebuildable). En prod :
  à déclencher via file (BullMQ) hors chemin critique ; un échec n'altère jamais la source de vérité.
- `analyticsService` : stats rapides (winRate, taux de réussite comme preneur, perf par atout)
  via pipeline d'agrégation sur le modèle de lecture.
- Endpoints : GET /api/analytics/me, GET /api/analytics/robots/:id.
- Module autonome : si on le retire, les parties continuent d'être persistées (on perd seulement les stats).

### Effet
- Chemin chaud de fin de partie : 1 écriture (agrégat) au lieu de ~14.
- La « table de liaison » manche↔joueur existe toujours — mais à sa juste place : côté LECTURE.
- Tous les typechecks (4 paquets) + build + démo OK ; contrat de projection validé bout en bout.

## v5.1.0 — Table : jeton donneur, popup unique, icônes d'enchère, 💭 propre

### Moteur
- view() expose `dealer` et `firstBidderSeat` (premier annonceur, sens de jeu pris en compte).

### Design system (composants de la table, configurables/affichables selon la table)
- `ds/table/DealerToken` : jeton « D » type jeton de casino, coloré par équipe (doré A / rouge B).
- `ds/table/EmotionIcon` : pictogrammes victoire (vert) / frustration (orange) / défaite (bleu).
- `ds/table/BidActionIcon` : pastilles rondes passe (—) / contrée (✕) / surcontrée (✕✕) / capot (couronne), fidèles aux maquettes.
- `ds/feedback/TableMessage` : popup de message UNIQUE et réutilisable (même composant pour message inter-manche ET fin de partie), avec EmotionIcon + compte à rebours optionnel.
- tokens : ajout de `--pink` (surcontrée) et `--gold` (capot).

### Table (GameTable)
- Jeton donneur affiché devant le PREMIER ANNONCEUR pendant l'enchère.
- Émote 💭 : visible uniquement si le joueur n'a pas passé ; bouton désactivé et bulle masquée sinon (la mienne comme celle des autres).
- Icônes contrée/surcontrée des sièges via BidActionIcon (au lieu de ✕ texte).
- Boutons d'annonce (capot/passe) ornés de leur pastille.
- Boutons Coincher/Surcoincher déplacés À CÔTÉ du joueur (juste au-dessus du siège sud), couleurs contrée/surcontrée.
- Popups inter-manche et fin de partie unifiés sur TableMessage (suppression de gt-mpop/gt-ico).

## v5.0.0 — Architecture modulaire par domaine + modele relationnel

### Backend — modules autonomes (plus de structure par couche technique)
Chaque domaine = un dossier complet et ajoutable/supprimable en UNE ligne du registre :
- modules/auth, user, team, invitation, robot, table, game
- chaque module : .model.ts + .service.ts + .controller.ts + .routes.ts + index.ts (+ .socket.ts pour table).
- core/ : AppModule (contrat de module), environment, database, logger, HttpError, asyncHandler.
- shared/ : authentication (JWT), socketAuthentication, levels.
- app.ts : assemble les modules via le registre (REST + WebSocket + taches de fond).
- Ajouter un module = 1 import + 1 ligne dans modules/index.ts.

### Modele de donnees RELATIONNEL (decompose pour l'analyse/prediction)
- Table 1-N Session ; Session 1-1 Game ; Game 1-N Manche.
- Game N-N participants via GameParticipant ; Manche N-N participants via MancheParticipant (liaison).
- MancheParticipant porte seatIndex, team, type (human/robot), wasSubstitute -> base pour les stats.
- Modeles InferSchemaType (typage fort des attributs).

### Frontend — la TABLE est un vrai module reutilisable
- web/src/table/ : module autonome instanciable avec un contexte JSON.
  - TableConfig.model.ts : DEFAULT_TABLE_CONFIG + buildTableConfig (tout le parametrable).
  - LocalTableEngine.ts : pilote local (entrainement, IA vs IA, demo) sans reseau.
  - views/ : GameTable, TableSurface, ScoreView, DevDock.
  - index.ts : expose le module (utilisable pour entrainement, salles, competitions, events).
- models/ + services/ (ApiService, SocketService, TableApiService, RobotApiService).
- /rooms -> /tables ; events websocket room:* -> table:*.

### Nettoyage
- Suppression de l'ancienne structure plate ET de l'ancienne structure par couche (controllers/, services/, routes/ globaux).
- Composants front morts supprimes (Cards, AnnounceStream, LogConsole de components/).
- Tous les typechecks (4 paquets) + build + demo OK. Aucune regression.

## v4.0.0 — Refactoring MVC complet

### Backend — architecture MVC stricte
- **models/** : 1 fichier par collection (User, Team, Robot, Game, Invitation, Room) + index.
- **services/** : 9 services (Auth, Robot, User, Team, Invitation, Game, Room, RoomGame, Eligibility) — toute logique metier isolee.
- **controllers/** : 7 controllers (Auth, Robot, User, Team, Invitation, Game, Room) — orchestration requete/reponse.
- **routes/** : 8 fichiers de routes (auth, robot, team, invitation, user, game, room) + index agrege.
- **middleware/** : authentication.ts (JWT), httpLogger.ts.
- **websocket/** : socketAuthentication.ts, roomSocketHandler.ts — separation nette API REST / WebSocket.
- **config/** : environment.ts, database.ts.
- **utils/** : logger.ts, serializers.ts (publicUser, serializeRoom, createEmptySeats, computePlayerLevel).
- Variables nommees explicitement (roomDocument, userDocument, errorMessage, filledSeatCount...).

### Frontend — MVC
- **models/** : User.model.ts, Room.model.ts, Robot.model.ts, GameState.model.ts — interfaces typees.
- **services/** : ApiService.ts, SocketService.ts, RoomApiService.ts, RobotApiService.ts.
- **Rooms.tsx** reecrit : noms explicites, imports depuis models/services, zero variable a une lettre.
- **state.tsx** reecrit : importe User depuis le modele.
- lib/api.ts et lib/socket.ts deviennent des wrappers (backward compat).

### Nettoyage
- Fichiers plats supprimes (models.ts, routes.ts, rooms.ts, roomGame.ts, auth.ts, config.ts, db.ts, logger.ts, socketAuth.ts, eligibility.ts, realtime.ts).
- Aucune regression : tous les typechecks passent, build + demo OK.

## v3.7.0 — Unification des tables + reconnexion + emote
- **Un seul chemin de table** : le hub legacy en memoire (realtime.ts) est supprime ;
  /lobby et /table/:id redirigent vers /rooms. L'auth WebSocket est extraite dans
  socketAuth.ts (les salles en dependent). Bundle front allege.
- **Reconnexion** : un joueur qui (re)rejoint une salle en cours recoit immediatement
  l'etat de jeu (sa main + coups legaux) via room:subscribe -> reemission ; il reprend
  sa place laissee au robot de secours.
- **Emote reflexion en multijoueur** : la bulle 💭 est desormais diffusee aux autres
  (room:think -> bulle sur le siege concerne, 1 s), uniquement si le joueur n'a pas passe.
- Pages legacy Lobby/OnlineTable retirees.

## v3.6.1 — Polish du flux d'annonce
- **Fenetre de surcoinche** : apres un contre, le pilote live laisse ~3,5 s a l'equipe
  contree pour **surcoincher** avant la 1re carte (evenement room:contre + bouton maintenu).
- **Bug popup/debut de manche corrige** : la pause de fin de manche est calee sur le chrono
  de la popup (~5 s) cote salles **et** entrainement — le jeu ne reprend plus avant la fin
  de la popup. (Pause de manche non acceleree par la vitesse en entrainement.)
- Entrainement : reponse robot a l'annonce fixee a **700 ms** (alignee sur le live).

## v3.6.0 — Moteur : capot & fenetre de contre
- **Capot qui clot l'enchere** : annoncer un capot (action 'capot' + couleur) **verrouille
  immediatement** le contrat (impossible a contrer) et lance le jeu. Capot **declare**
  desormais transmis au score (500 si reussi, sinon contrat 250 -> dedans probable).
- **Fenetre de contre hors-tour, sensible au sens de jeu** : un defenseur peut **coincher**
  tant que ni lui ni son partenaire n'ont passe depuis l'annonce — l'**historique des passes
  encode le sens** (A->B->C->D ou inverse) sans logique gauche/droite en dur. Le contre
  **verrouille l'enchere** ; l'equipe contree peut **surcoincher** jusqu'a la 1re carte.
- Le moteur expose view.contreSeats / view.surcontreSeats ; l'UI affiche Coincher/Surcoincher
  d'apres le moteur (plus d'heuristique cote front).
- Le pilote live accepte la coinche/surcoinche **hors-tour** ; l'Entrainement aussi.

## v3.5.0 — Interface d'annonce centrale + correctifs table
- **UI d'annonce centrale** (au milieu de la table) : sélecteur de couleur (icônes),
  chips de valeurs **90 → 180** (désactivées sous le minimum), **Capot**, **Passe**, et
  icône **réflexion** (💭, affichée 1 s près du siège, désactivée si déjà passé). Remplace
  l'ancienne `BiddingBar`. Même registre visuel que les notifications.
- **Coincher / Surcoincher** : bouton **près du siège** (hors interface d'annonce), visible
  seulement quand l'équipe **adverse** a l'annonce en cours ; après un contre, le bouton
  devient **Surcoincher** pour l'équipe contrée.
- **Tri de la main** : **atout à gauche** (fort → faible), puis couleurs **alternées**
  (atout noir → noir/rouge/noir/rouge ; atout rouge → rouge/noir/rouge/noir).
- **Robot : réponse à l'annonce fixée à 700 ms** (non modifiable par l'utilisateur).
- **Bug corrigé : cartes qui rétrécissent** — les emplacements du pli étaient réutilisés
  par React (animation `scale` persistante) ; ils sont maintenant **clés par identité de
  carte**.
- Atout central déjà rendu transparent/configurable (v3.4.0) pour ne plus masquer les cartes.

## v3.4.0 — Robot remplaçant, éligibilité, raffinements table
- **Plus de partie bloquée** : si un humain ne joue pas (ou quitte), un **robot de
  secours** joue à sa place après un délai **configurable** (`settings.turnTimeoutMs`,
  défaut **10 s**). Il s'appuie sur le contexte (preneur, atout, score, dernier pli) ;
  l'humain **reprend la main** dès qu'il rejoue. Événement `room:substitute` émis.
- **Classe d'éligibilité** (`PlayEligibility`) — point d'extension unique qui renverra
  plus tard l'autorisation de jouer ensemble (type de table, historique entre joueurs,
  IP/device, anti-triche en compétition…). **Renvoie `true` pour l'instant**, déjà
  consultée à la prise de siège humain.
- **Atout central plus discret** : opacité abaissée et **configurable** (`atoutGlyphOpacity`,
  défaut 0.06) pour ne plus masquer la couleur des cartes.
- **Notifications d'annonce** déplacées **en haut à droite** ; nouveau panneau **en bas à
  gauche** listant les **4 dernières annonces** (avec atout pris et étiquette « nous /
  adversaire »), qui ne disparaît qu'**après la première carte jouée**.

## v3.3.1 — Correctifs salles : démarrage & robots
- **Bug corrigé : la partie ne démarrait pas.** `GET /robots` renvoyait `_id` (pas `id`),
  donc l'identifiant de robot était vide côté front : impossible d'asseoir un robot → les
  4 places ne se remplissaient jamais. Mapping corrigé (`_id`). Cela règle aussi le
  **warning React « unique key »** (clés `undefined`).
- **Démarrage automatique** : dès que les 4 sièges sont occupés, la partie se lance
  automatiquement après 3 s (plus besoin du bouton). UI mise à jour (compte à rebours).

## v3.3.0 — Pont salle ⇄ moteur live
- **Les salles persistées jouent vraiment** : au démarrage (après le compte à rebours
  de 3 s), le serveur construit le moteur depuis les sièges de la salle, pilote les
  robots, attend les coups humains, et **diffuse l'état de jeu sur le canal `room:{id}`**
  (chaque humain reçoit sa main + ses coups légaux ; les spectateurs voient tout).
- **Coups humains en WebSocket** : `room:bid` / `room:play` validés côté moteur.
- **Persistance de fin de partie** : la partie est enregistrée (replay + logs, visibilité
  héritée du groupe), la salle passe en `finished` avec un lien vers la partie, et les
  **points de récompense + parties jouées** sont mis à jour par joueur (via `computeReward`).
- **Front Salles** : rend la **table live** (thème `cosmos`) dès que la partie démarre,
  jouable par les humains, avec écran de fin.

## v3.2.0 — Salles persistantes, table configurable, base testable sans Docker
- **MongoDB en mémoire** (test sans Docker) : `MONGO_URI=memory` (ou `USE_MEMORY_DB=1`)
  démarre une base éphémère **auto-seedée**. Config durcie : une `MONGO_URI` vide/invalide
  est ignorée (fini l'erreur « Invalid scheme »).
- **Logger structuré** (niveaux, scope, horodatage) utilisé par HTTP, base et salles ;
  log HTTP par requête (méthode, statut, durée).
- **Modèle de salles persistant** (`Room`) propre et indexé : statut
  `lobby · playing · finished · draft`, `ownerType` user/équipe, visibilité, `settings`,
  4 sièges typés (vide/humain/robot), `lastActivityAt`. Index composés pour le listing.
- **Cycle de vie des salles** (REST + temps réel) : créer (perso ou équipe), lister
  (visibles seulement), prendre/changer de place, **basculer humain ⇄ robot** (diffusé en
  direct via WebSocket `room:update`), quitter ; **tout le monde part → draft** (conservée,
  non listée) ; **inactivité > 5 min → draft** (balayage périodique) ; démarrage à 4 joueurs
  avec **compte à rebours de 3 s**. Invariants robots respectés (pas deux fois, pas adversaires
  entre robots d'un même proprio).
- **Page Salles** (front) : création perso/équipe + public/privé, liste live, sièges en
  direct (m'asseoir / asseoir un robot / quitter / démarrer).
- **Table = module pleinement configurable** : `TableConfig` étendu + **thèmes de tapis**
  (`classic`, `cosmos`, `olympus` — clin d'œil astronomie/Grèce KANTO APLO).

## v3.1.1 — Réglages fins de la table
- **Feuille de score** refondue en composant autonome `ScoreView` : **5× plus étroite**,
  **papier déchiré** (déchirure propre à chaque partie, dérivée d'une graine = l'ID de
  partie au rejeu), **écriture minuscule** au stylo bleu, traits de séparation **tracés
  « à la main »** (non alignés). En-tête `A  B` seulement, scores **en dizaines sur 2
  chiffres** (150→`15`, 60→`06`), manches au format **`1 – 0`**. Mode compact quand elle
  s'allonge. Accepte aussi des **messages** libres.
- **Cartes uniformisées** : tous les joueurs (4 robots, 3 robots + humain, etc.) ont des
  cartes de **même taille**, **~30 % plus petites**.
- **Coinche / surcoinche en icônes** (✕ orange / ⊗ rouge) au lieu de texte, avec le nom
  en infobulle.
- **Notification d'annonce** : remplacée immédiatement à chaque nouvelle annonce ; la
  dernière disparaît après un délai **configurable** (`notifyMs`, défaut **5000 ms**).
- **Table = composant configurable côté design** : `TableConfig` étendu (feutre, bordure,
  rayon, feuille on/off, atout aux coins, `notifyMs`, graine + messages de la feuille).

## v3.1.0 — GameTable enrichie & configurable
- **Composant `GameTable` indépendant et thématisable** (prop `config` : fond du tapis,
  bordure, rayon, feuille de score, atout aux coins) — réutilisable tel quel dans
  d'autres modules/modes/compétitions.
- **Les 4 joueurs sur le tapis** : mains face cachée pour les adversaires (face visible
  en observation/rejeu), plus de compteur de cartes.
- **Sièges** : logo + nom uniquement ; la **demande** du preneur (valeur + couleur)
  s'affiche sur lui ; **contre** = croix orange sur l'équipe contrée + tag « a contré »
  sur l'auteur ; en cas de **surcontre** les icônes passent au **rouge** + tag
  « a surcontré ».
- **Atout au centre ET dans les 4 coins**.
- **Premier joueur du pli** mis en avant (icône ▶ + anneau cyan animé) ; à la prise,
  **les cartes s'animent vers le gagnant**, qui devient le meneur du pli suivant.
- **Dernier pli** en mini-panneau (~¼ de la taille) en haut à gauche.
- **Feuille de score manuscrite** (style cahier de café, stylo bleu, police Caveat) :
  cumul par donne en deux colonnes A | B, ligne de manche gagnée (1/0), **mode compact**
  quand elle s'allonge (totaux de manche + cumul courant), sans recouvrir les cartes.
- **Popup de fin de manche** (équipe gagnante) avec **chrono de 5 s** avant la suivante.
- **Notifications dans la table** (x passe / annonce / contre / surcontre).

## v3.0.0 — CRUD social complet + front aligné sur le kit
- **Serveur — CRUD complet** : équipes (créer, détail, modifier, classement, quitter)
  avec **visibilité publique/privée** ; **invitations** par nom d'utilisateur, e-mail
  ou identifiant → l'invité **accepte / refuse**, sinon l'invitation reste **en attente** ;
  **profils** publics (niveau dérivé des points, parties jouées, score, équipe) ; **fiche
  robot** consultable (y compris celui d'un adversaire) ; **stats** mises à jour à chaque
  partie.
- **Visibilité des parties héritée du groupe** : groupe public → parties **publiques**,
  groupe privé → parties **privées** (visibles des seuls membres). **Sauvegarde
  automatique** par défaut en fin de partie (entraînement et autres modes).
- **Front — page Équipe complète** (composants du kit) : créer une équipe + bascule
  public/privé, inviter par identifiant, voir membres (clic → profil), invitations reçues
  (accepter/refuser) et envoyées (en attente), classement, quitter.
- **Popup de profil** (`ProfileDialog`, modale du kit) : joueur (niveau, parties, score,
  robots) et robot (personnalité, algo, propriétaire).
- **Alignement kit** : Entraînement, Table en ligne et Rejeu sur le layout flagship
  (`layout-game`) avec la console à onglets `DevDock` ; familles `core`, `forms`,
  `feedback`, `devtools` du kit intégrées dans `web/src/ds/`.
- **Seed** enrichi : e-mails, équipe publique « Les Atouts », invitation en attente
  (ameur → sofia), stats, partie publique de démo. Comptes : `ameur` / `invite` / `sofia`
  (mot de passe `belote123`).

## v2.3.0 — Console façon inspecteur Chrome + layout flagship
- **Console « inspecteur »** (`DevDock`) : panneau à **onglets** (Console · Annonces ·
  État), **repliable/masquable** d'un clic (chevron), façon DevTools Chrome. L'onglet
  Console utilise ton `LogConsole` (niveaux filtrables), Annonces ton `AnnounceStream`,
  et État inspecte le moteur en direct (phase, tour, atout, contrat, preneur, contre,
  scores, objectif, sens).
- **Layout flagship** inspiré de ton HTML (`GameScreen`) : `layout-game` = tapis 2/3 +
  dock 1/3 ; le tapis remplit la colonne, la main passe en grand format, et ta
  `ControlBar` (pause / pas-à-pas / vitesse / délais) remplace mes contrôles maison.
- **Kit complété dans l'app** : familles `core`, `forms`, `devtools` copiées dans
  `web/src/ds/` ; mapping des logs moteur (`LogEntry`) vers le format du kit.

## v2.2.0 — Composants du kit design system sur la table
- **Table de jeu recâblée sur tes composants** : `TableFelt`, `PlayingCard`,
  `ScoreBoard`, `TeamBadge`, `BidBadge` du kit remplacent mes composants maison
  (copiés dans `web/src/ds/`, typés via les `.d.ts` fournis). Le tapis, les cartes
  (face/dos, jouable, gagnante), le bandeau de score, les identicons d'équipe et les
  badges d'enchère sont désormais ceux de tes maquettes.
- **Mapping propre core ↔ kit** : couleurs FR↔EN (cœur↔hearts, carreau↔diamonds,
  pique↔spades, trèfle↔clubs), sièges→directions (joueur au sud), couleurs d'équipe
  HSL **calculées** depuis le nom (`teamColor`) et relayées par `--team-*`.
- **Mains révélées** en entraînement/rejeu (fans face visible autour du tapis) ;
  **main interactive** en bas pour le joueur en ligne (cartes jouables surlignées).
- `allowJs` activé côté web pour consommer les `.jsx` du kit sans rien réécrire ;
  le reste de l'app continue d'hériter des tokens (v2.1.0).

## v2.1.0 — Design system « Contrée » + valeurs configurables + algo en workflow
- **Design system intégré** : tes tokens (`design-tokens.css`, fonts Chakra Petch /
  Manrope / JetBrains Mono, `animations.css`) sont importés et l'app existante les
  consomme via un pont — palette or « atout » + cyan esport, tapis feutré, cartes,
  console et badges aux couleurs du système ; couleurs d'équipe **calculées** (HSL
  depuis le nom), jamais en dur. Le design system complet est rangé dans `design-system/`.
- **Valeurs statiques sorties** dans `RulesConfig` (un seul endroit) : enchère min/max,
  arrondi, belote (+20), dix de der (+10), **capot 250/500**, contre ×2 / surcontre ×4,
  base du dedans (160), **objectifs de manche 1500/2000**. On clone la config pour une
  variante maison, sans toucher au reste.
- **Algo robot = WORKFLOW de fonctions** : chaque décision (enchère / carte / contre /
  surcontre) est un **pipeline d'étapes pures** (`steps.ts`) qui analysent le jeu et
  affinent un « brouillon » avant de passer la main. Le pipeline est décrit en **JSON**
  (`AlgoSpec.workflow`), donc clonable et extensible : nouvel algo = nouvelle liste
  d'étapes (ou ses propres étapes enregistrées). Résolu automatiquement en
  `WorkflowAlgorithm`. Les robots contrent via ce pipeline.

## v2.0.0 — Architecture clean & algo robot abstrait
Refonte de fond, sans casser le jeu local (toujours jouable immédiatement).
- **Algorithme de robot entièrement abstrait** : nouveau contrat `RobotAlgorithm`
  (`decideBid`, `decideCard`, `shouldContre`, `shouldSurcontre`) qui ne voit qu'un
  `RobotContext` en lecture seule (coups légaux, demandeur, atouts joués/restants/non
  vus, enchères, pli…). Chaque robot pointe vers une `AlgoSpec` (JSON) résolue par un
  **registre** (`SpecAlgorithm` par défaut, algos custom enregistrables). Les robots
  **contrent et surcontrent** désormais selon des seuils paramétrés par la spec.
- **Couche application (clean / hexagonale)** : nouveau paquet `packages/application`
  avec **ports** (interfaces : UserRepository, TeamRepository, RobotRepository,
  GameRepository, IdGenerator, Clock…), **use cases** (createRobot, createTeam,
  joinTeam, listTeamsRanked, searchPlayers, saveGame, getGameForUser, listGames),
  un **TableService** portant les invariants (pas deux salles, pas deux robots du
  même proprio en adversaires), un **GameSession** d'orchestration réutilisable, et
  des **adapters mémoire** interchangeables avec Mongo.
- **Réutilisable par tout front JS/TS** : une démo (`packages/application/demo`) joue
  une partie complète **sans serveur ni base** — même couche pour le web et le futur mobile.
- Le cœur `belote-core` reste **pur** (aucun framework). Le serveur Express et le front
  React deviennent de simples consommateurs.

## v0.6.0 — Algo en JSON, équipes, règles métier
- Correction du bug du capot (250 au preneur, plus à l'adverse).
- Algo des robots décrit en JSON (AlgoSpec) ; équipes (créer/rejoindre/classement) ;
  règles robots (pas deux tables, pas adversaires entre robots du même joueur,
  hors‑ligne, représentant) ; recherche de joueurs ; visibilité des parties.

## v0.5.0 — Popup, tri, sens de jeu, flux d'annonces
- Popup du preneur ; cumul après chaque pli ; tri des mains (atout devant) ;
  sens du jeu configurable ; flux des annonces coloré par équipe.

## v0.4.0 — Scores temps réel & identité d'équipe
- Tableau de bord par équipe ; identicons façon GitHub ; écran récap de fin de
  partie ; édition des robots.

## v0.3.0 — Affichage du jeu
- Ramassage du pli en deux temps ; panneau « pli précédent » ; badges et icônes ;
  contrôles de lecture (pause, vitesses, délais).

## v0.2.0 — Fixtures & correction base
- Fixtures (comptes, robots, partie de démo) ; correction du `.env` non lu (dotenv).

## v0.1.0 — Première version
- Monorepo complet : moteur partagé, backend Node + MongoDB + WebSocket, front React,
  documentation API.
