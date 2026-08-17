#!/usr/bin/env node
/* =============================================================================
 * COUVERTURE — rapport consolidé multi-workspaces (Kýdos Belote).
 * Exécute la couverture de chaque workspace (Vitest + v8), lit les
 * coverage-summary.json, affiche un tableau consolidé + reports/coverage-latest.json.
 * Chaque workspace applique ses seuils : sous le plancher, la commande échoue.
 * ========================================================================== */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACES = [
  { name: 'core', dir: 'packages/core', pkg: 'belote-core' },
  { name: 'table-pixi', dir: 'packages/table-pixi', pkg: '@kydos/table-pixi' },
  { name: 'server', dir: 'server', pkg: 'belote-server' },
  { name: 'mobile', dir: 'mobile', pkg: 'belote-mobile' },
];
const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };
const rows = []; const failures = []; const startedAt = Date.now();
console.log(`${C.b}COUVERTURE — Kýdos Belote${C.x}  ${C.d}${new Date().toISOString()}${C.x}\n`);
for (const ws of WORKSPACES) {
  process.stdout.write(`  ${ws.name.padEnd(12)} `);
  let ok = true;
  try { execSync(`npm --workspace ${ws.pkg} run test:coverage`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { ok = false; failures.push(ws.name); }
  const summaryPath = resolve(root, ws.dir, 'coverage/coverage-summary.json');
  let pct = { statements: null, branches: null, functions: null, lines: null };
  if (existsSync(summaryPath)) {
    try { const t = JSON.parse(readFileSync(summaryPath, 'utf8')).total; pct = { statements: t.statements.pct, branches: t.branches.pct, functions: t.functions.pct, lines: t.lines.pct }; } catch {}
  }
  rows.push({ workspace: ws.name, ok, ...pct });
  const tag = ok ? `${C.g}OK${C.x}` : `${C.r}SOUS SEUIL${C.x}`;
  const s = pct.statements != null ? `${pct.statements}% st · ${pct.branches}% br · ${pct.functions}% fn` : 'pas de résumé';
  console.log(`${tag} ${C.d}${s}${C.x}`);
}
console.log(`\n${C.b}Récapitulatif${C.x}`);
console.log('  workspace     statements  branches  functions  lines');
for (const r of rows) { const f = (v) => (v == null ? '   —  ' : `${String(v).padStart(5)}%`); console.log(`  ${r.workspace.padEnd(12)} ${f(r.statements)}     ${f(r.branches)}    ${f(r.functions)}     ${f(r.lines)}`); }
const durationMs = Date.now() - startedAt; console.log('');
if (failures.length) console.log(`${C.r}Couverture sous le seuil : ${failures.join(', ')}${C.x}`);
else console.log(`${C.g}Couverture : tous les workspaces au-dessus de leur seuil.${C.x}`);
mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports/coverage-latest.json'), JSON.stringify({ generatedAt: new Date(startedAt).toISOString(), durationMs, workspaces: rows }, null, 2));
console.log(`${C.d}Rapport : reports/coverage-latest.json${C.x}`);
process.exit(failures.length ? 1 : 0);
