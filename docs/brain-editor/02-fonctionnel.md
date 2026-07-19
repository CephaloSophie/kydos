# Document fonctionnel — Éditeur de cerveau

Ce que l'utilisateur (le **Scripteur**) peut faire, écran par écran.

---

## 1. Objectif

Permettre à un Scripteur d'écrire **lui-même** le comportement d'un robot de belote, sans toucher au moteur :
coder en JavaScript les décisions du robot, les tester sur des situations qu'il construit, versionner son
travail et le sauvegarder, puis exporter le cerveau pour l'utiliser dans le jeu.

---

## 2. Disposition de l'écran

```
┌──────────────────────────────────────────────────────────────────────────┐
│ BARRE HAUT : nom du cerveau · thème · 1/2 panneaux · ⇄ · Édition/Généré · ⬇│
├──────────────────────────────────────────────────────────────────────────┤
│ BARRE PROJETS : projet ▾ · ＋nouveau ⧉cloner 🗑 | version ▾ ＋version |     │
│                 💾 serveur · ↻ liste · état de sync                         │
├───────────┬──────────────────────────────────┬─────────────────────────────┤
│ TOOLBOX   │  ÉDITEUR(S) DE CODE              │  CONTEXTE (droite)          │
│           │  decideBid(ctx) {                │  ┌ Ma main (cartes) 🎲      │
│ Fonctions │    … code JS coloré …            │  ├ Réglages (atout, sliders)│
│ ＋ajouter │  }                               │  └ Contexte complet (JSON)  │
│           │                                  │                             │
│ 🔍 rech.  ├──────────────────────────────────┴─────────────────────────────┤
│ Contexte  │  CONSOLE (par fonction) : Logs · Info · Erreurs · Objet  🗑 ▾  │
│ Helpers   │                                                                │
│ Extraits  │                                                                │
└───────────┴────────────────────────────────────────────────────────────────┘
```

La **toolbox** occupe toute la hauteur à gauche. La **console** se trouve sous la zone éditeur+contexte
seulement (elle ne couvre pas la toolbox).

---

## 3. Fonctionnalités, par zone

### 3.1 Barre du haut
- **Nom du cerveau** : détermine le nom de la classe générée et la clé `registerAlgorithm`.
- **Thème** : Noir (défaut, fond #000) ou One Dark.
- **1 panneau / 2 panneaux** : afficher un ou deux éditeurs côte à côte.
- **⇄** : échanger les fonctions gauche/droite (en mode 2 panneaux).
- **Édition / Code généré** : basculer entre l'édition et l'aperçu du code TypeScript complet.
- **⬇ .ts** : télécharger la classe générée.

### 3.2 Barre de projets et versions
- **Projet ▾** : choisir le projet courant.
- **＋ nouveau** : créer un projet (démarre en version V-1.0.0).
- **⧉ cloner** : dupliquer le projet courant (toutes ses versions).
- **🗑** : supprimer le projet courant.
- **Version ▾** : choisir la version active du projet.
- **＋ version** : créer une nouvelle version (copie de l'active, étiquette V-1.x.0 incrémentée).
- **💾 Sauvegarder serveur** : persister le projet/version sur le serveur.
- **↻ liste serveur** + sélecteur : récupérer et ouvrir un projet depuis le serveur.
- **État de sync** : ● local · ⏳ sauvegarde… · ✓ serveur · ⚠ hors-ligne.

### 3.3 Toolbox (gauche)
- **Fonctions** : la liste des fonctions du cerveau (4 du contrat + custom). Pour chacune :
  ouvrir dans le panneau principal, ◧ ouvrir à gauche (split), ▶ tester seule, ✎ renommer/paramètres (custom), ✕ supprimer (custom).
- **＋ ajouter** : créer une fonction personnalisée.
- **Recherche** : filtre le contexte et les helpers.
- **Contexte** : palette du `RobotContext` ; clic = insère le chemin dans le panneau principal.
- **Helpers** / **Extraits** : insérables d'un clic.

### 3.4 Éditeur(s) de code (centre)
- Éditeur CodeMirror coloré, numéros de ligne, repli, auto-complétion, fermeture de crochets.
- En mode 2 panneaux : le panneau de **droite est le principal** (il reçoit les insertions de la toolbox).
- Bouton **▶ Tester** par éditeur.

### 3.5 Panneau de contexte (droite)
- **Ma main** : 8 cartes éditables (clic = rang suivant, clic droit = couleur), bouton **🎲 Redistribuer**
  (donne aléatoire).
- **Réglages** : atout, phase, agressivité/concentration (sliders), annonces partenaire/courante, peut contrer/surcontrer.
- **Contexte complet (JSON)** : affiche/édite tout le contexte d'aperçu (y compris l'**AlgoSpec**) en JSON.
  « ✓ Appliquer » répercute les modifications partout (cartes, réglages, génome) ; « ↻ recharger » ; « défaut ».

### 3.6 Console (par fonction)
- **Privée à chaque fonction** : sélecteur de la fonction dont on voit la console.
- Onglets **Logs / Info / Erreurs / Objet** (le retour de la dernière exécution), avec compteurs.
- **Minimisée par défaut** ; actions en icônes : **🗑** (vider cette console), **▾/▴** (réduire/ouvrir).

---

## 4. Cas d'usage

### CU-1 — Écrire une règle d'enchère
1. Onglet `decideBid`. 2. Régler la main (3 As) et l'annonce du partenaire (110) à droite.
3. Écrire : « si 3 As et partenaire a ouvert ≥110 → capot ». 4. ▶ Tester → la console montre `{ action: 'capot' }`.

### CU-2 — Factoriser avec une fonction custom
1. ＋ ajouter → `evaluerMain`. 2. ✎ → paramètres `ctx`. 3. Coder le calcul, retour `number`.
4. Dans `decideBid`, appeler `this.evaluerMain(ctx)`. 5. ▶ Tester `decideBid`.

### CU-3 — Tester contre plusieurs donnes
1. 🎲 Redistribuer plusieurs fois. 2. ▶ Tester à chaque donne. 3. Observer la décision et les logs.

### CU-4 — Construire un contexte précis en JSON
1. Panneau « Contexte complet (JSON) » → afficher. 2. Modifier la main / l'AlgoSpec. 3. ✓ Appliquer.
4. Les cartes et les réglages se mettent à jour ; ▶ Tester.

### CU-5 — Versionner et sauvegarder
1. ＋ version (V-1.1.0). 2. Modifier. 3. 💾 Sauvegarder serveur. 4. Revenir à V-1.0.0 via le sélecteur.

### CU-6 — Exporter et brancher dans le jeu
1. ⬇ .ts. 2. Déposer le fichier dans le projet. 3. Donner `name` du cerveau à l'`AlgoSpec` d'un robot.
4. Ce robot utilise ce cerveau (local et serveur).

---

## 5. Règles de comportement

- **Anti-perte** : le travail est sauvegardé en continu dans le navigateur (localStorage). Fermer/rouvrir
  ne perd rien.
- **Local-first** : tout fonctionne hors-ligne ; la sauvegarde serveur est best-effort (un échec retombe en local).
- **Aperçu isolé** : tester n'affecte pas une vraie partie ; c'est une exécution à blanc sur le contexte d'exemple.
- **Nouveau projet** : démarre toujours en V-1.0.0 avec les 4 fonctions du contrat pré-remplies.
