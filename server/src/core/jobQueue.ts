import { createLogger } from './logger.js';

const logger = createLogger('job-queue');

export type JobWorker<T> = (job: T) => Promise<void>;

/**
 * File de jobs in-process, à concurrence bornée. Traite les jobs en arrière-plan
 * sans bloquer l'appelant (enqueue retourne immédiatement).
 *
 * Implémentation volontairement minimale : le contrat (enqueue + worker) est conçu
 * pour être remplacé par BullMQ/Redis en v7 (passage en micro-service) sans toucher
 * aux modules métier — seule cette classe changerait.
 */
export class InMemoryJobQueue<T> {
  private readonly pending: T[] = [];
  private active = 0;

  constructor(
    private readonly name: string,
    private readonly worker: JobWorker<T>,
    private readonly concurrency = 1,
  ) {}

  enqueue(job: T): void {
    this.pending.push(job);
    logger.debug('job enfilé', { queue: this.name, pending: this.pending.length });
    this.pump();
  }

  get size(): number {
    return this.pending.length + this.active;
  }

  private pump(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift()!;
      this.active += 1;
      setImmediate(() => {
        Promise.resolve(this.worker(job))
          .catch((error) => logger.error('job en échec', { queue: this.name, error: (error as Error).message }))
          .finally(() => { this.active -= 1; this.pump(); });
      });
    }
  }
}
