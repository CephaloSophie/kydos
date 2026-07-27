// Tests unitaires — entité Robot + mapping curseurs↔personnalité moteur.
// Objectif : garantir que l'éditeur mobile NE CHANGE PAS le comportement des
// robots (le moteur voit toujours une personnalité 1-10 cohérente).
import { describe, expect, it } from 'vitest';
import {
  AVATAR_PRESETS, personalityLabel, personalityToStrategy, Robot, strategyToPersonality,
} from './Robot';

describe('personalityLabel — seuils EXACTS du design system', () => {
  it('classe > 66 aggro → Offensif', () => {
    expect(personalityLabel({ aggro: 70, risk: 0, bluff: 0, memoire: 0 })).toBe('Offensif');
    expect(personalityLabel({ aggro: 100, risk: 0, bluff: 100, memoire: 0 })).toBe('Offensif');
  });
  it('classe < 34 aggro → Prudent', () => {
    expect(personalityLabel({ aggro: 20, risk: 0, bluff: 90, memoire: 0 })).toBe('Prudent');
    expect(personalityLabel({ aggro: 0, risk: 0, bluff: 0, memoire: 0 })).toBe('Prudent');
  });
  it('bluff > 55 avec aggro moyen → Joueur', () => {
    expect(personalityLabel({ aggro: 50, risk: 0, bluff: 60, memoire: 0 })).toBe('Joueur');
    expect(personalityLabel({ aggro: 66, risk: 0, bluff: 56, memoire: 0 })).toBe('Joueur');
  });
  it('bluff ≤ 55 avec aggro moyen → Équilibré', () => {
    expect(personalityLabel({ aggro: 50, risk: 0, bluff: 40, memoire: 0 })).toBe('Équilibré');
    expect(personalityLabel({ aggro: 34, risk: 0, bluff: 55, memoire: 0 })).toBe('Équilibré');
  });
});

describe('strategyToPersonality — moteur (1-10)', () => {
  it('mappe correctement les 3 axes moteur (aggro, mémoire, risque)', () => {
    const p = strategyToPersonality({ aggro: 62, risk: 38, bluff: 45, memoire: 78 });
    expect(p).toEqual({ aggressiveness: 6, concentration: 8, velocity: 4 });
  });
  it('borne aux extrêmes de la plage 1-10', () => {
    expect(strategyToPersonality({ aggro: 0, risk: 100, bluff: 0, memoire: 100 }))
      .toEqual({ aggressiveness: 1, concentration: 10, velocity: 10 });
    expect(strategyToPersonality({ aggro: 100, risk: 0, bluff: 0, memoire: 0 }))
      .toEqual({ aggressiveness: 10, concentration: 1, velocity: 1 });
  });
  it('ignore complètement le bluff (présentationnel uniquement)', () => {
    const a = strategyToPersonality({ aggro: 50, risk: 50, bluff: 0, memoire: 50 });
    const b = strategyToPersonality({ aggro: 50, risk: 50, bluff: 100, memoire: 50 });
    expect(a).toEqual(b);
  });
});

describe('personalityToStrategy — reconstruction (robots web)', () => {
  it('reconstruit des curseurs cohérents à partir d\'une personnalité moteur', () => {
    const s = personalityToStrategy({ aggressiveness: 7, concentration: 5, velocity: 3 });
    expect(s.aggro).toBe(70);
    expect(s.memoire).toBe(50);
    expect(s.risk).toBe(30);
    expect(s.bluff).toBe(45); // valeur par défaut, purement présentationnelle
  });
  it('accepte un bluff custom lors de la reconstruction', () => {
    const s = personalityToStrategy({ aggressiveness: 5, concentration: 5, velocity: 5 }, 80);
    expect(s.bluff).toBe(80);
  });
});

describe('Robot — entité', () => {
  it('renseigne les valeurs par défaut (ELO 1000, statuts, victoires)', () => {
    const r = new Robot({ id: '1', name: 'Test', avatarId: 'atne', strategy: { aggro: 50, risk: 50, bluff: 50, memoire: 50 } });
    expect(r.elo).toBe(1000); expect(r.status).toBe('idle');
    expect(r.games).toBe(0); expect(r.wins).toBe(0);
  });
  it('récupère l\'accent depuis les presets d\'avatars', () => {
    const r = new Robot({ id: '1', name: 'A', avatarId: 'celi', strategy: { aggro: 50, risk: 50, bluff: 50, memoire: 50 } });
    expect(r.accent).toBe(AVATAR_PRESETS.find(a => a.id === 'celi')!.accent);
  });
  it('winRate = 0 quand aucune partie', () => {
    const r = new Robot({ id: '1', name: 'A', avatarId: 'atne', strategy: { aggro: 0, risk: 0, bluff: 0, memoire: 0 } });
    expect(r.winRate).toBe(0);
  });
  it('winRate arrondi correctement', () => {
    const r = new Robot({ id: '1', name: 'A', avatarId: 'atne', strategy: { aggro: 0, risk: 0, bluff: 0, memoire: 0 }, games: 100, wins: 76 });
    expect(r.winRate).toBe(76);
  });
  it('expose enginePersonality prête pour belote-core', () => {
    const r = new Robot({ id: '1', name: 'A', avatarId: 'atne', strategy: { aggro: 62, risk: 38, bluff: 45, memoire: 78 } });
    expect(r.enginePersonality).toEqual({ aggressiveness: 6, concentration: 8, velocity: 4 });
  });
  it('toJSON produit un objet sérialisable et rechargeable', () => {
    const r = new Robot({ id: '1', name: 'A', avatarId: 'atne', strategy: { aggro: 62, risk: 38, bluff: 45, memoire: 78 } });
    const json = r.toJSON();
    const r2 = new Robot(json);
    expect(r2.name).toBe(r.name);
    expect(r2.strategy).toEqual(r.strategy);
  });
});
