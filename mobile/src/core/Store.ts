/* =============================================================================
 * CORE · Store.ts — État réactif minimal (observable).
 * Port TypeScript du design system (js/core/Store.js).
 * Source de vérité de l'état d'interface (session, langue, écran courant…).
 * ========================================================================== */

export type StoreSub<S> = (state: S) => void;

export class Store<S extends object> {
  #state: S;
  #subs = new Set<StoreSub<S>>();

  constructor(initial: S) { this.#state = { ...initial }; }

  get state(): S { return this.#state; }

  /** Fusionne un patch dans l'état et notifie les abonnés. */
  set(patch: Partial<S>): void {
    this.#state = { ...this.#state, ...patch };
    this.#subs.forEach((cb) => cb(this.#state));
  }

  /** Abonnement ; retourne une fonction de désabonnement. */
  subscribe(cb: StoreSub<S>): () => void { this.#subs.add(cb); return () => this.#subs.delete(cb); }
}
