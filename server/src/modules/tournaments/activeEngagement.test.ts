/* =============================================================================
 * TOURNAMENTS · tests/activeEngagement.test.ts
 * -----------------------------------------------------------------------------
 * Tests unitaires PURS de la composition d'engagement d'un joueur dans un
 * tournoi LIVE. Alimente les helpers avec des objets JavaScript — aucun
 * Mongoose, aucun réseau — et vérifie chaque branche du contrat exposé au
 * mobile (pastille LIVE, écran d'attente, popup de redirection).
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import {
  readAutoRejoinSec,
  buildActiveResponse,
  buildFallbackResponse,
  type TournamentSummary,
} from './activeEngagement.js';
import type { UserTournamentStatus } from './userStatus.js';

const baseTournament: TournamentSummary = {
  _id: 't-42',
  name: 'Coupe',
  format: 'duo_steel',
  color: '#e6c46a',
  icon: '♦',
  gameConfig: { autoRejoinSec: 7 },
  bracketTree: { rounds: [{ roundIndex: 1, label: 'Quart' }, { roundIndex: 2, label: 'Demi' }] },
};

/* ── readAutoRejoinSec ────────────────────────────────────────────────────── */

describe('readAutoRejoinSec', () => {
  it('lit la valeur numérique du gameConfig', () => {
    expect(readAutoRejoinSec({ autoRejoinSec: 3 })).toBe(3);
    expect(readAutoRejoinSec({ autoRejoinSec: 0 })).toBe(0);
  });

  it('défaut 5 s quand la valeur est absente / null / non-finie', () => {
    expect(readAutoRejoinSec(null)).toBe(5);
    expect(readAutoRejoinSec(undefined)).toBe(5);
    expect(readAutoRejoinSec({})).toBe(5);
    expect(readAutoRejoinSec({ autoRejoinSec: 'abc' })).toBe(5);
    expect(readAutoRejoinSec({ autoRejoinSec: NaN })).toBe(5);
  });
});

/* ── buildActiveResponse ──────────────────────────────────────────────────── */

describe('buildActiveResponse', () => {
  it('state=playing : injecte myTableId depuis la carte matchId→tableId', () => {
    const status: UserTournamentStatus = {
      state: 'playing', roundIndex: 2, myMatchId: 'm-mine', startsAt: null, awaiting: [],
    };
    const out = buildActiveResponse(baseTournament, status, new Map([['m-mine', 'table-1']]));
    expect(out.tournamentId).toBe('t-42');
    expect(out.state).toBe('playing');
    expect(out.myMatchId).toBe('m-mine');
    expect(out.myTableId).toBe('table-1');
    expect(out.roundLabel).toBe('Demi');
    expect(out.autoRejoinSec).toBe(7);
  });

  it('state=waiting : enrichit chaque awaiting avec son tableId', () => {
    const status: UserTournamentStatus = {
      state: 'waiting', roundIndex: 1, myMatchId: null, startsAt: null,
      awaiting: [
        { matchId: 'm-other', roundIndex: 1, matchIndex: 0, slotAName: 'alice', slotBName: 'bob', scoreA: 500, scoreB: 400, manchesA: 1, manchesB: 0, winner: null },
        { matchId: null,      roundIndex: 1, matchIndex: 1, slotAName: 'TBD',   slotBName: 'TBD', scoreA: null, scoreB: null, manchesA: null, manchesB: null, winner: null },
      ],
    };
    const out = buildActiveResponse(baseTournament, status, new Map([['m-other', 'table-2']]));
    expect(out.awaiting[0].tableId).toBe('table-2');
    expect(out.awaiting[1].tableId).toBeNull();
    expect(out.roundLabel).toBe('Quart');
    expect(out.myTableId).toBeNull();
  });

  it('state=pending : propage startsAt pour le compte à rebours mobile', () => {
    const status: UserTournamentStatus = {
      state: 'pending', roundIndex: 2, myMatchId: null,
      startsAt: '2026-01-01T12:00:10Z', awaiting: [],
    };
    const out = buildActiveResponse(baseTournament, status, new Map());
    expect(out.state).toBe('pending');
    expect(out.startsAt).toBe('2026-01-01T12:00:10Z');
  });

  it('roundLabel = "" si l\'index de round n\'existe pas dans le bracket', () => {
    const status: UserTournamentStatus = {
      state: 'playing', roundIndex: 99, myMatchId: null, startsAt: null, awaiting: [],
    };
    expect(buildActiveResponse(baseTournament, status, new Map()).roundLabel).toBe('');
  });

  it('awaiting.matchId inconnu de la table → tableId = null (pas d\'exception)', () => {
    const status: UserTournamentStatus = {
      state: 'waiting', roundIndex: 1, myMatchId: null, startsAt: null,
      awaiting: [{ matchId: 'm-inconnu', roundIndex: 1, matchIndex: 0, slotAName: 'x', slotBName: 'y', scoreA: null, scoreB: null, manchesA: null, manchesB: null, winner: null }],
    };
    const out = buildActiveResponse(baseTournament, status, new Map());
    expect(out.awaiting[0].tableId).toBeNull();
  });

  it('bracketTree absent et roundIndex null → roundLabel = "" (jamais indéfini)', () => {
    const t: TournamentSummary = { ...baseTournament, bracketTree: null };
    const status: UserTournamentStatus = {
      state: 'playing', roundIndex: null, myMatchId: 'm', startsAt: null, awaiting: [],
    };
    const out = buildActiveResponse(t, status, new Map());
    expect(out.roundLabel).toBe('');
  });

  it('myMatchId présent MAIS aucune table trouvée → myTableId = null', () => {
    const status: UserTournamentStatus = {
      state: 'playing', roundIndex: 1, myMatchId: 'm-x', startsAt: null, awaiting: [],
    };
    const out = buildActiveResponse(baseTournament, status, new Map());
    expect(out.myMatchId).toBe('m-x');
    expect(out.myTableId).toBeNull();
  });

  it('gameConfig absent → autoRejoinSec retombe au défaut 5', () => {
    const t: TournamentSummary = { ...baseTournament, gameConfig: null };
    const status: UserTournamentStatus = {
      state: 'playing', roundIndex: 1, myMatchId: null, startsAt: null, awaiting: [],
    };
    expect(buildActiveResponse(t, status, new Map()).autoRejoinSec).toBe(5);
  });
});

/* ── buildFallbackResponse ────────────────────────────────────────────────── */

describe('buildFallbackResponse', () => {
  it('champion : renvoie l\'état, jamais de table à rejoindre', () => {
    const status: UserTournamentStatus = {
      state: 'champion', roundIndex: 2, myMatchId: null, startsAt: null, awaiting: [],
    };
    const out = buildFallbackResponse(baseTournament, status);
    expect(out.state).toBe('champion');
    expect(out.myMatchId).toBeNull();
    expect(out.myTableId).toBeNull();
    expect(out.awaiting).toEqual([]);
    expect(out.startsAt).toBeNull();
    expect(out.roundLabel).toBe('Demi');
    expect(out.autoRejoinSec).toBe(7);
  });

  it('eliminated : idem — l\'arbre reste consultable, rien à rejoindre', () => {
    const status: UserTournamentStatus = {
      state: 'eliminated', roundIndex: 1, myMatchId: null, startsAt: null, awaiting: [],
    };
    const out = buildFallbackResponse(baseTournament, status);
    expect(out.state).toBe('eliminated');
    expect(out.myTableId).toBeNull();
  });
});
