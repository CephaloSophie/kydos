# Document architecture — Éditeur de cerveau

Couches, flux de données et intégration front ↔ serveur.

---

## 1. Vue en couches

```
┌──────────────────────────────────────────────────────────────────────┐
│ PRÉSENTATION (React)                                                 │
│   BrainEditorPage.tsx — assemble l'UI, câble les effets             │
│   ├── toolbox, éditeurs (CodeMirror), panneau contexte, console     │
│   └── thèmes (themes.ts)                                             │
├──────────────────────────────────────────────────────────────────────┤
│ ÉTAT & ORCHESTRATION                                                 │
│   useBrainProjects.ts — projets, versions, autosave, sync           │
├──────────────────────────────────────────────────────────────────────┤
│ DOMAINE ÉDITEUR (pur, sans React)                                   │
│   brainDefs.ts      — quoi éditer / quel contexte                   │
│   codegen.ts        — modèle → code, et bac à sable d'exécution     │
│   previewContext.ts — contexte d'aperçu + (dé)sérialisation JSON    │
├──────────────────────────────────────────────────────────────────────┤
│ PERSISTANCE                                                          │
│   brainStore.ts — localStorage (brouillon) + client API REST        │
├──────────────────────────────────────────────────────────────────────┤
│ SERVEUR (Express + Mongoose)                                        │
│   module brain — routes → controller → service → model (MongoDB)    │
└──────────────────────────────────────────────────────────────────────┘
```

Chaque couche ne dépend que de la couche inférieure. Le **domaine éditeur** (brainDefs, codegen,
previewContext) est **pur** (pas de React, pas de réseau) : testable isolément.

---

## 2. Flux — éditer puis tester une fonction

```
Scripteur tape du code
        │
        ▼
BrainEditorPage : setBodies({ [fn]: code })
        │
        ▼ (clic ▶ Tester)
runFunctionPreview(fn, body, buildPreviewContext(ctx), [], othersMap)
        │   ├── injecte ctx/log/bid/play/helpers
        │   └── lie les autres fonctions sur `this` (appels croisés)
        ▼
{ ok, result, logs }
        │
        ▼
console PAR fonction : logsByFn[fn], resultByFn[fn]
```

---

## 3. Flux — contexte d'aperçu éditable

```
Réglages (cartes, sliders)            JSON complet (panneau)
        │                                     │
        ▼                                     ▼
   setCtx(patch)  ◀───── applyContextJson(json, ctx) ─────  édition JSON + « Appliquer »
        │                                     ▲
        ▼                                     │
buildPreviewContext(ctx)  ─── contextToJson(ctx) ───────────┘
        │
        ▼
RobotContext d'aperçu (hand, personality, spec/AlgoSpec, table, legalBidInfo…)
        │
        ▼  utilisé par ▶ Tester
runFunctionPreview(...)
```

Le JSON et les réglages décrivent **le même** contexte : éditer l'un met à jour l'autre via
`contextToJson` / `applyContextJson`. Modifier le JSON impacte donc cartes, réglages et AlgoSpec.

---

## 4. Flux — génération de code

```
{ name, bodies, customFns }  (modèle d'éditeur)
        │
        ▼
generateBrainCode(model)
        │
        ▼
class <Name> { decideBid(ctx){…} … méthodes custom … }
registerAlgorithm('<Name>', (spec, …) => new <Name>(…))
        │
        ▼  (⬇ .ts) déposé dans le projet
resolveAlgorithm(spec) → ce cerveau quand AlgoSpec.name === '<Name>'
```

L'éditeur ne produit que des **corps de fonctions** ; l'assemblage en classe + l'enregistrement sont
déterministes. Le cerveau exporté respecte le même contrat `RobotAlgorithm` que le cerveau par défaut.

---

## 5. Flux — persistance (versions)

```
État éditeur (name, bodies, customFns, ctx)
        │  autosave (débounce 500 ms)
        ▼
useBrainProjects.saveVersion(version)
        │
        ├── localStorage (source de vérité locale)  ── anti-perte
        │
        └── (clic 💾) saveToServer()
                 │
                 ▼
            brainApi.create / updateVersion / addVersion …
                 │
                 ▼
            POST/PUT /api/brains…  ── controller ── service ── BrainProjectModel (MongoDB)
```

**Local-first** : le navigateur garde toujours une copie. Le serveur est synchronisé à la demande
(ou en remplacement de l'id local par l'id serveur après création).

---

## 6. Modèle de données

```
BrainProject
├── owner            (User)
├── title, description
├── activeVersion    (index)
└── versions[]
     ├── label              "V-1.0.0", "V-1.1.0"…
     ├── brainName          = AlgoSpec.name
     ├── functions[]        { key, params, returns, body, custom }
     ├── generatedCode      (texte TypeScript)
     └── previewSettings    (contexte d'aperçu sauvegardé)
```

Côté front, la conversion se fait par `modelToFunctions` (éditeur → version) et `functionsToModel`
(version → éditeur).

---

## 7. API REST (module brain, sous /api, authentifié)

```
GET    /brains                 → liste (résumés)
POST   /brains                 → créer (V-1.0.0 d'office)
GET    /brains/:id             → projet complet (toutes versions)
PUT    /brains/:id/versions/:v → mettre à jour une version
POST   /brains/:id/versions    → ajouter une version (copie l'active, V-1.x.0)
PUT    /brains/:id/active/:v   → changer la version active
POST   /brains/:id/clone       → cloner le projet
DELETE /brains/:id             → supprimer
```

Le module suit le contrat `AppModule` (monté en une ligne dans `modules/index.ts`), comme les autres
domaines du serveur (model + service + controller + routes + index).

---

## 8. Intégration avec le système de robots

Le code généré s'inscrit dans l'architecture existante (voir `../architecture-robots.md`) :

```
AlgoSpec (génome, name) ──► resolveAlgorithm ──► RobotAlgorithm
                                   │
                  registre ◄──── registerAlgorithm('<Name>', factory)   ← code généré par l'éditeur
                                   │
                                   ▼
                        buildRobotContext (moteur) ──► décisions (4 pilotes : front, compétition, live, démo)
```

L'éditeur ne touche pas au moteur : il produit un cerveau conforme au contrat, branché par le **registre**.
