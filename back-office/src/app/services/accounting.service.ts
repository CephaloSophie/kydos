import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { AccountingSummary, HouseTransaction } from '../models';

@Injectable({ providedIn: 'root' })
export class AccountingService {
  private readonly apiUrl = '/api/admin/accounting';

  constructor(private http: HttpClient) {}

  getSummary(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<AccountingSummary>(`${this.apiUrl}/summary`, { params });
  }

  getTransactions(filters: { page?: number; limit?: number; kind?: string; from?: string; to?: string } = {}) {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    if (filters.kind) params = params.set('kind', filters.kind);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<{ transactions: HouseTransaction[]; total: number; page: number; pages: number }>(
      `${this.apiUrl}/transactions`, { params },
    );
  }
}
