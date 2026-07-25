/* =============================================================================
 * main.tsx — COMPOSITION ROOT de l'application mobile.
 * -----------------------------------------------------------------------------
 * Seul endroit où les couches se rencontrent (clean architecture) :
 *   data (API + dépôt)  ──▶  domain (RobotService)  ──▶  presentation (écrans)
 * Aucune autre couche ne connaît d'implémentation concrète.
 * ========================================================================== */
import './design-system/index.css';
// Le composant table Pixi (partagé avec le web) apporte ses propres styles.
import '../../packages/table-pixi/styles/index.css';

import { EventBus } from './core/EventBus';
import { Store } from './core/Store';
import { Router } from './core/Router';
import { api } from './data/ApiClient';
import { RobotRepository } from './data/RobotRepository';
import { RobotService } from './domain/usecases/RobotService';
import { TeamService } from './domain/usecases/TeamService';
import { makeT } from './data/i18n';
import { clear } from './core/dom';
import type { AppContext, AppState } from './presentation/context';
import { LoginScreen } from './presentation/screens/LoginScreen';
import { HomeScreen } from './presentation/screens/HomeScreen';
import { RobotsScreen } from './presentation/screens/RobotsScreen';
import { CreateRobotScreen } from './presentation/screens/CreateRobotScreen';
import { RankingScreen, CompetScreen } from './presentation/screens/RankingCompetScreens';
import { HistoryScreen, AboutScreen } from './presentation/screens/HistoryAboutScreens';
import { TableScreen } from './presentation/screens/TableScreen';
import { ReplayScreen } from './presentation/screens/ReplayScreen';
import { WalletScreen } from './presentation/screens/WalletScreen';
import { TeamsScreen, MyTeamScreen } from './presentation/screens/TeamsScreens';
import { OnlineScreen } from './presentation/screens/OnlineScreen';
import { StyleguideScreen } from './presentation/screens/StyleguideScreen';

// --- 1. Infrastructure transverse ------------------------------------------
const bus = new EventBus();
const store = new Store<AppState>({ lang: 'fr', screen: 'login' });

// --- 2. Data → Domain (injection) ------------------------------------------
const robotRepository = new RobotRepository(api);
const robotService = new RobotService(robotRepository, bus);
const teamService = new TeamService(api, bus);
const t = makeT(() => store.state.lang);

// --- 3. Présentation --------------------------------------------------------
const viewport = document.getElementById('viewport')!;
const router = new Router((name, route) => {
  store.set({ screen: name });
  clear(viewport);
  Promise.resolve(route.factory(ctx as unknown as Record<string, unknown> & AppContext))
    .then((el) => viewport.append(el))
    .catch((e) => viewport.append(Object.assign(document.createElement('div'), { textContent: `Erreur: ${(e as Error).message}`, className: 'text-mute' })));
}, () => api.isAuthenticated());

const ctx: AppContext = { router, store, bus, api, robotService, teamService, t };

// Routes (avec métadonnées pour l'éventail de navigation permanent).
router
  .register('login',   LoginScreen,         { title: 'Connexion', auth: false })
  .register('home',    HomeScreen,          { title: 'Accueil' })
  .register('table',   TableScreen,         { title: 'Jouer',        fanLabel: 'LE JEU',   glyph: '♥', grad: 'var(--g-heart)' })
  .register('robots',  RobotsScreen,        { title: 'Mes robots',   fanLabel: 'ROBOTS',   glyph: '♠', grad: 'var(--g-spade)' })
  .register('create',  CreateRobotScreen,   { title: 'Éditeur',      fanLabel: 'ÉDITEUR',  glyph: '♦', grad: 'var(--g-diamond)' })
  .register('ranking', RankingScreen,       { title: 'Classements',  fanLabel: 'CLASS.',   glyph: '◆', grad: 'var(--g-slate)' })
  .register('compet',  CompetScreen,        { title: 'Compétitions', fanLabel: 'COMPÉT.',  glyph: '★', grad: 'var(--g-gold)' })
  .register('history', HistoryScreen,       { title: 'Historique',   fanLabel: 'ARCHIVES', glyph: '◆', grad: 'var(--g-slate)' })
  .register('about',   AboutScreen,         { title: 'À propos',     fanLabel: 'INFOS',    glyph: '✦', grad: 'var(--g-club)' })
  .register('replay',  ReplayScreen,        { title: 'Rejeu' })
  .register('wallet',  WalletScreen,        { title: 'Porte-monnaie', fanLabel: 'JETONS', glyph: '◆', grad: 'var(--g-gold)' })
  .register('teams',   TeamsScreen,         { title: 'Équipes',        fanLabel: 'ÉQUIPES', glyph: '♣', grad: 'var(--g-club)' })
  .register('team',    MyTeamScreen,        { title: 'Mon équipe',     fanLabel: 'MON ÉQUIPE', glyph: '♣', grad: 'var(--g-club)' })
  .register('online',  OnlineScreen,        { title: 'Jouer en ligne', fanLabel: 'EN LIGNE', glyph: '♠', grad: 'var(--g-spade)' })
  .register('styleguide', StyleguideScreen, { title: 'Design system' });

if (!location.hash) location.hash = api.isAuthenticated() ? '#/home' : '#/login';
router.start();

// Retirer l'écran d'initialisation (les 4 robots) dès que l'app est montée.
// Court délai pour laisser le premier rendu s'afficher, puis fondu de sortie.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (boot) { boot.classList.add('hidden'); setTimeout(() => boot.remove(), 550); }
});

// Exposition pour intégration externe (montage du composant Table réutilisable).
(window as unknown as { KydosBelote: unknown }).KydosBelote = { router, robotService, teamService, store, bus, api };
