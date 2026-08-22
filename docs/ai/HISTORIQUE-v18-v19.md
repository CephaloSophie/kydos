# Historique de conception — v18 / v19

Récit des demandes, des décisions prises et des fichiers touchés pendant la session
de développement v18–v19 (thèmes, avatars, score & niveaux, profil, VIP).
Objectif : qu'une session Claude Code repartant de zéro comprenne **pourquoi** le code
est ainsi, pas seulement ce qu'il fait.

Voir `CLAUDE.md` pour les règles opérationnelles, et `CHANGELOG.md` pour le journal
des versions.

---

## 1. Table de belote entièrement configurable

**Demande** : « la table belote est un package indépendant lié à l'instanciation de la
table : score initial des enchères, couleur de la table, belote comptée ou pas, sens du
jeu. Ne fait pas des correctifs — corrige la racine du souci. »

**Décision** : un point d'entrée unique `resolveTableConfig(opts)` dans `belote-core`
qui traduit les options métier en `RulesConfig` + `PartieConfig`. Tous les runners
(live, headless, matchmaking, tournois) l'appellent ; aucun ne fabrique ces objets à la main.

- `openingBidMin` → `minBid`, `countBelote` → `beloteBonus` (20 ou 0), `clockwise` → sens du jeu.
- **Bug racine corrigé** : le HUD d'enchères codait en dur l'échelle 90→180. `EngineView`
  expose désormais `minBid`/`maxBid` et `hud/bidMath.ts` construit l'échelle dynamiquement.
  C'est ce qui faisait démarrer le popup à 90 alors que la table était réglée à 80.

## 2. Thèmes de table (feutre + dos des cartes)

**Demande** : pouvoir construire des thèmes réutilisables au back-office et les appliquer
aux tournois et parties rapides. Puis : « le thème ne s'applique pas, le tapis par défaut
persiste » ; puis : « ça marche en match rapide mais pas en tournoi ».

**Décisions et causes racines** :
- `TableTheme` = entité réutilisable référencée par id ; `resolveThemeColors()` en dérive
  les couleurs concrètes (feutre, rail, accents, **dos des cartes**), figées sur la table
  au provisionnement.
- **Bug 1** : `FeltLayer` mettait sa texture en cache par `theme.name` seul → les surcharges
  dynamiques ne repeignaient jamais. Clé de cache corrigée pour inclure les couleurs réelles.
- **Bug 2** : les couleurs ne voyageaient que dans le payload du lobby ; un joueur rejoignant
  une partie **déjà en cours** reçoit `table:game`, pas `table:update`. Les couleurs voyagent
  donc désormais **avec l'état de jeu**.
- **Bug 3 (tournois)** : l'orchestrateur passait `tableThemeId` en `ObjectId` Mongoose là où
  le matchmaking passait une chaîne → normalisé en `String`.

## 3. Avatars

**Demande initiale** : avatars de robots configurables au back-office (collection
indépendante, couleurs, plage de niveau min/max), plus rien de codé en dur côté mobile.
Puis, sur le design : « c'est pas joli ce que tu as proposé — j'ai besoin de votre
imagination et la compétence d'un designer ».

**Décisions** :
- Collection `RobotAvatar` + `GET /avatars` filtré par niveau du joueur ; le mobile lit un
  catalogue avec repli hors-ligne (`data/AvatarCatalog.ts`). Le domaine `Robot` reste pur
  (presets en repli) ; la présentation résout les couleurs.
- Mascotte **paramétrique générée par code** (SVG) plutôt qu'une image : antenne + bulbe,
  tête plaquée à dégradé, visière, yeux lumineux, sourire.
- Rasterisée en texture Pixi (cache + chargement asynchrone + callback de redessin) pour
  servir de **logo de siège** à la table.

**Puis (v19)** — demande d'une famille **humaine** distincte et de traits communs :
- Deux familles dans un générateur unique : `robot` (visière, antennes) et `human`
  (tête ronde, cheveux, oreilles douces, petits yeux, nez, col).
- Traits communs configurables : **1 à 5 antennes/mèches**, **état des yeux** (dont clin,
  fermé ou grand ouvert à gauche/droite), **état de la bouche** (sourire, rictus, neutre,
  triste, colère avec sourcils, surpris).
- Catalogue `PlayerAvatar` séparé (« Avatars joueurs »), choix libre sans niveau.

## 4. Score & niveaux — modèle unique `scoreKydos`

**Demande** : « un modèle qui représente totalement le score et les niveaux, gérable au
back-office, **le seul appliqué dans toute l'application**, centralisé dans un seul endroit »,
avec coefficients, seuils de niveau, bonus jetons et diagnostic des contradictions.

**Décision** : `packages/core/src/scoring/scoreKydos.ts`, 100 % pur.

- Gain = `base × coefPartie × coefTypeJeu (+ % des jetons) (+ vipRate % si VIP)`.
- Échelle géométrique (défaut 500 pts, +8 %/niveau, jusqu'à 200 niveaux) avec surcharges
  manuelles ; `levelForScore()` rend `level` **et** `pointsInLevel` (points accumulés
  dans le niveau, explicitement demandés).
- `diagnoseScoreKydos()` détecte : échelle non croissante (le cas « 1→2 coûte 400 mais
  3→4 coûte 350 »), valeurs négatives, pourcentages irréalistes, coefficients ≤ 0,
  surcharges hors bornes, redondances. **La sauvegarde est refusée s'il reste une erreur.**
- Attribution en **un seul endroit** : `gamePersistence.awardKydosScores()`.
- Champs persistés : `User.rewardPoints/level/scoreInLevel`, `Robot.score/level/scoreInLevel`
  (comble l'absence totale de cumul côté robot relevée au diagnostic).

**Contexte** : ce travail a été précédé d'un audit complet, `docs/DIAGNOSTIC-scores-cumul.md`,
qui cartographie les trois couches de score historiques et les dettes relevées.

**Dette connue restante** : `computeReward` (ancienne formule récompense) neutralisait son
volet « bonus D » (dedans, capots, contrées) — ces informations existent pourtant dans
`Game.stats`. Le modèle actuel ne les exploite pas encore.

## 5. Profil joueur, badge et VIP

**Demandes** : afficher les **initiales** du joueur avec « Niv n » au lieu de « Niv. n » ;
un écran de réglages (prénom, nom, e-mail, avatar) ; et le VIP visible par un **cadre doré**
autour de l'avatar, avec ses avantages.

**Décisions** :
- `User` gagne `firstName`, `lastName`, `avatarId` ; `PATCH /users/me` valide e-mail et clé d'avatar.
- Badge `TopBar` : initiales + niveau **réel** (issu du modèle, plus de dérivation depuis le solde),
  avatar du joueur, cadre doré si VIP.
- VIP : pas de publicité (déjà en place via `AdManager`), cadre doré, et **bonus de score
  `vipRate`** intégré au calcul central plutôt qu'ajouté à part.

## 6. Correctif Redis (queue de matchmaking)

**Symptôme** : `Redis indisponible, fallback InMemory {"error":"require is not defined"}`.

**Cause racine** : le serveur est en ESM (`"type": "module"`), où `require` n'existe pas.
L'appel `require('ioredis')` échouait à **chaque** démarrage — Redis n'était donc jamais
tenté. `main` a résolu cela par un import statique `import IORedis from 'ioredis'`.

**À retenir** : configurer Redis par `REDIS_URL=redis://user:pass@host:6379` plutôt que
d'écrire les identifiants en dur ; le fallback InMemory et les logs de connexion doivent
être préservés.
