# Stratégie de test — Kýdos Belote

## 1. Commande unique

```bash
npm run tnr        # typecheck ×5 + tests ×5 + builds ×3 + démo moteur
```

Produit `reports/tnr-latest.json` et sort en code 1 à la moindre régression.

## 2. Pyramide

| Niveau | Emplacement | Portée | Volume |
| --- | --- | --- | --- |
| Unitaire moteur | `packages/core/src/**/*.test.ts` | règles, scoring, scénarios de jeu | 53 |
| Unitaire table | `packages/table-pixi/**/*.test.ts` | layout, thèmes, responsive | 47 |
| Contrat API | `server/src/test/api.contract.test.ts` | routes, authentification, forme des erreurs | 40 |
| Unitaire serveur | `server/src/**/*.test.ts` | permissions, économie | 35 |
| Intégration serveur | `server/src/**/*.service.test.ts` | Mongo réel (opt-in) | écrits |
| Unitaire mobile | `mobile/src/{domain,services}/**` | mapping, économie, boucle de jeu | 52 |
| E2E mobile | `mobile/src/test/screens.e2e.test.ts` | 13 écrans en DOM réel | 29 |
| Unitaire web | `web/src/**/*.test.ts` | composants et utilitaires | 20 |

**Total exécuté par défaut : 276 tests.**

## 3. Tests d'intégration MongoDB

Écrits pour `TeamService`, `WalletService`, `SingleGameLockService`,
l'annulation de table et la recherche de replays publics. Ils nécessitent le
téléchargement du binaire MongoDB :

```bash
MONGOMS_AVAILABLE=1 npm --workspace belote-server run test
```

Ils sont exclus par défaut car certains environnements de build n'ont pas accès
à `fastdl.mongodb.org`. La CI les exécute dans un job dédié.

## 4. E2E mobile — faux serveur

`mobile/src/test/fakeServer.ts` intercepte `fetch` et répond exactement comme
le vrai serveur (mêmes chemins, mêmes payloads, mêmes statuts). La vraie couche
`ApiClient` est donc exercée — en-têtes, parsing, gestion du 401. Le journal
`calls[]` permet d'asserter qu'un écran interroge bien les bons endpoints.

Chaque écran est monté en DOM réel (happy-dom) et vérifié sur son contenu.

## 5. Captures d'écran et tests navigateur

Playwright n'est pas installable dans tous les environnements de build (CDN
navigateur parfois bloqué). Sur un poste connecté :

```bash
npm i -D @playwright/test && npx playwright install chromium
```

Les fixtures de `fakeServer.ts` sont réutilisables telles quelles comme backend
de test — voir la tâche **KB-112** du référentiel.

## 6. Règle de non-régression

Aucune livraison sans `npm run tnr` vert. Tout bug corrigé doit être
accompagné d'un test qui échouait avant le correctif — c'est ainsi qu'ont été
verrouillés KB-020 (table), KB-030 (404) et KB-031 (rejeu).
