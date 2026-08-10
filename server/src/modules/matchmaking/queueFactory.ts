/* Fabrique la queue de matchmaking selon la configuration. Ceci est le SEUL
 * endroit qui décide entre InMemory (dev/tests) et Redis (prod). Changer la
 * variable REDIS_URL suffit à basculer l'implémentation, aucune autre ligne
 * de code n'est impactée.
 *
 * Robustesse :
 *   - Chargement dynamique de ioredis pour ne pas exiger la dépendance en tests.
 *   - Reconnexion automatique avec backoff exponentiel (via ioredis).
 *   - Fallback InMemoryQueue si Redis refuse la connexion (l'app reste
 *     utilisable, à charge du dev de vérifier les logs).
 *   - Le singleton est reconstruit si `_resetMatchmakingQueueForTests` est
 *     appelé.
 */
import { environment } from '../../core/environment.js';
import { createLogger } from '../../core/logger.js';
import { InMemoryQueue, RedisQueue, type MatchmakingQueue, type RedisClient } from './queue.js';

const log = createLogger('queue');

let cached: MatchmakingQueue | null = null;
let redisClient: any = null;

/** Instancie (une seule fois) la queue selon l'environnement. */
export function getMatchmakingQueue(): MatchmakingQueue {
  if (cached) return cached;
  if (environment.redisUrl) {
    try {
      // Chargement dynamique d'ioredis pour ne pas exiger la dépendance en tests.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const IORedis = require('ioredis');
      const RedisCtor = IORedis.Redis ?? IORedis.default ?? IORedis;
      redisClient = new RedisCtor(environment.redisUrl, {
        // Robustesse en production :
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 200, 3000),
        enableReadyCheck: true,
        lazyConnect: false,
      });
      // Log discret sur les événements de connexion — évite les crashs
      // silencieux et facilite le diagnostic.
      redisClient.on('ready', () => log.info('[queue] Redis prêt', { url: safeUrl(environment.redisUrl!) }));
      redisClient.on('error', (err: Error) => log.warn('[queue] Redis erreur', { message: err.message }));
      redisClient.on('reconnecting', () => log.info('[queue] Redis reconnexion'));
      cached = new RedisQueue(redisClient as RedisClient);
      log.info('[queue] mode Redis activé');
    } catch (e) {
      // Redis inaccessible / ioredis absent : on retombe sur la file mémoire
      // pour ne pas planter l'app. Les logs alertent le dev.
      log.error('[queue] Redis indisponible, fallback InMemory', { error: (e as Error).message });
      cached = new InMemoryQueue();
    }
  } else {
    cached = new InMemoryQueue();
    log.info('[queue] mode InMemory (REDIS_URL non défini)');
  }
  return cached;
}

/** Masque le mot de passe éventuel dans une URL Redis pour les logs. */
function safeUrl(url: string): string {
  return url.replace(/:\/\/[^@]+@/, '://***@');
}

/** Pour les tests : réinitialise le singleton et ferme la connexion Redis. */
export async function _resetMatchmakingQueueForTests(): Promise<void> {
  if (cached) { try { await cached.close(); } catch { /* ignore */ } }
  cached = null; redisClient = null;
}
