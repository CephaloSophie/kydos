/* =============================================================================
 * BACK-OFFICE · pages/match-format-form — Création / édition d'une variante.
 * -----------------------------------------------------------------------------
 * Interface DÉDIÉE (plein écran) pour créer ou modifier une variante de MATCH
 * RAPIDE : identité, économie, règles de jeu, règles de belote, thème de table,
 * critères de niveau et statut. Remplace l'ancienne édition inline en cartes.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatchFormatService, type MatchFormatConfig } from '../../services/match-format.service';
import { TableThemeService, type TableTheme } from '../../services/table-theme.service';

@Component({
  selector: 'app-match-format-form',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>{{ editId ? 'Modifier la variante' : 'Nouvelle variante' }}</h1>
      <a routerLink="/match-formats" class="btn btn-secondary">Retour</a>
    </div>

    <div class="form-layout">
      <div class="form-main card">
        <h3>Identité</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Format</label>
            <select [(ngModel)]="f.format" [disabled]="!!editId">
              <option value="duo_steel">Duo d'acier</option>
              <option value="hybrid_alliance">Alliance hybride</option>
              <option value="royal_square">Carrée royale</option>
            </select>
          </div>
          <div class="form-group">
            <label>Statut</label>
            <select [(ngModel)]="f.status">
              <option value="draft">Brouillon</option>
              <option value="pending">Prêt (en attente)</option>
              <option value="active">Publié (proposé aux joueurs)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Libellé</label><input type="text" [(ngModel)]="f.label" placeholder="Ex. Duo d'acier — Débutant" /></div>
          <div class="form-group"><label>Icône</label><input type="text" [(ngModel)]="f.icon" maxlength="2" /></div>
        </div>
        <div class="form-group"><label>Sous-titre</label><input type="text" [(ngModel)]="f.subtitle" /></div>

        <h3>Économie</h3>
        <div class="form-row">
          <div class="form-group"><label>Mise / joueur (◆)</label><input type="number" [(ngModel)]="f.buyInPerPlayer" min="0" /></div>
          <div class="form-group"><label>Gain / vainqueur (◆)</label><input type="number" [(ngModel)]="f.prizePerWinner" min="0" /></div>
        </div>

        <h3>Règles de jeu</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Manches</label>
            <select [(ngModel)]="f.manches"><option [ngValue]="1">1</option><option [ngValue]="2">2</option><option [ngValue]="4">4</option></select>
          </div>
          <div class="form-group"><label>Score cible / manche</label><input type="number" [(ngModel)]="f.baseTarget" min="100" step="100" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Score du grand label</label><input type="number" [(ngModel)]="f.labelTarget" min="100" step="100" /></div>
          <div class="form-group"><label>Redirection auto popup LIVE (s)</label><input type="number" [(ngModel)]="f.autoRejoinSec" min="0" max="60" /></div>
        </div>

        <h3>Règles de belote</h3>
        <div class="form-row">
          <div class="form-group"><label>Score initial des enchères</label><input type="number" [(ngModel)]="f.openingBidMin" min="80" max="180" step="10" /></div>
          <div class="form-group">
            <label>Sens du jeu</label>
            <select [(ngModel)]="f.clockwise"><option [ngValue]="false">Antihoraire (standard)</option><option [ngValue]="true">Horaire</option></select>
          </div>
        </div>
        <div class="form-group chk"><input type="checkbox" [(ngModel)]="f.countBelote" id="belote" /><label for="belote">Compter la belote dans le score (+20)</label></div>

        <h3>Thème & niveau</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Thème de la table</label>
            <select [(ngModel)]="f.tableThemeId">
              <option [ngValue]="null">— Défaut —</option>
              @for (th of themes; track th._id) { <option [ngValue]="th._id">{{ th.name }}</option> }
            </select>
            @if (selectedTheme(); as th) { <div class="theme-swatch" [style.background]="themeGradient(th)" [style.borderColor]="th.colors?.rail || th.railColor"></div> }
          </div>
          <div class="form-group"><label>Couleur carte (mobile)</label><input type="color" [(ngModel)]="f.color" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Niveau requis (min)</label><input type="number" [(ngModel)]="f.minLevel" min="0" /></div>
          <div class="form-group"><label>Niveau max (vide = aucun)</label><input type="number" [(ngModel)]="f.maxLevel" min="0" placeholder="∞" /></div>
        </div>

        <div class="actions-bar">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving">{{ editId ? 'Enregistrer' : 'Créer la variante' }}</button>
          <a routerLink="/match-formats" class="btn btn-secondary">Annuler</a>
          @if (error) { <span class="err">{{ error }}</span> }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-layout { max-width: 760px; }
    .form-main h3 { margin: 18px 0 10px; font-size: 14px; color: var(--primary); }
    .form-main h3:first-child { margin-top: 0; }
    .form-row { display: flex; gap: 16px; }
    @media (max-width: 640px) { .form-row { flex-direction: column; } }
    .form-group { flex: 1; display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .form-group label { font-size: 12px; color: var(--text-secondary); }
    .chk { flex-direction: row; align-items: center; gap: 8px; }
    .theme-swatch { height: 36px; margin-top: 6px; border-radius: 8px; border: 6px solid #6b3a1a; }
    .actions-bar { display: flex; gap: 10px; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
    .err { color: var(--danger); font-size: 13px; }
  `],
})
export class MatchFormatFormComponent implements OnInit {
  editId: string | null = null;
  saving = false;
  error = '';
  themes: TableTheme[] = [];

  f: any = {
    format: 'duo_steel', status: 'draft', label: '', subtitle: '', icon: '♦', color: '#3f6ea1',
    buyInPerPlayer: 200, prizePerWinner: 150, manches: 2, baseTarget: 1500, labelTarget: 2000,
    autoRejoinSec: 5, openingBidMin: 90, countBelote: true, clockwise: false,
    tableThemeId: null as string | null, minLevel: 0, maxLevel: null as number | null,
  };

  constructor(
    private svc: MatchFormatService, private themeSvc: TableThemeService,
    private router: Router, private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.themeSvc.list().subscribe((res) => { this.themes = res.themes.filter((t) => t.active); });
    this.editId = this.route.snapshot.params['id'] || null;
    if (this.editId) {
      this.svc.get(this.editId).subscribe((res) => {
        const v = res.format as any;
        this.f = {
          format: v.format, status: v.status ?? (v.active ? 'active' : 'draft'),
          label: v.label, subtitle: v.subtitle ?? '', icon: v.icon ?? '♦', color: v.color ?? '#3f6ea1',
          buyInPerPlayer: v.buyInPerPlayer, prizePerWinner: v.prizePerWinner,
          manches: v.manches ?? 2, baseTarget: v.baseTarget ?? 1500, labelTarget: v.labelTarget ?? 2000,
          autoRejoinSec: v.autoRejoinSec ?? 5, openingBidMin: v.openingBidMin ?? 90,
          countBelote: v.countBelote !== false, clockwise: v.clockwise === true,
          tableThemeId: v.tableThemeId ?? null, minLevel: v.minLevel ?? 0, maxLevel: v.maxLevel ?? null,
        };
      });
    }
  }

  selectedTheme(): TableTheme | null { return this.themes.find((t) => t._id === this.f.tableThemeId) ?? null; }
  themeGradient(t: TableTheme): string {
    const c1 = t.colors?.felt1 || t.feltColor; const c2 = t.colors?.felt2 || t.feltEdgeColor || t.feltColor;
    return `radial-gradient(120% 100% at 50% 42%, ${c1}, ${c2} 75%)`;
  }

  save() {
    this.saving = true; this.error = '';
    const done = () => this.router.navigate(['/match-formats']);
    const fail = (e: any) => { this.saving = false; this.error = e?.error?.error || 'Échec.'; };
    if (this.editId) this.svc.update(this.editId, this.f).subscribe({ next: done, error: fail });
    else this.svc.create(this.f).subscribe({ next: done, error: fail });
  }
}
