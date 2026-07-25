# Architecture — Kýdos Belote v11.0.0

## 1. Vue d'ensemble

```
belote/
├── packages/
│   ├── core/          belote-core        — moteur de jeu PUR (règles, robots, scoring)
│   ├── table-pixi/    @kydos/table-pixi  — table PixiJS PARTAGÉE (web + mobile)
│   ├── application/   belote-application — cas d'usage transverses
│   └── belote-table/  @kanto-aplo/belote-table — table DOM historique
├── server/            belote-server      — API Express + MongoDB + Socket.IO
├── web/               belote-web         — application WEB (React + Vite)
├── mobile/            belote-mobile      — application MOBILE (Vite + Cordova)
├── scripts/tnr.mjs    non-régression complète
└── docs/              documentation + référentiel de tâches
```

## 2. Règle de dépendance fondamentale (v11.0.0)

**Le web et le mobile sont deux applications totalement séparées et
AUCUNE ne dépend de l'autre.** Elles partagent uniquement deux packages :

```
                 ┌──────────────────┐
                 │   belote-core    │  moteur, aucune dépendance
                 └────────┬─────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
┌─────────▼──────────┐          ┌─────────▼──────────┐
│ @kydos/table-pixi  │          │   belote-server    │
│ table partagée     │          │   API + sockets    │
└─────┬────────┬─────┘          └─────────┬──────────┘
      │        │                          │ HTTP / WS
┌─────▼───┐ ┌──▼──────┐                   │
│  web    │ │ mobile  │───────────────────┘
└─────────┘ └─────────┘
```

Avant la v11, le mobile importait `web/src/table-pixi` : les deux applications
étaient couplées. La table a été **promue en package** (`packages/table-pixi`).
Vérification : `grep -r "web/src" mobile/src` ne renvoie plus rien.

## 3. Couches de l'application mobile

Clean architecture stricte, dépendances dirigées vers l'intérieur :

```
core (dom, Router, Store, EventBus)
   ▲
data (ApiClient, dépôts)   ◀── implémente les interfaces du domaine
   ▲
domain (entités, cas d'usage)
   ▲
presentation (écrans, composants) + design-system (CSS autonome)
```

`main.tsx` est la SEULE composition root : c'est le seul endroit où une
implémentation concrète est injectée dans un cas d'usage.

## 4. Modules serveur

Chaque module est autonome : `model` → `service` → `controller` → `routes`,
enregistré en une ligne dans `server/src/modules/index.ts`.

| Module | Responsabilité |
| --- | --- |
| `auth` | inscription, connexion, session JWT |
| `user` | profil, recherche, réglages |
| `robot` | écurie, personnalité moteur + métadonnées d'affichage |
| `brain` | versionnage des algorithmes de robot |
| `team` | équipes, rôles (owner/super/admin/user), 40 membres max |
| `invitation` | invitations d'équipe |
| `table` | tables de jeu, sièges, cycle lobby → playing → finished |
| `game` | parties, replays, verrou une-partie, moteur live (sockets) |
| `competition` | compétitions robots contre robots, matchs automatiques |
| `wallet` | jetons quotidiens, mises, gains |
| `analytics` | statistiques joueur et robot |

## 5. Flux d'une partie

**Locale (entraînement)** : `GameSetupDialog` → `GameLoop` (contrôleur pur)
pilote `GameEngine` → rendu dans `@kydos/table-pixi` → `POST /games`.

**En ligne** : `POST /tables` → sièges (`/seat`, verrou acquis) → `/start` →
`liveGame.service` orchestre côté serveur (timers, substitution robot,
diffusion filtrée) → persistance + versement des gains + libération du verrou.

## 6. Contrats à ne jamais casser

1. **Personnalité moteur** : `{ aggressiveness, concentration, velocity }` sur
   1–10. Les curseurs mobiles 0–100 y sont mappés sans perte ; `bluff` est
   présentationnel et n'est jamais injecté dans le moteur.
2. **Manches** : le moteur n'accepte que `1 | 2 | 4`.
3. **Coéquipier caché** : jamais visible, même en mode cartes visibles.
4. **Spectateurs** : ne reçoivent JAMAIS `hands`, maximum 5 simultanés.
5. **Replay** : structure `manches[].donnes[].operations[]`.
