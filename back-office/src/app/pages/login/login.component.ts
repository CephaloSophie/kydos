import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">&#9830;</div>
        <h1>Kydos Back Office</h1>
        <p class="login-sub">Connectez-vous avec un compte admin</p>
        @if (error) {
          <div class="danger-box">{{ error }}</div>
        }
        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label>Nom d'utilisateur</label>
            <input type="text" [(ngModel)]="username" name="username" placeholder="admin" required autofocus />
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="********" required />
          </div>
          <button type="submit" class="btn btn-primary login-btn" [disabled]="loading">
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
    }
    .login-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 40px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    .login-logo { font-size: 48px; color: var(--primary); margin-bottom: 12px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .login-sub { color: var(--text-muted); font-size: 13px; margin-bottom: 24px; }
    form { text-align: left; }
    .login-btn { width: 100%; justify-content: center; margin-top: 8px; }
  `],
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.loading = true;
    this.error = '';
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Erreur de connexion';
      },
    });
  }
}
