import { describe, it, expect } from 'vitest';
import { classifyGameCategory } from './scoreConfig.service.js';

describe('classifyGameCategory — catégorie de coefficient (pure)', () => {
  it('tournoi prioritaire sur tout le reste', () => {
    expect(classifyGameCategory({ tournament: true, competition: true, team: true, humanCount: 2 })).toBe('tournament');
  });

  it('compétition / équipe → team (hors tournoi)', () => {
    expect(classifyGameCategory({ competition: true, humanCount: 4 })).toBe('team');
    expect(classifyGameCategory({ team: true, humanCount: 4 })).toBe('team');
  });

  it('présence de robot (humains < 4) → robot', () => {
    expect(classifyGameCategory({ humanCount: 2 })).toBe('robot');
    expect(classifyGameCategory({ humanCount: 1 })).toBe('robot');
  });

  it('4 humains sans contexte → quick', () => {
    expect(classifyGameCategory({ humanCount: 4 })).toBe('quick');
  });
});
