# 05 — Mécanique interne de l'éditeur (helpers, décomposition, JSON)

Ce document complète les quatre précédents avec les choix internes les plus récents :
le modèle d'exécution par `this`, la décomposition en composants, et le descripteur JSON.

---

## 1. Helpers via `this` (et non par paramètres injectés)

### Le problème résolu
Les helpers (`bid`, `play`, `log`, `helpers`) étaient passés comme **paramètres** aux fonctions.
Avec le `"use strict"` du bac à sable, toute déclaration `const bid` (ou `log`/`play`/`helpers`) dans le
code du scripteur provoquait l'erreur fatale **`Identifier 'bid' has already been declared`**. De plus, le
code généré référençait `bid()` / `log` qui n'existaient nulle part dans la classe → non exécutable tel quel.

### Le modèle retenu
Le **seul paramètre** d'une fonction de cerveau est `ctx`. Tout le reste passe par `this` :

```js
decideBid(ctx) {
  const aces = ctx.hand.filter(c => c.rank === 'A').length;  // « const bid » serait permis ici
  this.log.info('enchere', `J'ai ${aces} As`);
  if (aces >= 3) return this.bid('capot', { reason: '3 As' });
  return this.bid('pass', { reason: 'rien' });
}
```

Conséquences :
- **Zéro collision** possible : le scripteur peut nommer ses variables comme il veut.
- **Code généré autonome** : la classe définit elle-même `bid`, `play`, `log`, `helpers` (bloc de helpers
  inséré par le générateur). Le `.ts` téléchargé tourne tel quel dans le moteur.
- **Appels croisés** : une fonction en appelle une autre via `this.maFonction(ctx, ...)`.

### Helpers disponibles (via this)
- `this.bid(action, opts)` → `BidDecision`
- `this.play(card, reason)` → `CardDecision`
- `this.log.info|debug|warn|error(cat, msg, data?)`
- `this.helpers.strength(card, trump)`, `.value(card, trump)`, `.wouldWin(card, ctx)`, `.countSuit(hand, suit)`

### Bonnes pratiques de génération
- **Ne pas muter** les tableaux du contexte : cloner avant tri — `[...ctx.legalCards].sort(...)` (les corps
  par défaut le font). Une `const` triée en place mutait `ctx.legalCards` : corrigé.

---

## 2. Insertion au curseur

Cliquer un élément de la toolbox (contexte, helper, extrait) insère le texte **à la position du curseur**
du panneau principal, et non plus à la fin. L'éditeur capture la vue CodeMirror du panneau de droite
(`onCreateEditor` / `onUpdate`) ; l'insertion dispatch une transaction `{ changes: { from, to, insert } }`
et repositionne le curseur après le texte inséré. Repli : ajout en fin de corps si l'éditeur n'a pas le focus.

---

## 3. Décomposition en composants autonomes

L'éditeur est un **module indépendant** sous `web/src/pages/robot-editor/`, séparé en :

```
Domaine (pur, sans React)
  brainDefs.ts        définitions (fonctions, contexte, helpers, snippets)
  codegen.ts          génération de code + bac à sable (this-based)
  previewContext.ts   contexte d'aperçu + JSON
  themes.ts           thèmes CodeMirror
  editorDescriptor.ts descripteur JSON (cf. §4)

Persistance
  brainStore.ts       localStorage + client API
  useBrainProjects.ts hook projets/versions/autosave/sync

Composants autonomes (présentationnels, sans état propre) — components/
  ConsolePanel.tsx    la console (privée par fonction, onglets, minimisable)
  index.ts            barrel

Assemblage
  BrainEditorPage.tsx câble l'état et compose les composants
```

Les composants sous `components/` ne portent **aucun état** : tout passe par les props. Ils sont testables
isolément et réutilisables. `ConsolePanel` en est le premier ; le découpage se poursuit (toolbox, contexte)
sur le même contrat.

---

## 4. Tout est représentable en JSON (norme KANTO APLO)

`editorDescriptor.ts` décrit l'éditeur **par des données**, pas en dur :

- `EDITOR_LAYOUT` — les panneaux (toolbox, éditeur, contexte, console, barre de projets), leur position,
  s'ils sont repliables.
- `TOOLBOX_DESCRIPTOR` — les sections de la toolbox (fonctions, recherche, contexte, helpers, extraits).
- `RETURN_COLORS` — la couleur par type de retour, **mappée sur l'écosystème** : BidDecision = Hermès orange,
  CardDecision = Synergos émeraude, boolean = Logos bleu, number = Mantis violet.
- `describeBrain(name, theme, customFns)` — les fonctions du cerveau en JSON.
- `describeProject(project)` — le projet et ses versions en JSON.
- `describeEditor({...})` — un **snapshot complet** sérialisable, estampillé `kanto-aplo/brain-editor@1`.

Un moteur de rendu pourrait reconstruire l'éditeur depuis ce seul descripteur. Couvert par des tests
(`editorDescriptor.test.ts`).

---

## 5. Résumé des invariants

1. Une fonction de cerveau = `(ctx) → décision`, helpers via `this`, **aucune collision**.
2. Le code généré est **autonome** et conforme au contrat `RobotAlgorithm`.
3. Les composants UI sont **présentationnels** et **sans état**.
4. La structure de l'éditeur est **entièrement décrite en JSON**.
5. Le module est **indépendant** : domaine pur + persistance + composants + assembleur.
