# Kýdos Belote — Backlog v14.1.0

179 tâches · généré 2026-08-09T09:30:00.000Z

**P1 ouvertes** : KB-004, KB-071, KB-121, KB-131

## Tâches par version

### v14.1.0 — 9 · 42 pts · 3.5 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-441 | Tournament model + statuts + verrou 1 tournoi/robot/jour | Testée | P1 | feature |
| KB-442 | tournamentEconomics : rentabilité (fonction pure) | Testée | P1 | feature |
| KB-443 | TournamentService : join/leave avec règle 1/robot/jour | Testée | P1 | feature |
| KB-444 | Bracket + orchestrateur : progression round par round | Testée | P1 | feature |
| KB-445 | Worker cron interne : upcoming→live et progression | Testée | P2 | feature |
| KB-446 | Controller HTTP tournois + endpoints joueur | Testée | P2 | feature |
| KB-447 | Match socket : spectateurs 10 max (DUO_STEEL exclu) | Testée | P2 | feature |
| KB-448 | Seed : 4 tournois de démo (1 par statut) | Testée | P2 | feature |
| KB-449 | Écran mobile : liste des tournois avec filtres | Testée | P2 | feature |

### v14.0.0 — 9 · 47 pts · 3.8 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-432 | MatchFormat enum + catalog économique (source unique) | Testée | P1 | feature |
| KB-433 | Modèle Match unifié pour les 3 formats | Testée | P1 | feature |
| KB-434 | MatchmakingQueue : interface abstraite + InMemory + Redis | Testée | P1 | feature |
| KB-435 | MatchmakingService : enqueue, matching, création Match | Testée | P1 | feature |
| KB-436 | MatchHeadlessRunner : exécution DUO_STEEL sans délai | Testée | P1 | feature |
| KB-437 | HouseAccounting : comptabilité kydos (rake, entrées, prix) | Testée | P1 | feature |
| KB-440 | Refonte CompetScreen mobile : 3 tuiles + inscription réelle | Testée | P1 | feature |
| KB-438 | Redis URL dans environment (fallback InMemory) | Testée | P2 | feature |
| KB-439 | Controller + routes matchmaking + wiring module | Testée | P2 | feature |

### v13.0.1 — 2 · 8 pts · 7.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-301 | Édition d'un robot (updateRobot serveur + mobile) | Testée | P1 | feature |
| KB-431 | Édition de robot bout-en-bout (mobile) — KB-301 résolue | Testée | P1 | feature |

### v13.0.0 — 6 · 29 pts · 3.1 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-425 | SessionCache : chargement unique profil/wallet/VIP/robots persisté | Testée | P1 | feature |
| KB-426 | persistentStorage : couche de stockage cross-platform versionnée | Testée | P1 | feature |
| KB-427 | Bootstrap : chargement session + preload de tous les sons | Testée | P1 | feature |
| KB-429 | TopBar + écrans branchés sur le cache (fin du spam API) | Testée | P1 | refactor |
| KB-428 | Waiting : écran de chargement réutilisable (robots qui dansent) | Testée | P2 | feature |
| KB-430 | Tests + doc du cache de session | Testée | P2 | test |

### v12.4.4 — 1 · 5 pts · 2.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-424 | Déduplication in-flight des GET + optim WalletScreen/RobotsScreen/OnlineScreen | Testée | P1 | refactor |

### v12.4.3 — 1 · 5 pts · 2.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-423 | Audit systématique des screens : cleanup complet au démontage | Testée | P1 | bug |

### v12.4.2 — 1 · 5 pts · 3.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-422 | Fix racine TopBar : arrêt du spam d'API + VIP autoritaire serveur | Testée | P1 | bug |

### v12.4.1 — 1 · 3 pts · 2.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-421 | Bord seed : normalisation défensive des tâches malformées | Testée | P1 | bug |

### v12.4.0 — 5 · 27 pts · 3.9 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-416 | Backend Bord : API Express + Mongo (bordjira) + auth JWT | Testée | P1 | feature |
| KB-417 | Archivage automatique versionné des tâches | Testée | P1 | feature |
| KB-418 | Seed idempotent : 2 comptes ameur/hamido + import tasks.json | Testée | P1 | feature |
| KB-419 | Frontend Bord : SPA Vite + 4 thèmes Ubuntu/Mac clair/sombre | Testée | P1 | feature |
| KB-420 | PM2 + README complet du backoffice | Testée | P1 | docs |

### v12.3.0 — 5 · 17 pts · 1.4 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-411 | Fabrique unifiée buildLocalGame côté mobile | Testée | P1 | feature |
| KB-412 | Surcoinche gérée dans GameLoop.plan (parité web/serveur) | Testée | P1 | feature |
| KB-413 | Tests de parité mobile ↔ core | Testée | P1 | test |
| KB-414 | TableScreen refondu : appel buildLocalGame + imports nettoyés | Testée | P2 | refactor |
| KB-415 | Documentation architecture-robots : pilote mobile officialisé | Testée | P2 | docs |

### v12.2.2 — 4 · 15 pts · 1.2 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-407 | AdMob chargé via le pont Capacitor (fix 'plugin not installed' faux positif) | Testée | P1 | bug |
| KB-408 | VIP côté serveur : endpoints /wallet/vip + débit atomique | Testée | P1 | feature |
| KB-409 | adConfig : IDs de test AdMob + debugGeography EEA en test | Testée | P2 | feature |
| KB-410 | Documentation ADS enrichie (Capacitor bridge + zsh + testDeviceIds) | Testée | P2 | docs |

### v12.2.1 — 7 · 21 pts · 1.6 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-400 | AdMobProvider aligné sur l'API v6 (App Open + consent RGPD) | Testée | P1 | bug |
| KB-401 | VIP débite réellement les jetons (achat + cumul) | Testée | P1 | bug |
| KB-402 | VIP visible : badge couronne sur avatar + bandeau dans le profil | Testée | P1 | feature |
| KB-405 | Training : respecter la visibilité des cartes des robots | Testée | P1 | bug |
| KB-403 | Version de l'app dans l'écran À propos | Testée | P2 | feature |
| KB-404 | Message clair quand pub récompensée échoue | Testée | P2 | bug |
| KB-406 | Documentation ADS refondue : MODE TEST vs MODE PRODUCTION séparés | Testée | P2 | docs |

### v12.2.0 — 6 · 0 pts · 0.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-390 | Retrait des 2 bannières de la table + agrandissement | Testée | P2 | 2 |
| KB-391 | Popup d'annonce au-dessus des cartes du joueur | Testée | P2 | 1 |
| KB-392 | Icônes SVG épurées pour le menu de la table | Testée | P2 | 3 |
| KB-393 | Indicateur VIP visible en jeu (halo autour du logo) | Testée | P2 | 5 |
| KB-394 | Menu profil ergonomique (niveau/avatar → profil + déconnexion) | Testée | P2 | 5 |
| KB-395 | Documentation ADS clarifiée (voir pubs de test sur device) | Testée | P2 | 3 |

### v12.1.0 — 4 · 19 pts · 2.1 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-300 | Économie — prélever la mise au lancement (équilibrer les payouts) | Testée | P1 | bug |
| KB-380 | Prélèvement des mises au lancement de la partie | Testée | P1 | feature |
| KB-381 | Codes promo de rechargement (12 chiffres, validité, quota) | Testée | P1 | feature |
| KB-382 | Pastille jetons → page porte-monnaie + doc AdMob test/prod | Testée | P1 | feature |

### v12.0.0 — 4 · 26 pts · 3.0 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-370 | Architecture publicitaire multi-fournisseurs (AdProvider + registre + config) | Testée | P1 | feature |
| KB-371 | AdManager — orchestration des emplacements + règles métier | Testée | P1 | feature |
| KB-372 | Statut VIP (sans publicité) — achat par jetons | Testée | P1 | feature |
| KB-373 | Pubs récompensées + bannière + documentation | Testée | P1 | feature |

### v11.13.0 — 3 · 8 pts · 4.5 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-360 | Menu vertical d'icônes à gauche (quitter, spectateurs, en ligne, volume, smileys, vitesse, pause) | Testée | P1 | feature |
| KB-361 | Bouton Quitter du haut supprimé — table Pixi agrandie au maximum | Testée | P1 | feature |
| KB-362 | Dernier pli aligné au haut de la feuille de score | Testée | P1 | feature |

### v11.12.0 — 8 · 21 pts · 1.6 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-350 | Table agrandie + espace bannières pub en bas | Testée | P1 | feature |
| KB-351 | Épurer le haut de la table (score, atout, noms retirés) | Testée | P1 | feature |
| KB-352 | Rail gauche : spectateurs, pastille en ligne, volume | Testée | P1 | feature |
| KB-353 | Cartes jouées : valeurs jamais cachées (placement par secteur) | Testée | P1 | feature |
| KB-354 | Mains sud/nord collées aux extrémités | Testée | P1 | feature |
| KB-355 | Dernier pli remonté plus haut | Testée | P1 | feature |
| KB-356 | Popup annonce : ne cache plus les cartes, épuré | Testée | P1 | feature |
| KB-357 | Étiquettes joueurs/robots plus compactes | Testée | P1 | feature |

### v11.11.0 — 1 · 8 pts · 6.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-340 | Infrastructure de connexion mobile↔serveur : healthcheck + Makefile + doc 4 cibles | Testée | P1 | feature |

### v11.10.0 — 1 · 8 pts · 6.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-330 | Système sonore de la table — effets, mélodies par table, volumes | Testée | P1 | feature |

### v11.9.1 — 1 · 3 pts · 2.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-320 | Connexion mobile au serveur — URL configurable (device physique) | Testée | P1 | bug |

### v11.9.0 — 1 · 8 pts · 6.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-310 | Fiabilisation — couverture, TNR serveur, E2E web, CI automatisée | Testée | P1 | test |

### v11.8.0 — 8 · 29 pts · 2.5 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-302 | Robot favori — câbler la reprise automatique de siège | À faire | P2 | feature |
| KB-303 | ELO réel des robots (classement gagné/perdu) | À faire | P2 | feature |
| KB-304 | Décision de parité WEB (remettre à niveau ou geler) | À faire | P2 | doc |
| KB-305 | CI réelle — activer tests Mongo + captures Playwright | En cours | P2 | test |
| KB-290 | BUG — émojis non reçus par les autres (champ kind vs type) | Testée | P0 | bug |
| KB-291 | Cartes jouées superposées au centre avec inclinaisons logiques + aléatoires | Testée | P1 | feature |
| KB-292 | Feuille de score — Nous/Eux (vert/rouge) relatifs au spectateur | Testée | P1 | bug |
| KB-293 | Réduire de 30% les cartes des 3 autres joueurs | Testée | P2 | feature |

### v11.7.0 — 5 · 10 pts · 1.1 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-283 | BUG — le menu Invitations menait à la page d'authentification | Testée | P0 | bug |
| KB-280 | Émotes unifiées et visibles par tous (une seule liste, diffusées) | Testée | P1 | bug |
| KB-282 | BUG — réflexion 💭 non affichée pour tous les joueurs | Testée | P1 | bug |
| KB-281 | Dock d'émotes minimisé en bas-gauche du tapis | Testée | P2 | feature |
| KB-284 | Indicateur « partie en cours » — pastille LIVE animée près du logo | Testée | P2 | feature |

### v11.6.0 — 4 · 13 pts · 1.5 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-270 | BUG — retour de partie : mauvais nombre de joueurs, impossible de reprendre | Testée | P0 | bug |
| KB-272 | BUG — rejeu : les cartes ne se jouaient pas (seul le score bougeait) | Testée | P0 | bug |
| KB-271 | Smileys en ligne — envoyer et voir les réactions des joueurs | Testée | P1 | feature |
| KB-273 | Profil joueur — popup à onglets (Infos, Robots, Stats) via clic sur le nom | Testée | P1 | feature |

### v11.5.0 — 3 · 12 pts · 1.5 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-042 | MANQUANT — Invitations d'équipe côté mobile | Testée | P0 | feature |
| KB-260 | Serveur — endpoints annuler + compter invitations, accept renforcé | Testée | P0 | feature |
| KB-261 | Mobile — écran Invitations (reçues/envoyées) + inviter + badge | Testée | P0 | feature |

### v11.4.0 — 2 · 6 pts · 7.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-250 | Migration Cordova → Capacitor + README dédié | Testée | P1 | chore |
| KB-251 | Refonte du référentiel en board Agile complet (dimensions multiples) | Testée | P2 | doc |

### v11.3.0 — 8 · 21 pts · 2.8 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-240 | BUG — robots occupés + bannière « Partie en cours » persistante après la fin | Testée | P0 | bug |
| KB-242 | Tableau de statistiques détaillées par partie (distinct du rejeu) | Testée | P0 | feature |
| KB-241 | Écran de fin de partie soigné (résultat, score, actions) | Testée | P1 | feature |
| KB-243 | Parties en ligne visibles « en cours » avec bouton Regarder + filtres + pagination | Testée | P1 | feature |
| KB-244 | Historique : filtres de portée (mes parties / mes robots / équipe / publiques) + pagination 15 | Testée | P1 | feature |
| KB-245 | Parties 100% robots simulées sur le serveur (sans socket) et archivées | Testée | P1 | feature |
| KB-246 | Rejeu 100% local d'une partie sauvegardée (min 2s/action, vitesse réglable) | Testée | P1 | feature |
| KB-247 | Indépendance stricte des données par session/instance de jeu | Testée | P1 | chore |

### v11.2.0 — 9 · 20 pts · 2.5 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-230 | BUG — bouton Quitter plantait en ligne (dispose sur undefined) | Testée | P0 | bug |
| KB-231 | Auto-départ serveur (5s) + compte à rebours synchronisé, sans bouton Lancer | Testée | P0 | feature |
| KB-234 | Reprise immédiate de siège au retour (substitution instantanée au départ) | Testée | P0 | bug |
| KB-232 | Anti-blocage : libérer un siège robot non complété (10s, hybride/acier) | Testée | P1 | feature |
| KB-233 | En ligne : masquer logs + pause/vitesse, afficher les spectateurs | Testée | P1 | feature |
| KB-235 | Moniteur wslogs — répertoire + tableau temps réel des sessions/logs | Testée | P1 | feature |
| KB-236 | Écran d'initialisation au thème du jeu (waiting + 4 robots animés) | Testée | P1 | feature |
| KB-237 | Bouton Rejoindre sur les équipes publiques | Testée | P1 | bug |
| KB-238 | CORS multi-domaines configurable | Testée | P2 | feature |

### v11.1.0 — 10 · 34 pts · 5.6 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-050 | MANQUANT — Compétitions RÉELLES entre robots (l'écran est une vitrine) | Testée | P0 | feature |
| KB-051 | MANQUANT — Démarrer une table en ligne depuis le mobile | Testée | P0 | feature |
| KB-052 | MANQUANT — Client socket mobile pour jouer en ligne | Testée | P0 | feature |
| KB-220 | Jeu en ligne temps réel — client socket mobile | Testée | P0 | feature |
| KB-221 | Lobby en ligne — mise à jour temps réel des sièges | Testée | P0 | feature |
| KB-222 | Trois types de partie (Alliance Hybride / Duo d'Acier / Carré Royal) | Testée | P0 | feature |
| KB-223 | BUG — reprise de partie affichait le dialogue de configuration | Testée | P0 | bug |
| KB-224 | BUG — rejeu n'affichait pas les cartes comme une partie en cours | Testée | P1 | bug |
| KB-225 | Table Pixi — mains vers les bords + dernier pli qui monte | Testée | P1 | feature |
| KB-091 | MANQUANT — Écran de recherche de replays publics | Testée | P2 | feature |

### v11.0.1 — 4 · 8 pts · 1.0 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-210 | BUG — 403 « robot inconnu » à la prise de siège en ligne | Testée | P0 | bug |
| KB-211 | Table Pixi — règle d'affichage des mains (sud visible, autres dos) | Testée | P0 | bug |
| KB-212 | Table Pixi — animations des cartes et dernier pli | Testée | P1 | feature |
| KB-213 | Retours utilisateur sans boîte native (toasts + confirmations DS) | Testée | P1 | refactor |

### v11.0.0 — 8 · 28 pts · 4.4 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-142 | MANQUANT — Cerveaux de robot (brains) côté mobile | Brouillon | P3 | feature |
| KB-200 | Refactoring — table Pixi promue en package partagé | Testée | P0 | refactor |
| KB-201 | Design system mobile autonome + aperçu vivant | Testée | P0 | refactor |
| KB-202 | Tests de contrat API (sans base de données) | Testée | P0 | test |
| KB-204 | Seed complet (tous les rôles, économie, compétition, lobby) | Testée | P0 | feature |
| KB-205 | TNR — non-régression en une commande + CI | Testée | P0 | chore |
| KB-206 | Documentation complète (architecture, tests, DS, déploiement, contribution) | Testée | P0 | doc |
| KB-203 | BUG — /auth/login interrogeait la base avant de valider son entrée | Testée | P1 | bug |

### v10.8.0 — 3 · 8 pts · 1.1 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-081 | MANQUANT — Écran spectateur mobile | À faire | P2 | feature |
| KB-140 | MANQUANT — Réglages utilisateur côté mobile | À faire | P3 | feature |
| KB-141 | MANQUANT — Statistiques de robot (analytics) | À faire | P3 | feature |

### v10.7.0 — 8 · 21 pts · 2.8 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-071 | MANQUANT — Prélèvement effectif de la mise au démarrage | À faire | P1 | feature |
| KB-150 | Classements — données réelles au lieu du podium de démonstration | À faire | P2 | feature |
| KB-151 | MANQUANT — Endpoint de classement des robots | À faire | P2 | feature |
| KB-063 | Choisir son robot favori (reprise automatique) | En cours | P2 | feature |
| KB-112 | BLOQUÉ — Captures d'écran et tests navigateur (Playwright) | En cours | P2 | test |
| KB-113 | BLOQUÉ — Tests d'intégration MongoDB en CI sandbox | En cours | P2 | test |
| KB-043 | Recherche d'utilisateurs et profil public | Testée | P1 | feature |
| KB-004 | Modifier / supprimer un robot existant | À valider | P1 | feature |

### v10.6.0 — 2 · 8 pts · 1.1 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-100 | MANQUANT — Menus de l'accueil (équipes, en ligne, compétitions, jetons) | Testée | P0 | feature |
| KB-122 | Référentiel de tâches (JSON + markdown + tableau HTML) | À valider | P0 | doc |

### v10.5.0 — 6 · 16 pts · 2.2 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-020 | BUG — Table Pixi vide et HUD collé en haut-gauche sur mobile | Testée | P0 | bug |
| KB-030 | BUG — 404 sur /auth/me et /wallet (session expirée) | Testée | P0 | bug |
| KB-031 | BUG — Écran de rejeu : structure de replay erronée | Testée | P0 | bug |
| KB-011 | Sélection des sièges tactile (retrait des listes déroulantes) | Testée | P1 | refactor |
| KB-110 | Tests de scénarios moteur (belote, réflexion, contre) | Testée | P1 | test |
| KB-111 | Tests E2E des écrans mobiles avec faux serveur | Testée | P1 | test |

### v10.4.0 — 4 · 9 pts · 1.2 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-021 | Taille de carte responsive continue | Testée | P1 | feature |
| KB-061 | Reprise de la main au retour du joueur | Terminée | P0 | feature |
| KB-062 | Annulation d'une table en attente | Terminée | P1 | feature |
| KB-090 | Replays enrichis et recherche publique par nom | Terminée | P1 | feature |

### v10.3.0 — 7 · 25 pts · 3.9 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-041 | Écrans mobiles d'équipe (liste, détail, rôles, exclusion) | Testée | P0 | feature |
| KB-040 | Équipes — rôles owner/super/admin/user, 40 membres | Terminée | P0 | feature |
| KB-060 | Verrou une-partie-à-la-fois | Terminée | P0 | feature |
| KB-070 | Économie serveur — jetons quotidiens, mises et gains | Terminée | P0 | feature |
| KB-080 | Spectateurs — max 5, vue filtrée sans les mains | Terminée | P0 | feature |
| KB-120 | Documentation — SPEC.md (PRD maître) | Terminée | P1 | doc |
| KB-012 | Overlay de logs transparent sur la table | Terminée | P2 | feature |

### v10.2.0 — 1 · 3 pts · 4.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-010 | Dialogue de configuration de partie (sièges, visibilité, manches) | Validée | P0 | feature |

### v10.1.0 — 6 · 20 pts · 2.8 j

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-131 | Packaging Capacitor Android/iOS (paysage forcé) | À valider | P1 | chore |
| KB-001 | Authentification (inscription, connexion, session) | Validée | P0 | feature |
| KB-002 | Écran de connexion — carte as de cœur (flip 3D) | Validée | P0 | feature |
| KB-003 | Éditeur de robot — 4 curseurs, 5 avatars, aperçu live | Validée | P0 | feature |
| KB-130 | Séparation stricte web / mobile | Validée | P0 | chore |
| KB-022 | Table = composant préconfigurable instanciable partout | Validée | P1 | feature |

### vcontinu — 1 · 1 pts · 1.0 h

| ID | Titre | Statut | Prio | Type |
|---|---|---|---|---|
| KB-121 | Documentation — mise à jour à CHAQUE livraison | En cours | P1 | doc |
