import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">&#9830;</span>
        <span class="logo-text">Kydos Admin</span>
      </div>
      <nav>
        @for (item of navItems; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{exact: item.exact}">
            <span class="nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-primary);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .logo-icon { font-size: 24px; color: var(--primary); }
    .logo-text { font-size: 16px; font-weight: 700; color: var(--primary); }
    nav { padding: 12px 0; flex: 1; }
    nav a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s;
      &:hover {
        color: var(--text-primary);
        background: rgba(230, 196, 106, 0.05);
      }
      &.active {
        color: var(--primary);
        background: rgba(230, 196, 106, 0.08);
        border-right: 3px solid var(--primary);
      }
    }
    .nav-icon { font-size: 16px; width: 20px; text-align: center; }
  `],
})
export class SidebarComponent {
  navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/tournaments', label: 'Tournois', icon: '🏆', exact: false },
    { path: '/match-formats', label: 'Match rapide', icon: '⚡', exact: false },
    { path: '/users', label: 'Utilisateurs', icon: '👤', exact: false },
    { path: '/promos', label: 'Codes Promo', icon: '🎟️', exact: false },
    { path: '/accounting', label: 'Comptabilité', icon: '💰', exact: false },
    { path: '/monitor', label: 'Monitoring', icon: '📡', exact: false },
    { path: '/help', label: 'Guide', icon: '📖', exact: false },
  ];
}
