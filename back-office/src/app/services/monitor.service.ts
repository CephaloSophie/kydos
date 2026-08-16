import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { MonitorSnapshot } from '../models';

@Injectable({ providedIn: 'root' })
export class MonitorService {
  private readonly apiUrl = '/api/admin/monitor';

  constructor(private http: HttpClient) {}

  getSnapshot() {
    return this.http.get<MonitorSnapshot>(`${this.apiUrl}/snapshot`);
  }

  getActiveMatches() {
    return this.http.get<{ matches: any[] }>(`${this.apiUrl}/matches`);
  }
}
