export interface UserSettings {
  responseTimeMs: number;
  maxPlayTimeMs: number;
  defaultManches: number;
}

export interface User {
  id: string;
  username: string;
  email?: string | null;
  team?: string | null;
  settings: UserSettings;
  rewardPoints: number;
  gamesPlayed?: number;
  level?: number;
}
