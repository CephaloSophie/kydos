# Robot — Cerveau & Configuration

Guide pratique : **où** et **comment** modifier le comportement d'un robot.
Chaque section = une décision du robot → le fichier exact → ce qu'il faut toucher.

---

## Vue rapide — qui décide quoi

```
DÉCISION                  QUI DÉCIDE                              FICHIER
─────────────────────────────────────────────────────────────────────────────
Ouvrir l'enchère ?        StandardContreeConvention.evaluateOpening    conventions/StandardContree.ts
À combien ? Quelle        StandardContreeConvention.evaluateOpening    conventions/StandardContree.ts
  couleur ?
Répondre au partenaire ?  StandardContreeConvention.evaluatePartnerResponse  conventions/StandardContree.ts
Réflexion (signal) ?      StandardContreeConvention (thinkMultiplier)  conventions/StandardContree.ts
Contrer ?                 SpecAlgorithm.shouldContre                  algorithm/SpecAlgorithm.ts
Surcoincher ?             SpecAlgorithm.shouldSurcontre               algorithm/SpecAlgorithm.ts
Jouer quelle carte ?      RobotBrain.decideCard                       RobotBrain.ts
```

Tous les fichiers sont dans `packages/core/src/robot/`.

---

## 1. Ouvrir l'enchère — « est-ce que j'annonce, à combien, quelle couleur ? »

**Fichier** : `robot/conventions/StandardContree.ts` → méthode `evaluateOpening`

### Ce que fait le robot aujourd'hui

Pour chaque couleur (♠ ♥ ♦ ♣), il compte ses atouts dans cette couleur et vérifie :

```
OUVERTURE FORTE (100) :
  Valet d'atout + 9 d'atout + au moins 4 cartes d'atout
  → annonce 100 dans cette couleur

OUVERTURE FAIBLE (90) :
  Au moins 4 cartes dans la couleur
  OU (Valet ou 9) + au moins 3 cartes
  → annonce 90 dans cette couleur

SINON → passe
```

### Comment modifier

**Changer les seuils** (sans coder) — dans l'`AlgoSpec` du robot :

```ts
{
  bidding: {
    strongOpenMinTrump: 5,   // exiger 5 atouts au lieu de 4 pour ouvrir fort
    weakOpenMinTrump: 3,     // accepter 3 atouts pour ouvrir faible
    weakOpenValue: 90,       // valeur de l'ouverture faible
    strongOpenValue: 110,    // monter l'ouverture forte à 110
  }
}
```

**Ajouter une nouvelle règle** (coder) — dans `evaluateOpening`, après la recherche de la meilleure couleur. Exemple : « ouvrir à 100 si j'ai 3 As hors-atout même sans atout fort » :

```ts
// Dans evaluateOpening, avant le return 'pass' final :
const aces = this.offTrumpAces(hand, 'pique' as Suit); // ou la meilleure couleur
if (aces >= 3) {
  log.info(PHASE, `3+ As hors-atout : ouverture opportuniste 100.`);
  return {
    action: 'bid', value: 100, suit: bestSuit,
    saySuit: true, thinkMultiplier: 1,
    reason: `${aces} As hors-atout`,
  };
}
```

---

## 2. Répondre au partenaire — « il a ouvert, je monte de combien ? »

**Fichier** : `robot/conventions/StandardContree.ts` → méthode `evaluatePartnerResponse`

### Ce que fait le robot aujourd'hui

Le partenaire a ouvert (ex. 90 ♠). Le robot **accumule des points de signal** :

```
+10 si j'ai le Valet d'atout (dans la couleur du partenaire)
+10 si j'ai le 9 d'atout
+10 par As hors-atout
+10 par atout supplémentaire au-delà de 2

VALEUR FINALE = annonce du partenaire + total des points
```

Exemple : partenaire ouvre 90 ♠. J'ai le 9 de pique (+10), 1 As hors-atout (+10), 3 piques (+10 bonus longueur). Signal = 30. → J'annonce 120 ♠.

**Cas spécial — rétention des As** : si le partenaire ouvre faible (90) et que je n'ai PAS le Valet d'atout, je **passe** et je **garde mes As** pour les signaler plus tard.

### Comment modifier

**Changer les poids** (sans coder) :

```ts
{
  bidding: {
    acePoints: 15,             // chaque As vaut 15 au lieu de 10
    valetTrumpPoints: 20,      // le Valet d'atout vaut 20
    nineTrumpPoints: 5,        // le 9 vaut moins
    lengthBonusPerExtra: 15,   // bonus de longueur plus fort
    holdAcesOnWeakOpen: false,  // ne PAS retenir les As
  }
}
```

**Ajouter une nouvelle règle** : par exemple « si j'ai la Dame ET le Roi d'atout, +10 supplémentaires » :

```ts
// Dans evaluatePartnerResponse, dans la section d'accumulation :
const hasDame = handContains(hand, 'D', trump);
const hasRoi = handContains(hand, 'R', trump);
if (hasDame && hasRoi) {
  increment += 10;
  parts.push('D+R atout+10');
}
```

---

## 3. Le signal « réflexion » — « je réfléchis deux fois = main riche »

**Fichier** : `robot/conventions/StandardContree.ts`

### Ce que fait le robot aujourd'hui

Si le robot a **3+ atouts** dans la couleur choisie, il renvoie `thinkMultiplier: 2`
(= il prend deux fois plus de temps, ce qui signale une main riche au partenaire).

Le seuil est configurable :

```ts
{ bidding: { deepThinkTrumpThreshold: 3 } }  // 3 atouts = réflexion
```

### Comment modifier

Changer le seuil dans l'`AlgoSpec` :

```ts
{ bidding: { deepThinkTrumpThreshold: 4 } }  // réflexion seulement à 4+ atouts
```

Ou ajouter une condition supplémentaire dans `evaluateOpening` / `evaluatePartnerResponse`,
avant le `return` de la décision :

```ts
// Réflexion si 2+ As hors-atout (en plus du seuil d'atouts)
const deep = trumps >= c.deepThinkTrumpThreshold || aces >= 2;
return { ..., thinkMultiplier: deep ? 2 : 1 };
```

---

## 4. Contrer — « l'adversaire a annoncé, je le contre ? »

**Fichier** : `robot/algorithm/SpecAlgorithm.ts` → méthode `shouldContre`

### Ce que fait le robot aujourd'hui

Il calcule un **score de risque** entre 0 et 1 :

```
risque = base (contrat élevé = +)
       + bonus si 3+ atouts dans la couleur annoncée
       + bonus si Valet ou 9 d'atout
       + bonus par As hors-atout
       + ajustement agressivité (-5 à +5)

Si risque >= seuil → CONTRE
```

Le seuil est dans l'`AlgoSpec` :

```ts
{ contre: { enabled: true, minOpponentRiskToContre: 0.65 } }
// Agressif : 0.50 (contre plus souvent)
// Prudent : 0.85 (contre rarement)
```

### Comment modifier

**Changer le seuil** (sans coder) :

```ts
{ contre: { minOpponentRiskToContre: 0.45 } }  // contre dès 45% de risque estimé
```

**Ajouter une condition** : par exemple « ne jamais contrer si le contrat est ≤ 90 » :

```ts
// Dans shouldContre, au début :
shouldContre(ctx: RobotContext): boolean {
  if (!this.spec.contre.enabled) return false;
  const bid = ctx.table.currentBid;
  if (!bid?.suit || (bid.value ?? 0) <= 90) return false;  // ← ajout
  // ... reste du calcul
}
```

**Changer la formule de risque** : dans la méthode privée `opponentFailRisk`.
Chaque ligne ajoute au score — tu peux modifier les poids ou ajouter des critères :

```ts
private opponentFailRisk(ctx, trump, value): number {
  let risk = (value - 80) / 120;              // contrat élevé → + de risque
  risk += t.length >= 3 ? 0.25 : ...;         // mes atouts
  risk += strong ? 0.2 : 0;                   // V ou 9 d'atout
  risk += aces * 0.08;                        // mes As
  risk += (aggressiveness - 5) * 0.03;        // tempérament
  // AJOUTER ICI : par exemple
  // risk += partnerHasBid ? 0.15 : 0;        // partenaire a annoncé = + confiant
  return clamp(risk, 0, 1);
}
```

---

## 5. Surcoincher — « ils ont contré, je surcoinche ? »

**Fichier** : `robot/algorithm/SpecAlgorithm.ts` → méthode `shouldSurcontre`

### Ce que fait le robot aujourd'hui

Même logique que le contre, mais avec un score de **force propre** :

```
force = longueur d'atout × 0.12
      + Valet d'atout → +0.30
      + 9 d'atout → +0.20
      + par As → +0.10
      + ajustement agressivité

Si force >= seuil → SURCOINCHE
```

Le seuil : `{ contre: { minOwnStrengthToSurcontre: 0.80 } }` (0.70 pour un agressif).

### Comment modifier

Identique au contre : changer le seuil dans l'`AlgoSpec`, ou modifier la formule `ownStrength`.

**Point d'extension dans le pilote** : dans `RobotDriver.ts`, la fonction `shouldSurcontrer`
est le point d'entrée **des 3 pilotes** (entraînement, compétition, live). Aujourd'hui elle
retourne `false` par défaut. Pour brancher la décision depuis le cerveau :

```ts
// packages/core/src/engine/RobotDriver.ts
export function shouldSurcontrer(robot: RobotConfig, view?: any, seat?: number): boolean {
  const spec = normalizeAlgo(robot.algoSpec);
  if (!spec.contre.enabled) return false;
  // Brancher ici la logique ownStrength depuis la vue
  // (pour l'instant la vue n'est pas typée → à câbler)
  return false;
}
```

---

## 6. Jouer une carte — « c'est mon tour, quelle carte ? »

**Fichier** : `robot/RobotBrain.ts` → méthode `decideCard`

### Ce que fait le robot aujourd'hui

```
1. Le moteur filtre les cartes LÉGALES (via les règles)

2. Si UNE SEULE carte légale → coup forcé, on la joue

3. Si des cartes GAGNENT le pli (simulées une par une) :
   → L'agressivité choisit entre la gagnante la PLUS FORTE (économe)
     et la gagnante la PLUS FAIBLE (réserve)
   → Agressivité haute = joue la plus faible (garde les grosses)
   → Agressivité basse = écrase avec la plus forte

4. Sinon → DÉFAUSSE la carte de plus faible valeur
```

### Comment modifier

**Changer l'agressivité** (sans coder) : dans l'`AlgoSpec` :

```ts
{ personality: { aggressiveness: 8 } }  // joue plus souvent la gagnante faible
{ play: { aggressiveness: 3 } }          // surcharge spécifique au jeu de la carte
```

**Ajouter une règle de jeu** : par exemple « si mon partenaire est maître, je défausse un As
pour lui signaler ma force » :

```ts
// Dans decideCard, avant la section "sinon défausse" :
const partnerLeads = ctx.currentTrick.length > 0
  && this.rules.trickWinnerIndex(ctx.currentTrick, trump) === partnerIndex;
if (partnerLeads) {
  const myAces = legal.filter(c => c.rank === 'A' && c.suit !== trump);
  if (myAces.length > 0) {
    this.log.info('jeu', `Partenaire maître : je signale un As (${cardId(myAces[0])})`);
    return { card: myAces[0], thinkMultiplier: 1, reason: 'signal As sous partenaire' };
  }
}
```

**Ajouter une stratégie de coupe** : « si je n'ai plus de la couleur demandée
et j'ai de l'atout, je coupe avec le plus petit atout » :

```ts
// Dans decideCard, après le bloc "cartes gagnantes" :
const suitLed = ctx.currentTrick[0]?.card.suit;
const noSuitLeft = suitLed && legal.every(c => c.suit !== suitLed);
if (noSuitLeft) {
  const myTrumps = legal.filter(c => c.suit === trump)
    .sort((a, b) => cardStrength(a, trump) - cardStrength(b, trump));
  if (myTrumps.length > 0) {
    this.log.info('jeu', `Coupe avec ${cardId(myTrumps[0])}`);
    return { card: myTrumps[0], thinkMultiplier: 1, reason: 'coupe au plus petit atout' };
  }
}
```

---

## 7. Choisir la couleur d'atout — « quelle couleur est la meilleure ? »

**Fichier** : `robot/conventions/StandardContree.ts` → `evaluateOpening`

### Ce que fait le robot aujourd'hui

Il parcourt les **4 couleurs** et choisit celle qui a le plus d'atouts
(avec priorité au combo V+9). C'est la boucle `for (const suit of SUITS)` :

```
Pour chaque couleur :
  compter mes cartes dans cette couleur
  vérifier si j'ai le Valet ET le 9
  → garder la meilleure (le plus de cartes, avec V+9 en priorité)
```

### Comment modifier

Ajouter un critère de sélection : par exemple « préférer une couleur où j'ai aussi des As
hors-atout (pour les défausses) » :

```ts
// Dans la boucle de recherche, ajouter un score composite :
const score = n * 10 + (hasV ? 20 : 0) + (has9 ? 15 : 0) + offAces * 5;
if (score > bestScore) { best = { suit, trumps: n }; bestScore = score; }
```

---

## Résumé — où toucher selon ce que tu veux changer

```
CE QUE TU VEUX CHANGER              COMMENT                   OÙ
──────────────────────────────────────────────────────────────────────
Seuils d'enchère                    Éditer l'AlgoSpec JSON     AlgoSpec.ts (bidding)
Seuils de contre/surcontre          Éditer l'AlgoSpec JSON     AlgoSpec.ts (contre)
Agressivité du jeu de carte         Éditer l'AlgoSpec JSON     AlgoSpec.ts (personality/play)
Nouvelle règle d'ouverture          Coder dans la convention   StandardContree.ts
Nouvelle règle de réponse           Coder dans la convention   StandardContree.ts
Nouvelle stratégie de carte         Coder dans le cerveau      RobotBrain.ts
Changer la formule de contre        Coder dans l'algo          SpecAlgorithm.ts
Câbler la surcoinche (pilotes)      Coder dans le driver       RobotDriver.ts
Créer un algo 100% custom           Registre                   registry.ts
Créer un pipeline déclaratif        Workflow JSON              AlgoSpec.workflow + steps.ts
```

---

## Tester un changement

```ts
import { createAgent, ALGO_CLASSIQUE } from 'belote-core';

// Créer un agent avec une spec modifiée
const agent = createAgent({
  spec: {
    ...ALGO_CLASSIQUE,
    bidding: { weakOpenMinTrump: 3 },           // ouvrir avec 3 atouts
    contre: { minOpponentRiskToContre: 0.40 },   // contrer facilement
  },
});

// Tester une décision (sans moteur)
const decision = agent.decideBid(monContexteSynthétique);
console.log(decision.action, decision.reason);
```

Commande :

```bash
npm --workspace belote-core run test
```
