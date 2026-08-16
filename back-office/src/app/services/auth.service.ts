import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import type { Admin, LoginResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/admin/auth';
  private tokenKey = 'admin_token';
  private adminSubject = new BehaviorSubject<Admin | null>(null);
  admin$ = this.adminSubject.asObservable();

  constructor(private http: HttpClient) {
    const stored = localStorage.getItem('admin_user');
    if (stored) {
      this.adminSubject.next(JSON.parse(stored));
    }
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.token);
        localStorage.setItem('admin_user', JSON.stringify(res.admin));
        this.adminSubject.next(res.admin);
      }),
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('admin_user');
    this.adminSubject.next(null);
  }
}
