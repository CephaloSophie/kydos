/* =============================================================================
 * BACK-OFFICE · pages/match-formats — Liste des variantes de MATCH RAPIDE.
 * -----------------------------------------------------------------------------
 * Tableau filtrable (comme la liste des tournois) : format, statut (brouillon /
 * prêt / publié), économie et net kydos. Actions par ligne : cloner, éditer,
 * visualiser, supprimer. La création/édition se fait dans une interface dédiée.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatchFormatService, type MatchFormatConfig } from '../../services/match-format.service';

type Row = MatchFormatConfig & { _busy?: boolean };

@Component({
  selector: 'app-match-formats',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>Match rapide</h1>
      <a routerLink="/match-formats/new" class="btn btn-primary">+ Nouvelle variante</a>
    </div>

    <p class="intro">
      Ces variantes sont proposées dans « Compétitions » de l'application. Seules les variantes
      <strong>publiées</strong> apparaissent côté joueur. Plusieurs variantes par format sont possibles
      (chacune sa propre file d'attente).
    </p>

    <div class="filters">
      <input class="search" type="text" [(ngModel)]="search" placeholder="🔎 Rechercher (libellé, sous-titre)…" />
      <select [(ngModel)]="filterFormat">
        <option value="all">Tous les formats</option>
        <option value="duo_steel">Duo d'acier</option>
        <option value="hybrid_alliance">Alliance hybride</option>
        <option value="royal_square">Carrée royale</option>
      </select>
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
            <tr>
              <th>Variante</th><th>Format</th><th>Mise</th><th>Gain</th><th>Net kydos</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (f of filtered(); track f._id) {
              <tr>
                <td><a [routerLink]="['/match-formats', f._id]" style="font-weight:600">{{ f.icon }} {{ f.label }}</a></td>
                <td>{{ formatLabel(f.format) }}</td>
                <td>{{ f.buyInPerPlayer }} ◆</td>
                <td>{{ f.prizePerWinner }} ◆</td>
                <td [style.color]="(f.houseNet ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)'">{{ (f.houseNet ?? 0) >= 0 ? '+' : '' }}{{ f.houseNet }} ◆</td>
                <td><span class="badge" [class]="statusClass(f)">{{ statusLabel(f) }}</span></td>
                <td class="actions">
                  <button class="icon-btn" title="Cloner" (click)="clone(f)" [disabled]="f._busy">📋</button>
                  <a class="icon-btn" title="Éditer" [routerLink]="['/match-formats', f._id, 'edit']">✏️</a>
                  <a class="icon-btn" title="Visualiser" [routerLink]="['/match-formats', f._id]">📊</a>
                  <button class="icon-btn danger" title="Supprimer" (click)="remove(f)" [disabled]="f._busy">🗑️</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-state">Aucune variante ne correspond aux filtres.</td></tr>
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
    .actions { display: flex; gap: 4px; }
    .icon-btn { background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 14px; text-decoration: none; line-height: 1; }
    .icon-btn:hover { border-color: var(--primary); }
    .icon-btn.danger:hover { border-color: var(--danger); }
    .badge.draft { background: var(--bg-input); color: var(--text-muted); }
    .badge.pending { background: rgba(232,150,68,0.15); color: #e89644; }
    .badge.active { background: rgba(120,200,140,0.15); color: #78c88c; }
  `],
})
export class MatchFormatsComponent implements OnInit {
  rows: Row[] = [];
  search = '';
  filterFormat = 'all';
  filterStatus = 'all';

  private structure: Record<string, { h: number; w: number; base: number; buyIn: number; prize: number }> = {
    duo_steel: { h: 2, w: 1, base: 50, buyIn: 200, prize: 150 },
    hybrid_alliance: { h: 2, w: 1, base: 75, buyIn: 150, prize: 225 },
    royal_square: { h: 4, w: 2, base: 100, buyIn: 100, prize: 150 },
  };

  constructor(private svc: MatchFormatService) {}

  ngOnInit() { this.load(); }

  load() { this.svc.list().subscribe((res) => { this.rows = res.formats; }); }

  statusOf(f: Row): 'draft' | 'pending' | 'active' { return (f.status as any) ?? (f.active ? 'active' : 'draft'); }
  statusClass(f: Row): string { return this.statusOf(f); }
  statusLabel(f: Row): string { return { draft: 'Brouillon', pending: 'Prêt', active: 'Publié' }[this.statusOf(f)]; }

  filtered(): Row[] {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((f) => {
      if (this.filterFormat !== 'all' && f.format !== this.filterFormat) return false;
      if (this.filterStatus !== 'all' && this.statusOf(f) !== this.filterStatus) return false;
      if (q && !((f.label || '').toLowerCase().includes(q) || (f.subtitle || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }

  clone(f: Row) {
    f._busy = true;
    this.svc.clone(f._id!).subscribe({ next: () => this.load(), error: () => (f._busy = false) });
  }
  remove(f: Row) {
    if (!confirm(`Supprimer « ${f.label} » ?`)) return;
    f._busy = true;
    this.svc.delete(f._id!).subscribe({ next: () => this.load(), error: () => (f._busy = false) });
  }

  formatLabel(format: string): string {
    return { duo_steel: 'Duo d\'acier', hybrid_alliance: 'Alliance hybride', royal_square: 'Carrée royale' }[format] || format;
  }
}
