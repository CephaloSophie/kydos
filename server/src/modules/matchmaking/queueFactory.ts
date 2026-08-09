/* Fabrique la queue de matchmaking selon la configuration. Ceci est le SEUL
 * endroit qui décide entre InMemory (dev/tests) et Redis (prod). Changer la
 * variable REDIS_URL suffit à basculer l'implémentation, aucune autre ligne
 * de code n'est impactée. */
import { environment } from '../../core/environment.js';
import { InMemoryQueue, RedisQueue, type MatchmakingQueue, type RedisClient } from './queue.js';

let cached: MatchmakingQueue | null = null;

/** Instancie (une seule fois) la queue selon l'environnement. */
export function getMatchmakingQueue(): MatchmakingQueue {
  if (cached) return cached;
  if (environment.redisUrl) {
    // Chargement dynamique d'ioredis pour ne pas exiger la dépendance en tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis = require('ioredis') as { default: new (url: string) => RedisClient };
    const client = new IORedis.default(environment.redisUrl);
    cached = new RedisQueue(client);
  } else {
    cached = new InMemoryQueue();
  }
  return cached;
}

/** Pour les tests : réinitialise le singleton. */
export function _resetMatchmakingQueueForTests(): void { cached = null; }
