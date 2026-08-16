import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [AsyncPipe],
  template: `
    <header class="header">
      <div class="header-title">Back Office</div>
      <div class="header-right">
        @if (auth.admin$ | async; as admin) {
          <span class="admin-name">{{ admin.username }}</span>
        }
        <button class="btn btn-secondary btn-sm" (click)="logout()">Déconnexion</button>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: var(--header-height);
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      flex-shrink: 0;
    }
    .header-title { font-weight: 600; color: var(--text-secondary); }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .admin-name { color: var(--primary); font-weight: 500; font-size: 13px; }
  `],
})
export class HeaderComponent {
  constructor(public auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
