/* =============================================================================
 * BACK-OFFICE · pages/robot-avatars — Catalogue d'avatars de robots.
 * -----------------------------------------------------------------------------
 * Tableau filtrable : aperçu (mascotte teintée), nom, plage de niveau, statut.
 * Actions : cloner, éditer, supprimer. La mascotte est la même partout ; seule
 * la couleur d'accent change, débloquée par niveau joueur (min/max).
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RobotAvatarService, type RobotAvatar } from '../../services/robot-avatar.service';
import { robotMascotSvg } from '../../shared/robot-mascot';

type Row = RobotAvatar & { _busy?: boolean };

@Component({
  selector: 'app-robot-avatars',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>🤖 Avatars de robots</h1>
      <a routerLink="/robot-avatars/new" class="btn btn-primary">+ Nouvel avatar</a>
    </div>

    <p class="intro">
      La mascotte est identique pour tous ; chaque avatar est une <strong>couleur</strong> débloquée
      sur une plage de <strong>niveau joueur</strong>. Seuls les avatars <strong>publiés</strong> et
      débloqués sont proposés dans l'app à la création d'un robot.
    </p>

    <div class="filters">
      <input class="search" type="text" [(ngModel)]="search" placeholder="🔎 Rechercher un avatar…" />
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
            <tr><th>Aperçu</th><th>Nom</th><th>Couleur</th><th>Niveau</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (a of filtered(); track a._id) {
              <tr>
                <td><span class="mascot" [innerHTML]="mascot(a)"></span></td>
                <td><a [routerLink]="['/robot-avatars', a._id, 'edit']" style="font-weight:600">{{ a.name }}</a> @if (a.builtIn) { <span class="tag">intégré</span> }</td>
                <td><span class="dot" [style.background]="a.accentColor"></span> {{ a.accentColor }}</td>
                <td>{{ a.minLevel }}{{ a.maxLevel != null ? ' → ' + a.maxLevel : '+' }}</td>
                <td><span class="badge" [class]="statusOf(a)">{{ statusLabel(a) }}</span></td>
                <td class="actions">
                  <button class="icon-btn" title="Cloner" (click)="clone(a)" [disabled]="a._busy">📋</button>
                  <a class="icon-btn" title="Éditer" [routerLink]="['/robot-avatars', a._id, 'edit']">✏️</a>
                  @if (!a.builtIn) { <button class="icon-btn danger" title="Supprimer" (click)="remove(a)" [disabled]="a._busy">🗑️</button> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-state">Aucun avatar ne correspond aux filtres.</td></tr>
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
    .mascot { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    .dot { display: inline-block; width: 14px; height: 14px; border-radius: 4px; vertical-align: middle; margin-right: 4px; border: 1px solid var(--border); }
    .tag { font-size: 10px; background: rgba(230,196,106,0.15); color: var(--primary); border-radius: 999px; padding: 1px 6px; }
    .actions { display: flex; gap: 4px; }
    .icon-btn { background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 14px; text-decoration: none; line-height: 1; }
    .icon-btn:hover { border-color: var(--primary); }
    .icon-btn.danger:hover { border-color: var(--danger); }
    .badge.draft { background: var(--bg-input); color: var(--text-muted); }
    .badge.pending { background: rgba(232,150,68,0.15); color: #e89644; }
    .badge.active { background: rgba(120,200,140,0.15); color: #78c88c; }
  `],
})
export class RobotAvatarsComponent implements OnInit {
  rows: Row[] = [];
  search = '';
  filterStatus = 'all';

  constructor(private svc: RobotAvatarService, private sanitizer: DomSanitizer) {}
  ngOnInit() { this.load(); }

  mascot(a: RobotAvatar): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(robotMascotSvg({ accentColor: a.accentColor, bodyColor: a.bodyColor, outlineColor: a.outlineColor }, 34));
  }
  load() { this.svc.list().subscribe((res) => { this.rows = res.avatars; }); }

  statusOf(a: Row): 'draft' | 'pending' | 'active' { return (a.status as any) ?? (a.active ? 'active' : 'draft'); }
  statusLabel(a: Row): string { return { draft: 'Brouillon', pending: 'Prêt', active: 'Publié' }[this.statusOf(a)]; }

  filtered(): Row[] {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((a) => {
      if (this.filterStatus !== 'all' && this.statusOf(a) !== this.filterStatus) return false;
      if (q && !(a.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  clone(a: Row) { a._busy = true; this.svc.clone(a._id!).subscribe({ next: () => this.load(), error: () => (a._busy = false) }); }
  remove(a: Row) {
    if (!confirm(`Supprimer l'avatar « ${a.name} » ?`)) return;
    a._busy = true;
    this.svc.remove(a._id!).subscribe({ next: () => this.load(), error: () => (a._busy = false) });
  }
}
