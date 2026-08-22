# Kýdos Belote — contexte projet

Monorepo du jeu de belote contrée Kýdos. Ce fichier est chargé automatiquement par
Claude Code : il contient ce qu'il faut savoir AVANT de toucher au code.

**Langue** : code, commentaires, commits et documentation en **français**.

## Structure

| Espace | Rôle |
|---|---|
| `packages/core` (`belote-core`) | Moteur de jeu PUR : règles, scoring, orchestration donnes→manches→partie. Aucune I/O. |
| `packages/table-pixi` (`@kydos/table-pixi`) | La table de jeu comme UN composant PixiJS + HUD. |
| `server` (`belote-server`) | API + WebSocket (Express, Mongoose, Socket.io). Modules par domaine. |
| `mobile` (`belote-mobile`) | App joueur (TypeScript + DOM, Vite). Pas de framework UI. |
| `back-office/` | **Hors workspaces npm** : app Angular + son propre serveur Express (`back-office/server`). |

Documentation détaillée : `docs/ai/` (ARCHITECTURE, SPEC, TESTING, MOBILE, DESIGN-SYSTEM, API).

## Commandes

```bash
npm run typecheck:all          # core + table-pixi + server + mobile
npm run test:all               # idem, tests
npm --workspace belote-server run test
npm --workspace belote-mobile run test
npm run seed                   # jeux de données de démo

# back-office (hors workspaces : se lancer depuis son dossier)
cd back-office && npx ng build
cd back-office/server && npx tsc --noEmit && npx vitest run
```

## Principes d'architecture

- **Clean architecture** : le domaine ne dépend jamais de l'infrastructure. La
  présentation résout ses dépendances via le contexte injecté (`mobile/src/presentation/context.ts`).
- **Logique métier = fonctions PURES**, isolées dans leur module et testées seules
  (aucune I/O). C'est le patron dominant du dépôt — le suivre.
- **Un point unique par décision** : voir les modules centraux ci-dessous. Ne jamais
  recalculer en dur ailleurs ce qu'un module central résout déjà.

## Modules centraux (source unique de vérité)

| Sujet | Module | Règle |
|---|---|---|
| Configuration d'une table | `packages/core/src/engine/tableConfig.ts` → `resolveTableConfig()` | Traduit les options métier (enchère d'ouverture, belote comptée, sens du jeu, manches, cibles) en `RulesConfig` + `PartieConfig`. **Aucun runner ne fabrique ces objets à la main.** |
| Score de carte d'une donne | `packages/core/src/scoring/donneScoring.ts` | Base 162, arrondi par équipe, belote, contre/surcontre, capot. |
| **Score & niveau Kýdos** | `packages/core/src/scoring/scoreKydos.ts` | Modèle **UNIQUE** : barème de gain, échelle de niveaux, bonus VIP, diagnostic. Voir ci-dessous. |
| Thème de table | `server/src/modules/tableTheme/tableTheme.colors.ts` → `resolveThemeColors()` | Dérive feutre, rail, accents et **dos des cartes** depuis un `TableTheme` réutilisable. |
| Avatars (rendu) | `packages/table-pixi/robotMascot.ts` → `mascotSvg()` | Mascotte paramétrique, **deux familles** : `robot` et `human`. |

### Score & niveau (`scoreKydos`)

Tout le score de l'application passe par là, joueurs **et** robots.

```
gain = base(joueur|robot) × coefPartie × coefTypeJeu + tokenScorePercent % des jetons
       puis +vipRate % si le gagnant est VIP
```

- Échelle de niveaux **géométrique** : `firstLevelThreshold × (1 + levelUpPercent/100)^(n-1)`.
  Défaut 500 pts, +8 %/niveau (niveau 2 à 500, niveau 3 à 1040), surcharges manuelles possibles.
- `levelForScore()` est la **seule** façon de calculer un niveau. L'ancien
  `1 + floor(score/100)` n'existe plus.
- Configuration éditée au back-office (singleton `ScoreConfig`, page « Score & niveaux »),
  lue par le serveur. `diagnoseScoreKydos()` détecte les incohérences ; la sauvegarde
  est refusée tant qu'il reste une erreur.
- **Unique point d'attribution** : `gamePersistence.awardKydosScores()`. Ne pas créditer
  de score ailleurs.
- `scoreCoefficient` (défaut 1) porté par la table, le tournoi et la variante de match rapide.

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

## VIP

Acheté en jetons (`vipExpiresAt` sur `User`). Avantages : **aucune publicité**
(`AdManager` renvoie `reason: 'vip'`), **cadre doré** autour de l'avatar (badge + profil),
et **bonus de score `vipRate`** (défaut 3 %) appliqué dans `computeScoreGain`.

## Tests — pièges connus

- `mongodb-memory-server` **ne peut pas télécharger son binaire** dans les environnements
  sans réseau sortant. `server/vitest.config.ts` maintient donc une **liste blanche de tests
  purs** par défaut ; la suite complète ne tourne qu'avec `MONGOMS_AVAILABLE=1`.
  **Conséquence : un nouveau test pur doit être ajouté à cette liste pour être exécuté.**
- 3 tests d'accueil de `mobile/src/test/screens.e2e.test.ts` échouent **avant toute
  modification** (l'écran a 4 cartes, le test en attend 3 ; menu « Jouer en ligne »).
  Échec **pré-existant et connu** — ne pas tenter de le « corriger » par accident.

## Git

Commits conventionnels en français : `feat(score): …`, `fix(queue): …`, `docs: …`.
Ne jamais pousser sur `main` directement ; travailler sur une branche dédiée.
