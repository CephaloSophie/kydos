/* =============================================================================
 * BACK-OFFICE · pages/table-themes — Bibliothèque de thèmes de table.
 * -----------------------------------------------------------------------------
 * L'admin construit ici les thèmes (feutre + bordure + accent) qui seront
 * proposés à la création des tournois et des variantes de MATCH RAPIDE. Chaque
 * carte montre un APERÇU fidèle (dégradé du tapis + rail) calculé par le
 * serveur. Les presets intégrés sont modifiables mais non supprimables.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableThemeService, type TableTheme } from '../../services/table-theme.service';

type EditableTheme = TableTheme & { _saving?: boolean; _msg?: string };

@Component({
  selector: 'app-table-themes',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>🎨 Thèmes de table</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" (click)="load()" title="Actualiser">↻ Actualiser</button>
        <button class="btn btn-primary" (click)="startCreate()">+ Nouveau thème</button>
      </div>
    </div>

    <p class="intro">
      Ces thèmes définissent l'apparence de la table de jeu (couleur du tapis et bordure). Ils sont
      proposés à la création d'un tournoi ou d'une variante de MATCH RAPIDE, et s'appliquent à la
      partie affichée aux joueurs.
    </p>

    @if (creating) {
      <div class="card editor">
        <div class="card-header"><h3>Nouveau thème</h3></div>
        <div class="editor-grid">
          <div class="fields">
            <label>Nom
              <input type="text" [(ngModel)]="draft.name" placeholder="Ex. Émeraude nuit" />
            </label>
            <div class="color-row"><span>Tapis (centre)</span><input type="color" [(ngModel)]="draft.feltColor" /><code>{{ draft.feltColor }}</code></div>
            <div class="color-row"><span>Tapis (bords)</span><input type="color" [(ngModel)]="draft.feltEdgeColor" /><code>{{ draft.feltEdgeColor }}</code></div>
            <div class="color-row"><span>Bordure (rail)</span><input type="color" [(ngModel)]="draft.railColor" /><code>{{ draft.railColor }}</code></div>
            <div class="color-row"><span>Accent</span><input type="color" [(ngModel)]="draft.accentColor" /><code>{{ draft.accentColor }}</code></div>
          </div>
          <div class="preview-col">
            <div class="table-preview" [style.background]="localGradient(draft)" [style.borderColor]="draft.railColor">
              <div class="preview-accent" [style.background]="draft.accentColor"></div>
            </div>
          </div>
        </div>
        <div class="editor-actions">
          <button class="btn btn-primary" (click)="saveNew()" [disabled]="creatingBusy">Créer</button>
          <button class="btn btn-secondary" (click)="creating = false">Annuler</button>
          @if (createMsg) { <span class="msg">{{ createMsg }}</span> }
        </div>
      </div>
    }

    @if (loading) { <p class="empty-state">Chargement…</p> }

    <div class="grid">
      @for (t of themes; track t._id) {
        <div class="card theme-card">
          <div class="table-preview" [style.background]="serverGradient(t)" [style.borderColor]="t.colors?.rail || t.railColor">
            <div class="preview-accent" [style.background]="t.colors?.accent || t.accentColor"></div>
          </div>
          <div class="theme-body">
            <div class="theme-head">
              <input class="name-input" type="text" [(ngModel)]="t.name" />
              @if (t.builtIn) { <span class="badge builtin" title="Preset intégré">intégré</span> }
            </div>
            <div class="color-row"><span>Tapis</span><input type="color" [(ngModel)]="t.feltColor" /><code>{{ t.feltColor }}</code></div>
            <div class="color-row"><span>Bords</span><input type="color" [ngModel]="t.feltEdgeColor || t.feltColor" (ngModelChange)="t.feltEdgeColor = $event" /><code>{{ t.feltEdgeColor || '(auto)' }}</code></div>
            <div class="color-row"><span>Bordure</span><input type="color" [(ngModel)]="t.railColor" /><code>{{ t.railColor }}</code></div>
            <div class="color-row"><span>Accent</span><input type="color" [ngModel]="t.accentColor || '#f0c46a'" (ngModelChange)="t.accentColor = $event" /><code>{{ t.accentColor || '(auto)' }}</code></div>
            <div class="row-flags">
              <label class="chk"><input type="checkbox" [(ngModel)]="t.active" /> Proposé à la création</label>
              <input class="order-input" type="number" [(ngModel)]="t.order" min="0" title="Ordre d'affichage" />
            </div>
            <div class="theme-actions">
              <button class="btn btn-primary btn-sm" (click)="save(t)" [disabled]="t._saving">Enregistrer</button>
              @if (!t.builtIn) {
                <button class="btn btn-danger btn-sm" (click)="remove(t)">Supprimer</button>
              }
              @if (t._msg) { <span class="msg">{{ t._msg }}</span> }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .header-actions { display: flex; gap: 8px; }
    .intro { color: var(--text-secondary); max-width: 780px; margin-bottom: 18px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
    .theme-card { padding: 0; overflow: hidden; }
    .table-preview {
      height: 130px; margin: 0; border-radius: 0; border: 10px solid #6b3a1a;
      position: relative; display: flex; align-items: center; justify-content: center;
    }
    .editor .table-preview { border-radius: 12px; }
    .preview-accent { width: 60%; height: 6px; border-radius: 999px; opacity: 0.85; }
    .theme-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
    .theme-head { display: flex; align-items: center; gap: 8px; }
    .name-input { flex: 1; font-weight: 600; font-size: 14px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text-primary); padding: 2px 0; }
    .color-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-secondary); }
    .color-row span { width: 64px; }
    .color-row input[type=color] { width: 34px; height: 26px; border: none; background: none; padding: 0; cursor: pointer; }
    .color-row code { font-size: 11px; color: var(--text-muted); }
    .row-flags { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .chk { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .order-input { width: 60px; }
    .theme-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .badge.builtin { background: rgba(230,196,106,0.15); color: var(--primary); border: 1px solid rgba(230,196,106,0.5); border-radius: 999px; padding: 1px 8px; font-size: 10px; }
    .btn-danger { background: var(--danger, #b0384a); color: #fff; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .editor { margin-bottom: 20px; }
    .editor-grid { display: grid; grid-template-columns: 1fr 240px; gap: 20px; }
    @media (max-width: 700px) { .editor-grid { grid-template-columns: 1fr; } }
    .fields { display: flex; flex-direction: column; gap: 10px; }
    .fields label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary); }
    .editor-actions { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
    .msg { font-size: 12px; color: var(--text-muted); }
    .preview-col { display: flex; align-items: center; justify-content: center; }
    .preview-col .table-preview { width: 100%; height: 160px; }
  `],
})
export class TableThemesComponent implements OnInit {
  themes: EditableTheme[] = [];
  loading = false;
  creating = false;
  creatingBusy = false;
  createMsg = '';
  draft: Partial<TableTheme> = this.blankDraft();

  constructor(private svc: TableThemeService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.list().subscribe({
      next: (res) => { this.themes = res.themes; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  blankDraft(): Partial<TableTheme> {
    return { name: '', feltColor: '#1a5c3a', feltEdgeColor: '#0f3f27', railColor: '#6b3a1a', accentColor: '#f0c46a', active: true };
  }
  startCreate() { this.draft = this.blankDraft(); this.createMsg = ''; this.creating = true; }

  saveNew() {
    if (!this.draft.name || this.draft.name.trim().length < 2) { this.createMsg = 'Nom trop court.'; return; }
    this.creatingBusy = true;
    this.svc.create(this.draft).subscribe({
      next: () => { this.creatingBusy = false; this.creating = false; this.load(); },
      error: (e) => { this.creatingBusy = false; this.createMsg = e?.error?.error || 'Échec.'; },
    });
  }

  save(t: EditableTheme) {
    t._saving = true; t._msg = '';
    this.svc.update(t._id!, {
      name: t.name, feltColor: t.feltColor, feltEdgeColor: t.feltEdgeColor,
      railColor: t.railColor, accentColor: t.accentColor, active: t.active, order: t.order,
    }).subscribe({
      next: (res) => { t._saving = false; t._msg = '✓ enregistré'; t.colors = res.theme.colors; setTimeout(() => (t._msg = ''), 2000); },
      error: (e) => { t._saving = false; t._msg = e?.error?.error || 'Échec.'; },
    });
  }

  remove(t: EditableTheme) {
    if (!confirm(`Supprimer le thème « ${t.name} » ?`)) return;
    this.svc.remove(t._id!).subscribe({ next: () => this.load(), error: (e) => (t._msg = e?.error?.error || 'Échec.') });
  }

  /** Aperçu local (édition) : dégradé radial centre → bords. */
  localGradient(t: Partial<TableTheme>): string {
    const c1 = t.feltColor || '#1a5c3a';
    const c2 = t.feltEdgeColor || t.feltColor || '#0f3f27';
    return `radial-gradient(120% 100% at 50% 42%, ${c1}, ${c2} 75%)`;
  }
  /** Aperçu carte : utilise les couleurs RÉSOLUES par le serveur. */
  serverGradient(t: TableTheme): string {
    const c = t.colors;
    const c1 = c?.felt1 || t.feltColor;
    const c2 = c?.felt2 || t.feltEdgeColor || t.feltColor;
    return `radial-gradient(120% 100% at 50% 42%, ${c1}, ${c2} 75%)`;
  }
}
