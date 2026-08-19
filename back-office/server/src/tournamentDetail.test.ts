/* =============================================================================
 * BACK-OFFICE · tests/tournamentDetail.test.ts
 * -----------------------------------------------------------------------------
 * Tests unitaires PURS de tous les helpers de la vue Détail tournoi.
 * Aucun Mongoose, aucune requête réseau : on nourrit les fonctions avec
 * des objets JavaScript et on vérifie leur sortie.
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import {
  sanitizeGameConfig,
  occupantsAtPosition,
  computeEconomics,
  resolveSlot,
  resolveMatchState,
  buildTournamentDetail,
} from './tournamentDetail.js';

/* ── sanitizeGameConfig ───────────────────────────────────────────────────── */

describe('sanitizeGameConfig', () => {
  it('applique les valeurs par défaut sur un objet vide', () => {
    const g = sanitizeGameConfig({});
    expect(g).toEqual({
      manches: 2,
      baseTarget: 1500,
      labelTarget: 2000,
      roundCountdownSec: 10,
      autoRejoinSec: 5,
      trickDelayMs: 900,
      speed: 1,
      turnTimeoutMs: 15000,
      allowSpectators: true,
      feltTheme: 'classic',
      signals: { reflexion: true, repeatSuit: true },
    });
  });

  it('accepte null / undefined en entrée sans planter', () => {
    expect(sanitizeGameConfig(null).autoRejoinSec).toBe(5);
    expect(sanitizeGameConfig(undefined).manches).toBe(2);
  });

  it('borne autoRejoinSec entre 0 et 60 (nouveau champ v16)', () => {
    expect(sanitizeGameConfig({ autoRejoinSec: -10 }).autoRejoinSec).toBe(0);
    expect(sanitizeGameConfig({ autoRejoinSec: 1000 }).autoRejoinSec).toBe(60);
    expect(sanitizeGameConfig({ autoRejoinSec: 7 }).autoRejoinSec).toBe(7);
  });

  it('borne roundCountdownSec entre 0 et 300', () => {
    expect(sanitizeGameConfig({ roundCountdownSec: 999 }).roundCountdownSec).toBe(300);
    expect(sanitizeGameConfig({ roundCountdownSec: -5 }).roundCountdownSec).toBe(0);
  });

  it('valide manches sur l\'enum [1,2,4]', () => {
    expect(sanitizeGameConfig({ manches: 3 }).manches).toBe(2);
    expect(sanitizeGameConfig({ manches: 4 }).manches).toBe(4);
    expect(sanitizeGameConfig({ manches: '2' as any }).manches).toBe(2);
  });

  it('borne baseTarget, labelTarget, trickDelayMs, turnTimeoutMs, speed', () => {
    const g = sanitizeGameConfig({
      baseTarget: 50,       // clampé au min (100)
      labelTarget: 999999,  // clampé au max (100000)
      trickDelayMs: -1,     // clampé à 0
      turnTimeoutMs: 500,   // clampé au min (3000)
      speed: 100,           // clampé au max (4)
    });
    expect(g.baseTarget).toBe(100);
    expect(g.labelTarget).toBe(100000);
    expect(g.trickDelayMs).toBe(0);
    expect(g.turnTimeoutMs).toBe(3000);
    expect(g.speed).toBe(4);
  });

  it('feltTheme accepte l\'enum, sinon retombe sur classic', () => {
    expect(sanitizeGameConfig({ feltTheme: 'cosmos' }).feltTheme).toBe('cosmos');
    expect(sanitizeGameConfig({ feltTheme: 'olympus' }).feltTheme).toBe('olympus');
    expect(sanitizeGameConfig({ feltTheme: 'zzz' as any }).feltTheme).toBe('classic');
  });

  it('allowSpectators et signaux : true par défaut, false explicite respecté', () => {
    expect(sanitizeGameConfig({ allowSpectators: false }).allowSpectators).toBe(false);
    expect(sanitizeGameConfig({ signals: { reflexion: false, repeatSuit: false } }).signals)
      .toEqual({ reflexion: false, repeatSuit: false });
  });

  it('remplace toute valeur non-finie par le défaut (NaN, string, undefined)', () => {
    const g = sanitizeGameConfig({ autoRejoinSec: 'abc' as any, baseTarget: NaN, labelTarget: undefined });
    expect(g.autoRejoinSec).toBe(5);
    expect(g.baseTarget).toBe(1500);
    expect(g.labelTarget).toBe(2000);
  });

  it('null est coercé en 0 par Number() : la borne min gagne (comportement documenté)', () => {
    // Number(null) === 0 : la valeur est FINIE. Elle est donc clampée au min,
    // pas remplacée par le défaut. On teste ici le contrat réel.
    expect(sanitizeGameConfig({ autoRejoinSec: null as any }).autoRejoinSec).toBe(0);
    expect(sanitizeGameConfig({ baseTarget: null as any }).baseTarget).toBe(100);
  });
});

/* ── occupantsAtPosition + computeEconomics ───────────────────────────────── */

describe('occupantsAtPosition', () => {
  it('rangs 1 et 2 → 1 finissant (vainqueur / finaliste)', () => {
    expect(occupantsAtPosition(8, 1)).toBe(1);
    expect(occupantsAtPosition(8, 2)).toBe(1);
  });

  it('bracket 8 : rang 3 = 2 (demi), rang 5 = 4 (quart)', () => {
    expect(occupantsAtPosition(8, 3)).toBe(2);
    expect(occupantsAtPosition(8, 5)).toBe(4);
  });

  it('bracket 16 : rang 3 = 2, rang 5 = 4, rang 9 = 8', () => {
    expect(occupantsAtPosition(16, 3)).toBe(2);
    expect(occupantsAtPosition(16, 5)).toBe(4);
    expect(occupantsAtPosition(16, 9)).toBe(8);
  });

  it('renvoie 0 pour un rang inatteignable', () => {
    expect(occupantsAtPosition(8, 4)).toBe(0);
    expect(occupantsAtPosition(8, 42)).toBe(0);
  });
});

describe('computeEconomics', () => {
  it('duo_steel 8 joueurs, 100 buy-in, 1er=400 2e=200 3e=100', () => {
    const e = computeEconomics(8, 100, [
      { position: 1, prize: 400 },
      { position: 2, prize: 200 },
      { position: 3, prize: 100 },
    ], 'duo_steel');
    expect(e.totalCollected).toBe(800);
    // 1×400 + 1×200 + 2×100 = 800  → net = 0.
    expect(e.totalPaid).toBe(800);
    expect(e.houseNet).toBe(0);
    expect(e.breakdown[2]).toEqual({ position: 3, occupants: 2, prizePerOccupant: 100, totalPaidAtThisPosition: 200 });
  });

  it('carrée royale : leaves = capacity/2, teamSize = 2 → 2 humains par rang', () => {
    // 8 humains → 4 équipes → 4 feuilles ; 1er (1 équipe) = 2 humains payés.
    const e = computeEconomics(8, 100, [{ position: 1, prize: 300 }], 'royal_square');
    expect(e.totalCollected).toBe(800);
    expect(e.breakdown[0].occupants).toBe(2);
    expect(e.totalPaid).toBe(600);   // 2 × 300
    expect(e.houseNet).toBe(200);
  });

  it('houseNet peut être négatif si la maison paie plus qu\'elle ne collecte', () => {
    const e = computeEconomics(4, 10, [{ position: 1, prize: 500 }], 'duo_steel');
    expect(e.houseNet).toBe(40 - 500);
  });

  it('retourne un breakdown vide si aucune position n\'est configurée', () => {
    const e = computeEconomics(8, 100, [], 'duo_steel');
    expect(e.totalCollected).toBe(800);
    expect(e.totalPaid).toBe(0);
    expect(e.breakdown).toEqual([]);
  });
});

/* ── resolveSlot ──────────────────────────────────────────────────────────── */

describe('resolveSlot', () => {
  const names = new Map<string, string>([
    ['u1', 'alice'], ['u2', 'bob'],
  ]);

  it('slot vide → tout à null / vide', () => {
    expect(resolveSlot(undefined, names)).toEqual({
      userId: null, username: null, userId2: null, username2: null,
      seedIndex: null, displayName: '', displayName2: '',
    });
  });

  it('résout username via la map', () => {
    const s = resolveSlot({ userId: 'u1', seedIndex: 3 }, names);
    expect(s.userId).toBe('u1');
    expect(s.username).toBe('alice');
    expect(s.seedIndex).toBe(3);
  });

  it('retombe sur displayName si l\'utilisateur n\'est pas dans la map', () => {
    const s = resolveSlot({ userId: 'ghost', displayName: 'Ancien joueur' }, names);
    expect(s.username).toBe('Ancien joueur');
  });

  it('Carrée royale : résout les 2 coéquipiers avec fallback displayName2', () => {
    const s = resolveSlot({
      userId: 'u1', userId2: 'ghost',
      displayName: 'alice', displayName2: 'coéquipier disparu',
    }, names);
    expect(s.username).toBe('alice');
    expect(s.username2).toBe('coéquipier disparu');
    expect(s.userId2).toBe('ghost');
  });
});

/* ── resolveMatchState ────────────────────────────────────────────────────── */

describe('resolveMatchState', () => {
  const NOW = new Date('2026-01-01T12:00:00Z').getTime();

  it('winner présent → finished (prioritaire sur tout le reste)', () => {
    expect(resolveMatchState({ matchIndex: 0, winner: 'A' }, { status: 'running' }, NOW)).toBe('finished');
  });

  it('Match rattaché en running → live', () => {
    expect(resolveMatchState({ matchIndex: 0 }, { status: 'running' }, NOW)).toBe('live');
  });

  it('scheduledStartAt dans le futur → countdown', () => {
    const future = new Date(NOW + 30_000).toISOString();
    expect(resolveMatchState({ matchIndex: 0, scheduledStartAt: future }, null, NOW)).toBe('countdown');
  });

  it('scheduledStartAt dépassé + 2 slots connus → ready', () => {
    const past = new Date(NOW - 30_000).toISOString();
    expect(resolveMatchState({
      matchIndex: 0, scheduledStartAt: past,
      slotA: { userId: 'u1' }, slotB: { userId: 'u2' },
    }, null, NOW)).toBe('ready');
  });

  it('slots complets sans date planifiée → ready', () => {
    expect(resolveMatchState({
      matchIndex: 0, slotA: { userId: 'u1' }, slotB: { userId: 'u2' },
    }, null, NOW)).toBe('ready');
  });

  it('au moins un slot vide → pending', () => {
    expect(resolveMatchState({ matchIndex: 0, slotA: { userId: 'u1' } }, null, NOW)).toBe('pending');
    expect(resolveMatchState({ matchIndex: 0 }, null, NOW)).toBe('pending');
  });
});

/* ── buildTournamentDetail ────────────────────────────────────────────────── */

describe('buildTournamentDetail', () => {
  const NOW = new Date('2026-01-01T12:00:00Z').getTime();
  const users = new Map([['u1', 'alice'], ['u2', 'bob'], ['u3', 'carol']]);
  const robots = new Map([
    ['r1', { name: 'Robocop' }],
    ['r2', { name: 'Wall-E' }],
    ['r3', { name: 'Bender' }],
  ]);

  it('enrichit un participant : username + noms de robots + remplaçant', () => {
    const out = buildTournamentDetail(
      { participants: [{
        userId: 'u1', robotIds: ['r1', 'r2'], substituteRobotId: 'r3',
        seedIndex: 0, finalPosition: 1, prizeAwarded: 400,
      }] },
      users, robots, new Map(), NOW,
    );
    expect(out.participants[0]).toMatchObject({
      userId: 'u1', username: 'alice',
      robots: [{ id: 'r1', name: 'Robocop' }, { id: 'r2', name: 'Wall-E' }],
      substituteRobot: { id: 'r3', name: 'Bender' },
      finalPosition: 1, prizeAwarded: 400,
    });
  });

  it('participant avec utilisateur/robot supprimés : marqueurs explicites', () => {
    const out = buildTournamentDetail(
      { participants: [{ userId: 'ghost', robotIds: ['unknown'], substituteRobotId: 'gone' }] },
      users, robots, new Map(), NOW,
    );
    expect(out.participants[0].username).toBeNull();
    expect(out.participants[0].robots[0].name).toBe('(robot supprimé)');
    expect(out.participants[0].substituteRobot?.name).toBe('(robot supprimé)');
  });

  it('vainqueurs enrichis (username depuis la map)', () => {
    const out = buildTournamentDetail({ winners: ['u2', 'u3'] }, users, robots, new Map(), NOW);
    expect(out.winners).toEqual([
      { userId: 'u2', username: 'bob' },
      { userId: 'u3', username: 'carol' },
    ]);
  });

  it('bracket : mappe les 5 états visuels et fusionne les scores serveur', () => {
    const futureIso = new Date(NOW + 15_000).toISOString();
    const matchById = new Map<string, any>([
      ['m-live', { status: 'running', liveTableId: 't-1', scoreTeamA: 900, scoreTeamB: 700 }],
      ['m-done', { status: 'finished', game: 'g-42', scoreTeamA: 1500, scoreTeamB: 1200 }],
    ]);
    const out = buildTournamentDetail({
      bracketTree: {
        rounds: [{ roundIndex: 1, label: '', matches: [
          { matchIndex: 0, slotA: {}, slotB: {} },                                              // pending
          { matchIndex: 1, slotA: { userId: 'u1' }, slotB: { userId: 'u2' } },                  // ready
          { matchIndex: 2, scheduledStartAt: futureIso, slotA: { userId: 'u1' }, slotB: { userId: 'u2' } }, // countdown
          { matchIndex: 3, matchId: 'm-live', slotA: { userId: 'u1' }, slotB: { userId: 'u2' } }, // live (scores fusionnés)
          { matchIndex: 4, matchId: 'm-done', winner: 'A', slotA: { userId: 'u1' }, slotB: { userId: 'u2' }, scoreA: 1500, scoreB: 1200 }, // finished
        ] }],
      },
    }, users, robots, matchById, NOW);

    const matches = out.bracketTree.rounds[0].matches;
    expect(matches.map((m) => m.state)).toEqual(['pending', 'ready', 'countdown', 'live', 'finished']);
    // Le score live est bien récupéré depuis matchDoc quand le bracket ne l'a pas encore.
    expect(matches[3].scoreA).toBe(900);
    expect(matches[3].liveTableId).toBe('t-1');
    // Le match terminé expose gameId, soit depuis le bracket soit depuis le matchDoc.
    expect(matches[4].gameId).toBe('g-42');
    expect(matches[4].winner).toBe('A');
  });

  it('label par défaut « Round N » quand aucun label bracket n\'est stocké', () => {
    const out = buildTournamentDetail(
      { bracketTree: { rounds: [{ roundIndex: 3, matches: [] }] } },
      users, robots, new Map(), NOW,
    );
    expect(out.bracketTree.rounds[0].label).toBe('Round 3');
  });

  it('entrée minimale (tout vide) : sortie stable, pas d\'exception', () => {
    const out = buildTournamentDetail({}, new Map(), new Map(), new Map(), NOW);
    expect(out.participants).toEqual([]);
    expect(out.winners).toEqual([]);
    expect(out.bracketTree.rounds).toEqual([]);
    expect(out.bracketTree.lastCompletedRound).toBe(0);
  });
});
