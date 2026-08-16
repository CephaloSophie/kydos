import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UserService } from '../../services/user.service';
import type { User, Robot, Game } from '../../models';

@Component({
  selector: 'app-user-detail',
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    @if (user) {
      <div class="page-header">
        <h1>{{ user.username }}</h1>
        <a routerLink="/users" class="btn btn-secondary">Retour</a>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Solde</div>
          <div class="stat-value">{{ user.wallet.tokens }} &#9830;</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Parties jouées</div>
          <div class="stat-value">{{ user.gamesPlayed }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">VIP</div>
          <div class="stat-value">{{ isVip ? 'Oui' : 'Non' }}</div>
          @if (isVip) {
            <div class="stat-sub">Expire le {{ user.vipExpiresAt | date:'dd/MM/yyyy' }}</div>
          }
        </div>
        <div class="stat-card">
          <div class="stat-label">Inscrit le</div>
          <div class="stat-value" style="font-size: 16px">{{ user.createdAt | date:'dd/MM/yyyy' }}</div>
        </div>
      </div>

      <div class="detail-row">
        <div class="card">
          <div class="card-header"><h3>Actions admin</h3></div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: end">
            <div class="form-group" style="margin: 0">
              <label>Crédit manuel (&#9830;)</label>
              <input type="number" [(ngModel)]="creditAmount" min="1" style="width: 120px" />
            </div>
            <div class="form-group" style="margin: 0">
              <label>Raison</label>
              <input type="text" [(ngModel)]="creditReason" style="width: 200px" placeholder="Bug, geste commercial..." />
            </div>
            <button class="btn btn-success" (click)="doCredit()" [disabled]="!creditAmount">Créditer</button>
            <button class="btn btn-danger" (click)="doBan()">Bannir</button>
          </div>
          @if (creditSuccess) {
            <div class="success-box" style="margin-top: 12px">Crédité ! Nouveau solde : {{ creditSuccess }} &#9830;</div>
          }
        </div>
      </div>

      <div class="detail-row" style="margin-top: 24px">
        <div class="card">
          <div class="card-header"><h3>Robots ({{ robots.length }})</h3></div>
          @if (robots.length) {
            <div class="overflow-x">
              <table>
                <thead><tr><th>Nom</th><th>Avatar</th><th>Aggro</th><th>Risk</th><th>Bluff</th><th>Mémoire</th></tr></thead>
                <tbody>
                  @for (r of robots; track r._id) {
                    <tr>
                      <td>{{ r.name }}</td>
                      <td>{{ r.mobile.avatarId }}</td>
                      <td>{{ r.mobile.strategy.aggro }}</td>
                      <td>{{ r.mobile.strategy.risk }}</td>
                      <td>{{ r.mobile.strategy.bluff }}</td>
                      <td>{{ r.mobile.strategy.memoire }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="empty-state">Aucun robot</p>
          }
        </div>
      </div>

      <div class="detail-row" style="margin-top: 24px">
        <div class="card">
          <div class="card-header"><h3>Dernières parties</h3></div>
          @if (recentGames.length) {
            <div class="overflow-x">
              <table>
                <thead><tr><th>Mode</th><th>Type</th><th>Gagnant</th><th>Score</th><th>Date</th></tr></thead>
                <tbody>
                  @for (g of recentGames; track g._id) {
                    <tr>
                      <td>{{ g.mode }}</td>
                      <td>{{ g.kind }}</td>
                      <td>{{ g.winner ?? 'En cours' }}</td>
                      <td>{{ g.finalScoreA }} - {{ g.finalScoreB }}</td>
                      <td>{{ g.finishedAt | date:'dd/MM HH:mm' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="empty-state">Aucune partie récente</p>
          }
        </div>
      </div>

      @if (user.wallet.transactions?.length) {
        <div class="detail-row" style="margin-top: 24px">
          <div class="card">
            <div class="card-header"><h3>Historique wallet</h3></div>
            <div class="overflow-x">
              <table>
                <thead><tr><th>Type</th><th>Montant</th><th>Solde</th><th>Date</th></tr></thead>
                <tbody>
                  @for (tx of user.wallet.transactions?.slice(-20)?.reverse(); track $index) {
                    <tr>
                      <td>{{ tx.kind }}</td>
                      <td [style.color]="tx.amount >= 0 ? 'var(--success)' : 'var(--danger)'">
                        {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount }}
                      </td>
                      <td>{{ tx.balance }} &#9830;</td>
                      <td>{{ tx.at | date:'dd/MM HH:mm' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .detail-row { }
  `],
})
export class UserDetailComponent implements OnInit {
  user: User | null = null;
  robots: Robot[] = [];
  recentGames: Game[] = [];
  isVip = false;
  creditAmount = 0;
  creditReason = '';
  creditSuccess: number | null = null;

  constructor(private route: ActivatedRoute, private userService: UserService) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.userService.getById(id).subscribe(res => {
      this.user = res.user;
      this.robots = res.robots;
      this.recentGames = res.recentGames;
      this.isVip = !!this.user.vipExpiresAt && new Date(this.user.vipExpiresAt).getTime() > Date.now();
    });
  }

  doCredit() {
    if (!this.user || !this.creditAmount) return;
    this.userService.credit(this.user._id, this.creditAmount, this.creditReason).subscribe(res => {
      this.creditSuccess = res.newBalance;
      this.user!.wallet.tokens = res.newBalance;
      this.creditAmount = 0;
      this.creditReason = '';
    });
  }

  doBan() {
    if (!this.user || !confirm(`Bannir "${this.user.username}" ?`)) return;
    this.userService.ban(this.user._id).subscribe(() => {
      alert('Utilisateur banni');
    });
  }
}
