import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SCORE_KYDOS,
  resolveScoreKydosConfig,
  gameTypeKey,
  gameTypeCoefficient,
  computeScoreGain,
  buildLevelTable,
  levelForScore,
  diagnoseScoreKydos,
  type ScoreKydosConfig,
} from './scoreKydos';

const cfg = (over: Partial<ScoreKydosConfig> = {}): ScoreKydosConfig => resolveScoreKydosConfig({ ...DEFAULT_SCORE_KYDOS, ...over });

describe('scoreKydos — clés de type de jeu', () => {
  it('compose la clé `${category}:${kind}`', () => {
    expect(gameTypeKey('tournament', 'royal')).toBe('tournament:royal');
    expect(gameTypeKey('quick', 'acier')).toBe('quick:acier');
  });
  it('coefficient défaut 1 si absent, invalide ou négatif', () => {
    const c = cfg({ gameTypeCoefficients: { 'tournament:royal': 2, 'quick:acier': -1, 'team:hybride': NaN as unknown as number } });
    expect(gameTypeCoefficient(c, 'tournament', 'royal')).toBe(2);
    expect(gameTypeCoefficient(c, 'quick', 'acier')).toBe(1);     // négatif → 1
    expect(gameTypeCoefficient(c, 'team', 'hybride')).toBe(1);     // NaN → 1
    expect(gameTypeCoefficient(c, 'robot', 'acier')).toBe(1);      // absent → 1
  });
});

describe('scoreKydos — barème de gain', () => {
  it('gain = base × coefPartie × coefTypeJeu (défaut : base seule)', () => {
    const c = cfg();
    expect(computeScoreGain(c, { isRobot: false, partieCoefficient: 1, gameTypeCoefficient: 1 }).total).toBe(500);
    expect(computeScoreGain(c, { isRobot: true, partieCoefficient: 1, gameTypeCoefficient: 1 }).total).toBe(500);
  });

  it('applique les deux coefficients multiplicativement', () => {
    const c = cfg({ baseWinnerPlayer: 500 });
    expect(computeScoreGain(c, { isRobot: false, partieCoefficient: 2, gameTypeCoefficient: 3 }).total).toBe(3000);
  });

  it('distingue base joueur et base robot', () => {
    const c = cfg({ baseWinnerPlayer: 500, baseWinnerRobot: 200 });
    expect(computeScoreGain(c, { isRobot: false, partieCoefficient: 1, gameTypeCoefficient: 1 }).total).toBe(500);
    expect(computeScoreGain(c, { isRobot: true, partieCoefficient: 1, gameTypeCoefficient: 1 }).total).toBe(200);
  });

  it('ajoute le bonus jetons (tokenScorePercent % des jetons accumulés)', () => {
    const c = cfg({ baseWinnerPlayer: 500, tokenScorePercent: 50 });
    const g = computeScoreGain(c, { isRobot: false, partieCoefficient: 1, gameTypeCoefficient: 1, tokensAccumulated: 300 });
    expect(g.tokenBonus).toBe(150);   // 50 % de 300
    expect(g.total).toBe(650);
  });

  it('borne le gain à ≥ 0 et neutralise les coefficients invalides', () => {
    const c = cfg({ baseWinnerPlayer: 500 });
    // coefficient négatif → traité comme 1 (jamais de gain négatif).
    expect(computeScoreGain(c, { isRobot: false, partieCoefficient: -5, gameTypeCoefficient: 1 }).total).toBe(500);
    // jetons négatifs ignorés.
    const c2 = cfg({ tokenScorePercent: 50 });
    expect(computeScoreGain(c2, { isRobot: false, partieCoefficient: 1, gameTypeCoefficient: 1, tokensAccumulated: -100 }).tokenBonus).toBe(0);
  });
});

describe('scoreKydos — échelle de niveaux', () => {
  it('reproduit l’exemple de la spécification (500, +8 %)', () => {
    const table = buildLevelTable(cfg());
    expect(table[0]).toMatchObject({ level: 1, increment: 500, cumulative: 0, cumulativeNext: 500 });
    expect(table[1]).toMatchObject({ level: 2, increment: 540, cumulative: 500, cumulativeNext: 1040 });
    expect(table[2].increment).toBe(583); // round(540 × 1.08) = 583
    expect(table[2].cumulative).toBe(1040);
  });

  it('respecte maxLevel', () => {
    expect(buildLevelTable(cfg({ maxLevel: 10 })).length).toBe(10);
    expect(buildLevelTable(cfg({ maxLevel: 200 })).length).toBe(200);
  });

  it('applique les surcharges manuelles en recalculant les cumuls', () => {
    const table = buildLevelTable(cfg({ maxLevel: 4, levelOverrides: [{ level: 2, increment: 1000 }] }));
    expect(table[1]).toMatchObject({ level: 2, increment: 1000, overridden: true, cumulative: 500, cumulativeNext: 1500 });
    expect(table[2].cumulative).toBe(1500); // le cumul suivant intègre la surcharge
  });

  it('levelForScore : niveau 1 tant que score < premier seuil', () => {
    const c = cfg();
    expect(levelForScore(c, 0)).toMatchObject({ level: 1, pointsInLevel: 0, pointsToNext: 500 });
    expect(levelForScore(c, 499)).toMatchObject({ level: 1, pointsInLevel: 499, pointsToNext: 1 });
  });

  it('levelForScore : bascule au niveau 2 à 500, niveau 3 à 1040', () => {
    const c = cfg();
    expect(levelForScore(c, 500).level).toBe(2);
    expect(levelForScore(c, 500).pointsInLevel).toBe(0);
    expect(levelForScore(c, 1039).level).toBe(2);
    expect(levelForScore(c, 1040).level).toBe(3);
  });

  it('levelForScore : points dans le niveau + points restants cohérents', () => {
    const c = cfg();
    const p = levelForScore(c, 800); // niveau 2 (500..1040), 300 dans le niveau
    expect(p.level).toBe(2);
    expect(p.pointsInLevel).toBe(300);
    expect(p.pointsToNext).toBe(240); // 1040 − 800
    expect(p.levelSpan).toBe(540);
    expect(p.ratio).toBeCloseTo(300 / 540, 5);
  });

  it('levelForScore : plafonne au niveau max (pointsToNext = 0, ratio = 1)', () => {
    const c = cfg({ maxLevel: 3 });
    const p = levelForScore(c, 10_000_000);
    expect(p.level).toBe(3);
    expect(p.pointsToNext).toBe(0);
    expect(p.ratio).toBe(1);
  });
});

describe('scoreKydos — diagnostic', () => {
  it('configuration par défaut : aucune anomalie', () => {
    expect(diagnoseScoreKydos(cfg())).toEqual([]);
  });

  it('détecte un score de base négatif', () => {
    const codes = diagnoseScoreKydos(cfg({ baseWinnerPlayer: -10 })).map((i) => i.code);
    expect(codes).toContain('base-player-negative');
  });

  it('détecte un seuil initial nul/négatif', () => {
    expect(diagnoseScoreKydos(cfg({ firstLevelThreshold: 0 })).some((i) => i.code === 'first-threshold-invalid')).toBe(true);
  });

  it('détecte un pourcentage de passage négatif (erreur) et 0 % (info)', () => {
    expect(diagnoseScoreKydos(cfg({ levelUpPercent: -5 })).some((i) => i.severity === 'error' && i.code === 'levelup-negative')).toBe(true);
    expect(diagnoseScoreKydos(cfg({ levelUpPercent: 0 })).some((i) => i.code === 'levelup-zero')).toBe(true);
  });

  it('signale un pourcentage irréaliste (avertissement)', () => {
    expect(diagnoseScoreKydos(cfg({ levelUpPercent: 250 })).some((i) => i.severity === 'warning' && i.code === 'levelup-unrealistic')).toBe(true);
  });

  it('détecte des coefficients négatifs / à zéro', () => {
    const issues = diagnoseScoreKydos(cfg({ gameTypeCoefficients: { 'tournament:royal': -2, 'quick:acier': 0 } }));
    expect(issues.some((i) => i.code === 'coef-negative')).toBe(true);
    expect(issues.some((i) => i.code === 'coef-zero')).toBe(true);
  });

  it('détecte une échelle NON croissante (cas produit : creux via surcharge)', () => {
    // niveau 1 = 500, niveau 2 surchargé à 350 < 500 → incohérence.
    const issues = diagnoseScoreKydos(cfg({ maxLevel: 4, levelOverrides: [{ level: 2, increment: 350 }] }));
    expect(issues.some((i) => i.code === 'levels-not-increasing')).toBe(true);
  });

  it('détecte une surcharge hors bornes et une surcharge invalide', () => {
    const issues = diagnoseScoreKydos(cfg({ maxLevel: 3, levelOverrides: [{ level: 99, increment: 100 }, { level: 2, increment: -5 }] }));
    expect(issues.some((i) => i.code === 'override-out-of-range')).toBe(true);
    expect(issues.some((i) => i.code === 'override-invalid')).toBe(true);
  });

  it('trie les erreurs avant les avertissements', () => {
    const issues = diagnoseScoreKydos(cfg({ baseWinnerPlayer: -1, levelUpPercent: 250 }));
    const firstWarningIdx = issues.findIndex((i) => i.severity === 'warning');
    const lastErrorIdx = issues.map((i) => i.severity).lastIndexOf('error');
    expect(lastErrorIdx).toBeLessThan(firstWarningIdx);
  });
});

describe('scoreKydos — resolveScoreKydosConfig', () => {
  it('comble les champs manquants avec les défauts', () => {
    const c = resolveScoreKydosConfig({ baseWinnerPlayer: 999 });
    expect(c.baseWinnerPlayer).toBe(999);
    expect(c.firstLevelThreshold).toBe(DEFAULT_SCORE_KYDOS.firstLevelThreshold);
    expect(c.gameTypeCoefficients).toEqual({});
    expect(c.levelOverrides).toEqual([]);
  });
  it('tolère null/undefined', () => {
    expect(resolveScoreKydosConfig(null)).toEqual(DEFAULT_SCORE_KYDOS);
    expect(resolveScoreKydosConfig(undefined)).toEqual(DEFAULT_SCORE_KYDOS);
  });
});
