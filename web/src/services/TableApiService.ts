import { apiService } from './ApiService.js';
import type { GameTable } from '../models/GameTable.model.js';

/** Accès REST au domaine table (création, liste, sièges, cycle de vie). */
export class TableApiService {
  async create(visibility: string, forTeam: boolean, config: any): Promise<GameTable> {
    const result = await apiService.fetch<{ table: GameTable }>('/tables', {
      method: 'POST',
      body: JSON.stringify({ visibility, forTeam, config }),
    });
    return result.table;
  }

  async listOpen(): Promise<GameTable[]> {
    const result = await apiService.fetch<{ tables: GameTable[] }>('/tables');
    return result.tables;
  }

  async getById(tableId: string): Promise<GameTable> {
    const result = await apiService.fetch<{ table: GameTable }>(`/tables/${tableId}`);
    return result.table;
  }

  async changeSeat(tableId: string, seatIndex: number, assignment: string): Promise<GameTable> {
    const result = await apiService.fetch<{ table: GameTable }>(`/tables/${tableId}/seat`, {
      method: 'POST',
      body: JSON.stringify({ index: seatIndex, as: assignment }),
    });
    return result.table;
  }

  async leave(tableId: string): Promise<void> {
    await apiService.fetch(`/tables/${tableId}/leave`, { method: 'POST' });
  }
}

export const tableApiService = new TableApiService();
