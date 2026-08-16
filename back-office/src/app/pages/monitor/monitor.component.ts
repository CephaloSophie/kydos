import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MonitorService } from '../../services/monitor.service';
import type { MonitorSnapshot } from '../../models';

@Component({
  selector: 'app-monitor',
  imports: [DatePipe],
  template: `
    <div class="page-header">
      <h1>Monitoring</h1>
      <span style="color: var(--text-muted); font-size: 12px">
        Dernière mise à jour : {{ snapshot?.at | date:'HH:mm:ss' }}
        &middot; Auto-refresh {{ refreshing ? 'actif' : 'arrêté' }}
      </span>
    </div>

    @if (snapshot) {
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Utilisateurs total</div>
          <div class="stat-value">{{ snapshot.totalUsers }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Joueurs connectés</div>
          <div class="stat-value">{{ snapshot.activeUsers }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Matchs en cours</div>
          <div class="stat-value">{{ snapshot.activeMatches }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tournois live</div>
          <div class="stat-value">{{ snapshot.liveTournaments }}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px">
        <div class="card-header"><h3>Files d'attente</h3></div>
        <div class="stat-grid">
          @for (entry of queueEntries; track entry[0]) {
            <div class="stat-card">
              <div class="stat-label">{{ formatLabel(entry[0]) }}</div>
              <div class="stat-value">{{ entry[1] }} en attente</div>
            </div>
          } @empty {
            <div class="empty-state">Aucune file active</div>
          }
        </div>
      </div>
    }

    <div class="card">
      <div class="card-header">
        <h3>Matchs actifs</h3>
        <button class="btn btn-secondary btn-sm" (click)="refresh()">Rafraichir</button>
      </div>
      @if (activeMatches.length) {
        <div class="overflow-x">
          <table>
            <thead>
              <tr><th>ID</th><th>Format</th><th>Statut</th><th>Score</th><th>Tournoi</th><th>Créé le</th></tr>
            </thead>
            <tbody>
              @for (m of activeMatches; track m._id) {
                <tr>
                  <td style="font-family: monospace; font-size: 11px">{{ m._id }}</td>
                  <td>{{ formatLabel(m.format) }}</td>
                  <td><span class="badge" [class]="m.status === 'running' ? 'live' : 'upcoming'">{{ m.status }}</span></td>
                  <td>{{ m.scoreTeamA }} - {{ m.scoreTeamB }}</td>
                  <td>{{ m.tournament || '-' }}</td>
                  <td>{{ m.queuedAt | date:'HH:mm:ss' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="empty-state">Aucun match actif</p>
      }
    </div>
  `,
})
export class MonitorComponent implements OnInit, OnDestroy {
  snapshot: MonitorSnapshot | null = null;
  activeMatches: any[] = [];
  queueEntries: [string, number][] = [];
  refreshing = true;
  private intervalId: any;

  constructor(private monitorService: MonitorService) {}

  ngOnInit() {
    this.refresh();
    this.intervalId = setInterval(() => this.refresh(), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  refresh() {
    this.monitorService.getSnapshot().subscribe(s => {
      this.snapshot = s;
      this.queueEntries = Object.entries(s.queueSizes);
    });
    this.monitorService.getActiveMatches().subscribe(res => {
      this.activeMatches = res.matches;
    });
  }

  formatLabel(format: string): string {
    return { duo_steel: 'Duo d\'acier', hybrid_alliance: 'Alliance hybride', royal_square: 'Carrée royale' }[format] || format;
  }
}
