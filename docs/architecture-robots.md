# Architecture technique — Cerveaux des robots

Documentation technique complète du système `AlgoSpec → RobotAlgorithm → Agent` :
comment les robots pensent, comment les manipuler, comment ils tournent en front et en back.

---

## Vue d'ensemble — du JSON au coup joué

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DONNÉES (JSON, stocké)                       │
│                                                                      │
│   RobotFiche (MongoDB)                                               │
│   ├── id, name, personality                                          │
│   ├── responseTimeMs, maxPlayTimeMs                                  │
│   └── algoSpec ─────────────────┐                                    │
│                                 │                                    │
│                                 ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │  AlgoSpec  (le GÉNOME — données pures, JSON, versionné) │        │
│   │  ├── version: 1                                          │        │
│   │  ├── name: "Agressif"                                    │        │
│   │  ├── personality: { aggressiveness, concentration, ... } │        │
│   │  ├── bidding: { seuils d'ouverture, points par As, ... } │        │
│   │  ├── contre: { enabled, minOpponentRisk, minOwnStrength }│        │
│   │  ├── play: { aggressiveness }                            │        │
│   │  └── workflow?: { bid, play, flag pipelines }            │        │
│   └─────────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────────┘
                                 │
            robotFromFiche()     │    ou createAgent({ spec })
            + normalizeAlgo()    │    (fusionne avec les défauts)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      CONSTRUCTION (une seule fois)                   │
│                                                                      │
│   RobotConfig (individu complet)                                     │
│        │                                                             │
│        ├── createBrain(robot, rules)                                 │
│        │       └── AlgoSpec → algoToRuntime() → AlgoRuntime          │
│        │               ├── convention: StandardContreeConvention      │
│        │               └── playAggressiveness: number                │
│        │       └── RobotBrain (logique d'enchère + carte)            │
│        │                                                             │
│        └── createAlgorithm(robot, rules)                             │
│                └── normalizeAlgo(spec)                                │
│                └── resolveAlgorithm(spec, brain, timing)             │
│                        │                                             │
│                ┌───────┼─────────────────────┐                       │
│                ▼       ▼                     ▼                       │
│           Registre   Workflow          SpecAlgorithm                  │
│           custom?    JSON?             (par défaut)                   │
│                                                                      │
│                        ▼                                             │
│         ┌──────────────────────────────────┐                         │
│         │  RobotAlgorithm (le CERVEAU)     │                         │
│         │  ├── decideBid(ctx)   → BidDecision                        │
│         │  ├── decideCard(ctx)  → CardDecision                       │
│         │  ├── shouldContre(ctx) → boolean                           │
│         │  └── shouldSurcontre(ctx) → boolean                        │
│         └──────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 │  à chaque tour de jeu
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      EXÉCUTION (chaque tour)                         │
│                                                                      │
│   robotAct(engine, seat, algo)                                       │
│        │                                                             │
│        ├── buildRobotContext(engine, seat, spec)                      │
│        │       (traduit le moteur en RobotContext lecture seule)      │
│        │                                                             │
│        ├── appelle algo.decideBid(ctx) ou algo.decideCard(ctx)       │
│        │                                                             │
│        └── retourne { kind:'bid'|'play', bid|card, thinkMs }         │
│                                                                      │
│   Le PILOTE (LocalTableEngine / competition.runner / liveGame)       │
│   applique l'action au moteur + attend thinkMs (délai humain)        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Couche 1 — `AlgoSpec` (le génome)

**Fichier** : `packages/core/src/robot/AlgoSpec.ts`

L'`AlgoSpec` est un objet JSON pur, **sans aucun code**, qui décrit entièrement le comportement
d'un robot. C'est le « génome » : on peut le stocker en base (MongoDB), le transmettre via l'API,
le comparer, le muter, le versionner — c'est juste de la donnée.

### Structure complète

```ts
interface AlgoSpec {
  version: 1;                              // version du schéma (migrations futures)
  name: string;                            // "Classique", "Agressif"...
  personality: Personality;                 // tempérament (3 axes)
  bidding: Partial<ConventionConfig>;       // règles d'enchère
  contre: {                                // décisions de contre/surcontre
    enabled: boolean;
    minOpponentRiskToContre: number;        // seuil 0..1
    minOwnStrengthToSurcontre: number;      // seuil 0..1
  };
  play: {                                  // réglages de jeu de la carte
    aggressiveness?: number;               // 0..10 (défaut = personality.aggressiveness)
  };
  workflow?: AlgoWorkflow;                  // pipeline custom (optionnel)
}
```

### Les 3 axes de personnalité (`Personality`)

```ts
interface Personality {
  aggressiveness: number;   // 0..10 — tendance à ouvrir / monter / contrer
  concentration: number;    // 0..10 — précision de l'évaluation de la main
  velocity: number;         // 0..10 — vitesse de réflexion (thinkMs multiplier)
}
```

### Convention d'enchère (`ConventionConfig`)

Chaque robot hérite de la convention par défaut, et l'`AlgoSpec.bidding` permet de surcharger
les paramètres sans tout réécrire :

| Paramètre               | Défaut | Rôle                                                |
|--------------------------|--------|-----------------------------------------------------|
| `acePoints`              | 10     | Points de signal par As hors-atout                  |
| `valetTrumpPoints`       | 10     | Points pour le Valet d'atout                        |
| `nineTrumpPoints`        | 10     | Points pour le 9 d'atout                            |
| `lengthBonusThreshold`   | 2      | Seuil de longueur pour bonus                        |
| `lengthBonusPerExtra`    | 10     | Bonus par atout supplémentaire au-dessus du seuil   |
| `minTrumpToSaySuit`      | 2      | Minimum d'atouts pour annoncer la couleur           |
| `weakOpenValue`          | 90     | Ouverture faible (valeur minimum)                   |
| `strongOpenValue`        | 100    | Ouverture forte                                     |
| `strongOpenMinTrump`     | 4      | Nb min d'atouts pour une ouverture forte (V+9 requis)|
| `weakOpenMinTrump`       | 4      | Nb min de cartes dans la couleur pour ouverture faible|
| `weakOpenKeyMinTrump`    | 3      | Nb min de cartes si on a le V ou le 9               |
| `holdAcesOnWeakOpen`     | true   | Garder les As sur ouverture faible sans Valet ?     |
| `deepThinkTrumpThreshold`| 3      | Nb d'atouts pour réflexion ×2                       |
| `maxBid`                 | 180    | Enchère maximale                                    |

### Seuils de contre/surcontre

Deux heuristiques pures paramétrisées par la spec :

- **`opponentFailRisk`** — estimation du « risque de chute adverse » :
  score basé sur la valeur du contrat, le nombre d'atouts en main, la présence de V/9,
  les As hors-atout, et l'agressivité. Si `risk >= minOpponentRiskToContre` → le robot contre.

- **`ownStrength`** — force propre estimée :
  score basé sur la longueur d'atout, V/9, As, et l'agressivité.
  Si `strength >= minOwnStrengthToSurcontre` → le robot surcontre.

### Presets fournis

| Preset            | Agressivité | Seuil contre | Seuil surcontre | Remarque                 |
|-------------------|-------------|--------------|-----------------|--------------------------|
| `ALGO_CLASSIQUE`  | 5           | 0.65         | 0.80            | Équilibré, prudent       |
| `ALGO_AGRESSIF`   | 9           | 0.50         | 0.70            | Monte vite, contre souvent|

### Créer un nouveau tempérament

**Aucun code** — juste un nouvel objet :

```ts
const MON_ALGO: AlgoSpec = {
  version: 1,
  name: 'Prudent',
  personality: { aggressiveness: 2, concentration: 8, velocity: 3 },
  bidding: { weakOpenMinTrump: 5, holdAcesOnWeakOpen: true },
  contre: { enabled: false, minOpponentRiskToContre: 0.9, minOwnStrengthToSurcontre: 0.95 },
  play: { aggressiveness: 2 },
};
```

Ou en partiel (fusionné défensivement avec les défauts par `normalizeAlgo`) :

```ts
const spec = normalizeAlgo({ name: 'Timide', personality: { aggressiveness: 1 } });
// → tous les autres champs reçoivent les valeurs par défaut
```

---

## Couche 2 — `RobotAlgorithm` (le cerveau)

**Fichier** : `packages/core/src/robot/algorithm/RobotAlgorithm.ts`

### Ce qu'il voit : `RobotContext` (lecture seule)

Le cerveau ne connaît PAS le moteur. Il reçoit un instantané en lecture seule :

```ts
interface RobotContext {
  // Identité
  seat: Seat;                    // 0..3
  partnerSeat: Seat;
  myTeam: 'A' | 'B';
  personality: Personality;
  spec: AlgoSpec;

  // Ma main
  hand: Card[];

  // État de la table (partagé, lecture seule)
  table: TableContext;
  //   ├── phase: 'bidding' | 'play'
  //   ├── trump: Suit | null
  //   ├── bids: Bid[]               (historique des enchères)
  //   ├── currentBid: Bid | null
  //   ├── contre: ContreLevel
  //   ├── playedCards: { seat, card }[]
  //   ├── currentTrick: { seat, card }[]
  //   ├── trumpsRemaining: number
  //   └── trumpsUnseen: Card[]

  // Contexte dérivé (pré-calculé)
  isDemandeur: boolean;
  partnerIsDemandeur: boolean;
  legalCards: Card[];            // cartes jouables (filtrées par les règles)
  legalBidInfo: {
    minValue: number;
    maxValue: number;
    canContre: boolean;
    canSurcontre: boolean;
  };
  trumpsPlayed: number;
  trumpsRemaining: number;
  trumpsUnseen: Card[];
}
```

### Ce qu'il décide

```ts
interface RobotAlgorithm {
  decideBid(ctx: RobotContext): BidDecision;
  decideCard(ctx: RobotContext): CardDecision;
  shouldContre(ctx: RobotContext): boolean;
  shouldSurcontre(ctx: RobotContext): boolean;
}
```

Chaque décision est une **fonction pure** : même contexte → même résultat. Pas d'état mutable,
pas de réseau, pas de hasard non contrôlé.

```
BidDecision { action, value?, suit?, saySuit?, thinkMultiplier, reason }
CardDecision { card, thinkMultiplier, reason }
```

Le champ `reason` est une chaîne lisible (loguée par le RobotLogger) qui explique
pourquoi le robot a décidé ça — utile pour le debug et le rejeu.

### Les 3 implémentations (résolution par le registre)

```
resolveAlgorithm(spec, brain, timing)
        │
        ├── 1. Registre custom  → registerAlgorithm("MonAlgo", factory)
        │      Si spec.name matche un algo enregistré, celui-ci est utilisé.
        │      Permet de coder un cerveau en dur, sans passer par la spec JSON.
        │
        ├── 2. Workflow JSON    → si spec.workflow est défini
        │      Pipeline de fonctions déclarées en JSON (steps/flags).
        │      Extensible sans coder, plus souple que la spec standard.
        │
        └── 3. SpecAlgorithm    → défaut (aucun match registre, pas de workflow)
               Piloté par les paramètres de l'AlgoSpec.
               C'est le cerveau standard de tous les robots.
```

---

## Couche 3 — `RobotBrain` (le vrai calculateur)

**Fichier** : `packages/core/src/robot/RobotBrain.ts`

`RobotBrain` est la logique de haut niveau qui évalue la main et décide.
`SpecAlgorithm` (et `WorkflowAlgorithm`) délèguent à `RobotBrain` :

```
SpecAlgorithm.decideBid(ctx)
        └── brain.decideBid(hand, table, seat, partnerSeat)
                ├── evaluateHand(hand)         — compte les atouts, As, V, 9
                ├── convention.evaluateOpening  — « est-ce que j'ouvre ? à combien ? »
                └── convention.evaluatePartnerResponse — « partenaire a ouvert, je monte ? »
```

La convention (`StandardContreeConvention`) est **configurable** via `ConventionConfig` :
chaque paramètre de la convention est surchargeable dans l'`AlgoSpec.bidding`,
donc on change le comportement d'enchère **sans coder**, juste en éditant le JSON.

---

## Couche 4 — `Agent` (l'individu autonome)

**Fichier** : `packages/core/src/robot/Agent.ts`

Façade qui encapsule le génome + le cerveau en un seul objet manipulable :

```ts
const agent = createAgent({ id: 'bot-1', spec: ALGO_AGRESSIF });

agent.id          // "bot-1"
agent.name        // "Agressif"
agent.spec        // AlgoSpec complète (le génome)
agent.brain       // RobotAlgorithm (le cerveau résolu)

// Décisions en isolation — aucun moteur, aucun réseau
agent.decideBid(context);
agent.decideCard(context);
agent.shouldContre(context);
agent.shouldSurcontre(context);
```

---

## Le pont avec le moteur — `RobotDriver`

**Fichier** : `packages/core/src/engine/RobotDriver.ts`

C'est le **seul endroit** qui connaît à la fois le moteur (`GameEngine`) et le cerveau
(`RobotAlgorithm`). Il remplit deux rôles :

### 1. `buildRobotContext` — traducteur moteur → cerveau

```
GameEngine (état mutable du jeu)
        │
        └── buildRobotContext(engine, seat, spec)
                │
                ├── engine.handOf(seat)        → ctx.hand
                ├── engine.contextFor(seat)     → ctx.table
                ├── engine.legalCards(seat)      → ctx.legalCards
                ├── engine.legalBidInfo(seat)    → ctx.legalBidInfo
                └── calculs dérivés (isDemandeur, trumpsPlayed...)
                        │
                        ▼
                RobotContext (lecture seule, détaché du moteur)
```

### 2. `robotAct` — orchestrateur d'un tour

```ts
function robotAct(engine, seat, algo) {
  // Phase surcontre → pass par défaut
  if (engine.phase === 'surcontre') return pass;

  // Phase enchère
  if (engine.phase === 'bidding') {
    const ctx = buildRobotContext(engine, seat, algo.spec);
    if (ctx.canContre && algo.shouldContre(ctx)) return contre;
    const d = algo.decideBid(ctx);
    return canRaise ? { bid: d } : { pass };
  }

  // Phase jeu
  const ctx = buildRobotContext(engine, seat, algo.spec);
  return { play: algo.decideCard(ctx) };
}
```

### 3. `shouldSurcontrer` — point d'extension (non câblé dans robotAct)

La décision de surcoinche est prise **dans les pilotes** (pas dans `robotAct`), car elle
nécessite la fiche robot complète (pas juste l'algorithme). Par défaut → `false`.

```ts
function shouldSurcontrer(robot: RobotConfig, view?, seat?): boolean {
  // Point d'extension : lire robot.algoSpec.contre.xxx
  return false; // par défaut, le robot passe
}
```

---

## Utilisation concrète — les 4 pilotes

Le **même code** (`robotFromFiche` + `createAlgorithm` + `robotAct`) est appelé à l'identique
dans les 4 endroits. Le robot pense pareil partout.

### 1. Front — entraînement local (`LocalTableEngine`)

```
web/src/table/LocalTableEngine.ts

Séquence au montage :
  participants.forEach → makeRobot({...}) → robots[]
  robots.map → createAlgorithm(robot, rules) → brains[]

Boucle de jeu (planNextStep) :
  si phase surcontre → shouldSurcontrer(robots[seat]) → pass/surcontre
  sinon → robotAct(engine, seat, brains[seat]) → bid/play
  → engine.submitBid() ou engine.playCard()
  → force() (re-render React)
```

### 2. Back — compétition headless (`competition.runner`)

```
server/src/modules/competition/competition.runner.ts

Séquence :
  lineup.seatRobotIds.map → robotFromFiche(doc) → robots[]
  robots.map → createAlgorithm(robot, rules) → brains[]

Boucle synchrone (while phase !== partie_end) :
  si phase surcontre → shouldSurcontrer → pass (chaque siège)
  sinon → robotAct(engine, seat, brains[seat])
  → engine.submitBid() ou engine.playCard()

Aucun délai (headless) — la partie tourne en < 50ms.
```

### 3. Back — partie en ligne (`liveGame.service`)

```
server/src/modules/game/liveGame.service.ts

Séquence au lancement :
  seats.map → robotFromFiche(doc) → robots[]
  robots.map → createAlgorithm(robot, rules) → robotBrains[]
  + substituteBrain (cerveau de secours si humain déconnecte)

Boucle asynchrone (advance) :
  si phase surcontre robot → shouldSurcontrer → setTimeout(BID_RESPONSE_MS) → résultat
  si phase surcontre humain → emit('table:surcontre') → timer turnTimeoutMs → pass auto
  sinon → robotAct(engine, seat, brain) → setTimeout(thinkMs) → action
  → engine.submitBid() ou engine.playCard()
  → broadcast('table:game', state) à tous les clients
```

### 4. Démo moteur (`demo/partie.ts`)

```
packages/core/demo/partie.ts

Séquence :
  4 joueurs avec makeRobot() → createAlgorithm() chacun
  while (phase !== partie_end) → robotAct → submitBid/playCard
  console.log('Vainqueur :', ...)
```

---

## Schéma de résolution complet

```
MongoDB                    API / Front                 Presets code
   │                           │                           │
   │  { algoSpec: {...} }      │  { spec: {...} }          │  ALGO_AGRESSIF
   │                           │                           │
   └───────┬───────────────────┴───────────┬───────────────┘
           │                               │
           ▼                               ▼
     robotFromFiche(fiche)          createAgent({ spec })
           │                               │
           ▼                               │
     RobotConfig                           │
           │                               │
           └───────────┬───────────────────┘
                       │
                       ▼
              normalizeAlgo(spec)
              (fusion défensive avec DEFAULT_ALGO)
                       │
                       ▼
              ┌─────────────────┐
              │    AlgoSpec     │  ← données pures, versionné
              │  (complet)      │
              └────────┬────────┘
                       │
            algoToRuntime(spec)
                       │
              ┌────────┴────────┐
              │   AlgoRuntime   │
              │  ├─ convention  │  ← StandardContreeConvention(config)
              │  └─ playAggr.   │
              └────────┬────────┘
                       │
              createBrain(robot, rules)
                       │
              ┌────────┴────────┐
              │   RobotBrain    │  ← evaluateHand / decideBid / decideCard
              └────────┬────────┘
                       │
              resolveAlgorithm(spec, brain, timing)
                       │
              ┌────────┼────────────────┐
              │        │                │
              ▼        ▼                ▼
         Registre   Workflow     SpecAlgorithm
         custom?    JSON?        (par défaut)
              │        │                │
              └────────┴────────┬───────┘
                                │
                       ┌────────┴────────┐
                       │ RobotAlgorithm  │  ← cerveau exécutable
                       │  decideBid()    │     (4 décisions pures)
                       │  decideCard()   │
                       │  shouldContre() │
                       │  shouldSurcontre│
                       └────────┬────────┘
                                │
                    buildRobotContext(engine, seat)
                                │
                       ┌────────┴────────┐
                       │  RobotContext   │  ← vue lecture seule
                       │  (hand, table,  │     (détachée du moteur)
                       │   legal, ...)   │
                       └─────────────────┘
```

---

## Extensibilité — comment ajouter un comportement

### A. Modifier le tempérament (zéro code)

Éditer l'`AlgoSpec` (en base, via l'API, ou dans un preset) : changer les nombres de personnalité,
les seuils d'enchère, les paramètres de contre. `normalizeAlgo` fusionne les champs manquants.

### B. Enregistrer un algo custom (code, nommé)

```ts
import { registerAlgorithm } from 'belote-core';

registerAlgorithm('MonGénie', (spec, brain, responseTimeMs, maxPlayTimeMs) => {
  return {
    id: 'genie', name: 'Mon Génie', spec, responseTimeMs, maxPlayTimeMs,
    decideBid: (ctx) => { /* ma logique custom */ },
    decideCard: (ctx) => { /* ma logique custom */ },
    shouldContre: (ctx) => true,   // contre toujours
    shouldSurcontre: (ctx) => false,
  };
});
```

Puis dans l'`AlgoSpec` du robot : `{ name: 'MonGénie', ... }` → le registre le résout.

### C. Workflow JSON (pipeline déclaratif)

```ts
const spec: AlgoSpec = {
  ...DEFAULT_ALGO,
  workflow: {
    bid: ['evaluateHand', 'convention', 'reflexionCheck'],
    play: ['selectTrump', 'followSuit', 'cut', 'discard'],
    flag: ['trackPartnerSignals'],
  },
};
```

Chaque step est une fonction enregistrée dans le pipeline (`packages/core/src/robot/workflow/steps.ts`).

### D. Câbler la surcoinche (point d'extension prêt)

Dans `RobotDriver.ts`, la fonction `shouldSurcontrer` :

```ts
export function shouldSurcontrer(robot: RobotConfig, view?, seat?): boolean {
  const spec = normalizeAlgo(robot.algoSpec);
  if (!spec.contre.enabled) return false;
  // Brancher ici la logique depuis spec.contre.minOwnStrengthToSurcontre
  // avec une estimation de force depuis la vue moteur
  return false;
}
```

---

## Fichiers de référence

| Fichier                                          | Rôle                                            |
|--------------------------------------------------|-------------------------------------------------|
| `packages/core/src/robot/AlgoSpec.ts`            | Génome (type + presets + normalizeAlgo + runtime)|
| `packages/core/src/robot/Agent.ts`               | Façade individu (createAgent)                   |
| `packages/core/src/robot/RobotBrain.ts`          | Logique d'enchère + carte (calculateur)         |
| `packages/core/src/robot/algorithm/RobotAlgorithm.ts` | Contrat abstrait (interface + RobotContext) |
| `packages/core/src/robot/algorithm/SpecAlgorithm.ts`  | Cerveau piloté par AlgoSpec (implémentation)|
| `packages/core/src/robot/algorithm/registry.ts`       | Registre d'algorithmes (extensible)         |
| `packages/core/src/robot/conventions/BiddingConvention.ts` | Convention d'enchère (interface + config)|
| `packages/core/src/robot/conventions/StandardContree.ts`   | Implémentation standard (ouverture/réponse)|
| `packages/core/src/robot/workflow/WorkflowAlgorithm.ts`    | Cerveau pipeline JSON                   |
| `packages/core/src/robot/workflow/steps.ts`                | Steps du pipeline (fonctions enregistrées)|
| `packages/core/src/engine/RobotDriver.ts`        | Pont moteur↔cerveau (buildContext + robotAct)   |
| `packages/core/src/domain/types.ts`              | RobotConfig, Personality, TableContext, decisions|
| `web/src/table/LocalTableEngine.ts`              | Pilote front (entraînement)                     |
| `server/.../competition/competition.runner.ts`   | Pilote back (compétition headless)              |
| `server/.../game/liveGame.service.ts`            | Pilote back (partie en ligne)                   |

---

## Tests

```bash
npm --workspace belote-core run test
```

- `src/robot/Agent.test.ts` (5 tests) : individu instancié depuis spec seule, fusion défensive,
  décision d'enchère et de carte en isolation (sans moteur).
- `src/engine/GameEngine.test.ts` (8 tests) : signaux d'enchère + micro-phase surcontre.
- `src/scoring/scoring.test.ts` (14 tests) : barème, arrondi, contrat, capot, contre, belote.
