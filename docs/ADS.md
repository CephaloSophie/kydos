# Publicité & VIP — Kýdos Belote

Module publicitaire de l'application mobile : bannière adaptive, interstitiels,
App Open, pubs récompensées, et statut **VIP** (sans publicité). Architecture
modulaire multi-fournisseurs — change de réseau en **une ligne** de configuration.

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

### AdMob (défaut) — mode TEST puis PROD

Objectif : t'inscrire sur AdMob, voir **de vraies pubs de test** renvoyées par
Google sur ton device, puis passer en production sans changer le code métier.

#### Étape 1 — Inscription AdMob (gratuit)

1. Va sur https://admob.google.com et crée un compte (lié à un compte Google).
2. **Ajoute une application** (Apps -> Add app). Même non publiée, choisis « pas
   encore sur un store » : AdMob te donne un **App ID**
   `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`.
3. **Crée une unité par format** (Bannière, Interstitiel, Récompensée, App Open).
   Chacune donne un **unit ID** `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`.

#### Étape 2 — Installer le plugin

```bash
npm i @capacitor-community/admob
npx cap sync
```

#### Étape 3 — Déclarer l'App ID natif

- **Android** — `mobile/android/app/src/main/AndroidManifest.xml`, dans `<application>` :
  ```xml
  <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
             android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
  ```
- **iOS** — `mobile/ios/App/App/Info.plist` :
  ```xml
  <key>GADApplicationIdentifier</key>
  <string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
  ```

#### Étape 4 — MODE TEST (voir de vraies pubs de test)

**Ne touche à rien** : `adConfig.ts` a déjà `TEST_MODE = true` et les
**identifiants de test publics de Google** dans `AD_UNITS.admob`. Ce sont de
vraies unités qui renvoient des pubs de démonstration (bandeau « Test Ad »), sans
risque d'invalidation de compte.

Emplacements de test visibles dans l'app :
- **Bannière** : bas de tout écran hors table (accueil, robots, porte-monnaie).
- **Récompensée** : bouton « Regarder une pub » dans le porte-monnaie.
- **Interstitiel** : fin de partie, ou avant de créer une table.
- **App Open** : avant une partie d'entraînement (« Lancer une partie »).

Build sur device : `make android-device` (ou `make ios-device`). Chaque pub
affiche « **Test Ad** » : comportement attendu.

> En `TEST_MODE`, même avec de vrais unit IDs, le plugin force les pubs de test.
> Ne clique jamais sur une vraie pub avec ton compte en prod (invalidation).

#### Étape 5 — PASSER EN PRODUCTION

1. Renseigne **tes** unit IDs (Android + iOS) dans `AD_UNITS.admob` (`adConfig.ts`).
2. Mets `TEST_MODE = false`.
3. Vérifie que l'App ID natif (étape 3) est bien le tien.
4. `npx cap sync` puis rebuild device.

Le code métier (AdManager, emplacements, VIP) ne change pas : seule la config
bascule test -> prod.

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
