import type { CapacitorConfig } from '@capacitor/cli';

/*
 * Configuration Capacitor — Kýdos Belote (mobile, paysage uniquement).
 * Remplace l'ancien empaquetage Cordova. Le webDir pointe vers le build Vite
 * (`dist`). L'orientation est verrouillée en paysage côté NATIF
 * (android:screenOrientation="landscape" dans AndroidManifest.xml — même
 * réglage à reproduire côté iOS via Xcode si le projet est ajouté) : le portrait
 * n'est jamais atteignable, donc aucune garde JS/CSS n'est nécessaire côté app.
 */
const config: CapacitorConfig = {
  appId: 'com.cephalosophie.kydosbelote',
  appName: 'Kýdos Belote',
  webDir: 'dist',
  // Servi depuis le bundle local. En DEV, l'app doit contacter l'API sur HTTP
  // en clair (choix produit — voir docs/mobile-connection.md) : androidScheme
  // 'http' évite le blocage « mixed content » de la WebView, et cleartext:true
  // autorise le trafic HTTP en général.
  server: {
    androidScheme: 'http',
    cleartext: true,
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
