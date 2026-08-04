// Tests for the seed normalization — covers the historical malformed cases
// that broke the initial `npm run seed`: description-as-array, complexity as
// "1 h" string, acceptance as a plain string, numeric `type` field.
import { describe, it, expect } from 'vitest';
import { normalizeTask } from './normalize';

describe('normalizeTask — cas réels rencontrés dans tasks.json', () => {
  it('KB-390 : complexity="1 h" + description=Array + acceptance=string → tout coerce proprement', () => {
    const raw = {
      id: 'KB-390',
      title: 'Retrait des 2 bannières de la table',
      area: 'mobile', module: 'table',
      type: 2, status: 'tested', priority: 'P2',
      complexity: '1 h',
      description: ['Plus de bannières dans la table', 'Table plus haute'],
      acceptance: 'adBanner supprimé + felt inset bas 8px.',
      duration: 'Suppression des deux emplacements pub…',
      instructions: [],
      history: [{ at: '2026-08-02T10:00:00.000Z', status: 'tested', by: 'claude', note: 'P2' }],
    };
    const { normalized: t, warnings } = normalizeTask(raw);

    // description : array → string jointe
    expect(t.description).toBe('Plus de bannières dans la table. Table plus haute');
    // complexity : "1 h" → 1
    expect(t.complexity).toBe(1);
    // acceptance : string → tableau à un élément
    expect(t.acceptance).toEqual(['adBanner supprimé + felt inset bas 8px.']);
    // type : nombre → string
    expect(t.type).toBe('2');
    // warnings signalés
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes('description'))).toBe(true);
    expect(warnings.some((w) => w.includes('complexity'))).toBe(true);
    expect(warnings.some((w) => w.includes('acceptance'))).toBe(true);
  });

  it('tâche saine : aucune correction, aucun warning', () => {
    const raw = {
      id: 'KB-411', title: 'Fabrique unifiée buildLocalGame',
      area: 'mobile', module: 'robots', type: 'feature',
      status: 'tested', priority: 'P1', version: '12.3.0',
      complexity: 5, duration: '4 h',
      description: 'Fabrique pure côté mobile',
      instructions: [], acceptance: ['Un robot avec le même algoSpec joue à l\'identique'],
      history: [{ at: '2026-08-03T22:30:00.000Z', status: 'tested', by: 'claude' }],
    };
    const { normalized: t, warnings } = normalizeTask(raw);
    expect(warnings).toEqual([]);
    expect(t.complexity).toBe(5);
    expect(t.description).toBe('Fabrique pure côté mobile');
    expect(t.acceptance).toHaveLength(1);
    expect(t.type).toBe('feature');
  });
});

describe('normalizeTask — cas dégénérés (défensif)', () => {
  it('id manquant → throw explicite', () => {
    expect(() => normalizeTask({ title: 't' })).toThrow(/id manquant/);
  });
  it('title manquant → throw explicite', () => {
    expect(() => normalizeTask({ id: 'X' })).toThrow(/title manquant/);
  });

  it('complexity absente → 0 (défaut sain)', () => {
    const { normalized: t } = normalizeTask({ id: 'X', title: 'T' });
    expect(t.complexity).toBe(0);
  });

  it('complexity "3.5 j" → 3.5 (extrait le premier nombre)', () => {
    const { normalized: t, warnings } = normalizeTask({ id: 'X', title: 'T', complexity: '3.5 j' });
    expect(t.complexity).toBe(3.5);
    expect(warnings.some((w) => w.includes('3.5'))).toBe(true);
  });

  it('description objet aléatoire → JSON.stringify (aucune perte)', () => {
    const { normalized: t, warnings } = normalizeTask({ id: 'X', title: 'T', description: { foo: 42 } });
    expect(t.description).toBe('{"foo":42}');
    expect(warnings.some((w) => w.includes('description'))).toBe(true);
  });

  it('instructions/acceptance null → tableaux vides (jamais null en DB)', () => {
    const { normalized: t } = normalizeTask({ id: 'X', title: 'T', instructions: null, acceptance: null });
    expect(t.instructions).toEqual([]);
    expect(t.acceptance).toEqual([]);
  });

  it('history absente → tableau vide', () => {
    const { normalized: t } = normalizeTask({ id: 'X', title: 'T' });
    expect(t.history).toEqual([]);
  });

  it('history mal formée → filtre les entrées invalides sans planter', () => {
    const { normalized: t } = normalizeTask({
      id: 'X', title: 'T',
      history: [{ by: 'ameur' }, 'bogus', null, { by: 'hamido', status: 'tested' }],
    });
    expect(t.history).toHaveLength(2);
    expect(t.history[0]?.by).toBe('ameur');
    expect(t.history[1]?.by).toBe('hamido');
  });

  it('status/priority absents → défauts « pending / P2 »', () => {
    const { normalized: t } = normalizeTask({ id: 'X', title: 'T' });
    expect(t.status).toBe('pending');
    expect(t.priority).toBe('P2');
  });

  it('description tableau à un seul élément → string simple', () => {
    const { normalized: t } = normalizeTask({ id: 'X', title: 'T', description: ['seule ligne'] });
    expect(t.description).toBe('seule ligne');
  });
});
