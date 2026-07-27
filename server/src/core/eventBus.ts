import { createLogger } from './logger.js';

const logger = createLogger('event-bus');

export type DomainEventHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * Bus d'événements de domaine — découple les modules (un producteur ne connaît
 * pas ses consommateurs). Distribution ASYNCHRONE (setImmediate) : publier ne
 * bloque jamais l'appelant.
 *
 * Implémentation in-process volontairement minimale. Le contrat (publish/subscribe)
 * est conçu pour être remplacé par une vraie file (BullMQ/Redis) sans toucher aux
 * modules : seule cette classe changerait.
 */
export class EventBus {
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  subscribe<T>(eventName: string, handler: DomainEventHandler<T>): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push(handler as DomainEventHandler);
    this.handlers.set(eventName, list);
    logger.debug('abonnement', { event: eventName, handlers: list.length });
  }

  /** Publie un événement. Non bloquant : chaque handler s'exécute au tick suivant. */
  publish<T>(eventName: string, payload: T): void {
    const list = this.handlers.get(eventName);
    if (!list?.length) return;
    for (const handler of list) {
      setImmediate(() => {
        Promise.resolve(handler(payload)).catch((error) =>
          logger.error('handler en échec', { event: eventName, error: (error as Error).message }),
        );
      });
    }
  }
}

/** Noms d'événements de domaine (typés pour éviter les chaînes en dur). */
export const DomainEvents = {
  GameFinished: 'game.finished',
} as const;

export interface GameFinishedPayload {
  gameId: string;
}

export const eventBus = new EventBus();
