# Kýdos Belote — Diagnostic & référentiel de tâches

> **Source : `board/tasks.json`.** Board : `board/board.html` · Backoffice web : `board/web/` · API : `board/server/`.
> Audit : `docs/AUDIT-3AGENTS.md` · Roadmap : `docs/ROADMAP.md` · Tests : `docs/ai/TESTING.md` · Sons : `docs/SOUNDS.md` · Connexion : `docs/mobile-connection.md` · Pub/VIP : `docs/ADS.md` · Jetons : `docs/WALLET.md` · Robots : `docs/architecture-robots.md`.

**Projet** Kýdos Belote · **Version** v12.4.1 · **151 tâches** · généré 2026-08-04T02:00:00.000Z

## Synthèse

- **Terminées** 132 · **En cours** 8 · **À faire** 11 · **Bugs** 27
- **P1 ouvertes** : KB-004, KB-071, KB-121, KB-131, KB-301
- **Points** 481 · **Durée** 58.1 j

## Répartitions

### Par statut

| Valeur | Tâches | Points | Durée |
|---|---:|---:|---:|
| tested | 117 | 372 | 43.3 j |
| pending | 10 | 36 | 3.9 j |
| finished | 9 | 27 | 4.1 j |
| confirmed | 6 | 20 | 2.9 j |
| onprocess | 5 | 10 | 1.4 j |
| needconfirmation | 3 | 11 | 1.5 j |
| draft | 1 | 5 | 1.0 j |

### Par priorité

| Valeur | Tâches | Points | Durée |
|---|---:|---:|---:|
| P1 | 75 | 267 | 29.4 j |
| P0 | 43 | 140 | 20.3 j |
| P2 | 30 | 64 | 6.7 j |
| P3 | 3 | 10 | 1.6 j |

### Par type

| Valeur | Tâches | Points | Durée |
|---|---:|---:|---:|
| feature | 90 | 330 | 40.9 j |
| bug | 27 | 63 | 6.4 j |
| test | 8 | 31 | 3.8 j |
| doc | 6 | 17 | 2.4 j |
| chore | 5 | 13 | 1.8 j |
| refactor | 5 | 14 | 1.8 j |
| docs | 4 | 13 | 1.1 j |
| 3 | 2 | 0 | 0.0 h |
| 5 | 2 | 0 | 0.0 h |
| 1 | 1 | 0 | 0.0 h |
| 2 | 1 | 0 | 0.0 h |

### Par catégorie

| Valeur | Tâches | Points | Durée |
|---|---:|---:|---:|
| Mobile | 38 | 114 | 16.1 j |
| Serveur | 29 | 88 | 11.4 j |
| Design / IHM | 17 | 24 | 2.1 j |
| IHM (table) | 17 | 56 | 5.8 j |
| Bugs / UX | 11 | 36 | 2.8 j |
| Documentation | 6 | 17 | 2.4 j |
| Outillage / Backoffice | 6 | 30 | 4.1 j |
| Architecture / Robots | 5 | 17 | 1.4 j |
| CI/CD | 4 | 22 | 2.2 j |
| Monétisation | 4 | 26 | 3.0 j |
| Refactoring | 4 | 12 | 1.6 j |
| Tests | 3 | 7 | 1.1 j |
| Économie | 3 | 16 | 1.8 j |
| Test E2E | 2 | 8 | 1.1 j |
| Infra | 1 | 3 | 4.0 h |
| Observabilité | 1 | 5 | 5.0 h |

### Par techno

| Valeur | Tâches | Points | Durée |
|---|---:|---:|---:|
| Mobile (Vite/TS) | 43 | 129 | 18.2 j |
| Node/Express/Mongo | 30 | 91 | 11.9 j |
| PixiJS | 17 | 45 | 4.5 j |
| Mobile/Ads | 11 | 36 | 2.8 j |
| Mobile/PixiJS | 10 | 11 | 6.5 h |
| Documentation | 6 | 17 | 2.4 j |
| Mobile/Core | 5 | 17 | 1.4 j |
| Node/Express/Mongo/Vite | 5 | 27 | 3.9 j |
| CI / Outillage | 4 | 19 | 2.1 j |
| Infra | 4 | 12 | 1.8 j |
| Mobile (Capacitor/Ads SDK) | 4 | 26 | 3.0 j |
| Node/Express/Mongo + Mobile | 3 | 16 | 1.8 j |
| Capacitor | 2 | 6 | 6.0 h |
| Mobile | 2 | 4 | 3.0 h |
| Mobile (Vite/Capacitor) | 1 | 3 | 2.0 h |
| Mobile (Web Audio API) | 1 | 8 | 6.0 h |
| Node / Make / Docs | 1 | 8 | 6.0 h |
| Node/Mongoose | 1 | 3 | 2.0 h |
| TypeScript (moteur) | 1 | 3 | 4.0 h |

### Par version

| Valeur | Tâches | Points | Durée |
|---|---:|---:|---:|
| 11.1.0 | 10 | 34 | 5.6 j |
| 11.2.0 | 9 | 20 | 2.5 j |
| 11.8.0 | 9 | 34 | 3.0 j |
| 10.7.0 | 8 | 21 | 2.8 j |
| 11.0.0 | 8 | 28 | 4.4 j |
| 11.12.0 | 8 | 21 | 1.6 j |
| 11.3.0 | 8 | 21 | 2.8 j |
| 10.3.0 | 7 | 25 | 3.9 j |
| 12.2.1 | 7 | 21 | 1.6 j |
| 10.1.0 | 6 | 20 | 2.8 j |
| 10.5.0 | 6 | 16 | 2.2 j |
| 12.2.0 | 6 | 0 | 0.0 h |
| 11.7.0 | 5 | 10 | 1.1 j |
| 12.3.0 | 5 | 17 | 1.4 j |
| 12.4.0 | 5 | 27 | 3.9 j |
| 10.4.0 | 4 | 9 | 1.2 j |
| 11.0.1 | 4 | 8 | 1.0 j |
| 11.6.0 | 4 | 13 | 1.5 j |
| 12.0.0 | 4 | 26 | 3.0 j |
| 12.1.0 | 4 | 19 | 2.1 j |
| 12.2.2 | 4 | 15 | 1.2 j |
| 10.8.0 | 3 | 8 | 1.1 j |
| 11.13.0 | 3 | 8 | 4.5 h |
| 11.5.0 | 3 | 12 | 1.5 j |
| 10.6.0 | 2 | 8 | 1.1 j |
| 11.4.0 | 2 | 6 | 7.0 h |
| 10.2.0 | 1 | 3 | 4.0 h |
| 11.10.0 | 1 | 8 | 6.0 h |
| 11.11.0 | 1 | 8 | 6.0 h |
| 11.9.0 | 1 | 8 | 6.0 h |
| 11.9.1 | 1 | 3 | 2.0 h |
| 12.4.1 | 1 | 3 | 2.0 h |
| continu | 1 | 1 | 1.0 h |

## Tâches par version

### v12.4.1 — 1 tâches · 3 pts · 2.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-421 | Bord seed : normalisation défensive des tâches malformées | Testée | P1 | bug | Outillage / Backoffice | Node/Mongoose | 3 | 2 h |

### v12.4.0 — 5 tâches · 27 pts · 3.9 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-416 | Backend Bord : API Express + Mongo (bordjira) + auth JWT | Testée | P1 | feature | Outillage / Backoffice | Node/Express/Mongo/Vite | 8 | 1.5 j |
| KB-417 | Archivage automatique versionné des tâches | Testée | P1 | feature | Outillage / Backoffice | Node/Express/Mongo/Vite | 5 | 6 h |
| KB-418 | Seed idempotent : 2 comptes ameur/hamido + import tasks.json | Testée | P1 | feature | Outillage / Backoffice | Node/Express/Mongo/Vite | 3 | 2 h |
| KB-419 | Frontend Bord : SPA Vite + 4 thèmes Ubuntu/Mac clair/sombre | Testée | P1 | feature | Outillage / Backoffice | Node/Express/Mongo/Vite | 8 | 1 j |
| KB-420 | PM2 + README complet du backoffice | Testée | P1 | docs | Outillage / Backoffice | Node/Express/Mongo/Vite | 3 | 3 h |

### v12.3.0 — 5 tâches · 17 pts · 1.4 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-411 | Fabrique unifiée buildLocalGame côté mobile | Testée | P1 | feature | Architecture / Robots | Mobile/Core | 5 | 4 h |
| KB-412 | Surcoinche gérée dans GameLoop.plan (parité web/serveur) | Testée | P1 | feature | Architecture / Robots | Mobile/Core | 3 | 2 h |
| KB-413 | Tests de parité mobile ↔ core | Testée | P1 | test | Architecture / Robots | Mobile/Core | 5 | 3 h |
| KB-414 | TableScreen refondu : appel buildLocalGame + imports nettoyés | Testée | P2 | refactor | Architecture / Robots | Mobile/Core | 2 | 1 h |
| KB-415 | Documentation architecture-robots : pilote mobile officialisé | Testée | P2 | docs | Architecture / Robots | Mobile/Core | 2 | 1 h |

### v12.2.2 — 4 tâches · 15 pts · 1.2 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-407 | AdMob chargé via le pont Capacitor (fix 'plugin not installed' faux positif) | Testée | P1 | bug | Bugs / UX | Mobile/Ads | 5 | 3 h |
| KB-408 | VIP côté serveur : endpoints /wallet/vip + débit atomique | Testée | P1 | feature | Bugs / UX | Mobile/Ads | 5 | 4 h |
| KB-409 | adConfig : IDs de test AdMob + debugGeography EEA en test | Testée | P2 | feature | Bugs / UX | Mobile/Ads | 2 | 1 h |
| KB-410 | Documentation ADS enrichie (Capacitor bridge + zsh + testDeviceIds) | Testée | P2 | docs | Bugs / UX | Mobile/Ads | 3 | 2 h |

### v12.2.1 — 7 tâches · 21 pts · 1.6 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-400 | AdMobProvider aligné sur l'API v6 (App Open + consent RGPD) | Testée | P1 | bug | Bugs / UX | Mobile/Ads | 5 | 3 h |
| KB-401 | VIP débite réellement les jetons (achat + cumul) | Testée | P1 | bug | Bugs / UX | Mobile/Ads | 3 | 2 h |
| KB-402 | VIP visible : badge couronne sur avatar + bandeau dans le profil | Testée | P1 | feature | Bugs / UX | Mobile/Ads | 3 | 2 h |
| KB-405 | Training : respecter la visibilité des cartes des robots | Testée | P1 | bug | Bugs / UX | Mobile/Ads | 2 | 1 h |
| KB-403 | Version de l'app dans l'écran À propos | Testée | P2 | feature | Bugs / UX | Mobile/Ads | 1 | 0.5 h |
| KB-404 | Message clair quand pub récompensée échoue | Testée | P2 | bug | Bugs / UX | Mobile/Ads | 2 | 1 h |
| KB-406 | Documentation ADS refondue : MODE TEST vs MODE PRODUCTION séparés | Testée | P2 | docs | Bugs / UX | Mobile/Ads | 5 | 3 h |

### v12.2.0 — 6 tâches · 0 pts · 0.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-390 | Retrait des 2 bannières de la table + agrandissement | Testée | P2 | 2 | Design / IHM | Mobile/PixiJS | 0 | Suppression des deux emplacements pub (gauche/droite) en bas de la table de jeu : la bannière unique app-wide (AdMob) est gérée ailleurs. L'espace récupéré agrandit la hauteur du feutre (bas 64px → 8px). |
| KB-391 | Popup d'annonce au-dessus des cartes du joueur | Testée | P2 | 1 | Design / IHM | Mobile/PixiJS | 0 | Le panneau d'annonce (bid) passe du haut du feutre au bas, juste au-dessus de la main du joueur (sud), jugé plus esthétique et à portée de pouce. |
| KB-392 | Icônes SVG épurées pour le menu de la table | Testée | P2 | 3 | Design / IHM | Mobile/PixiJS | 0 | Remplacement des emojis du menu gauche (quitter, spectateurs, son, réactions, pause, vitesse) par des icônes SVG en trait, nettes et colorables (icons.ts). Fini l'emoji porte pour quitter. |
| KB-393 | Indicateur VIP visible en jeu (halo autour du logo) | Testée | P2 | 5 | Design / IHM | Mobile/PixiJS | 0 | Un joueur VIP est signalé à la table par un halo doré autour de son pastille/logo, visible par tous. vipSeats propagé PixiTable → scene → SeatsLayer. Le halo de mon siège est câblé (VIP local) ; le VIP des joueurs distants nécessitera un champ serveur (suite). |
| KB-394 | Menu profil ergonomique (niveau/avatar → profil + déconnexion) | Testée | P2 | 5 | Design / IHM | Mobile/PixiJS | 0 | Clic sur le bloc niveau/avatar de la barre supérieure : feuille déroulante mobile (ProfileMenu) avec Mon profil, Mon porte-monnaie, Déconnexion. Conçu pour être simple à étendre (une entrée = un objet). Ferme au clic extérieur. |
| KB-395 | Documentation ADS clarifiée (voir pubs de test sur device) | Testée | P2 | 3 | Design / IHM | Mobile/PixiJS | 0 | Ajout d'un « Démarrage express » ultra-explicite dans docs/ADS.md : voir des pubs de test sur device en 10 min (plugin, App ID de test Google, config déjà bonne, lancement, où voir chaque pub), avec les pièges à éviter. Clarifie quoi installer où. |

### v12.1.0 — 4 tâches · 19 pts · 2.1 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-300 | Économie — prélever la mise au lancement (équilibrer les payouts) | Testée | P1 | bug | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-380 | Prélèvement des mises au lancement de la partie | Testée | P1 | feature | Économie | Node/Express/Mongo + Mobile | 5 | 4 h |
| KB-381 | Codes promo de rechargement (12 chiffres, validité, quota) | Testée | P1 | feature | Économie | Node/Express/Mongo + Mobile | 8 | 1 j |
| KB-382 | Pastille jetons → page porte-monnaie + doc AdMob test/prod | Testée | P1 | feature | Économie | Node/Express/Mongo + Mobile | 3 | 2 h |

### v12.0.0 — 4 tâches · 26 pts · 3.0 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-370 | Architecture publicitaire multi-fournisseurs (AdProvider + registre + config) | Testée | P1 | feature | Monétisation | Mobile (Capacitor/Ads SDK) | 8 | 1 j |
| KB-371 | AdManager — orchestration des emplacements + règles métier | Testée | P1 | feature | Monétisation | Mobile (Capacitor/Ads SDK) | 8 | 1 j |
| KB-372 | Statut VIP (sans publicité) — achat par jetons | Testée | P1 | feature | Monétisation | Mobile (Capacitor/Ads SDK) | 5 | 4 h |
| KB-373 | Pubs récompensées + bannière + documentation | Testée | P1 | feature | Monétisation | Mobile (Capacitor/Ads SDK) | 5 | 4 h |

### v11.13.0 — 3 tâches · 8 pts · 4.5 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-360 | Menu vertical d'icônes à gauche (quitter, spectateurs, en ligne, volume, smileys, vitesse, pause) | Testée | P1 | feature | Design / IHM | Mobile/PixiJS | 5 | 3 h |
| KB-361 | Bouton Quitter du haut supprimé — table Pixi agrandie au maximum | Testée | P1 | feature | Design / IHM | Mobile/PixiJS | 2 | 1 h |
| KB-362 | Dernier pli aligné au haut de la feuille de score | Testée | P1 | feature | Design / IHM | Mobile/PixiJS | 1 | 0.5 h |

### v11.12.0 — 8 tâches · 21 pts · 1.6 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-350 | Table agrandie + espace bannières pub en bas | Testée | P1 | feature | Design / IHM | Mobile/PixiJS | 3 | 2 h |
| KB-351 | Épurer le haut de la table (score, atout, noms retirés) | Testée | P1 | feature | Design / IHM | Mobile | 2 | 1.5 h |
| KB-352 | Rail gauche : spectateurs, pastille en ligne, volume | Testée | P1 | feature | Design / IHM | Mobile | 2 | 1.5 h |
| KB-353 | Cartes jouées : valeurs jamais cachées (placement par secteur) | Testée | P1 | feature | IHM (table) | PixiJS | 5 | 3 h |
| KB-354 | Mains sud/nord collées aux extrémités | Testée | P1 | feature | IHM (table) | PixiJS | 2 | 1 h |
| KB-355 | Dernier pli remonté plus haut | Testée | P1 | feature | IHM (table) | PixiJS | 1 | 0.5 h |
| KB-356 | Popup annonce : ne cache plus les cartes, épuré | Testée | P1 | feature | IHM (table) | PixiJS | 5 | 3 h |
| KB-357 | Étiquettes joueurs/robots plus compactes | Testée | P1 | feature | Design / IHM | PixiJS | 1 | 0.5 h |

### v11.11.0 — 1 tâches · 8 pts · 6.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-340 | Infrastructure de connexion mobile↔serveur : healthcheck + Makefile + doc 4 cibles | Testée | P1 | feature | CI/CD | Node / Make / Docs | 8 | 6 h |

### v11.10.0 — 1 tâches · 8 pts · 6.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-330 | Système sonore de la table — effets, mélodies par table, volumes | Testée | P1 | feature | IHM (table) | Mobile (Web Audio API) | 8 | 6 h |

### v11.9.1 — 1 tâches · 3 pts · 2.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-320 | Connexion mobile au serveur — URL configurable (device physique) | Testée | P1 | bug | Mobile | Mobile (Vite/Capacitor) | 3 | 2 h |

### v11.9.0 — 1 tâches · 8 pts · 6.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-310 | Fiabilisation — couverture, TNR serveur, E2E web, CI automatisée | Testée | P1 | test | CI/CD | CI / Outillage | 8 | 6 h |

### v11.8.0 — 9 tâches · 34 pts · 3.0 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-301 | Édition d'un robot (updateRobot serveur + mobile) | À faire | P1 | feature | Serveur | Node/Express/Mongo | 5 | 4 h |
| KB-302 | Robot favori — câbler la reprise automatique de siège | À faire | P2 | feature | Serveur | Node/Express/Mongo | 3 | 2 h |
| KB-303 | ELO réel des robots (classement gagné/perdu) | À faire | P2 | feature | Serveur | Node/Express/Mongo | 8 | 5 h |
| KB-304 | Décision de parité WEB (remettre à niveau ou geler) | À faire | P2 | doc | Documentation | Documentation | 3 | 2 h |
| KB-305 | CI réelle — activer tests Mongo + captures Playwright | En cours | P2 | test | CI/CD | CI / Outillage | 3 | 3 h |
| KB-290 | BUG — émojis non reçus par les autres (champ kind vs type) | Testée | P0 | bug | Serveur | Node/Express/Mongo | 2 | 1 h |
| KB-291 | Cartes jouées superposées au centre avec inclinaisons logiques + aléatoires | Testée | P1 | feature | IHM (table) | PixiJS | 5 | 4 h |
| KB-292 | Feuille de score — Nous/Eux (vert/rouge) relatifs au spectateur | Testée | P1 | bug | IHM (table) | PixiJS | 3 | 2 h |
| KB-293 | Réduire de 30% les cartes des 3 autres joueurs | Testée | P2 | feature | Design / IHM | PixiJS | 2 | 1 h |

### v11.7.0 — 5 tâches · 10 pts · 1.1 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-283 | BUG — le menu Invitations menait à la page d'authentification | Testée | P0 | bug | Mobile | Mobile (Vite/TS) | 1 | 0.5 h |
| KB-280 | Émotes unifiées et visibles par tous (une seule liste, diffusées) | Testée | P1 | bug | IHM (table) | PixiJS | 3 | 3 h |
| KB-282 | BUG — réflexion 💭 non affichée pour tous les joueurs | Testée | P1 | bug | IHM (table) | PixiJS | 2 | 1 h |
| KB-281 | Dock d'émotes minimisé en bas-gauche du tapis | Testée | P2 | feature | Design / IHM | PixiJS | 2 | 2 h |
| KB-284 | Indicateur « partie en cours » — pastille LIVE animée près du logo | Testée | P2 | feature | Design / IHM | Mobile (Vite/TS) | 2 | 2 h |

### v11.6.0 — 4 tâches · 13 pts · 1.5 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-270 | BUG — retour de partie : mauvais nombre de joueurs, impossible de reprendre | Testée | P0 | bug | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-272 | BUG — rejeu : les cartes ne se jouaient pas (seul le score bougeait) | Testée | P0 | bug | Mobile | Mobile (Vite/TS) | 2 | 1 h |
| KB-271 | Smileys en ligne — envoyer et voir les réactions des joueurs | Testée | P1 | feature | IHM (table) | Mobile (Vite/TS) | 3 | 3 h |
| KB-273 | Profil joueur — popup à onglets (Infos, Robots, Stats) via clic sur le nom | Testée | P1 | feature | IHM (table) | Mobile (Vite/TS) | 5 | 5 h |

### v11.5.0 — 3 tâches · 12 pts · 1.5 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-042 | MANQUANT — Invitations d'équipe côté mobile | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 5 | 5 h |
| KB-260 | Serveur — endpoints annuler + compter invitations, accept renforcé | Testée | P0 | feature | Serveur | Node/Express/Mongo | 2 | 2 h |
| KB-261 | Mobile — écran Invitations (reçues/envoyées) + inviter + badge | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 5 | 5 h |

### v11.4.0 — 2 tâches · 6 pts · 7.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-250 | Migration Cordova → Capacitor + README dédié | Testée | P1 | chore | Mobile | Capacitor | 3 | 3 h |
| KB-251 | Refonte du référentiel en board Agile complet (dimensions multiples) | Testée | P2 | doc | Documentation | Documentation | 3 | 4 h |

### v11.3.0 — 8 tâches · 21 pts · 2.8 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-240 | BUG — robots occupés + bannière « Partie en cours » persistante après la fin | Testée | P0 | bug | Serveur | Node/Express/Mongo | 2 | 2 h |
| KB-242 | Tableau de statistiques détaillées par partie (distinct du rejeu) | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 5 | 5 h |
| KB-241 | Écran de fin de partie soigné (résultat, score, actions) | Testée | P1 | feature | Mobile | Mobile (Vite/TS) | 2 | 2 h |
| KB-243 | Parties en ligne visibles « en cours » avec bouton Regarder + filtres + pagination | Testée | P1 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |
| KB-244 | Historique : filtres de portée (mes parties / mes robots / équipe / publiques) + pagination 15 | Testée | P1 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |
| KB-245 | Parties 100% robots simulées sur le serveur (sans socket) et archivées | Testée | P1 | feature | Serveur | Node/Express/Mongo | 3 | 4 h |
| KB-246 | Rejeu 100% local d'une partie sauvegardée (min 2s/action, vitesse réglable) | Testée | P1 | feature | Mobile | Mobile (Vite/TS) | 2 | 2 h |
| KB-247 | Indépendance stricte des données par session/instance de jeu | Testée | P1 | chore | Serveur | Node/Express/Mongo | 1 | 1 h |

### v11.2.0 — 9 tâches · 20 pts · 2.5 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-230 | BUG — bouton Quitter plantait en ligne (dispose sur undefined) | Testée | P0 | bug | Mobile | Mobile (Vite/TS) | 1 | 1 h |
| KB-231 | Auto-départ serveur (5s) + compte à rebours synchronisé, sans bouton Lancer | Testée | P0 | feature | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-234 | Reprise immédiate de siège au retour (substitution instantanée au départ) | Testée | P0 | bug | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-232 | Anti-blocage : libérer un siège robot non complété (10s, hybride/acier) | Testée | P1 | feature | Serveur | Node/Express/Mongo | 2 | 2 h |
| KB-233 | En ligne : masquer logs + pause/vitesse, afficher les spectateurs | Testée | P1 | feature | Mobile | Mobile (Vite/TS) | 2 | 2 h |
| KB-235 | Moniteur wslogs — répertoire + tableau temps réel des sessions/logs | Testée | P1 | feature | Observabilité | CI / Outillage | 5 | 5 h |
| KB-236 | Écran d'initialisation au thème du jeu (waiting + 4 robots animés) | Testée | P1 | feature | Design / IHM | Mobile (Vite/TS) | 2 | 2 h |
| KB-237 | Bouton Rejoindre sur les équipes publiques | Testée | P1 | bug | Mobile | Mobile (Vite/TS) | 1 | 1 h |
| KB-238 | CORS multi-domaines configurable | Testée | P2 | feature | Serveur | Node/Express/Mongo | 1 | 1 h |

### v11.1.0 — 10 tâches · 34 pts · 5.6 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-050 | MANQUANT — Compétitions RÉELLES entre robots (l'écran est une vitrine) | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 5 | 1 j |
| KB-051 | MANQUANT — Démarrer une table en ligne depuis le mobile | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 2 | 2 h |
| KB-052 | MANQUANT — Client socket mobile pour jouer en ligne | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 8 | 1.5 j |
| KB-220 | Jeu en ligne temps réel — client socket mobile | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 5 | 1 j |
| KB-221 | Lobby en ligne — mise à jour temps réel des sièges | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 3 | 4 h |
| KB-222 | Trois types de partie (Alliance Hybride / Duo d'Acier / Carré Royal) | Testée | P0 | feature | Serveur | Node/Express/Mongo | 5 | 5 h |
| KB-223 | BUG — reprise de partie affichait le dialogue de configuration | Testée | P0 | bug | Mobile | Mobile (Vite/TS) | 1 | 1 h |
| KB-224 | BUG — rejeu n'affichait pas les cartes comme une partie en cours | Testée | P1 | bug | Mobile | Mobile (Vite/TS) | 1 | 1 h |
| KB-225 | Table Pixi — mains vers les bords + dernier pli qui monte | Testée | P1 | feature | IHM (table) | PixiJS | 1 | 1 h |
| KB-091 | MANQUANT — Écran de recherche de replays publics | Testée | P2 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |

### v11.0.1 — 4 tâches · 8 pts · 1.0 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-210 | BUG — 403 « robot inconnu » à la prise de siège en ligne | Testée | P0 | bug | Mobile | Mobile (Vite/TS) | 1 | 1 h |
| KB-211 | Table Pixi — règle d'affichage des mains (sud visible, autres dos) | Testée | P0 | bug | IHM (table) | PixiJS | 2 | 2 h |
| KB-212 | Table Pixi — animations des cartes et dernier pli | Testée | P1 | feature | IHM (table) | PixiJS | 3 | 3 h |
| KB-213 | Retours utilisateur sans boîte native (toasts + confirmations DS) | Testée | P1 | refactor | Refactoring | Mobile (Vite/TS) | 2 | 2 h |

### v11.0.0 — 8 tâches · 28 pts · 4.4 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-142 | MANQUANT — Cerveaux de robot (brains) côté mobile | Brouillon | P3 | feature | Mobile | Mobile (Vite/TS) | 5 | 1 j |
| KB-200 | Refactoring — table Pixi promue en package partagé | Testée | P0 | refactor | Refactoring | Infra | 5 | 5 h |
| KB-201 | Design system mobile autonome + aperçu vivant | Testée | P0 | refactor | Refactoring | Mobile (Vite/TS) | 3 | 4 h |
| KB-202 | Tests de contrat API (sans base de données) | Testée | P0 | test | Tests | Node/Express/Mongo | 3 | 4 h |
| KB-204 | Seed complet (tous les rôles, économie, compétition, lobby) | Testée | P0 | feature | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-205 | TNR — non-régression en une commande + CI | Testée | P0 | chore | CI/CD | CI / Outillage | 3 | 3 h |
| KB-206 | Documentation complète (architecture, tests, DS, déploiement, contribution) | Testée | P0 | doc | Documentation | Documentation | 3 | 4 h |
| KB-203 | BUG — /auth/login interrogeait la base avant de valider son entrée | Testée | P1 | bug | Serveur | Node/Express/Mongo | 3 | 4 h |

### v10.8.0 — 3 tâches · 8 pts · 1.1 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-081 | MANQUANT — Écran spectateur mobile | À faire | P2 | feature | Mobile | Mobile (Vite/TS) | 3 | 4 h |
| KB-140 | MANQUANT — Réglages utilisateur côté mobile | À faire | P3 | feature | Mobile | Mobile (Vite/TS) | 2 | 2 h |
| KB-141 | MANQUANT — Statistiques de robot (analytics) | À faire | P3 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |

### v10.7.0 — 8 tâches · 21 pts · 2.8 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-071 | MANQUANT — Prélèvement effectif de la mise au démarrage | À faire | P1 | feature | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-150 | Classements — données réelles au lieu du podium de démonstration | À faire | P2 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |
| KB-151 | MANQUANT — Endpoint de classement des robots | À faire | P2 | feature | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-063 | Choisir son robot favori (reprise automatique) | En cours | P2 | feature | Serveur | Node/Express/Mongo | 2 | 2 h |
| KB-112 | BLOQUÉ — Captures d'écran et tests navigateur (Playwright) | En cours | P2 | test | Test E2E | Infra | 3 | 4 h |
| KB-113 | BLOQUÉ — Tests d'intégration MongoDB en CI sandbox | En cours | P2 | test | Tests | Infra | 1 | 1 h |
| KB-043 | Recherche d'utilisateurs et profil public | Testée | P1 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |
| KB-004 | Modifier / supprimer un robot existant | À valider | P1 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |

### v10.6.0 — 2 tâches · 8 pts · 1.1 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-100 | MANQUANT — Menus de l'accueil (équipes, en ligne, compétitions, jetons) | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |
| KB-122 | Référentiel de tâches (JSON + markdown + tableau HTML) | À valider | P0 | doc | Documentation | Documentation | 5 | 6 h |

### v10.5.0 — 6 tâches · 16 pts · 2.2 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-020 | BUG — Table Pixi vide et HUD collé en haut-gauche sur mobile | Testée | P0 | bug | IHM (table) | PixiJS | 3 | 4 h |
| KB-030 | BUG — 404 sur /auth/me et /wallet (session expirée) | Testée | P0 | bug | Serveur | Node/Express/Mongo | 2 | 2 h |
| KB-031 | BUG — Écran de rejeu : structure de replay erronée | Testée | P0 | bug | Mobile | Mobile (Vite/TS) | 1 | 1 h |
| KB-011 | Sélection des sièges tactile (retrait des listes déroulantes) | Testée | P1 | refactor | Refactoring | Mobile (Vite/TS) | 2 | 2 h |
| KB-110 | Tests de scénarios moteur (belote, réflexion, contre) | Testée | P1 | test | Tests | TypeScript (moteur) | 3 | 4 h |
| KB-111 | Tests E2E des écrans mobiles avec faux serveur | Testée | P1 | test | Test E2E | Mobile (Vite/TS) | 5 | 5 h |

### v10.4.0 — 4 tâches · 9 pts · 1.2 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-021 | Taille de carte responsive continue | Testée | P1 | feature | IHM (table) | PixiJS | 2 | 2 h |
| KB-061 | Reprise de la main au retour du joueur | Terminée | P0 | feature | Serveur | Node/Express/Mongo | 2 | 2 h |
| KB-062 | Annulation d'une table en attente | Terminée | P1 | feature | Serveur | Node/Express/Mongo | 2 | 2 h |
| KB-090 | Replays enrichis et recherche publique par nom | Terminée | P1 | feature | Serveur | Node/Express/Mongo | 3 | 4 h |

### v10.3.0 — 7 tâches · 25 pts · 3.9 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-041 | Écrans mobiles d'équipe (liste, détail, rôles, exclusion) | Testée | P0 | feature | Mobile | Mobile (Vite/TS) | 5 | 6 h |
| KB-040 | Équipes — rôles owner/super/admin/user, 40 membres | Terminée | P0 | feature | Serveur | Node/Express/Mongo | 5 | 1 j |
| KB-060 | Verrou une-partie-à-la-fois | Terminée | P0 | feature | Serveur | Node/Express/Mongo | 3 | 4 h |
| KB-070 | Économie serveur — jetons quotidiens, mises et gains | Terminée | P0 | feature | Serveur | Node/Express/Mongo | 5 | 6 h |
| KB-080 | Spectateurs — max 5, vue filtrée sans les mains | Terminée | P0 | feature | Serveur | Node/Express/Mongo | 3 | 3 h |
| KB-120 | Documentation — SPEC.md (PRD maître) | Terminée | P1 | doc | Documentation | Documentation | 2 | 2 h |
| KB-012 | Overlay de logs transparent sur la table | Terminée | P2 | feature | Mobile | Mobile (Vite/TS) | 2 | 2 h |

### v10.2.0 — 1 tâches · 3 pts · 4.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-010 | Dialogue de configuration de partie (sièges, visibilité, manches) | Validée | P0 | feature | Mobile | Mobile (Vite/TS) | 3 | 4 h |

### v10.1.0 — 6 tâches · 20 pts · 2.8 j

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-131 | Packaging Capacitor Android/iOS (paysage forcé) | À valider | P1 | chore | Mobile | Capacitor | 3 | 3 h |
| KB-001 | Authentification (inscription, connexion, session) | Validée | P0 | feature | Serveur | Node/Express/Mongo | 3 | 4 h |
| KB-002 | Écran de connexion — carte as de cœur (flip 3D) | Validée | P0 | feature | Mobile | Mobile (Vite/TS) | 3 | 3 h |
| KB-003 | Éditeur de robot — 4 curseurs, 5 avatars, aperçu live | Validée | P0 | feature | Mobile | Mobile (Vite/TS) | 5 | 5 h |
| KB-130 | Séparation stricte web / mobile | Validée | P0 | chore | Infra | Infra | 3 | 4 h |
| KB-022 | Table = composant préconfigurable instanciable partout | Validée | P1 | feature | IHM (table) | PixiJS | 3 | 3 h |

### vcontinu — 1 tâches · 1 pts · 1.0 h

| ID | Titre | Statut | Prio | Type | Catégorie | Techno | Cplx | Durée |
|---|---|---|---|---|---|---|---:|---:|
| KB-121 | Documentation — mise à jour à CHAQUE livraison | En cours | P1 | doc | Documentation | Documentation | 1 | 1 h |
