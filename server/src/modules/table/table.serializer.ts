/** Détermine l'équipe (A/B) d'un siège selon son index. */
export function teamOfSeatIndex(seatIndex: number): 'A' | 'B' {
  return seatIndex % 2 === 0 ? 'A' : 'B';
}

/** Crée les 4 sièges vides d'une nouvelle table. */
export function createEmptySeats(): any[] {
  return [0, 1, 2, 3].map((index) => ({ index, kind: 'empty', user: null, robot: null, ownerId: null, name: '' }));
}

/** Sérialise une table pour l'API/WebSocket. */
export function serializeTable(tableDocument: any) {
  return {
    id: String(tableDocument._id),
    status: tableDocument.status,
    kind: tableDocument.kind ?? 'hybride',
    ownerType: tableDocument.ownerType,
    owner: String(tableDocument.owner),
    team: tableDocument.team ? String(tableDocument.team) : null,
    visibility: tableDocument.visibility,
    config: tableDocument.config,
    startsAt: tableDocument.startsAt,
    seats: tableDocument.seats.map((seat: any) => ({
      index: seat.index,
      kind: seat.kind,
      name: seat.name,
      team: teamOfSeatIndex(seat.index),
      userId: seat.user ? String(seat.user) : null,
      robotId: seat.robot ? String(seat.robot) : null,
      ownerId: seat.ownerId ? String(seat.ownerId) : null,
    })),
  };
}
