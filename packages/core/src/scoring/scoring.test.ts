import { describe, it, expect } from 'vitest';
import { cardValue, roundPoints, scoreManche } from './index';
import { DEFAULT_RULES_CONFIG } from '../rules/RulesConfig';
import type { MancheScoreInput } from '../rules/RulesEngine';

const cfg = DEFAULT_RULES_CONFIG;
const card = (rank: string, suit: string) => ({ rank, suit }) as any;

/** Construit une entrée de donne. rawPoints = points de CARTES (152 au total, hors der/belote). */
const donne = (p: Partial<MancheScoreInput>): MancheScoreInput => ({
  takerTeam: 'A', contract: 90, isCapot: false, capotDeclared: false,
  trump: 'pique' as any, contre: 'none', rawPoints: { A: 0, B: 0 }, lastTrickTeam: 'A', beloteTeam: null,
  ...p,
});

describe('cardValue — bareme (confirme)', () => {
  it('atout + hors-atout', () => {
    const t = (r: string) => cardValue(card(r, 'pique'), 'pique' as any);
    const p = (r: string) => cardValue(card(r, 'coeur'), 'pique' as any);
    expect([t('V'), t('9'), t('A'), t('10'), t('R'), t('D'), t('8'), t('7')]).toEqual([20, 14, 11, 10, 4, 3, 0, 0]);
    expect([p('A'), p('10'), p('R'), p('D'), p('V'), p('9'), p('8'), p('7')]).toEqual([11, 10, 4, 3, 2, 0, 0, 0]);
  });
  it('total cartes = 152', () => {
    const ranks = ['V', '9', 'A', '10', 'R', 'D', '8', '7'];
    const trump = ranks.reduce((s, r) => s + cardValue(card(r, 'pique'), 'pique' as any), 0);
    const plain = ranks.reduce((s, r) => s + cardValue(card(r, 'coeur'), 'pique' as any), 0);
    expect(trump + plain * 3).toBe(152);
  });
});

describe('roundPoints — 5 qui monte, par equipe (casse = total 170)', () => {
  it('85+77 -> 170 ; 94+68 -> 160', () => {
    expect(roundPoints(85, 10) + roundPoints(77, 10)).toBe(170);
    expect(roundPoints(94, 10) + roundPoints(68, 10)).toBe(160);
  });
});

describe('SANS contre — contrat reussi (points arrondis)', () => {
  it('A=85 / B=77 -> A 90, B 80 (casse)', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 75, B: 77 }, lastTrickTeam: 'A' }), cfg);
    expect(r.A).toBe(90); expect(r.B).toBe(80); expect(r.contractMet).toBe(true);
  });
  it('A=94 / B=68 -> A 90, B 70', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 84, B: 68 }, lastTrickTeam: 'A' }), cfg);
    expect(r.A).toBe(90); expect(r.B).toBe(70);
  });
  it('contrat exact : 85 valide 90, 84 echoue', () => {
    expect(scoreManche(donne({ contract: 90, rawPoints: { A: 75, B: 77 }, lastTrickTeam: 'A' }), cfg).contractMet).toBe(true);
    expect(scoreManche(donne({ contract: 90, rawPoints: { A: 74, B: 78 }, lastTrickTeam: 'A' }), cfg).contractMet).toBe(false);
  });
});

describe('SANS contre — belote annoncee', () => {
  it('B annonce 90 + belote, B=65 / A=97 -> B 90, A 100', () => {
    const r = scoreManche(donne({ takerTeam: 'B', contract: 90, rawPoints: { A: 97, B: 55 }, lastTrickTeam: 'B', beloteTeam: 'B' }), cfg);
    expect(r.B).toBe(90); expect(r.A).toBe(100); expect(r.contractMet).toBe(true);
  });
  it('belote aide a valider (65 echoue, 65+20 reussit)', () => {
    expect(scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 55, B: 97 }, lastTrickTeam: 'A', beloteTeam: null }), cfg).contractMet).toBe(false);
    expect(scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 55, B: 97 }, lastTrickTeam: 'A', beloteTeam: 'A' }), cfg).contractMet).toBe(true);
  });
});

describe('SANS contre — contrat chute (defense 160 FIXE)', () => {
  it('A chute -> B 160, A 0', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 40, B: 112 }, lastTrickTeam: 'B' }), cfg);
    expect(r.contractMet).toBe(false); expect(r.B).toBe(160); expect(r.A).toBe(0);
  });
  it('chute : belote du preneur passe a la defense -> B 180', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 40, B: 112 }, lastTrickTeam: 'B', beloteTeam: 'A' }), cfg);
    expect(r.B).toBe(180); expect(r.A).toBe(0);
  });
});

describe('AVEC contre / surcontre (forfait FIXE)', () => {
  it('A contre par B, A reussit -> A 320, B 0', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 90, B: 62 }, lastTrickTeam: 'A', contre: 'contree' }), cfg);
    expect(r.A).toBe(320); expect(r.B).toBe(0);
  });
  it('A contre par B, A chute -> B 320, A 0', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 30, B: 122 }, lastTrickTeam: 'B', contre: 'contree' }), cfg);
    expect(r.B).toBe(320); expect(r.A).toBe(0);
  });
  it('cas tordu : A annonce + belote, B contre, A chute -> B 340, A 0', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 30, B: 122 }, lastTrickTeam: 'B', contre: 'contree', beloteTeam: 'A' }), cfg);
    expect(r.B).toBe(340); expect(r.A).toBe(0);
  });
  it('surcontre : gagnant 640 (+20 belote = 660)', () => {
    const r = scoreManche(donne({ takerTeam: 'A', contract: 90, rawPoints: { A: 90, B: 62 }, lastTrickTeam: 'A', contre: 'surcontree', beloteTeam: 'A' }), cfg);
    expect(r.A).toBe(660); expect(r.B).toBe(0);
  });
});
