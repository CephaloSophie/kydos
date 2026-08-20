/* =============================================================================
 * BACK-OFFICE · pages/table-theme-form — Création / édition d'un thème.
 * -----------------------------------------------------------------------------
 * Interface DÉDIÉE : couleurs (tapis centre/bords, bordure, accent), statut et
 * aperçu fidèle en direct de la table.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TableThemeService } from '../../services/table-theme.service';

@Component({
  selector: 'app-table-theme-form',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>{{ editId ? 'Modifier le thème' : 'Nouveau thème' }}</h1>
      <a routerLink="/table-themes" class="btn btn-secondary">Retour</a>
    </div>

    <div class="editor-grid">
      <div class="card fields">
        <div class="form-group"><label>Nom</label><input type="text" [(ngModel)]="t.name" placeholder="Ex. Émeraude nuit" /></div>
        <div class="form-group">
          <label>Statut</label>
          <select [(ngModel)]="t.status">
            <option value="draft">Brouillon</option>
            <option value="pending">Prêt (en attente)</option>
            <option value="active">Publié (proposé à la création)</option>
          </select>
        </div>
        <div class="color-row"><span>Tapis (centre)</span><input type="color" [(ngModel)]="t.feltColor" /><code>{{ t.feltColor }}</code></div>
        <div class="color-row"><span>Tapis (bords)</span><input type="color" [(ngModel)]="t.feltEdgeColor" /><code>{{ t.feltEdgeColor }}</code></div>
        <div class="color-row"><span>Bordure (rail)</span><input type="color" [(ngModel)]="t.railColor" /><code>{{ t.railColor }}</code></div>
        <div class="color-row"><span>Accent</span><input type="color" [(ngModel)]="t.accentColor" /><code>{{ t.accentColor }}</code></div>
        <div class="actions-bar">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving">{{ editId ? 'Enregistrer' : 'Créer le thème' }}</button>
          <a routerLink="/table-themes" class="btn btn-secondary">Annuler</a>
          @if (error) { <span class="err">{{ error }}</span> }
        </div>
      </div>
      <div class="card preview-card">
        <div class="table-preview" [style.background]="gradient()" [style.borderColor]="t.railColor">
          <div class="preview-accent" [style.background]="t.accentColor"></div>
        </div>
        <p class="hint">Aperçu du tapis et de la bordure.</p>
      </div>
    </div>
  `,
  styles: [`
    .editor-grid { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
    @media (max-width: 760px) { .editor-grid { grid-template-columns: 1fr; } }
    .form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .form-group label { font-size: 12px; color: var(--text-secondary); }
    .color-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; }
    .color-row span { width: 110px; }
    .color-row input[type=color] { width: 40px; height: 28px; border: none; background: none; padding: 0; cursor: pointer; }
    .color-row code { font-size: 11px; color: var(--text-muted); }
    .actions-bar { display: flex; gap: 10px; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
    .err { color: var(--danger); font-size: 13px; }
    .table-preview { height: 200px; border-radius: 14px; border: 10px solid #6b3a1a; display: flex; align-items: center; justify-content: center; }
    .preview-accent { width: 60%; height: 8px; border-radius: 999px; opacity: 0.85; }
    .hint { color: var(--text-muted); font-size: 12px; margin-top: 10px; text-align: center; }
  `],
})
export class TableThemeFormComponent implements OnInit {
  editId: string | null = null;
  saving = false;
  error = '';
  t: any = { name: '', status: 'draft', feltColor: '#1a5c3a', feltEdgeColor: '#0f3f27', railColor: '#6b3a1a', accentColor: '#f0c46a' };

  constructor(private svc: TableThemeService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.editId = this.route.snapshot.params['id'] || null;
    if (this.editId) {
      this.svc.get(this.editId).subscribe((res) => {
        const th = res.theme as any;
        this.t = {
          name: th.name, status: th.status ?? (th.active ? 'active' : 'draft'),
          feltColor: th.feltColor, feltEdgeColor: th.feltEdgeColor || th.feltColor,
          railColor: th.railColor, accentColor: th.accentColor || '#f0c46a',
        };
      });
    }
  }

  gradient(): string {
    return `radial-gradient(120% 100% at 50% 42%, ${this.t.feltColor}, ${this.t.feltEdgeColor || this.t.feltColor} 75%)`;
  }

  save() {
    this.saving = true; this.error = '';
    const done = () => this.router.navigate(['/table-themes']);
    const fail = (e: any) => { this.saving = false; this.error = e?.error?.error || 'Échec.'; };
    if (this.editId) this.svc.update(this.editId, this.t).subscribe({ next: done, error: fail });
    else this.svc.create(this.t).subscribe({ next: done, error: fail });
  }
}
