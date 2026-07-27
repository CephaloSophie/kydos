/* =============================================================================
 * TEST · fakeServer.ts — FAUX SERVEUR (intercepteur `fetch`).
 * -----------------------------------------------------------------------------
 * MongoDB n'étant pas joignable dans l'environnement de CI de la sandbox, les
 * parcours d'écran sont validés contre un serveur simulé qui répond exactement
 * comme le vrai (mêmes chemins, mêmes formes de payload, mêmes statuts).
 * Cela exerce AUSSI la vraie couche `ApiClient` (en-têtes, parsing, gestion
 * du 401) — seul le transport est remplacé.
 * ========================================================================== */

export interface FakeServerOptions {
  /** Force une partie en cours (id de table) pour tester la bannière de reprise. */
  activeSession?: string;
  /** Force un statut sur une route donnée (ex. tester le 401 de session expirée). */
  fail?: Record<string, number>;
  /** Jetons initiaux du porte-monnaie simulé. */
  walletBalance?: number;
  /** Réclamation quotidienne déjà consommée ? */
  claimedToday?: boolean;
}

/** Données de démonstration — cohérentes avec les serializers du serveur. */
export const FIXTURES = {
  user: { id: 'u_ameur', username: 'Ameur', email: null, team: null, rewardPoints: 4200, gamesPlayed: 128, level: 7, activeSession: null as string | null, favoriteRobot: 'r_atne' },
  robots: [
    { id: 'r_atne', name: 'Atné', personality: { aggressiveness: 6, concentration: 8, velocity: 4 }, responseTimeMs: 1000, maxPlayTimeMs: 10000, algoSpec: null, offlineEnabled: false, representativeSlot: 0, mobile: { avatarId: 'atne', strategy: { aggro: 62, risk: 38, bluff: 45, memoire: 78 } } },
    { id: 'r_bato', name: 'Bâto', personality: { aggressiveness: 5, concentration: 5, velocity: 5 }, responseTimeMs: 900, maxPlayTimeMs: 9000, algoSpec: null, offlineEnabled: false, representativeSlot: 1, mobile: { avatarId: 'bato', strategy: { aggro: 50, risk: 50, bluff: 40, memoire: 50 } } },
  ],
  games: [
    { id: 'g_1', mode: 'local', kind: 'local', winner: 'A', createdAt: '2026-07-20T18:00:00.000Z' },
    { id: 'g_2', mode: 'online', kind: 'hybride', winner: 'B', createdAt: '2026-07-21T20:30:00.000Z' },
  ],
  teams: [
    { id: 't_1', name: 'Kýdos Legends', points: 980, members: 12, visibility: 'public' },
    { id: 't_2', name: 'Les Contrées', points: 640, members: 5, visibility: 'private' },
  ],
  teamDetail: {
    team: { id: 't_1', name: 'Kýdos Legends', points: 980, owner: 'u_ameur', visibility: 'public' },
    members: [
      { id: 'u_ameur', username: 'Ameur', role: 'owner', rewardPoints: 4200, level: 7 },
      { id: 'u_hamid', username: 'Abdelhamid', role: 'super', rewardPoints: 3100, level: 6 },
      { id: 'u_zoe', username: 'Zoé', role: 'admin', rewardPoints: 1500, level: 4 },
      { id: 'u_max', username: 'Max', role: 'user', rewardPoints: 300, level: 2 },
    ],
    myRole: 'owner',
  },
  userProfile: {
    id: 'u_ameur', username: 'Ameur', level: 7, rewardPoints: 4200, rank: 'Initié',
    gamesPlayed: 128, wins: 74, losses: 54, robotCount: 2,
    robots: [{ id: 'r_atne', name: 'Atné', elo: 1240, avatarId: 'a1' }, { id: 'r_bato', name: 'Bâto', elo: 1180, avatarId: 'a2' }],
    team: { id: 't1', name: 'Les Atouts', visibility: 'private' },
  },
  receivedInvitations: [
    { id: 'inv_r1', team: { id: 't2', name: 'Les Contrées', visibility: 'public' }, from: { id: 'u_z', username: 'Zoe' }, createdAt: '2026-07-20T10:00:00.000Z' },
  ],
  sentInvitations: [
    { id: 'inv_s1', to: { id: 'u_y', username: 'Yanis' }, status: 'pending' },
  ],
  tables: [
    { id: 'tbl_1', status: 'lobby', kind: 'hybride', owner: 'u_ameur', visibility: 'public', startsAt: null,
      seats: [
        { index: 0, kind: 'human', name: 'Ameur', team: 'A', userId: 'u_ameur', robotId: null, ownerId: null },
        { index: 1, kind: 'empty', name: '', team: 'B', userId: null, robotId: null, ownerId: null },
        { index: 2, kind: 'robot', name: 'Atné', team: 'A', userId: null, robotId: 'r_atne', ownerId: 'u_ameur' },
        { index: 3, kind: 'empty', name: '', team: 'B', userId: null, robotId: null, ownerId: null },
      ] },
  ],
};

/** Journal des appels reçus — permet d'asserter qu'un écran interroge bien l'API. */
export const calls: { method: string; path: string }[] = [];

/**
 * Installe l'intercepteur. Retourne une fonction de désinstallation.
 * Toute route inconnue répond 404 avec `{ error }` — exactement comme le
 * middleware 404 du vrai serveur.
 */
export function installFakeServer(options: FakeServerOptions = {}): () => void {
  const originalFetch = globalThis.fetch;
  let balance = options.walletBalance ?? 2480;
  let claimed = options.claimedToday ?? false;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const fullPath = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
    const path = fullPath.split('?')[0];
    calls.push({ method, path });

    const forced = options.fail?.[path];
    if (forced) return json({ error: forced === 401 ? 'session expirée' : 'erreur simulée' }, forced);

    // --- Auth -------------------------------------------------------------
    if (path === '/auth/me') return json({ user: { ...FIXTURES.user, activeSession: options.activeSession ?? null } });
    if (path === '/auth/login' || path === '/auth/register') return json({ token: 'fake.jwt.token', user: FIXTURES.user });

    // --- Robots -----------------------------------------------------------
    if (path === '/robots' && method === 'GET') return json({ robots: FIXTURES.robots });
    if (path === '/robots' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}'));
      return json({ robot: { id: 'r_new', name: body.name ?? 'Robot' } });
    }

    // --- Games ------------------------------------------------------------
    if (path === '/games' && method === 'GET') return json({ games: FIXTURES.games, page: 1, pageSize: 15, total: FIXTURES.games.length, totalPages: 1 });
    if (path === '/games/robots' && method === 'POST') return json({ gameId: 'g_robots', winner: 'A', scoreA: 1520, scoreB: 980 });
    if (path === '/games' && method === 'POST') return json({ id: 'g_new' });
    if (path.startsWith('/games/public')) return json({ games: [] });
    if (path.startsWith('/games/')) return json({ game: {
      ...FIXTURES.games[0],
      participants: [
        { seatIndex: 0, team: 'A', type: 'human', name: 'Ameur', userId: 'u_ameur', wasSubstitute: false },
        { seatIndex: 1, team: 'B', type: 'robot', name: 'Zéno·9', userId: null, wasSubstitute: false },
        { seatIndex: 2, team: 'A', type: 'robot', name: 'Atné', userId: null, wasSubstitute: false },
        { seatIndex: 3, team: 'B', type: 'human', name: 'Zoe', userId: 'u_zoe', wasSubstitute: false },
      ],
      stats: { totalDonnes: 8, totalTricksA: 5, totalTricksB: 3, contres: 1, surcontres: 0, contresReussies: 1,
               capotsA: 0, capotsB: 0, capotsTotal: 0, belotesA: 1, belotesB: 0, scoreA: 1520, scoreB: 980, manchesWonA: 2, manchesWonB: 1 },
      cumulative: { A: 1520, B: 980 },
      replay: { manches: [{ donnes: [{ hands: [[], [], [], []], operations: [
        { type: 'bid', at: 1, seat: 0, data: { bid: { action: 'bid', value: 90, suit: 'coeur', saidSuit: true } } },
        { type: 'play', at: 2, seat: 0, data: { card: { rank: 'As', suit: 'coeur' } } },
        { type: 'trick', at: 3, seat: 0, data: {} },
        { type: 'donne_score', at: 4, seat: 0, data: { A: 82, B: 64 } },
      ] }] }] },
      logs: [],
    } });

    // --- Wallet -----------------------------------------------------------
    if (path === '/wallet' && method === 'GET') {
      return json({ balance, canClaimToday: !claimed, lastClaimDay: claimed ? '2026-07-24' : null, transactions: [
        { kind: 'daily', amount: 500, balance, at: '2026-07-23T08:00:00.000Z', game: null },
        { kind: 'game_stake', amount: -100, balance: balance - 100, at: '2026-07-23T09:00:00.000Z', game: 'g_1' },
      ] });
    }
    if (path === '/wallet/claim' && method === 'POST') {
      if (claimed) return json({ error: 'déjà réclamée aujourd\'hui' }, 400);
      claimed = true; balance += 500;
      return json({ claimed: true, balance, reward: 500 });
    }

    // --- Teams ------------------------------------------------------------
    if (path === '/teams' && method === 'GET') return json({ teams: FIXTURES.teams });
    if (path === '/teams' && method === 'POST') return json({ team: { id: 't_new', name: 'Nouvelle', visibility: 'private' } });
    if (path === '/teams/mine') return json(FIXTURES.teamDetail);
    if (/^\/teams\/[^/]+$/.test(path) && method === 'GET') return json(FIXTURES.teamDetail);
    if (/^\/teams\/[^/]+$/.test(path) && method === 'PUT') return json({ team: FIXTURES.teamDetail.team });
    if (/^\/teams\/[^/]+\/members\//.test(path)) return json({ ok: true });
    if (/^\/teams\/[^/]+\/(join|leave)$/.test(path)) return json({ ok: true });

    // --- Invitations ------------------------------------------------------
    if (path === '/invitations' && method === 'GET') return json({ invitations: FIXTURES.receivedInvitations });
    if (path === '/invitations/count') return json({ count: FIXTURES.receivedInvitations.length });
    if (/^\/teams\/[^/]+\/invite$/.test(path) && method === 'POST') return json({ invitation: { id: 'inv_new', to: { id: 'u_x', username: 'Cible' }, status: 'pending' } });
    if (/^\/teams\/[^/]+\/invitations$/.test(path) && method === 'GET') return json({ invitations: FIXTURES.sentInvitations });
    if (/^\/invitations\/[^/]+\/accept$/.test(path)) return json({ ok: true, teamId: 't1' });
    if (/^\/invitations\/[^/]+\/(decline|cancel)$/.test(path)) return json({ ok: true });
    if (path === '/users/search') return json({ users: [{ id: 'u_a', username: 'Alpha' }, { id: 'u_b', username: 'Bravo' }] });
    if (/^\/users\/[^/]+\/profile$/.test(path)) return json({ profile: FIXTURES.userProfile });

    // --- Tables -----------------------------------------------------------
    if (path === '/tables' && method === 'GET') return json({ tables: FIXTURES.tables, page: 1, pageSize: 15, total: FIXTURES.tables.length, totalPages: 1 });
    if (path === '/tables' && method === 'POST') return json({ table: FIXTURES.tables[0] });
    if (/^\/tables\/[^/]+\/(seat|leave|cancel|start)$/.test(path)) return json({ ok: true, table: FIXTURES.tables[0] });

    // --- Analytics --------------------------------------------------------
    if (path === '/analytics/me') return json({ stats: { games: 128, wins: 74 } });

    return json({ error: 'route inconnue' }, 404);
  }) as typeof fetch;

  return () => { globalThis.fetch = originalFetch; calls.length = 0; };
}
