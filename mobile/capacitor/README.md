# Kýdos Belote — packaging Capacitor (paysage uniquement)

Cette application mobile est empaquetée avec **Capacitor** (Ionic), qui
remplace l'ancien Cordova. Capacitor enveloppe le build web Vite (`mobile/dist`)
dans un projet natif Android et/ou iOS.

## Prérequis

- **Node 18+**
- **Android** : Android Studio + SDK Android (API 34), JDK 17
- **iOS** : Xcode 15+ (macOS uniquement), CocoaPods

Les dépendances Capacitor sont déjà déclarées dans `mobile/package.json`
(`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`).
Après `npm install` à la racine, elles sont disponibles dans le workspace
`belote-mobile`.

## Configuration

`mobile/capacitor.config.ts` définit l'identité de l'app :

- `appId` : `com.cephalosophie.kydosbelote`
- `appName` : `Kýdos Belote`
- `webDir` : `dist` (le build Vite)
- couleur de fond native : `#05070f`

L'orientation **paysage** est verrouillée côté natif dans les projets générés
(voir plus bas). En portrait, l'application affiche elle-même l'écran « Pivotez
votre appareil » (garde du design system).

## Étapes — première mise en place

```bash
# 1. Depuis la racine du repo : installer et construire l'app mobile
npm install
npm --workspace belote-mobile run build          # → mobile/dist/

# 2. Depuis le dossier mobile : ajouter les plateformes natives
cd mobile
npx cap add android                              # crée mobile/android/
npx cap add ios                                  # crée mobile/ios/ (macOS)

# 3. Synchroniser le build web vers les projets natifs
npx cap sync
```

Les dossiers `mobile/android/` et `mobile/ios/` sont générés par Capacitor. Ils
ne sont **pas** versionnés dans le dépôt (ni inclus dans le zip de livraison) —
on les régénère avec `npx cap add`.

## Étapes — cycle de développement

```bash
# Reconstruire le web, synchroniser, puis lancer sur appareil/émulateur
npm --workspace belote-mobile run cap:android    # Android
npm --workspace belote-mobile run cap:ios        # iOS (macOS)

# Ou ouvrir le projet natif dans l'IDE
npm --workspace belote-mobile run cap:open:android   # Android Studio
npm --workspace belote-mobile run cap:open:ios       # Xcode
```

Scripts disponibles (workspace `belote-mobile`) :

| Script | Rôle |
| --- | --- |
| `cap:sync` | build web + `npx cap sync` (copie `dist` vers le natif) |
| `cap:add:android` / `cap:add:ios` | ajoute la plateforme native |
| `cap:android` / `cap:ios` | build + sync + run sur appareil/émulateur |
| `cap:open:android` / `cap:open:ios` | ouvre le projet dans l'IDE natif |

## Verrouiller l'orientation paysage

Après `npx cap add android`, éditer
`mobile/android/app/src/main/AndroidManifest.xml` et ajouter sur l'activité
principale :

```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="landscape"
    ... >
```

Après `npx cap add ios`, dans Xcode → target → **General → Deployment Info**,
ne cocher que **Landscape Left** et **Landscape Right**.

## Build de production

- **Android** : `npx cap open android` puis, dans Android Studio,
  *Build → Generate Signed Bundle / APK*.
- **iOS** : `npx cap open ios` puis, dans Xcode, *Product → Archive*.

## Pourquoi Capacitor plutôt que Cordova ?

Capacitor est le successeur moderne de Cordova : projets natifs traités comme du
code source de première classe (ouverts dans Android Studio / Xcode), API de
plugins moderne, meilleure prise en charge des WebViews récentes, et
maintenance active. La migration ne change rien à l'application web elle-même —
seul l'enrobage natif diffère.
