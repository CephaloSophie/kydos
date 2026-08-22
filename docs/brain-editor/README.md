# Éditeur de cerveau de robot — Documentation

> **⚠️ L'éditeur décrit ici n'existe plus.** Son front (`web/src/pages/robot-editor/`)
> a disparu avec le workspace `web/`, supprimé en v16. Ce qui **subsiste** : le module
> serveur `server/src/modules/brain` (API REST de versionnage des cerveaux — projets,
> versions, clone) et le mécanisme d'extension `registerAlgorithm(name, factory)` de
> `belote-core`, toujours résolu par `AlgoSpec.name`. Ces documents restent une bonne
> référence de **conception** si l'éditeur devait être reconstruit (dans le mobile ou
> le back-office), mais aucun des fichiers front qu'ils citent n'est présent.
>
> Pour l'état courant des robots : [`../architecture-robots.md`](../architecture-robots.md)
> et [`../robot-cerveau-config.md`](../robot-cerveau-config.md).


L'**éditeur de cerveau** (`/brain-editor`) est un mini-IDE qui permet d'écrire, tester, versionner et
sauvegarder le « cerveau » d'un robot de belote — c'est-à-dire les fonctions du contrat `RobotAlgorithm`
(`decideBid`, `decideCard`, `shouldContre`, `shouldSurcontre`) en JavaScript, avec des fonctions
personnalisées en plus.

## Documents de ce répertoire

| Document | Contenu |
|----------|---------|
| [`01-module.md`](./01-module.md) | **Document module** : chaque fichier, son rôle, ses exports, ses dépendances. |
| [`02-fonctionnel.md`](./02-fonctionnel.md) | **Document fonctionnel** : ce que l'utilisateur peut faire, écran par écran, cas d'usage. |
| [`03-architecture.md`](./03-architecture.md) | **Document architecture** : couches, flux de données, schémas, intégration front↔serveur. |
| [`04-conception.md`](./04-conception.md) | **Document conception** : choix de design, modèles de données, décisions techniques et alternatives. |
| [`05-editeur-interne.md`](./05-editeur-interne.md) | **Mécanique interne** : helpers via `this`, insertion au curseur, décomposition en composants, descripteur JSON. |

Voir aussi, à la racine de `docs/` :
- [`../architecture-robots.md`](../architecture-robots.md) — architecture du système de robots (AlgoSpec → RobotAlgorithm → Agent).
- [`../robot-cerveau-config.md`](../robot-cerveau-config.md) — guide pratique : où modifier chaque décision.

## Démarrage rapide

1. Ouvrir `/brain-editor` (lien « Éditeur cerveau » dans la navigation).
2. Un projet « Cerveau 1 » en version **V-1.0.0** est créé automatiquement.
3. Choisir une fonction (onglet `decideBid`…), écrire la logique en JavaScript.
4. Régler le **contexte d'aperçu** à droite (cartes, atout, personnalité) ou l'éditer en **JSON complet**.
5. Cliquer **▶ Tester** : la fonction s'exécute sur ce contexte, la **console** affiche le retour + les logs.
6. **💾 Sauvegarder serveur** pour persister (ou laisser l'autosave localStorage faire son travail).
7. **⬇ .ts** pour télécharger la classe `RobotAlgorithm` générée, à déposer dans le projet.

## Principe clé

Le cerveau est une **fonction pure** `(RobotContext) → décision`. L'éditeur ne fait que produire le **corps**
de ces fonctions ; le code généré est une classe enregistrée via `registerAlgorithm(name, factory)`, résolue
par `AlgoSpec.name`. Un robot dont la spec porte ce nom utilise ce cerveau — en local comme en serveur.
