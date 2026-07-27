import type { CapacitorConfig } from '@capacitor/cli';

/*
 * Configuration Capacitor — Kýdos Belote (mobile, paysage uniquement).
 * Remplace l'ancien empaquetage Cordova. Le webDir pointe vers le build Vite
 * (`dist`). L'application affiche elle-même l'écran « Pivotez votre appareil »
 * en portrait (garde du design system), et l'orientation paysage est verrouillée
 * côté natif via les projets Android/iOS générés par `npx cap add`.
 */
const config: CapacitorConfig = {
  appId: 'com.cephalosophie.kydosbelote',
  appName: 'Kýdos Belote',
  webDir: 'dist',
  // L'app est servie depuis le bundle local (pas de serveur de dev embarqué).
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#05070f',
  android: {
    // AndroidX activé par défaut avec Capacitor.
    backgroundColor: '#05070f',
  },
  ios: {
    backgroundColor: '#05070f',
    contentInset: 'never',
  },
};

export default config;
