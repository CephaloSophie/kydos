# Stratégie de test — Kýdos Belote

Approche « pyramide + non-régression + couverture mesurée », automatisée en CI.

## 1. Commandes

```bash
npm run tnr          # TNR global : typecheck ×5 + tests ×5 + builds ×3 + démo moteur
npm run tnr:server   # TNR serveur : typecheck + tests + couverture + intégration Mongo
npm run coverage     # Couverture consolidée des 5 workspaces (avec seuils)
npm run e2e:web      # E2E web (Playwright, navigateur réel) — voir §6
```

Chaque runner produit un artefact JSON dans `reports/` et sort en code 1 à la
moindre régression :
- `reports/tnr-latest.json`
- `reports/tnr-server-latest.json`
- `reports/coverage-latest.json`

## 2. Pyramide de tests

| Niveau | Emplacement | Portée |
| --- | --- | --- |
| Unitaire moteur | `packages/core/src/**/*.test.ts` | règles, scoring, stats, scénarios, format du replay |
| Unitaire table | `packages/table-pixi/**/*.test.ts` | layout, thèmes, responsive, placement du pli |
| Contrat API | `server/src/test/api.contract.test.ts` | routes, auth, forme des erreurs |
| Unitaire serveur | `server/src/**/*.test.ts` (purs) | permissions, économie, helpers de profil, balance économique |
| Intégration serveur | `server/src/**/*` important `setupMongo` | Mongo réel (opt-in, cf. §5) |
| Unitaire mobile | `mobile/src/{domain,services}/**` | mapping, économie, services (TeamService…) |
| E2E mobile | `mobile/src/test/screens.e2e.test.ts` | tous les écrans en DOM réel (happy-dom) |
| Unitaire web | `web/src/**/*.test.ts` | composants et utilitaires |
| E2E web | `web/e2e/*.spec.ts` | app réelle dans un navigateur (Playwright, cf. §6) |

## 3. Couverture (rapports)

La couverture est mesurée par **Vitest + provider v8** dans chaque workspace,
avec rapports `text-summary` (console), `html` (navigable, `coverage/`), `lcov`
(agrégation externe / Codecov) et `json-summary` (consommé par le runner
consolidé).

`npm run coverage` exécute la couverture de tous les workspaces, agrège les
résumés et affiche un tableau. Des **seuils** par workspace (dans chaque
`vitest.config.ts`) font échouer la commande en cas de régression — ils sont
calés sous le niveau courant et remontés progressivement (approche « cliquet »).

Repères actuels (statements) : core ~81 %, mobile ~82 %, serveur ~34 %
(unit-only ; l'intégration Mongo en CI couvre les contrôleurs/services), web
~9 % (unités pures ; l'E2E Playwright couvre les parcours), table-pixi ~23 %.

## 4. E2E mobile — faux serveur

`mobile/src/test/fakeServer.ts` intercepte `fetch` et répond exactement comme le
vrai serveur (mêmes chemins, payloads, statuts). La vraie couche `ApiClient` est
donc exercée (en-têtes, parsing, 401). Le journal `calls[]` permet d'asserter
qu'un écran interroge bien les bons endpoints. Chaque écran est monté en DOM réel
(happy-dom) et vérifié sur son contenu. La table Pixi (WebGL) est remplacée par
un composant inerte : la LOGIQUE de l'écran de jeu reste testée.

## 5. Intégration MongoDB

Les tests d'intégration importent `server/src/test/setupMongo` et démarrent un
MongoDB en mémoire. Ils nécessitent le téléchargement du binaire :

```bash
MONGOMS_AVAILABLE=1 npm --workspace belote-server run test
# ou, plus complet :
MONGOMS_AVAILABLE=1 npm run tnr:server
```

Exclus par défaut (certains environnements n'ont pas accès à
`fastdl.mongodb.org`). La CI les exécute dans le job `tnr-server` avec
`MONGOMS_AVAILABLE=1`.

## 6. E2E web — Playwright

`web/playwright.config.ts` lance lui-même le serveur de prévisualisation Vite
(build + preview sur le port 4173), attend qu'il réponde, puis exécute
`web/e2e/*.spec.ts` dans un **navigateur réel** (Chromium par défaut). Traces,
captures et vidéos sont conservées à l'échec (`web/e2e/report`, `web/e2e/.results`).

```bash
npm --workspace belote-web run e2e:install   # 1re fois : télécharge Chromium
npm --workspace belote-web run e2e           # lance les scénarios
npm --workspace belote-web run e2e:report    # ouvre le rapport HTML
```

⚠️ Le **téléchargement du navigateur** nécessite un accès réseau au CDN
Playwright, **indisponible dans le bac à sable de dev** (cf. KB-112). Ces tests
sont donc conçus pour la **CI** (runner avec réseau). En sandbox, le filet E2E
exécutable reste la suite DOM mobile (happy-dom).

## 7. Automatisation — CI

`.github/workflows/ci.yml` orchestre, à chaque push / PR, cinq jobs parallèles :

| Job | Rôle |
| --- | --- |
| `typecheck` | typecheck des 5 workspaces |
| `coverage` | `npm run coverage` (échoue sous les seuils) + artefacts lcov |
| `tnr` | TNR global + artefact `tnr-latest.json` |
| `tnr-server` | TNR serveur **avec `MONGOMS_AVAILABLE=1`** (intégration Mongo réelle) |
| `e2e-web` | installe Chromium puis lance l'E2E Playwright + rapport |

Chaque job publie ses rapports en artefacts téléchargeables.

## 8. Règle de non-régression

Aucune livraison sans `npm run tnr` vert. Tout bug corrigé est accompagné d'un
test qui échouait avant le correctif (ex. KB-272 rejeu `op.seat`, KB-290 émotes
`kind`, KB-300 balance économique). Les seuils de couverture ne doivent jamais
baisser.
