#!/usr/bin/env node
/* =============================================================================
 * healthcheck.mjs — DIAGNOSTIC de la connexion mobile ↔ serveur Kýdos.
 * -----------------------------------------------------------------------------
 * Vérifie automatiquement, dans l'ordre :
 *   1. IP LAN de la machine (celle à utiliser sur un device physique)
 *   2. Serveur écoute sur le port attendu
 *   3. Endpoint /api/health répond {ok:true} en local
 *   4. Endpoint accessible depuis le réseau (via l'IP LAN, pas seulement 127.0.0.1)
 *   5. CORS accepte une origine Capacitor (capacitor://localhost)
 *   6. Fichier mobile/.env cohérent avec la cible attendue
 *   7. Handshake WebSocket socket.io répond
 *
 * Usage : node scripts/healthcheck.mjs [--host=<ip>] [--port=<n>] [--target=device|emulator|ios-sim|remote]
 * ========================================================================== */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(args.port ?? 4000);
const target = args.target ?? 'device'; // device | emulator | ios-sim | remote

const C = { r:'\x1b[31m', g:'\x1b[32m', y:'\x1b[33m', d:'\x1b[2m', b:'\x1b[1m', c:'\x1b[36m', x:'\x1b[0m' };
const checks = [];
let hardFail = false;

const step = (label, ok, hint = '', hard = false) => {
  const tag = ok === 'skip' ? `${C.y}SKIP${C.x}` : ok ? `${C.g}OK${C.x}` : `${C.r}KO${C.x}`;
  console.log(`  ${tag}  ${label}${hint ? `\n       ${C.d}${hint}${C.x}` : ''}`);
  checks.push({ label, ok, hint });
  if (!ok && hard && ok !== 'skip') hardFail = true;
};

/* ── 1. IP LAN ────────────────────────────────────────────────────────────── */
function detectLanIp() {
  const cand = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) cand.push(a.address);
  }
  const score = (ip) => ip.startsWith('192.168.') ? 3 : ip.startsWith('10.') ? 2 : ip.startsWith('172.') ? 1 : 0;
  cand.sort((a, b) => score(b) - score(a));
  return cand[0];
}
const lanIp = args.host ?? detectLanIp();

/* ── HTTP fetch avec timeout, sans dépendance ─────────────────────────────── */
function fetchJson(host, port, path, { origin, timeoutMs = 2000 } = {}) {
  return new Promise((resolvePromise) => {
    const req = http.request({ host, port, path, method: 'GET', timeout: timeoutMs, headers: origin ? { Origin: origin } : {} }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolvePromise({ status: res.statusCode, body: JSON.parse(body || '{}'), headers: res.headers }); }
        catch { resolvePromise({ status: res.statusCode, body, headers: res.headers }); }
      });
    });
    req.on('error', (error) => resolvePromise({ error: error.code || error.message }));
    req.on('timeout', () => { req.destroy(); resolvePromise({ error: 'TIMEOUT' }); });
    req.end();
  });
}

/* ── Exécution des vérifications ──────────────────────────────────────────── */
console.log(`${C.b}HEALTHCHECK — Kýdos Belote${C.x}  ${C.d}cible : ${target} · port : ${port}${C.x}\n`);

step(`IP LAN détectée${lanIp ? ` — ${C.c}${lanIp}${C.x}` : ''}`, !!lanIp,
     lanIp ? '' : 'Aucune IP privée trouvée (Wi-Fi coupé ? VPN ?).', true);

/* 2. Serveur local sur le port */
const local = await fetchJson('127.0.0.1', port, '/api/health');
const localOk = local.status === 200 && local.body?.ok === true;
step(`Serveur écoute sur 127.0.0.1:${port}`, localOk,
     localOk ? '' : `Lancez le serveur : ${C.c}npm --workspace belote-server run dev${C.x}\n       Erreur : ${local.error ?? `HTTP ${local.status}`}`, true);

/* 3. /api/health depuis l'IP LAN (test « depuis un autre appareil ») */
if (lanIp) {
  const remote = await fetchJson(lanIp, port, '/api/health');
  const remoteOk = remote.status === 200 && remote.body?.ok === true;
  step(`Serveur accessible depuis le réseau (${lanIp}:${port})`, remoteOk,
       remoteOk ? '' : `Pare-feu ? Node bindé à 0.0.0.0 ? Wi-Fi « invité » ?\n       Test manuel : ouvrez ${C.c}http://${lanIp}:${port}/api/health${C.x} dans un navigateur du téléphone.\n       Erreur : ${remote.error ?? `HTTP ${remote.status}`}`);
} else step('Test réseau IP LAN', 'skip', 'aucune IP LAN détectée');

/* 4. CORS Capacitor */
const cors = await fetchJson('127.0.0.1', port, '/api/health', { origin: 'capacitor://localhost' });
const corsHeader = cors.headers?.['access-control-allow-origin'];
step('CORS accepte capacitor://localhost', !!corsHeader && cors.status === 200,
     corsHeader ? '' : `Header Access-Control-Allow-Origin absent. Lancez le serveur avec ${C.c}CORS_ORIGIN=*${C.x} en dev.`);

/* 5. Cohérence mobile/.env avec la cible */
const envPath = resolve(root, 'mobile/.env');
if (existsSync(envPath)) {
  const envUrl = readFileSync(envPath, 'utf8').match(/VITE_API_URL\s*=\s*(\S+)/)?.[1];
  const expected = {
    device:   lanIp ? `http://${lanIp}:${port}/api` : null,
    emulator: `http://10.0.2.2:${port}/api`,
    'ios-sim': `http://localhost:${port}/api`,
    remote:   null,
  }[target];
  if (target === 'remote') step('mobile/.env pointe vers un serveur distant', !!envUrl,
    envUrl ? `URL : ${C.c}${envUrl}${C.x}` : 'VITE_API_URL absent.');
  else if (expected) step(`mobile/.env cohérent avec la cible « ${target} »`, envUrl === expected,
    envUrl === expected ? `URL : ${C.c}${envUrl}${C.x}` : `Attendu : ${C.c}${expected}${C.x}\n       Actuel  : ${C.c}${envUrl ?? '(vide)'}${C.x}\n       Corrigez : ${C.c}npm --workspace belote-mobile run set-dev-ip${C.x}${target === 'emulator' ? ` puis éditez à la main pour 10.0.2.2` : ''}`);
  else step(`mobile/.env cohérent avec la cible « ${target} »`, 'skip', 'cible sans URL attendue');
} else step('mobile/.env présent', false,
     `Générez-le : ${C.c}npm --workspace belote-mobile run set-dev-ip${C.x}`, target !== 'remote');

/* 6. Handshake socket.io (best-effort, tout le monde répond 400 sans upgrade) */
const io = await fetchJson('127.0.0.1', port, '/socket.io/?EIO=4&transport=polling');
const ioReady = io.status && io.status < 500;
step('Endpoint Socket.IO répond', ioReady,
     ioReady ? '' : 'Socket.IO ne semble pas monté (le TableSocket ne fonctionnera pas).');

/* 7. Config Capacitor : http en dev */
const capPath = resolve(root, 'mobile/capacitor.config.ts');
if (existsSync(capPath)) {
  const cap = readFileSync(capPath, 'utf8');
  const httpScheme = /androidScheme:\s*['"]http['"]/.test(cap);
  const cleartext = /cleartext:\s*true/.test(cap);
  step('Capacitor configuré pour HTTP (androidScheme + cleartext)', httpScheme && cleartext,
       httpScheme && cleartext ? '' : `Éditez ${C.c}mobile/capacitor.config.ts${C.x} → server: { androidScheme: 'http', cleartext: true }`);
}

/* ── Résumé ────────────────────────────────────────────────────────────── */
const kos = checks.filter((c) => c.ok === false).length;
const skips = checks.filter((c) => c.ok === 'skip').length;
console.log(`\n${C.b}${checks.length - kos - skips}/${checks.length}${C.x} vérifications OK${skips ? ` · ${skips} SKIP` : ''}${kos ? ` · ${C.r}${kos} KO${C.x}` : ''}`);

if (target === 'device' && lanIp) {
  console.log(`\n${C.d}Rappels — device Android physique :${C.x}`);
  console.log(`  • Téléphone ET machine sur le MÊME Wi-Fi.`);
  console.log(`  • Depuis le navigateur du téléphone : ${C.c}http://${lanIp}:${port}/api/health${C.x} → doit afficher {"ok":true}.`);
  console.log(`  • Après changement de config : ${C.c}make cap-sync${C.x} puis relancer l'app.`);
}

process.exit(hardFail ? 1 : 0);
