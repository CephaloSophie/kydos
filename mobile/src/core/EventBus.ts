/* =============================================================================
 * CORE · EventBus.ts — Bus d'événements pub/sub découplé.
 * Port TypeScript du design system (js/core/EventBus.js).
 * Permet aux couches de communiquer sans se référencer directement.
 * ========================================================================== */

export type BusHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  #listeners = new Map<string, Set<BusHandler>>();

  /** Abonne un callback à un événement. Retourne une fonction de désabonnement. */
  on<T = unknown>(event: string, cb: BusHandler<T>): () => void {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event)!.add(cb as BusHandler);
    return () => this.off(event, cb as BusHandler);
  }

  off(event: string, cb: BusHandler): void { this.#listeners.get(event)?.delete(cb); }

  /** Émet un événement avec une charge utile optionnelle. */
  emit<T = unknown>(event: string, payload?: T): void {
    this.#listeners.get(event)?.forEach((cb) => cb(payload));
  }
}
