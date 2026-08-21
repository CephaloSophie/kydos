/* =============================================================================
 * BACK-OFFICE · pages/table-themes — Liste des thèmes de table.
 * -----------------------------------------------------------------------------
 * Tableau filtrable (comme la liste des tournois) : aperçu, nom, type (intégré /
 * personnalisé), statut (brouillon / prêt / publié). Actions par ligne : cloner,
 * éditer, visualiser, supprimer. La création/édition se fait dans une interface
 * dédiée.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableThemeService, type TableTheme } from '../../services/table-theme.service';

type Row = TableTheme & { _busy?: boolean };

@Component({
  selector: 'app-table-themes',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>🎨 Thèmes de table</h1>
      <a routerLink="/table-themes/new" class="btn btn-primary">+ Nouveau thème</a>
    </div>

    <p class="intro">
      Ces thèmes définissent l'apparence de la table (couleur du tapis et bordure). Seuls les thèmes
      <strong>publiés</strong> sont proposés à la création d'un tournoi ou d'une variante de MATCH RAPIDE.
    </p>

    <div class="filters">
      <input class="search" type="text" [(ngModel)]="search" placeholder="🔎 Rechercher un thème…" />
      <select [(ngModel)]="filterStatus">
        <option value="all">Tous les statuts</option>
        <option value="draft">Brouillon</option>
        <option value="pending">Prêt</option>
        <option value="active">Publié</option>
      </select>
      <span class="count">{{ filtered().length }} / {{ rows.length }}</span>
    </div>

    <div class="card">
      <div class="overflow-x">
        <table>
          <thead>
            <tr><th>Aperçu</th><th>Nom</th><th>Type</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (t of filtered(); track t._id) {
              <tr>
                <td><div class="mini" [style.background]="gradient(t)" [style.borderColor]="t.colors?.rail || t.railColor"></div></td>
                <td><a [routerLink]="['/table-themes', t._id]" style="font-weight:600">{{ t.name }}</a></td>
                <td>{{ t.builtIn ? 'Intégré' : 'Personnalisé' }}</td>
                <td><span class="badge" [class]="statusOf(t)">{{ statusLabel(t) }}</span></td>
                <td class="actions">
                  <button class="icon-btn" title="Cloner" (click)="clone(t)" [disabled]="t._busy">📋</button>
                  <a class="icon-btn" title="Éditer" [routerLink]="['/table-themes', t._id, 'edit']">✏️</a>
                  <a class="icon-btn" title="Visualiser" [routerLink]="['/table-themes', t._id]">👁️</a>
                  @if (!t.builtIn) {
                    <button class="icon-btn danger" title="Supprimer" (click)="remove(t)" [disabled]="t._busy">🗑️</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-state">Aucun thème ne correspond aux filtres.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .intro { color: var(--text-secondary); font-size: 13px; margin-bottom: 14px; max-width: 780px; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
    .filters .search { flex: 1; min-width: 220px; }
    .filters .count { font-size: 12px; color: var(--text-muted); margin-left: auto; }
    .mini { width: 64px; height: 34px; border-radius: 6px; border: 5px solid #6b3a1a; }
    .actions { display: flex; gap: 4px; }
    .icon-btn { background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 14px; text-decoration: none; line-height: 1; }
    .icon-btn:hover { border-color: var(--primary); }
    .icon-btn.danger:hover { border-color: var(--danger); }
    .badge.draft { background: var(--bg-input); color: var(--text-muted); }
    .badge.pending { background: rgba(232,150,68,0.15); color: #e89644; }
    .badge.active { background: rgba(120,200,140,0.15); color: #78c88c; }
  `],
})
export class TableThemesComponent implements OnInit {
  rows: Row[] = [];
  search = '';
  filterStatus = 'all';

  constructor(private svc: TableThemeService) {}

  ngOnInit() { this.load(); }

  load() { this.svc.list().subscribe((res) => { this.rows = res.themes; }); }

  statusOf(t: Row): 'draft' | 'pending' | 'active' { return (t.status as any) ?? (t.active ? 'active' : 'draft'); }
  statusLabel(t: Row): string { return { draft: 'Brouillon', pending: 'Prêt', active: 'Publié' }[this.statusOf(t)]; }

  gradient(t: Row): string {
    const c1 = t.colors?.felt1 || t.feltColor; const c2 = t.colors?.felt2 || t.feltEdgeColor || t.feltColor;
    return `radial-gradient(120% 100% at 50% 42%, ${c1}, ${c2} 75%)`;
  }

  filtered(): Row[] {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((t) => {
      if (this.filterStatus !== 'all' && this.statusOf(t) !== this.filterStatus) return false;
      if (q && !(t.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  clone(t: Row) { t._busy = true; this.svc.clone(t._id!).subscribe({ next: () => this.load(), error: () => (t._busy = false) }); }
  remove(t: Row) {
    if (!confirm(`Supprimer le thème « ${t.name} » ?`)) return;
    t._busy = true;
    this.svc.remove(t._id!).subscribe({ next: () => this.load(), error: () => (t._busy = false) });
  }
}
