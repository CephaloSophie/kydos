/* =============================================================================
 * BACK-OFFICE · pages/tournament-detail — Vue Détail d'un tournoi.
 * -----------------------------------------------------------------------------
 * Source unique de vérité : GET /admin/tournaments/:id renvoie un objet déjà
 * enrichi (usernames, noms de robots, état + tableId/gameId de chaque match du
 * bracket, gains par position). L'IHM ne fait AUCUNE résolution de nom : elle
 * consomme les champs tels quels, avec un tooltip natif exposant l'ObjectId
 * quand un admin en a besoin.
 *
 * Sections :
 *   1. En-tête (nom, statut, dates, actions).
 *   2. Informations générales.
 *   3. Paramètres de jeu (manches, score cible/label, thème, timers…).
 *   4. Économie (gains par position + net kydos).
 *   5. Participants (username, robots, position finale, prix).
 *   6. Bracket responsive (colonne par round, état par match : à venir,
 *      compte à rebours, EN DIRECT, terminé — score & vainqueur conservés).
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TournamentService } from '../../services/tournament.service';
import type { Tournament, TournamentStatus, BracketMatch, BracketMatchState, BracketSlot } from '../../models';

@Component({
  selector: 'app-tournament-detail',
  imports: [RouterLink, DatePipe, CommonModule],
  template: `
    @if (tournament) {
      <div class="page-header">
        <h1><span [style.color]="tournament.color">{{ tournament.icon }}</span> {{ tournament.name }}</h1>
        <div class="header-actions">
          <span class="badge" [class]="tournament.status">{{ statusLabel(tournament.status) }}</span>
          <button class="btn btn-secondary" (click)="reload()" title="Actualiser">↻ Actualiser</button>
          @if (tournament.status === 'draft') {
            <a [routerLink]="['/tournaments', tournament._id, 'edit']" class="btn btn-secondary">Éditer</a>
            <button class="btn btn-success" (click)="publish()">Publier</button>
          }
          <a routerLink="/tournaments" class="btn btn-secondary">Retour</a>
        </div>
      </div>

      <div class="detail-grid">
        <div class="card">
          <div class="card-header"><h3>Informations</h3></div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Format</span><span>{{ formatLabel(tournament.format) }}</span></div>
            <div class="info-item"><span class="info-label">Capacité</span><span>{{ tournament.participants.length }} / {{ tournament.capacity }}</span></div>
            <div class="info-item"><span class="info-label">Buy-in</span><span>{{ tournament.entryFee }} &#9830;</span></div>
            <div class="info-item"><span class="info-label">Début planifié</span><span>{{ tournament.startAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
            @if (tournament.startedAt) {
              <div class="info-item"><span class="info-label">Démarré le</span><span>{{ tournament.startedAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
            }
            @if (tournament.finishedAt) {
              <div class="info-item"><span class="info-label">Terminé le</span><span>{{ tournament.finishedAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
            }
            <div class="info-item"><span class="info-label">Niveau requis</span><span>{{ tournament.minLevel }}{{ tournament.maxLevel != null ? ' → ' + tournament.maxLevel : '+' }}</span></div>
            <div class="info-item"><span class="info-label">Couleur</span><span class="row-inline"><span class="color-dot" [style.background]="tournament.color"></span>{{ tournament.color }}</span></div>
          </div>
          @if (tournament.description) {
            <p class="description">{{ tournament.description }}</p>
          }
          @if (tournament.winners.length) {
            <div class="winners-row">
              <span class="info-label">Vainqueur(s)</span>
              @for (w of tournament.winners; track w.userId) {
                <a [routerLink]="['/users', w.userId]" class="chip chip-gold" [title]="w.userId">🏆 {{ w.username || w.userId }}</a>
              }
            </div>
          }
        </div>

        <div class="card">
          <div class="card-header"><h3>Paramètres de jeu</h3></div>
          @if (tournament.gameConfig; as g) {
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Nombre de manches</span><span>{{ g.manches }}</span></div>
              <div class="info-item"><span class="info-label">Score cible</span><span>{{ g.baseTarget }}</span></div>
              <div class="info-item"><span class="info-label">Score du label</span><span>{{ g.labelTarget }}</span></div>
              <div class="info-item"><span class="info-label">Score initial des enchères</span><span>{{ g.openingBidMin }}</span></div>
              <div class="info-item"><span class="info-label">Belote comptée</span><span>{{ g.countBelote ? 'Oui (+20)' : 'Non' }}</span></div>
              <div class="info-item"><span class="info-label">Sens du jeu</span><span>{{ g.clockwise ? 'Horaire' : 'Antihoraire' }}</span></div>
              <div class="info-item"><span class="info-label">Compte à rebours / round</span><span>{{ g.roundCountdownSec }} s</span></div>
              <div class="info-item"><span class="info-label">Redirection auto popup LIVE</span><span>{{ g.autoRejoinSec }} s</span></div>
              <div class="info-item"><span class="info-label">Timeout par tour</span><span>{{ g.turnTimeoutMs }} ms</span></div>
              <div class="info-item"><span class="info-label">Délai entre plis</span><span>{{ g.trickDelayMs }} ms</span></div>
              <div class="info-item"><span class="info-label">Vitesse</span><span>×{{ g.speed }}</span></div>
              <div class="info-item"><span class="info-label">Thème du tapis</span><span>{{ g.feltTheme }}</span></div>
              <div class="info-item"><span class="info-label">Spectateurs</span><span>{{ g.allowSpectators ? 'Autorisés' : 'Interdits' }}</span></div>
              <div class="info-item"><span class="info-label">Signal Réflexion</span><span>{{ g.signals.reflexion ? 'Activé' : 'Désactivé' }}</span></div>
              <div class="info-item"><span class="info-label">Signal Rappel de couleur</span><span>{{ g.signals.repeatSuit ? 'Activé' : 'Désactivé' }}</span></div>
            </div>
          } @else {
            <p class="empty-state">Aucun paramètre de jeu (valeurs par défaut).</p>
          }
        </div>
      </div>

      <div class="card mt-24">
        <div class="card-header"><h3>Gains par position</h3></div>
        @if (tournament.prizesByPosition.length) {
          <div class="overflow-x">
            <table>
              <thead>
                <tr><th>Position</th><th>Prix / joueur</th></tr>
              </thead>
              <tbody>
                @for (pp of tournament.prizesByPosition; track pp.position) {
                  <tr>
                    <td>{{ positionLabel(pp.position) }}</td>
                    <td>{{ pp.prize }} &#9830;</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty-state">Aucun prix défini.</p>
        }
      </div>

      <div class="card mt-24">
        <div class="card-header"><h3>Participants ({{ tournament.participants.length }} / {{ tournament.capacity }})</h3></div>
        @if (tournament.participants.length) {
          <div class="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>Joueur</th>
                  <th>Robots engagés</th>
                  <th>Position finale</th>
                  <th>Prix reçu</th>
                  <th>Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                @for (p of tournament.participants; track p.userId) {
                  <tr>
                    <td>{{ p.seedIndex != null ? p.seedIndex + 1 : '—' }}</td>
                    <td>
                      <a [routerLink]="['/users', p.userId]" [title]="'id: ' + p.userId">
                        {{ p.username || '(utilisateur supprimé)' }}
                      </a>
                    </td>
                    <td>
                      @for (r of p.robots; track r.id) {
                        <span class="chip" [title]="'id: ' + r.id">🤖 {{ r.name }}</span>
                      }
                      @if (p.substituteRobot) {
                        <span class="chip chip-alt" [title]="'Remplaçant · id: ' + p.substituteRobot.id">↺ {{ p.substituteRobot.name }}</span>
                      }
                      @if (!p.robots.length && !p.substituteRobot) { <span class="muted">—</span> }
                    </td>
                    <td>
                      @if (p.finalPosition != null) {
                        <span class="chip" [class.chip-gold]="p.finalPosition === 1">{{ positionLabel(p.finalPosition) }}</span>
                      } @else if (p.eliminatedAtRound != null) {
                        <span class="muted">éliminé R{{ p.eliminatedAtRound }}</span>
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                    <td>{{ p.prizeAwarded > 0 ? p.prizeAwarded + ' ◆' : '—' }}</td>
                    <td>{{ p.joinedAt | date:'dd/MM HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty-state">Aucun participant inscrit.</p>
        }
      </div>

      @if (tournament.bracketTree.rounds.length) {
        <div class="card mt-24">
          <div class="card-header"><h3>Bracket</h3></div>
          <div class="bracket-scroller">
            @for (round of tournament.bracketTree.rounds; track round.roundIndex) {
              <div class="bracket-round">
                <div class="round-label">{{ round.label }}</div>
                @for (m of round.matches; track m.matchIndex) {
                  <div class="bracket-match" [attr.data-state]="m.state">
                    <div class="bracket-slot" [class.winner]="m.winner === 'A'" [class.loser]="m.winner === 'B'">
                      <span class="slot-name" [title]="slotTooltip(m.slotA)">{{ slotName(m.slotA) }}</span>
                      <span class="slot-score">{{ manchesLabel(m, 'A') }}</span>
                    </div>
                    <div class="bracket-slot" [class.winner]="m.winner === 'B'" [class.loser]="m.winner === 'A'">
                      <span class="slot-name" [title]="slotTooltip(m.slotB)">{{ slotName(m.slotB) }}</span>
                      <span class="slot-score">{{ manchesLabel(m, 'B') }}</span>
                    </div>
                    <div class="bracket-meta">
                      <span class="state-tag" [attr.data-state]="m.state">{{ stateLabel(m.state) }}</span>
                      <!-- Points de la manche courante (secondaire), quand ils existent. -->
                      @if (m.scoreA != null || m.scoreB != null) {
                        <span class="muted" title="Points de la manche courante">pts {{ m.scoreA ?? 0 }}–{{ m.scoreB ?? 0 }}</span>
                      }
                      @if (m.state === 'countdown' && m.scheduledStartAt) {
                        <span class="muted">démarre {{ m.scheduledStartAt | date:'HH:mm:ss' }}</span>
                      }
                      @if (m.finishedAt) {
                        <span class="muted">fini {{ m.finishedAt | date:'HH:mm' }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    } @else if (loadError) {
      <div class="card"><p class="empty-state">{{ loadError }}</p></div>
    }
  `,
  styles: [`
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
    .mt-24 { margin-top: 24px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 2px; }
    .info-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
    .row-inline { display: inline-flex; align-items: center; gap: 6px; }
    .color-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; border: 1px solid var(--border); }
    .description { margin-top: 12px; color: var(--text-secondary); }
    .winners-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; margin: 2px 4px 2px 0; font-size: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 999px; }
    .chip-alt { background: rgba(230,196,106,0.08); border-color: rgba(230,196,106,0.35); }
    .chip-gold { background: rgba(230,196,106,0.15); border-color: rgba(230,196,106,0.6); color: var(--primary); font-weight: 600; }
    .muted { color: var(--text-muted); font-size: 12px; }
    .overflow-x { overflow-x: auto; }

    .bracket-scroller { display: flex; gap: 16px; overflow-x: auto; padding: 8px 0 4px; -webkit-overflow-scrolling: touch; }
    .bracket-round { display: flex; flex-direction: column; gap: 12px; min-width: 220px; }
    .round-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: var(--primary); text-align: center; text-transform: uppercase; }
    .bracket-match {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      display: flex; flex-direction: column;
    }
    .bracket-match[data-state="live"] { border-color: #e89644; box-shadow: 0 0 0 1px rgba(232,150,68,0.35); }
    .bracket-match[data-state="finished"] { border-color: var(--primary); }
    .bracket-match[data-state="countdown"] { border-style: dashed; }
    .bracket-slot {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 10px; font-size: 13px; gap: 8px;
    }
    .bracket-slot + .bracket-slot { border-top: 1px solid var(--border); }
    .bracket-slot.winner { background: rgba(230,196,106,0.10); font-weight: 700; }
    .bracket-slot.loser { opacity: 0.65; }
    .slot-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slot-score { font-family: ui-monospace, monospace; font-weight: 700; color: var(--primary); }
    .bracket-meta {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 10px; background: rgba(0,0,0,0.15); font-size: 11px;
    }
    .state-tag { text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; font-size: 10px; padding: 1px 6px; border-radius: 999px; }
    .state-tag[data-state="pending"]  { background: var(--bg-card); color: var(--text-muted); }
    .state-tag[data-state="ready"]    { background: rgba(230,196,106,0.15); color: var(--primary); }
    .state-tag[data-state="countdown"]{ background: rgba(232,150,68,0.15); color: #e89644; }
    .state-tag[data-state="live"]     { background: #e89644; color: #1a0f00; }
    .state-tag[data-state="finished"] { background: rgba(120,200,140,0.15); color: #78c88c; }
  `],
})
export class TournamentDetailComponent implements OnInit {
  tournament: Tournament | null = null;
  loadError: string | null = null;
  private id = '';

  constructor(private route: ActivatedRoute, private tournamentService: TournamentService) {}

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    this.reload();
  }

  reload() {
    this.loadError = null;
    this.tournamentService.getById(this.id).subscribe({
      next: (res) => { this.tournament = res.tournament as any; },
      error: (e) => { this.loadError = e?.error?.error || 'Chargement impossible.'; },
    });
  }

  publish() {
    if (!this.tournament || !confirm('Publier ce tournoi ?')) return;
    this.tournamentService.publish(this.tournament._id).subscribe(() => {
      this.tournament!.status = 'upcoming';
    });
  }

  statusLabel(s: TournamentStatus): string {
    return { draft: 'Brouillon', upcoming: 'À venir', live: 'En cours', finished: 'Terminé', cancelled: 'Annulé' }[s] || s;
  }

  formatLabel(f: string): string {
    return { duo_steel: 'Duo d\'acier', hybrid_alliance: 'Alliance hybride', royal_square: 'Carrée royale' }[f] || f;
  }

  positionLabel(n: number): string {
    if (n === 1) return '1er';
    return `${n}e`;
  }

  stateLabel(s: BracketMatchState): string {
    return { pending: 'À venir', ready: 'Prêt', countdown: 'Compte à rebours', live: 'En direct', finished: 'Terminé' }[s];
  }

  /** Nom affiché d'un slot : « joueur » ou « joueur & coéquipier » (royal). */
  slotName(s: BracketSlot): string {
    const a = s?.username || s?.displayName;
    const b = s?.username2 || s?.displayName2;
    if (!a && !b) return '—';
    return b ? `${a || '?'} & ${b}` : (a || '?');
  }

  /**
   * Manches gagnées d'un camp affichées dans l'arbre (score de progression
   * MONOTONE, best-of-N). Vide tant que le match n'a pas démarré / marqué de
   * manche, pour ne jamais afficher un « 0 » trompeur sur un match à venir.
   */
  manchesLabel(m: BracketMatch, side: 'A' | 'B'): string {
    const v = side === 'A' ? m.manchesA : m.manchesB;
    if (v != null) return String(v);
    // Repli : si le moteur n'a pas encore renseigné les manches mais qu'un
    // vainqueur existe (anciens tournois), on montre au moins le résultat.
    if (m.winner) return m.winner === side ? '✓' : '';
    return '';
  }

  /** Tooltip natif exposant les ObjectIds pour l'admin. */
  slotTooltip(s: BracketSlot): string {
    const parts: string[] = [];
    if (s?.userId) parts.push(`id: ${s.userId}`);
    if (s?.userId2) parts.push(`coéquipier: ${s.userId2}`);
    if (s?.seedIndex != null) parts.push(`seed: ${s.seedIndex + 1}`);
    return parts.join('  ·  ');
  }
}
