import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Tournament, EconomicsResult } from '../models';

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly apiUrl = '/api/admin/tournaments';

  constructor(private http: HttpClient) {}

  list(status?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ tournaments: Tournament[] }>(this.apiUrl, { params });
  }

  getById(id: string) {
    return this.http.get<{ tournament: Tournament }>(`${this.apiUrl}/${id}`);
  }

  create(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  update(id: string, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  publish(id: string) {
    return this.http.post<{ published: boolean }>(`${this.apiUrl}/${id}/publish`, {});
  }

  cancel(id: string) {
    return this.http.post<{ cancelled: boolean; refundedCount: number }>(`${this.apiUrl}/${id}/cancel`, {});
  }

  delete(id: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/${id}`);
  }

  previewEconomics(capacity: number, entryFee: number, prizesByPosition: { position: number; prize: number }[]) {
    return this.http.post<{ economics: EconomicsResult }>(`${this.apiUrl}/preview-economics`, {
      capacity, entryFee, prizesByPosition,
    });
  }
}
