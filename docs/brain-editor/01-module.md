# Document module — Éditeur de cerveau

Inventaire technique de chaque fichier du module, son rôle, ses exports et ses dépendances.

---

## Vue d'ensemble des fichiers

```
Frontend — web/src/pages/robot-editor/
├── BrainEditorPage.tsx   (469 l.) — Composant page : assemble toute l'UI de l'éditeur.
├── brainDefs.ts          (204 l.) — Définitions : fonctions du contrat, contexte, helpers, snippets.
├── codegen.ts            (124 l.) — Génération de code + bac à sable d'exécution (aperçu).
├── previewContext.ts     (114 l.) — Contexte d'aperçu éditable : donne, réglages, AlgoSpec, (dé)sérialisation JSON.
├── themes.ts             ( 51 l.) — Thèmes CodeMirror (Noir par défaut + One Dark).
├── brainStore.ts         (111 l.) — Persistance : types, localStorage (brouillon), client API.
└── useBrainProjects.ts   (143 l.) — Hook : projets, versions, autosave local, sync serveur.

Backend — server/src/modules/brain/
├── brain.model.ts        ( 50 l.) — Schéma Mongoose : BrainProject → versions → fonctions.
├── brain.service.ts      (137 l.) — Logique métier : CRUD projets + versions.
├── brain.controller.ts   ( 15 l.) — Adaptateurs HTTP (req/res → service).
├── brain.routes.ts       ( 14 l.) — Routes REST sous /api.
└── index.ts              (  5 l.) — Déclaration du module (AppModule).
```

---

## Frontend

### `brainDefs.ts`
Définit **ce qui est éditable** et **ce qui est accessible** dans une fonction de cerveau.

- `BRAIN_FNS: BrainFn[]` — les 4 fonctions du contrat (`decideBid`, `decideCard`, `shouldContre`,
  `shouldSurcontre`) avec leur signature, leur documentation et un **corps par défaut pédagogique**.
- `CONTEXT_REFERENCE: CtxGroup[]` — la palette du `RobotContext` accessible, groupée (Identité, Ma main,
  Personnalité/Génome, Table, Légalité), chaque entrée typée et documentée. Sert à l'insertion par clic.
- `HELPERS_REFERENCE` — les helpers injectés (`log`, `bid()`, `play()`, `helpers.*`).
- `SNIPPETS` — extraits de code insérables.

**Exports** : `BrainFn`, `BRAIN_FNS`, `CtxEntry`, `CtxGroup`, `CONTEXT_REFERENCE`, `HELPERS_REFERENCE`, `SNIPPETS`.
**Dépendances** : aucune (données pures).

### `codegen.ts`
Transforme le modèle d'éditeur en **code** et exécute les fonctions en **aperçu**.

- `generateBrainCode(model): string` — assemble les corps des fonctions (contrat + custom) en une **classe**
  `RobotAlgorithm` complète, avec l'appel `registerAlgorithm(name, factory)`. Les fonctions custom deviennent
  des méthodes (paramètres respectés).
- `runFunctionPreview(fnKey, body, ctx, args, others)` — **bac à sable** : exécute une fonction via `new Function`,
  avec `ctx/log/bid/play/helpers` injectés, et les **autres fonctions** liées sur `this` pour les appels croisés
  (`this.maFonction(...)`). Retourne `{ ok, result, logs, error }`, les logs étant structurés (`LogLine`).

**Exports** : `CustomFn`, `BrainModel`, `LogLine`, `generateBrainCode`, `runFunctionPreview`.
**Dépendances** : `brainDefs` (BRAIN_FNS).

### `previewContext.ts`
Le **contexte d'aperçu** sur lequel on teste les fonctions, entièrement éditable.

- `dealHand(rng)` — distribue 8 cartes distinctes d'un jeu de 32 (comme une vraie donne).
- `CtxSettings` — réglages éditables : main, atout, personnalité, phase, annonces, légalité, et **`spec`**
  (l'AlgoSpec/génome complète).
- `defaultSpec()` / `defaultSettings()` — valeurs par défaut.
- `buildPreviewContext(s)` — construit le `RobotContext` d'aperçu à partir des réglages.
- `contextToJson(s)` — sérialise le contexte complet en JSON beautifié.
- `applyContextJson(json, prev)` — applique un JSON édité → patch `CtxSettings` (impacte cartes, réglages, AlgoSpec).

**Exports** : `RANKS`, `SUITS`, `SUIT_SYM`, `SUIT_RED`, `DCard`, `dealHand`, `CtxSettings`, `defaultSpec`,
`defaultSettings`, `buildPreviewContext`, `contextToJson`, `applyContextJson`.
**Dépendances** : aucune.

### `themes.ts`
Thèmes de l'éditeur de code (CodeMirror).

- `THEMES` — dictionnaire de thèmes. `noir` (fond #000, coloration syntaxique dédiée via `EditorView.theme`
  + `HighlightStyle`) par défaut ; `oneDark` conservé.

**Exports** : `THEMES`, `ThemeKey`.
**Dépendances** : `@codemirror/view`, `@codemirror/language`, `@lezer/highlight`, `@codemirror/theme-one-dark`.

### `brainStore.ts`
Couche de **persistance** (types + localStorage + API).

- Types : `BrainFunction`, `BrainVersion`, `BrainProject`, `BrainProjectSummary`, `EditorModel`.
- (Dé)sérialisation : `modelToFunctions`, `functionsToModel`.
- localStorage : `saveDraft`, `loadDraft`, `clearDraft` (brouillon courant, anti-perte).
- `brainApi` — client REST (`list`, `get`, `create`, `updateVersion`, `addVersion`, `switchVersion`, `clone`,
  `remove`), avec en-têtes d'authentification et base d'URL `VITE_API_URL` (défaut `/api`).

**Exports** : tous les types ci-dessus + `modelToFunctions`, `functionsToModel`, `saveDraft`, `loadDraft`,
`clearDraft`, `brainApi`.
**Dépendances** : `codegen` (CustomFn), `previewContext` (CtxSettings).

### `useBrainProjects.ts`
Hook React qui **orchestre projets + versions** (local-first, sync serveur best-effort).

- État : liste de projets (localStorage), projet courant, version active, liste serveur, état de sync.
- Actions : `open`, `newProject`, `saveVersion`, `addVersion`, `switchVersion`, `cloneProject`,
  `removeProject`, `saveToServer`, `loadServerList`, `loadFromServer`.
- Effets : persistance locale à chaque changement, sauvegarde du brouillon, incrément de version `V-1.x.0`.

**Exports** : `UseBrainProjects`, `SyncState`, `useBrainProjects`, `loadDraft`.
**Dépendances** : `brainStore`.

### `BrainEditorPage.tsx`
Le **composant page** : assemble la barre du haut, la barre de projets/versions, la toolbox, les éditeurs
(simple ou split), le panneau de contexte (cartes + réglages + JSON), et la console par fonction.
Câble les effets de chargement de version et l'autosave.

**Exports** : `BrainEditorPage`.
**Dépendances** : tous les modules ci-dessus + `@uiw/react-codemirror`, `@codemirror/lang-javascript`.

---

## Backend — module `brain`

### `brain.model.ts`
Schémas Mongoose imbriqués :
- `BrainFunctionSchema` : `{ key, params, returns, body, custom }`.
- `BrainVersionSchema` : `{ label, brainName, functions[], generatedCode, previewSettings, createdAt }`.
- `BrainProjectSchema` : `{ owner, title, description, versions[], activeVersion }` + timestamps.

**Exports** : `BrainProjectAttributes`, `BrainProjectModel`.

### `brain.service.ts`
Logique métier (classe `BrainService`, instance `brainService`) :
- `listByOwner`, `getOne`, `create` (V-1.0.0 d'office), `updateVersion`, `addVersion` (incrément `V-1.x.0`,
  copie l'active), `switchVersion`, `clone`, `remove`.
- Helpers internes : `nextVersionLabel`, `summarize`, `fullProject`.

**Exports** : `BrainService`, `brainService`.
**Dépendances** : `brain.model`, `core/HttpError`.

### `brain.controller.ts` / `brain.routes.ts` / `index.ts`
- Controller : adaptateurs `req/res` → `brainService` (un par endpoint).
- Routes : `GET/POST /brains`, `GET /brains/:id`, `PUT /brains/:id/versions/:v`, `POST /brains/:id/versions`,
  `PUT /brains/:id/active/:v`, `POST /brains/:id/clone`, `DELETE /brains/:id` — toutes sous `requireAuthentication`.
- index : `brainModule: AppModule` (monté sous `/api`), réexporte `BrainProjectModel`.

---

## Graphe de dépendances (front)

```
BrainEditorPage
   ├── brainDefs        (définitions)
   ├── codegen ─────────── brainDefs
   ├── previewContext   (contexte d'aperçu)
   ├── themes           (CodeMirror)
   └── useBrainProjects ── brainStore ── codegen, previewContext
```
