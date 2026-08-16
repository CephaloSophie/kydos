import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { User, Robot, Game } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = '/api/admin/users';

  constructor(private http: HttpClient) {}

  list(filters: { page?: number; limit?: number; search?: string; vip?: string; active?: string; minBalance?: number } = {}) {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.vip) params = params.set('vip', filters.vip);
    if (filters.active) params = params.set('active', filters.active);
    if (filters.minBalance) params = params.set('minBalance', filters.minBalance);
    return this.http.get<{ users: User[]; total: number; page: number; pages: number }>(this.apiUrl, { params });
  }

  getById(id: string) {
    return this.http.get<{ user: User; robots: Robot[]; recentGames: Game[] }>(`${this.apiUrl}/${id}`);
  }

  credit(id: string, amount: number, reason: string) {
    return this.http.post<{ newBalance: number }>(`${this.apiUrl}/${id}/credit`, { amount, reason });
  }

  ban(id: string) {
    return this.http.post<{ banned: boolean }>(`${this.apiUrl}/${id}/ban`, {});
  }
}
