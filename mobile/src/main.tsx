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
import { SessionCache } from './data/SessionCache';
import { runBootstrap } from './data/bootstrap';
import { RobotRepository } from './data/RobotRepository';
import { RobotService } from './domain/usecases/RobotService';
import { TeamService } from './domain/usecases/TeamService';
import { makeT } from './data/i18n';
import { AdManager, VipService } from './services/ads';
import { creditReward, spendTokens } from './services/wallet';
import { readWallet } from './services/wallet';
import { soundService } from './services/sound/SoundService';
import { clear } from './core/dom';
import type { AppContext, AppState } from './presentation/context';
import { LoginScreen } from './presentation/screens/LoginScreen';
import { HomeScreen } from './presentation/screens/HomeScreen';
import { RobotsScreen } from './presentation/screens/RobotsScreen';
import { CreateRobotScreen } from './presentation/screens/CreateRobotScreen';
import { RankingScreen, CompetScreen } from './presentation/screens/RankingCompetScreens';
import { HistoryScreen, AboutScreen } from './presentation/screens/HistoryAboutScreens';
import { TableScreen } from './presentation/screens/TableScreen';
import { InvitationsScreen } from './presentation/screens/InvitationsScreen';
import { GameStatsScreen } from './presentation/screens/GameStatsScreen';
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

// Cache de session : profil, wallet, VIP, robots — chargé une fois au
// bootstrap, persisté sur disque, rafraîchi seulement quand une donnée change.
const session = new SessionCache(api, bus);

// --- 2b. Publicité + VIP ----------------------------------------------------
// VIP masque toute publicité ; AdManager orchestre les emplacements. Le crédit
// des récompenses est délégué au wallet (le module ads ignore l'économie).
const vip = new VipService(api, (amount, kind) => spendTokens(amount, kind));
const ads = new AdManager({
  bus,
  vip,
  onReward: async (amount) => { await creditReward(amount); },
  hasClaimedDaily: async () => !(await readWallet()).canClaim,
});

// --- 3. Présentation --------------------------------------------------------
const viewport = document.getElementById('viewport')!;
const router = new Router((name, route) => {
  store.set({ screen: name });
  // Publicité : signaler le changement d'écran (minuterie App Open) et gérer la
  // bannière — visible hors table de jeu, masquée sur la table/en ligne.
  ads.notifyScreen(name);
  if (name === 'table' || name === 'online' || name === 'login') void ads.hideBanner();
  else void ads.showBanner();
  // Nettoyage de l'écran sortant (abonnements aux évènements, timers…).
  const outgoing = viewport.firstElementChild as (HTMLElement & { _cleanup?: () => void }) | null;
  outgoing?._cleanup?.();
  clear(viewport);
  Promise.resolve(route.factory(ctx as unknown as Record<string, unknown> & AppContext))
    .then((el) => viewport.append(el))
    .catch((e) => viewport.append(Object.assign(document.createElement('div'), { textContent: `Erreur: ${(e as Error).message}`, className: 'text-mute' })));
}, () => api.isAuthenticated());

const ctx: AppContext = { router, store, bus, api, session, robotService, teamService, t, ads, vip };

// Initialise la publicité en arrière-plan (SDK natif + préchargements).
void ads.initialize();

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
  .register('gamestats', GameStatsScreen,    { title: 'Statistiques' })
  .register('wallet',  WalletScreen,        { title: 'Porte-monnaie', fanLabel: 'JETONS', glyph: '◆', grad: 'var(--g-gold)' })
  .register('teams',   TeamsScreen,         { title: 'Équipes',        fanLabel: 'ÉQUIPES', glyph: '♣', grad: 'var(--g-club)' })
  .register('team',    MyTeamScreen,        { title: 'Mon équipe',     fanLabel: 'MON ÉQUIPE', glyph: '♣', grad: 'var(--g-club)' })
  .register('invitations', InvitationsScreen, { title: 'Invitations', fanLabel: 'INVITATIONS', glyph: '✉', grad: 'var(--g-club)' })
  .register('online',  OnlineScreen,        { title: 'Jouer en ligne', fanLabel: 'EN LIGNE', glyph: '♠', grad: 'var(--g-spade)' })
  .register('styleguide', StyleguideScreen, { title: 'Design system' });

if (!location.hash) location.hash = api.isAuthenticated() ? '#/home' : '#/login';

/**
 * Séquence de démarrage :
 *  1. La page « waiting » (#boot) reste visible.
 *  2. On charge la session (profil/wallet/VIP/robots) + tous les sons.
 *  3. On démarre le routeur, puis on retire la page waiting en fondu.
 *
 * Si l'utilisateur n'est pas authentifié, le bootstrap est quasi instantané
 * (juste le préchargement des sons) et on file au login.
 */
async function boot(): Promise<void> {
  try {
    await runBootstrap({ api, session, sound: soundService });
  } catch { /* le bootstrap ne lève jamais, mais ceinture + bretelles */ }

  router.start();

  // Retirer l'écran d'initialisation (les 4 robots) une fois l'app montée.
  requestAnimationFrame(() => {
    const bootEl = document.getElementById('boot');
    if (bootEl) { bootEl.classList.add('hidden'); setTimeout(() => bootEl.remove(), 550); }
  });
}
void boot();

// Exposition pour intégration externe (montage du composant Table réutilisable).
(window as unknown as { KydosBelote: unknown }).KydosBelote = { router, robotService, teamService, store, bus, api };
