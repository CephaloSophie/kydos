/* =============================================================================
 * GAME · gameQuery.filter.test.ts — Tests unitaires du filtre mode (v14.14).
 * -----------------------------------------------------------------------------
 * On teste la validation d'entrée : le service n'applique le filtre que si
 * la valeur appartient à l'enum {local, online, competition}. Toute autre
 * valeur (y compris chaîne vide, valeur douteuse, injection tentée) est
 * silencieusement ignorée — comportement voulu pour éviter les 400 sur des
 * inputs client bizarres.
 *
 * Ce fichier ne charge pas Mongoose ni la base : on stubbe GameModel pour
 * capter le filter passé à find/countDocuments.
 * ========================================================================== */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Stubs Mongoose : capturent le filter passé, renvoient chaîne vide.
const captured: { filter: any; kind: any; mode: any } = { filter: null, kind: null, mode: null };

vi.mock('./game.model.js', () => ({
  GameModel: {
    countDocuments: vi.fn(async (f: any) => { captured.filter = f; return 0; }),
    find: vi.fn(() => ({
      sort: () => ({
        skip: () => ({ limit: () => ({ lean: async () => [] }) }),
      }),
    })),
  },
}));
vi.mock('../user/user.model.js', () => ({ UserModel: { findById: () => ({ select: async () => ({ team: null }) }) } }));
vi.mock('../robot/robot.model.js', () => ({ RobotModel: { find: () => ({ select: () => ({ lean: async () => [] }) }) } }));

let gameQueryService: any;
beforeEach(async () => {
  captured.filter = null;
  ({ gameQueryService } = await import('./gameQuery.service.js'));
});

describe('gameQuery · filtre mode v14.11', () => {
  it('accepte mode=competition', async () => {
    await gameQueryService.listForUser('507f1f77bcf86cd799439011', 'mine', { mode: 'competition' });
    // Le filter doit contenir un $and avec la contrainte mode.
    const modeFilter = JSON.stringify(captured.filter);
    expect(modeFilter).toContain('competition');
  });

  it('accepte mode=online', async () => {
    await gameQueryService.listForUser('507f1f77bcf86cd799439011', 'mine', { mode: 'online' });
    expect(JSON.stringify(captured.filter)).toContain('online');
  });

  it('accepte mode=local', async () => {
    await gameQueryService.listForUser('507f1f77bcf86cd799439011', 'mine', { mode: 'local' });
    expect(JSON.stringify(captured.filter)).toContain('local');
  });

  it('ignore une valeur invalide (mode=all)', async () => {
    await gameQueryService.listForUser('507f1f77bcf86cd799439011', 'mine', { mode: 'all' });
    // 'all' n'est pas dans l'enum → pas de filter mode ajouté.
    expect(JSON.stringify(captured.filter)).not.toContain('"mode"');
  });

  it('ignore une injection tentée (mode=<script>)', async () => {
    await gameQueryService.listForUser('507f1f77bcf86cd799439011', 'mine', { mode: '<script>' as any });
    expect(JSON.stringify(captured.filter)).not.toContain('<script>');
  });

  it('kind + mode se cumulent', async () => {
    await gameQueryService.listForUser('507f1f77bcf86cd799439011', 'mine', { mode: 'competition', kind: 'hybride' });
    const s = JSON.stringify(captured.filter);
    expect(s).toContain('competition');
    expect(s).toContain('hybride');
  });
});
