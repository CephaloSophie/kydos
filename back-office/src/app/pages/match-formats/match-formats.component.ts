import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatchFormatService, type MatchFormatConfig } from '../../services/match-format.service';
import { TableThemeService, type TableTheme } from '../../services/table-theme.service';

/**
 * Gestion des MATCH RAPIDE de la section Compétitions : mise, gain, nombre de
 * manches, score cible, habillage et activation. Ces réglages sont servis
 * dynamiquement à l'app mobile (carrousel horizontal).
 */
@Component({
  selector: 'app-match-formats',
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>Match rapide</h1>
      <button class="btn btn-secondary" (click)="load()">↻ Actualiser</button>
    </div>

    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px">
      Ces variantes sont proposées dans « Compétitions » de l'application. La mise, le gain,
      le nombre de manches, le score cible et le niveau requis sont appliqués à chaque match.
      Plusieurs variantes par format sont possibles (chacune sa propre file d'attente). Les
      variantes inactives n'apparaissent pas côté joueur.
    </p>
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px">
      <span style="font-size:12px; color:var(--text-muted); align-self:center">+ Nouvelle variante :</span>
      <button class="btn btn-secondary btn-sm" (click)="create('duo_steel')">Duo d'acier</button>
      <button class="btn btn-secondary btn-sm" (click)="create('hybrid_alliance')">Alliance hybride</button>
      <button class="btn btn-secondary btn-sm" (click)="create('royal_square')">Carrée royale</button>
    </div>

    <!-- Barre de recherche + filtres -->
    <div class="filters">
      <input class="search" type="text" [(ngModel)]="search" placeholder="🔎 Rechercher (libellé, sous-titre)…" />
      <select [(ngModel)]="filterFormat">
        <option value="all">Tous les formats</option>
        <option value="duo_steel">Duo d'acier</option>
        <option value="hybrid_alliance">Alliance hybride</option>
        <option value="royal_square">Carrée royale</option>
      </select>
      <select [(ngModel)]="filterActive">
        <option value="all">Tous les états</option>
        <option value="active">Actifs</option>
        <option value="inactive">Inactifs</option>
      </select>
      <span class="count">{{ filteredFormats().length }} / {{ formats.length }}</span>
    </div>

    @if (loading) {
      <div class="empty-state">Chargement…</div>
    } @else if (!filteredFormats().length) {
      <div class="empty-state">Aucune variante ne correspond aux filtres.</div>
    } @else {
      <div class="mf-grid">
        @for (f of filteredFormats(); track f._id || f.format) {
          <div class="card mf-card" [style.border-top]="'3px solid ' + f.color">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center">
              <div>
                <h3 style="margin:0">{{ f.icon }} {{ f.label }}</h3>
                <span style="font-size:11px; color:var(--text-muted)">{{ formatLabel(f.format) }}</span>
              </div>
              <span class="badge" [class.active]="f.active" [class.inactive]="!f.active">
                {{ f.active ? 'Actif' : 'Inactif' }}
              </span>
            </div>

            <div class="form-group">
              <label>Libellé</label>
              <input type="text" [(ngModel)]="f.label" />
            </div>
            <div class="form-group">
              <label>Sous-titre</label>
              <input type="text" [(ngModel)]="f.subtitle" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Mise (&#9830;)</label>
                <input type="number" [(ngModel)]="f.buyInPerPlayer" min="0" (ngModelChange)="recalc(f)" />
              </div>
              <div class="form-group">
                <label>Gain (&#9830;)</label>
                <input type="number" [(ngModel)]="f.prizePerWinner" min="0" (ngModelChange)="recalc(f)" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Manches</label>
                <select [(ngModel)]="f.manches">
                  <option [ngValue]="1">1</option>
                  <option [ngValue]="2">2</option>
                  <option [ngValue]="4">4</option>
                </select>
              </div>
              <div class="form-group">
                <label>Score cible</label>
                <input type="number" [(ngModel)]="f.baseTarget" min="100" step="100" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Niveau requis (min)</label>
                <input type="number" [(ngModel)]="f.minLevel" min="0" />
              </div>
              <div class="form-group">
                <label>Niveau max (vide = aucun)</label>
                <input type="number" [(ngModel)]="f.maxLevel" min="0" placeholder="∞" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Couleur</label>
                <input type="color" [(ngModel)]="f.color" />
              </div>
              <div class="form-group">
                <label>Ordre</label>
                <input type="number" [(ngModel)]="f.order" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Redirection auto depuis la popup LIVE (s)</label>
                <input type="number" [(ngModel)]="f.autoRejoinSec" min="0" max="60" step="1" />
              </div>
              <div class="form-group">
                <label>Score initial des enchères</label>
                <input type="number" [(ngModel)]="f.openingBidMin" min="80" max="180" step="10" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Sens du jeu</label>
                <select [(ngModel)]="f.clockwise">
                  <option [ngValue]="false">Antihoraire (standard)</option>
                  <option [ngValue]="true">Horaire</option>
                </select>
              </div>
              <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px">
                <input type="checkbox" [(ngModel)]="f.countBelote" [id]="'belote-' + f.format" />
                <label [for]="'belote-' + f.format" style="margin:0">Compter la belote (+20)</label>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Thème de la table</label>
                <select [(ngModel)]="f.tableThemeId">
                  <option [ngValue]="null">— Défaut —</option>
                  @for (th of themes; track th._id) {
                    <option [ngValue]="th._id">{{ th.name }}</option>
                  }
                </select>
                @if (themeOf(f); as th) {
                  <div class="theme-swatch" [style.background]="themeGradient(th)" [style.borderColor]="th.colors?.rail || th.railColor"></div>
                }
              </div>
              <div class="form-group"></div>
            </div>
            <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px">
              <input type="checkbox" [(ngModel)]="f.active" [id]="'a-' + f.format" />
              <label [for]="'a-' + f.format" style="margin:0">Proposé aux joueurs</label>
            </div>

            <div class="econ-row" style="margin-top: 8px">
              <span>Net kydos / match</span>
              <span class="econ-val" [style.color]="netOf(f) >= 0 ? 'var(--success)' : 'var(--danger)'">
                {{ netOf(f) >= 0 ? '+' : '' }}{{ netOf(f) }} &#9830;
              </span>
            </div>

            <div style="margin-top: 12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap">
              <button class="btn btn-primary" (click)="save(f)" [disabled]="f._saving">Enregistrer</button>
              @if (f._id) {
                <a class="btn btn-secondary btn-sm" [routerLink]="['/match-formats', f._id]">📊 Visualiser</a>
              }
              <button class="btn btn-danger btn-sm" (click)="remove(f)">Supprimer</button>
              @if (f._msg) { <span style="font-size:12px; color: var(--text-muted)">{{ f._msg }}</span> }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .mf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .mf-card .form-group { margin-bottom: 10px; }
    .theme-swatch { height: 34px; margin-top: 6px; border-radius: 8px; border: 6px solid #6b3a1a; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
    .filters .search { flex: 1; min-width: 220px; }
    .filters .count { font-size: 12px; color: var(--text-muted); margin-left: auto; }
  `],
})
export class MatchFormatsComponent implements OnInit {
  formats: (MatchFormatConfig & { _saving?: boolean; _msg?: string })[] = [];
  themes: TableTheme[] = [];
  loading = true;
  search = '';
  filterFormat = 'all';
  filterActive = 'all';

  // Structure + catalogue pour le net EFFECTIF (miroir serveur : rake + delta).
  private structure: Record<string, { h: number; w: number; base: number; buyIn: number; prize: number }> = {
    duo_steel: { h: 2, w: 1, base: 50, buyIn: 200, prize: 150 },
    hybrid_alliance: { h: 2, w: 1, base: 75, buyIn: 150, prize: 225 },
    royal_square: { h: 4, w: 2, base: 100, buyIn: 100, prize: 150 },
  };

  constructor(private svc: MatchFormatService, private themeSvc: TableThemeService) {}

  ngOnInit() {
    this.load();
    this.themeSvc.list().subscribe((res) => { this.themes = res.themes.filter((t) => t.active); });
  }

  /** Applique recherche (libellé/sous-titre) + filtres format/état. */
  filteredFormats() {
    const q = this.search.trim().toLowerCase();
    return this.formats.filter((f) => {
      if (this.filterFormat !== 'all' && f.format !== this.filterFormat) return false;
      if (this.filterActive === 'active' && !f.active) return false;
      if (this.filterActive === 'inactive' && f.active) return false;
      if (q && !((f.label || '').toLowerCase().includes(q) || (f.subtitle || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }

  themeOf(f: MatchFormatConfig): TableTheme | null {
    return this.themes.find((t) => t._id === f.tableThemeId) ?? null;
  }
  themeGradient(t: TableTheme): string {
    const c1 = t.colors?.felt1 || t.feltColor;
    const c2 = t.colors?.felt2 || t.feltEdgeColor || t.feltColor;
    return `radial-gradient(120% 100% at 50% 42%, ${c1}, ${c2} 75%)`;
  }

  load() {
    this.loading = true;
    this.svc.list().subscribe({
      next: res => { this.formats = res.formats; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  netOf(f: MatchFormatConfig): number {
    const s = this.structure[f.format] ?? { h: 2, w: 1, base: 0, buyIn: 0, prize: 0 };
    return s.base + ((f.buyInPerPlayer || 0) - s.buyIn) * s.h - ((f.prizePerWinner || 0) - s.prize) * s.w;
  }

  recalc(_f: MatchFormatConfig) { /* net recomputed via netOf() in template */ }

  save(f: MatchFormatConfig & { _id?: string; _saving?: boolean; _msg?: string }) {
    if (!f._id) { this.create(f.format); return; }
    f._saving = true; f._msg = '';
    this.svc.update(f._id, f).subscribe({
      next: () => { f._saving = false; f._msg = '✓ Enregistré'; setTimeout(() => (f._msg = ''), 2500); },
      error: (err: any) => { f._saving = false; f._msg = '✗ ' + (err.error?.error || 'Erreur'); },
    });
  }

  create(format: string) {
    this.svc.create({ format }).subscribe({ next: () => this.load() });
  }

  remove(f: MatchFormatConfig & { _id?: string }) {
    if (!f._id || !confirm(`Supprimer « ${f.label} » ?`)) return;
    this.svc.delete(f._id).subscribe({ next: () => this.load() });
  }

  formatLabel(format: string): string {
    return { duo_steel: 'Duo d\'acier', hybrid_alliance: 'Alliance hybride', royal_square: 'Carrée royale' }[format] || format;
  }
}
