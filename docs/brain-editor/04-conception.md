# Document conception — Éditeur de cerveau

Choix de conception, décisions techniques, alternatives écartées.

---

## 1. Principe directeur

Le Scripteur doit pouvoir **coder lui-même** le cerveau, proprement, sans risque de casser le moteur.
Conséquence de conception : l'éditeur produit uniquement des **corps de fonctions** conformes au contrat
`RobotAlgorithm` ; il ne génère jamais de logique moteur. Le couplage au jeu reste hors de l'éditeur.

---

## 2. Décisions structurantes

### D1 — Édition par CODE (pas par nœuds)
**Choix** : éditeur JavaScript (CodeMirror), pas un éditeur visuel à nœuds.
**Raison** : la logique de décision (conditions imbriquées, calculs de probabilité modulés par l'agressivité)
s'exprime mal en blocs ; le code est plus direct et plus puissant pour ce public (Scripteur développeur).
**Alternative écartée** : éditeur à nœuds (prototype initial), abandonné car peu lisible et limité.

### D2 — Fonctions = corps seuls, assemblage déterministe
**Choix** : l'utilisateur n'écrit que le **corps** ; `generateBrainCode` ajoute la signature, la classe,
l'enregistrement. **Raison** : garantit un code généré toujours valide et conforme au contrat, et un export
prêt à brancher. **Conséquence** : le registre (`registerAlgorithm`) est le point d'entrée unique.

### D3 — Bac à sable d'aperçu via `new Function`
**Choix** : exécuter la fonction avec `ctx/log/bid/play/helpers` injectés, et les autres fonctions liées sur
`this`. **Raison** : tester sans lancer une partie, en isolation totale. **Limite assumée** : helpers
simplifiés (`wouldWin` non branché sur le vrai moteur) — l'aperçu sert à **prototyper la logique**, pas à
rejouer une vraie partie. **Sécurité** : périmètre éditeur (outil de développement), pas d'exécution de code
tiers non maîtrisé.

### D4 — Contexte d'aperçu éditable, double vue (réglages + JSON)
**Choix** : un même `CtxSettings` exposé en réglages rapides (sliders, cartes) **et** en JSON complet
(AlgoSpec incluse). **Raison** : les réglages couvrent le quotidien ; le JSON donne l'accès total au génome.
`contextToJson`/`applyContextJson` assurent la cohérence. **Choix** : application JSON **explicite** (bouton)
plutôt qu'à chaque frappe, pour ne pas casser l'aperçu pendant la saisie d'un JSON incomplet.

### D5 — Console PRIVÉE par fonction
**Choix** : logs et résultat indexés par clé de fonction. **Raison** : chaque fonction a son propre flux de
décision ; mélanger les logs nuirait au débogage. **Conséquence** : un sélecteur de fonction dans la console.

### D6 — Persistance LOCAL-FIRST + serveur best-effort
**Choix** : localStorage est la source de vérité immédiate ; le serveur est synchronisé à la demande.
**Raison** : ne jamais perdre le travail (même hors-ligne ou sans backend), tout en permettant le stockage
durable et le partage via l'API. **Conséquence** : un id local (`local_…`) est remplacé par l'id serveur à la
première sauvegarde réussie.

### D7 — Versionnage par PROJET
**Choix** : un projet contient plusieurs versions ; chaque version est un instantané complet (fonctions +
code généré + contexte). **Raison** : itérer sans perdre l'historique, comparer, revenir en arrière.
**Règle** : nouveau projet → V-1.0.0 ; nouvelle version → copie de l'active, étiquette `V-1.x.0` incrémentée.

---

## 3. Modèles de données

### Modèle d'éditeur (front, en mémoire)
```ts
EditorModel {
  brainName: string
  bodies: Record<fnKey, string>     // corps JS par fonction
  customFns: CustomFn[]             // { key, params, returns }
  previewSettings: CtxSettings      // contexte d'aperçu
}
```

### Version persistée
```ts
BrainVersion {
  label: string                     // "V-1.0.0"
  brainName: string                 // = AlgoSpec.name
  functions: BrainFunction[]        // { key, params, returns, body, custom }
  generatedCode: string             // TypeScript (texte)
  previewSettings: CtxSettings | null
  createdAt: string
}
```

### Contexte d'aperçu
```ts
CtxSettings {
  hand: { rank, suit }[]            // 8 cartes éditables
  trump, phase
  aggressiveness, concentration, velocity   // personnalité
  partnerBidValue/Suit, currentBidValue/Suit
  canContre, canSurcontre
  spec: AlgoSpec                    // génome complet, éditable
}
```

---

## 4. Conventions de génération de code

- Nom de classe = `brainName` nettoyé (`[^A-Za-z0-9]` retiré), défaut `MonCerveau`.
- Méthodes du contrat : `decideBid/decideCard(ctx)`, `shouldContre/shouldSurcontre(ctx)`.
- Méthodes custom : signature `key(params)`, appelables via `this.key(...)`.
- Paramètres injectés (`ctx/log/bid/play/helpers`) filtrés des paramètres déclarés pour éviter les doublons.
- Pied : `registerAlgorithm('<brainName>', factory)` + `export { <Class> }`.

---

## 5. Limites connues (assumées)

1. **Aperçu approximatif** : `helpers.wouldWin` est simplifié (non branché sur le moteur). Prochain incrément :
   brancher le vrai calcul de pli pour un aperçu fidèle.
2. **Sécurité du sandbox** : `new Function` exécute du code dans le navigateur du Scripteur — acceptable pour
   un outil de développement, à isoler davantage si l'éditeur devient multi-utilisateur partagé.
3. **Pas de typage à l'exécution** : le code écrit est du JS ; les types du contrat ne sont pas vérifiés à
   l'aperçu (ils le seront à la compilation une fois le `.ts` déposé dans le projet).
4. **Serveur non éprouvé en sandbox** : le module `brain` est validé par typecheck strict ; non testé contre
   une instance MongoDB réelle dans l'environnement de développement.

---

## 6. Évolutions possibles

- Brancher le vrai moteur dans l'aperçu (rejouer un pli réel).
- Comparer deux versions (diff) ; importer un `.ts` existant.
- Bibliothèque de cerveaux partagée (lecture seule) entre Scripteurs.
- Édition assistée : autocomplétion du `ctx.*` typée, lint des décisions retournées.
