#!/usr/bin/env node
/* =============================================================================
 * TNR SERVEUR — Tests de Non-Régression dédiés au backend Kýdos Belote.
 *   1. typecheck serveur  2. tests purs (logique + contrat HTTP, sans base)
 *   3. couverture serveur avec seuils  4. intégration Mongo si MONGOMS_AVAILABLE=1
 * Sortie code 0 si tout passe (SKIP non bloquant). Artefact reports/tnr-server-latest.json.
 * ========================================================================== */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mongo = process.env.MONGOMS_AVAILABLE === '1';
const STEPS = [
  { group: 'typecheck', name: 'server', cmd: 'npm --workspace belote-server run typecheck' },
  { group: 'tests', name: 'unit+contrat', cmd: 'npm --workspace belote-server run test' },
  { group: 'coverage', name: 'seuils', cmd: 'npm --workspace belote-server run test:coverage', metric: true },
  { group: 'integration', name: 'mongo', cmd: 'npm --workspace belote-server run test', env: { MONGOMS_AVAILABLE: '1' }, skip: !mongo, skipReason: 'MONGOMS_AVAILABLE≠1 (téléchargement mongodb indisponible en sandbox)' },
];
const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };
const results = []; let currentGroup = ''; const startedAt = Date.now();
console.log(`${C.b}TNR SERVEUR — Kýdos Belote${C.x}  ${C.d}${new Date().toISOString()}${C.x}`);
console.log(`${C.d}profil intégration Mongo : ${mongo ? 'ACTIF' : 'inactif (SKIP)'}${C.x}\n`);
for (const step of STEPS) {
  if (step.group !== currentGroup) { currentGroup = step.group; console.log(`${C.b}▌ ${currentGroup.toUpperCase()}${C.x}`); }
  process.stdout.write(`  ${step.name.padEnd(14)} `);
  if (step.skip) { console.log(`${C.y}SKIP${C.x} ${C.d}${step.skipReason}${C.x}`); results.push({ ...step, ok: true, skipped: true }); continue; }
  const t0 = Date.now();
  try {
    const out = execSync(step.cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(step.env ?? {}) } });
    const tests = /Tests\s+(\d+)\s+passed/.exec(out)?.[1];
    const cov = /Statements\s*:\s*([\d.]+)%/.exec(out)?.[1];
    const ms = Date.now() - t0;
    const extra = step.metric && cov ? `couverture ${cov}% · ` : tests ? `${tests} tests · ` : '';
    console.log(`${C.g}OK${C.x} ${C.d}${extra}${ms} ms${C.x}`);
    results.push({ ...step, ok: true, ms, tests: tests ? Number(tests) : null, coverage: cov ? Number(cov) : null });
  } catch (error) {
    const ms = Date.now() - t0;
    console.log(`${C.r}ÉCHEC${C.x} ${C.d}${ms} ms${C.x}`);
    const detail = String(error.stdout ?? '') + String(error.stderr ?? error.message);
    console.log(C.d + detail.split('\n').slice(-16).join('\n') + C.x);
    results.push({ ...step, ok: false, ms, error: detail.slice(-4000) });
  }
}
const failed = results.filter((r) => !r.ok); const skipped = results.filter((r) => r.skipped);
const totalTests = results.reduce((s, r) => s + (r.tests ?? 0), 0); const durationMs = Date.now() - startedAt;
console.log('');
console.log(`${C.b}Résultat serveur${C.x} : ${results.length - failed.length}/${results.length} étapes · ${totalTests} tests${skipped.length ? ` · ${skipped.length} SKIP` : ''} · ${(durationMs / 1000).toFixed(1)} s`);
if (failed.length) console.log(`${C.r}${failed.length} étape(s) en échec : ${failed.map((f) => `${f.group}/${f.name}`).join(', ')}${C.x}`);
else console.log(`${C.g}Serveur : non-régression complète.${C.x}`);
mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports/tnr-server-latest.json'), JSON.stringify({ startedAt: new Date(startedAt).toISOString(), durationMs, totalTests, mongoProfile: mongo, steps: results }, null, 2));
console.log(`${C.d}Rapport : reports/tnr-server-latest.json${C.x}`);
process.exit(failed.length ? 1 : 0);
