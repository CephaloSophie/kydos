#!/usr/bin/env node
/* =============================================================================
 * TNR — Tests de Non-Régression.
 * -----------------------------------------------------------------------------
 * Exécute la chaîne complète de validation du monorepo et produit un rapport
 * lisible + un artefact JSON (`reports/tnr-latest.json`) exploitable en CI.
 *
 *   1. typecheck des 5 workspaces
 *   2. suites de tests des 5 workspaces
 *   3. builds (web, bibliothèque table, mobile)
 *   4. démonstration du moteur (partie complète jouée de bout en bout)
 *
 * Sortie : code 0 si tout passe, 1 sinon. Aucune étape n'est ignorée
 * silencieusement — une étape en échec est reportée avec sa sortie.
 * ========================================================================== */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  { group: 'typecheck', name: 'core',       cmd: 'npm --workspace belote-core run typecheck' },
  { group: 'typecheck', name: 'table-pixi', cmd: 'npm --workspace @kydos/table-pixi run typecheck' },
  { group: 'typecheck', name: 'server',     cmd: 'npm --workspace belote-server run typecheck' },
  { group: 'typecheck', name: 'web',        cmd: 'npm --workspace belote-web run typecheck' },
  { group: 'typecheck', name: 'mobile',     cmd: 'npm --workspace belote-mobile run typecheck' },

  { group: 'tests', name: 'core',       cmd: 'npm --workspace belote-core run test' },
  { group: 'tests', name: 'table-pixi', cmd: 'npm --workspace @kydos/table-pixi run test' },
  { group: 'tests', name: 'server',     cmd: 'npm --workspace belote-server run test' },
  { group: 'tests', name: 'web',        cmd: 'npm --workspace belote-web run test' },
  { group: 'tests', name: 'mobile',     cmd: 'npm --workspace belote-mobile run test' },

  { group: 'build', name: 'web',        cmd: 'npm --workspace belote-web run build' },
  { group: 'build', name: 'table-lib',  cmd: 'npm --workspace belote-web run build:lib' },
  { group: 'build', name: 'mobile',     cmd: 'npm --workspace belote-mobile run build' },

  { group: 'smoke', name: 'moteur', cmd: 'npm --workspace belote-core run demo', expect: 'Vainqueur de la partie' },
];

const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };
const results = [];
let currentGroup = '';
const startedAt = Date.now();

console.log(`${C.b}TNR — Kýdos Belote${C.x}  ${C.d}${new Date().toISOString()}${C.x}\n`);

for (const step of STEPS) {
  if (step.group !== currentGroup) {
    currentGroup = step.group;
    console.log(`${C.b}▌ ${currentGroup.toUpperCase()}${C.x}`);
  }
  const t0 = Date.now();
  process.stdout.write(`  ${step.name.padEnd(12)} `);
  try {
    const out = execSync(step.cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (step.expect && !out.includes(step.expect)) throw new Error(`sortie attendue absente : « ${step.expect} »`);
    const tests = /Tests\s+(\d+)\s+passed/.exec(out)?.[1];
    const ms = Date.now() - t0;
    console.log(`${C.g}OK${C.x} ${C.d}${tests ? tests + ' tests · ' : ''}${ms} ms${C.x}`);
    results.push({ ...step, ok: true, ms, tests: tests ? Number(tests) : null });
  } catch (error) {
    const ms = Date.now() - t0;
    console.log(`${C.r}ÉCHEC${C.x} ${C.d}${ms} ms${C.x}`);
    const detail = String(error.stdout ?? '') + String(error.stderr ?? error.message);
    console.log(C.d + detail.split('\n').slice(-14).join('\n') + C.x);
    results.push({ ...step, ok: false, ms, error: detail.slice(-4000) });
  }
}

const failed = results.filter((r) => !r.ok);
const totalTests = results.reduce((sum, r) => sum + (r.tests ?? 0), 0);
const durationMs = Date.now() - startedAt;

console.log('');
console.log(`${C.b}Résultat${C.x} : ${results.length - failed.length}/${results.length} étapes · ${totalTests} tests · ${(durationMs / 1000).toFixed(1)} s`);
if (failed.length) console.log(`${C.r}${failed.length} étape(s) en échec : ${failed.map((f) => `${f.group}/${f.name}`).join(', ')}${C.x}`);
else console.log(`${C.g}Non-régression complète : tout est vert.${C.x}`);

mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(
  resolve(root, 'reports/tnr-latest.json'),
  JSON.stringify({ startedAt: new Date(startedAt).toISOString(), durationMs, totalTests, steps: results }, null, 2),
);
console.log(`${C.d}Rapport : reports/tnr-latest.json${C.x}`);

process.exit(failed.length ? 1 : 0);
