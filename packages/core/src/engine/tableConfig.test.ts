// ============================================================================
//  tableConfig.test — Résolution des options de table en objets moteur.
//  Tests PURS : on nourrit les options, on vérifie RulesConfig + PartieConfig.
// ============================================================================
import { describe, it, expect } from 'vitest';
import {
  resolveRulesConfig,
  resolvePartieConfig,
  resolveTableConfig,
  BELOTE_BONUS,
} from './tableConfig';
import { DEFAULT_RULES_CONFIG } from '../rules/RulesConfig';
import { DEFAULT_PARTIE } from './types';
import { GameEngine } from './GameEngine';
import { ContreeRules } from '../rules/ContreeRules';

import type { EnginePlayer } from './types';

const players: EnginePlayer[] = [
  { seat: 0, name: 'A0', type: 'robot' },
  { seat: 1, name: 'B0', type: 'robot' },
  { seat: 2, name: 'A1', type: 'robot' },
  { seat: 3, name: 'B1', type: 'robot' },
];

/* ── resolveRulesConfig ───────────────────────────────────────────────────── */

describe('resolveRulesConfig', () => {
  it('sans option → barème par défaut', () => {
    expect(resolveRulesConfig()).toEqual(DEFAULT_RULES_CONFIG);
    expect(resolveRulesConfig({})).toEqual(DEFAULT_RULES_CONFIG);
  });

  it('openingBidMin devient minBid (score initial des enchères)', () => {
    expect(resolveRulesConfig({ openingBidMin: 80 }).minBid).toBe(80);
    expect(resolveRulesConfig({ openingBidMin: 110 }).minBid).toBe(110);
  });

  it('minBid par défaut (90) si openingBidMin non fourni ou non numérique', () => {
    expect(resolveRulesConfig({}).minBid).toBe(90);
    expect(resolveRulesConfig({ openingBidMin: undefined }).minBid).toBe(90);
    expect(resolveRulesConfig({ openingBidMin: NaN }).minBid).toBe(90);
  });

  it('countBelote=false → prime de belote ramenée à 0', () => {
    expect(resolveRulesConfig({ countBelote: false }).beloteBonus).toBe(0);
  });

  it('countBelote=true / absent → prime de belote standard (20)', () => {
    expect(resolveRulesConfig({ countBelote: true }).beloteBonus).toBe(BELOTE_BONUS);
    expect(resolveRulesConfig({}).beloteBonus).toBe(BELOTE_BONUS);
  });

  it('objectifs de manche configurables, sinon défaut', () => {
    const r = resolveRulesConfig({ baseTarget: 1000, labelTarget: 3000 });
    expect(r.baseTarget).toBe(1000);
    expect(r.labelTarget).toBe(3000);
    expect(resolveRulesConfig({ baseTarget: 0 }).baseTarget).toBe(1500); // 0 rejeté
  });
});

/* ── resolvePartieConfig ──────────────────────────────────────────────────── */

describe('resolvePartieConfig', () => {
  it('sens du jeu : clockwise=true respecté, sinon antihoraire', () => {
    expect(resolvePartieConfig({ clockwise: true }).clockwise).toBe(true);
    expect(resolvePartieConfig({ clockwise: false }).clockwise).toBe(false);
    expect(resolvePartieConfig({}).clockwise).toBe(false);
  });

  it('manches validées sur l\'enum [1,2,4]', () => {
    expect(resolvePartieConfig({ manches: 4 }).manches).toBe(4);
    expect(resolvePartieConfig({ manches: 3 }).manches).toBe(DEFAULT_PARTIE.manches);
  });

  it('timers et local configurables', () => {
    const p = resolvePartieConfig({ responseTimeMs: 0, maxPlayTimeMs: 0, local: true });
    expect(p.responseTimeMs).toBe(0);
    expect(p.maxPlayTimeMs).toBe(0);
    expect(p.local).toBe(true);
  });

  it('signaux : true par défaut, false explicite respecté', () => {
    expect(resolvePartieConfig({}).signals).toEqual({ reflexion: true, repeatSuit: true });
    expect(resolvePartieConfig({ signals: { reflexion: false } }).signals)
      .toEqual({ reflexion: false, repeatSuit: true });
  });
});

/* ── resolveTableConfig (composition) ─────────────────────────────────────── */

describe('resolveTableConfig', () => {
  it('retourne les deux objets cohérents (baseTarget aligné)', () => {
    const { rulesConfig, partieConfig } = resolveTableConfig({ baseTarget: 1200, clockwise: true, countBelote: false, openingBidMin: 100 });
    expect(rulesConfig.baseTarget).toBe(1200);
    expect(partieConfig.baseTarget).toBe(1200);
    expect(rulesConfig.minBid).toBe(100);
    expect(rulesConfig.beloteBonus).toBe(0);
    expect(partieConfig.clockwise).toBe(true);
  });

  it('alimente réellement le moteur : minBid appliqué à l\'enchère minimale', () => {
    const { rulesConfig, partieConfig } = resolveTableConfig({ openingBidMin: 100 });
    const engine = new GameEngine(players, partieConfig, new ContreeRules(rulesConfig));
    // La 1ʳᵉ enchère possible doit partir de 100 (et non 90).
    expect(engine.view()).toBeTruthy();
    expect((engine as any).rules.minBid).toBe(100);
  });

  it('alimente réellement le moteur : sens horaire reflété dans la vue', () => {
    const { rulesConfig, partieConfig } = resolveTableConfig({ clockwise: true });
    const engine = new GameEngine(players, partieConfig, new ContreeRules(rulesConfig));
    expect(engine.view().clockwise).toBe(true);
  });

  it('countBelote=false retire RÉELLEMENT les 20 points de belote du score de manche', () => {
    // Contrat 90 LARGEMENT tenu par A (le contrat est validé avec OU sans
    // belote → seuls les 20 points de belote font la différence).
    const input = {
      takerTeam: 'A' as const, contract: 90, isCapot: false, capotDeclared: false,
      trump: 'pique' as const, contre: 'none' as const,
      rawPoints: { A: 140, B: 12 }, lastTrickTeam: 'A' as const, beloteTeam: 'A' as const,
    };
    const withBelote = new ContreeRules(resolveRulesConfig({ countBelote: true })).scoreManche(input);
    const withoutBelote = new ContreeRules(resolveRulesConfig({ countBelote: false })).scoreManche(input);
    // La belote (+20) doit être présente dans un cas et absente dans l'autre.
    expect(withBelote.A - withoutBelote.A).toBe(20);
  });
});
