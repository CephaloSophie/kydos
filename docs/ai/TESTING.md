# Stratégie de test — Kýdos Belote

Pyramide + non-régression + couverture mesurée, automatisée en CI.

## 1. Commandes

```bash
npm run test:all     # core + table-pixi + server + mobile
npm run tnr          # TNR global : typecheck ×4 + tests ×4 + build mobile + démo moteur
npm run tnr:server   # TNR serveur : typecheck + tests + couverture (+ Mongo si dispo)
npm run coverage     # couverture consolidée des 4 workspaces (avec seuils)

# back-office (hors workspaces)
cd back-office/server && npx vitest run
```

Chaque runner écrit un artefact JSON dans `reports/` et sort en code 1 à la moindre
régression : `tnr-latest.json`, `tnr-server-latest.json`, `coverage-latest.json`.

## 2. État des suites sur cet arbre

| Suite | Tests | Remarque |
| --- | --- | --- |
| `belote-core` | 100 | moteur, règles, scoring, tableConfig, robots |
| `@kydos/table-pixi` | 73 | layout, thèmes, HUD, mascottes, tri de main |
| `belote-server` | 216 | **liste blanche de tests purs** par défaut (voir §4) |
| `belote-mobile` | 185 verts / **3 échecs pré-existants** | voir §5 |
| `back-office/server` | 54 | score Kýdos, analytics, statut, détail tournoi |

## 3. Pyramide

| Niveau | Emplacement | Portée |
| --- | --- | --- |
| Unitaire moteur | `packages/core/src/**/*.test.ts` | règles, scoring, scénarios, config de table, format du replay |
| Unitaire table | `packages/table-pixi/**/*.test.ts` | layout, thèmes, responsive, placement du pli, mascottes |
| Contrat API | `server/src/test/api.contract.test.ts` | routes, auth, forme des erreurs |
| Unitaire serveur | `server/src/**/*.test.ts` (purs) | permissions, économie, formats, queue, bracket, thèmes, avatars |
| Intégration serveur | tests important `setupMongo` | Mongo réel — **opt-in** (§4) |
| Unitaire mobile | `mobile/src/{data,services,domain}/**` | cache de session, économie, sons, parité des robots |
| E2E mobile | `mobile/src/test/screens.e2e.test.ts` | tous les écrans en DOM réel (happy-dom) + faux serveur |
| Back-office | `back-office/server/src/*.test.ts` | logiques pures miroir |

**Parité des robots** — `mobile/src/services/localGame.parity.test.ts` garantit qu'un
robot au même `algoSpec` décide à l'identique côté mobile et côté core. C'est le
filet qui interdit de dupliquer une heuristique dans un pilote.

## 4. ⚠️ Le piège de la liste blanche serveur

`mongodb-memory-server` télécharge son binaire depuis `fastdl.mongodb.org` : impossible
dans un environnement sans réseau sortant. `server/vitest.config.ts` maintient donc,
par défaut, une **liste blanche explicite de tests purs** ; la suite complète ne tourne
qu'avec `MONGOMS_AVAILABLE=1`.

```bash
MONGOMS_AVAILABLE=1 npm --workspace belote-server run test   # suite complète
MONGOMS_AVAILABLE=1 npm run tnr:server                       # + couverture
```

> **Conséquence pratique** : un nouveau test serveur pur **doit être ajouté à cette
> liste** dans `server/vitest.config.ts`, sinon il n'est jamais exécuté. C'est
> silencieux — aucun message ne signale un test oublié.

## 5. Échecs pré-existants connus (mobile)

3 tests d'accueil de `mobile/src/test/screens.e2e.test.ts` échouent **avant toute
modification** : l'écran d'accueil a 4 cartes-fonctionnalités quand le test en attend
3, et le menu « Jouer en ligne » a bougé.

**Ne pas les « corriger » par accident** en croyant avoir cassé quelque chose : ils
sont rouges sur `main`. Les corriger est un travail à part entière (décider ce que
l'accueil doit contenir, puis aligner le test).

## 6. E2E mobile — le faux serveur

`mobile/src/test/fakeServer.ts` intercepte `fetch` et répond exactement comme le vrai
serveur (mêmes chemins, payloads, statuts). La vraie couche `ApiClient` est donc
exercée : en-têtes, parsing, 401. Le journal `calls[]` permet d'asserter qu'un écran
interroge bien les bons endpoints.

Chaque écran est monté en DOM réel (happy-dom). La table Pixi (WebGL) est remplacée
par un composant inerte : la **logique** de l'écran de jeu reste testée, pas son rendu.

> Il n'y a **plus d'E2E navigateur** : la suite Playwright vivait dans le workspace
> `web/`, supprimé en v16. Le filet E2E exécutable est la suite DOM mobile.

## 7. Couverture

Vitest + provider v8 dans chaque workspace, rapports `text-summary`, `html`, `lcov`
et `json-summary`. `npm run coverage` agrège les résumés et affiche un tableau.

Des **seuils par workspace** (dans chaque `vitest.config.ts`) font échouer la commande
en cas de régression. Ils sont calés sous le niveau courant et remontés progressivement
— **effet cliquet : ils ne doivent jamais baisser.**

## 8. CI

`.github/workflows/ci.yml`, à chaque push / PR sur `main` et `develop` :

| Job | Rôle |
| --- | --- |
| `typecheck` | typecheck des 4 workspaces |
| `coverage` | `npm run coverage` (échoue sous les seuils) + artefacts lcov |
| `tnr` | TNR global + artefact `tnr-latest.json` |
| `tnr-server` | TNR serveur **avec `MONGOMS_AVAILABLE=1`** (intégration Mongo réelle) |

Le back-office n'est pas encore couvert par la CI : ses tests se lancent à la main
depuis `back-office/server`.

## 9. Règle de non-régression

Aucune livraison sans TNR vert. **Tout bug corrigé est accompagné d'un test qui
échouait avant le correctif** — c'est la règle la plus appliquée du dépôt (rejeu
`op.seat`, émotes `kind`, balance économique, cache de thème, bracket monotone…).
