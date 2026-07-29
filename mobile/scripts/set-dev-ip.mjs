#!/usr/bin/env node
/* =============================================================================
 * set-dev-ip — génère `mobile/.env` avec l'IP locale de la machine de dev.
 * -----------------------------------------------------------------------------
 * Sur un device Android/iOS PHYSIQUE, `localhost` désigne le téléphone, pas la
 * machine de dev : il faut l'IP LAN. Ce script la détecte automatiquement et
 * écrit `VITE_API_URL=http://<IP>:<PORT>/api` dans mobile/.env.
 *
 * Usage :
 *   node mobile/scripts/set-dev-ip.mjs            # détecte l'IP, port 4000
 *   node mobile/scripts/set-dev-ip.mjs 5000       # port personnalisé
 *   node mobile/scripts/set-dev-ip.mjs 4000 192.168.1.50  # IP forcée
 * ========================================================================== */
import { networkInterfaces } from 'node:os';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = process.argv[2] ?? '4000';
const forcedIp = process.argv[3];

/** Meilleure IPv4 privée non-loopback (préfère 192.168.x, puis 10.x, puis 172.x). */
function detectLanIp() {
  const candidates = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      candidates.push(a.address);
    }
  }
  const score = (ip) =>
    ip.startsWith('192.168.') ? 3 : ip.startsWith('10.') ? 2 : ip.startsWith('172.') ? 1 : 0;
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0];
}

const ip = forcedIp ?? detectLanIp();
if (!ip) {
  console.error('❌ Aucune IP LAN détectée. Passez-la en argument :');
  console.error('   node mobile/scripts/set-dev-ip.mjs 4000 192.168.1.42');
  process.exit(1);
}

const url = `http://${ip}:${port}/api`;
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');
const target = ip === '10.0.2.2' ? 'émulateur Android (AVD)'
             : ip === 'localhost' ? 'simulateur iOS ou navigateur (localhost)'
             : `device physique via l'IP LAN ${ip}`;
writeFileSync(envPath, `# Généré par set-dev-ip.mjs — cible : ${target}.\nVITE_API_URL=${url}\n`);

console.log(`✅ mobile/.env écrit :`);
console.log(`   VITE_API_URL=${url}\n`);
console.log('Rappels :');
console.log('  • Téléphone et machine sur le MÊME Wi-Fi.');
console.log(`  • Serveur lancé et accessible : ouvrez http://${ip}:${port}/api/health depuis le navigateur du téléphone.`);
console.log(`  • CORS : lancez le serveur avec  CORS_ORIGIN=*  en dev (voir server/.env).`);
console.log('  • Reconstruisez l’app :  npm --workspace belote-mobile run build  puis  npx cap sync');
