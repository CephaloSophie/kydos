# belote-core — Contrat public (figé en v6.0.0)

`belote-core` est le **moteur pur** de la plateforme. À partir de la **v6.0.0**, sa surface publique
est considérée comme **stable** : les symboles ci-dessous ne disparaîtront pas et ne changeront pas de
signature sans bump majeur (SemVer). C'est le socle sur lequel le front, le serveur et les cerveaux custom
peuvent s'appuyer sans crainte de rupture.

## Surfaces stables

### Domaine
- `Card`, `Suit`, `Rank`, helpers de cartes (`domain/cards`)
- Types partagés : `Seat`, `Bid`, `BidDecision`, `CardDecision`, `Personality`, `RobotConfig`,
  `TableContext`, `EngineView`, `ScoreSummary`, `TrickView` (`domain/types`)

### Règles & score
- `RulesEngine`, `ContreeRules`, `RulesConfig` (barème, arrondi, contrat)
- `scoring` : `roundPoints`, `scoreManche`, `cardValue`, `cardStrength`, `computeReward`

### Moteur
- `GameEngine` (phases, légalité, soumission d'enchère/carte)
- `RobotDriver` : `robotFromFiche`, `makeRobot`, `createAlgorithm`, `robotAct`, `shouldSurcontrer`

### Configuration de table (instanciation)
Une table se configure via un objet d'options « métier » traduit en objets moteur
par des helpers PURS (aucune I/O) :
- `resolveTableConfig(opts)` → `{ rulesConfig, partieConfig }` — point d'entrée unique.
- `resolveRulesConfig(opts)` / `resolvePartieConfig(opts)` — granularité fine.
- Options (`TableConfigOptions`) : `manches`, `baseTarget`, `labelTarget`,
  `openingBidMin` (score initial des enchères → `minBid`),
  `countBelote` (belote comptée dans le score → prime 20 ou 0),
  `clockwise` (sens du jeu), `responseTimeMs`, `maxPlayTimeMs`, `local`, `signals`.

```ts
const { rulesConfig, partieConfig } = resolveTableConfig({ openingBidMin: 100, countBelote: false, clockwise: true });
const engine = new GameEngine(players, partieConfig, new ContreeRules(rulesConfig));
```

### Robots (cœur extensible)
- `AlgoSpec` (génome) + `normalizeAlgo`, `algoToRuntime`, presets `ALGO_CLASSIQUE`, `ALGO_AGRESSIF`, `DEFAULT_ALGO`
- `Agent` + `createAgent` (individu instanciable depuis une spec seule)
- `RobotAlgorithm` (CONTRAT : `decideBid`, `decideCard`, `shouldContre`, `shouldSurcontre`) + `RobotContext`
- `SpecAlgorithm` (implémentation par défaut)
- `registry` : `registerAlgorithm`, `resolveAlgorithm` (branchement d'un cerveau custom par `AlgoSpec.name`)
- Conventions : `BiddingConvention`, `StandardContreeConvention`
- `RobotBrain`
- Workflow : `WorkflowAlgorithm`, steps

## Garanties

1. **Pureté** : aucun symbole public ne dépend du réseau, du DOM ou d'un stockage. Tout est déterministe
   à partir des entrées.
2. **Portabilité** : la même API fonctionne en local (front) et non-local (serveur). Les 4 pilotes
   (entraînement, compétition, live, démo) consomment exactement ce contrat.
3. **Extensibilité** : un cerveau custom s'ajoute via `registerAlgorithm(name, factory)` sans modifier
   le moteur ; il est résolu par `AlgoSpec.name`.
4. **Stabilité SemVer** : retrait ou changement de signature d'un symbole public ⇒ version **majeure**.

## Point d'entrée

```ts
import {
  GameEngine, ContreeRules, createAgent, registerAlgorithm,
  ALGO_AGRESSIF, type RobotAlgorithm, type RobotContext,
} from 'belote-core';
```

Voir `docs/architecture-robots.md` et `docs/robot-cerveau-config.md` pour l'usage détaillé.
