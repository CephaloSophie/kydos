/* =============================================================================
 * BACK-OFFICE · pages/table-theme-detail — Visualisation d'un thème.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TableThemeService, type TableTheme } from '../../services/table-theme.service';

@Component({
  selector: 'app-table-theme-detail',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>🎨 {{ t?.name || 'Thème' }}</h1>
      <div class="header-actions">
        @if (t && !t.builtIn) { <a [routerLink]="['/table-themes', t._id, 'edit']" class="btn btn-secondary">Éditer</a> }
        <a routerLink="/table-themes" class="btn btn-secondary">Retour</a>
      </div>
    </div>

    @if (t) {
      <div class="detail-grid">
        <div class="card">
          <div class="big-preview" [style.background]="gradient()" [style.borderColor]="t.colors?.rail || t.railColor">
            <div class="accent" [style.background]="t.colors?.accent || t.accentColor"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Détails</h3></div>
          <div class="info-item"><span class="info-label">Type</span><span>{{ t.builtIn ? 'Preset intégré' : 'Personnalisé' }}</span></div>
          <div class="info-item"><span class="info-label">Statut</span><span>{{ statusLabel() }}</span></div>
          <div class="swatches">
            <div class="sw"><span class="dot" [style.background]="t.feltColor"></span> Tapis {{ t.feltColor }}</div>
            <div class="sw"><span class="dot" [style.background]="t.feltEdgeColor || t.colors?.felt2"></span> Bords {{ t.feltEdgeColor || '(auto)' }}</div>
            <div class="sw"><span class="dot" [style.background]="t.railColor"></span> Bordure {{ t.railColor }}</div>
            <div class="sw"><span class="dot" [style.background]="t.accentColor || t.colors?.accent"></span> Accent {{ t.accentColor || '(auto)' }}</div>
          </div>
        </div>
      </div>
    } @else if (error) { <div class="card"><p class="empty-state">{{ error }}</p></div> }
  `,
  styles: [`
    .header-actions { display: flex; gap: 8px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 800px) { .detail-grid { grid-template-columns: 1fr; } }
    .big-preview { height: 260px; border-radius: 16px; border: 12px solid #6b3a1a; display: flex; align-items: center; justify-content: center; }
    .accent { width: 55%; height: 10px; border-radius: 999px; opacity: 0.85; }
    .info-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .info-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); }
    .swatches { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .sw { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .dot { width: 18px; height: 18px; border-radius: 5px; border: 1px solid var(--border); }
  `],
})
export class TableThemeDetailComponent implements OnInit {
  t: TableTheme | null = null;
  error = '';

  constructor(private route: ActivatedRoute, private svc: TableThemeService) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe({
      next: (res) => (this.t = res.theme),
      error: (e) => (this.error = e?.error?.error || 'Chargement impossible.'),
    });
  }

  gradient(): string {
    if (!this.t) return '';
    const c1 = this.t.colors?.felt1 || this.t.feltColor;
    const c2 = this.t.colors?.felt2 || this.t.feltEdgeColor || this.t.feltColor;
    return `radial-gradient(120% 100% at 50% 42%, ${c1}, ${c2} 75%)`;
  }
  statusLabel(): string {
    const s = this.t?.status ?? (this.t?.active ? 'active' : 'draft');
    return { draft: 'Brouillon', pending: 'Prêt', active: 'Publié' }[s as string] || s || '';
  }
}
