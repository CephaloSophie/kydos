# Kýdos Belote — packaging Cordova (paysage uniquement)

## Prérequis
- Node 18+, `npm i -g cordova`
- Android : Android Studio + SDK API 34, JDK 17
- iOS : Xcode 15+ (macOS)

## Étapes
```bash
# 1. Depuis la racine du repo — construire l'app mobile
npm install
npm --workspace belote-mobile run build          # → mobile/dist/

# 2. Depuis mobile/cordova/
cd mobile/cordova
node sync-www.mjs                                 # dist → www
cordova platform add android --no-save
cordova run android                               # sur appareil / émulateur
# APK release : cordova build android --release
```

Config : `config.xml` force le paysage sur Android et iOS. L'app web affiche
elle-même l'écran « Pivotez votre appareil » en portrait (garde du design system).
