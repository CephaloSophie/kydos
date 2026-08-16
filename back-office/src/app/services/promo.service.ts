import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { PromoCode } from '../models';

@Injectable({ providedIn: 'root' })
export class PromoService {
  private readonly apiUrl = '/api/admin/promos';

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<{ promos: PromoCode[] }>(this.apiUrl);
  }

  create(data: { code: string; tokens: number; expiresAt: string; maxRedemptions?: number; label?: string }) {
    return this.http.post<{ promo: PromoCode }>(this.apiUrl, data);
  }

  update(id: string, data: Partial<PromoCode>) {
    return this.http.put<{ promo: PromoCode }>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/${id}`);
  }
}
