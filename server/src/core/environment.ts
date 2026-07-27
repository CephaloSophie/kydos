import 'dotenv/config';

const rawMongoUri = (process.env.MONGO_URI ?? '').trim();

export const useInMemoryDatabase =
  rawMongoUri.toLowerCase() === 'memory' ||
  ['1', 'true', 'yes'].includes((process.env.USE_MEMORY_DB ?? '').toLowerCase());

const hasValidScheme = /^mongodb(\+srv)?:\/\//.test(rawMongoUri);

export const environment = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: hasValidScheme ? rawMongoUri : 'mongodb://127.0.0.1:27017/belote',
  useInMemoryDatabase,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  /**
   * Origines CORS autorisées — PLUSIEURS domaines possibles, séparés par des
   * virgules dans CORS_ORIGIN. Exemple :
   *   CORS_ORIGIN=https://app.kydosbelote.com,https://admin.kydosbelote.com
   * '*' autorise toutes les origines (réservé au développement).
   */
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5180')
    .split(',').map((o) => o.trim()).filter(Boolean),
};
