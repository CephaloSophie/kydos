import { describe, it, expect } from 'vitest';
import {
  resolveScoreKydosConfig, buildLevelTable, levelForScore, computeScoreGain, diagnoseScoreKydos, DEFAULT_SCORE_KYDOS,
} from './scoreKydos.js';

const cfg = (over = {}) => resolveScoreKydosConfig({ ...DEFAULT_SCORE_KYDOS, ...over });

describe('scoreKydos (miroir back-office) — parité avec le cœur', () => {
  it('échelle par défaut : 500 puis +8 % (540, cumul 1040)', () => {
    const t = buildLevelTable(cfg());
    expect(t[0]).toMatchObject({ level: 1, increment: 500, cumulative: 0 });
    expect(t[1]).toMatchObject({ level: 2, increment: 540, cumulative: 500, cumulativeNext: 1040 });
  });

  it('niveau dérivé du score', () => {
    expect(levelForScore(cfg(), 499).level).toBe(1);
    expect(levelForScore(cfg(), 500).level).toBe(2);
    expect(levelForScore(cfg(), 1040).level).toBe(3);
  });

  it('gain = base × coefPartie × coefTypeJeu (+ bonus jetons)', () => {
    const g = computeScoreGain(cfg({ baseWinnerPlayer: 500, tokenScorePercent: 50 }), { isRobot: false, partieCoefficient: 2, gameTypeCoefficient: 1.5, tokensAccumulated: 100 });
    expect(g.total).toBe(500 * 2 * 1.5 + 50); // 1500 + 50
  });

  it('diagnostic : détecte une échelle non croissante (creux)', () => {
    const issues = diagnoseScoreKydos(cfg({ maxLevel: 4, levelOverrides: [{ level: 2, increment: 350 }] }));
    expect(issues.some((i) => i.code === 'levels-not-increasing')).toBe(true);
  });

  it('diagnostic : config par défaut saine', () => {
    expect(diagnoseScoreKydos(cfg())).toEqual([]);
  });
});
