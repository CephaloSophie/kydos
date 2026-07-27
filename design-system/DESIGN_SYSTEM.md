# DESIGN_SYSTEM.md — Contrée

Guide de démarrage. Senior-to-senior : on ne justifie que le non-évident, et on
nomme les choix d'opinion comme tels.

---

## 1. Philosophie — 3 principes qui ne changent jamais

1. **Une couleur d'équipe se calcule, elle ne se choisit pas.** Identité de clan
   (motif + couleur) = fonction pure du nom. Jamais de palette codée en dur par
   équipe : `teamColor(name)` est la seule source. Conséquence : deux surfaces,
   un même clan, exactement la même couleur, sans coordination.

2. **L'UI montre l'état, elle ne le décide pas.** Aucun composant ne contient de
   logique de Belote. Le moteur (REST/WS) produit l'état ; les composants le
   rendent et émettent des intentions (`onPlay`, `onSpeed`). L'`AnnouncePopup`
   s'efface toute seule — elle ne fait pas avancer la donne.

3. **Web et mobile sont deux produits, pas deux tailles d'écran.** Mêmes
   services, designs séparés. Aucun composant partagé, aucun breakpoint commun.
   *Opinion :* le « responsive universel » aurait coûté plus cher en compromis
   qu'en duplication. On assume deux surfaces taillées pour leur usage (souris +
   densité vs. pouce + focus).

---

## 2. Brancher une couleur d'équipe dynamique

La couleur vit dans 3 variables HSL relayées : `--team-a-h/s/l` (et `-b-`). On
les pose sur un **scope** (la table, une carte) — jamais en dur dans un composant.

### Web (React)
```jsx
import { teamColor } from "components/score/TeamBadge.jsx";

function bindTeam(el, slot /* "a" | "b" */, name) {
  const { h, s, l } = teamColor(name);          // hash → HSL déterministe
  el.style.setProperty(`--team-${slot}-h`, h);
  el.style.setProperty(`--team-${slot}-s`, `${s}%`);
  el.style.setProperty(`--team-${slot}-l`, `${l}%`);
}

// <section ref={el => el && bindTeam(el, "a", "Les Atouts")} className="layout-game">
//   ... tout enfant lit var(--team-a), --team-a-soft, --team-a-line
```
Les dérivés `--team-a`, `--team-a-soft` (16 %), `--team-a-line` (45 %) se
recomposent automatiquement depuis les 3 variables (cf. `design-tokens.css`).

### Mobile (vanilla)
Même fonction, copiée à l'identique dans `app.js` (`hashName` + HSL) pour ne
dépendre d'aucun bundle React. La garantie d'égalité tient à **l'algorithme
partagé**, pas au code partagé.

> Règle : on ne lit jamais `--accent` ou une couleur fixe pour une équipe. Si
> tu écris `color: #4f8` pour « l'équipe bleue », tu casses le système.

---

## 3. Ajouter un écran mobile sans casser le système

1. **Pars de l'ossature.** Un écran = `<main class="m-screen" data-surface="mobile">`
   avec `m-topbar` / `m-content` / `m-tabbar`. N'invente pas de chrome.
2. **Reste sous 5 onglets.** Si l'écran mérite un onglet, retire-en un ; sinon,
   c'est un écran *poussé* (bouton retour dans la topbar, pas d'onglet) — cf.
   « Mon équipe ».
3. **Une tâche par écran.** Pas de panneaux multiples simultanés (c'est la
   différence avec le web). Une action contextuelle → **bottom sheet**, pas une
   colonne.
4. **Cibles ≥ `--tap-min` (44 px), marges `--sp-screen-x`, safe-areas via les
   tokens.** Tout est déjà câblé dans `layout-mobile.css`.
5. **Pas de hover.** Tout état passe par tap/press. Pas de `Tooltip` : libellé
   visible.
6. **Réutilise les patterns** (`.m-sheet`, `.m-toast`, `.m-fab`, `.m-cardrail`),
   ne les redessine pas.

Checklist de non-régression : l'écran fonctionne au pouce d'une main ? Il tient
en portrait 390 ? Il ne partage aucun CSS avec le web ? ✅

---

## 4. Étendre la gestion des robots

Le robot a 4 axes (agressivité, concentration, vélocité, convention) + des stats
(taux de contrat, pts/donne, parties). Pour **une nouvelle stat** :

1. Ajoute le champ au modèle robot (côté données).
2. Web : ajoute une carte `Stat` dans `RobotEditor` (`ui_kits/web/RobotsScreen.jsx`)
   — pas de nouveau token, la grille `repeat(3,1fr)` s'étend.
3. Mobile : ajoute une ligne `list-item` dans le sheet d'édition.

Pour **un nouveau slider de personnalité** :

```jsx
// Web — le composant existe déjà, on ajoute un axe :
<Slider label="Bluff" value={bot.bluff} min={0} max={1}
        onChange={v => update({ ...bot, bluff: v })} format={v => v.toFixed(2)} />
```
```js
// Mobile — réutiliser le helper slider() du botForm :
slider("bluff", "Bluff", r.bluff)
```
Aucun token nouveau : un slider de réglage utilise `--accent` (ou `--spark` pour
les réglages moteur). La comparaison côte à côte (`.layout-robots__compare`)
absorbe le nouvel axe sans changement.

---

## 5. Règles de nommage des tokens

- **Base vs. sémantique.** Base = valeur brute (`--bg-2`, `--accent-h`).
  Sémantique = intention (`--bid-contre-fg`, `--felt-rail`, `--log-error`). On
  consomme la sémantique ; on ne touche la base que pour re-thématiser.
- **Familles par préfixe** : `--bg-*`, `--text-*`, `--border-*`, `--accent*`,
  `--felt*`, `--card-*`, `--log-*`, `--bid-*`, `--team-*`, `--sp-*`, `--r-*`,
  `--shadow-*`/`--glow-*`, `--z-*`, `--fs-*`/`--lh-*`/`--fw-*`, `--dur-*`/`--ease-*`.
- **Échelles numériques** : espacement et rayon montent en pas explicites
  (`--sp-1…24` en multiples de 4 ; `--r-xs…2xl`). Pas de valeur magique inline.
- **HSL éclatées** pour tout ce qui doit être recoloré au runtime :
  `--x-h/-s/-l` + un dérivé `--x` recomposé.
- **Couleurs sémantiques** ont toujours 3 variantes : pleine (`--success`),
  atténuée de fond (`--success-dim`), voile (`--success-ghost`).
- **Surcharge mobile** : mêmes noms, re-déclarés sous `[data-surface="mobile"]`.
  On ne crée pas `--bg-2-mobile` ; on redéfinit `--bg-2` dans le scope.

---

## 6. Checklist avant de livrer un composant

- [ ] **Couleurs 100 % tokens.** `grep` du fichier : zéro hex, zéro `rgb()` en
      dur (sauf voiles neutres `rgba(0,0,0,…)`/`rgba(255,255,255,…)`).
- [ ] **Dark mode natif.** C'est le seul thème ; vérifier les contrastes texte
      sur `--bg-1`/`--bg-2`/`--bg-3` (AA pour le texte courant).
- [ ] **Focus visible** (`.focus-ring` ou `:focus-visible`) sur tout élément
      interactif ; ordre de tabulation logique.
- [ ] **Sémantique non portée par la seule couleur** : doubler d'un libellé/icône
      (badges d'enchère, logs, siège actif, vainqueur).
- [ ] **Cibles** ≥ `--tap-min` (36 web / 44 mobile).
- [ ] **Mobile** : pas de dépendance hover ; testé en portrait 390.
- [ ] **Mouvement** : 150–250 ms web / 200–300 ms mobile, ease-out, jamais
      bloquant ; respecte `prefers-reduced-motion`.
- [ ] **A11y de rôle** : `role`/`aria-*` corrects (switch, dialog, listbox,
      status, tooltip) ; libellés obligatoires fournis (`IconButton.label`).
- [ ] **Aucune logique de jeu** dans le composant.

---

## 7. Ce qui est interdit

- **Couleurs en dur.** Surtout pour les équipes — toute couleur de clan vient de
  `teamColor`. Un hex d'équipe dans un composant est un bug, pas un raccourci.
- **Responsive partagé web ↔ mobile.** Pas de media query qui transforme un écran
  web en écran mobile, pas de composant React réutilisé sur mobile. Deux surfaces.
- **Logique de jeu dans l'UI.** Décompte de plis, validité d'une carte, calcul de
  récompense : ça vit dans le moteur. L'UI reçoit l'état, point.
- **Animations bloquantes.** Une animation ne retient jamais l'avancement du
  moteur (le tapis se ramasse pendant que la donne suivante se prépare).
- **Nouvelles polices / nouvelles familles de couleur** ad hoc. Display = Chakra
  Petch, UI = Manrope, Mono = JetBrains Mono. Besoin d'une teinte ? Dérive en
  HSL depuis l'accent ou une sémantique existante.
- **Emoji décoratifs** dans les composants de produit (les `👤👁` du kit sont des
  placeholders de démo, pas une convention).

---

## Fichiers du système
`design-tokens.css` · `tokens/fonts.css` · `animations.css` · `layout-web.css` ·
`layout-mobile.css` · `styles.css` (point d'entrée, imports seuls) ·
`components-web.md` · `components-mobile.md` · `components/**` (React + cards) ·
`ui_kits/web` · `ui_kits/mobile` · `guidelines/**` (specimen cards) · `assets/**`.
