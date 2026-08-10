/* =============================================================================
 * MATCHMAKING · queue.ts — Interface de file d'attente + deux implémentations.
 * -----------------------------------------------------------------------------
 * Interface FIFO abstraite pour regrouper les joueurs par format. Deux
 * implémentations :
 *   • InMemoryQueue — dev & tests, aucune dépendance.
 *   • RedisQueue    — production, backing Redis avec LPUSH/RPOP.
 *
 * POINT D'EXTENSION : pour passer d'un matchmaking FIFO à un matchmaking par
 * ELO (ou tout autre critère), on remplace UNIQUEMENT l'implémentation dans le
 * conteneur DI — le reste du code ne change pas. C'est la demande explicite
 * « mettre le code dans un endroit clair pour pouvoir facilement changer le
 * regroupement plus tard ».
 * ========================================================================== */

/** Une demande en attente de match. */
export interface MatchmakingTicket {
  userId: string;
  robotIds: string[];
  /** Horodatage d'inscription (ms epoch). */
  enqueuedAt: number;
}

/** Contrat de queue par clé (une clé = un format de match). */
export interface MatchmakingQueue {
  /** Ajoute un ticket en fin de file (FIFO). */
  push(key: string, ticket: MatchmakingTicket): Promise<void>;
  /** Retire jusqu'à `count` tickets en tête de file (FIFO). Renvoie moins si insuffisant. */
  pop(key: string, count: number): Promise<MatchmakingTicket[]>;
  /**
   * Lit les tickets SANS les retirer. Utilisé pour vérifier la présence d'un
   * user en file. Perf critique : implémentation Redis via LRANGE (1 aller-
   * retour), pas de pop/repush.
   */
  peek(key: string, limit?: number): Promise<MatchmakingTicket[]>;
  /** Taille courante (utile pour savoir si on peut lancer un match). */
  size(key: string): Promise<number>;
  /** Retire un ticket d'un utilisateur (annulation). Renvoie vrai s'il a été trouvé. */
  remove(key: string, userId: string): Promise<boolean>;
  /** Libère les ressources (fermeture du client Redis, par exemple). */
  close(): Promise<void>;
}

/* ── Implémentation mémoire (dev & tests) ─────────────────────────────────── */
export class InMemoryQueue implements MatchmakingQueue {
  #queues = new Map<string, MatchmakingTicket[]>();
  private get(key: string): MatchmakingTicket[] {
    let q = this.#queues.get(key);
    if (!q) { q = []; this.#queues.set(key, q); }
    return q;
  }
  async push(key: string, ticket: MatchmakingTicket): Promise<void> { this.get(key).push(ticket); }
  async pop(key: string, count: number): Promise<MatchmakingTicket[]> {
    const q = this.get(key); return q.splice(0, count);
  }
  async peek(key: string, limit = -1): Promise<MatchmakingTicket[]> {
    const q = this.get(key);
    // Copie superficielle pour éviter les mutations externes.
    return limit < 0 ? q.slice() : q.slice(0, limit);
  }
  async size(key: string): Promise<number> { return this.get(key).length; }
  async remove(key: string, userId: string): Promise<boolean> {
    const q = this.get(key);
    const i = q.findIndex((t) => t.userId === userId);
    if (i < 0) return false;
    q.splice(i, 1); return true;
  }
  async close(): Promise<void> { this.#queues.clear(); }
}

/* ── Implémentation Redis (production) ────────────────────────────────────── */
/**
 * Utilise LPUSH pour la queue et RPOP pour dequeue (FIFO strict). Chaque
 * élément est un JSON stringifié du ticket. Le `remove` recharge la liste et
 * la reconstruit sans le ticket (opération rare — annulation utilisateur).
 *
 * Le client Redis est injecté pour rester testable (pas d'import dur d'ioredis
 * dans les tests). En production, on passe une instance d'ioredis au construc-
 * teur.
 */
export interface RedisClient {
  lpush(key: string, value: string): Promise<number>;
  rpop(key: string, count?: number): Promise<string | string[] | null>;
  llen(key: string): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  del(key: string): Promise<number>;
  quit(): Promise<'OK'>;
}

export class RedisQueue implements MatchmakingQueue {
  constructor(private redis: RedisClient, private prefix = 'kydos:queue:') {}
  private k(key: string) { return this.prefix + key; }

  async push(key: string, ticket: MatchmakingTicket): Promise<void> {
    await this.redis.lpush(this.k(key), JSON.stringify(ticket));
  }
  async pop(key: string, count: number): Promise<MatchmakingTicket[]> {
    const raw = await this.redis.rpop(this.k(key), count);
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((s) => JSON.parse(s) as MatchmakingTicket);
  }
  /**
   * PERF : LRANGE en 1 aller-retour, aucune mutation. Remplace l'ancien
   * pattern pop+repush qui coûtait 2N appels Redis par lecture. FIFO reste
   * garanti par LPUSH (tête = fin) + RPOP (queue = début).
   *
   * Attention à l'ordre : LPUSH insère en tête. La queue effective (ordre
   * FIFO) est donc parcourue de la fin vers le début. On récupère toute la
   * liste puis on inverse pour rendre les tickets dans l'ordre chronologique
   * d'arrivée.
   */
  async peek(key: string, limit = -1): Promise<MatchmakingTicket[]> {
    const raw = await this.redis.lrange(this.k(key), 0, -1);
    if (!raw || raw.length === 0) return [];
    const parsed = raw.map((s) => JSON.parse(s) as MatchmakingTicket).reverse();
    return limit < 0 ? parsed : parsed.slice(0, limit);
  }
  async size(key: string): Promise<number> { return this.redis.llen(this.k(key)); }
  async remove(key: string, userId: string): Promise<boolean> {
    const all = (await this.redis.lrange(this.k(key), 0, -1)).map((s) => JSON.parse(s) as MatchmakingTicket);
    const idx = all.findIndex((t) => t.userId === userId);
    if (idx < 0) return false;
    all.splice(idx, 1);
    await this.redis.del(this.k(key));
    for (const t of all.reverse()) await this.redis.lpush(this.k(key), JSON.stringify(t));
    return true;
  }
  async close(): Promise<void> { await this.redis.quit().catch(() => 'OK'); }
}
