import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AccountingService } from '../../services/accounting.service';
import type { AccountingSummary, HouseTransaction } from '../../models';

@Component({
  selector: 'app-accounting',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <h1>Comptabilité</h1>
    </div>

    <div class="filters">
      <div class="form-group" style="margin: 0">
        <label>Du</label>
        <input type="date" [(ngModel)]="fromDate" />
      </div>
      <div class="form-group" style="margin: 0">
        <label>Au</label>
        <input type="date" [(ngModel)]="toDate" />
      </div>
      <button class="btn btn-primary btn-sm" (click)="loadSummary()" style="align-self: end">Appliquer</button>
    </div>

    @if (summary) {
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
        <div class="card" style="margin-bottom: 24px">
          <div class="card-header">
            <h3>Recettes vs Paiements par jour</h3>
          </div>
          <div class="chart-table overflow-x">
            <table>
              <thead>
                <tr><th>Date</th><th>Rake matchs</th><th>Net tournois</th><th>Total</th></tr>
              </thead>
              <tbody>
                @for (day of summary.byDay; track day.date) {
                  <tr>
                    <td>{{ day.date }}</td>
                    <td>{{ day.matchRake }} &#9830;</td>
                    <td [style.color]="day.tournamentNet >= 0 ? 'var(--success)' : 'var(--danger)'">
                      {{ day.tournamentNet >= 0 ? '+' : '' }}{{ day.tournamentNet }} &#9830;
                    </td>
                    <td [style.color]="(day.matchRake + day.tournamentNet) >= 0 ? 'var(--success)' : 'var(--danger)'" style="font-weight: 600">
                      {{ (day.matchRake + day.tournamentNet) >= 0 ? '+' : '' }}{{ day.matchRake + day.tournamentNet }} &#9830;
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }

    <div class="card">
      <div class="card-header">
        <h3>Transactions</h3>
        <div style="display: flex; gap: 8px">
          <select [(ngModel)]="kindFilter" (ngModelChange)="loadTransactions()">
            <option value="">Tout type</option>
            <option value="match_rake">Match rake</option>
            <option value="tournament_entry">Tournament entry</option>
            <option value="tournament_prize">Tournament prize</option>
          </select>
          <button class="btn btn-secondary btn-sm" (click)="exportCsv()">Export CSV</button>
        </div>
      </div>
      <div class="overflow-x">
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Montant</th><th>Note</th><th>Match/Tournoi</th></tr>
          </thead>
          <tbody>
            @for (tx of transactions; track tx._id) {
              <tr>
                <td>{{ tx.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td><span class="badge" [class]="kindClass(tx.kind)">{{ tx.kind }}</span></td>
                <td [style.color]="tx.amount >= 0 ? 'var(--success)' : 'var(--danger)'" style="font-weight: 600">
                  {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount }} &#9830;
                </td>
                <td>{{ tx.note || '-' }}</td>
                <td>{{ tx.matchId || tx.tournamentId || '-' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-state">Aucune transaction</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (txPages > 1) {
        <div class="pagination">
          <button class="btn btn-secondary btn-sm" [disabled]="txPage <= 1" (click)="goTxPage(txPage - 1)">Préc.</button>
          <span>Page {{ txPage }} / {{ txPages }}</span>
          <button class="btn btn-secondary btn-sm" [disabled]="txPage >= txPages" (click)="goTxPage(txPage + 1)">Suiv.</button>
        </div>
      }
    </div>
  `,
})
export class AccountingComponent implements OnInit {
  summary: AccountingSummary | null = null;
  transactions: HouseTransaction[] = [];
  txPage = 1;
  txPages = 1;
  kindFilter = '';
  fromDate = '';
  toDate = '';

  constructor(private accountingService: AccountingService) {}

  ngOnInit() {
    const now = new Date();
    this.toDate = now.toISOString().slice(0, 10);
    this.fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    this.loadSummary();
    this.loadTransactions();
  }

  loadSummary() {
    this.accountingService.getSummary(this.fromDate, this.toDate).subscribe(s => this.summary = s);
  }

  loadTransactions() {
    this.accountingService.getTransactions({
      page: this.txPage,
      kind: this.kindFilter || undefined,
      from: this.fromDate || undefined,
      to: this.toDate || undefined,
    }).subscribe(res => {
      this.transactions = res.transactions;
      this.txPages = res.pages;
    });
  }

  goTxPage(p: number) {
    this.txPage = p;
    this.loadTransactions();
  }

  kindClass(kind: string): string {
    return { match_rake: 'live', tournament_entry: 'upcoming', tournament_prize: 'draft' }[kind] || '';
  }

  exportCsv() {
    const header = 'Date,Type,Montant,Note,MatchId,TournamentId\n';
    const rows = this.transactions.map(tx =>
      `${tx.createdAt},${tx.kind},${tx.amount},"${tx.note}",${tx.matchId || ''},${tx.tournamentId || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kydos-transactions-${this.fromDate}-${this.toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
