# Session & chargement — architecture v13

## Objectif

Charger les données de session (profil, porte-monnaie, VIP, robots) **une seule
fois** au lancement, les garder en mémoire et les persister, pour :

- éviter les allers-retours serveur inutiles (le solde ne se recharge pas à
  chaque navigation) ;
- démarrer instantanément à la réouverture de l'app ;
- **jouer en solo hors-ligne** avec les robots en cache.

## Vue d'ensemble

```
Lancement
   │
   ├─ #boot (page waiting : 4 robots qui dansent)  ← index.html
   │
   ├─ runBootstrap()                                ← data/bootstrap.ts
   │     ├─ SessionCache.loadAll()   profil + wallet + VIP + robots (parallèle)
   │     └─ SoundService.preloadAll()  effets + toutes les mélodies
   │
   ├─ router.start()
   └─ retrait de #boot (fondu)
```

Après le bootstrap, l'app a **tout en mémoire**. Les écrans lisent depuis le
cache (synchrone) ; ils ne refetchent jamais au montage ni au clic.

## Les briques

### `data/persistentStorage.ts`

Couche de stockage cross-platform au-dessus de `localStorage`. Fonctionne à
l'identique sur **web** et sur **APK/iOS** (le `localStorage` du WebView
Capacitor est persistant, isolé par app, effacé seulement à la désinstallation).

Chaque entrée est enveloppée `{ v: version, at: timestamp, data }` :

- **versionnée** : une entrée d'un schéma antérieur est ignorée (pas de
  plantage sur un format incompatible après mise à jour) ;
- **datée** : `persistGet(key, maxAgeMs)` peut rejeter une entrée trop vieille ;
- **namespacée** (`kydos.cache.*`) : `persistClearAll()` n'efface QUE le cache,
  pas le jeton d'authentification ni les préférences.

Point d'abstraction unique : pour passer à un stockage natif chiffré
(SecureStorage) un jour, on ne modifie QUE ce fichier.

### `data/SessionCache.ts`

Le cœur. Le serveur reste **l'autorité** ; le cache est un miroir accéléré.

- **Getters synchrones** : `profile`, `wallet`, `vip`, `robots`, `isVip`,
  `canPlayOffline`. Aucun appel réseau.
- **`loadAll()`** : chargement initial complet (bootstrap).
- **Rafraîchissements ciblés** : `refreshWallet()`, `refreshVip()`,
  `refreshProfile()`, `refreshRobots()` — appelés **uniquement quand une donnée
  change réellement** (achat VIP, récompense, création de robot…).
- **`applyWallet()` / `applyVip()`** : applique directement une valeur déjà
  connue (réponse serveur d'achat) sans re-fetch.
- **Résilience hors-ligne** : si un refresh échoue (réseau absent), on **garde
  la dernière valeur connue** persistée. Le mode solo continue de fonctionner.
- **Événements bus** : chaque mise à jour émet `session:wallet`, `session:vip`,
  `session:profile`, `session:robots`. Les écrans abonnés (TopBar) se mettent à
  jour sans polling.

### `services/sound/SoundService.preloadAll()`

Précharge en une passe tous les effets **et** toutes les mélodies de table.
Appelé une fois au bootstrap → le jeu, y compris hors-ligne, dispose de tous
ses sons sans latence.

### `presentation/components/Waiting.ts`

L'écran des 4 robots qui dansent, extrait de `#boot` en composant réutilisable :

- `Waiting({ label, overlay })` — élément à insérer où on veut ;
- `showWaitingOverlay(label)` — overlay plein écran, retourne une fonction de
  fermeture. Utilisé après le login pendant le chargement de la session.

C'est l'**écran de chargement par défaut** de l'application.

## Qui déclenche quoi

| Action utilisateur | Effet cache | Événement émis |
|---|---|---|
| Lancement (authentifié) | `loadAll()` | tous |
| Login réussi | `runBootstrap()` derrière waiting | tous |
| Réclamer la récompense quotidienne | `refreshWallet()` | `session:wallet` |
| Regarder une pub récompensée | `refreshWallet()` | `session:wallet` |
| Valider un code promo | `refreshWallet()` | `session:wallet` |
| Acheter un VIP | `refreshWallet()` + `refreshVip()` | `session:wallet`, `session:vip` |
| Créer un robot | `refreshRobots()` | `session:robots` |
| Ouvrir l'écran Porte-monnaie | `applyWallet()` (sync du cache) | `session:wallet` |
| Déconnexion | `clear()` | `session:cleared` |

Le **TopBar** lit tout depuis le cache et s'abonne à ces événements. Il ne fait
**aucun** appel réseau, ni au montage, ni au clic sur l'avatar.

## Règles hors-ligne

| Fonctionnalité | Hors-ligne ? |
|---|---|
| Jouer en solo / entraînement | ✅ oui (robots en cache) |
| Voir son écurie | ✅ oui (cache) |
| Voir solde / VIP | ✅ oui (dernières valeurs connues) |
| Créer un robot | ❌ non (le serveur attribue l'id + persiste) |
| Jouer en ligne | ❌ non (parties serveur temps réel) |

Les écrans concernés affichent un message clair quand le réseau manque
(CreateRobotScreen : « Connexion requise » ; OnlineScreen : « Hors-ligne »).

## Sécurité

- Le cache ne contient **que** des données déjà connues du serveur (profil
  public, solde, expiration VIP, fiches robots). Aucun secret n'y est écrit.
- Le **serveur reste l'autorité** pour toute décision sensible (débit, achat
  VIP) : le cache ne sert jamais à valider une transaction. Une erreur serveur
  remonte toujours (pas de fallback local silencieux quand on est authentifié).
- Le jeton d'authentification garde sa propre clé (`kydos.mobile.token`), hors
  du namespace cache — `clear()` à la déconnexion l'efface séparément via
  `api.setToken(null)`.
