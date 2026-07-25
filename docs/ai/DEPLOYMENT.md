# Déploiement & exploitation — Kýdos Belote

## 1. Prérequis
Node 20+, MongoDB 6+. Pour le mobile : Android Studio (SDK 34, JDK 17) ou Xcode 15+.

## 2. Développement local

```bash
npm install
cp .env.example server/.env        # ajuster MONGO_URI et JWT_SECRET
npm run seed                       # jeu de données complet
npm --workspace belote-server run dev   # API   : http://localhost:4000
npm --workspace belote-web    run dev   # web   : http://localhost:5173
npm --workspace belote-mobile run dev   # mobile: http://localhost:5180
```

Comptes créés par le seed (mot de passe `belote123`) :

| Compte | Rôle dans « Les Atouts » | Jetons |
| --- | --- | --- |
| `ameur` | propriétaire | 5000 |
| `hamid` | super administrateur | 3200 |
| `sofia` | administrateur | 2100 |
| `invite` | membre | 900 |
| `zoe` | hors équipe (invitation en attente) | 500 |

Le seed crée aussi : deux équipes publiques, une invitation en attente, une
compétition ouverte entre robots, une table de lobby avec deux sièges libres,
et une partie terminée avec son rejeu.

## 3. Production

```bash
npm run tnr                        # doit être vert avant tout déploiement
npm run build:all
```

- **Serveur** : `npm --workspace belote-server run start` derrière un reverse
  proxy. Variables obligatoires : `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`.
- **Web** : servir `web/dist/` en statique.
- **Mobile** : `mobile/dist/` embarqué par Cordova (voir ci-dessous).

## 4. Application mobile (Cordova)

```bash
npm --workspace belote-mobile run build
cd mobile/cordova && node sync-www.mjs
cordova platform add android --no-save
cordova run android                      # ou : cordova build android --release
```

`VITE_API_URL` doit pointer vers l'IP de la machine hôte (pas `localhost`)
lorsqu'on teste sur un appareil physique.

## 5. Intégration continue

`.github/workflows/ci.yml` exécute deux jobs :
1. **tnr** — typecheck, tests, builds, démo moteur ; publie `reports/tnr-latest.json`.
2. **integration** — tests serveur avec MongoDB en mémoire (`MONGOMS_AVAILABLE=1`).

## 6. Exploitation

- `GET /health` → sonde de disponibilité.
- Économie : 500 jetons quotidiens ; mises 100 (humain) / 50 (robot) ;
  gains 150 (4 humains), 225 (2 humains + 2 robots), 150 (4 robots).
- Verrou : `User.activeSession` empêche deux parties simultanées ; il est
  libéré à la persistance de fin de partie.
- Spectateurs : 5 maximum par table, vue filtrée sans les mains.

---

## CORS multi-domaines (v11.2.0)

`CORS_ORIGIN` accepte plusieurs domaines séparés par des virgules, appliqués à
la fois au REST et aux WebSockets :

```
CORS_ORIGIN=https://app.kydosbelote.com,https://admin.kydosbelote.com
```

`*` autorise toutes les origines (réservé au développement). Par défaut :
`http://localhost:5173,http://localhost:5180`.

## Moniteur wslogs (v11.2.0)

Le répertoire `wslogs/` (à la racine, au niveau de `server/`, `web/`, `mobile/`)
contient un tableau HTML autonome d'observabilité temps réel : sessions de jeu
actives (par table, par joueur), scores, et flux de logs des web services et
WebSockets. Il consomme `GET /api/monitor/snapshot` et le namespace socket
`/monitor`.

- Actif par défaut ; le désactiver en production avec `MONITOR_ENABLED=false`.
- Ouvrir `wslogs/index.html`, renseigner l'URL du serveur, se connecter.
