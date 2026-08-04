/* =============================================================================
 * SEED — comptes utilisateurs + import initial du tasks.json.
 * -----------------------------------------------------------------------------
 * Idempotent : peut être relancé sans casser rien.
 *   - Comptes seed (ameur + hamido) : upsertés (mot de passe rehashé si absent).
 *   - Tâches : importées seulement si la collection est vide, sinon on log
 *     un résumé et on ne touche à rien (l'API est déjà source de vérité).
 *
 * Normalisation : le tasks.json historique contient des tâches mal formées
 * (colonnes décalées dans d'anciennes générations). La fonction `normalize`
 * coerce chaque champ vers le type attendu et logue les corrections — le
 * seed ne plante JAMAIS sur des données douteuses.
 * ========================================================================== */
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import { connectMongo, disconnectMongo } from '../src/core/mongo.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { TaskModel } from '../src/modules/tasks/task.model.js';
import { normalizeTask } from './normalize.js';

interface RawTask {
  id: string;
  title: string;
  [k: string]: unknown;
}

const SEED_USERS: Array<{ username: string; displayName: string; password: string; role: 'admin' | 'editor' }> = [
  { username: 'ameur',  displayName: 'Ameur',  password: '@kantoA123', role: 'admin' },
  { username: 'hamido', displayName: 'Hamido', password: '@kantoA123', role: 'admin' },
];

async function seedUsers() {
  console.log('[seed] utilisateurs…');
  for (const u of SEED_USERS) {
    await authService.upsertUser(u.username, u.displayName, u.password, u.role);
    console.log(`  ✓ ${u.username} (${u.role})`);
  }
}

async function importTasksIfEmpty(jsonPath: string) {
  const count = await TaskModel.countDocuments();
  if (count > 0) {
    console.log(`[seed] ${count} tâches déjà présentes → import ignoré`);
    return;
  }
  if (!fs.existsSync(jsonPath)) {
    console.log(`[seed] pas de tasks.json à ${jsonPath} → aucun import`);
    return;
  }
  const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as { tasks: RawTask[] };
  const tasks = doc.tasks ?? [];
  console.log(`[seed] import de ${tasks.length} tâches depuis ${jsonPath}…`);

  let inserted = 0;
  let normalized = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const raw of tasks) {
    if (!raw.id) { failures.push({ id: '(sans id)', reason: 'id manquant' }); continue; }
    try {
      const { normalized: cleaned, warnings } = normalizeTask(raw);
      if (warnings.length > 0) {
        normalized++;
        // On garde le log discret : une ligne par tâche corrigée.
        console.log(`  ⚠ ${raw.id} corrigé : ${warnings.join(', ')}`);
      }
      // On mappe `id` → `taskId` pour respecter le schéma Mongo.
      const { id, ...rest } = cleaned;
      await TaskModel.create({
        ...rest,
        taskId: id,
        revision: 1,
        lastModifiedBy: 'seed',
      });
      inserted++;
    } catch (error) {
      failures.push({ id: raw.id, reason: (error as Error).message });
    }
  }

  console.log(`[seed] ✓ ${inserted} tâches importées${normalized > 0 ? ` (${normalized} normalisées)` : ''}`);
  if (failures.length > 0) {
    console.log(`[seed] ✗ ${failures.length} tâches ignorées :`);
    for (const f of failures) console.log(`    ${f.id} : ${f.reason}`);
  }
}

async function main() {
  await connectMongo();
  await seedUsers();

  // Résolution du chemin du tasks.json : par défaut ../../tasks.json (racine board/).
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const jsonPath = process.env.TASKS_JSON
    ? path.resolve(process.env.TASKS_JSON)
    : path.resolve(here, '..', '..', 'tasks.json');
  await importTasksIfEmpty(jsonPath);

  await disconnectMongo();
  console.log('[seed] terminé.');
}

main().catch((e) => {
  console.error('[seed] échec :', e);
  process.exit(1);
});
