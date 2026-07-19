// ============================================================================
//  TableService — gestion des tables et des sièges, AVEC les invariants métier :
//   • un robot ne peut pas être assis dans deux tables à la fois ;
//   • deux robots d'un même propriétaire ne peuvent pas être adversaires
//     (sièges 0/2 = équipe A, 1/3 = équipe B) : uniquement même équipe.
//  Service pur (en mémoire), réutilisable par le serveur en ligne comme par un
//  front local. Le hsocket existant pourra déléguer ici.
// ============================================================================

import type { Id, RobotDTO } from './ports';

export type SeatKind = 'empty' | 'human' | 'robot';
export interface SeatOccupant {
  kind: SeatKind;
  name: string;
  userId?: Id;
  robotId?: Id;
  ownerId?: Id;
}
export interface Table {
  id: Id;
  ownerId: Id;
  visibility: 'public' | 'private' | 'team';
  clockwise: boolean;
  manches: 1 | 2 | 4;
  seats: SeatOccupant[]; // longueur 4
  started: boolean;
}

const empty = (): SeatOccupant => ({ kind: 'empty', name: '' });
const teamOfSeat = (i: number): 0 | 1 => (i % 2) as 0 | 1; // 0 = A (0,2) · 1 = B (1,3)

export class TableService {
  private readonly tables = new Map<Id, Table>();

  create(id: Id, ownerId: Id, opts: { visibility?: Table['visibility']; clockwise?: boolean; manches?: 1 | 2 | 4 } = {}): Table {
    const t: Table = {
      id, ownerId,
      visibility: opts.visibility ?? 'private',
      clockwise: opts.clockwise ?? false,
      manches: opts.manches ?? 2,
      seats: [empty(), empty(), empty(), empty()],
      started: false,
    };
    this.tables.set(id, t);
    return t;
  }

  get(id: Id): Table | undefined { return this.tables.get(id); }
  listOpenPublic(): Table[] { return [...this.tables.values()].filter((t) => t.visibility === 'public' && !t.started); }

  /** Robots assis dans N'IMPORTE quelle table (pour l'invariant « pas deux salles »). */
  private busyRobotIds(exceptTable?: Id): Set<Id> {
    const s = new Set<Id>();
    for (const t of this.tables.values()) {
      if (t.id === exceptTable) continue;
      for (const seat of t.seats) if (seat.robotId) s.add(seat.robotId);
    }
    return s;
  }

  takeHumanSeat(tableId: Id, seat: number, userId: Id, name: string): { ok: boolean; error?: string } {
    const t = this.tables.get(tableId);
    if (!t) return { ok: false, error: 'table introuvable' };
    if (t.seats[seat]?.kind !== 'empty') return { ok: false, error: 'siège occupé' };
    t.seats[seat] = { kind: 'human', userId, name };
    return { ok: true };
  }

  addRobot(tableId: Id, seat: number, robot: RobotDTO): { ok: boolean; error?: string } {
    const t = this.tables.get(tableId);
    if (!t) return { ok: false, error: 'table introuvable' };
    if (seat < 0 || seat > 3) return { ok: false, error: 'siège invalide' };
    if (t.seats[seat].kind !== 'empty') return { ok: false, error: 'siège occupé' };

    // Invariant 1 : pas dans deux tables.
    if (this.busyRobotIds(t.id).has(robot.id))
      return { ok: false, error: 'ce robot joue déjà dans une autre table' };

    // Invariant 2 : deux robots du même propriétaire jamais adversaires.
    const targetTeam = teamOfSeat(seat);
    const conflict = t.seats.some((s, i) => s.kind === 'robot' && s.ownerId === robot.ownerId && teamOfSeat(i) !== targetTeam);
    if (conflict) return { ok: false, error: 'vos robots ne peuvent jouer que dans la même équipe' };

    t.seats[seat] = { kind: 'robot', name: robot.name, robotId: robot.id, ownerId: robot.ownerId };
    return { ok: true };
  }

  isFull(tableId: Id): boolean {
    const t = this.tables.get(tableId);
    return !!t && t.seats.every((s) => s.kind !== 'empty');
  }
}
