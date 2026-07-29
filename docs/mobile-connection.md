# Mobile ↔ Serveur — guide complet de connexion

Guide de référence pour connecter l'application mobile Kýdos Belote à son
serveur Node/Express, en développement comme en production, sur **Mac ou
Ubuntu**, avec les **4 cibles** : device Android, émulateur Android, simulateur
iOS, device iOS. Contient une section **debug** (inspection, logs) et un
**troubleshooting** exhaustif.

> **TL;DR** — pour démarrer, une seule commande selon la cible :
> `make android-device` · `make android-emulator` · `make ios-sim` · `make ios-device`
> Bloqué ? Lancez `make check` : le healthcheck diagnostique tout seul.

---

## 1. Concepts (à lire une fois)

**L'app mobile est une WebView Capacitor** qui charge un bundle Vite empaqueté
localement dans l'APK/IPA. À l'exécution, elle appelle une API Node distante via
`VITE_API_URL` (fichier `mobile/.env`), lue au moment du **build**.

**Choix produit assumé — HTTP en dev.** Le serveur reste en HTTP en clair en
développement. La config Capacitor est en `androidScheme: 'http'` + `cleartext:
true`, ce qui évite le blocage « mixed content » de la WebView. Pour la
**production**, mettez un vrai HTTPS (reverse-proxy ou tunnel — cf. §7).

**L'URL diffère selon la cible** parce que « localhost » ne veut pas dire la
même chose partout :

| Cible | `VITE_API_URL` à utiliser | Pourquoi |
| --- | --- | --- |
| Device Android/iOS physique | `http://<IP-LAN>:4000/api` | `localhost` = le téléphone |
| Émulateur Android (AVD) | `http://10.0.2.2:4000/api` | 10.0.2.2 = alias vers l'hôte |
| Simulateur iOS | `http://localhost:4000/api` | partage le réseau du Mac |
| Serveur distant | `https://api.kydosbelote.com/api` | production |

Le healthcheck vérifie que votre `.env` correspond bien à la cible visée.

---

## 2. Prérequis (Mac et Ubuntu)

### Communs

- **Node.js 20+** et **npm 10+** — vérifier : `node -v && npm -v`.
- **Git**, **make** (préinstallé sur Mac ; `apt install make` sur Ubuntu).
- **MongoDB** local, OU laisser le serveur utiliser une base en mémoire
  (`USE_MEMORY_DB=1` — c'est ce que `make dev-server-permissive` active).

### Ubuntu — spécifiques

```bash
# Android Studio (installe le SDK, l'émulateur, les outils de plateforme)
sudo snap install android-studio --classic
# ou télécharger : https://developer.android.com/studio

# adb pour communiquer avec un device physique
sudo apt install android-tools-adb

# JDK pour la compilation Android
sudo apt install openjdk-21-jdk
```

Sur Ubuntu, **iOS est indisponible** (Xcode = macOS uniquement).

### Mac — spécifiques

```bash
# Xcode complet (App Store) — nécessaire pour iOS et pour l'émulateur iOS.
xcode-select --install     # outils en ligne de commande

# CocoaPods (dépendances iOS)
sudo gem install cocoapods

# Android Studio : télécharger sur https://developer.android.com/studio
```

### Une seule commande pour tout installer côté Node

```bash
make install       # équivalent à npm ci --no-audit --no-fund
```

---

## 3. Développement — les 4 cibles

### 3.1 Device Android physique (Wi-Fi + USB)

**Prérequis matériel** : téléphone Android avec le **débogage USB** activé
(Paramètres > Options développeur), câble USB, sur le **même Wi-Fi** que la
machine de dev.

```bash
# Terminal 1 — le serveur (Mongo en mémoire, CORS ouvert)
make dev-server-permissive

# Terminal 2 — le healthcheck (à faire une fois)
make check
# → doit être 6/7 ou 7/7 OK

# Terminal 3 — l'app sur le device
make android-device
```

`make android-device` fait tout : détecte votre IP LAN, écrit `mobile/.env`,
`cap sync`, puis `cap run android` sur le device branché.

Si `make check` signale un problème, il vous donne la commande exacte pour le
corriger.

### 3.2 Émulateur Android Studio (AVD)

Depuis Android Studio, créez un AVD (Tools > Device Manager > Create device).
Puis :

```bash
make dev-server-permissive
make android-emulator
```

Le script configure automatiquement `VITE_API_URL=http://10.0.2.2:4000/api`
(l'adresse réservée par l'émulateur pour parler à l'hôte).

### 3.3 Simulateur iOS (Mac uniquement)

Une première fois, ajoutez la plateforme iOS :

```bash
make cap-add-ios       # génère mobile/ios/ (Xcode ouvrable)
```

Puis à chaque session :

```bash
make dev-server-permissive
make ios-sim
```

Le simulateur partage le réseau du Mac, donc `localhost` fonctionne
directement.

### 3.4 iPhone physique (Mac uniquement)

Prérequis : Apple ID configuré dans Xcode (Xcode > Preferences > Accounts), et
un « Signing Team » choisi dans le projet iOS (`make cap-open-ios`).

```bash
make dev-server-permissive
make ios-device        # utilise votre IP LAN
```

À la première installation, le téléphone demandera de faire confiance au
développeur (Réglages > Général > Gestion VPN et périphériques).

### 3.5 Cible « serveur distant »

Pour tester votre app contre un serveur staging/prod :

```bash
make remote REMOTE=https://api.kydosbelote.com
# → écrit VITE_API_URL=https://api.kydosbelote.com/api dans mobile/.env
# puis à vous de rebuild pour la cible mobile voulue (android-device / ios-device / …).
```

---

## 4. Modes debug et prod

### Dev vs prod côté serveur

| | Commande | Détails |
| --- | --- | --- |
| **Dev** | `make dev-server` | tsx watch (rechargement à chaque save), Mongo local |
| **Dev permissif** | `make dev-server-permissive` | + `CORS_ORIGIN=*` + Mongo en mémoire |
| **Prod** | `make prod` | attend `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN` propres |

Variables d'environnement à connaître (voir `server/.env.example`) :

```
PORT=4000
MONGO_URI=mongodb://…              # ou USE_MEMORY_DB=1
JWT_SECRET=<remplacer-en-prod>
CORS_ORIGIN=https://votre-domaine  # ou * en dev
```

### Dev vs prod côté mobile

Le build mobile encode `VITE_API_URL` au moment du **build**. Donc pour changer
de cible : rééditez `mobile/.env` (ou lancez `make android-device` /
`make remote REMOTE=…`), puis **rebuild** : `make cap-sync`.

Il n'y a pas de mode « debug » séparé côté Capacitor : le JS de l'app est
identique en dev et en prod. Ce qui change, c'est ce que l'app CIBLE.

---

## 5. Debug — inspecter l'app depuis la machine de dev

### Android — `chrome://inspect` (Mac et Ubuntu)

C'est **l'outil le plus puissant** — DevTools Chrome complets sur la WebView.

1. Sur le téléphone : Options développeur > **Débogage USB** activé.
2. Branchez le téléphone en USB, autorisez la connexion (popup sur le device).
3. Sur le PC, dans Chrome, allez à : `chrome://inspect`
4. Votre device apparaît. Cliquez sur **inspect** sous la ligne « Kýdos Belote ».
5. Vous obtenez DevTools : onglet **Console**, **Network** (voir chaque requête,
   son statut, ses en-têtes CORS, sa réponse), **Elements**, **Sources**.

Raccourci Makefile qui rappelle la marche à suivre : `make inspect-android`.

### Android — `adb logcat` (Mac et Ubuntu)

Pour les logs bas-niveau (crash natif, WebView) :

```bash
make logs-android
# ou : adb logcat -v time chromium:V console:V *:E
```

Filtre par tag utile :
- `chromium:V` — toute la WebView.
- `console:V` — les `console.log` de l'app JS.
- `Capacitor:V` — le pont Capacitor.

### iOS — Web Inspector Safari (Mac uniquement)

1. Sur l'iPhone : Réglages > Safari > Avancé > **Web Inspector = ON**.
2. Sur le Mac : Safari > Préférences > Avancé > **Afficher le menu Développement**.
3. Menu Safari > **Développement** > *votre iPhone* > Kýdos Belote.
4. Vous obtenez les DevTools Safari (Console, Network, Elements).

Simulateur iOS : même chemin, mais votre iPhone s'appelle « Simulator » dans le
menu Développement.

Raccourci : `make inspect-ios`.

### iOS — logs Xcode / `log stream`

```bash
make logs-ios
# ou dans Xcode : Window > Devices and Simulators > select > Open Console
```

### Web — DevTools Chrome/Safari standards

L'app **web** (`make dev-web`, port 5173) se débogue avec F12/Cmd-Option-I.

---

## 6. Structure du projet (rappel)

Ce qui touche à la connexion :

```
mobile/
  capacitor.config.ts       androidScheme: 'http', cleartext: true
  .env.example              modèle documenté
  .env                      généré par set-dev-ip.mjs (git-ignoré)
  scripts/
    set-dev-ip.mjs          détecte l'IP LAN et écrit .env
    generate-sounds.py      (autre sujet)
  src/
    data/
      ApiClient.ts          lit VITE_API_URL, expose API_BASE_URL
      TableSocket.ts        socket dérivé de la même base

server/
  .env.example              PORT, MONGO_URI, CORS_ORIGIN, JWT_SECRET
  src/
    app.ts                  CORS (accepte capacitor://localhost)
    core/environment.ts     lecture des variables d'env
    index.ts                http.createServer + listen sur PORT (0.0.0.0)

scripts/
  healthcheck.mjs           7 vérifications (make check)

Makefile                    workflows unifiés (make help)
docs/
  mobile-connection.md      ce document
  ai/DEPLOYMENT.md          production
```

---

## 7. Production — HTTPS

Le serveur Node fait **HTTP en clair**. Pour la prod, mettez un HTTPS **devant**
plutôt que dans Node. Deux options courantes :

### Reverse-proxy Caddy (le plus simple)

`Caddyfile` sur le VPS de prod :

```
api.kydosbelote.com {
    reverse_proxy 127.0.0.1:4000
}
```

Caddy obtient un certificat Let's Encrypt automatiquement. Le serveur Node
écoute uniquement en local sur 4000.

### Tunnel Cloudflare / ngrok

Pour tester en HTTPS sans domaine :

```bash
cloudflared tunnel --url http://localhost:4000
# ou : ngrok http 4000
```

Copiez l'URL `https://…` fournie dans `mobile/.env` et rebuild.

---

## 8. Troubleshooting

### « Serveur injoignable » sur device

D'abord `make check`. Sinon, dans l'ordre :

1. **Téléphone et machine sur le même Wi-Fi ?** Pas de VPN, pas de Wi-Fi
   « invité » qui isole les appareils.
2. **`mobile/.env` cohérent avec la cible ?** Le healthcheck vous le dit.
3. **Pare-feu de la machine** ouvre le port 4000 ?
   - Ubuntu : `sudo ufw allow 4000/tcp`
   - Mac : Préférences Système > Sécurité > Pare-feu > autoriser Node.
4. **Test manuel depuis le navigateur du téléphone** : ouvrir
   `http://<IP>:4000/api/health`. Si ça ne répond pas là non plus, ce n'est pas
   un problème d'app.

### « Blocked by mixed content » (androidScheme='https')

Vérifiez que `mobile/capacitor.config.ts` a bien :

```
server: { androidScheme: 'http', cleartext: true }
```

Puis `make cap-sync` **et désinstallez l'ancienne APK** du device (le cache de
config traîne).

### Le login réussit puis l'app fige

Regardez la Console DevTools (Chrome inspect ou Safari Web Inspector). Suspect
n°1 : le **WebSocket** (socket.io) bloqué en cleartext alors que le HTTP passe.
Solution : `androidScheme: 'http'` + `cleartext: true` + rebuild.

### « CORS: No 'Access-Control-Allow-Origin' »

Lancez le serveur avec `CORS_ORIGIN=*` en dev (`make dev-server-permissive` le
fait). En prod, listez précisément vos domaines dans `CORS_ORIGIN`.

### `chrome://inspect` — mon device n'apparaît pas

- Débogage USB activé sur le téléphone.
- `adb devices` sur le PC affiche votre device (sinon problème de pilote/câble).
- Sur Ubuntu, ajoutez votre user au groupe `plugdev` : `sudo usermod -aG plugdev
  $USER` puis redémarrez la session.

### Émulateur Android — je vois `ECONNREFUSED`

L'AVD utilise `10.0.2.2` pour l'hôte, pas `localhost`. Vérifiez `mobile/.env` :
`make android-emulator` le remet correctement.

### iOS — l'app se lance mais ne trouve pas le serveur

Le simulateur partage `localhost` avec le Mac : `mobile/.env` doit dire
`http://localhost:4000/api`. Pour un iPhone physique, il faut l'IP LAN
(`make ios-device` le fait).

### Après `make cap-sync`, aucun changement à l'écran

Désinstallez l'app du device et rebuild. Ou, en dev pur, forcez le rechargement
depuis les DevTools (Cmd-R / F5 dans la console inspect).

---

## 9. Résumé — 5 commandes à retenir

```bash
make help              # liste toutes les cibles
make check             # diagnostic complet en 3 s
make android-device    # cible principale (physique)
make android-emulator  # AVD
make ios-sim           # simulateur iOS (Mac)
```

Pour toute question qui ne trouve pas de réponse ici : lancez `make check` et
lisez ce qu'il dit, il connaît les 90 % de cas.
