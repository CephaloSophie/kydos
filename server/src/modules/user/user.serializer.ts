import { computePlayerLevel } from '../../shared/levels.js';

export function serializePublicUser(userDocument: any) {
  return {
    id: String(userDocument._id),
    username: userDocument.username,
    email: userDocument.email ?? null,
    team: userDocument.team ? String(userDocument.team) : null,
    settings: userDocument.settings,
    rewardPoints: userDocument.rewardPoints,
    gamesPlayed: userDocument.gamesPlayed ?? 0,
    level: computePlayerLevel(userDocument.rewardPoints),
    /** Session active — pilote la bannière « Partie en cours » et le verrou (SPEC §3.8). */
    activeSession: userDocument.activeSession ? String(userDocument.activeSession) : null,
    favoriteRobot: userDocument.favoriteRobot ? String(userDocument.favoriteRobot) : null,
  };
}
