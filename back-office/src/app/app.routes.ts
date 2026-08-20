import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'tournaments', loadComponent: () => import('./pages/tournaments/tournaments.component').then(m => m.TournamentsComponent) },
      { path: 'tournaments/new', loadComponent: () => import('./pages/tournament-form/tournament-form.component').then(m => m.TournamentFormComponent) },
      { path: 'tournaments/:id/edit', loadComponent: () => import('./pages/tournament-form/tournament-form.component').then(m => m.TournamentFormComponent) },
      { path: 'tournaments/:id', loadComponent: () => import('./pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent) },
      { path: 'users', loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent) },
      { path: 'users/:id', loadComponent: () => import('./pages/user-detail/user-detail.component').then(m => m.UserDetailComponent) },
      { path: 'promos', loadComponent: () => import('./pages/promos/promos.component').then(m => m.PromosComponent) },
      { path: 'accounting', loadComponent: () => import('./pages/accounting/accounting.component').then(m => m.AccountingComponent) },
      { path: 'monitor', loadComponent: () => import('./pages/monitor/monitor.component').then(m => m.MonitorComponent) },
      { path: 'match-formats', loadComponent: () => import('./pages/match-formats/match-formats.component').then(m => m.MatchFormatsComponent) },
      { path: 'match-formats/:id', loadComponent: () => import('./pages/match-format-detail/match-format-detail.component').then(m => m.MatchFormatDetailComponent) },
      { path: 'table-themes', loadComponent: () => import('./pages/table-themes/table-themes.component').then(m => m.TableThemesComponent) },
      { path: 'help', loadComponent: () => import('./pages/help/help.component').then(m => m.HelpComponent) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
