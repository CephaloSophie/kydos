import { apiService } from './ApiService.js';

export interface CompetitionRobotRef { id: string; name: string | null; }
export interface Competition {
  id: string;
  owner: string;
  ownerRobots: CompetitionRobotRef[];
  challenger: string | null;
  challengerRobots: CompetitionRobotRef[];
  visibility: string;
  status: 'open' | 'running' | 'finished' | 'cancelled';
  config: { manches: number };
  winner: 'A' | 'B' | null;
  scoreTeamA: number;
  scoreTeamB: number;
  game: string | null;
  createdAt: string;
  finishedAt: string | null;
}

/** Accès REST au module compétition (robots vs robots, joué en backend). */
export class CompetitionApiService {
  async create(robotIds: string[], manches: number): Promise<Competition> {
    const result = await apiService.fetch<{ competition: Competition }>('/competitions', {
      method: 'POST', body: JSON.stringify({ robots: robotIds, manches }),
    });
    return result.competition;
  }
  async listOpen(): Promise<Competition[]> {
    return (await apiService.fetch<{ competitions: Competition[] }>('/competitions')).competitions;
  }
  async listMine(): Promise<Competition[]> {
    return (await apiService.fetch<{ competitions: Competition[] }>('/competitions/mine')).competitions;
  }
  async join(competitionId: string, robotIds: string[]): Promise<Competition> {
    const result = await apiService.fetch<{ competition: Competition }>(`/competitions/${competitionId}/join`, {
      method: 'POST', body: JSON.stringify({ robots: robotIds }),
    });
    return result.competition;
  }
  async cancel(competitionId: string): Promise<Competition> {
    return (await apiService.fetch<{ competition: Competition }>(`/competitions/${competitionId}/cancel`, { method: 'POST' })).competition;
  }
}

export const competitionApiService = new CompetitionApiService();
