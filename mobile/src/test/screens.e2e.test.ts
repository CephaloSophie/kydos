/* =============================================================================
 * TEST E2E (DOM réel · happy-dom) — parcours de TOUS les écrans mobiles.
 * -----------------------------------------------------------------------------
 * Chaque écran est monté avec le contexte applicatif réel, contre le FAUX
 * SERVEUR (intercepteur fetch). On vérifie qu'il se monte sans erreur, qu'il
 * interroge les bons endpoints et qu'il affiche les données attendues.
 * C'est le filet anti-régression « toutes les pages existent et marchent ».
 * ========================================================================== */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calls, installFakeServer } from './fakeServer';

// La table Pixi exige WebGL : hors de portée d'un DOM simulé. On la remplace
// par un composant inerte — l'écran de jeu reste testé pour SA logique (HUD,
// overlay de logs, dialogue de configuration).
vi.mock('@kydos/table-pixi', () => ({ PixiTable: () => null }));
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: () => {}, unmount: () => {} }) }));

import { EventBus } from '../core/EventBus';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { api } from '../data/ApiClient';
import { RobotRepository } from '../data/RobotRepository';
import { RobotService } from '../domain/usecases/RobotService';
import { TeamService } from '../domain/usecases/TeamService';
import { makeT } from '../data/i18n';
import { AdManager, VipService } from '../services/ads';
import type { AppContext, AppState } from '../presentation/context';

import { LoginScreen } from '../presentation/screens/LoginScreen';
import { HomeScreen } from '../presentation/screens/HomeScreen';
import { RobotsScreen } from '../presentation/screens/RobotsScreen';
import { CreateRobotScreen } from '../presentation/screens/CreateRobotScreen';
import { RankingScreen, CompetScreen } from '../presentation/screens/RankingCompetScreens';
import { HistoryScreen, AboutScreen } from '../presentation/screens/HistoryAboutScreens';
import { WalletScreen } from '../presentation/screens/WalletScreen';
import { TeamsScreen, MyTeamScreen } from '../presentation/screens/TeamsScreens';
import { OnlineScreen } from '../presentation/screens/OnlineScreen';
import { TableScreen } from '../presentation/screens/TableScreen';

let uninstall: () => void;

/** Contexte applicatif complet, identique à celui de la composition root. */
function makeContext(): AppContext {
  const bus = new EventBus();
  const store = new Store<AppState>({ lang: 'fr', screen: 'home' });
  const router = new Router(() => {}, () => api.isAuthenticated());
  const vip = new VipService(api);
  const ads = new AdManager({ bus, vip, onReward: () => {}, hasClaimedDaily: () => true });
  return {
    router, store, bus, api,
    robotService: new RobotService(new RobotRepository(api), bus),
    teamService: new TeamService(api, bus),
    t: makeT(() => store.state.lang),
    ads, vip,
  };
}

/** Monte un écran dans le document et laisse les promesses se résoudre. */
async function mount(factory: (ctx: AppContext) => HTMLElement): Promise<HTMLElement> {
  const el = factory(makeContext());
  document.body.append(el);
  // Deux tours de boucle : fetch (microtask) puis rendu conditionnel.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  return el;
}

beforeEach(() => {
  uninstall = installFakeServer();
  localStorage.setItem('kydos.mobile.token', 'fake.jwt.token');
  document.body.innerHTML = '';
  location.hash = '#/home';
});
afterEach(() => { uninstall(); vi.restoreAllMocks(); });

describe('Écran · Connexion', () => {
  it('affiche la carte as de cœur et les champs de connexion', async () => {
    const el = await mount(LoginScreen);
    expect(el.querySelector('.play-card')).toBeTruthy();
    expect(el.textContent).toContain('Se connecter');
    expect(el.querySelectorAll('input')).toHaveLength(2);
  });

  it('se connecte via /auth/login et stocke le jeton', async () => {
    api.setToken(null);
    const el = await mount(LoginScreen);
    const [user, pass] = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    user.value = 'Ameur'; pass.value = 'secret';
    (el.querySelector('button.btn--primary') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.path === '/auth/login')).toBe(true);
    expect(api.token()).toBe('fake.jwt.token');
  });
});

describe('Écran · Accueil', () => {
  it('affiche les 3 cartes-fonctionnalités et l\'éventail de navigation', async () => {
    const el = await mount(HomeScreen);
    expect(el.querySelectorAll('.feature-card')).toHaveLength(3);
    expect(el.textContent).toContain('Jouer');
    expect(el.textContent).toContain('Mes robots');
    expect(el.textContent).toContain('Créer un robot');
    expect(el.querySelectorAll('.nav-fan__card').length).toBeGreaterThanOrEqual(9);
  });

  it('affiche le solde de jetons depuis /wallet (serveur-premier)', async () => {
    const el = await mount(HomeScreen);
    expect(calls.some((c) => c.path === '/wallet')).toBe(true);
    expect(el.querySelector('.coin')!.textContent).toMatch(/2\s?480/);
  });
});

describe('Écran · Mes robots', () => {
  it('liste l\'écurie renvoyée par /robots', async () => {
    const el = await mount(RobotsScreen);
    expect(calls.some((c) => c.path === '/robots')).toBe(true);
    expect(el.textContent).toContain('Atné');
    expect(el.textContent).toContain('Bâto');
    expect(el.textContent).toContain('Créer un robot');
  });
});

describe('Écran · Éditeur de robot', () => {
  it('affiche les 4 curseurs, les 5 avatars et l\'aperçu', async () => {
    const el = await mount(CreateRobotScreen);
    expect(el.querySelectorAll('.slider')).toHaveLength(4);
    expect(el.querySelectorAll('.avatar').length).toBeGreaterThanOrEqual(5);
    expect(el.textContent).toContain('Créer le robot');
  });

  it('crée le robot via POST /robots', async () => {
    const el = await mount(CreateRobotScreen);
    const createBtn = Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'Créer le robot')!;
    createBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.path === '/robots' && c.method === 'POST')).toBe(true);
  });
});

describe('Écran · Classements & Compétitions', () => {
  it('le classement affiche le podium', async () => {
    const el = await mount(RankingScreen);
    expect(el.textContent).toContain('Classements');
    expect(el.textContent).toContain('Zéno·9');
  });

  it('les compétitions affichent la vitrine des tournois', async () => {
    const el = await mount(CompetScreen);
    expect(el.textContent).toContain('Grand Prix des IA');
    expect(el.textContent).toContain('Coupe Contrée');
  });
});

describe('Écran · Historique & À propos', () => {
  it('l\'historique liste les parties de /games', async () => {
    const el = await mount(HistoryScreen);
    expect(calls.some((c) => c.path.startsWith('/games'))).toBe(true);
    expect(el.textContent).toContain('Historique des parties');
    expect(el.textContent).toContain('Mes parties'); // onglet de portée
    expect(el.textContent).toContain('Alliance Hybride'); // filtre de type
  });

  it('à propos affiche Cephalo Sophie, l\'équipe et les clients', async () => {
    const el = await mount(AboutScreen);
    expect(el.textContent).toContain('Cephalo Sophie');
    expect(el.textContent).toContain('Ameur Hamdouni');
    expect(el.textContent).toContain('Abdelhamid Sghaier');
    expect(el.textContent).toContain('JCDecaux');
  });
});

describe('Écran · Porte-monnaie', () => {
  it('affiche le solde, le barème et le journal', async () => {
    const el = await mount(WalletScreen);
    expect(calls.some((c) => c.path === '/wallet')).toBe(true);
    expect(el.textContent).toMatch(/2\s?480/);
    expect(el.textContent).toContain('Récompense quotidienne');
    expect(el.textContent).toContain('225');
  });

  it('la réclamation quotidienne appelle /wallet/claim et crédite', async () => {
    const el = await mount(WalletScreen);
    const btn = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Débloquer'))!;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.path === '/wallet/claim' && c.method === 'POST')).toBe(true);
    expect(el.textContent).toMatch(/2\s?980/);
  });
});

describe('Écran · Équipes', () => {
  it('liste les équipes publiques', async () => {
    const el = await mount(TeamsScreen);
    expect(calls.some((c) => c.path === '/teams')).toBe(true);
    expect(el.textContent).toContain('Kýdos Legends');
    expect(el.textContent).toContain('12/40');
  });

  it('mon équipe affiche les membres avec leurs rôles', async () => {
    const el = await mount(MyTeamScreen);
    expect(calls.some((c) => c.path === '/teams/mine')).toBe(true);
    expect(el.textContent).toContain('Abdelhamid');
    expect(el.textContent).toContain('Propriétaire');
    expect(el.textContent).toContain('4/40 membres');
  });

  it('en tant qu\'owner, propose Renommer et Exclure (permissions respectées)', async () => {
    const el = await mount(MyTeamScreen);
    const labels = Array.from(el.querySelectorAll('button')).map((b) => b.textContent);
    expect(labels).toContain('Renommer');
    // 3 membres gérables (super, admin, user) — l'owner ne peut pas s'exclure.
    expect(labels.filter((l) => l === 'Exclure')).toHaveLength(3);
  });
});

describe('Écran · Jouer en ligne', () => {
  it('charge les tables et affiche l\'en-tête multijoueur', async () => {
    const el = await mount(OnlineScreen);
    expect(calls.some((c) => c.path === '/tables')).toBe(true);
    expect(el.textContent).toContain('Jouer en ligne');
    expect(el.textContent).toContain('Créer une table');
  });

  it('rappelle que le jeu tourne sur le serveur', async () => {
    const el = await mount(OnlineScreen);
    expect(el.textContent).toContain('tourne sur le serveur');
  });

  it('le dialogue de création propose les 3 types de partie', async () => {
    const el = await mount(OnlineScreen);
    const btn = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Créer une table'))!;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    const dlg = el.querySelector('.dialog-backdrop')!;
    expect(dlg.textContent).toContain('Alliance Hybride');
    expect(dlg.textContent).toContain("Duo d'Acier");
    expect(dlg.textContent).toContain('Carré Royal');
    expect(dlg.textContent).toContain('Publique');
    expect(dlg.textContent).toContain('Privée');
  });
});

describe('Écran · Table (coquille HUD)', () => {
  it('ouvre le dialogue de configuration avant de lancer', async () => {
    location.hash = '#/table';
    const el = await mount(TableScreen);
    expect(el.querySelector('.dialog-backdrop')).toBeTruthy();
    expect(el.textContent).toContain('Configurer la partie');
    expect(el.textContent).toContain('Cartes visibles');
    expect(el.textContent).toContain('Nombre de manches');
  });

  it('expose l\'emplacement réservé du DS et l\'overlay de logs', async () => {
    location.hash = '#/table';
    const el = await mount(TableScreen);
    expect(el.querySelector('#game-table-mount')).toBeTruthy();
    expect(el.textContent).toContain('LOGS');
  });

  it('en mode ?watch=1, saute le dialogue et démarre directement', async () => {
    location.hash = '#/table?watch=1';
    const el = await mount(TableScreen);
    expect(el.querySelector('.dialog-backdrop')).toBeFalsy();
    expect(el.querySelector('#game-table-mount')).toBeTruthy();
  });
});

describe('Session expirée (le bug des 404)', () => {
  it('un 401 purge le jeton et renvoie vers le login', async () => {
    uninstall();
    uninstall = installFakeServer({ fail: { '/auth/me': 401, '/wallet': 401 } });
    api.setToken('stale.token');
    await mount(HomeScreen);
    expect(api.token()).toBeNull();
    expect(location.hash).toBe('#/login');
  });
});

describe('Dialogue de configuration — sélection TACTILE (plus de liste déroulante)', () => {
  it('n\'utilise AUCUN <select> : les choix sont des pastilles visibles', async () => {
    location.hash = '#/table';
    const el = await mount(TableScreen);
    const dialog = el.querySelector('.dialog-backdrop')!;
    expect(dialog.querySelectorAll('select')).toHaveLength(0);
    // 4 sièges × (Auto + Moi + 2 robots de l'écurie) = 16 pastilles.
    expect(dialog.textContent).toContain('Siège A');
    expect(dialog.textContent).toContain('Siège D');
    expect(dialog.textContent).toContain('🤖 Auto');
    expect(dialog.textContent).toContain('👤 Moi');
    expect(dialog.textContent).toContain('Atné');
  });

  it('affiche l\'appartenance d\'équipe de chaque siège (NOUS / EUX)', async () => {
    location.hash = '#/table';
    const el = await mount(TableScreen);
    const dialog = el.querySelector('.dialog-backdrop')!;
    expect(dialog.textContent).toContain('NOUS');
    expect(dialog.textContent).toContain('EUX');
  });

  it('déplacer « Moi » libère automatiquement l\'ancien siège (un seul humain)', async () => {
    location.hash = '#/table';
    const el = await mount(TableScreen);
    const dialog = el.querySelector('.dialog-backdrop')!;
    const moiChips = Array.from(dialog.querySelectorAll('span')).filter((s) => s.textContent === '👤 Moi');
    expect(moiChips.length).toBe(4); // une option « Moi » par siège
    (moiChips[2] as HTMLElement).click(); // se placer au siège C
    const after = Array.from(el.querySelectorAll('.dialog-backdrop span')).filter((s) => s.textContent === '👤 Moi');
    // Une seule pastille « Moi » doit être en état actif (couleur or).
    const actives = after.filter((s) => (s as HTMLElement).style.color.includes('gold'));
    expect(actives).toHaveLength(1);
  });

  it('propose exactement les manches supportées par le moteur (1, 2, 4)', async () => {
    location.hash = '#/table';
    const el = await mount(TableScreen);
    const dialog = el.querySelector('.dialog-backdrop')!;
    const badges = Array.from(dialog.querySelectorAll('.badge')).map((b) => b.textContent);
    expect(badges).toContain('1');
    expect(badges).toContain('2');
    expect(badges).toContain('4');
    expect(badges).not.toContain('3');
    expect(badges).not.toContain('5');
  });
});

describe('Couverture des pages — toutes les routes de l\'éventail existent', () => {
  it('chaque écran déclaré se monte sans erreur', async () => {
    const screens: [string, (ctx: AppContext) => HTMLElement][] = [
      ['login', LoginScreen], ['home', HomeScreen], ['robots', RobotsScreen],
      ['create', CreateRobotScreen], ['ranking', RankingScreen], ['compet', CompetScreen],
      ['history', HistoryScreen], ['about', AboutScreen], ['wallet', WalletScreen],
      ['teams', TeamsScreen], ['team', MyTeamScreen], ['online', OnlineScreen],
    ];
    for (const [name, factory] of screens) {
      document.body.innerHTML = '';
      const el = await mount(factory);
      expect(el, `écran ${name} vide`).toBeTruthy();
      expect(el.textContent!.length, `écran ${name} sans contenu`).toBeGreaterThan(10);
    }
  });
});

describe('KB-100 — menus de l\'accueil (gestion d\'équipe et sections)', () => {
  it('expose toutes les sections en un geste depuis l\'accueil', async () => {
    const el = await mount(HomeScreen);
    const txt = el.textContent!;
    for (const label of ['Jouer en ligne', 'Mon équipe', 'Équipes', 'Compétitions',
                         'Porte-monnaie', 'Classements', 'Historique', 'À propos']) {
      expect(txt, `menu manquant : ${label}`).toContain(label);
    }
  });

  it('les 3 cartes principales restent en tête', async () => {
    const el = await mount(HomeScreen);
    expect(el.querySelectorAll('.feature-card')).toHaveLength(3);
  });
});

describe('Design system — aperçu vivant', () => {
  it('l\'écran styleguide rend tous les blocs de référence', async () => {
    const { StyleguideScreen } = await import('../presentation/screens/StyleguideScreen');
    const el = await mount(StyleguideScreen);
    for (const s of ['COULEURS', 'TYPOGRAPHIE', 'BOUTONS', 'BADGES', 'MASCOTTES', 'CHAMPS', 'CARTES-FONCTIONNALITÉS']) {
      expect(el.textContent, `section manquante : ${s}`).toContain(s);
    }
    expect(el.querySelectorAll('.btn').length).toBeGreaterThanOrEqual(5);
    expect(el.querySelectorAll('.badge').length).toBeGreaterThanOrEqual(6);
    expect(el.querySelectorAll('.slider')).toHaveLength(2);
  });
});

describe('KB-051b — contrat de prise de siège (bug 403 « robot inconnu »)', () => {
  it('takeSeat(me) envoie le champ `as` attendu par le serveur, pas `assignment`', async () => {
    const { api } = await import('../data/ApiClient');
    api.setToken('fake.jwt.token');
    let sentBody: any = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (input: any, init: any) => {
      sentBody = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ table: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    await api.takeSeat('tbl_1', 0, 'me');
    globalThis.fetch = orig;
    expect(sentBody).toHaveProperty('as', 'me');
    expect(sentBody).toHaveProperty('index', 0);
    expect(sentBody).not.toHaveProperty('assignment'); // l'ancien champ, cause du 403
  });

  it('takeSeat(robotId) transmet l\'identifiant du robot dans `as`', async () => {
    const { api } = await import('../data/ApiClient');
    api.setToken('fake.jwt.token');
    let sentBody: any = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_input: any, init: any) => {
      sentBody = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ table: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    await api.takeSeat('tbl_1', 2, 'r_atne');
    globalThis.fetch = orig;
    expect(sentBody.as).toBe('r_atne');
  });
});

describe('KB-050/051 — création de table typée (contrat serveur)', () => {
  it('createTable envoie kind + robotIds + visibilité', async () => {
    const { api } = await import('../data/ApiClient');
    api.setToken('fake.jwt.token');
    let sent: any = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_i: any, init: any) => {
      sent = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ table: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    await api.createTable({ kind: 'acier', visibility: 'private', robotIds: ['r_atne', 'r_bato'], forTeam: true });
    globalThis.fetch = orig;
    expect(sent.kind).toBe('acier');
    expect(sent.robotIds).toEqual(['r_atne', 'r_bato']);
    expect(sent.visibility).toBe('private');
    expect(sent.forTeam).toBe(true);
  });

  it('startTable appelle POST /tables/:id/start', async () => {
    const { api } = await import('../data/ApiClient');
    api.setToken('fake.jwt.token');
    let calledPath = '';
    const orig = globalThis.fetch;
    globalThis.fetch = (async (input: any) => {
      calledPath = String(input).replace(/^https?:\/\/[^/]+/, '');
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    await api.startTable('tbl_9');
    globalThis.fetch = orig;
    expect(calledPath).toBe('/api/tables/tbl_9/start');
  });
});

describe('Reprise de partie — indicateur LIVE près du logo', () => {
  it('affiche la pastille LIVE quand une partie est en cours', async () => {
    uninstall();
    uninstall = installFakeServer({ activeSession: 'tbl_active' });
    const el = await mount(HomeScreen);
    await new Promise((r) => setTimeout(r, 0));
    const chip = el.querySelector('.live-chip') as HTMLElement | null;
    expect(chip).not.toBeNull();
    expect((chip as HTMLElement).style.display).toBe('inline-flex');
    expect((chip as HTMLElement).dataset.tableId).toBe('tbl_active');
    expect(el.textContent).toContain('LIVE');
  });

  it('masque la pastille LIVE sans partie en cours', async () => {
    uninstall();
    uninstall = installFakeServer();
    const el = await mount(HomeScreen);
    await new Promise((r) => setTimeout(r, 0));
    const chip = el.querySelector('.live-chip') as HTMLElement | null;
    // La pastille existe dans le DOM mais reste masquée sans activeSession.
    expect(chip == null || chip.style.display === 'none').toBe(true);
  });

  it('le TableScreen en mode ?online saute le dialogue de configuration', async () => {
    uninstall();
    uninstall = installFakeServer();
    location.hash = '#/table?online=tbl_active';
    const el = await mount(TableScreen);
    // Aucun dialogue de configuration : c'est une participation, pas une création.
    expect(el.querySelector('.dialog-backdrop')).toBeFalsy();
    expect(el.textContent).toContain('En attente de la partie');
  });
});

import { InvitationsScreen } from '../presentation/screens/InvitationsScreen';

describe('Écran · Invitations', () => {
  it('affiche l\'onglet Reçues avec une invitation et ses actions', async () => {
    const el = await mount(InvitationsScreen);
    // Un délai de plus pour laisser mine() + receivedInvitations() résoudre.
    await new Promise((r) => setTimeout(r, 0));
    expect(el.textContent).toContain('Invitations');
    expect(el.textContent).toContain('Les Contrées');   // équipe de l'invitation reçue
    expect(el.textContent).toContain('Accepter');
    expect(el.textContent).toContain('Refuser');
  });

  it('propose l\'onglet Envoyées au propriétaire d\'équipe', async () => {
    const el = await mount(InvitationsScreen);
    await new Promise((r) => setTimeout(r, 0));
    // Le fakeServer renvoie myRole:'owner' → l'onglet Envoyées est présent.
    expect(el.textContent).toContain('Envoyées');
  });

  it('accepter une invitation appelle la route /accept', async () => {
    const el = await mount(InvitationsScreen);
    await new Promise((r) => setTimeout(r, 0));
    const acceptBtn = Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'Accepter');
    acceptBtn?.click();
    // Le dialogue de confirmation s'ouvre ; on confirme.
    await new Promise((r) => setTimeout(r, 0));
    const confirmBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Accepter' && b.closest('.dialog'));
    confirmBtn?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.method === 'POST' && /\/invitations\/[^/]+\/accept/.test(c.path))).toBe(true);
  });
});

describe('Accueil · badge d\'invitations', () => {
  it('appelle le comptage des invitations pour le badge', async () => {
    await mount(HomeScreen);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.path === '/invitations/count')).toBe(true);
  });
});

import { openPlayerProfile } from '../presentation/components/PlayerProfile';

describe('Popup · Profil joueur', () => {
  it('ouvre le profil avec les trois onglets et les stats', async () => {
    const { api } = makeContext();
    const backdrop = openPlayerProfile(api, 'u_ameur', 'Ameur');
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(backdrop.textContent).toContain('Ameur');
    expect(backdrop.textContent).toContain('Infos');
    expect(backdrop.textContent).toContain('Robots');
    expect(backdrop.textContent).toContain('Stats');
    // Onglet Infos par défaut : niveau + rang visibles.
    expect(backdrop.textContent).toContain('Niveau');
    // Basculer sur Stats.
    const statsTab = Array.from(backdrop.querySelectorAll('span')).find((s) => s.textContent === 'Stats');
    statsTab?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(backdrop.textContent).toContain('Gagnées');
    expect(backdrop.textContent).toContain('74');   // wins de la fixture
    backdrop.remove();
  });

  it('appelle la route de profil', async () => {
    const { api } = makeContext();
    const backdrop = openPlayerProfile(api, 'u_ameur', 'Ameur');
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => /\/users\/[^/]+\/profile/.test(c.path))).toBe(true);
    backdrop.remove();
  });
});

import { GameStatsScreen } from '../presentation/screens/GameStatsScreen';
import { ReplayScreen } from '../presentation/screens/ReplayScreen';

function withGameHash(id: string) {
  const prev = location.hash;
  location.hash = `#/gamestats?id=${id}`;
  return () => { location.hash = prev; };
}

describe('Écran · Statistiques de partie', () => {
  it('charge une partie et affiche compositions + repère NOUS/EUX', async () => {
    const restore = withGameHash('g_2');
    const el = await mount(GameStatsScreen);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.path.startsWith('/games/'))).toBe(true);
    expect(el.textContent).toContain('Ameur');
    expect(el.textContent).toContain('NOUS');
    expect(el.textContent).toContain('EUX');
    restore();
  });
  it('rend le nom d’un joueur humain cliquable', async () => {
    const restore = withGameHash('g_2');
    const el = await mount(GameStatsScreen);
    await new Promise((r) => setTimeout(r, 0));
    const clickable = Array.from(el.querySelectorAll('span')).find((s) => s.textContent === 'Ameur' && s.style.cursor === 'pointer');
    expect(clickable).toBeTruthy();
    restore();
  });
});

describe('Écran · Rejeu de partie', () => {
  it('charge la partie et se monte sans erreur', async () => {
    const restore = withGameHash('g_2');
    const el = await mount(ReplayScreen);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.path.startsWith('/games/'))).toBe(true);
    expect(el).toBeTruthy();
    restore();
  });
});
