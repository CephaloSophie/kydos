import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TournamentService } from '../../services/tournament.service';
import type { Tournament, TournamentStatus } from '../../models';

@Component({
  selector: 'app-tournament-detail',
  imports: [RouterLink, DatePipe],
  template: `
    @if (tournament) {
      <div class="page-header">
        <h1>{{ tournament.icon }} {{ tournament.name }}</h1>
        <div style="display: flex; gap: 8px">
          @if (tournament.status === 'draft') {
            <a [routerLink]="['/tournaments', tournament._id, 'edit']" class="btn btn-secondary">Editer</a>
            <button class="btn btn-success" (click)="publish()">Publier</button>
          }
          <a routerLink="/tournaments" class="btn btn-secondary">Retour</a>
        </div>
      </div>

      <div class="detail-grid">
        <div class="card">
          <div class="card-header"><h3>Informations</h3></div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Statut</span>
              <span class="badge" [class]="tournament.status">{{ statusLabel(tournament.status) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Format</span>
              <span>{{ formatLabel(tournament.format) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Capacité</span>
              <span>{{ tournament.participants.length }} / {{ tournament.capacity }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Buy-in</span>
              <span>{{ tournament.entryFee }} &#9830;</span>
            </div>
            <div class="info-item">
              <span class="info-label">Début</span>
              <span>{{ tournament.startAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Niveau min</span>
              <span>{{ tournament.minLevel }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Couleur</span>
              <span style="display: flex; align-items: center; gap: 6px">
                <span class="color-dot" [style.background]="tournament.color"></span>
                {{ tournament.color }}
              </span>
            </div>
          </div>
          @if (tournament.description) {
            <p style="margin-top: 12px; color: var(--text-secondary)">{{ tournament.description }}</p>
          }
        </div>

        <div class="card">
          <div class="card-header"><h3>Gains par position</h3></div>
          @if (tournament.prizesByPosition.length) {
            <table>
              <thead>
                <tr><th>Position</th><th>Prize &#9830;</th></tr>
              </thead>
              <tbody>
                @for (pp of tournament.prizesByPosition; track pp.position) {
                  <tr>
                    <td>{{ pp.position }}{{ pp.position === 1 ? 'er' : 'e' }}</td>
                    <td>{{ pp.prize }} &#9830;</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="empty-state">Aucun prix défini</p>
          }
        </div>
      </div>

      <div class="card" style="margin-top: 24px">
        <div class="card-header"><h3>Participants ({{ tournament.participants.length }})</h3></div>
        @if (tournament.participants.length) {
          <div class="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>User ID</th>
                  <th>Robots</th>
                  <th>Position finale</th>
                  <th>Prix</th>
                  <th>Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                @for (p of tournament.participants; track p.userId) {
                  <tr>
                    <td>{{ p.seedIndex ?? '-' }}</td>
                    <td><a [routerLink]="['/users', p.userId]">{{ p.userId }}</a></td>
                    <td>{{ p.robotIds.length }} robot(s)</td>
                    <td>{{ p.finalPosition ?? '-' }}</td>
                    <td>{{ p.prizeAwarded }} &#9830;</td>
                    <td>{{ p.joinedAt | date:'dd/MM HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty-state">Aucun participant</p>
        }
      </div>

      @if (tournament.bracketTree && tournament.bracketTree.rounds.length) {
        <div class="card" style="margin-top: 24px">
          <div class="card-header"><h3>Bracket</h3></div>
          <div class="bracket-container">
            @for (round of tournament.bracketTree.rounds; track round.roundIndex) {
              <div class="bracket-round">
                <div class="round-label">{{ round.label || 'Round ' + round.roundIndex }}</div>
                @for (match of round.matches; track match.matchIndex) {
                  <div class="bracket-match" [class.finished]="match.winner">
                    <div class="bracket-slot" [class.winner]="match.winner === 'A'">
                      <span>{{ match.slotA.displayName || 'TBD' }}</span>
                      <span class="bracket-score">{{ match.scoreA ?? '' }}</span>
                    </div>
                    <div class="bracket-slot" [class.winner]="match.winner === 'B'">
                      <span>{{ match.slotB.displayName || 'TBD' }}</span>
                      <span class="bracket-score">{{ match.scoreB ?? '' }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 2px; }
    .info-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
    .color-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
    .bracket-container { display: flex; gap: 24px; overflow-x: auto; padding: 16px 0; }
    .bracket-round { display: flex; flex-direction: column; gap: 12px; min-width: 180px; }
    .round-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-align: center; margin-bottom: 4px; }
    .bracket-match {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      &.finished { border-color: var(--primary); }
    }
    .bracket-slot {
      display: flex; justify-content: space-between; padding: 6px 10px; font-size: 12px;
      & + & { border-top: 1px solid var(--border); }
      &.winner { background: rgba(230, 196, 106, 0.1); font-weight: 600; }
    }
    .bracket-score { font-weight: 700; color: var(--primary); }
  `],
})
export class TournamentDetailComponent implements OnInit, OnDestroy {
  tournament: Tournament | null = null;
  private id = '';
  private poller: any = null;

  constructor(private route: ActivatedRoute, private tournamentService: TournamentService) {}

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    this.reload();
  }

  ngOnDestroy() {
    if (this.poller) clearInterval(this.poller);
  }

  private reload() {
    this.tournamentService.getById(this.id).subscribe(res => {
      this.tournament = res.tournament;
      // Rafraîchit en direct tant que le tournoi est EN COURS (scores live
      // recopiés dans le bracket par le serveur de jeu).
      if (this.tournament?.status === 'live' && !this.poller) {
        this.poller = setInterval(() => this.reload(), 4000);
      } else if (this.tournament?.status !== 'live' && this.poller) {
        clearInterval(this.poller);
        this.poller = null;
      }
    });
  }

  publish() {
    if (!this.tournament || !confirm('Publier ce tournoi ?')) return;
    this.tournamentService.publish(this.tournament._id).subscribe(() => {
      this.tournament!.status = 'upcoming';
    });
  }

  statusLabel(s: TournamentStatus): string {
    return { draft: 'Brouillon', upcoming: 'A venir', live: 'En cours', finished: 'Terminé', cancelled: 'Annulé' }[s] || s;
  }

  formatLabel(f: string): string {
    return { duo_steel: 'Duo d\'acier', hybrid_alliance: 'Alliance hybride', royal_square: 'Carrée royale' }[f] || f;
  }
}
