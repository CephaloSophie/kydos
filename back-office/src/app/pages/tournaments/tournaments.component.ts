import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TournamentService } from '../../services/tournament.service';
import type { Tournament, TournamentStatus } from '../../models';

@Component({
  selector: 'app-tournaments',
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <h1>Tournois</h1>
      <a routerLink="/tournaments/new" class="btn btn-primary">+ Nouveau tournoi</a>
    </div>

    <div class="filters">
      <select [(ngModel)]="statusFilter" (ngModelChange)="loadTournaments()">
        <option value="all">Tous les statuts</option>
        <option value="draft">Brouillon</option>
        <option value="upcoming">A venir</option>
        <option value="live">En cours</option>
        <option value="finished">Terminé</option>
        <option value="cancelled">Annulé</option>
      </select>
    </div>

    <div class="card">
      <div class="overflow-x">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Format</th>
              <th>Capacité</th>
              <th>Buy-in</th>
              <th>Statut</th>
              <th>Début</th>
              <th>Inscrits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (t of tournaments; track t._id) {
              <tr>
                <td>
                  <a [routerLink]="['/tournaments', t._id]" style="font-weight: 600">
                    {{ t.icon }} {{ t.name }}
                  </a>
                </td>
                <td>{{ formatLabel(t.format) }}</td>
                <td>{{ t.capacity }}</td>
                <td>{{ t.entryFee }} &#9830;</td>
                <td><span class="badge" [class]="t.status">{{ statusLabel(t.status) }}</span></td>
                <td>{{ t.startAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ t.participants.length }}/{{ t.capacity }}</td>
                <td class="actions">
                  @if (t.status === 'draft') {
                    <a [routerLink]="['/tournaments', t._id, 'edit']" class="btn btn-secondary btn-sm">Editer</a>
                    <button class="btn btn-success btn-sm" (click)="publish(t)">Publier</button>
                    <button class="btn btn-danger btn-sm" (click)="deleteTournament(t)">Supprimer</button>
                  }
                  @if (t.status === 'upcoming') {
                    <button class="btn btn-danger btn-sm" (click)="cancel(t)">Annuler</button>
                  }
                  <a [routerLink]="['/tournaments', t._id]" class="btn btn-secondary btn-sm">Voir</a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty-state">Aucun tournoi</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .actions { display: flex; gap: 4px; flex-wrap: wrap; }
  `],
})
export class TournamentsComponent implements OnInit {
  tournaments: Tournament[] = [];
  statusFilter = 'all';

  constructor(private tournamentService: TournamentService) {}

  ngOnInit() { this.loadTournaments(); }

  loadTournaments() {
    this.tournamentService.list(this.statusFilter).subscribe(res => this.tournaments = res.tournaments);
  }

  formatLabel(f: string): string {
    return { duo_steel: 'Duo d\'acier', hybrid_alliance: 'Alliance hybride', royal_square: 'Carrée royale' }[f] || f;
  }

  statusLabel(s: TournamentStatus): string {
    return { draft: 'Brouillon', upcoming: 'A venir', live: 'En cours', finished: 'Terminé', cancelled: 'Annulé' }[s] || s;
  }

  publish(t: Tournament) {
    if (!confirm(`Publier "${t.name}" ?`)) return;
    this.tournamentService.publish(t._id).subscribe(() => this.loadTournaments());
  }

  cancel(t: Tournament) {
    if (!confirm(`Annuler "${t.name}" ? Tous les participants seront remboursés.`)) return;
    this.tournamentService.cancel(t._id).subscribe(() => this.loadTournaments());
  }

  deleteTournament(t: Tournament) {
    if (!confirm(`Supprimer "${t.name}" ?`)) return;
    this.tournamentService.delete(t._id).subscribe(() => this.loadTournaments());
  }
}
