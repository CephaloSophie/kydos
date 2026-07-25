# Kýdos Belote — Spécification maîtresse du produit

Ce document est **la source unique de vérité produit** pour Kýdos Belote.
Toute IA reprenant le projet doit lire ce fichier AVANT `README.md`, `MOBILE.md`
ou `API.md`. Il consolide les exigences issues des conversations avec Ameur
Hamdouni (CEO & Founder & Architect, Cephalo Sophie).

## 1. Contexte et identité

Kýdos Belote est un jeu de **belote contrée** haut de gamme, orienté robots IA
personnalisables, jouable seul contre robots ou en ligne humain / robot vs
humain / robot. Il est édité par **Cephalo Sophie**, éditeur de la plateforme
no-code KANTO APLO (« Rends-le Simple »).

| | |
| --- | --- |
| Éditeur | Cephalo Sophie — https://cephalosophie.com |
| Plateforme sœur | KANTO APLO — https://kantoaplo.com |
| Site officiel du jeu | https://kydosbelote.com |
| Contact général | contact@cephalosophie.com |

| Fondateur | Rôle | Email |
| --- | --- | --- |
| Ameur Hamdouni | CEO & Founder & Architect | ameur.hamdouni@cephalosophie.com |
| Abdelhamid Sghaier | Co-fondateur & CTO · expert mobile | abdelhamid.sghaier@cephalosophie.com |

Clients de l'entreprise : IFPEN, La Poste, LeadsHook, Docaposte, Softia,
JCDecaux, Unibet, Allianz.

## 2. Vision produit

- La belote contrée est **le premier** jeu, mais Kýdos est pensé comme une
  plateforme de jeux à robots (« algorithms as characters »).
- Les robots sont des **individus** : nom, avatar, personnalité paramétrable ;
  ils accumulent ELO, statistiques, replays publics.
- **Fédération de serveurs-villes** à terme (une communauté par ville).
- Les utilisateurs jouent, entraînent, sauvegardent, et rejouent leurs
  parties comme des matchs sportifs.

## 3. Modules produit (à l'état v10.2.0 et au-delà)

Les modules ci-dessous constituent la **définition officielle** du produit.
La version implémentée pour chaque module est indiquée entre crochets ;
« ⏳ » indique un module non encore livré.

### 3.1 Authentification [v10.1.0]
- Création de compte et connexion via `/auth/register` et `/auth/login`.
- Jeton JWT stocké côté mobile en `localStorage.kydos.mobile.token`.
- Écran de login = carte de belote as de cœur, flip 3D.

### 3.2 Entraînement / Jouer contre robots [v10.1.0 → v10.2.0]
- La partie contre robots utilise la table Pixi partagée montée dans
  l'emplacement réservé du DS (`#game-table-mount`).
- **[v10.2.0]** Dialogue de configuration : emplacement de chaque siège
  (Moi / Auto / mes robots), visibilité des cartes (Personne / Mes robots /
  Tout le monde), nombre de manches (1 / 2 / 4).
- **Coéquipier toujours caché** en mode « cartes visibles » (règle de belote).
- **Logs en overlay** semi-transparent, bas gauche de la table, minimisable /
  maximisable. → Implémenté en tranche courante.

### 3.3 Partie en ligne humain/robot vs humain/robot [v10.4.0 partiel — lobby mobile + reprise robot ; le jeu temps réel mobile passe par le web]
- Chaque humain rejoint la partie **obligatoirement avec un robot** — c'est
  le robot qui prend la relève si l'humain se déconnecte.
- Choix des sièges tant qu'ils ne sont pas pris ; les humains d'une même
  équipe peuvent choisir leur coéquipier avant le lancement.

### 3.4 Historique et rejeu live [v10.1.0]
- Historique de toutes les parties de l'utilisateur (`GET /games`).
- Rejeu live avec les **délais réels** de réflexion des joueurs / robots.
- **Collection de replay indépendante** contenant tous les événements
  (annonces, plis, contres, surcontres, smileys, réflexions, belote) —
  extension en cours dans la tranche présente pour couvrir les smileys et
  les temps réels.

### 3.5 Équipes [v10.3.0]
- Un utilisateur peut créer **une seule équipe** (rôle **owner**).
- Il peut rejoindre plusieurs autres équipes en tant que **super**, **admin**
  ou **user** (rôles suivant les permissions ci-dessous).
- Maximum **40 membres** par équipe.
- **Permissions** :
  - `owner` : plein pouvoir sur l'équipe (rename, kick, changement de rôle
    de tous, dissolution).
  - `super` : rename, kick, changement de rôle des `admin` et `user` (mais
    ne peut pas toucher au `owner`).
  - `admin` : kick et changement de rôle des `user` uniquement.
  - `user` : peut jouer / regarder les parties de l'équipe, entrer comme
    spectateur.
- Toute action de rôle est **auditable** (logs dans la collection dédiée).

### 3.6 Compétitions / tournois [v10.1.0]
- Vitrine des futurs tournois (Grand Prix des IA, Coupe Contrée, Ligue hebdo).
- Pas de vrais tournois pour le moment.

### 3.7 Spectateurs [v10.3.0 — socket + vue filtrée]
- Maximum **5 spectateurs simultanés** par partie.
- Un spectateur voit : les annonces, le dernier pli, le score cumulé, les
  cartes JOUÉES, les smileys, les icônes de réflexion, la belote / rebelote.
- Un spectateur ne voit **JAMAIS** les cartes en main des joueurs / robots.

### 3.8 Verrou une-partie-à-la-fois [v10.3.0 — service + bannière]
- Un utilisateur qui est dans une partie **ne peut pas** accéder à une autre,
  même s'il l'a quittée : son robot favori (ou l'un de ses robots) prend la
  main tant que la partie ne s'est pas terminée.
- Il ne peut pas créer une nouvelle partie tant qu'il est dans une partie en
  cours **ou** qu'il a une partie en `pending` (en attente d'autres joueurs).
- Il peut **annuler** une partie `pending`, mais dès que les 4 sièges sont
  pris (ou que l'autre humain avec son robot arrive), l'annulation n'est
  plus possible.
- Sur l'accueil, la partie en cours est signalée en **vert « Partie en
  cours… »** tant qu'elle vit ; dès qu'elle finit, elle bascule vers
  l'historique.

### 3.9 Économie de jetons [v10.3.0 — /wallet serveur + payouts en fin de partie]
- **Récompense quotidienne** de 500 jetons — l'utilisateur clique sur la
  pastille pour débloquer, crédit immédiat, une fois par jour, côté SERVEUR
  (localStorage seulement en fallback offline).
- **Prélèvements par partie** (sauf mode entraînement / local) :
  - 100 jetons par humain ; 50 jetons par robot ; mise totale = 150 (partie
    entre 4 robots) à 400 (partie entre 4 humains).
- **Gains** :
  - 4 humains : 100 chacun mis ; 150 pour chaque humain gagnant.
  - 2 humains + 2 robots : 150 mise commune ; 225 pour l'humain vainqueur
    (avec son robot).
  - 4 robots : 50×2 = 100 par camp ; 150 pour chaque robot gagnant.

### 3.10 Sauvegarde des parties [v10.4.0 — replays enrichis + recherche publique par nom]
- Les parties de l'utilisateur, celles de ses robots, et les parties
  publiques par nom de joueur / robot sont accessibles.
- **La collection replay est indépendante** de `Game` (perf) : elle stocke
  la version enrichie avec smileys, réflexions, temps réels des annonces
  et des coups.

### 3.11 À propos [v10.1.0]
- Cephalo Sophie, KANTO APLO, kydosbelote.com, équipe, clients.

## 4. Architecture technique (rappel)

Voir `docs/ai/README.md` pour la vue d'ensemble du monorepo et
`docs/ai/MOBILE.md` pour l'architecture de l'app mobile.
Web et mobile sont **deux applications séparées** qui partagent
`belote-core` et le composant table Pixi via l'alias `@table-pixi`.

## 5. Priorités actuelles (tranche v10.3.0)

Dans l'ordre de la conversation avec Ameur :

1. **Équipes** avec les 4 rôles, la limite de 40 membres, les permissions et
   les écrans mobiles associés.
2. **Verrou une-partie-à-la-fois** au niveau du serveur (via un champ
   `activeSession` sur `User`, contraint par un service transactionnel).
3. **Spectateurs** (max 5, vue filtrée sans hands).
4. **Économie serveur** : ajouter au modèle `User` un porte-monnaie et un
   journal de transactions ; endpoints `/wallet` et `/wallet/claim`.
5. **Collection replay indépendante enrichie** avec smileys, réflexions,
   temps réels ; endpoints publics par nom.
6. **Statut « Partie en cours » vert** sur l'accueil mobile.
7. **Overlay de logs** transparent bas gauche pour l'écran de partie.

Le tout avec tests unitaires + tests d'intégration serveur, documentation à
jour, et couverture stable ou en hausse.

## 6. Conventions non-négociables

- Aucun stub, aucun code mort livré, aucune vitrine sans backend.
- Chaque livraison est verte : typecheck × 4 workspaces + tests + builds +
  démo moteur.
- Tests commentés en **anglais** (règle projet).
- Docs mises à jour **à chaque changement** — jamais après.
- Chaque fichier de code décrit son rôle en tête (bloc `/* ==== */`).
- Web et mobile : **jamais d'import croisé** au-delà de `belote-core` et
  `@table-pixi`.
