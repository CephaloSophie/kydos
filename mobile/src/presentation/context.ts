/* =============================================================================
 * PRESENTATION · context.ts — Contexte injecté dans chaque écran.
 * Assemblé à la composition root (main.tsx) et passé aux fabriques de vues,
 * conformément à la clean architecture (la présentation ne construit jamais
 * ses propres dépendances).
 * ========================================================================== */
import type { Router } from '../core/Router';
import type { Store } from '../core/Store';
import type { EventBus } from '../core/EventBus';
import type { ApiClient } from '../data/ApiClient';
import type { SessionCache } from '../data/SessionCache';
import type { RobotService } from '../domain/usecases/RobotService';
import type { TeamService } from '../domain/usecases/TeamService';
import type { Translate, Lang } from '../data/i18n';
import type { AdManager, VipService } from '../services/ads';

export interface AppState { lang: Lang; screen: string }

export interface AppContext {
  router: Router;
  store: Store<AppState>;
  bus: EventBus;
  api: ApiClient;
  /** Cache de session (profil, wallet, VIP, robots) — chargé une fois, persisté. */
  session: SessionCache;
  robotService: RobotService;
  teamService: TeamService;
  t: Translate;
  /** Orchestrateur publicitaire (bannière, interstitiels, App Open, récompensées). */
  ads: AdManager;
  /** Statut VIP (masque toute publicité). */
  vip: VipService;
}
