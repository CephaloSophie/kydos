# Audit croisé « 3 agents » — Kýdos Belote (v11.8.0, 2026-07-26)

Ce document restitue une analyse menée par **trois revues indépendantes** du
projet, chacune partant de la même vérité terrain (transcripts de développement,
documentation, et le code sous `belote/`) mais avec une **grille de lecture
distincte**. Les trois n'ont pas communiqué pendant l'analyse ; leurs constats
ont ensuite été **confrontés** pour ne garder que ce qui résiste au croisement.

> Méthode inspirée d'une revue contradictoire : on cherche les points où des
> analyses indépendantes **convergent** (signal fort) et on arbitre les
> désaccords sur pièce (le code fait foi).

## Les trois grilles de lecture

| Agent | Lentille | Question centrale |
| --- | --- | --- |
| **Alpha** | Réalité du code | « L'existant tient-il debout et correspond-il aux docs ? » |
| **Beta** | Intention produit, spec & docs | « Les docs disent-ils la vérité et couvrent-ils la vision ? » |
| **Gamma** | QA, défaillances jeu & tests | « Où le jeu casse-t-il encore, et qu'est-ce qui n'est pas testé ? » |

## Ce qui est solide (constat partagé)

- **Contrats critiques respectés dans le code** : coéquipier toujours caché,
  spectateurs jamais servis en cartes, rejeu qui lit `op.seat`, verrou de partie
  libéré en fin de partie, **découplage web/mobile strict** (aucun import croisé).
- **Codebase saine** (~22 700 lignes) : pas de stub, pas de TODO/FIXME réel.
- **11 modules serveur** bien enregistrés ; moteur pur ; table PixiJS partagée ;
  clean architecture mobile.
- Le **mobile** est la cible la mieux tenue (docs à jour, fonctionnalités v11).

## Convergences (les 3 agents pointent la même chose — priorité forte)

### CONV-1 — Économie asymétrique (P1)
Les **gains** sont versés en fin de partie (`gamePersistence.service` →
`payoutsByUser` → `walletService.credit`, pour tout mode ≠ local), mais la
**mise n'est jamais prélevée** au lancement : `walletService.stake()` existe mais
n'est appelé nulle part en production. Conséquence : **création monétaire** à
chaque partie. Décision requise : brancher le prélèvement (pour équilibrer les
payouts déjà en place) **ou** geler l'économie et le documenter.

### CONV-2 — Les docs/tasks mentent sur l'existant (P1)
- La **SPEC** était gelée à v10.4 et affirmait que « le jeu temps réel mobile
  passe par le web » — **faux depuis v11** (mobile natif). *(Corrigé dans cette
  livraison.)*
- Plusieurs tâches marquées « MANQUANT » sont en réalité faites : recherche
  d'utilisateurs + profil public (fait), robot favori (champ présent), édition
  robot (suppression faite). *(Référentiel resynchronisé dans cette livraison.)*

## Constats retenus après confrontation

| Réf | Constat | Priorité |
| --- | --- | --- |
| RET-1 | **Édition de robot absente** : `deleteRobot` existe, pas d'`updateRobot` (serveur + mobile). On crée/supprime, on ne modifie pas. | P1 |
| RET-2 | **Robot favori non câblé** : le champ `favoriteRobot` existe au modèle `User` mais n'est utilisé nulle part pour la reprise automatique (SPEC §3.8). | P2 |
| RET-3 | **Parité web** : le web build encore (présent dans le TNR) mais n'a PAS le jeu en ligne v11, ni invitations/profil/émotes/LIVE. Décision produit : remettre à parité ou geler explicitement. | P2 |
| RET-4 | **ELO réel des robots** : aujourd'hui dérivé de la personnalité (affichage), pas un classement gagné/perdu qui évolue. Pilier de la vision « robots-individus ». | P2 |
| RET-5 | **Tournois réels** : encore une vitrine (Grand Prix, Coupe Contrée, Ligue). | P2/P3 |
| RET-6 | **Aucune validation visuelle ni DB en CI** : Playwright (captures) et Mongo (intégration) bloqués en sandbox. Angle mort majeur pour un jeu. | P2 |
| RET-7 | **Fédération de serveurs-villes** : cap lointain, à cadrer même sans code. | P3 |
| RET-8 | **Hygiène** : ~11 `console.log` hors logger ; couche `packages/application` très mince (369 l.) à justifier ou fondre. | P3 |
| RET-9 | **Écran spectateur mobile dédié** (KB-081) + validation du rendu (pli, score, émotes). | P2/P3 |

## Rejeté au croisement (faux positifs)

- Les « TODO/stub » détectés par une lecture naïve : tous **légitimes**
  (placeholders d'input, vocabulaire métier « preneur provisoire »).
- L'idée que le web serait « mort » : **réfutée** — il build et passe les tests.
  Ce n'est pas un abandon, c'est un **écart de parité**.

## Suites données dans cette livraison

- SPEC resynchronisée (online mobile, économie, version) + sections « Livré
  depuis v10.4 » et « Défaillances connues ».
- README : bandeau d'état + pointeurs (`SPEC`, `ROADMAP`, cet audit, `CHANGELOG`).
- `docs/ROADMAP.md` créé (trajectoire priorisée).
- `docs/tasks/tasks.json` : tâches resynchronisées + nouvelles tâches de
  défaillance (économie, édition robot, favori câblé, parité web, ELO, CI
  visuelle/DB).

## Reproduire cet audit

Le protocole et les constats bruts de chaque agent sont conservés (hors zip)
dans `analysis/` de l'espace de travail : `CHARTER.md`, `agent-alpha/`,
`agent-beta/`, `agent-gamma/`, `arena/RECONCILIATION.md`.
