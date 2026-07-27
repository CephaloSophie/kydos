# Application mobile — architecture et intégration

Ce document décrit précisément **l'application mobile** (`mobile/`), séparée
du web. Elle est fidèle au design system livré par Claude Design
(`Kydos_Belote_Design_System_Complet.zip`) — les CSS du DS sont copiés verbatim.

## 1. Arborescence

```
mobile/
├── package.json          # workspace belote-mobile
├── tsconfig.json         # strict, paths @table-pixi + belote-core
├── vite.config.ts        # base './' pour Capacitor (file://)
├── index.html            # <div id="viewport"> + orient-guard du DS
├── capacitor.config.ts   # config Capacitor (appId, webDir=dist, paysage)
├── capacitor/
│   └── README.md         # étapes de build Capacitor (Android/iOS)
└── src/
    ├── main.tsx          # COMPOSITION ROOT (injection de dépendances)
    ├── css/              # tokens.css / base.css / components.css (verbatim du DS)
    ├── core/             # dom.ts, EventBus, Store, Router (portés du DS en TS)
    ├── domain/
    │   ├── entities/Robot.ts + tests
    │   └── usecases/RobotService.ts
    ├── data/
    │   ├── ApiClient.ts  # client HTTP du backend
    │   ├── RobotRepository.ts # implémente IRobotRepository via l'API
    │   └── i18n.ts
    ├── services/
    │   ├── dailyTokens.ts + tests
    │   └── gameLoop.ts + tests
    └── presentation/
        ├── context.ts
        ├── components/   # ui.ts (Robot, Button, Slider, Dialog…), TopBar
        └── screens/      # Login, Home, Robots, CreateRobot, Ranking, Compet,
                          # History, About, Table, Replay
```

## 2. Clean architecture

Les dépendances sont dirigées **vers l'intérieur** :

```
core (dom, Router, Store) ◀── data ◀── domain ◀── presentation
                                          ▲
                                          └── services (dailyTokens, gameLoop)
```

- `presentation/` importe `domain/` et `data/`, jamais l'inverse.
- `domain/` définit `IRobotRepository` (interface) ; `data/` fournit
  l'implémentation via l'API.
- `main.tsx` est le SEUL endroit où les couches se rencontrent
  (composition root, injection de dépendances).

## 3. Table Pixi — emplacement réservé du DS

Le design system a explicitement **réservé un slot** sur l'écran de table :
`<div id="game-table-mount">`. On y monte le composant Pixi réutilisable via
React (`createRoot(mount).render(createElement(PixiTable, …))`), avec les props :

- `view`, `hands`, `names`, `mySeat`, `legal` (état moteur)
- `onBid`, `onPlay`, `onBeloteToggle` (interactions)
- `opponentCards: 'back' | 'faceup'` (visibilité adverse)
- `showMenu`, `showScoreSheet`, `forceLandscape: false` (la garde
  d'orientation est déjà gérée par l'app mobile elle-même)

En mode « jouer », la main du COÉQUIPIER reste dos même quand
`opponentCards: 'faceup'` (règle de PixiTable, siège relatif 2).

## 4. Robots — pont entre l'éditeur mobile et le moteur

Le moteur (`belote-core`) utilise une personnalité 1–10 :
`{ aggressiveness, concentration, velocity }`.

L'éditeur mobile utilise 4 curseurs 0–100 :
`{ aggro, risk, bluff, memoire }`.

Le mapping (fichier `domain/entities/Robot.ts`) est **fixe et testé** :

| Curseur mobile (0–100) | Personnalité moteur (1–10) |
| --- | --- |
| `aggro` | `aggressiveness` |
| `memoire` | `concentration` |
| `risk` | `velocity` |
| `bluff` | *(présentationnel, jamais injecté)* |

Le serveur stocke les deux : `personality` (moteur) + `mobile.strategy`
(présentation). Ainsi les robots créés par l'ancien web restent lisibles :
la vue mobile reconstruit les curseurs depuis `personality` par le mapping
inverse (voir `personalityToStrategy`).

**Garantie testée** : `bluff` peut varier de 0 à 100 sans que
`strategyToPersonality` ne change son résultat.

## 5. Authentification

`ApiClient` gère un jeton JWT stocké dans `localStorage.kydos.mobile.token`.
Le routeur applique une garde (`meta.auth: false` = route publique) : sans
jeton, toute route protégée renvoie sur `#/login`.

Écran de connexion : la carte de belote (as de cœur, flip 3D) du DS,
supporte connexion ET création de compte via un même formulaire (bascule).

## 6. Jetons quotidiens

Service `services/dailyTokens.ts` (localStorage, testé).
Le pastille `.coin` de la barre supérieure est **cliquable** ; au clic, si
la récompense du jour n'a pas encore été réclamée, +500 ◆ créditées avec un
dialogue de confirmation.

L'économie serveur complète (prélèvements 100/50, gains 150/225/150) est
prévue en tranche 4.

## 7. Boucle de jeu (services/gameLoop.ts)

`GameLoop` est un contrôleur **PUR** et **testable** autour de `belote-core` :

- `plan()` : renvoie le prochain pas automatique ou `null` (humain à jouer).
- `start()` / `resume()` : (re)lance la boucle.
- `stepOnce()`, `togglePause()`, `cycleSpeed()`.
- Scheduler injectable (par défaut `setTimeout`, remplaçable en test).

Chaque écran de partie (`TableScreen`, `ReplayScreen`) instancie une boucle,
rend l'état dans la table Pixi, sauvegarde le replay à la fin (`POST /games`).

## 8. Rejeu (ReplayScreen)

Rejoue en direct chaque opération d'un replay serveur :
- 700 ms pour une annonce
- 900 ms pour une carte
- 1200 ms pour un ramassage de pli

Pause + vitesse ×1 / ×2 / ×4. Toujours en mode `opponentCards: 'faceup'`
(le rejeu est un spectateur privilégié : on voit tout).

## 9. Capacitor / paysage

L'app est empaquetée avec **Capacitor** (successeur de Cordova).
`mobile/capacitor.config.ts` définit `appId`, `webDir: 'dist'` et la couleur de
fond. L'orientation **paysage** est verrouillée dans les projets natifs générés
(AndroidManifest `screenOrientation="landscape"`, Xcode Deployment Info). En
plus, l'application web refuse le portrait via la garde `.orient-guard` du DS
(double sécurité).

Build type :

```bash
npm --workspace belote-mobile run build     # → mobile/dist/
cd mobile
npx cap add android                         # → mobile/android/ (1re fois)
npx cap sync
npm --workspace belote-mobile run cap:android
```

Détails complets : `mobile/capacitor/README.md`.

## 10. Configuration d'une partie (dialogue)

Quand l'utilisateur choisit « Jouer » sur la table (`/table`), un dialogue
s'ouvre — MÊME style que « Robot créé ! » — pour paramétrer :

- **Emplacement de chaque siège** (`A`, `B`, `C`, `D`) : `🤖 Auto` (robot
  générique), `👤 Moi`, ou n'importe quel robot de l'écurie de l'utilisateur.
  Un seul « Moi » à la fois ; se placer ailleurs libère l'ancien siège.
- **Visibilité des cartes** :
  - « Personne » → aucune carte visible en dehors de la vôtre.
  - « Mes robots » → les cartes de VOS robots sont visibles (utile pour
    apprendre à les lire).
  - « Tout le monde » → toutes les cartes sont visibles (démo).
  Dans **tous les cas**, le coéquipier reste caché (règle de la belote,
  appliquée par PixiTable via `partnerFaceDown`).
- **Nombre de manches** : 1, 2 ou 4 (union stricte du moteur).

Logique pure dans `services/gameSetup.ts` :
- `mySeatFromSetup(setup)` — siège humain ou `null`.
- `visibleSeatsFromSetup(setup, myRobotIds)` — ensemble des sièges dont
  l'utilisateur peut consulter les cartes.
- `isSetupValid(setup)` — vérifie qu'un seul « moi » est placé et que
  `manches > 0`.

Composant du dialogue : `presentation/components/GameSetupDialog.ts`.

## 11. Tests

- `Robot.test.ts` (14 tests) — mapping curseurs↔personnalité, seuils DS,
  entité et sérialisation.
- `dailyTokens.test.ts` (6 tests) — réclamation, cumul, dépense.
- `gameLoop.test.ts` (6 tests) — planificateur, vitesse, pause, scheduler.
- `gameSetup.test.ts` (11 tests) — résolution du siège humain, visibilité
  par mode, validation de la configuration.

Total mobile : **37 tests** (100% verts).

Les commentaires de test sont en français (règle projet : commentaires de
test en anglais dans les autres workspaces — mobile suit sa propre langue).


## 12. Jouer en ligne (OnlineScreen) — v10.4.0

Lobby réel branché sur `/tables` : liste des tables publiques en attente
(chips de sièges A–D, sièges libres cliquables), création d'une table,
choix « 👤 Moi » ou « 🤖 un de mes robots » par siège, changement de place
tant qu'elle est libre, annulation d'une table pending (créateur, tant que
les 4 sièges ne sont pas pris). Le jeu TEMPS RÉEL lui-même se joue sur le
web pour l'instant — l'écran l'affiche quand la table passe en `playing`.
Règle affichée : une seule partie à la fois ; le robot reprend la main d'un
joueur qui quitte, et la lui rend à son retour (`resumeSeat` serveur).

## 13. Table Pixi responsive — v10.4.0

- `PixiTable` observe désormais SON CONTENEUR via `ResizeObserver` (le
  ResizePlugin Pixi ne réagit qu'aux resizes de la fenêtre) → plus de layout
  initial cassé sur mobile, adaptation instantanée à tout changement de taille.
- Taille de carte CONTINUE `responsiveCardW(w, h)` (bornée 40–84, testée),
  ancrage des mains proportionnel (`INSET = cardH × 0.42 + 16`).
- CSS compact : feuille de score et pile d'actions réduites sous 560 px et
  430 px de hauteur pour ne jamais chevaucher les mains.

## 14. Tests E2E (DOM réel + faux serveur) — v10.5.0

MongoDB et les navigateurs Playwright ne sont pas joignables depuis la
sandbox de build (egress restreint). La vérification d'IHM se fait donc
avec un **DOM réel (happy-dom)** et un **faux serveur intercepteur** :

- `src/test/fakeServer.ts` — remplace `fetch` et répond exactement comme le
  vrai serveur (mêmes chemins, mêmes payloads, mêmes statuts). La vraie
  couche `ApiClient` est donc exercée (en-têtes, parsing, gestion du 401) ;
  seul le transport est simulé. `calls[]` journalise chaque appel pour
  asserter qu'un écran interroge bien les bons endpoints.
- `src/test/screens.e2e.test.ts` — monte **les 12 écrans** et vérifie leur
  rendu : Connexion, Accueil, Mes robots, Éditeur, Classements,
  Compétitions, Historique, À propos, Porte-monnaie, Équipes, Mon équipe,
  Jouer en ligne, plus la coquille de l'écran de Table.

Lancement : `npm --workspace belote-mobile run test`.

Pour rejouer ces parcours dans un vrai navigateur (captures d'écran,
Android), les mêmes fixtures peuvent alimenter un Playwright local :
le faux serveur est un simple intercepteur `fetch`, réutilisable tel quel.

## 15. Sélection des sièges — tactile, pas de liste déroulante

Le dialogue de configuration de partie n'utilise **aucun `<select>`** : sur
mobile un menu natif sort du design system et masque le contexte. Chaque
siège affiche ses options en pastilles visibles simultanément (🤖 Auto,
👤 Moi, puis chaque robot de l'écurie), avec l'appartenance d'équipe
(NOUS / EUX) et un seul « Moi » possible — le déplacer libère l'ancien siège.

## 16. Jeu en ligne temps réel (v11.1.0)

Le jeu en ligne tourne ENTIÈREMENT sur le serveur (moteur + robots). Le mobile
ne calcule rien : il s'abonne, affiche l'état reçu et transmet les gestes.

- **`data/TableSocket.ts`** — client Socket.IO : `table:subscribe`,
  réception `table:update` (lobby) et `table:game` (partie), émission
  `table:bid` / `table:play` / `table:signal`.
- **OnlineScreen** — dialogue de création avec les 3 types de partie
  (Alliance Hybride, Duo d'Acier, Carré Royal), pré-placement des robots,
  choix public/équipe, lobby EN TEMPS RÉEL (un socket par table : toute
  prise/départ/changement de siège est visible instantanément), bouton
  « Lancer » (créateur, 4 sièges) et « Rejoindre » (partie en cours).
- **TableScreen** en mode `?online=<tableId>` — aucun dialogue de
  configuration (c'est une participation, pas une création) ; voile d'attente
  tant que la partie n'a pas démarré ; les mains adverses restent en dos.
- **Reprise** — la bannière « Partie en cours » de l'accueil mène vers
  `?online=<tableId>` : reprise directe. Le serveur (`resumeSeat` au
  `subscribe`) rend la main au joueur de retour ; son robot jouait à sa place.

### Trois types de partie (SPEC §3.3)

| Type | Configuration | Robots à choisir |
| --- | --- | --- |
| Alliance Hybride | joueur + robot contre joueur + robot | 1 (partenaire) |
| Duo d'Acier | vos DEUX robots ensemble contre le duo d'un autre | 2 (même équipe) |
| Carré Royal | 4 joueurs humains | 0 |

Règle : les deux robots d'une même personne jouent TOUJOURS ensemble (même
équipe) — vérifié à la création et à la prise de siège.

## 17. Historique — portée et filtres (v11.1.0)

Onglets de portée : **Mes parties** / **Publiques**. Filtres par type de
partie : Toutes / Alliance Hybride / Duo d'Acier / Carré Royal. Les parties
privées ne sont visibles que par les membres de l'équipe ; les publiques par
tout le monde (le serveur applique la règle, le client l'affiche).

## 18. Rejeu comme une partie en cours (v11.1.0)

Le rejeu est rendu exactement comme une partie live : observation depuis le
siège sud, cartes jouées qui apparaissent dans le pli au fil de la lecture,
mains adverses en dos. Plus d'affichage « toutes cartes visibles ».

## 19. Écran d'initialisation thématisé (v11.2.0)

`mobile/index.html` embarque désormais un **CSS critique en ligne** (avant le
chargement du bundle) : fond sombre du jeu, mot-clé « waiting » et **4 robots
animés** en pur CSS (rebond décalé, clignement des yeux, antenne lumineuse aux
couleurs or/vert/bleu/rouge). Fini l'écran blanc au démarrage. `main.tsx` retire
l'écran (`#boot`) en fondu dès que l'application est montée. La garde
d'orientation portrait est thématisée de la même façon.

## 20. Contrôles de table selon le mode (v11.2.0)

En **rejeu/local** : overlay de logs + boutons Pause et Vitesse.
En **ligne** : ces contrôles sont masqués (le rythme est piloté par le serveur) ;
à la place, un badge **👁 N** affiche le nombre de spectateurs, mis à jour en
direct via l'évènement serveur `table:spectators`.

Le bouton **Quitter** appelle une sortie unifiée `leaveTable()` : il coupe la
boucle locale si elle existe, sinon la connexion socket, puis démonte la table.
(Corrige le plantage « dispose sur undefined » en ligne, où il n'y a pas de
boucle locale.)

## 21. Départ automatique et anti-blocage (v11.2.0)

Plus de bouton « Lancer » : dès que les 4 sièges sont pris, le serveur diffuse
`table:countdown` et **tous les clients basculent vers la table au même moment**
(5 s). En Alliance Hybride / Duo d'Acier, si un joueur place un robot mais laisse
le siège partenaire vide plus de 10 s, ses robots sont libérés pour ne pas
bloquer la table (pas en Carré Royal, qui n'a pas de robots).

## 22. Reprise immédiate de siège (v11.2.0)

Quand un joueur quitte (bouton Quitter ou déconnexion), son siège passe
instantanément en **substitution robot** côté serveur — la partie continue sans
attendre un délai. À son retour sur la table, il **reprend la main
immédiatement**. Il n'est plus jamais traité comme un nouveau spectateur.

## 23. Rejoindre une équipe publique (v11.2.0)

Dans la liste des équipes, chaque équipe publique porte un bouton
**« Rejoindre »** (les privées affichent « Voir »). Le serveur refuse si l'on est
déjà membre ou si l'équipe est privée.

## 24. Historique enrichi, statistiques et rejeu local (v11.3.0)

### Historique (HistoryScreen)
Portées : **Mes parties** (créées ou où je joue), **Mes robots** (une de mes
fiches a joué), **Mon équipe**, **Publiques**. Filtres par type de partie.
**Pagination 15 par page** (Précédent / Suivant, servie par le serveur). Chaque
ligne montre le résultat, le score NOUS/EUX et les joueurs des deux camps, avec
deux actions : **Statistiques** et **Rejouer**.

### Statistiques détaillées (GameStatsScreen, route `gamestats`)
Écran distinct du rejeu : bandeau résultat (trophée, score géant, manches),
compositions NOUS/EUX, tuiles de synthèse (donnes, contres, contres réussis,
surcontres, capots, capots annoncés) et barres comparatives (plis, capots,
belotes), puis le détail manche par manche. Bouton pour rejouer.

### Rejeu 100% local (ReplayScreen)
Le JSON de la partie est récupéré une seule fois, puis TOUT est rejoué en local
(aucune socket, aucune session) : mêmes actions dans l'ordre, avec un **minimum
de 2 secondes** entre chacune. Vitesse **x1 / x2 / x4 / x8**.

### Match entre robots (RobotsScreen)
Le bouton « Match entre robots » ouvre un dialogue de sélection de 4 fiches et
lance une **simulation côté serveur** : la partie est jouée instantanément,
archivée dans l'historique, puis on ouvre directement ses statistiques.

## 25. Fin de partie en ligne soignée (v11.3.0)

À la fin d'une partie en ligne, un overlay thématisé s'affiche : trophée,
résultat NOUS/EUX, **score final géant**, et actions claires (Statistiques,
Rejouer, Quitter la table). Remplace le simple toast.

## 26. Parties en ligne en cours (OnlineScreen)

Les parties lancées restent listées avec le statut **« En jeu »** et un bouton
**Regarder**. Onglets de portée (Toutes / Mon équipe / Publiques) et
**pagination 15 par page**.

## 27. Invitations d'équipe (v11.5.0)

Écran **Invitations** (route `invitations`) avec deux onglets :

- **Reçues** — chaque invitation montre l'équipe et l'invitant, avec
  **Accepter** (confirmation → rejoint l'équipe) et **Refuser**.
- **Envoyées** — visible pour le propriétaire : la liste des invitations en
  attente qu'il a émises, chacune avec **Annuler**.

Un **formulaire d'invitation** (propriétaire) recherche un joueur par pseudo
(recherche instantanée avec anti-rebond) puis l'invite en un geste.

Accès : un **badge de notification** rouge sur la tuile « Invitations » de
l'accueil indique le nombre d'invitations reçues ; un bouton **✉ Inviter** dans
« Mon équipe » mène au même écran. L'écran est réactif (évènement
`invitations:changed`) et n'utilise aucune boîte native (toasts + dialogues du
design system).

## 28. Smileys et profils de joueurs (v11.6.0)

**Smileys** — en partie en ligne, une barre de 8 smileys (visible quand on est
assis) permet d'envoyer une réaction ; les réactions de tous les joueurs
apparaissent en bulles flottantes près de leur siège. Câblé sur l'évènement
`table:signal`.

**Profil joueur** — les noms de joueurs (barre des joueurs sur la table en
ligne, compositions de l'écran de statistiques) sont cliquables et ouvrent une
popup (`PlayerProfile`) à trois onglets : **Infos** (niveau, rang, jetons,
équipe), **Robots** (fiches + ELO), **Stats** (parties jouées / gagnées /
perdues, taux de victoire, nombre de robots).

## 29. Retour de partie fiable (v11.6.0)

En quittant puis revenant à une table en ligne, le nombre de spectateurs est
désormais recompté et rediffusé à chaque abonnement / désabonnement /
déconnexion. Si la partie s'est terminée pendant l'absence, le client reçoit
directement l'écran de fin (plus de blocage sur l'écran d'attente).

## 30. Émotes unifiées, réflexion, indicateur LIVE (v11.7.0)

**Émotes** — une seule liste, regroupée dans un dock minimisé en bas-gauche du
tapis (bouton 🙂 qui ouvre la liste au clic). Les réactions sont diffusées et
visibles par tous les joueurs et spectateurs : `PixiTable` expose `onEmote`
(l'hôte diffuse via le socket) et `emoteSignal` (émote distante affichée, rejouée
au changement de `nonce`). Plus de barre DOM séparée côté écran.

**Réflexion 💭** — affichée en permanence dans le récapitulatif des annonces pour
une enchère réfléchie (propriété diffusée via `view.bids`), donc visible par tous,
y compris après un renvoi d'état.

**Indicateur LIVE** — une pastille LIVE animée (point rouge pulsé) apparaît en
haut, à côté du logo Kýdos, quand une partie est en cours ; un clic reprend la
partie. Remplace l'ancienne bannière de l'accueil.

## 31. Table : cartes du pli, score Nous/Eux, tailles (v11.8.0)

**Émojis** — le signal diffusé porte désormais la clé `kind` attendue par le
client ; les réactions sont visibles par tous les joueurs et spectateurs.

**Cartes jouées** — le pli (`TrickLayer`) place chaque carte vers le centre avec
un décalage aléatoire borné (≤ 40% de la taille de carte), une inclinaison
perpendiculaire au joueur ±30° (60°..120°), et un empilement par ordre de jeu
(dernière carte au premier plan). Placement déterministe via `trickPlacement`.

**Feuille de score** — les colonnes sont ordonnées selon le camp du spectateur
(Nous = son équipe, à gauche) et colorées vert (Nous) / rouge (Eux), partout
(mini-feuille, feuille détaillée, compteurs, écran de fin).

**Tailles de cartes** — les cartes des trois autres joueurs sont réduites à 70%
(−30%) de la main du joueur courant.
