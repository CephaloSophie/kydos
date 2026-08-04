# Publicité & VIP — Kýdos Belote

Module publicitaire de l'application mobile : bannière adaptive, interstitiels,
App Open, pubs récompensées, et statut **VIP** (sans publicité). Architecture
modulaire multi-fournisseurs — change de réseau en **une ligne** de configuration.

> 💡 **Tu veux tester les pubs sur ton téléphone AVANT de publier l'app sur le
> Play Store ?** C'est exactement le but du **MODE TEST** ci-dessous — aucun
> compte AdMob nécessaire, aucune app publiée nécessaire, juste ton device et
> l'App ID de test public de Google.

---

## 🚀 MODE TEST — voir des pubs sur mon device (≈ 15 min)

**Objectif** : afficher **de vraies pubs de test Google** sur ta tablette/téléphone
Android. Aucun compte AdMob nécessaire, aucun risque de suspension.

### Ce qu'il faut savoir avant de commencer

- Les pubs ne s'affichent **QUE sur device natif (Android/iOS)**. En navigateur
  web (`npm run dev`), c'est normal qu'il n'y ait aucune pub — le SDK n'existe
  pas hors device.
- Tu n'as **pas besoin d'un compte AdMob** pour le mode test. Google fournit un
  App ID et des unit IDs de test PUBLICS, utilisables tels quels.
- **Pièges les plus fréquents** (dans cet ordre de fréquence sur tablette Samsung
  en France) :
  1. **App ID manquant dans AndroidManifest** → l'app **crash au lancement**.
  2. **Consentement RGPD non affiché** → le SDK refuse de charger les pubs (silencieux).
  3. **Plugin dans une version incompatible** → API différente (v6+ requise).
  4. **App en pause** ou **device sans réseau**.

### Étape 1 — Installer le plugin (une seule fois, à la racine du projet)

```bash
npm i @capacitor-community/admob@^6
npm --workspace belote-mobile run build
npx cap sync android
```

> Version **v6+** obligatoire — l'API a changé pour l'App Open (`loadAppOpen` /
> `isAppOpenLoaded` / `showAppOpen`) et pour les événements récompensés. Le code
> fourni est aligné sur v6.

### Étape 2 — Déclarer l'App ID de test dans AndroidManifest

Ouvre `mobile/android/app/src/main/AndroidManifest.xml` et ajoute, à l'intérieur
de la balise `<application>` (avant `</application>`) :

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713" />
```

> ⚠️ **Sans cette ligne, l'app crash au lancement.** C'est un requis STRICT
> d'AdMob depuis 2019 : pas d'App ID = crash immédiat.
>
> `ca-app-pub-3940256099942544~3347511713` est l'**App ID public de test de
> Google**, utilisable tel quel en développement. Aucun compte n'est nécessaire
> pour l'utiliser — c'est fait pour ça.
>
> iOS : même principe dans `Info.plist`, clé `GADApplicationIdentifier`, valeur
> `ca-app-pub-3940256099942544~1458002511`.

### Étape 3 — Vérifier la configuration (déjà correcte par défaut)

Dans `mobile/src/services/ads/adConfig.ts` :

```ts
export const ACTIVE_NETWORK: AdNetwork = 'admob';   // fournisseur actif
export const TEST_MODE = true;                       // pubs de test
```

Les unit IDs de test Google sont déjà renseignés dans `AD_UNITS.admob` — **tu
n'as rien à modifier**. Ces IDs renvoient des pubs de démonstration marquées
« **Test Ad** », sans risque.

### Étape 4 — Rebuild et lancer sur le device

```bash
npm --workspace belote-mobile run build
npx cap sync android
npx cap run android
# ou : make android-device
```

### Étape 5 — Accepter le consentement RGPD au premier lancement

⚠️ **Le piège le plus fréquent en France.** Au premier lancement, une **fenêtre
Google de consentement RGPD** peut apparaître (parce que tu es dans l'EEA).
**Tu DOIS l'accepter** pour que les pubs se chargent :

- Si tu la refuses (ou fermes sans répondre), **aucune pub ne se chargera** — et
  aucun message d'erreur ne t'expliquera pourquoi. C'est silencieux.
- Si tu ne la vois pas apparaître, c'est OK : le SDK a considéré que le
  consentement n'était pas requis (mode test, hors EEA, déjà donné).
- Pour tester à nouveau : désinstalle l'app, réinstalle.

### Étape 6 — Où voir chaque type de pub dans l'app

| Type | Comment le déclencher |
| --- | --- |
| **Bannière** | Écran d'accueil, « Mes robots », porte-monnaie… — en bas. |
| **Récompensée** | Porte-monnaie → bouton « 🎬 Regarder une pub ». |
| **Interstitiel** | Termine une partie d'entraînement, **ou** crée une table en ligne. |
| **App Open** | Clique « Lancer une partie » (entraînement). |

Chaque pub affiche « **Test Ad** » : **c'est le comportement CORRECT et
ATTENDU** — pas un bug.

### Dépannage — les pubs ne s'affichent toujours pas

Dans l'ordre à vérifier :

1. **Vérifie le logcat Android** :
   ```bash
   # bash :
   adb logcat -v time Ads:V AdMob:V *:E | grep -i "ad\|admob"
   # zsh (obligatoire de quoter *:E, sinon zsh le prend pour un glob et échoue
   # avec "no matches found: *:E") :
   adb logcat -v time 'Ads:V' 'AdMob:V' '*:E' | grep -i "ad\|admob"
   # alternative zsh : désactiver le glob failure une bonne fois :
   #   setopt no_nomatch
   ```
   Cherche des messages `Ad failed to load` avec un code d'erreur (0=INTERNAL_ERROR,
   1=INVALID_REQUEST, 2=NETWORK_ERROR, 3=NO_FILL, 8=NOT_READY).
2. **Test dans un émulateur AVD** avec Google Play (pas juste AOSP) — certaines
   pubs exigent Play Services à jour.
3. **Reset RGPD** : désinstalle l'app, réinstalle, accepte le consentement au
   premier lancement.
4. **Vérifie que le device a une connexion réseau** (les pubs se téléchargent).
5. **Vérifie que `TEST_MODE = true`** dans `adConfig.ts` (sinon Google refuse les
   pubs sur un device sans compte AdMob configuré).

Si un message dans le logcat te dit `The Google Mobile Ads SDK was initialized
incorrectly` ou similaire : l'**App ID de l'étape 2 est mal placé** ou absent.

### « Plugin AdMob not installed on this device » alors qu'il est installé

**Cause** : le plugin natif n'est pas accessible via `window.Capacitor.Plugins.AdMob`.
C'est **toujours** l'un de ces trois cas — vérifier dans l'ordre :

1. **Le paquet est installé mais pas synchronisé** :
   ```bash
   npm i @capacitor-community/admob@^6  # à la RACINE du projet, pas dans mobile/
   npm --workspace belote-mobile run build
   npx cap sync android
   ```
   Le `cap sync` **est obligatoire** — il copie le code natif du plugin dans le
   projet Android. Sans lui, `Capacitor.Plugins.AdMob` reste `undefined` même
   après `npm i`.

2. **Le build web n'a pas été refait** entre `npm i` et `cap sync` — le sync
   copie le dossier `dist/` : s'il est vieux, l'ancien code (sans plugin) est
   embarqué.

3. **Tu testes en navigateur** (`npm run dev`) : c'est normal, `Capacitor.Plugins.AdMob`
   n'existe pas hors Android/iOS. Vérifie sur ton device natif.

**Vérification en direct** — sur ton device via `chrome://inspect` :
```js
console.log(window.Capacitor?.Plugins?.AdMob)
```
- Si tu vois un objet avec les méthodes `showBanner`, `showInterstitial`, etc.
  → le plugin est bien câblé, le message d'erreur ne devrait plus apparaître.
- Si tu vois `undefined` → étape 1 ou 2 ci-dessus.

**Note technique** : le code utilise `window.Capacitor.Plugins.AdMob` (le pont
Capacitor global) plutôt qu'un `import('@capacitor-community/admob')` dynamique.
C'est **le pattern recommandé** pour un plugin en dépendance douce — l'`import()`
dynamique casse dans la WebView Capacitor (résolution d'URL impossible), et
c'était la cause du faux positif « plugin non installé » dans les versions
antérieures.

### Ajouter TON device comme device de test (optionnel)

En dev, si tu veux des pubs de test même avec `TEST_MODE = false` :

1. Lance l'app une fois, ouvre le logcat :
   ```bash
   adb logcat | grep "Use RequestConfiguration.Builder"
   ```
   AdMob affiche un ID de la forme `RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("XXXXXXXX"))`.
2. Copie l'ID dans `mobile/src/services/ads/adConfig.ts` :
   ```ts
   admobTestDeviceIds: ['XXXXXXXX'],
   ```
3. Rebuild + sync + relance.

### ⚠️ À NE JAMAIS FAIRE en mode test

- Ne mets **pas** `TEST_MODE = false` tant que tu es en développement.
- Ne clique **JAMAIS** sur une vraie pub (pas Test Ad) avec ton compte AdMob →
  Google peut suspendre ton compte pour « clics invalides ».
- Ne mets pas tes vrais unit IDs de production tant que tu n'as pas validé le
  mode test — même en `TEST_MODE = true`, éviter la confusion.

---

## 🚀 MODE PRODUCTION — passer aux vraies pubs

Quand le mode test fonctionne, voici comment passer en production.

### Étape 1 — Créer un compte AdMob

Va sur https://admob.google.com et inscris-toi (gratuit, avec un compte Google
existant). Aucune app publiée n'est requise pour créer un compte.

### Étape 2 — Créer une app AdMob

**Apps → Add app**. Choisis « **Non, l'app n'est pas encore sur un store** » si
tu n'as pas encore publié sur Play Store. AdMob te donne un **App ID de
production** de la forme `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`.

### Étape 3 — Créer une unité par format

Toujours dans AdMob, dans ton app : **Ad units → Create ad unit**. Crée une
unité pour chaque format :

- **Banner**
- **Interstitial**
- **Rewarded**
- **App open**

Chaque unité te donne un **unit ID de production** de la forme
`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`.

### Étape 4 — Remplacer l'App ID dans AndroidManifest

Remplace le meta-data de l'étape 2 (mode test) par TON App ID de production :

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY" />
```

### Étape 5 — Renseigner tes unit IDs et désactiver le mode test

Dans `mobile/src/services/ads/adConfig.ts` :

```ts
export const TEST_MODE = false;   // ← passe à false

export const AD_UNITS = {
  admob: {
    android: {
      banner:       'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
      interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/AAAAAAAAAA',
      rewarded:     'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB',
      appOpen:      'ca-app-pub-XXXXXXXXXXXXXXXX/CCCCCCCCCC',
    },
    ios: { /* tes IDs iOS si l'app est aussi iOS */ },
  },
  // ...
};
```

### Étape 6 — Rebuild et tester

```bash
npm --workspace belote-mobile run build
npx cap sync android
npx cap run android
```

**Tu verras désormais de vraies pubs** (sans le bandeau « Test Ad »).

### Étape 7 — Checklist avant publication sur le Play Store

- [ ] AdMob compte lié à un compte de paiement (sinon les revenus s'accumulent
      sans versement).
- [ ] Politique de confidentialité de l'app à jour (obligatoire pour AdMob).
- [ ] Consentement RGPD configuré côté AdMob (User Messaging Platform, dans
      AdMob → Confidentialité et messagerie).
- [ ] Test final sur un device NON développeur (avec un compte Google différent
      du tien pour éviter les clics invalides accidentels).

### Différences code entre TEST et PROD

**Aucune** — le code métier (AdManager, emplacements, VIP) ne change pas. Seuls
changent :
- **`TEST_MODE`** dans `adConfig.ts` (`true` → `false`)
- **`AD_UNITS.admob.android` (et `.ios`)** dans `adConfig.ts` (test IDs → tes IDs)
- **`APPLICATION_ID`** dans AndroidManifest.xml (test App ID → ton App ID)

---

## 1. Principe & architecture

Tout passe par un point d'entrée unique — **`AdManager`** — que les écrans
appellent par EMPLACEMENT (« après la partie », « avant de créer une table »…).
Ni les écrans ni l'AdManager ne connaissent un SDK concret : ils ne voient que
l'interface `AdProvider`.

```
Écrans ──▶ AdManager (règles métier) ──▶ AdProvider (interface)
                     │                          ├─ AdMobProvider    (défaut)
              VipService (éligibilité)          ├─ AppLovinProvider
                                                ├─ UnityProvider
                                                ├─ MetaProvider
                                                └─ NullAdProvider   (web/dev/tests)
```

Fichiers (`mobile/src/services/ads/`) :

| Fichier | Rôle |
| --- | --- |
| `types.ts` | Contrats (`AdProvider`, formats, emplacements). |
| `adConfig.ts` | **LE fichier à éditer** : réseau actif, unit IDs, réglages. |
| `registry.ts` | Fabrique : config → fournisseur concret. |
| `AdManager.ts` | Orchestration : VIP gating, fréquence, timers, emplacements. |
| `VipService.ts` | Statut VIP + achat par jetons. |
| `platform.ts` | Détection natif vs web. |
| `providers/*` | Un fichier par réseau + base commune + fournisseur nul. |

**Séparation des responsabilités** : un fournisseur sait seulement charger /
afficher un format. Les RÈGLES (qui voit quoi, quand, à quelle fréquence) vivent
dans `AdManager`. L'ÉLIGIBILITÉ (VIP) vit dans `VipService`. La MONNAIE reste au
`wallet` (l'AdManager crédite via un callback, il ignore l'économie).

## 2. Changer de fournisseur (1 ligne)

Dans `adConfig.ts` :

```ts
export const ACTIVE_NETWORK: AdNetwork = 'admob'; // 'admob' | 'applovin' | 'unity' | 'meta'
```

Renseignez ensuite les identifiants du réseau dans `AD_UNITS`, puis installez le
plugin natif correspondant (§4). Aucun autre fichier à toucher.

## 3. Emplacements (règles métier)

| Emplacement | Méthode AdManager | Quand |
| --- | --- | --- |
| Bannière adaptive | `showBanner()` / `hideBanner()` | En bas de l'écran, **hors table de jeu**. Rafraîchie toutes les 60 s. |
| Récompensée | `watchRewarded()` | Récompense quotidienne, ou **+100 ◆** par visionnage si déjà prise. |
| Interstitiel | `afterGame()` | Après chaque partie. |
| Interstitiel | `beforeCreateTable()` | Avant de créer une table. |
| Interstitiel | `beforeLaunchSaved()` | Avant de lancer/rejouer une partie sauvegardée. |
| App Open | `beforeTraining()` | Avant une partie d'entraînement. |
| App Open | (auto) | Après **3 min** de navigation hors table, au prochain accès à un écran éligible. |

Anti-spam : un intervalle minimal (`interstitialMinGapMs`, 45 s par défaut)
sépare deux interstitiels. Un **VIP ne voit aucune** de ces publicités (sauf la
récompensée, qui est un choix volontaire pour gagner des jetons).

## 4. Installer un SDK natif

Les SDK publicitaires n'existent que sur device (Android/iOS). En web/dev, le
fournisseur nul est utilisé (aucune pub). Sur natif, installez le plugin puis
`npx cap sync`.

### AdMob (défaut)

Voir les sections **🚀 MODE TEST** et **🚀 MODE PRODUCTION** en haut de ce
document pour la procédure complète pas-à-pas (inscription, App ID, unit IDs,
mode test sans compte, passage en production).

### AppLovin MAX

```bash
npm i capacitor-applovin-max     # nom du plugin selon votre choix
npx cap sync
```
Renseignez la SDK key (Manifest / Info.plist) et les ad unit IDs MAX dans
`AD_UNITS.applovin`.

### Unity Ads

```bash
npm i capacitor-unity-ads
npx cap sync
```
Renseignez `AD_SETTINGS.unityGameId` (android/ios) et les **noms de placement**
dans `AD_UNITS.unity`.

### Meta Audience Network

```bash
npm i capacitor-meta-audience-network
npx cap sync
```
Renseignez les placement IDs dans `AD_UNITS.meta`. (Meta n'expose pas d'App Open :
ce format retombe proprement en indisponible.)

> Les noms de plugins ci-dessus sont indicatifs : adaptez `packageName` dans le
> provider concerné si vous utilisez un autre paquet. Le chargement est en
> **dépendance douce** — l'app compile et tourne même sans le plugin, il suffit
> de l'ajouter pour activer le réseau sur device.

## 5. Bannière adaptive

- **Emplacement unique**, ancré en bas de l'écran (premier plan), affiché sur
  tous les écrans **sauf** la table de jeu et l'écran en ligne.
- **Rafraîchissement automatique toutes les 60 s** (`bannerRefreshMs`), géré par
  l'AdManager (masque + réaffiche = nouvelle impression).
- Position : les bannières adaptives AdMob occupent toute la largeur en bas ; le
  plugin ancre en bas de l'écran. (`BOTTOM_LEFT` strict n'existe pas dans l'API
  AdMob ; la bannière adaptive est pleine largeur.)

## 6. VIP — sans publicité

Un joueur VIP ne voit **aucune** publicité (bannière, interstitiels, App Open).
Statut à durée de validité, acheté en jetons :

| Palier | Coût | Validité |
| --- | --- | --- |
| 1 jour | 600 ◆ | 1 jour |
| 10 jours | 4 500 ◆ | 10 jours |
| 30 jours | 30 000 ◆ | 30 jours |

- Achat dans le **porte-monnaie** (carte « Statut VIP »). Un achat pendant une
  période active **prolonge** (cumule) au lieu de remplacer.
- **Serveur-premier** : `VipService` lit/achète côté serveur si l'API expose le
  VIP (`getVipStatus` / `purchaseVip`), sinon stockage local (démo/offline).
  Quand le serveur exposera ces endpoints, aucun changement d'écran n'est requis.

## 7. Récompensées & jetons

`watchRewarded()` :
- si la récompense quotidienne n'est pas prise → crédite le **quotidien** (500 ◆) ;
- sinon → crédite **+100 ◆** par visionnage.

Le crédit réel est délégué au `wallet` (`creditReward`), local en démo ; un
endpoint serveur de récompense est prévu (économie serveur).

## 8. Réglages (`adConfig.ts`)

| Réglage | Défaut | Rôle |
| --- | --- | --- |
| `ACTIVE_NETWORK` | `admob` | Réseau actif. |
| `TEST_MODE` | `true` | Pubs de test (à passer à `false` en prod). |
| `bannerRefreshMs` | 60 000 | Rafraîchissement bannière. |
| `dailyRewardTokens` | 500 | Récompense quotidienne. |
| `extraRewardTokens` | 100 | Par visionnage supplémentaire. |
| `appOpenResumeAfterMs` | 180 000 | Navigation avant App Open (3 min). |
| `interstitialMinGapMs` | 45 000 | Anti-spam interstitiels. |

## 9. Tests

- `VipService.test.ts` — barème, durées, prolongation, éligibilité, serveur-premier.
- `AdManager.test.ts` — VIP gating, fréquence, récompense quotidien/+100, App Open
  (minuterie 3 min, exclusion de la table), rafraîchissement bannière.

Les tests utilisent un fournisseur factice : la LOGIQUE est couverte sans SDK
natif. L'affichage réel se valide sur device après installation du plugin.

## 10. Limites connues

- Les vraies publicités ne s'affichent **que sur device natif** avec le plugin
  installé. En web/dev, le fournisseur nul est actif (aucune pub) — c'est voulu.
- L'App Open dépend du support du format par le plugin choisi (AdMob : oui ;
  Meta : non → dégradation propre).
