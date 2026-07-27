# components-mobile.md

Surface **MOBILE** — HTML/TypeScript vanilla, thème sombre, **pensée pouce**.
Design **totalement séparé** du web : mêmes API REST + WebSocket, **aucun
composant partagé, aucun responsive commun**. Écran de référence **390 px**,
navigation par **tab bar en bas**, pas de hover, cibles ≥ `--tap-min` (44 px).

Tout se monte sous `[data-surface="mobile"]` (qui re-déclare les tokens) et
s'appuie sur `layout-mobile.css`. Le HTML reste sémantique : on décrit ci-dessous
la **structure recommandée**, les **gestes**, les **tokens** et la **différence
intentionnelle** avec le web.

---

## Chrome global

### Squelette d'écran — `.m-screen`
- **Usage** : ossature de tout écran à onglets (Accueil, Regarder, Tournois, Robots, Profil).
- **Structure** :
  ```html
  <main class="m-screen" data-surface="mobile">
    <header class="m-topbar"> … titre + actions … </header>
    <section class="m-content"> … contenu scrollable … </section>
    <nav class="m-tabbar" role="tablist"> … 5 onglets … </nav>
  </main>
  ```
- **Tokens** : `--topbar-h`, `--tabbar-h`, `--safe-top/bottom`, `--sp-screen-x/y`.
- **Diff web** : le web a une nav latérale persistante + topbar large; le mobile remplace ça par une **tab bar fixe** au pouce et un titre court. Pas de sidebar.

### Tab bar — `.m-tabbar` / `.m-tab`
- **Usage** : navigation racine, **5 onglets max**, icône (24 px) + label court.
- **Gestes** : tap (jamais de hover). L'onglet actif porte `aria-selected="true"`; l'indicateur `.m-tab-indicator` glisse en `transform` (`m-tab-indicator` transition).
- **Structure** : `<button class="m-tab" role="tab" aria-selected> <svg class="m-tab__icon"/> <span>Jouer</span> </button>`.
- **Tokens** : `--bg-2`, `--accent` (actif), `--text-3` (inactif), `--fs-xs`.
- **Diff web** : remplace la nav latérale. Labels réduits à un mot (« Jouer », « Regarder »). Feedback **haptique léger** au changement d'onglet (à câbler natif).

---

## Écrans

### 1. Auth
- **Contexte** : login / inscription, première ouverture.
- **Structure** : `<form>` vertical, champs pleine largeur (`Input` mobile = `--control-h` 48 px), bouton `fullWidth` collé au bas (au-dessus du clavier).
- **Gestes** : `return` enchaîne les champs; pas de tooltip — l'aide passe par `hint` visible.
- **Tokens** : `--control-h-lg`, `--bg-inset`, `--sp-screen-x`.
- **Diff web** : champs **plus hauts**, bouton **pleine largeur** et **collant**, un seul champ visible à la fois quand le clavier monte.

### 2. Accueil / Dashboard — `.m-layout-list`
- **Contexte** : point d'entrée. Score d'équipe en grand, prochaine partie, raccourcis.
- **Structure** : carte score d'équipe (identicon grand + total en `--font-display`), **rail horizontal** de cartes « parties » (`.m-cardrail`, scroll-snap), grille de raccourcis (Jouer / Regarder / Robots).
- **Gestes** : **pull-to-refresh** (`.m-ptr`) en haut, swipe horizontal du rail.
- **Tokens** : `--font-display`, `--accent`, `--bg-2`, `.m-cardrail`.
- **Diff web** : le web éclate ces infos sur plusieurs pages (profil, lobby); le mobile **condense** en un tableau de bord scrollable, cartes en rail plutôt qu'en grille.

### 3. Jouer — `.m-layout-game`
- **Contexte** : partie en cours, portrait.
- **Structure** :
  ```html
  <div class="m-layout-game">
    <header class="m-score-band"> ScoreBoard compact </header>
    <div class="m-felt"> tapis portrait : Vous en bas, adversaires haut/côtés, pli central </div>
    <div class="m-hand-drawer"> ruban de cartes scrollable horizontalement </div>
  </div>
  ```
- **Gestes** : tap sur carte = jouer (cible élargie); **drawer** scrollable au pouce; bandeau score **fixe** en haut. Haptique au pli pris.
- **Tokens** : `--score-band-h`, `--felt*`, `.m-hand-drawer`, `--safe-bottom`.
- **Diff web** : **layout repensé** — le web pose la table en 2/3 paysage avec panneaux à droite; le mobile passe en **portrait**, sièges repositionnés, main dans un **drawer scrollable**, **pas de console ni de flux** (place réservée au tapis). Le joueur humain est **toujours en bas**.

### 4. Regarder — `.m-layout-list` + vue spectateur
- **Contexte** : parties en cours, rejoindre en spectateur.
- **Structure** : liste verticale de cartes partie (équipes, score courant, manche, nb spectateurs, badge « Live »). Vue spectateur = `.m-layout-game` **sans drawer** (on ne joue pas), score compact + tapis read-only.
- **Gestes** : tap carte → **bottom sheet** (Rejoindre / Observer); pull-to-refresh.
- **Tokens** : `--spark` (live), `Badge tone="spark"`, `.m-sheet`.
- **Diff web** : le web montre les 4 mains + console + flux pour un spectateur; le mobile donne une **vue compacte** (tapis + score), sans devtools — lecture, pas analyse.

### 5. Tournois — `.m-layout-list`
- **Contexte** : liste des tournois + rang de l'équipe.
- **Structure** : segments (Actifs / À venir / Terminés), cartes tournoi avec classement de l'équipe + **badge de rang**, total de points.
- **Gestes** : tap = fiche tournoi (push d'écran), pull-to-refresh.
- **Tokens** : `Badge`, `--accent`, `--bg-2`.
- **Diff web** : le web affiche classement complet + fiche admin côte à côte; le mobile **priorise la position de mon équipe** et empile le reste.

### 6. Mes robots — liste swipeable
- **Contexte** : CRUD robots au pouce.
- **Structure** : liste de lignes robot (`.m-swipe-row`) ; **swipe gauche** révèle « Supprimer » (fond `--error`), **tap** ouvre l'édition; formulaire avec `Slider` natifs (agressivité, concentration, vélocité) + `Select` convention.
- **Gestes** : **swipe-to-delete**, tap-to-edit, pull-to-refresh. Haptique au déclenchement du swipe.
- **Tokens** : `.m-swipe-row`, `--error`, `Slider accent`, `--fab-size` (FAB « + robot »).
- **Diff web** : le web propose liste + détail **côte à côte** et comparaison 2 robots; le mobile **sépare en navigation** (liste → détail plein écran), pas de comparaison côte à côte (largeur insuffisante).

### 7. Mon équipe — `.m-layout-profile`
- **Contexte** : profil du clan.
- **Structure** : `.m-profile-head` (identicon **grand format** `TeamBadge size≈96`, nom, total de points), liste des membres, historique des parties (liste verticale).
- **Gestes** : pull-to-refresh, tap membre/partie → détail.
- **Tokens** : `TeamBadge`, `--font-display`, `--bg-2`.
- **Diff web** : même contenu que la page web « Mon équipe » mais **empilé** et centré, identicon hero plutôt qu'en ligne.

### 8. Profil / Paramètres — `.m-layout-profile`
- **Contexte** : compte, timings, déconnexion.
- **Structure** : sections en listes (`Switch` pour timings auto, `Select` pour manches par défaut), bouton **Déconnexion** `variant="danger" fullWidth` en bas.
- **Tokens** : `Switch`, `Select`, `Button danger`.
- **Diff web** : équivalent de la page Paramètres web, mais en **listes tactiles** verticales.

---

## Patterns transverses

### Bottom sheet — `.m-sheet` + `.m-scrim`
- **Usage** : actions contextuelles (Rejoindre / Observer / Créer). Remplace le `Dialog` web.
- **Structure** : `.m-scrim` (voile) + `.m-sheet` (grip + liste d'actions). Anim `m-anim-sheet-in` / `m-anim-scrim-in`.
- **Gestes** : swipe-down ou tap-voile pour fermer. Haptique à l'ouverture.
- **Diff web** : le web centre une modale; le mobile **remonte depuis le bas**, atteignable au pouce.

### Toast — `.m-toast-host`
- **Usage** : enchère, pli pris, fin de partie. Composant `Toast` partagé, **hôte** différent.
- **Structure** : pile dans `.m-toast-host` (au-dessus de la tab bar), `m-anim-toast-in/out`.
- **Diff web** : même composant, mais ancré **bas-centre** (pouce) et non haut-droit.

### Score compact (bandeau fixe) — `.m-score-band`
- **Usage** : pendant la partie, score toujours visible en haut. `ScoreBoard compact`.
- **Diff web** : le web a un ScoreBoard pleine largeur; le mobile fige une **bande mince** pour rendre le tapis.

### FAB — `.m-fab`
- **Usage** : action primaire d'une liste (créer une partie, ajouter un robot).
- **Tokens** : `--fab-size` (56), `--accent`, position au-dessus de la tab bar + safe-area.
- **Diff web** : le web met l'action dans la topbar; le mobile la pose en **FAB** au pouce.

---

## Règles mobiles

- **Pas de hover** : tout état passe par tap/press; pas de `Tooltip` → libellés visibles.
- **Safe areas** : toujours via `env()` (déjà câblé dans `layout-mobile.css`).
- **Haptique** : mentionnée là où elle a du sens (jouer une carte, pli pris, swipe-delete, ouverture de sheet, fin de partie) — non implémentable en HTML, à câbler natif.
- **Une chose à la fois** : un écran = une tâche. Pas de panneaux multiples simultanés (≠ web).
- **Cibles** : jamais < 44 px. Cartes pleines largeur, marges `--sp-screen-x`.
