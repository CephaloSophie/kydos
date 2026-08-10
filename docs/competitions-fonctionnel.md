# Compétitions — Guide fonctionnel

> **Public** : produit, back office, support, testeurs. Aucune notion technique
> requise. Décrit ce que le joueur voit et fait dans l'application.

## Vue d'ensemble

L'écran **Compétitions** est le hub où le joueur peut :

1. **S'inscrire à un match rapide** parmi 3 formats — la partie démarre dès que
   le serveur trouve d'autres joueurs.
2. **Consulter et rejoindre un tournoi** à bracket, planifié à l'avance.

## Les 3 formats de match rapide

Chaque format a des règles économiques fixes, définies côté serveur (**source
unique** : `matchFormat.ts`). Aucun paramètre n'est modifiable par le joueur.

### 🟡 Duo d'acier

- **Effectif** : 2 joueurs × 2 robots (4 robots au total).
- **Buy-in** : 200 ◆ par joueur (100 ◆ par robot).
- **Gain vainqueur** : 150 ◆ (crédité au propriétaire de l'équipe gagnante).
- **Part maison (kydos)** : 50 ◆.
- **Particularité** : **100 % en coulisses**. Aucune animation, aucune
  attente entre les cartes. La partie tourne en synchrone sur le serveur
  (< 1 seconde). Le joueur voit le résultat immédiatement et peut rejouer
  le match complet avec vitesse ajustable.

### 🟢 Alliance hybride

- **Effectif** : 2 humains + 2 robots (1 humain + 1 robot par équipe).
- **Buy-in** : 150 ◆ par joueur.
- **Gain vainqueur** : 225 ◆ pour l'humain de l'équipe gagnante.
- **Part maison** : 75 ◆.
- **Particularité** : partie en temps réel, avec une table de jeu ouverte
  aux 2 humains. Le robot coéquipier joue automatiquement.

### 🔴 Carrée royale

- **Effectif** : 4 humains, aucun robot.
- **Buy-in** : 100 ◆ par joueur.
- **Gain vainqueur** : 150 ◆ pour chacun des 2 humains de l'équipe gagnante.
- **Part maison** : 100 ◆.
- **Particularité** : le format le plus « pur ». Pas de robots, uniquement
  des humains.

## Parcours d'inscription — étape par étape

### 1. Choisir un format

Sur l'écran **Compétitions**, chaque format est présenté sur une carte
colorée avec :
- Le nom et le sous-titre.
- Le tag (2 ROBOTS × 2, HUMAIN + ROBOT, 4 HUMAINS).
- L'économie affichée : Buy-in ◆ · Gain ◆.
- Bouton **S'inscrire** et bouton **Annuler**.

**Cliquer sur S'inscrire** : le serveur vérifie que le joueur a le bon
nombre de robots dans son écurie (0, 1 ou 2 selon le format), débite le
buy-in, et met le joueur dans la file d'attente du format.

### 2. Écran d'attente (waiting)

Après inscription, le joueur est **redirigé automatiquement** vers l'écran
`matchmaking?format=X`, qui affiche :

- Un bandeau coloré au format choisi (or / vert / rouge).
- 4 robots dansants en filigrane avec le texte « recherche d'adversaire ».
- Un texte contextualisé :
  - Duo d'acier : « Vos deux robots attendent des adversaires. »
  - Alliance hybride : « On attend un autre joueur avec son robot. »
  - Carrée royale : « Il faut 4 humains pour démarrer. »
- Un bouton **✖ Annuler la recherche** — remboursement complet et retour à
  l'écran Compétitions.

Le mobile interroge le serveur **toutes les 2 secondes** (polling léger)
pour vérifier si le match a été créé pour lui.

### 3. Match trouvé — vue en direct

Dès que le serveur trouve les adversaires, l'écran waiting bascule
automatiquement vers la vue **MATCH EN COURS** :

- Un point vert clignotant + « MATCH EN COURS » en haut.
- Les 4 participants disposés en 2 équipes :
  - **Équipe A** (vert) à gauche : nom des joueurs / robots, siège, score.
  - **VS** au centre.
  - **Équipe B** (rouge) à droite.
- Score en direct de chaque équipe (mis à jour pour Duo d'acier une fois
  la partie terminée).

Un texte contextualisé sous la table :
- Duo d'acier : « la partie se joue en coulisses. Vous verrez le résultat
  d'ici quelques secondes. »
- Autres formats : « Une table de jeu s'ouvre pour les humains. »

### 4. Match terminé

Quand le match est fini, l'écran affiche automatiquement le résumé :

- Un grand emoji : 🏆 pour la victoire, 🥈 pour la défaite, 🤝 pour le
  match nul.
- Le titre : **Victoire !** / **Défaite** / **Match nul**.
- Le score final : « Équipe A X — Équipe B Y ».
- Deux boutons :
  - **▶ Rejouer le match** (renvoie vers l'écran ReplayScreen).
  - **Retour** (revient à l'écran Compétitions).

Le solde du joueur est automatiquement rafraîchi (crédit du gain si
vainqueur, débit du buy-in dans tous les cas).

## Rejouer un match — vitesses ajustables

L'écran **Replay** rejoue la partie carte par carte, avec les contrôles :

- **⏸ Pause / ▶ Reprendre**.
- **⏹ Stop** : reset au début du replay et met en pause.
- **Vitesse** : cycle 1× → 2× → 4× → 0.5× → 1×.

Utile surtout pour Duo d'acier (parties jouées en synchrone → le replay est
le seul moyen de voir le déroulement carte par carte).

## Tournois

### Statuts d'un tournoi

Un tournoi passe par 4 statuts pilotés par le serveur :

- **📝 Draft** — préparé par kydos, **invisible aux joueurs**. Réservé au
  back office pour ajuster les paramètres avant publication.
- **⏳ À venir** — publié, inscriptions ouvertes. Les joueurs peuvent
  s'inscrire ou se désinscrire librement (remboursement complet).
- **🔴 En cours** — démarré automatiquement à l'heure prévue (`startAt`).
  Plus d'inscription ni de désinscription. Les matchs s'enchaînent.
- **✅ Terminé** — bracket complet. Écran résumé consultable avec le
  podium, les gains distribués, et un bouton **Rejouer** par match.

### La règle « 1 tournoi / robot / jour »

Un robot ne peut être inscrit qu'à **un seul tournoi par jour** (date UTC).
Si un joueur essaie d'inscrire un robot déjà engagé aujourd'hui, il reçoit
le message « Un de vos robots est déjà engagé dans un tournoi ce jour-là. »

### Capacités disponibles

**4, 8, 16, 32, 64 ou 128 participants** (puissances de 2 pour un bracket
propre). La capacité est fixée à la création du tournoi.

### Gains par tour (rounds)

Le back office configure un gain par round. Par exemple pour un tournoi de
16 participants :

- Round 1 (départs) : 0 ◆
- Round 2 (8èmes → 8 survivants) : 300 ◆ / survivant
- Round 3 (quarts → 4 survivants) : 400 ◆ / survivant
- Round 4 (demi-finales → 2 survivants) : 500 ◆ / survivant
- Round 5 (finale → 1 vainqueur) : 1 500 ◆

Chaque joueur qui survit à un round reçoit **cumulativement** les gains
des rounds précédents (300 au 8ème, +400 au quart s'il passe, etc.).

### Rentabilité pour kydos (positive ou négative)

Le serveur calcule automatiquement :

- **Total collecté** = `capacité × buy-in`
- **Total payé** = somme de (survivants × prix) par round
- **Gain net kydos** = collecté − payé (**peut être négatif** si le tournoi
  est mal calibré, ce qui déclenchera une alerte dans le back office avant
  publication).

Exemple concret (spec) :
- 16 participants × 1 000 ◆ buy-in = **16 000 ◆ collectés**.
- Distribution : 0 + (8×300) + (4×400) + (2×500) + 1 500 = **6 500 ◆
  payés**.
- **Gain net kydos = 9 500 ◆.**

### Vue détaillée d'un tournoi

Quand le joueur clique sur une ligne tournoi dans la liste, il ouvre l'écran
`TournamentScreen` qui affiche 4 vues selon le statut :

**⏳ À venir**
- Bandeau doré avec compte à rebours (« début dans 2h »).
- Bouton **S'inscrire** (ou **Se désinscrire** si déjà inscrit).
- Tableau des gains par tour.

**🔴 En cours**
- Bracket visuel en colonnes (une par round).
- Matchs terminés affichés dans leur colonne.
- Matchs en cours cliquables (accès spectateur).

**✅ Terminé** — L'écran **« coupe du monde »**
- Podium 🏆 avec le champion (et les finalistes s'il y en a).
- Récap des gains distribués par tour.
- Bouton **▶ Rejouer** pour chaque match du bracket.

### Spectateurs — jusqu'à 10 par match

Sur les matchs en cours (formats **Alliance hybride** ou **Carrée royale**),
jusqu'à **10 spectateurs** peuvent regarder la partie en direct. Un compteur
« X spectateurs » est affiché.

**Duo d'acier n'accepte pas de spectateurs** : la partie se joue trop vite
en coulisses, un stream temps réel n'aurait aucun sens.

### Quitter une partie en cours

Si un joueur ferme l'application pendant un match en cours, son **robot
principal prend automatiquement le relais**. Quand le joueur revient, il
récupère la main sur les prochaines actions. Une icône **LIVE** apparaît
dans le bandeau supérieur pour indiquer une partie en cours.

## Comptabilité kydos

Chaque événement économique est enregistré dans une collection dédiée
`HouseTransaction`. Trois types :

- **`match_rake`** — le rake d'un match terminé (positif).
- **`tournament_entry`** — le buy-in collecté à l'inscription d'un joueur
  (positif). Devient négatif si le joueur se désinscrit (remboursement).
- **`tournament_prize`** — le gain versé à un joueur (négatif du point de
  vue kydos).

Le back office affichera :
- Total kydos par jour / semaine / mois.
- Détail par tournoi et par match.
- Alerte si un tournoi affiche un `houseNet` négatif à la publication.

## Erreurs et messages courants

| Situation | Message |
|---|---|
| Solde insuffisant | « Solde insuffisant pour ce buy-in. » |
| Robot manquant | « Il vous faut X robot(s) dans votre écurie. » |
| Robot déjà engagé aujourd'hui | « Un de vos robots est déjà engagé dans un tournoi ce jour-là. » |
| Tournoi complet | « Tournoi complet. » |
| Inscription trop tard | « Les inscriptions sont fermées. » |
| Déjà inscrit | « Vous êtes déjà inscrit à ce tournoi. » |

Tous les messages sont en français, écrits pour être lisibles par un joueur
non-technicien.
