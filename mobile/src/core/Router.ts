/* =============================================================================
 * CORE · Router.ts — Routeur d'écrans par hash (#/route).
 * Port TypeScript du design system (js/core/Router.js), enrichi :
 *  - garde d'authentification par route (meta.auth === false = publique) ;
 *  - historique de navigation pour l'éventail de cartes « déjà visitées ».
 * ========================================================================== */

export interface RouteMeta {
  title?: string;
  fanLabel?: string;
  glyph?: string;
  grad?: string;
  /** Description courte affichée dans le panneau de l'accueil (carrousel). */
  desc?: string;
  /** Libellé du bouton d'action du panneau de l'accueil. */
  cta?: string;
  /** false = route publique (pas de token requis). Défaut : protégée. */
  auth?: boolean;
}

export type ScreenFactory = (ctx: any) => HTMLElement | Promise<HTMLElement>;
export interface RouterContext { router: Router; [k: string]: unknown }

interface RouteEntry { factory: ScreenFactory; meta: RouteMeta }

export class Router {
  #routes = new Map<string, RouteEntry>();
  #onChange: (name: string, route: RouteEntry) => void;
  /** Fournit le token courant : la garde d'auth s'appuie dessus. */
  #hasAuth: () => boolean;
  history: string[] = [];

  constructor(onChange: (name: string, route: RouteEntry) => void, hasAuth: () => boolean = () => true) {
    this.#onChange = onChange;
    this.#hasAuth = hasAuth;
  }

  register(name: string, factory: ScreenFactory, meta: RouteMeta = {}): this {
    this.#routes.set(name, { factory, meta });
    return this;
  }

  get(name: string): RouteEntry | undefined { return this.#routes.get(name); }
  meta(name: string): RouteMeta { return this.#routes.get(name)?.meta ?? {}; }

  start(): void {
    window.addEventListener('hashchange', () => void this.#resolve());
    void this.#resolve();
  }

  go(name: string): void {
    if (location.hash === '#/' + name) void this.#resolve();
    else location.hash = '#/' + name;
  }

  current(): string { return (location.hash.replace(/^#\/?/, '') || 'login').split('?')[0]; }

  async #resolve(): Promise<void> {
    const name = this.current();
    const route = this.#routes.get(name);
    if (!route) return this.go('login');

    // Garde d'authentification : une route protégée sans token renvoie au login.
    if (route.meta.auth !== false && !this.#hasAuth()) { if (name !== 'login') return this.go('login'); }

    if (name !== 'login' && !this.history.includes(name)) this.history.push(name);
    this.#onChange(name, route);
  }
}
