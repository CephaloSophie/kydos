import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MonitorService } from '../../services/monitor.service';
import { AccountingService } from '../../services/accounting.service';
import { TournamentService } from '../../services/tournament.service';
import type { MonitorSnapshot, AccountingSummary, Tournament } from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Utilisateurs total</div>
        <div class="stat-value">{{ snapshot?.totalUsers ?? '...' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Joueurs connectés</div>
        <div class="stat-value">{{ snapshot?.activeUsers ?? '...' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Matchs en cours</div>
        <div class="stat-value">{{ snapshot?.activeMatches ?? '...' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tournois live</div>
        <div class="stat-value">{{ snapshot?.liveTournaments ?? '...' }}</div>
      </div>
    </div>

    @if (snapshot?.queueSizes) {
      <div class="card" style="margin-bottom: 24px">
        <div class="card-header"><h3>Files d'attente par format</h3></div>
        <div class="stat-grid">
          @for (entry of queueEntries; track entry[0]) {
            <div class="stat-card">
              <div class="stat-label">{{ formatLabel(entry[0]) }}</div>
              <div class="stat-value">{{ entry[1] }}</div>
            </div>
          }
          @empty {
            <div class="empty-state">Aucune file active</div>
          }
        </div>
      </div>
    }

    @if (summary) {
      <div class="card" style="margin-bottom: 24px">
        <div class="card-header"><h3>Economie - 30 derniers jours</h3></div>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Rake matchs</div>
            <div class="stat-value">{{ summary.totals.matchRake }} &#9830;</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Entries tournois</div>
            <div class="stat-value">{{ summary.totals.tournamentEntries }} &#9830;</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Prizes versés</div>
            <div class="stat-value" style="color: var(--danger)">{{ summary.totals.tournamentPrizes }} &#9830;</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Net kydos</div>
            <div class="stat-value" [style.color]="summary.totals.net >= 0 ? 'var(--success)' : 'var(--danger)'">
              {{ summary.totals.net >= 0 ? '+' : '' }}{{ summary.totals.net }} &#9830;
            </div>
          </div>
        </div>
        @if (summary.byDay.length) {
          <div class="chart-area">
            <div class="chart-bars">
              @for (day of summary.byDay.slice(-14); track day.date) {
                <div class="chart-bar-group">
                  <div class="chart-bar" [style.height.px]="barHeight(day.matchRake + day.tournamentNet)" [style.background]="(day.matchRake + day.tournamentNet) >= 0 ? 'var(--success)' : 'var(--danger)'" [title]="day.date + ': ' + (day.matchRake + day.tournamentNet) + ' ◆'"></div>
                  <div class="chart-label">{{ day.date.slice(5) }}</div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }

    @if (upcomingTournaments.length) {
      <div class="card">
        <div class="card-header">
          <h3>Tournois UPCOMING (prochains 48h)</h3>
          <a routerLink="/tournaments" class="btn btn-secondary btn-sm">Voir tous</a>
        </div>
        <div class="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Format</th>
                <th>Capacité</th>
                <th>Inscrits</th>
                <th>Début</th>
              </tr>
            </thead>
            <tbody>
              @for (t of upcomingTournaments; track t._id) {
                <tr>
                  <td><a [routerLink]="['/tournaments', t._id]">{{ t.name }}</a></td>
                  <td>{{ formatLabel(t.format) }}</td>
                  <td>{{ t.participants.length }}/{{ t.capacity }}</td>
                  <td>{{ t.participants.length }}</td>
                  <td>{{ t.startAt | date:'short' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    .chart-area { margin-top: 16px; }
    .chart-bars {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 120px;
      padding: 0 8px;
    }
    .chart-bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .chart-bar {
      width: 100%;
      max-width: 32px;
      min-height: 2px;
      border-radius: 2px 2px 0 0;
      transition: height 0.3s;
    }
    .chart-label { font-size: 9px; color: var(--text-muted); }
  `],
})
export class DashboardComponent implements OnInit {
  snapshot: MonitorSnapshot | null = null;
  summary: AccountingSummary | null = null;
  upcomingTournaments: Tournament[] = [];
  queueEntries: [string, number][] = [];

  constructor(
    private monitorService: MonitorService,
    private accountingService: AccountingService,
    private tournamentService: TournamentService,
  ) {}

  ngOnInit() {
    this.monitorService.getSnapshot().subscribe(s => {
      this.snapshot = s;
      this.queueEntries = Object.entries(s.queueSizes);
    });
    this.accountingService.getSummary().subscribe(s => this.summary = s);
    this.tournamentService.list('upcoming').subscribe(res => {
      const soon = Date.now() + 48 * 60 * 60 * 1000;
      this.upcomingTournaments = res.tournaments.filter(t => new Date(t.startAt).getTime() < soon);
    });
  }

  formatLabel(format: string): string {
    const labels: Record<string, string> = {
      duo_steel: 'Duo d\'acier',
      hybrid_alliance: 'Alliance hybride',
      royal_square: 'Carrée royale',
    };
    return labels[format] || format;
  }

  barHeight(value: number): number {
    if (!this.summary) return 0;
    const maxVal = Math.max(...this.summary.byDay.map(d => Math.abs(d.matchRake + d.tournamentNet)), 1);
    return Math.max(2, (Math.abs(value) / maxVal) * 100);
  }
}
