/* =============================================================================
 * BACK-OFFICE · pages/match-format-detail — Visualisation d'une variante.
 * -----------------------------------------------------------------------------
 * Affiche, pour une variante de MATCH RAPIDE : des chiffres/pourcentages utiles
 * (parties jouées, taux de victoire, scores/manches/durée moyens, capot/belote,
 * réussite des contrats) et l'HISTORIQUE des parties jouées sous cette variante.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatchFormatService, type VariantAnalytics } from '../../services/match-format.service';

@Component({
  selector: 'app-match-format-detail',
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <div class="page-header">
      <h1>{{ data?.variant?.icon }} {{ data?.variant?.label || 'Variante' }}</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" (click)="load()" title="Actualiser">↻ Actualiser</button>
        <a routerLink="/match-formats" class="btn btn-secondary">Retour</a>
      </div>
    </div>

    @if (loading) { <p class="empty-state">Chargement…</p> }
    @else if (error) { <div class="card"><p class="empty-state">{{ error }}</p></div> }
    @else if (data) {
      <div class="card">
        <div class="card-header"><h3>Résumé — {{ formatLabel(data.variant.format) }}</h3></div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Mise / joueur</span><span>{{ data.variant.buyInPerPlayer }} ◆</span></div>
          <div class="info-item"><span class="info-label">Gain / vainqueur</span><span>{{ data.variant.prizePerWinner }} ◆</span></div>
          <div class="info-item"><span class="info-label">Net kydos / match</span><span [style.color]="(data.variant.houseNet ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)'">{{ data.variant.houseNet }} ◆</span></div>
          <div class="info-item"><span class="info-label">Niveau requis</span><span>{{ data.variant.minLevel }}{{ data.variant.maxLevel != null ? ' → ' + data.variant.maxLevel : '+' }}</span></div>
          <div class="info-item"><span class="info-label">Manches / score</span><span>{{ data.variant.manches }} · {{ data.variant.baseTarget }}</span></div>
          <div class="info-item"><span class="info-label">État</span><span>{{ data.variant.active ? 'Proposé' : 'Masqué' }}</span></div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-val">{{ data.stats.gamesPlayed }}</div><div class="stat-lbl">Parties jouées</div></div>
        <div class="stat-card">
          <div class="stat-val">{{ data.stats.winRateA }}% / {{ data.stats.winRateB }}%</div>
          <div class="stat-lbl">Victoires équipe A / B</div>
          <div class="bar"><span class="bar-a" [style.width.%]="data.stats.winRateA"></span><span class="bar-b" [style.width.%]="data.stats.winRateB"></span></div>
        </div>
        <div class="stat-card"><div class="stat-val">{{ data.stats.avgScoreA }} – {{ data.stats.avgScoreB }}</div><div class="stat-lbl">Score moyen (A – B)</div></div>
        <div class="stat-card"><div class="stat-val">{{ data.stats.avgManches }}</div><div class="stat-lbl">Manches / partie</div></div>
        <div class="stat-card"><div class="stat-val">{{ data.stats.avgDonnes }}</div><div class="stat-lbl">Donnes / partie</div></div>
        <div class="stat-card"><div class="stat-val">{{ fmtDuration(data.stats.avgDurationMs) }}</div><div class="stat-lbl">Durée moyenne</div></div>
        <div class="stat-card"><div class="stat-val">{{ data.stats.contractSuccessRate }}%</div><div class="stat-lbl">Contrats tenus</div></div>
        <div class="stat-card"><div class="stat-val">{{ data.stats.avgContract }}</div><div class="stat-lbl">Contrat moyen</div></div>
        <div class="stat-card"><div class="stat-val">{{ data.stats.capotRate }}%</div><div class="stat-lbl">Parties avec capot</div></div>
        <div class="stat-card"><div class="stat-val">{{ data.stats.beloteRate }}%</div><div class="stat-lbl">Parties avec belote</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Historique des parties ({{ data.games.length }})</h3></div>
        @if (data.games.length) {
          <div class="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Terminée</th><th>Joueurs</th><th>Vainqueur</th>
                  <th>Manches</th><th>Score</th><th>Donnes</th><th>Capots</th><th>Durée</th>
                </tr>
              </thead>
              <tbody>
                @for (g of data.games; track g.id) {
                  <tr>
                    <td>{{ g.finishedAt | date:'dd/MM HH:mm' }}</td>
                    <td>{{ g.players.join(', ') || '—' }}</td>
                    <td><span class="chip" [class.win-a]="g.winner === 'A'" [class.win-b]="g.winner === 'B'">{{ g.winner ? 'Équipe ' + g.winner : 'nul' }}</span></td>
                    <td>{{ g.manchesWonA }} – {{ g.manchesWonB }}</td>
                    <td>{{ g.finalScoreA }} – {{ g.finalScoreB }}</td>
                    <td>{{ g.totalDonnes }}</td>
                    <td>{{ g.capotsTotal || '—' }}</td>
                    <td>{{ fmtDuration(g.durationMs) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty-state">Aucune partie encore jouée sous cette variante.</p>
        }
      </div>
    }
  `,
  styles: [`
    .header-actions { display: flex; gap: 8px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 2px; }
    .info-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; margin: 20px 0; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; }
    .stat-val { font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .stat-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px; }
    .bar { display: flex; height: 6px; border-radius: 999px; overflow: hidden; margin-top: 8px; background: var(--bg-input); }
    .bar-a { background: #4b57d1; } .bar-b { background: #f4c542; }
    .chip { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: var(--bg-input); border: 1px solid var(--border); }
    .chip.win-a { background: rgba(75,87,209,0.18); border-color: #4b57d1; }
    .chip.win-b { background: rgba(244,197,66,0.18); border-color: #f4c542; }
    .overflow-x { overflow-x: auto; }
  `],
})
export class MatchFormatDetailComponent implements OnInit {
  data: VariantAnalytics | null = null;
  loading = true;
  error = '';
  private id = '';

  constructor(private route: ActivatedRoute, private svc: MatchFormatService) {}

  ngOnInit() { this.id = this.route.snapshot.params['id']; this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.svc.analytics(this.id).subscribe({
      next: (res) => { this.data = res; this.loading = false; },
      error: (e) => { this.error = e?.error?.error || 'Chargement impossible.'; this.loading = false; },
    });
  }

  fmtDuration(ms: number): string {
    if (!ms || ms <= 0) return '—';
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m} min ${s % 60}s` : `${s}s`;
  }
  formatLabel(format: string): string {
    return { duo_steel: 'Duo d\'acier', hybrid_alliance: 'Alliance hybride', royal_square: 'Carrée royale' }[format] || format;
  }
}
