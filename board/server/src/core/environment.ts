/* =============================================================================
 * CORE · environment.ts — Environnement typé (lu une seule fois au boot).
 * -----------------------------------------------------------------------------
 * Toutes les variables d'environnement passent par ici. Un unique point de
 * lecture évite de disperser des `process.env.XXX` dans le code métier.
 * ========================================================================== */
import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const raw = process.env[name] ?? fallback;
  if (raw === undefined || raw === '') throw new Error(`Env manquante : ${name}`);
  return raw;
}

export const environment = {
  port: Number(process.env.PORT ?? 4100),
  mongoUri: required('MONGO_URI', 'mongodb://root:toor@127.0.0.1:27017/bordjira?authSource=admin'),
  jwtSecret: required('JWT_SECRET', 'bord-dev-secret-change-in-production-please'),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:4200,http://127.0.0.1:4200')
    .split(',').map((s) => s.trim()).filter(Boolean),
};

/** Chemin par défaut du JSON de bootstrap (import initial des tâches). */
export const TASKS_JSON_PATH = process.env.TASKS_JSON ?? '../tasks.json';
