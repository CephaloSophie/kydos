# Kýdos Belote — Base de connaissance pour IA / développeurs

Porte d'entrée du dépôt : ce qu'est le produit, comment le monorepo est organisé,
et vers quel document aller ensuite.

> **À lire d'abord** : [`../../CLAUDE.md`](../../CLAUDE.md) — règles opérationnelles,
> modules centraux (source unique de vérité), contrats à ne jamais casser, pièges de
> test. Ce fichier-ci en est le complément « vue d'ensemble », pas un doublon.

## 1. Vision produit

Kýdos Belote est un jeu de **belote contrée** haut de gamme orienté robots (IA
personnalisables) et jeu en ligne humain vs robot. Édité par **Cephalo Sophie**,
créateur de la plateforme no-code **KANTO APLO**.

- Site officiel du jeu : https://kydosbelote.com
- Éditeur : https://cephalosophie.com
- Plateforme mère : https://kantoaplo.com
- Contact : contact@cephalosophie.com

Équipe fondatrice :

| Nom | Rôle | Email |
| --- | --- | --- |
| Ameur Hamdouni | CEO & Founder & Architect | ameur.hamdouni@cephalosophie.com |
| Abdelhamid Sghaier | Co-fondateur & CTO · expert mobile | abdelhamid.sghaier@cephalosophie.com |

Clients de l'entreprise : IFPEN, La Poste, LeadsHook, Docaposte, Softia,
JCDecaux, Unibet, Allianz.

Les robots sont des **individus** : nom, avatar, personnalité paramétrable, score et
niveau cumulés, replays consultables — « algorithms as characters ».

## 2. Le monorepo tel qu'il est

```
belote-kydos/
├── packages/
│   ├── core/           belote-core        — moteur de jeu PUR (règles, robots, scoring)
│   ├── table-pixi/     @kydos/table-pixi  — la table de belote comme composant PixiJS
│   ├── application/    ⚠️ LEGACY — plus aucun import, ne rien y ajouter
│   └── belote-table/   ⚠️ LEGACY — plus aucun import, ne rien y ajouter
├── server/             belote-server      — API Express + MongoDB + Socket.IO (port 4000)
├── mobile/             belote-mobile      — app joueur (TypeScript + DOM, Vite + Capacitor)
├── back-office/        ⚠️ HORS workspaces — Angular 19 + son propre Express (port 3001)
├── scripts/            tnr.mjs, tnr-server.mjs, coverage.mjs, healthcheck.mjs
├── Makefile            cycle mobile natif (device, émulateur, logs, cap sync)
└── docs/               cette documentation
```

**Workspaces npm** : `packages/*`, `server`, `mobile`. Le glob attrape aussi les deux
packages legacy, mais `typecheck:all` / `test:all` ne les traitent pas.

**Le workspace `web/` (ancienne app React) a été supprimé en v16.** Ce qui subsiste
sur le disque n'est pas suivi par git. Toute documentation qui décrit `web/`,
l'alias `@table-pixi` ou une parité web/mobile décrit un monde disparu.

### Qui dépend de qui

```
        belote-core  (aucune dépendance — SemVer strict)
              │
      ┌───────┴────────┐
      ▼                ▼
@kydos/table-pixi   belote-server
      │                │  HTTP / WebSocket
      └──────┬─────────┘
             ▼
         belote-mobile

back-office (Angular)  ──►  back-office/server (Express)  ──►  MongoDB (même base)
```

Le back-office **ne dépend ni de `belote-core` ni de `table-pixi`** : quelques
logiques pures y sont recopiées à l'identique. La liste des miroirs à garder
synchronisés est dans `CLAUDE.md` (« Miroirs à garder synchronisés ») — c'est la
règle la plus facile à casser du dépôt.

## 3. Les cinq espaces en une phrase chacun

| Espace | Ce qu'il fait | À lire |
| --- | --- | --- |
| `packages/core` | Moteur PUR : règles de contrée, cerveaux de robots, scoring, orchestration donnes → manches → partie. Aucune I/O. | [`../architecture-robots.md`](../architecture-robots.md) |
| `packages/table-pixi` | La table rendue en PixiJS + HUD (enchères, score, émotes, thèmes, mascottes). | [`../table-pixi/README.md`](../table-pixi/README.md) |
| `server` | API REST + Socket.IO. 22 modules autonomes (`model → service → controller → routes`). | [`../api-reference.md`](../api-reference.md), [`../websocket-reference.md`](../websocket-reference.md) |
| `mobile` | L'app joueur. Clean architecture `core → data → domain → presentation`, design system autonome, Capacitor. | [`MOBILE.md`](./MOBILE.md), [`../session-cache.md`](../session-cache.md) |
| `back-office` | Administration : tournois, formats de match, thèmes, avatars, score & niveaux, utilisateurs, promos, comptabilité. | [`../backoffice/technique.md`](../backoffice/technique.md) |

## 4. Commandes essentielles

```bash
npm install
npm run typecheck:all      # core + table-pixi + server + mobile
npm run test:all           # idem, tests
npm run tnr                # non-régression globale → reports/tnr-latest.json
npm run coverage           # couverture consolidée (seuils par workspace)
npm run seed               # jeu de données de démo
npm run dev                # serveur + mobile en parallèle

make check                 # diagnostic mobile ↔ serveur (7 vérifications)
make android-device        # build + lance sur un device Android branché
```

Back-office (hors workspaces, se lancer depuis son dossier) :

```bash
cd back-office && npx ng serve                  # SPA Angular, port 4200
cd back-office/server && npx tsx src/index.ts   # API admin, port 3001
cd back-office/server && npm run seed:admin     # crée/promeut un compte admin
```

## 5. Conventions

- **Langue** : code, commentaires, commits et docs en **français**. Exception
  historique : les commentaires de tests sont en anglais.
- **Commits conventionnels** : `feat(score): …`, `fix(queue): …`, `docs: …`.
  Jamais de push direct sur `main` — toujours une branche dédiée.
- **Logique métier = fonctions pures**, isolées et testées seules. C'est le patron
  dominant du dépôt.
- **Un point unique par décision** : la table des modules centraux de `CLAUDE.md`
  fait foi. Ne jamais recalculer en dur ailleurs ce qu'un module central résout.
- **Corriger la racine, pas le symptôme** — règle posée par le CEO, appliquée à
  toutes les refontes récentes (config de table, thèmes, score).
- **Aucun stub** : chaque livraison est verte (typecheck + tests + build).
- Chaque fichier de code décrit son rôle en tête (bloc `/* ==== */`).

## 6. Versions

Tous les `package.json` sont à **`16.0.0`**. Les documents parlent de « v17 »,
« v18 », « v19 » : ce sont des **jalons de conception**, pas des versions npm — le
bump a décroché depuis v16.

Pour savoir ce qui a été livré et **pourquoi** :

- [`HISTORIQUE-v18-v19.md`](./HISTORIQUE-v18-v19.md) — thèmes de table, avatars,
  score & niveaux, profil, VIP : les demandes, les causes racines, les décisions.
- [`../backoffice/ai-changelog.md`](../backoffice/ai-changelog.md) — journal détaillé
  des jalons v16 → v18, commit par commit.
- `CHANGELOG.md` (racine) s'arrête à **v14.4** : il ne couvre plus l'état courant.

## 7. Où aller ensuite

| Je veux… | Document |
| --- | --- |
| Comprendre comment un robot décide | [`../architecture-robots.md`](../architecture-robots.md) |
| Changer un comportement de robot | [`../robot-cerveau-config.md`](../robot-cerveau-config.md) |
| Comprendre matchs & tournois | [`../matches-tournaments.md`](../matches-tournaments.md), [`../match-live-runner.md`](../match-live-runner.md) |
| Toucher aux jetons, promos, VIP | [`../WALLET.md`](../WALLET.md), [`../ADS.md`](../ADS.md) |
| Travailler sur le mobile | [`MOBILE.md`](./MOBILE.md), [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md), [`../session-cache.md`](../session-cache.md) |
| Lancer l'app sur un device | [`../mobile-connection.md`](../mobile-connection.md) |
| Écrire ou lancer des tests | [`TESTING.md`](./TESTING.md) |
| Déployer | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| Connaître la dette et les risques | [`../DIAGNOSTIC-v14.14-production-readiness.md`](../DIAGNOSTIC-v14.14-production-readiness.md) |

**Documents à ne plus prendre au pied de la lettre** : [`SPEC.md`](./SPEC.md) et
[`../ROADMAP.md`](../ROADMAP.md) (gelés autour de v11.8 — un encadré en tête liste
ce qui a changé depuis), [`../brain-editor/`](../brain-editor/) (décrit une UI
supprimée avec `web/`), `board/tasks.json` (référentiel de tâches abandonné).
